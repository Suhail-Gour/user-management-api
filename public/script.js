const API_URL = window.location.origin;
let authToken = '';

// Tab switching
function showTab(tabName, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(tabName).classList.add('active');
  btn.classList.add('active');
}

// Toggle action buttons
function setAction(action, btn) {
  document.getElementById('statusAction').value = action;
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// Update login status in navbar
function updateLoginStatus(isLoggedIn, email = '') {
  const status = document.getElementById('loginStatus');
  if (isLoggedIn) {
    status.innerHTML = `<span class="status-dot online"></span><span class="status-text">Logged in as ${email}</span>`;
    document.getElementById('roleNotice').classList.add('hidden');
    document.getElementById('statusNotice').classList.add('hidden');
  }
}

// Show response
function showResponse(data, isError = false, statusCode = '') {
  const panel = document.getElementById('response');
  const content = document.getElementById('responseContent');
  const statusBadge = document.getElementById('responseStatus');

  panel.style.display = 'block';
  panel.className = `response-panel ${isError ? 'error' : ''}`;

  statusBadge.textContent = isError ? `✗ ${statusCode || 'Error'}` : `✓ ${statusCode || 'Success'}`;
  statusBadge.className = `response-status ${isError ? 'error' : 'success'}`;

  content.textContent = JSON.stringify(data, null, 2);
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
    showResponse(data, !res.ok, res.status);
  } catch (err) {
    showResponse({ message: 'Network error', error: err.message }, true);
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
      updateLoginStatus(true, email);
    }

    showResponse(data, !res.ok, res.status);
  } catch (err) {
    showResponse({ message: 'Network error', error: err.message }, true);
  }
}

// API 3: Assign Role
async function handleAssignRole(e) {
  e.preventDefault();

  if (!authToken) {
    showResponse({ message: 'Please login first to get a token.' }, true, '401');
    return;
  }

  const selectedRole = document.querySelector('input[name="role"]:checked');
  if (!selectedRole) {
    showResponse({ message: 'Please select a role.' }, true, '400');
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
    showResponse(data, !res.ok, res.status);
  } catch (err) {
    showResponse({ message: 'Network error', error: err.message }, true);
  }
}

// API 4: Activate/Deactivate
async function handleToggleStatus(e) {
  e.preventDefault();

  if (!authToken) {
    showResponse({ message: 'Please login first to get a token.' }, true, '401');
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
    showResponse(data, !res.ok, res.status);
  } catch (err) {
    showResponse({ message: 'Network error', error: err.message }, true);
  }
}