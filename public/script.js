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

  // Update toolbar
  const data = toolbarData[tabName];
  document.getElementById('toolbarLabel').textContent = data.label;
  document.getElementById('methodBadge').textContent = data.method;
  document.getElementById('pathBadge').textContent = data.path;

  // Color the method badge
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
function updateConnection(isConnected, email = '') {
  const dot = document.querySelector('.conn-dot');
  const text = document.getElementById('connText');
  if (isConnected) {
    dot.classList.add('connected');
    text.textContent = email;
    document.getElementById('roleWarning').classList.add('hidden');
    document.getElementById('statusWarning').classList.add('hidden');
  }
}

// Show output
function showOutput(data, isError = false, statusCode = '') {
  const panel = document.getElementById('response');
  const body = document.getElementById('outputBody');
  const status = document.getElementById('outputStatus');

  panel.style.display = 'block';
  panel.className = `output-panel ${isError ? 'error' : ''}`;

  status.textContent = isError ? `${statusCode} ERROR` : `${statusCode} OK`;
  status.className = `output-status ${isError ? 'error' : 'success'}`;

  body.textContent = JSON.stringify(data, null, 2);
}

// API 1: Signup
async function handleSignup(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('signupName').value,
    email: document.getElementById('signupEmail').value,
    password: document.getElementById('signupPassword').value
  };

  try {
    const res = await fetch(`${API_URL}/api/users/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
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
      updateConnection(true, email);
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

  const body = {
    userId: document.getElementById('roleUserId').value,
    role: selectedRole.value
  };

  try {
    const res = await fetch(`${API_URL}/api/users/assign-role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(body)
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

  const body = {
    userId: document.getElementById('statusUserId').value,
    action: document.getElementById('statusAction').value
  };

  try {
    const res = await fetch(`${API_URL}/api/users/toggle-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    showOutput(data, !res.ok, res.status);
  } catch (err) {
    showOutput({ message: 'Network error', error: err.message }, true);
  }
}