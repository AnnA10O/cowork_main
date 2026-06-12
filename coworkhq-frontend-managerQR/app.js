const API_URL = 'https://cowork-backend-six.vercel.app/api/v1';
let html5QrcodeScanner = null;
let isProcessing = false;

// DOM Elements
const loginSection = document.getElementById('login-section');
const scannerSection = document.getElementById('scanner-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const userInfoDisplay = document.getElementById('user-info-display');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const hardwareInput = document.getElementById('hardware-scanner-input');

const resultOverlay = document.getElementById('result-overlay');
const resultIcon = document.getElementById('result-icon');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const resultDetails = document.getElementById('result-details');

const soundSuccess = document.getElementById('sound-success');
const soundError = document.getElementById('sound-error');

// SVG Icons
const iconSuccess = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
const iconError = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

// Initialize
function init() {
  const token = localStorage.getItem('manager_token');
  if (token) {
    showScanner();
  } else {
    showLogin();
  }
}

// Navigation
function showLogin() {
  loginSection.classList.add('active');
  scannerSection.classList.remove('active');
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear();
  }
}

function showScanner() {
  loginSection.classList.remove('active');
  scannerSection.classList.add('active');
  
  try {
    const token = localStorage.getItem('manager_token');
    if (!token || token === 'undefined') throw new Error('Invalid token');
    
    const base64Url = token.split('.')[1];
    if (!base64Url) throw new Error('Invalid token format');

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const payload = JSON.parse(atob(base64 + padding));
    userInfoDisplay.textContent = payload.email || 'Manager';
  } catch (e) {
    console.warn("Could not decode token for UI display:", e);
    userInfoDisplay.textContent = 'Manager';
  }

  // Default tab
  switchTab('camera');
}

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const resBody = await res.json();
    if (!res.ok) throw new Error(resBody.message || 'Login failed');

    // The backend wraps successful responses in { success: true, data: { accessToken: ... } }
    const tokenPayload = resBody.data ? resBody.data : resBody;
    const finalToken = tokenPayload.accessToken || tokenPayload.access_token;
    
    if (!finalToken) throw new Error("Could not extract token from server response");

    localStorage.setItem('manager_token', finalToken);
    showScanner();
  } catch (err) {
    loginError.textContent = err.message;
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('manager_token');
  showLogin();
});

// Tabs
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
  });
});

function switchTab(tabId) {
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${tabId}`));

  if (tabId === 'camera') {
    setTimeout(() => {
      startCamera();
    }, 150);
    hardwareInput.blur();
  } else {
    stopCamera();
    hardwareInput.focus();
    
    // Ensure it stays focused if user clicks elsewhere
    document.addEventListener('click', keepHardwareFocus);
  }
}

function keepHardwareFocus() {
  if (document.getElementById('tab-hardware').classList.contains('active') && !resultOverlay.classList.contains('show')) {
    hardwareInput.focus();
  }
}

// Camera Scanner
function startCamera() {
  if (html5QrcodeScanner) return; // already running

  html5QrcodeScanner = new Html5QrcodeScanner(
    "reader",
    { fps: 10, qrbox: { width: 250, height: 250 } },
    false
  );
  html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function stopCamera() {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear().catch(console.error);
    html5QrcodeScanner = null;
  }
}

function onScanSuccess(decodedText) {
  if (isProcessing) return;
  processCode(decodedText);
}

function onScanFailure(error) {
  // ignoring stream errors
}

// Hardware Scanner
let barcodeBuffer = '';
let barcodeTimeout = null;

hardwareInput.addEventListener('keydown', (e) => {
  if (isProcessing) {
    e.preventDefault();
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    const code = hardwareInput.value.trim();
    hardwareInput.value = '';
    if (code) processCode(code);
  }
});

// Process Check-in
async function processCode(code) {
  isProcessing = true;
  
  try {
    const token = localStorage.getItem('manager_token');
    const res = await fetch(`${API_URL}/bookings/checkin-by-code/${code}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    
    if (!res.ok) {
      showResult(false, 'Check-in Failed', data.message || 'Invalid QR Code');
    } else {
      const payload = data.data ? data.data : data;
      let details = `<p><strong>Customer:</strong> ${payload.customerName}</p>
                     <p><strong>Desk:</strong> ${payload.seat}</p>
                     <p><strong>Status:</strong> ${payload.isReEntry ? 'Re-entry Logged' : 'Checked In'}</p>`;
      showResult(true, 'Access Granted', 'Customer verified successfully.', details);
    }
  } catch (err) {
    showResult(false, 'Network Error', 'Could not connect to server.');
  }
}

function showResult(isSuccess, title, message, detailsHTML = '') {
  resultIcon.className = 'result-icon ' + (isSuccess ? 'success' : 'error');
  resultIcon.innerHTML = isSuccess ? iconSuccess : iconError;
  resultTitle.textContent = title;
  resultMessage.textContent = message;
  resultDetails.innerHTML = detailsHTML;
  resultDetails.style.display = detailsHTML ? 'block' : 'none';

  if (isSuccess) {
    soundSuccess.currentTime = 0;
    soundSuccess.play().catch(() => {});
  } else {
    soundError.currentTime = 0;
    soundError.play().catch(() => {});
  }

  resultOverlay.classList.add('show');
  if (html5QrcodeScanner) html5QrcodeScanner.pause();

  setTimeout(() => {
    resultOverlay.classList.remove('show');
    isProcessing = false;
    
    if (html5QrcodeScanner) html5QrcodeScanner.resume();
    if (document.getElementById('tab-hardware').classList.contains('active')) {
      hardwareInput.focus();
    }
  }, 3000);
}

// Start
init();
