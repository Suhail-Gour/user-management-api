const API_URL = window.location.origin;
let authToken = '';

const toolbarData = {
  signup:  { label: 'db.users.insertOne()', method: 'POST', path: '/api/users/signup' },
  login:   { label: 'db.users.authenticate()', method: 'POST', path: '/api/users/login' },
  role:    { label: 'db.users.updateOne({ role })', method: 'PUT', path: '/api/users/assign-role' },
  status:  { label: 'db.users.updateOne({ status })', method: 'PUT', path: '/api/users/toggle-status' }
};

// Tab switching
function showTab(tabName, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));

  document.getElementById(tabName).classList.add('active');
  btn.classList.add('active');

  const data = toolbarData[tabName];
  document.getElementById('toolbarLabel').textContent = data.label;
  document.getElementById('methodBadge').textContent = data.method;
  document.getElementById('pathBadge').textContent = data.path;

  const badge = document.getElementById('methodBadge');
  if (data.method === 'PUT') {
    badge.style.background = '#0C2657';
    badge.style.color = '#016BF8';
  } else {
    badge.style.background = '#023430';
    badge.style.color = '#00ED64';
  }
}

// Toggle action
function setAction(action, btn) {
  document.getElementById('statusAction').value = action;
  document.querySelectorAll('.toggle-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// Update connection status
function updateConnection(isConnected, email = '', role = '') {
  const dot = document.querySelector('.conn-dot');
  const text = document.getElementById('connText');
  if (isConnected) {
    dot.classList.add('connected');
    text.textContent = `${email} (${role})`;
    document.getElementById('roleWarning').classList.add('hidden');
    document.getElementById('statusWarning').classList.add('hidden');
  }
}

// Show output with better formatting for validation errors
function showOutput(data, isError = false, statusCode = '') {
  const panel = document.getElementById('response');
  const body = document.getElementById('outputBody');
  const status = document.getElementById('outputStatus');

  panel.style.display = 'block';
  panel.className = `output-panel ${isError ? 'error' : ''}`;

  status.textContent = isError ? `${statusCode} ERROR` : `${statusCode} OK`;
  status.className = `output-status ${isError ? 'error' : 'success'}`;

  // Format output
  let output = JSON.stringify(data, null, 2);

  // If there are validation errors, format them nicely
  if (data.errors && Array.isArray(data.errors)) {
    output = `{\n  "message": "${data.message}",\n  "errors": [\n`;
    data.errors.forEach((err, i) => {
      output += `    ✗ "${err}"`;
      if (i < data.errors.length - 1) output += ',';
      output += '\n';
    });
    output += '  ]\n}';
  }

  body.textContent = output;
}

// ─── Client-side validation helpers ───

function validatePasswordClient(password) {
  const errors = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter (A-Z)');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter (a-z)');
  if (!/[0-9]/.test(password)) errors.push('One number (0-9)');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('One special character (!@#$...)');
  return errors;
}

function validateNameClient(name) {
  const errors = [];
  if (name.trim().length < 2) errors.push('Name must be at least 2 characters');
  if (name.trim().length > 50) errors.push('Name must be less than 50 characters');
  if (!/^[a-zA-Z\s.'\-]+$/.test(name.trim())) errors.push('Only letters, spaces, dots, hyphens allowed');
  return errors;
}

// API 1: Signup
async function handleSignup(e) {
  e.preventDefault();

  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;

  // Client-side validation (instant feedback)
  const nameErrors = validateNameClient(name);
  if (nameErrors.length > 0) {
    showOutput({ message: 'Invalid name', errors: nameErrors }, true, 400);
    return;
  }

  const passErrors = validatePasswordClient(password);
  if (passErrors.length > 0) {
    showOutput({ message: 'Weak password. Requirements:', errors: passErrors }, true, 400);
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/users/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    showOutput(data, !res.ok, res.status);
  } catch (err) {
    showOutput({ message: 'Network error', error: err.message }, true);
  }
}

// API 2: Login
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const body = {
    email,
    password: document.getElementById('loginPassword').value
  };

  try {
    const res = await fetch(`${API_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (res.ok && data.token) {
      authToken = data.token;
      updateConnection(true, email, data.role);
    }

    showOutput(data, !res.ok, res.status);
  } catch (err) {
    showOutput({ message: 'Network error', error: err.message }, true);
  }
}

// API 3: Assign Role
async function handleAssignRole(e) {
  e.preventDefault();

  if (!authToken) {
    showOutput({ message: 'Authentication required. Please login first.' }, true, 401);
    return;
  }

  const selectedRole = document.querySelector('input[name="role"]:checked');
  if (!selectedRole) {
    showOutput({ message: 'Please select a role.' }, true, 400);
    return;
  }

  const userId = document.getElementById('roleUserId').value;

  // Client-side userId format check
  if (!/^USR-\d{8}-\d{4}$/.test(userId)) {
    showOutput({ message: 'Invalid User ID format. Expected: USR-YYYYMMDD-XXXX' }, true, 400);
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/users/assign-role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ userId, role: selectedRole.value })
    });
    const data = await res.json();
    showOutput(data, !res.ok, res.status);
  } catch (err) {
    showOutput({ message: 'Network error', error: err.message }, true);
  }
}

// API 4: Toggle Status
async function handleToggleStatus(e) {
  e.preventDefault();

  if (!authToken) {
    showOutput({ message: 'Authentication required. Please login first.' }, true, 401);
    return;
  }

  const userId = document.getElementById('statusUserId').value;

  // Client-side userId format check
  if (!/^USR-\d{8}-\d{4}$/.test(userId)) {
    showOutput({ message: 'Invalid User ID format. Expected: USR-YYYYMMDD-XXXX' }, true, 400);
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/users/toggle-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ userId, action: document.getElementById('statusAction').value })
    });
    const data = await res.json();
    showOutput(data, !res.ok, res.status);
  } catch (err) {
    showOutput({ message: 'Network error', error: err.message }, true);
  }
}