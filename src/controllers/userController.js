const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateUserId } = require('../utils/idGenerator');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

async function signup(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const users = readUsers();

    if (users.find(u => u.email === email)) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = generateUserId();

    const newUser = {
      userId,
      name,
      email,
      password: hashedPassword,
      role: 'user',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeUsers(users);

    return res.status(201).json({
      message: 'User registered successfully.',
      userId,
      name,
      email
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const users = readUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Contact admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

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

async function assignRole(req, res) {
  try {
    const { userId, role } = req.body;
    const validRoles = ['user', 'admin', 'manager', 'viewer'];

    if (!userId || !role) {
      return res.status(400).json({ message: 'userId and role are required.' });
    }

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Allowed: ${validRoles.join(', ')}` });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.userId === userId);

    if (idx === -1) {
      return res.status(404).json({ message: 'User not found.' });
    }

    users[idx].role = role;
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

async function toggleUserStatus(req, res) {
  try {
    const { userId, action } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ message: 'userId and action are required.' });
    }

    if (!['activate', 'deactivate'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "activate" or "deactivate".' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.userId === userId);

    if (idx === -1) {
      return res.status(404).json({ message: 'User not found.' });
    }

    users[idx].isActive = action === 'activate';
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