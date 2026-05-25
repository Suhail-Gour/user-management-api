const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { generateUserId } = require('../utils/idGenerator');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

// Track failed login attempts
const loginAttempts = {};

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ─────────────────────────────────────────────
// VALIDATION FUNCTIONS
// ─────────────────────────────────────────────

function validateName(name) {
  const errors = [];

  if (!name || name.trim().length === 0) {
    errors.push('Name is required');
    return errors;
  }

  if (name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (name.trim().length > 50) {
    errors.push('Name must be less than 50 characters');
  }

  if (!/^[a-zA-Z\s.'\-]+$/.test(name.trim())) {
    errors.push('Name can only contain letters, spaces, dots, hyphens and apostrophes');
  }

  return errors;
}

function validatePassword(password) {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return errors;
  }

  if (password.length < 8) {
    errors.push('Must be at least 8 characters');
  }

  if (password.length > 64) {
    errors.push('Must be less than 64 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter (A-Z)');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter (a-z)');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Must contain at least one number (0-9)');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Must contain at least one special character (!@#$%^&*...)');
  }

  return errors;
}

function validateEmail(email) {
  if (!email || email.trim().length === 0) {
    return 'Email is required';
  }

  if (!validator.isEmail(email)) {
    return 'Invalid email format';
  }

  return null;
}

function validateUserId(userId) {
  if (!userId || userId.trim().length === 0) {
    return 'User ID is required';
  }

  const pattern = /^USR-\d{8}-\d{4}$/;
  if (!pattern.test(userId)) {
    return 'Invalid User ID format. Expected: USR-YYYYMMDD-XXXX';
  }

  return null;
}

// ─────────────────────────────────────────────
// API 1: SIGN UP
// ─────────────────────────────────────────────

async function signup(req, res) {
  try {
    const { name, email, password } = req.body;

    // Validate name
    const nameErrors = validateName(name);
    if (nameErrors.length > 0) {
      return res.status(400).json({ message: 'Invalid name', errors: nameErrors });
    }

    // Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ message: emailError });
    }

    // Validate password strength
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ message: 'Weak password', errors: passwordErrors });
    }

    // Sanitize inputs
    const sanitizedName = validator.escape(name.trim());
    const normalizedEmail = validator.normalizeEmail(email.trim().toLowerCase());

    const users = readUsers();

    // Check if email already exists (case-insensitive)
    if (users.find(u => u.email === normalizedEmail)) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate meaningful user ID
    const userId = generateUserId();

    const newUser = {
      userId,
      name: sanitizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: users.length === 0 ? 'admin' : 'user',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeUsers(users);

    return res.status(201).json({
      message: 'User registered successfully.',
      userId,
      name: sanitizedName,
      email: normalizedEmail
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
}

// ─────────────────────────────────────────────
// API 2: LOGIN (with brute force protection)
// ─────────────────────────────────────────────

async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const attemptKey = normalizedEmail;

    // Check if account is temporarily locked (5 failed attempts = 15 min lock)
    if (loginAttempts[attemptKey] && loginAttempts[attemptKey].count >= 5) {
      const lockTime = 15 * 60 * 1000; // 15 minutes
      const timePassed = Date.now() - loginAttempts[attemptKey].lastAttempt;

      if (timePassed < lockTime) {
        const minutesLeft = Math.ceil((lockTime - timePassed) / 60000);
        return res.status(429).json({
          message: `Account temporarily locked. Try again in ${minutesLeft} minute(s).`
        });
      } else {
        delete loginAttempts[attemptKey];
      }
    }

    const users = readUsers();
    const user = users.find(u => u.email === normalizedEmail);

    // Generic error message (don't reveal if email exists or not)
    if (!user) {
      recordFailedAttempt(attemptKey);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Contact admin.' });
    }

    // Compare encrypted password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      recordFailedAttempt(attemptKey);
      const remaining = 5 - (loginAttempts[attemptKey] ? loginAttempts[attemptKey].count : 0);
      return res.status(401).json({
        message: 'Invalid email or password.',
        attemptsRemaining: remaining > 0 ? remaining : 0
      });
    }

    // Successful login — reset failed attempts
    delete loginAttempts[attemptKey];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      userId: user.userId,
      role: user.role
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
}

// Helper: Record failed login attempt
function recordFailedAttempt(key) {
  if (!loginAttempts[key]) {
    loginAttempts[key] = { count: 0, lastAttempt: Date.now() };
  }
  loginAttempts[key].count += 1;
  loginAttempts[key].lastAttempt = Date.now();
}

// ─────────────────────────────────────────────
// API 3: ASSIGN ROLE (Admin only)
// ─────────────────────────────────────────────

async function assignRole(req, res) {
  try {
    const { userId, role } = req.body;
    const validRoles = ['user', 'admin', 'manager', 'viewer'];

    // Only admins can assign roles
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can assign roles.' });
    }

    // Validate userId format
    const userIdError = validateUserId(userId);
    if (userIdError) {
      return res.status(400).json({ message: userIdError });
    }

    // Validate role
    if (!role) {
      return res.status(400).json({ message: 'Role is required.' });
    }

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Allowed: ${validRoles.join(', ')}` });
    }

    // Prevent self role-change
    if (userId === req.user.userId) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.userId === userId);

    if (idx === -1) {
      return res.status(404).json({ message: 'User not found.' });
    }

    users[idx].role = role;
    users[idx].updatedAt = new Date().toISOString();
    writeUsers(users);

    return res.status(200).json({
      message: `Role '${role}' assigned to ${userId}.`,
      userId,
      newRole: role
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
}

// ─────────────────────────────────────────────
// API 4: ACTIVATE / DEACTIVATE (Admin only)
// ─────────────────────────────────────────────

async function toggleUserStatus(req, res) {
  try {
    const { userId, action } = req.body;

    // Only admins can activate/deactivate
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can change user status.' });
    }

    // Validate userId format
    const userIdError = validateUserId(userId);
    if (userIdError) {
      return res.status(400).json({ message: userIdError });
    }

    // Validate action
    if (!action) {
      return res.status(400).json({ message: 'Action is required.' });
    }

    if (!['activate', 'deactivate'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "activate" or "deactivate".' });
    }

    // Prevent self-deactivation
    if (userId === req.user.userId && action === 'deactivate') {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.userId === userId);

    if (idx === -1) {
      return res.status(404).json({ message: 'User not found.' });
    }

    users[idx].isActive = action === 'activate';
    users[idx].updatedAt = new Date().toISOString();
    writeUsers(users);

    return res.status(200).json({
      message: `User ${userId} has been ${action}d.`,
      userId,
      isActive: users[idx].isActive
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
}

module.exports = { signup, login, assignRole, toggleUserStatus };