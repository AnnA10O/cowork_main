/* ============================================================
   CoWork HQ — Main Application Controller (js/app.js)
   SPA router, module renderers, live API data fetching,
   keyboard shortcuts, onboarding tour, theme, auth flows.
   ============================================================ */

const App = (() => {
  /* ═══ STATE ═══ */
  let currentUser = null;
  let isLight = false;
  let ddOpen = false;
  let currentMod = null;
  let activeTab = 'login';
  let activePoll = null;
  let currentBookingStatus = 'PENDING';
  let selectedExtrasWorkspaceId = null;

  /* ═══ TOAST ═══ */
  function toast(msg) {
    const w = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    w.appendChild(t); setTimeout(() => t.remove(), 2400);
  }

  function setHtml(el, html) {
    if (!el) return;
    if (el._rawHTML !== html) {
      el.innerHTML = html;
      el._rawHTML = html;
    }
  }

  function toastErr(msg) {
    const w = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = 'toast';
    t.style.cssText = 'background:#f87171;color:#fff';
    t.textContent = '⚠ ' + msg;
    w.appendChild(t); setTimeout(() => t.remove(), 3500);
  }

  /* ═══ SCREEN SWITCH ═══ */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  /* ═══ FORCE LOGOUT (called by API on 401) ═══ */
  function forceLogout() {
    currentUser = null;
    API.auth.logout();
    showScreen('auth-screen');
    switchTab('login');
    toast('Session expired. Please log in again.');
  }

  /* ═══ AUTH TABS ═══ */
  function switchTab(tab) {
    activeTab = tab;
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
    document.getElementById('auth-title').textContent = tab === 'login' ? 'Welcome back' : 'Create Account';
    document.getElementById('auth-sub').textContent = tab === 'login' ? 'Login to your CoWork HQ' : 'Register your manager account';
    renderAuthForm();
  }

  function renderAuthForm() {
    const fb = document.getElementById('auth-form-body');
    if (activeTab === 'login') {
      fb.innerHTML = `
      <div class="auth-field"><label>Email</label><input id="li-email" type="email" placeholder="manager@coworkhq.in" autocomplete="email"></div>
      <div class="auth-field"><label>Password</label><div style="position:relative;display:flex;align-items:center"><input id="li-pass" type="password" placeholder="••••••••" autocomplete="current-password" style="width:100%;padding-right:40px"><button type="button" onclick="(function(){var i=document.getElementById('li-pass');i.type=i.type==='password'?'text':'password';this.textContent=i.type==='password'?'👁':'🙈'}).call(this)" style="position:absolute;right:10px;background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted,#aaa);padding:0;line-height:1">👁</button></div></div>
      <div id="auth-err" style="font-size:11px;color:#f87171;text-align:center;min-height:16px;margin-bottom:4px"></div>
      <button class="auth-btn" id="login-btn" onclick="App.doLogin()">Login →</button>
      <div class="auth-hint">Don't have an account? <span onclick="App.switchTab('signup')">Sign Up</span></div>`;
      document.getElementById('li-pass').addEventListener('keydown', e => { if (e.key === 'Enter') App.doLogin(); });
    } else {
      fb.innerHTML = `
      <div class="auth-field"><label>Full Name</label><input id="su-name" type="text" placeholder="Your Name" autocomplete="name"></div>
      <div class="auth-field"><label>Business Name</label><input id="su-biz" type="text" placeholder="Your Business (optional)"></div>
      <div class="auth-field"><label>Email</label><input id="su-email" type="email" placeholder="manager@business.com" autocomplete="email"></div>
      <div class="auth-field"><label>Password</label><div style="position:relative;display:flex;align-items:center"><input id="su-pass" type="password" placeholder="Min 8 characters" autocomplete="new-password" style="width:100%;padding-right:40px"><button type="button" onclick="(function(){var i=document.getElementById('su-pass');i.type=i.type==='password'?'text':'password';this.textContent=i.type==='password'?'👁':'🙈'}).call(this)" style="position:absolute;right:10px;background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted,#aaa);padding:0;line-height:1">👁</button></div></div>
      <div id="auth-err" style="font-size:11px;color:#f87171;text-align:center;min-height:16px;margin-bottom:4px"></div>
      <button class="auth-btn" id="signup-btn" onclick="App.doSignup()">Create Account →</button>
      <div class="auth-hint">Already have an account? <span onclick="App.switchTab('login')">Login</span></div>`;
    }
  }

  function setAuthError(msg) {
    const el = document.getElementById('auth-err');
    if (el) el.textContent = msg;
  }

  function setAuthLoading(id, loading) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'Please wait…' : (id === 'login-btn' ? 'Login →' : 'Create Account →');
  }

  async function doLogin() {
    const email = (document.getElementById('li-email') || {}).value?.trim() || '';
    const pass  = (document.getElementById('li-pass')  || {}).value || '';
    if (!email || !pass) { setAuthError('Please fill all fields.'); return; }
    setAuthLoading('login-btn', true);
    try {
      const data = await API.auth.login(email, pass);
      currentUser = { ...data.user, name: data.user.email.split('@')[0] };
      // Fetch full profile for the name
      try {
        const profile = await API.users.getMe();
        if (profile?.data) currentUser = { ...currentUser, ...profile.data };
      } catch (_) {}
      enterApp();
    } catch (err) {
      setAuthError(err.message || 'Login failed');
    } finally {
      setAuthLoading('login-btn', false);
    }
  }

  async function doSignup() {
    const name  = (document.getElementById('su-name')  || {}).value?.trim() || '';
    const biz   = (document.getElementById('su-biz')   || {}).value?.trim() || '';
    const email = (document.getElementById('su-email') || {}).value?.trim() || '';
    const pass  = (document.getElementById('su-pass')  || {}).value || '';
    if (!name || !email || !pass) { setAuthError('Please fill all required fields.'); return; }
    if (pass.length < 8)          { setAuthError('Password must be at least 8 characters.'); return; }
    setAuthLoading('signup-btn', true);
    try {
      const data = await API.auth.register(name, email, pass, 'MANAGER', biz);
      currentUser = { ...data.user, name };
      enterApp();
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
    } finally {
      setAuthLoading('signup-btn', false);
    }
  }

  function enterApp() {
    updateNavAv();
    showScreen('app-screen');
    goHome();
    toast(`Welcome, ${currentUser?.name?.split(' ')[0] || 'Manager'}! 🎉`);
    setupKeyboardShortcuts();
    
    if (!localStorage.getItem('tour_seen_' + currentUser?.id)) {
      setTimeout(() => startTour(), 700);
    }
  }

  function logout() {
    currentUser = null;
    API.auth.logout();
    ddOpen = false;
    document.getElementById('user-dd').style.display = 'none';
    document.removeEventListener('click', closeOnOutside);
    showScreen('auth-screen');
    switchTab('login');
    toast('Logged out. See you soon! 👋');
    document.removeEventListener('keydown', handleShortcut);
  }

  /* ═══ NAV AVATAR & DROPDOWN ═══ */
  function updateNavAv() {
    const av = document.getElementById('nav-av');
    if (currentUser?.name) {
      av.textContent = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    } else if (currentUser?.email) {
      av.textContent = currentUser.email.substring(0, 2).toUpperCase();
    } else { 
      av.textContent = 'M'; 
    }
  }

  function toggleDD() {
    ddOpen = !ddOpen;
    const dd = document.getElementById('user-dd');
    if (ddOpen) {
      renderDD(); dd.style.display = 'block';
      setTimeout(() => document.addEventListener('click', closeOnOutside), 10);
    } else {
      dd.style.display = 'none';
      document.removeEventListener('click', closeOnOutside);
    }
  }

  function closeOnOutside(e) {
    const dd = document.getElementById('user-dd'), av = document.getElementById('nav-av');
    if (!dd.contains(e.target) && e.target !== av) {
      dd.style.display = 'none'; ddOpen = false;
      document.removeEventListener('click', closeOnOutside);
    }
  }

  function renderDD() {
    const dd = document.getElementById('user-dd');
    const ini = currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
    const role = currentUser?.role || 'MANAGER';
    dd.innerHTML = `
    <div class="dd-head">
      <div class="dd-av">${ini}</div>
      <div><div class="dd-name">${currentUser?.name || 'Manager'}</div><div class="dd-email">${currentUser?.email || ''}</div></div>
    </div>
    <div class="dd-item" onclick="App.ddGo('settings')"><i class="ti ti-settings"></i> Account Settings</div>
    <div class="dd-item" onclick="App.ddGo('staff')"><i class="ti ti-users"></i> Manage Staff</div>
    <div class="dd-sep"></div>
    <div class="dd-item dd-red" onclick="App.logout()"><i class="ti ti-logout"></i> Logout</div>`;
  }

  function ddGo(id) {
    document.getElementById('user-dd').style.display = 'none';
    ddOpen = false;
    document.removeEventListener('click', closeOnOutside);
    openMod(id);
  }

  /* ═══ THEME ═══ */
  function toggleTheme() {
    isLight = !isLight;
    document.body.classList.toggle('light-mode', isLight);
    document.getElementById('theme-icon').className = isLight ? 'ti ti-moon' : 'ti ti-sun';
    toast(isLight ? 'Light mode ☀️' : 'Dark mode 🌙');
  }

  /* ═══ KEYBOARD SHORTCUTS ═══ */
  const KEY_MAP = {
    'd': 'dashboard', 'w': 'workspace', 'b': 'bookings', 'p': 'payments',
    'i': 'issues', 's': 'staff', 'c': 'customers', 'n': 'notifications',
    'a': 'analytics', 'o': 'coupons', 'e': 'extras', 'x': 'settings', 'h': 'home'
  };

  let shortcutsEnabled = true;

  function setupKeyboardShortcuts() {
    document.removeEventListener('keydown', handleShortcut);
    document.addEventListener('keydown', handleShortcut);
  }

  function toggleShortcuts() {
    shortcutsEnabled = !shortcutsEnabled;
    const btn = document.getElementById('shortcuts-toggle-btn');
    if (btn) {
      btn.innerHTML = `<i class="ti ${shortcutsEnabled ? 'ti-keyboard' : 'ti-keyboard-off'}"></i>`;
      btn.style.color = shortcutsEnabled ? '' : 'var(--txt3)';
      btn.title = shortcutsEnabled ? 'Disable Keyboard Shortcuts' : 'Enable Keyboard Shortcuts';
    }
    toast(shortcutsEnabled ? 'Keyboard shortcuts enabled ⌨️' : 'Keyboard shortcuts disabled 🚫');
  }

  function handleShortcut(e) {
    if (!currentUser || !shortcutsEnabled) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const key = e.key.toLowerCase();
    if (KEY_MAP[key]) {
      e.preventDefault();
      if (KEY_MAP[key] === 'home') { goHome(); } else { openMod(KEY_MAP[key]); }
      showKeyHint(key, KEY_MAP[key]);
    }
  }

  function showKeyHint(key, mod) {
    document.querySelectorAll('.key-hint').forEach(el => el.remove());
    const label = mod === 'home' ? 'Home' : MODS.find(m => m.id === mod)?.name || mod;
    const h = document.createElement('div'); h.className = 'key-hint';
    h.innerHTML = `<kbd style="background:var(--accent);color:#fff;padding:1px 6px;border-radius:4px;font-weight:800">${key.toUpperCase()}</kbd> → ${label}`;
    document.body.appendChild(h); setTimeout(() => h.remove(), 1100);
  }

  /* ═══ SVG ICONS ═══ */
  const ICONS = {
    dashboard: `<svg viewBox="0 0 36 36" fill="none"><rect x="4" y="4" width="12" height="12" rx="3" fill="rgba(255,255,255,0.9)"/><rect x="20" y="4" width="12" height="12" rx="3" fill="rgba(255,255,255,0.6)"/><rect x="4" y="20" width="12" height="12" rx="3" fill="rgba(255,255,255,0.6)"/><rect x="20" y="20" width="12" height="12" rx="3" fill="rgba(255,255,255,0.9)"/></svg>`,
    workspace:  `<svg viewBox="0 0 36 36" fill="none"><path d="M18 5L32 14L32 30L4 30L4 14Z" fill="rgba(255,255,255,0.9)"/><rect x="14" y="20" width="8" height="10" rx="1" fill="#4a90d9"/><rect x="10" y="15" width="5" height="5" rx="1" fill="rgba(255,255,255,0.5)"/><rect x="21" y="15" width="5" height="5" rx="1" fill="rgba(255,255,255,0.5)"/></svg>`,
    bookings:   `<svg viewBox="0 0 36 36" fill="none"><rect x="4" y="8" width="28" height="24" rx="4" fill="rgba(255,255,255,0.95)"/><rect x="4" y="8" width="28" height="5" rx="2" fill="rgba(255,255,255,0.3)"/><line x1="10" y1="5" x2="10" y2="11" stroke="white" stroke-width="2.5" stroke-linecap="round"/><line x1="26" y1="5" x2="26" y2="11" stroke="white" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="22" r="2" fill="#e8573c"/><circle cx="18" cy="22" r="2" fill="#e8a87c"/><circle cx="24" cy="22" r="2" fill="#e8a87c"/><circle cx="12" cy="28" r="2" fill="#e8a87c"/><circle cx="18" cy="28" r="2" fill="#e8573c"/><circle cx="24" cy="28" r="2" fill="#e8a87c"/></svg>`,
    payments:   `<svg viewBox="0 0 36 36" fill="none"><rect x="3" y="9" width="30" height="20" rx="4" fill="rgba(255,255,255,0.9)"/><rect x="3" y="13" width="30" height="5" fill="rgba(255,255,255,0.4)"/><rect x="8" y="22" width="8" height="3" rx="1.5" fill="#10b981"/><rect x="20" y="22" width="10" height="3" rx="1.5" fill="rgba(79,70,229,0.5)"/></svg>`,
    issues:     `<svg viewBox="0 0 36 36" fill="none"><rect x="14" y="8" width="16" height="20" rx="3" fill="rgba(255,255,255,0.9)" transform="rotate(-15 18 18)"/><circle cx="22" cy="18" r="3" fill="#f87171"/></svg>`,
    staff:      `<svg viewBox="0 0 36 36" fill="none"><circle cx="13" cy="13" r="5" fill="rgba(255,255,255,0.9)"/><path d="M4 30C4 23 22 23 22 30" fill="rgba(255,255,255,0.9)"/><circle cx="25" cy="12" r="4" fill="rgba(255,255,255,0.6)"/><path d="M18 28C19 23 32 23 32 28" fill="rgba(255,255,255,0.6)"/></svg>`,
    customers:  `<svg viewBox="0 0 36 36" fill="none"><circle cx="18" cy="12" r="6" fill="rgba(255,255,255,0.9)"/><path d="M5 31C5 23 31 23 31 31" fill="rgba(255,255,255,0.9)"/></svg>`,
    notifications:`<svg viewBox="0 0 36 36" fill="none"><path d="M18 4C12 4 8 9 8 14L8 24L6 26L30 26L28 24L28 14C28 9 24 4 18 4Z" fill="rgba(255,255,255,0.9)"/><rect x="14" y="26" width="8" height="4" rx="2" fill="rgba(255,255,255,0.7)"/><circle cx="26" cy="8" r="4" fill="#f87171"/></svg>`,
    analytics:  `<svg viewBox="0 0 36 36" fill="none"><rect x="4" y="22" width="5" height="10" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="11" y="16" width="5" height="16" rx="2" fill="rgba(255,255,255,0.7)"/><rect x="18" y="10" width="5" height="22" rx="2" fill="rgba(255,255,255,0.9)"/><rect x="25" y="6" width="5" height="26" rx="2" fill="rgba(255,255,255,0.9)"/><polyline points="6,20 13,14 20,8 27,4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="27" cy="4" r="2.5" fill="#fbbf24"/></svg>`,
    coupons:    `<svg viewBox="0 0 36 36" fill="none"><rect x="3" y="10" width="30" height="16" rx="4" fill="rgba(255,255,255,0.9)"/><circle cx="3" cy="18" r="4" fill="#161b2e"/><circle cx="33" cy="18" r="4" fill="#161b2e"/><line x1="14" y1="10" x2="14" y2="26" stroke="#161b2e" stroke-width="1.5" stroke-dasharray="3 2"/><text x="17" y="21" font-size="8" font-weight="800" fill="#4f46e5" font-family="monospace">20%OFF</text></svg>`,
    extras:     `<svg viewBox="0 0 36 36" fill="none"><path d="M12 18H24V26H12V18Z" fill="rgba(255,255,255,0.9)"/><circle cx="18" cy="12" r="4" fill="rgba(255,255,255,0.9)"/></svg>`,
    settings:   `<svg viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="5" fill="rgba(255,255,255,0.9)"/><path d="M18 4L20 8L24 7L26 11L30 12L29 16L32 19L29 22L30 26L26 27L24 31L20 30L18 34L16 30L12 31L10 27L6 26L7 22L4 19L7 16L6 12L10 11L12 7L16 8Z" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" fill="rgba(255,255,255,0.25)"/></svg>`,
  };

  const MODS = [
    { id: 'dashboard',     name: 'Dashboard',    sub: 'Overview',           color: '#4f46e5' },
    { id: 'workspace',     name: 'Workspaces',   sub: 'My Spaces',          color: '#2563eb' },
    { id: 'bookings',      name: 'Bookings',     sub: 'Manage',             color: '#e8573c' },
    { id: 'payments',      name: 'Payments',     sub: 'Revenue & GST',      color: '#059669' },
    { id: 'issues',        name: 'Issues',       sub: 'Tickets',            color: '#dc2626' },
    { id: 'staff',         name: 'Staff',        sub: 'Team',               color: '#d97706' },
    { id: 'customers',     name: 'Customers',    sub: 'Members',            color: '#7c3aed' },
    { id: 'notifications', name: 'Alerts',       sub: 'Notifications',      color: '#0891b2' },
    { id: 'analytics',     name: 'Analytics',    sub: 'Charts & Trends',    color: '#1d4ed8' },
    { id: 'coupons',       name: 'Coupons',      sub: 'Promotions',         color: '#be185d' },
    { id: 'extras',        name: 'Extras',       sub: 'Extra Services',     color: '#8b5cf6' },
    { id: 'settings',      name: 'Settings',     sub: 'Configure',          color: '#374151' },
  ];

  const SHORTCUTS = [
    { key: 'D', id: 'dashboard', label: 'Dashboard' },
    { key: 'W', id: 'workspace', label: 'Workspace' },
    { key: 'B', id: 'bookings',  label: 'Bookings'  },
    { key: 'P', id: 'payments',  label: 'Payments'  },
    { key: 'I', id: 'issues',    label: 'Issues'    },
    { key: 'S', id: 'staff',     label: 'Staff'     },
    { key: 'C', id: 'customers', label: 'Customers' },
    { key: 'N', id: 'notifications', label: 'Alerts'    },
    { key: 'A', id: 'analytics', label: 'Analytics' },
    { key: 'O', id: 'coupons',   label: 'Coupons'   },
    { key: 'E', id: 'extras',    label: 'Extras'    },
    { key: 'X', id: 'settings',  label: 'Settings'  },
    { key: 'H', id: 'home',      label: 'Home'      },
  ];

  /* ═══ HOME ═══ */
  async function goHome() {
    currentMod = 'home';
    const c = document.getElementById('content');
    const name = currentUser?.name?.split(' ')[0] || 'Manager';
    // Render skeleton immediately, then hydrate with live data
    c.innerHTML = `
    <div class="home">
      <div style="margin-bottom:16px">
        <div style="font-size:18px;font-weight:800;color:var(--txt)">Good ${greeting()}, <span style="color:var(--accent2)">${name}</span> 👋</div>
        <div style="font-size:11px;color:var(--txt3);margin-top:3px">${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · <span id="sys-status" style="color:var(--green);font-weight:700">● Loading...</span></div>
      </div>
      <div class="kpi-row" id="kpi-row">
        ${['Revenue','Workspaces','Bookings','Pending'].map(l => `
        <div class="kpi"><div class="kpi-lbl">${l}</div><div class="kpi-val" style="color:var(--txt3)">—</div><div class="kpi-trend">loading…</div></div>`).join('')}
      </div>
      <div class="sec-lbl">All Modules</div>
      <div class="icon-grid">
        ${MODS.map(m => `
        <div class="icon-btn" onclick="App.openMod('${m.id}')">
          <div class="icon-sq" style="background:${m.color};box-shadow:0 6px 20px ${m.color}55">${ICONS[m.id] || ''}</div>
          <div class="icon-lbl">${m.name}</div>
          <div class="icon-sub">${m.sub}</div>
        </div>`).join('')}
      </div>
    </div>`;

    // Hydrate KPI cards from live backend
    try {
      const res = await API.workspaces.getDashboard();
      const d = res?.data || res || {};
      const kpis = [
        ['Revenue',    `₹${fmtNum(Number(d.totalRevenue || 0))}`, '↑ Lifetime Total', 'up', 'payments'],
        ['Workspaces', d.workspaces ?? '—',                        'Active locations',  'up', 'workspace'],
        ['Bookings',   d.totalBookings ?? '—',                     'Total all time',    'up', 'bookings'],
        ['Pending',    d.pendingBookings ?? '—',                   'Needs approval',    'dn', 'bookings'],
      ];
      const kpiRow = document.getElementById('kpi-row');
      if (kpiRow) {
        kpiRow.innerHTML = kpis.map(([l, v, s, t, id]) => `
        <div class="kpi" onclick="App.openMod('${id}')">
          <div class="kpi-lbl">${l}</div>
          <div class="kpi-val">${v}</div>
          <div class="kpi-trend ${t}">${s}</div>
        </div>`).join('');
      }
      const sysStatus = document.getElementById('sys-status');
      if (sysStatus) {
        sysStatus.textContent = '● All systems live';
      }
    } catch (err) {
      const sysStatus = document.getElementById('sys-status');
      if (sysStatus) {
        sysStatus.textContent = '● Backend offline';
        sysStatus.style.color = 'var(--red)';
      }
    }
  }

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  }

  function fmtNum(n) {
    if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (n >= 1000)   return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function fmtDate(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  /* ═══ MODULE SHELL ═══ */
  function openMod(id) {
    currentMod = id;
    if (activePoll) { clearInterval(activePoll); activePoll = null; }
    const m = MODS.find(x => x.id === id); if (!m) return;
    const c = document.getElementById('content'); c.innerHTML = '';
    const d = document.createElement('div'); d.className = 'detail';
    const top = document.createElement('div'); top.className = 'dtop';
    top.innerHTML = `
      <div class="back" onclick="App.goHome()"><i class="ti ti-arrow-left"></i></div>
      <div class="dtop-sq" style="background:${m.color}">${ICONS[m.id] || ''}</div>
      <div><div class="dtop-title">${m.name}</div><div class="dtop-sub">${m.sub}</div></div>
      <div class="dbtns" id="dbtns"></div>`;
    d.appendChild(top);
    const body = document.createElement('div'); body.className = 'dbody'; body.id = 'dbody';
    // Loading state
    body.innerHTML = `<div style="padding:40px;text-align:center;color:var(--txt3)"><i class="ti ti-loader-2" style="animation:spin 1s linear infinite;font-size:24px"></i></div>`;
    d.appendChild(body); c.appendChild(d);

    const R = {
      dashboard: rDash, workspace: rWS, bookings: rBook, payments: rPay,
      issues: rIss, staff: rStaff, customers: rCust, notifications: rNotif,
      analytics: rAnalytics, coupons: rCoupons, extras: rExtrasNew, settings: rSettings,
    };
    
    const renderFunc = R[id] || rEmpty;
    renderFunc(body, document.getElementById('dbtns'));
    
    // Global auto-refresh every 10 seconds for real-time updates
    if (id !== 'settings' && id !== 'workspace') { // Don't poll forms/settings
      activePoll = setInterval(() => {
        const bEl = document.getElementById('dbody');
        const btnsEl = document.getElementById('dbtns');
        // Only run if the modal isn't open over the list
        if (bEl && !document.querySelector('[id$="-modal-overlay"]')) {
           renderFunc(bEl, btnsEl, true); // true = silent refresh
        }
      }, 10000);
    }
  }

  function rEmpty(b) { b.innerHTML = '<div style="padding:40px;text-align:center;color:var(--txt3);font-size:13px">Coming soon</div>'; }

  /* ─────────── DASHBOARD ─────────── */
  async function rDash(b, btns, isSilent = false) {
    btns.innerHTML = `<button class="dbtn pr" onclick="App.openMod('analytics')">View Analytics →</button>`;
    try {
      const res = await API.workspaces.getDashboard();
      const d = res?.data || res || {};
      b.innerHTML = `
      <div class="g4">
        ${[
          ['Total Revenue',    `₹${fmtNum(Number(d.totalRevenue||0))}`,  'All time', '#34d399'],
          ['Avg Occupancy',    '—',                                        'Live data pending', '#818cf8'],
          ['Total Bookings',   d.totalBookings ?? '—',                    'All time', '#38bdf8'],
          ['Pending Approval', d.pendingBookings ?? '—',                  'Awaiting action', '#f87171'],
        ].map(([l,v,s,c]) => `<div class="sc"><div class="sc-lb">${l}</div><div class="sc-v" style="color:${c}">${v}</div><div class="sc-s">${s}</div></div>`).join('')}
      </div>
      <div class="tbl"><div class="tbl-bar"><div class="tbl-ttl">Quick Stats</div></div>
        <div style="padding:20px;text-align:center;color:var(--txt3);font-size:12px">Open Bookings or Analytics for detailed charts.</div>
      </div>`;
    } catch (err) {
      setHtml(b, errCard(err.message));
    }
  }

  /* ─────────── WORKSPACES ─────────── */
  async function rWS(b, btns, isSilent = false) {
    btns.innerHTML = `
      <button class="dbtn" onclick="App.openCreateWorkspacePage()">+ Add Workspace</button>
      <button class="dbtn pr" onclick="App.showGenQrModal()">📱 Gen QR</button>
      <button class="dbtn" id="btn-bulk-deactivate" onclick="App.bulkDeactivateWs()" style="color:#f43f5e;border-color:rgba(244,63,94,0.3);background:rgba(244,63,94,0.05)">🗑 Bulk Deactivate</button>`;
    try {
      const res = await API.workspaces.getMy();
      const list = res?.data || res || [];
      if (!list.length) {
        setHtml(b, emptyCard('No workspaces yet. Click "+ Add Workspace" to create your first one.'));
        return;
      }
      b.innerHTML = `
      <div class="g3">${[
        ['Total Spaces',  list.length,                         'Your locations',      '#818cf8'],
        ['Active',        list.filter(w => w.status==='ACTIVE').length, 'Online',     '#34d399'],
        ['Total Desks',   list.reduce((a,w) => a+(w._count?.desks||0), 0), 'All seats','#818cf8'],
      ].map(([l,v,s,c]) => `<div class="sc"><div class="sc-lb">${l}</div><div class="sc-v" style="color:${c}">${v}</div><div class="sc-s">${s}</div></div>`).join('')}</div>
      <div class="tbl"><div class="tbl-bar"><div class="tbl-ttl">My Workspaces</div></div>
        <div class="thead" style="grid-template-columns:30px 2fr 1fr 1fr 1fr 1fr 1fr">
          <input type="checkbox" id="bulk-ws-all" onclick="App.toggleAllWs(this)">
          <span>Name</span><span>City</span><span>Desks</span><span>Plans</span><span>Status</span><span>Action</span>
        </div>
        ${list.map(w => `
        <div class="trow" style="grid-template-columns:30px 2fr 1fr 1fr 1fr 1fr 1fr">
          <input type="checkbox" class="bulk-ws-cb" value="${w.id}">
          <div class="cn">${w.name}</div>
          <div class="ct">${w.city}</div>
          <div class="ct">${w._count?.desks ?? '0'} desks</div>
          <div class="ct">${w.pricingPlans?.length ?? 0} plans</div>
          <span class="badge ${w.status==='ACTIVE'?'bs':w.status==='INACTIVE'?'bw':'be'}">${w.status}</span>
          <div><button onclick="App.openManageWorkspacePage('${w.id}')" style="padding:4px 9px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer">⚙ Manage</button></div>
        </div>`).join('')}
      </div>`;
    } catch (err) {
      setHtml(b, errCard(err.message));
    }
  }

  /* ─────────── BOOKINGS ─────────── */
  async function rBook(b, btns, isSilent = false) {
    if (!isSilent) {
      const pAct = currentBookingStatus === 'PENDING' ? 'background:var(--accent);color:#fff;border-color:var(--accent)' : '';
      const aAct = currentBookingStatus === '' ? 'background:var(--accent);color:#fff;border-color:var(--accent)' : '';
      btns.innerHTML = `
        <button class="dbtn" id="book-filter-pending" style="${pAct}" onclick="App.loadBookings('PENDING');App.openMod('bookings')">Pending</button>
        <button class="dbtn" id="book-filter-all"     style="${aAct}" onclick="App.loadBookings('');App.openMod('bookings')">All</button>`;
    }
    await loadBookings(currentBookingStatus, b, isSilent);
  }

  async function loadBookings(status, bEl, isSilent = false) {
    currentBookingStatus = status;
    const b = bEl || document.getElementById('dbody');
    if (!b) return;
    if (!isSilent) setHtml(b, loadingCard());
    try {
      const res = await API.bookings.getManagerBookings(status);
      const list = res?.data || res || [];
      const pending   = list.filter(bk => bk.status === 'PENDING').length;
      const confirmed = list.filter(bk => bk.status === 'CONFIRMED').length;
      const cancelled = list.filter(bk => bk.status === 'CANCELLED').length;
      b.innerHTML = `
      <div class="g3">${[
        ['Pending',   pending,   'Awaiting approval', '#fbbf24'],
        ['Confirmed', confirmed, 'Active bookings',   '#34d399'],
        ['Cancelled', cancelled, 'This filter',       '#f87171'],
      ].map(([l,v,s,c]) => `<div class="sc"><div class="sc-lb">${l}</div><div class="sc-v" style="color:${c}">${v}</div><div class="sc-s">${s}</div></div>`).join('')}</div>
      <div class="tbl"><div class="tbl-bar"><div class="tbl-ttl">Booking Requests${status ? ' — ' + status : ''}</div></div>
        <div class="thead" style="grid-template-columns:1.5fr 1.5fr 1.2fr 1fr 1.5fr 1.2fr"><span>Customer</span><span>Workspace</span><span>Desk</span><span>Amount</span><span>Time</span><span>Action</span></div>
        ${list.length ? list.map(bk => {
          const name = bk.customer?.user?.name || '—';
          const ws   = bk.workspace?.name || '—';
          const desk = bk.desk?.deskNumber || '—';
          const amt  = `₹${Number(bk.finalAmount||0).toFixed(0)}`;
          const time = fmtDate(bk.startTime);
          const st   = bk.status;
          const actionBtns = st === 'PENDING'
            ? `<button onclick="App.confirmBooking('${bk.id}', this)" style="padding:3px 8px;background:rgba(52,211,153,.15);color:#34d399;border:0.5px solid rgba(52,211,153,.3);border-radius:5px;font-size:10px;font-weight:700;cursor:pointer;margin-right:3px">✓ Approve</button>
               <button onclick="App.rejectBooking('${bk.id}', this)" style="padding:3px 8px;background:rgba(248,113,113,.12);color:#f87171;border:0.5px solid rgba(248,113,113,.3);border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">✗ Reject</button>`
            : `<span class="badge ${st==='CONFIRMED'?'bs':st==='CANCELLED'?'be':'bw'}">${st}</span>`;
          return `<div class="trow" style="grid-template-columns:1.5fr 1.5fr 1.2fr 1fr 1.5fr 1.2fr">
            <div class="cn" style="font-size:11px">${name}</div>
            <div class="ct">${ws}</div>
            <div class="ct">${desk}</div>
            <div style="font-size:11px;font-weight:700;color:#818cf8">${amt}</div>
            <div style="font-size:10px;color:var(--txt3)">${time}</div>
            <div style="display:flex;gap:3px;align-items:center">${actionBtns}</div>
          </div>`;
        }).join('') : `<div style="padding:24px;text-align:center;color:var(--txt3);font-size:12px">No bookings found.</div>`}
      </div>`;
    } catch (err) {
      setHtml(b, errCard(err.message));
    }
  }

  async function confirmBooking(id, btn) {
    btn.disabled = true; btn.textContent = '…';
    try {
      await API.bookings.confirm(id);
      toast('Booking confirmed ✓');
      loadBookings('PENDING');
    } catch (err) { toastErr(err.message); btn.disabled = false; btn.textContent = '✓ Approve'; }
  }

  async function rejectBooking(id, btn) {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    btn.disabled = true; btn.textContent = '…';
    try {
      await API.bookings.reject(id, reason);
      toast('Booking rejected');
      loadBookings('PENDING');
    } catch (err) { toastErr(err.message); btn.disabled = false; btn.textContent = '✗ Reject'; }
  }

  /* ─────────── PAYMENTS ─────────── */
  async function rPay(b, btns, isSilent = false) {
    btns.innerHTML = `<button class="dbtn" onclick="App.payPlatformFee()">Pay Platform Fee</button>`;
    if (!isSilent) setHtml(b, loadingCard());
    try {
      const res = await API.payments.getManagerPayments();
      const list = res?.data || res || [];
      const total   = list.filter(p => p.status==='SUCCESS').reduce((a,p) => a + Number(p.amount||0), 0);
      const refunds = list.filter(p => p.status==='REFUNDED'||p.status==='PARTIAL_REFUND').reduce((a,p) => a + Number(p.refundAmount||0), 0);
      const pending = list.filter(p => p.status==='PENDING').length;
      b.innerHTML = `
      <div class="g4">${[
        ['Received',  `₹${fmtNum(total)}`,   'Successful payments', '#34d399'],
        ['GST (18%)', `₹${fmtNum(total*0.18)}`, 'Estimated GST',   '#818cf8'],
        ['Refunds',   `₹${fmtNum(refunds)}`, 'Refunded amount',    '#f87171'],
        ['Pending',   pending,               'Awaiting capture',   '#fbbf24'],
      ].map(([l,v,s,c]) => `<div class="sc"><div class="sc-lb">${l}</div><div class="sc-v" style="color:${c};font-size:${String(v).length>6?'14px':'18px'}">${v}</div><div class="sc-s">${s}</div></div>`).join('')}</div>
      <div class="tbl"><div class="tbl-bar"><div class="tbl-ttl">Transactions</div><span style="font-size:10px;font-weight:700;background:rgba(52,211,153,.12);color:#34d399;padding:3px 8px;border-radius:100px">Razorpay</span></div>
        <div class="thead" style="grid-template-columns:1.5fr 2fr 1fr 1fr 1fr"><span>Invoice</span><span>Customer</span><span>Amount</span><span>Method</span><span>Status</span></div>
        ${list.length ? list.map(p => {
          const inv  = p.booking?.invoice?.invoiceNumber || p.razorpayOrderId?.substring(0,12) || '—';
          const cust = p.booking?.customer?.user?.name || '—';
          const amt  = `₹${Number(p.amount||0).toFixed(0)}`;
          const meth = p.method || 'UPI';
          const st   = p.status;
          return `<div class="trow" style="grid-template-columns:1.5fr 2fr 1fr 1fr 1fr">
            <div style="font-size:10px;font-family:monospace;color:#818cf8">${inv}</div>
            <div class="ct">${cust}</div>
            <div style="font-size:11px;font-weight:700;color:var(--txt)">${amt}</div>
            <span class="badge bi">${meth}</span>
            <span class="badge ${st==='SUCCESS'?'bs':st==='PENDING'?'bw':'be'}">${st}</span>
          </div>`;
        }).join('') : `<div style="padding:24px;text-align:center;color:var(--txt3);font-size:12px">No payment records yet.</div>`}
      </div>`;
    } catch (err) {
      setHtml(b, errCard(err.message));
    }
  }

  async function payPlatformFee() {
    const month = prompt('Enter month (YYYY-MM):', new Date().toISOString().substring(0, 7));
    if (!month) return;
    try {
      const res = await API.payments.payPlatformFee(month);
      const d = res?.data || res;
      toast(`Razorpay order created: ${d.orderId}. Amount: ₹${(d.amount/100).toFixed(0)}`);
    } catch (err) { toastErr(err.message); }
  }

  /* ─────────── ISSUES ─────────── */
  async function rIss(b, btns, isSilent = false) {
    btns.innerHTML = `<button class="dbtn pr" onclick="App.openMod('workspace')">Get Workspace ID</button>`;
    // Fetch first workspace to load issues for
    if (!isSilent) setHtml(b, loadingCard());
    try {
      const wsRes = await API.workspaces.getMy();
      const wsList = wsRes?.data || wsRes || [];
      if (!wsList.length) {
        setHtml(b, emptyCard('No workspaces found. Create a workspace first to track issues.'));
        return;
      }
      const wsId = wsList[0].id;
      const res = await API.issues.getAll(wsId);
      const list = res?.data || res || [];
      const open     = list.filter(i => i.status==='OPEN').length;
      const inProg   = list.filter(i => i.status==='IN_PROGRESS').length;
      const resolved = list.filter(i => i.status==='RESOLVED').length;
      b.innerHTML = `
      <div class="g3">${[
        ['Open',        open,     '2 high priority', '#f87171'],
        ['In Progress', inProg,   'Assigned to staff','#fbbf24'],
        ['Resolved',    resolved, 'Today',            '#34d399'],
      ].map(([l,v,s,c]) => `<div class="sc"><div class="sc-lb">${l}</div><div class="sc-v" style="color:${c}">${v}</div><div class="sc-s">${s}</div></div>`).join('')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${list.length ? list.map(iss => {
          const st     = iss.status;
          const pc     = st==='OPEN'?'#f87171':st==='IN_PROGRESS'?'#fbbf24':'#34d399';
          const badgec = st==='OPEN'?'be':st==='IN_PROGRESS'?'bw':'bs';
          return `<div style="background:var(--bg2);border:0.5px solid var(--border);border-left:2px solid ${pc};border-radius:0 10px 10px 0;padding:11px">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px">
              <div style="font-size:11px;font-weight:700;color:var(--txt)">${iss.description.substring(0,50)}</div>
            </div>
            <div style="font-size:10px;color:var(--txt3);margin-bottom:7px">📍 Desk: ${iss.desk?.deskNumber || 'Workspace'}</div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="badge ${badgec}">${st}</span>
              ${st!=='RESOLVED'
                ? `<button onclick="App.escalateIssue('${iss.id}', this)" style="padding:3px 8px;background:rgba(251,191,36,.12);color:#fbbf24;border:0.5px solid rgba(251,191,36,.3);border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">Escalate</button>`
                : ''}
            </div>
          </div>`;
        }).join('') : `<div style="padding:24px;text-align:center;color:var(--txt3);font-size:12px;grid-column:1/-1">No issues found. All clear! ✅</div>`}
      </div>`;
    } catch (err) {
      setHtml(b, errCard(err.message));
    }
  }

  async function escalateIssue(id, btn) {
    btn.disabled = true; btn.textContent = '…';
    try {
      await API.issues.escalate(id);
      toast('Issue escalated to admin ⚠️');
      if (currentMod === 'issues') openMod('issues');
    } catch (err) { toastErr(err.message); btn.disabled = false; btn.textContent = 'Escalate'; }
  }

  /* ─────────── STAFF ─────────── */
  async function rStaff(b, btns, isSilent = false) {
    btns.innerHTML = `<button class="dbtn pr" id="gen-code-btn" onclick="App.genStaffCode()">Gen Invite Code</button>`;
    if (!isSilent) setHtml(b, loadingCard());
    try {
      const res = await API.workspaces.getMyStaff();
      const list = res?.data || res || [];
      b.innerHTML = `
      <div class="g4">${[
        ['Staff Members', list.length,                              'Total', '#818cf8'],
        ['Active',        list.filter(s=>s.isActive).length,        'On duty','#34d399'],
        ['Workspaces',    [...new Set(list.map(s=>s.workspaceId).filter(Boolean))].length, 'Assigned','#818cf8'],
        ['Unassigned',    list.filter(s=>!s.workspaceId).length,   'Pending','#fbbf24'],
      ].map(([l,v,s,c]) => `<div class="sc"><div class="sc-lb">${l}</div><div class="sc-v" style="color:${c}">${v}</div><div class="sc-s">${s}</div></div>`).join('')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${list.length ? list.map(s => {
          const name = s.user?.name || '—';
          const email= s.user?.email || '';
          const wsName = s.workspace?.name || 'Unassigned';
          const ini  = name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
          const colors = ['#4f46e5','#7c3aed','#059669','#0891b2','#d97706','#dc2626'];
          const col  = colors[name.charCodeAt(0) % colors.length];
          return `<div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:10px;padding:12px;display:flex;gap:10px;align-items:center">
            <div style="width:36px;height:36px;border-radius:9px;background:${col};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${ini}</div>
            <div style="flex:1">
              <div style="font-size:12px;font-weight:700;color:var(--txt)">${name}</div>
              <div style="font-size:10px;color:var(--txt3)">${email}</div>
              <div style="display:flex;gap:5px;margin-top:5px">
                <span style="font-size:9px;background:rgba(99,102,241,.12);color:#818cf8;padding:1px 6px;border-radius:100px">${wsName}</span>
                <span class="badge ${s.isActive?'bs':'bw'}">${s.isActive?'Active':'Inactive'}</span>
              </div>
            </div>
          </div>`;
        }).join('') : `<div style="padding:24px;text-align:center;color:var(--txt3);font-size:12px;grid-column:1/-1">No staff yet. Generate an invite code to onboard your team.</div>`}
      </div>`;
    } catch (err) {
      setHtml(b, errCard(err.message));
    }
  }

  async function genStaffCode() {
    const btn = document.getElementById('gen-code-btn');
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    try {
      const res = await API.workspaces.generateStaffCode();
      const d = res?.data || res;
      const code = d?.code || 'ERROR';
      const exp  = d?.expiresAt ? new Date(d.expiresAt).toLocaleDateString('en-IN') : '';
      // Show code in a styled modal
      showCodeModal(code, exp);
    } catch (err) {
      toastErr(err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Gen Invite Code'; }
    }
  }

  function showCodeModal(code, expiresAt) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;display:flex;align-items:center;justify-content:center';
    ov.innerHTML = `
    <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:28px 32px;width:320px;text-align:center">
      <div style="font-size:12px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Staff Invite Code</div>
      <div style="font-size:32px;font-weight:800;font-family:monospace;letter-spacing:4px;color:var(--accent2);background:var(--bg3);padding:16px;border-radius:10px;margin-bottom:12px">${code}</div>
      <div style="font-size:11px;color:var(--txt3);margin-bottom:20px">Share this code with your staff member. Valid until ${expiresAt}.</div>
      <button onclick="navigator.clipboard.writeText('${code}');App.toast('Copied!')" style="padding:8px 18px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin-right:8px">Copy Code</button>
      <button onclick="this.closest('div[style]').remove()" style="padding:8px 18px;background:var(--bg3);color:var(--txt2);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Close</button>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  }

  /* ─────────── CUSTOMERS ─────────── */
  async function rCust(b, btns, isSilent = false) {
    btns.innerHTML = `<button class="dbtn pr" onclick="App.showWarnModal()">Issue Warning</button>`;
    if (!isSilent) setHtml(b, loadingCard());
    try {
      const res = await API.users.getManagerCustomers();
      const list = res?.data || res || [];
      b.innerHTML = `
      <div class="g4">${[
        ['Members',  list.length,                                      '↑ All time',        '#818cf8'],
        ['Active',   list.filter(c=>c.user?.isActive).length,          'Active accounts',   '#34d399'],
        ['Warned',   list.filter(c=>c.warnings?.length>0).length,      'With warnings',     '#f87171'],
        ['Avg Points',list.length ? Math.round(list.reduce((a,c)=>a+(c.loyaltyPoints||0),0)/list.length) : 0, 'Loyalty', '#fbbf24'],
      ].map(([l,v,s,c]) => `<div class="sc"><div class="sc-lb">${l}</div><div class="sc-v" style="color:${c}">${v}</div><div class="sc-s">${s}</div></div>`).join('')}</div>
      <div class="tbl"><div class="tbl-bar"><div class="tbl-ttl">Members</div></div>
        <div class="thead" style="grid-template-columns:2fr 1.5fr 1fr 1fr 1fr"><span>Name</span><span>Email</span><span>Points</span><span>Warnings</span><span>Status</span></div>
        ${list.length ? list.map(c => `
        <div class="trow" style="grid-template-columns:2fr 1.5fr 1fr 1fr 1fr">
          <div class="cn" style="font-size:11px">${c.user?.name||'—'}</div>
          <div class="ct" style="font-size:10px">${c.user?.email||'—'}</div>
          <div style="font-size:11px;font-weight:700;color:#fbbf24">${c.loyaltyPoints||0}</div>
          <div class="ct">${c.warnings?.length||0}</div>
          <span class="badge ${c.user?.isActive?'bs':'be'}">${c.user?.isActive?'Active':'Inactive'}</span>
        </div>`) .join('') : `<div style="padding:24px;text-align:center;color:var(--txt3);font-size:12px">No customers found yet.</div>`}
      </div>`;
    } catch (err) {
      setHtml(b, errCard(err.message));
    }
  }

  function showWarnModal() {
    const customerId = prompt('Customer ID to warn:');
    if (!customerId) return;
    const reason = prompt('Warning reason:');
    if (!reason) return;
    API.users.warnCustomer({ customerId, reason })
      .then(() => { toast('Warning issued'); if (currentMod === 'customers') openMod('customers'); })
      .catch(err => toastErr(err.message));
  }

  /* ─────────── NOTIFICATIONS ─────────── */
  async function rNotif(b, btns, isSilent = false) {
    btns.innerHTML = `<button class="dbtn" onclick="App.markAllRead()">✓ Mark All Read</button>`;
    if (!isSilent) setHtml(b, loadingCard());
    try {
      const res = await API.notifications.getUnread();
      const list = res?.data || res || [];
      const icons = { new_booking:'📅', payment_success:'💰', new_issue:'🔧', refund:'🔄', issue_resolved:'✅', account_banned:'⛔', booking_confirmed:'🎉' };
      b.innerHTML = `
      <div class="g4">${[
        ['Unread', list.length, 'Pending notifications','#f87171'],
        ['Sent',   '—',        'Track in WATI',         '#818cf8'],
        ['WhatsApp','—',       'Configure in Settings', '#34d399'],
        ['Delivery','—',       'Real-time',             '#34d399'],
      ].map(([l,v,s,c]) => `<div class="sc"><div class="sc-lb">${l}</div><div class="sc-v" style="color:${c}">${v}</div><div class="sc-s">${s}</div></div>`).join('')}</div>
      <div style="display:flex;flex-direction:column;gap:7px">
        ${list.length ? list.map(n => `
        <div style="display:flex;gap:9px;padding:11px;border:0.5px solid rgba(99,102,241,.35);border-radius:9px;background:rgba(99,102,241,.05)">
          <div style="width:30px;height:30px;border-radius:8px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">${icons[n.type]||'🔔'}</div>
          <div style="flex:1">
            <div style="font-size:11px;font-weight:700;color:var(--txt)">${n.title}</div>
            <div style="font-size:10px;color:var(--txt3);margin-top:2px">${n.body}</div>
          </div>
          <div style="font-size:10px;color:var(--txt3);white-space:nowrap">${fmtDate(n.createdAt)}</div>
        </div>`) .join('') : `<div style="padding:24px;text-align:center;color:var(--txt3);font-size:12px">No unread notifications. All clear! ✅</div>`}
      </div>`;
    } catch (err) {
      setHtml(b, errCard(err.message));
    }
  }

  async function markAllRead() {
    try {
      const res = await API.notifications.getUnread();
      const list = res?.data || res || [];
      const ids = list.map(n => n.id);
      if (ids.length) await API.notifications.markRead(ids);
      toast('All notifications marked as read ✓');
      if (currentMod === 'notifications') openMod('notifications');
    } catch (err) { toastErr(err.message); }
  }

  /* ─────────── ANALYTICS ─────────── */
  async function rAnalytics(b, btns, isSilent = false) {
    btns.innerHTML = `<button class="dbtn" onclick="App.toast('Export coming soon!')">Export PDF</button>`;
    if (!isSilent) setHtml(b, loadingCard());
    try {
      const [dashRes, bookRes, wsRes] = await Promise.all([
        API.workspaces.getDashboard(),
        API.bookings.getManagerBookings('').catch(() => ({ data: [] })),
        API.workspaces.getMy().catch(() => ({ data: [] })),
      ]);
      const d      = dashRes?.data || dashRes || {};
      const bkList = bookRes?.data || bookRes || [];
      const wsList = wsRes?.data   || wsRes   || [];

      // Revenue by workspace
      const revByWs = {};
      wsList.forEach(w => { revByWs[w.name] = 0; });
      bkList.forEach(bk => {
        if (bk.status === 'CONFIRMED' && bk.totalAmount) {
          const wsName = bk.workspace?.name || bk.desk?.workspace?.name || 'Unknown';
          revByWs[wsName] = (revByWs[wsName] || 0) + Number(bk.totalAmount);
        }
      });

      // Bookings by day of week
      const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const dowCounts = [0,0,0,0,0,0,0];
      bkList.forEach(bk => {
        const day = new Date(bk.createdAt).getDay();
        if (!isNaN(day)) dowCounts[day]++;
      });
      const maxDow = Math.max(...dowCounts, 1);

      // Status breakdown
      const statusBreakdown = {
        CONFIRMED: bkList.filter(b=>b.status==='CONFIRMED').length,
        PENDING:   bkList.filter(b=>b.status==='PENDING').length,
        CANCELLED: bkList.filter(b=>b.status==='CANCELLED').length,
      };
      const totalBk = bkList.length || 1;

      // Revenue trend: last 7 days
      const revByDay = {};
      const today = new Date(); today.setHours(0,0,0,0);
      for (let i=6; i>=0; i--) {
        const d2 = new Date(today); d2.setDate(d2.getDate()-i);
        revByDay[d2.toISOString().split('T')[0]] = 0;
      }
      bkList.forEach(bk => {
        const dk = (bk.createdAt||'').split('T')[0];
        if (dk in revByDay && bk.status==='CONFIRMED') revByDay[dk] += Number(bk.totalAmount||0);
      });
      const revDays = Object.entries(revByDay);
      const maxRev = Math.max(...revDays.map(([,v])=>v), 1);
      const wsRevEntries = Object.entries(revByWs).filter(([,v])=>v>0);
      const maxWsRev = Math.max(...wsRevEntries.map(([,v])=>v), 1);

      b.innerHTML = `
      <!-- KPI Row -->
      <div class="g4" style="margin-bottom:16px">${[
        ['Total Revenue',   `₹${fmtNum(Number(d.totalRevenue||0))}`,
          'Money earned from all confirmed bookings.',           '#818cf8', '💰'],
        ['Total Bookings',  String(d.totalBookings??bkList.length),
          'All bookings ever made — high numbers = strong demand.',  '#34d399', '📅'],
        ['Pending',         String(d.pendingBookings??statusBreakdown.PENDING),
          'Bookings awaiting your approval. Approve quickly.',   '#fbbf24', '⏳'],
        ['Active Spaces',   String(d.workspaces??wsList.filter(w=>w.status==='ACTIVE').length),
          'Workspaces currently live for booking.',              '#38bdf8', '🏢'],
      ].map(([l,v,insight,c,ic]) => `
        <div class="sc" style="position:relative;overflow:hidden">
          <div style="position:absolute;top:10px;right:12px;font-size:18px;opacity:0.15">${ic}</div>
          <div class="sc-lb">${l}</div>
          <div class="sc-v" style="color:${c};font-size:${String(v).length>6?'14px':'20px'}">${v}</div>
          <div class="sc-s" style="font-size:9px;line-height:1.3">${insight}</div>
        </div>`).join('')}</div>

      <!-- Charts Row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <!-- Revenue Last 7 Days -->
        <div class="cc">
          <div class="cc-ttl">📈 Revenue — Last 7 Days
            <span style="float:right;font-size:9px;color:var(--txt3);font-weight:400">Spot your busiest days</span>
          </div>
          <div style="display:flex;align-items:flex-end;gap:6px;height:90px;padding:10px 0 0">
            ${revDays.map(([dk,rv]) => {
              const pct = Math.round((rv/maxRev)*100);
              const label = new Date(dk+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short'});
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
                <div style="font-size:8px;color:var(--txt3)">${rv>0?'₹'+fmtNum(rv):''}</div>
                <div style="width:100%;background:var(--border2);border-radius:4px 4px 0 0;height:60px;display:flex;align-items:flex-end">
                  <div style="width:100%;height:${Math.max(pct,2)}%;background:linear-gradient(180deg,#818cf8,#4f46e5);border-radius:4px 4px 0 0;min-height:3px"></div>
                </div>
                <div style="font-size:8px;color:var(--txt3)">${label}</div>
              </div>`;
            }).join('')}
          </div>
          <div style="font-size:9px;color:var(--txt3);margin-top:6px;text-align:center">
            Total: <strong style="color:var(--txt)">₹${fmtNum(revDays.reduce((a,[,v])=>a+v,0))}</strong> this week
          </div>
        </div>
        <!-- Bookings by Day of Week -->
        <div class="cc">
          <div class="cc-ttl">📊 Bookings by Day of Week
            <span style="float:right;font-size:9px;color:var(--txt3);font-weight:400">Plan staffing around peak days</span>
          </div>
          <div style="display:flex;align-items:flex-end;gap:6px;height:90px;padding:10px 0 0">
            ${dow.map((label, i) => {
              const cnt = dowCounts[i];
              const pct = Math.round((cnt/maxDow)*100);
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
                <div style="font-size:8px;color:var(--txt3)">${cnt||''}</div>
                <div style="width:100%;background:var(--border2);border-radius:4px 4px 0 0;height:60px;display:flex;align-items:flex-end">
                  <div style="width:100%;height:${Math.max(pct,2)}%;background:linear-gradient(180deg,#34d399,#059669);border-radius:4px 4px 0 0;min-height:3px"></div>
                </div>
                <div style="font-size:8px;color:var(--txt3)">${label}</div>
              </div>`;
            }).join('')}
          </div>
          <div style="font-size:9px;color:var(--txt3);margin-top:6px;text-align:center">
            Peak day: <strong style="color:var(--txt)">${dow[dowCounts.indexOf(Math.max(...dowCounts))]}</strong>
          </div>
        </div>
      </div>

      <!-- Second Row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <!-- Booking Status Donut -->
        <div class="cc">
          <div class="cc-ttl">🍩 Booking Status Breakdown
            <span style="float:right;font-size:9px;color:var(--txt3);font-weight:400">High cancellations? Try flexible pricing</span>
          </div>
          <div style="display:flex;gap:16px;align-items:center;padding:10px 0">
            <div style="position:relative;width:80px;height:80px;flex-shrink:0">
              <svg viewBox="0 0 36 36" style="width:80px;height:80px;transform:rotate(-90deg)">
                ${(() => {
                  const colors = { CONFIRMED:'#34d399', PENDING:'#fbbf24', CANCELLED:'#f87171' };
                  let offset = 0;
                  return Object.entries(statusBreakdown).map(([st, cnt]) => {
                    const pct = (cnt/totalBk)*100;
                    const seg = `<circle cx="18" cy="18" r="15.9" fill="none" stroke="${colors[st]}" stroke-width="3.5"
                      stroke-dasharray="${pct} ${100-pct}" stroke-dashoffset="-${offset}" style="transition:stroke-dasharray .3s"/>`;
                    offset += pct;
                    return seg;
                  }).join('');
                })()}
              </svg>
              <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
                <div style="font-size:14px;font-weight:800;color:var(--txt)">${bkList.length}</div>
                <div style="font-size:8px;color:var(--txt3)">total</div>
              </div>
            </div>
            <div style="flex:1;display:flex;flex-direction:column;gap:7px">
              ${Object.entries(statusBreakdown).map(([st, cnt]) => {
                const colors = { CONFIRMED:'#34d399', PENDING:'#fbbf24', CANCELLED:'#f87171' };
                const pct = Math.round((cnt/totalBk)*100);
                return `<div>
                  <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px">
                    <span style="color:${colors[st]};font-weight:700">${st}</span>
                    <span style="color:var(--txt2)">${cnt} (${pct}%)</span>
                  </div>
                  <div style="height:4px;background:var(--border2);border-radius:2px">
                    <div style="height:100%;width:${pct}%;background:${colors[st]};border-radius:2px"></div>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>
        <!-- Revenue by Workspace -->
        <div class="cc">
          <div class="cc-ttl">🏢 Revenue by Workspace
            <span style="float:right;font-size:9px;color:var(--txt3);font-weight:400">Identify top earners</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;padding:10px 0">
            ${wsRevEntries.length ? wsRevEntries.sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name, rev]) => {
              const pct = Math.round((rev/maxWsRev)*100);
              return `<div>
                <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px">
                  <span style="color:var(--txt2);font-weight:600;max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span>
                  <span style="color:#818cf8;font-weight:700">₹${fmtNum(rev)}</span>
                </div>
                <div style="height:6px;background:var(--border2);border-radius:3px">
                  <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#818cf8,#4f46e5);border-radius:3px"></div>
                </div>
              </div>`;
            }).join('') : `<div style="padding:20px 0;text-align:center;color:var(--txt3);font-size:11px">No confirmed bookings with revenue yet.<br>Revenue will appear here once bookings are approved.</div>`}
          </div>
        </div>
      </div>`;
    } catch (err) {
      setHtml(b, errCard(err.message));
    }
  }

  /* ─────────── COUPONS ─────────── */
  async function rCoupons(b, btns, isSilent = false) {
    btns.innerHTML = `<button class="dbtn pr" onclick="App.showAddCouponModal()">+ Coupon</button>`;
    if (!isSilent) setHtml(b, loadingCard());
    try {
      const wsRes = await API.workspaces.getMy();
      const wsList = wsRes?.data || wsRes || [];
      if (!wsList.length) { setHtml(b, emptyCard('Create a workspace first.')); return; }
      const wsId = wsList[0].id;
      const res = await API.workspaces.getCoupons(wsId);
      const list = res?.data || res || [];
      const active = list.filter(c=>c.isActive).length;
      b.innerHTML = `
      <div class="g3">${[
        ['Active',   active,           'Current promos',   '#818cf8'],
        ['Total',    list.length,      'All time',         '#4f46e5'],
        ['Uses',     list.reduce((a,c)=>a+(c.usedCount||0),0), 'Total uses','#34d399'],
      ].map(([l,v,s,c]) => `<div class="sc"><div class="sc-lb">${l}</div><div class="sc-v" style="color:${c}">${v}</div><div class="sc-s">${s}</div></div>`).join('')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${list.length ? list.map(c => {
                                              const disc = c.discountPercent ? `${c.discountPercent}% off` : c.discountFlat ? `?${c.discountFlat} off` : 'Discount';
            const pct  = c.maxUses ? Math.min(100, Math.round((c.usedCount||0)/c.maxUses*100)) : 0;
            const visibilityBadge = c.isPublic ? '<span style="background:rgba(52,211,153,.1);color:#34d399;padding:2px 4px;border-radius:4px;font-size:8px;font-weight:800;border:0.5px solid rgba(52,211,153,.3)">PUBLIC</span>' : '<span style="background:rgba(248,113,113,.1);color:#f87171;padding:2px 4px;border-radius:4px;font-size:8px;font-weight:800;border:0.5px solid rgba(248,113,113,.3)">PRIVATE</span>';
            const minOrd = c.minOrderValue ? ` <span style="font-size:9px;color:var(--txt3);font-weight:400">(Min: ?${c.minOrderValue})</span>` : '';
            return `<div style="background:var(--bg2);border:0.5px dashed var(--border2);border-radius:10px;padding:12px;display:flex;gap:10px;align-items:center;position:relative">
              <div style="text-align:center;padding:8px 10px;background:var(--bg3);border-radius:7px;border-right:1.5px dashed var(--border2)">
                <div style="font-size:11px;font-weight:800;font-family:monospace;color:#818cf8;letter-spacing:1px">${c.code}</div>
                <div style="font-size:8px;color:var(--txt3);margin-top:1px">COUPON</div>
              </div>
              <div style="flex:1">
                <div style="font-size:14px;font-weight:800;color:var(--txt)">${disc} ${visibilityBadge}${minOrd}</div>
                <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--txt3);margin-top:2px;align-items:center"><span>${c.usedCount || 0} / ${c.maxUses || '&infin;'} used</span><div style="display:flex;gap:4px;align-items:center"><span class="badge ${c.status === 'ACTIVE' ? 'active' : ''}">${c.status}</span></div></div>
                <div class="pt" style="margin-top:5px"><div class="pf" style="width:${pct}%;background:#4f46e5"></div></div>
              </div>
              <button onclick="App.deleteCoupon('${c.id}', this)" style="position:absolute;top:10px;right:10px;background:rgba(248,113,113,0.1);color:#f87171;border:0.5px solid rgba(248,113,113,0.3);border-radius:6px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer"><i class="ti ti-trash" style="font-size:12px"></i></button>
            </div>`;
        }).join('') : `<div style="padding:24px;text-align:center;color:var(--txt3);font-size:12px;grid-column:1/-1">No coupons yet. Click "+ Coupon" to create one.</div>`}
      </div>`;
    } catch (err) {
      setHtml(b, errCard(err.message));
    }
  }

  async function showAddCouponModal() {
    const wsRes = await API.workspaces.getMy().catch(()=>({ data:[] }));
    const wsList = wsRes?.data || wsRes || [];
    if (!wsList.length) { toastErr('Create a workspace first.'); return; }
    const wsId = wsList[0].id;
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;display:flex;align-items:center;justify-content:center';
    ov.innerHTML = `
    <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:28px 32px;width:340px">
      <div style="font-size:14px;font-weight:800;color:var(--txt);margin-bottom:18px">Create Coupon</div>
      <div class="auth-field"><label>Coupon Code</label><input id="cp-code" type="text" placeholder="SUMMER20" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
      <div class="auth-field"><label>Discount % (leave 0 for flat)</label><input id="cp-pct" type="number" placeholder="20" value="0" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
              <div class="auth-field"><label>Flat Discount ? (leave 0 for %)</label><input id="cp-flat" type="number" placeholder="0" value="0" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
        <div class="auth-field"><label>Min Order Value ? (Optional)</label><input id="cp-min" type="number" placeholder="0" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
        <div class="auth-field" style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <input type="checkbox" id="cp-public" style="accent-color:var(--accent);width:16px;height:16px;cursor:pointer">
          <label for="cp-public" style="margin:0;cursor:pointer;color:var(--txt2)">Public Coupon (Visible on checkout)</label>
        </div>
      <div class="auth-field"><label>Max Uses</label><input id="cp-max" type="number" value="100" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
      <div class="auth-field"><label>Valid From</label><input id="cp-from" type="date" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
      <div class="auth-field"><label>Valid Until</label><input id="cp-until" type="date" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
      <div id="cp-err" style="font-size:11px;color:#f87171;margin-bottom:8px;min-height:14px"></div>
      <div style="display:flex;gap:8px">
        <button onclick="App.submitCoupon('${wsId}', this)" style="flex:1;padding:9px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Create Coupon</button>
        <button onclick="this.closest('div[style]').remove()" style="padding:9px 14px;background:var(--bg3);color:var(--txt2);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Cancel</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const next  = new Date(Date.now() + 30*864e5).toISOString().split('T')[0];
    document.getElementById('cp-from').value  = today;
    document.getElementById('cp-until').value = next;
  }

  async function submitCoupon(wsId, btn) {
    const code  = document.getElementById('cp-code').value.trim().toUpperCase();
    const pct   = parseFloat(document.getElementById('cp-pct').value  || '0');
    const flat  = parseFloat(document.getElementById('cp-flat').value || '0');
    const maxUs = parseInt(document.getElementById('cp-max').value   || '100');
    const from  = document.getElementById('cp-from').value;
    const until = document.getElementById('cp-until').value;
    const errEl = document.getElementById('cp-err');
    if (!code) { errEl.textContent = 'Coupon code required.'; return; }
    if (!from || !until) { errEl.textContent = 'Valid dates required.'; return; }
    btn.disabled = true; btn.textContent = 'Creating…';
    try {
      await API.workspaces.createCoupon(wsId, {
        code,
        discountPercent: pct > 0 ? pct : undefined,
        discountFlat:    flat > 0 ? flat : undefined,
        maxUses: maxUs, validFrom: from, validUntil: until,
      });
      btn.closest('div[style]').remove();
      toast('Coupon created! 🎟️');
      if (currentMod === 'coupons') openMod('coupons');
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Create Coupon';
    }
  }

  async function deleteCoupon(couponId, btn) {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    btn.disabled = true;
    try {
      await API.workspaces.deleteCoupon(couponId);
      toast('Coupon deleted');
      if (currentMod === 'coupons') openMod('coupons');
    } catch (err) {
      toastErr(err.message);
      btn.disabled = false;
    }
  }

  /* ─────────── SETTINGS ─────────── */
  async function rSettings(b, btns, isSilent = false) {
    btns.innerHTML = `<button class="dbtn pr" id="save-settings-btn" onclick="App.saveSettings()">Save Changes</button>`;
    if (!isSilent) setHtml(b, loadingCard());
    try {
      const res = await API.users.getMe();
      const u = res?.data || res || {};
      const m = u.managerProfile || {};
      b.innerHTML = `
      <div class="g2">
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:10px;padding:14px">
            <div style="font-size:11px;font-weight:700;color:var(--txt);margin-bottom:12px;padding-bottom:9px;border-bottom:0.5px solid var(--border)">👤 Personal Info</div>
            ${[
              ['Name',  'set-name',  'text',     u.name || ''],
              ['Phone', 'set-phone', 'tel',      u.phone || ''],
            ].map(([l,id,t,v]) => `<div style="margin-bottom:9px"><div style="font-size:9px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">${l}</div>
              <input id="${id}" type="${t}" value="${v}" style="width:100%;padding:7px 9px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:7px;font-size:11px;color:var(--txt);outline:none;font-family:inherit"></div>`).join('')}
          </div>
          <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:10px;padding:14px">
            <div style="font-size:11px;font-weight:700;color:var(--txt);margin-bottom:12px;padding-bottom:9px;border-bottom:0.5px solid var(--border)">🏢 Business Details</div>
            ${[
              ['Business Name', 'set-biz',  'text', m.businessName  || ''],
              ['GST Number',    'set-gst',  'text', m.gstNumber     || ''],
              ['PAN Number',    'set-pan',  'text', m.panNumber     || ''],
              ['Bank Account',  'set-bank', 'text', m.bankAccountNumber || ''],
              ['Bank IFSC',     'set-ifsc', 'text', m.bankIfsc      || ''],
            ].map(([l,id,t,v]) => `<div style="margin-bottom:9px"><div style="font-size:9px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">${l}</div>
              <input id="${id}" type="${t}" value="${v}" style="width:100%;padding:7px 9px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:7px;font-size:11px;color:var(--txt);outline:none;font-family:inherit"></div>`).join('')}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:10px;overflow:hidden">
            <div style="padding:11px 13px;border-bottom:0.5px solid var(--border);font-size:11px;font-weight:700;color:var(--txt)">🔔 Notification Preferences</div>
            ${[['WhatsApp Business API',true],['Email Notifications',true],['SMS Alerts',false],['Instant Booking Alerts',true],['Low Occupancy Warnings',true],['Sound Notifications',false]].map(([l,on]) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 13px;border-bottom:0.5px solid var(--border)">
              <div style="font-size:11px;font-weight:600;color:var(--txt)">${l}</div>
              <div data-on="${on}" onclick="App.toggleSw(this)" style="width:34px;height:18px;border-radius:100px;background:${on?'#4f46e5':'var(--border2)'};position:relative;cursor:pointer;transition:background .2s">
                <div style="width:12px;height:12px;background:#fff;border-radius:50%;position:absolute;top:3px;left:${on?'19':'3'}px;transition:left .18s"></div>
              </div>
            </div>`).join('')}
          </div>
          <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:10px;padding:14px">
            <div style="font-size:11px;font-weight:700;color:var(--txt);margin-bottom:12px;padding-bottom:9px;border-bottom:0.5px solid var(--border)">🔒 Security</div>
            <button onclick="App.showChangePwdModal()" style="width:100%;padding:9px;background:var(--bg3);color:var(--txt2);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Change Password</button>
          </div>
        </div>
      </div>`;
    } catch (err) {
      setHtml(b, errCard(err.message));
    }
  }

  async function saveSettings() {
    const btn = document.getElementById('save-settings-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      const name  = document.getElementById('set-name')?.value?.trim();
      const phone = document.getElementById('set-phone')?.value?.trim();
      await API.users.updateMe({ name, phone });
      await API.users.updateManagerProfile({
        businessName:      document.getElementById('set-biz')?.value?.trim(),
        gstNumber:         document.getElementById('set-gst')?.value?.trim(),
        panNumber:         document.getElementById('set-pan')?.value?.trim(),
        bankAccountNumber: document.getElementById('set-bank')?.value?.trim(),
        bankIfsc:          document.getElementById('set-ifsc')?.value?.trim(),
      });
      if (currentUser) currentUser.name = name;
      updateNavAv();
      toast('Settings saved ✓');
    } catch (err) {
      toastErr(err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
    }
  }

  function showChangePwdModal() {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;display:flex;align-items:center;justify-content:center';
    ov.innerHTML = `
    <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:28px 32px;width:320px">
      <div style="font-size:14px;font-weight:800;color:var(--txt);margin-bottom:18px">Change Password</div>
      <div class="auth-field"><label>Current Password</label><input id="pwd-cur" type="password" placeholder="••••••••" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
      <div class="auth-field"><label>New Password</label><input id="pwd-new" type="password" placeholder="Min 8 chars" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
      <div id="pwd-err" style="font-size:11px;color:#f87171;margin-bottom:8px;min-height:14px"></div>
      <div style="display:flex;gap:8px">
        <button onclick="App.submitChangePwd(this)" style="flex:1;padding:9px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Update Password</button>
        <button onclick="this.closest('div[style]').remove()" style="padding:9px 14px;background:var(--bg3);color:var(--txt2);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Cancel</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  }

  async function submitChangePwd(btn) {
    const cur = document.getElementById('pwd-cur').value;
    const nw  = document.getElementById('pwd-new').value;
    const errEl = document.getElementById('pwd-err');
    if (!cur || !nw) { errEl.textContent = 'Both fields required.'; return; }
    if (nw.length < 8) { errEl.textContent = 'New password must be at least 8 characters.'; return; }
    btn.disabled = true; btn.textContent = 'Updating…';
    try {
      await API.auth.changePassword(cur, nw);
      btn.closest('div[style]').remove();
      toast('Password changed successfully 🔒');
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Update Password';
    }
  }

  /* ─────────── MODALS ─────────── */
  /* ─────────── WIZARD ─────────── */
  let wizState = { step: 1, wsId: null, categories: [] };
  const typeLabels = { hot_desk: 'Hot Desk', private_cabin: 'Private Cabin', meeting_room: 'Meeting Room', shared_space: 'Shared Space', event_hall: 'Event Hall', virtual_office: 'Virtual Office', podcast_studio: 'Podcast Studio', training_room: 'Training Room' };
  const typeEmojis = { hot_desk: '💼', private_cabin: '🚪', meeting_room: '📋', shared_space: '👥', event_hall: '🎪', virtual_office: '🌐', podcast_studio: '🎙️', training_room: '📚' };

  function openCreateWorkspacePage() {
    wizState = { step: 1, wsId: null, categories: [] };
    const c = document.getElementById('content');
    c.innerHTML = `
      <div class="wiz-page">
        <div class="wiz-head">
          <div class="back" onclick="App.openMod('workspace')" style="margin-bottom:16px; display:inline-flex"><i class="ti ti-arrow-left"></i></div>
          <div class="wiz-title">Create New Workspace</div>
          <div class="wiz-sub">Follow these simple steps to list your new location.</div>
        </div>
        <div class="wiz-stepper">
          <div class="wiz-step active" id="wiz-st-1"><div class="wiz-step-num">1</div><div class="wiz-step-lbl">Basic Details</div></div>
          <div class="wiz-step" id="wiz-st-2"><div class="wiz-step-num">2</div><div class="wiz-step-lbl">Slideshow</div></div>
          <div class="wiz-step" id="wiz-st-3"><div class="wiz-step-num">3</div><div class="wiz-step-lbl">Categories</div></div>
          <div class="wiz-step" id="wiz-st-4"><div class="wiz-step-num">4</div><div class="wiz-step-lbl">Images</div></div>
        </div>
        <div id="wiz-body-container"></div>
      </div>
    `;
    renderWizStep(1);
  }

  function renderWizStep(step) {
    wizState.step = step;
    document.querySelectorAll('.wiz-step').forEach((el, i) => {
      el.className = 'wiz-step';
      if (i + 1 === step) el.classList.add('active');
      else if (i + 1 < step) el.classList.add('completed');
    });

    const b = document.getElementById('wiz-body-container');
    if (step === 1) renderWizStep1(b);
    else if (step === 2) renderWizStep2(b);
    else if (step === 3) renderWizStep3(b);
    else if (step === 4) renderWizStep4(b);
  }

  function renderWizStep1(b) {
    b.innerHTML = `
      <div class="wiz-step-body active">
        <div class="wiz-section">
          <div class="wiz-sec-lbl"><span>🏢</span> Workspace Information</div>
          <div class="auth-field"><label>Workspace Name</label><input id="ws-name" type="text" placeholder="CoWork HQ Downtown" style="width:100%;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:13px;color:var(--txt);outline:none;font-family:inherit"></div>
          <div class="auth-field"><label>Description</label><textarea id="ws-desc" placeholder="A premium coworking space..." style="width:100%;height:64px;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--txt);outline:none;font-family:inherit;resize:none"></textarea></div>
          <div class="auth-field"><label>Amenities (comma separated)</label><input id="ws-amenities" type="text" placeholder="WiFi, Coffee, AC, Conference Room" style="width:100%;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
        </div>
        <div class="wiz-section">
          <div class="wiz-sec-lbl"><span>📍</span> Location Details</div>
          <div class="auth-field"><label>Address</label><input id="ws-addr" type="text" placeholder="123 Main St" style="width:100%;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="auth-field"><label>City</label><input id="ws-city" type="text" placeholder="Pune" style="width:100%;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
            <div class="auth-field"><label>State</label><input id="ws-state" type="text" placeholder="Maharashtra" style="width:100%;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
          </div>
                      <div style="display:grid;grid-template-columns:1fr;gap:10px">
              <div class="auth-field"><label>Pincode</label><input id="ws-pin" type="text" placeholder="411001" style="width:100%;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
            </div>
            
            <div style="margin-top:16px;margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px">
                <label style="font-size:11px;font-weight:700;color:var(--txt2)">Pin Exact Location</label>
                <div style="display:flex;gap:6px">
                  <div style="position:relative">
                    <input id="ws-map-search" type="text" placeholder="Search area..." style="padding:6px 10px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);font-size:10px;width:120px;outline:none" onkeydown="if(event.key==='Enter')App.searchMapLocation()">
                    <button type="button" onclick="App.searchMapLocation()" style="position:absolute;right:2px;top:2px;bottom:2px;background:var(--accent2);color:#fff;border:none;border-radius:4px;padding:0 8px;font-size:10px;cursor:pointer"><i class="ti ti-search"></i></button>
                  </div>
                  <button type="button" onclick="App.detectLocation(event)" style="padding:6px 10px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px"><i class="ti ti-current-location"></i> Detect</button>
                </div>
              </div>
              <div id="ws-map" style="width:100%;height:220px;border-radius:12px;border:1px solid var(--border2);z-index:1"></div>
              <input type="hidden" id="ws-lat">
              <input type="hidden" id="ws-lng">
              <div style="font-size:9px;color:var(--txt3);margin-top:6px;text-align:right">Drag the marker to pinpoint the exact entrance.</div>
            </div>
          </div>
          <div class="wiz-section">
          <div class="wiz-sec-lbl"><span>🕒</span> Working Hours</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="auth-field" style="margin:0"><label>Open Time</label><input id="ws-open" type="text" value="09:00" placeholder="09:00" style="width:100%;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
            <div class="auth-field" style="margin:0"><label>Close Time</label><input id="ws-close" type="text" value="21:00" placeholder="21:00" style="width:100%;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
          </div>
        </div>
        <div id="wiz-err" style="font-size:11px;color:#f87171;margin-bottom:8px;min-height:14px;text-align:right"></div>
        <div class="wiz-nav">
          <div></div>
          <button class="wiz-btn wiz-btn-next" onclick="App.wizSubmitStep1(this)">Next Step →</button>
        </div>
      </div>
    `;
    
    // Pre-fill existing data if modifying
    if (wizState.wsId) {
      API.workspaces.getOne(wizState.wsId).then(res => {
        const ws = res?.data || res;
        document.getElementById('ws-name').value = ws.name || '';
        document.getElementById('ws-desc').value = ws.description || '';
        document.getElementById('ws-amenities').value = (ws.amenities || []).join(', ');
        document.getElementById('ws-addr').value = ws.address || '';
        document.getElementById('ws-city').value = ws.city || '';
        document.getElementById('ws-state').value = ws.state || '';
        document.getElementById('ws-pin').value = ws.pincode || '';
        document.getElementById('ws-lat').value = ws.latitude || '';
        document.getElementById('ws-lng').value = ws.longitude || '';
          App.initMap(ws.latitude, ws.longitude);
        }).catch(console.error);
      } else {
        App.initMap();
      }
    }

  async function wizSubmitStep1(btn) {
    const name = document.getElementById('ws-name').value.trim();
    const desc = document.getElementById('ws-desc').value.trim();
    const addr = document.getElementById('ws-addr').value.trim();
    const city = document.getElementById('ws-city').value.trim();
    const state = document.getElementById('ws-state').value.trim();
    const pin = document.getElementById('ws-pin').value.trim();
    const lat = parseFloat(document.getElementById('ws-lat').value || '18.5204');
    const lng = parseFloat(document.getElementById('ws-lng').value || '73.8567');
    const amenities = document.getElementById('ws-amenities').value.split(',').map(a => a.trim()).filter(Boolean);
    const openTime = document.getElementById('ws-open').value.trim();
    const closeTime = document.getElementById('ws-close').value.trim();
    const errEl = document.getElementById('wiz-err');

    if (!name || !addr || !city || !state || !pin) {
      errEl.textContent = 'Please fill all required fields.';
      return;
    }

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const workingHours = days.map(day => ({
      day, openTime, closeTime, isClosed: false,
    }));

    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      if (!wizState.wsId) {
        const res = await API.workspaces.create({ name, description: desc || undefined, address: addr, city, state, pincode: pin, latitude: lat, longitude: lng, amenities, workingHours });
        wizState.wsId = (res?.data || res).id;
        toast('Workspace created! ✓');
      } else {
        await API.workspaces.update(wizState.wsId, { name, description: desc || undefined, address: addr, city, state, pincode: pin, amenities });
        toast('Workspace updated! ✓');
      }
      renderWizStep(2);
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Next Step →';
    }
  }

  async function renderWizStep2(b) {
    b.innerHTML = `<div class="wiz-step-body active"><div style="padding:40px;text-align:center;color:var(--txt3)"><i class="ti ti-loader-2" style="animation:spin 1s linear infinite;font-size:28px"></i></div></div>`;
    try {
      const res = await API.workspaces.getOne(wizState.wsId);
      const ws = res?.data || res;
      const images = ws.images || [];
      const cover = images.find(img => img.order === 0);
      const gallery = images.filter(img => img.order > 0).sort((a,b) => a.order - b.order);
      const galleryLimit = 10;
      
      let coverHtml = cover ? `
        <div style="position:relative;height:240px;border-radius:12px;overflow:hidden;background:var(--bg3)">
          <img src="${cover.url}" style="width:100%;height:100%;object-fit:cover">
          <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.5),transparent)"></div>
          <button onclick="App.wizDeleteImage('${cover.id}', 2)" style="position:absolute;top:10px;right:10px;width:30px;height:30px;background:rgba(0,0,0,.65);color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;line-height:1">✕</button>
          <div style="position:absolute;bottom:12px;left:16px;font-size:11px;font-weight:700;color:rgba(255,255,255,.9);background:rgba(0,0,0,.5);padding:4px 10px;border-radius:100px">COVER</div>
        </div>` : `
        <label style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:240px;border:2px dashed var(--border2);border-radius:12px;cursor:pointer;background:var(--bg3);gap:12px;transition:border-color .2s" onmouseover="this.style.borderColor='var(--accent2)'" onmouseout="this.style.borderColor='var(--border2)'">
          <i class="ti ti-camera-plus" style="font-size:40px;color:var(--txt3)"></i>
          <div style="font-size:14px;font-weight:700;color:var(--txt3)">Upload Cover Image</div>
          <input type="file" accept="image/*" onchange="App.wizUploadImage(0, this, 2)" style="display:none">
        </label>`;

      let galleryHtml = gallery.map(img => `
        <div style="position:relative;aspect-ratio:4/3;border-radius:10px;overflow:hidden;background:var(--bg2)">
          <img src="${img.url}" style="width:100%;height:100%;object-fit:cover">
          <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.45),transparent)"></div>
          <button onclick="App.wizDeleteImage('${img.id}', 2)" style="position:absolute;top:6px;right:6px;width:24px;height:24px;background:rgba(0,0,0,.65);color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;line-height:1">✕</button>
          <div style="position:absolute;bottom:8px;left:10px;font-size:9px;font-weight:700;color:rgba(255,255,255,.9);background:rgba(0,0,0,.5);padding:2px 8px;border-radius:100px">SLIDE ${img.order}</div>
        </div>`).join('');

      if (gallery.length < galleryLimit) {
        let nextOrder = 1;
        while (gallery.find(g => g.order === nextOrder)) nextOrder++;
        galleryHtml += `
          <label style="display:flex;flex-direction:column;align-items:center;justify-content:center;aspect-ratio:4/3;border:2px dashed var(--border2);border-radius:10px;cursor:pointer;background:var(--bg3);gap:8px;transition:border-color .2s" onmouseover="this.style.borderColor='var(--accent2)'" onmouseout="this.style.borderColor='var(--border2)'">
            <i class="ti ti-plus" style="font-size:24px;color:var(--txt3)"></i>
            <div style="font-size:11px;font-weight:600;color:var(--txt3)">Add Slide</div>
            <input type="file" accept="image/*" onchange="App.wizUploadImage(${nextOrder}, this, 2)" style="display:none">
          </label>`;
      }

      b.innerHTML = `
        <div class="wiz-step-body active">
          <div class="wiz-section">
            <div class="wiz-sec-lbl"><span>📷</span> Main Cover</div>
            ${coverHtml}
          </div>
          <div class="wiz-section">
            <div class="wiz-sec-lbl"><span>🎞️</span> Slideshow Gallery (${gallery.length}/${galleryLimit})</div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
              ${galleryHtml}
            </div>
          </div>
          <div class="wiz-nav">
            <button class="wiz-btn wiz-btn-back" onclick="App.renderWizStep(1)">← Back</button>
            <div>
              <button class="wiz-btn wiz-btn-skip" onclick="App.renderWizStep(3)">Skip for now</button>
              <button class="wiz-btn wiz-btn-next" onclick="App.renderWizStep(3)">Next Step →</button>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      b.innerHTML = `<div class="wiz-step-body active">${errCard(err.message)}</div>`;
    }
  }

  async function wizUploadImage(order, input, stepToRender) {
    const file = input.files[0];
    if (!file) return;
    try {
      await API.workspaces.uploadImage(wizState.wsId, file, order);
      toast('Image uploaded! 🖼️');
      renderWizStep(stepToRender);
    } catch (err) { alert(err.message); }
  }

  async function wizDeleteImage(imageId, stepToRender) {
    if (!confirm('Delete this image?')) return;
    try {
      await API.workspaces.removeImage(imageId);
      toast('Image deleted ✓');
      renderWizStep(stepToRender);
    } catch (err) { alert(err.message); }
  }

  async function renderWizStep3(b) {
    b.innerHTML = `<div class="wiz-step-body active"><div style="padding:40px;text-align:center;color:var(--txt3)"><i class="ti ti-loader-2" style="animation:spin 1s linear infinite;font-size:28px"></i></div></div>`;
    try {
      const res = await API.workspaces.getOne(wizState.wsId);
      const ws = res?.data || res;
      const desks = ws.desks || [];
      const addedCategories = [...new Set(desks.map(d => d.type).filter(Boolean))];
      // Keep any currently selected categories in wizState, and append any loaded from API that aren't there yet
      addedCategories.forEach(c => { if (!wizState.categories.includes(c)) wizState.categories.push(c); });

      let catHtml = Object.keys(typeLabels).map(key => {
        const isSelected = wizState.categories.includes(key);
        return `
          <div class="wiz-cat-card ${isSelected ? 'selected' : ''}" onclick="App.wizToggleCategory('${key}')">
            <div class="wiz-cat-icon">${typeEmojis[key]}</div>
            <div class="wiz-cat-name">${typeLabels[key]}</div>
          </div>
        `;
      }).join('');

      let seatsHtml = '';
      if (wizState.categories.length === 0) {
        seatsHtml = `<div style="padding:24px;text-align:center;color:var(--txt3);font-size:12px;background:var(--bg3);border-radius:10px;border:1px dashed var(--border2)">Select categories above to configure seating and pricing.</div>`;
      } else {
        wizState.categories.forEach(cat => {
          const catDesks = desks.filter(d => d.type === cat);
          seatsHtml += `
            <div style="margin-bottom:20px;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:16px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                <span style="font-size:18px">${typeEmojis[cat]}</span>
                <div style="font-size:14px;font-weight:700;color:var(--txt)">${typeLabels[cat]}</div>
              </div>
              <div class="wiz-seat-list">
                ${catDesks.map(d => `
                  <div class="wiz-seat-row">
                    <div>
                      <div style="font-size:9px;font-weight:700;color:var(--txt3);text-transform:uppercase;margin-bottom:4px">Identifier</div>
                      <div style="font-size:12px;font-weight:700;color:var(--txt)">${d.deskNumber}</div>
                    </div>
                    <button onclick="App.wizDeleteDesk('${d.id}')" style="padding:6px 12px;background:rgba(244,63,94,0.1);color:#f43f5e;border:0.5px solid rgba(244,63,94,0.3);border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">Remove</button>
                  </div>
                `).join('')}
                <div class="wiz-seat-row" style="background:transparent;border-style:dashed;display:grid;grid-template-columns:1fr 1.5fr auto;gap:8px">
                  <div>
                    <div style="font-size:8px;font-weight:700;color:var(--txt3);margin-bottom:3px;text-transform:uppercase">Total Seats</div>
                    <input id="wiz-add-desk-count-${cat}" type="number" class="wiz-seat-input" value="1">
                  </div>
                  <div>
                    <div style="font-size:8px;font-weight:700;color:var(--txt3);margin-bottom:3px;text-transform:uppercase">Description (Optional)</div>
                    <input id="wiz-add-desk-desc-${cat}" type="text" class="wiz-seat-input" placeholder="e.g. Window view">
                  </div>
                  <div style="display:flex;align-items:end">
                    <button onclick="App.wizAddBulkDesk('${cat}')" style="padding:10px 16px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">+ Add Seats</button>
                  </div>
                </div>
              </div>
            </div>
          `;
        });
      }

      b.innerHTML = `
        <div class="wiz-step-body active">
          <div class="wiz-section">
            <div class="wiz-sec-lbl"><span>🪑</span> Select Categories</div>
            <div class="wiz-cat-grid">
              ${catHtml}
            </div>
          </div>
          <div class="wiz-section">
            <div class="wiz-sec-lbl"><span>🔢</span> Configure Seating</div>
            <div style="font-size:11px;color:var(--txt3);margin-bottom:16px">Add seats for each selected category.</div>
            ${seatsHtml}
          </div>
          <div class="wiz-nav">
            <button class="wiz-btn wiz-btn-back" onclick="App.renderWizStep(2)">← Back</button>
            <div>
              <button class="wiz-btn wiz-btn-skip" onclick="App.renderWizStep(4)">Skip for now</button>
              <button class="wiz-btn wiz-btn-next" onclick="App.renderWizStep(4)">Next Step →</button>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      b.innerHTML = `<div class="wiz-step-body active">${errCard(err.message)}</div>`;
    }
  }

  async function wizToggleCategory(cat) {
    if (wizState.categories.includes(cat)) {
      wizState.categories = wizState.categories.filter(c => c !== cat);
    } else {
      wizState.categories.push(cat);
    }
    renderWizStep(3);
  }

  async function wizAddDesk(cat) {
    const idInput = document.getElementById(`wiz-add-desk-id-${cat}`);
    const deskNumber = idInput.value.trim().toUpperCase();
    if (!deskNumber) { alert('Seat Identifier required.'); return; }

    try {
      await API.workspaces.addDesk(wizState.wsId, { deskNumber, type: cat, description: `${typeLabels[cat]} Seat` });
      toast('Seat added successfully! 🪑');
      renderWizStep(3);
    } catch (err) { alert(err.message); }
  }

  async function wizAddBulkDesk(cat) {
    const countInput = document.getElementById(`wiz-add-desk-count-${cat}`);
    const descInput = document.getElementById(`wiz-add-desk-desc-${cat}`);

    const count = parseInt(countInput.value || '1', 10);
    const description = descInput.value.trim() || undefined;
    
    // Auto-generate prefix (e.g. 'HD-' for 'hot_desk') and random start number
    const prefix = cat.split('_').map(w => w[0].toUpperCase()).join('') + '-';
    const startNumber = Math.floor(Math.random() * 900000) + 100000;

    if (isNaN(count) || count <= 0) {
      alert('Total seats count must be at least 1.');
      return;
    }

    try {
      const res = await API.workspaces.addBulkDesks(wizState.wsId, {
        prefix,
        startNumber,
        type: cat,
        count,
        description
      });
      toast(`Successfully added ${res.count || count} seats! 🪑`);
      renderWizStep(3);
    } catch (err) {
      alert(err.message);
    }
  }

  async function wizDeleteDesk(deskId) {
    if (!confirm('Remove this seat?')) return;
    try {
      await API.workspaces.deleteDesk(deskId);
      toast('Seat removed ✓');
      renderWizStep(3);
    } catch (err) { alert(err.message); }
  }

  async function renderWizStep4(b) {
    b.innerHTML = `<div class="wiz-step-body active"><div style="padding:40px;text-align:center;color:var(--txt3)"><i class="ti ti-loader-2" style="animation:spin 1s linear infinite;font-size:28px"></i></div></div>`;
    try {
      const res = await API.workspaces.getOne(wizState.wsId);
      const ws = res?.data || res;
      const images = ws.images || [];
      const categoryOrders = { hot_desk: -1, private_cabin: -2, meeting_room: -3, shared_space: -4, event_hall: -5, virtual_office: -6, podcast_studio: -7, training_room: -8 };
      
      let html = '';
      if (wizState.categories.length === 0) {
        html = `<div style="padding:24px;text-align:center;color:var(--txt3);font-size:12px;background:var(--bg3);border-radius:10px;border:1px dashed var(--border2)">No categories selected. Go back to Step 3 to add categories.</div>`;
      } else {
        let gridHtml = wizState.categories.map(cat => {
          const order = categoryOrders[cat] || -1;
          const matched = images.find(img => img.order === order);
          const slotHtml = matched ? `
            <div style="position:relative;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:var(--bg2)">
              <img src="${matched.url}" style="width:100%;height:100%;object-fit:cover">
              <button onclick="App.wizDeleteImage('${matched.id}', 4)" style="position:absolute;top:8px;right:8px;width:28px;height:28px;background:rgba(0,0,0,.65);color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center">✕</button>
            </div>` : `
            <label style="display:flex;flex-direction:column;align-items:center;justify-content:center;aspect-ratio:16/9;border:2px dashed var(--border2);border-radius:10px;cursor:pointer;background:var(--bg2);gap:8px;transition:border-color .2s" onmouseover="this.style.borderColor='var(--accent2)'" onmouseout="this.style.borderColor='var(--border2)'">
              <i class="ti ti-cloud-upload" style="font-size:24px;color:var(--txt3)"></i>
              <div style="font-size:11px;color:var(--txt3)">Upload photo</div>
              <input type="file" accept="image/*" onchange="App.wizUploadImage(${order}, this, 4)" style="display:none">
            </label>`;
          
          return `
            <div style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;padding:16px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                <span style="font-size:18px">${typeEmojis[cat]}</span>
                <div style="font-size:13px;font-weight:700;color:var(--txt)">${typeLabels[cat]}</div>
              </div>
              ${slotHtml}
            </div>
          `;
        }).join('');
        
        html = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">${gridHtml}</div>`;
      }

      b.innerHTML = `
        <div class="wiz-step-body active">
          <div class="wiz-section">
            <div class="wiz-sec-lbl"><span>🎨</span> Custom Category Images</div>
            <div style="font-size:11px;color:var(--txt3);margin-bottom:16px">Optionally upload custom photos for each seating type. If skipped, default images will be used.</div>
            ${html}
          </div>
          <div class="wiz-nav">
            <button class="wiz-btn wiz-btn-back" onclick="App.renderWizStep(3)">← Back</button>
            <button class="wiz-btn wiz-btn-next" onclick="App.wizFinish()">Finish & View Workspace ✓</button>
          </div>
        </div>
      `;
    } catch (err) {
      b.innerHTML = `<div class="wiz-step-body active">${errCard(err.message)}</div>`;
    }
  }

  async function wizFinish() {
    try {
      const res = await API.workspaces.getOne(wizState.wsId);
      const ws = res?.data || res;
      const images = ws.images || [];
      const hasCustomCatImages = images.some(img => img.order < 0);
      
      await API.workspaces.update(wizState.wsId, { useDefaultImages: !hasCustomCatImages });
      
      toast('Workspace fully configured! 🎉');
      if (currentMod === 'workspace') openMod('workspace');
    } catch (err) {
      alert(err.message);
    }
  }


  function toggleWsSeating(el) {
    const isOn = el.getAttribute('data-on') === 'true';
    const nextOn = !isOn;
    el.setAttribute('data-on', String(nextOn));
    el.style.background = nextOn ? '#4f46e5' : 'var(--border2)';
    const thumb = el.querySelector('div');
    if (thumb) thumb.style.left = nextOn ? '19px' : '3px';

    const seatingSec = document.getElementById('edit-ws-seating-section');
    if (seatingSec) {
      if (nextOn) seatingSec.classList.remove('hidden');
      else seatingSec.classList.add('hidden');
    }
  }

  function toggleWsCategoryImages(el) {
    const isOn = el.getAttribute('data-on') === 'true';
    const nextOn = !isOn;
    el.setAttribute('data-on', String(nextOn));
    el.style.background = nextOn ? '#4f46e5' : 'var(--border2)';
    const thumb = el.querySelector('div');
    if (thumb) thumb.style.left = nextOn ? '19px' : '3px';

    const catImgSec = document.getElementById('edit-ws-category-images-section');
    if (catImgSec) {
      if (nextOn) { catImgSec.classList.remove('hidden'); catImgSec.style.padding = '16px'; }
      else { catImgSec.classList.add('hidden'); catImgSec.style.padding = '0'; }
    }
    // Sync label text
    const label = el.previousElementSibling;
    if (label && label.classList && !label.classList.contains('thumb')) label.textContent = nextOn ? 'ON' : 'OFF';
    // Sync accordion header border-radius
    const header = document.getElementById('edit-ws-cat-header');
    if (header) header.style.borderRadius = nextOn ? '10px 10px 0 0' : '10px';
  }

  async function openManageWorkspacePage(wsId) {
    const c = document.getElementById('content');
    c.innerHTML = `
      <div class="wiz-page">
        <div class="wiz-head" style="padding-bottom:0; border-bottom:none">
          <div class="back" onclick="App.openMod('workspace')" style="margin-bottom:16px; display:inline-flex; cursor:pointer; color:var(--txt2); font-size:13px; font-weight:600; align-items:center; gap:6px"><i class="ti ti-arrow-left"></i> Back to Workspaces</div>
        </div>
        <div class="wiz-body" style="padding:0 32px 32px 32px; max-width: 900px; margin: 0 auto; width: 100%">
          <div id="edit-ws-container">
            <div style="padding:40px;text-align:center;color:var(--txt3)"><i class="ti ti-loader-2" style="animation:spin 1s linear infinite;font-size:28px"></i></div>
          </div>
        </div>
      </div>
    `;
    await renderEditWorkspaceModalContent(wsId);
  }

  async function renderEditWorkspaceModalContent(wsId) {
    const container = document.getElementById('edit-ws-container');
    if (!container) return;

    // 1. Read current unsaved values from DOM if they exist to prevent resets during sub-renders
    const hasExistingForm = document.getElementById('edit-ws-name') !== null;
    const currentForm = {};
    if (hasExistingForm) {
      currentForm.name = document.getElementById('edit-ws-name')?.value || '';
      currentForm.description = document.getElementById('edit-ws-desc')?.value || '';
      currentForm.address = document.getElementById('edit-ws-addr')?.value || '';
      currentForm.city = document.getElementById('edit-ws-city')?.value || '';
      currentForm.state = document.getElementById('edit-ws-state')?.value || '';
      currentForm.pincode = document.getElementById('edit-ws-pin')?.value || '';
      currentForm.type = document.getElementById('edit-ws-type')?.value || '';
      currentForm.amenities = document.getElementById('edit-ws-amenities')?.value || '';
      currentForm.categoryImagesCustom = document.getElementById('edit-ws-toggle-category-images')?.getAttribute('data-on');
      currentForm.nVal = document.getElementById('edit-ws-n-val')?.value;
    }

    try {
      const res = await API.workspaces.getOne(wsId);
      const ws = res?.data || res;
      
      const desks = ws.desks || [];
      const uniqueCategories = [...new Set(desks.map(d => d.type).filter(Boolean))];

      const typeLabels = {
        'hot_desk': 'Hot Desk',
        'private_cabin': 'Private Cabin',
        'meeting_room': 'Meeting Room',
        'shared_space': 'Shared Space',
        'event_hall': 'Event Hall',
        'virtual_office': 'Virtual Office',
        'podcast_studio': 'Podcast Studio',
        'training_room': 'Training Room'
      };

      // N = 1 (default) + 1 per unique seating category added. Gallery limit = N * 2.
      const galleryImages = (ws.images || []).filter(img => img.order > 0);
      const N = 1 + uniqueCategories.length;
      const galleryLimit = N * 2;

      // Determine category images custom toggle status
      let showCategoryImages = !ws.useDefaultImages;
      if (hasExistingForm && currentForm.categoryImagesCustom !== undefined && currentForm.categoryImagesCustom !== null) {
        showCategoryImages = currentForm.categoryImagesCustom === 'true';
      }

      const nameVal = hasExistingForm ? currentForm.name : (ws.name || '');
      const descVal = hasExistingForm ? currentForm.description : (ws.description || '');
      const addrVal = hasExistingForm ? currentForm.address : (ws.address || '');
      const cityVal = hasExistingForm ? currentForm.city : (ws.city || '');
      const stateVal = hasExistingForm ? currentForm.state : (ws.state || '');
      const pinVal = hasExistingForm ? currentForm.pincode : (ws.pincode || '');
      const typeVal = ws.type || 'hot_desk'; // kept for internal reference only (not shown in UI)
      const amenitiesStr = hasExistingForm ? currentForm.amenities : (ws.amenities || []).join(', ');

      const typeEmojis = { hot_desk:'💼', private_cabin:'🚪', meeting_room:'📋', shared_space:'👥', event_hall:'🎪', virtual_office:'🌐', podcast_studio:'🎙️', training_room:'📚' };
      const statusColor = ws.status === 'ACTIVE' ? '#34d399' : '#f87171';
      const statusBg = ws.status === 'ACTIVE' ? 'rgba(52,211,153,.12)' : 'rgba(248,113,113,.12)';

      container.innerHTML = `
        <!-- ── Header ── -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:18px;border-bottom:0.5px solid var(--border)">
          <div>
            <div style="font-size:18px;font-weight:800;color:var(--txt);letter-spacing:-0.4px">Manage Workspace</div>
            <div style="font-size:10px;color:var(--txt3);margin-top:3px;font-family:monospace">${ws.id.substring(0,16)}…</div>
          </div>
          <span style="font-size:9px;font-weight:700;background:${statusBg};color:${statusColor};padding:5px 12px;border-radius:100px;border:0.5px solid ${statusColor}40">${ws.status || 'ACTIVE'}</span>
        </div>

        <!-- ── Basic Details ── -->
        <div style="margin-bottom:22px">
          <div style="font-size:9px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;display:flex;align-items:center;gap:6px">
            <span style="width:22px;height:22px;background:rgba(99,102,241,.14);border-radius:6px;display:inline-flex;align-items:center;justify-content:center">🏢</span>
            Basic Details
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px">
            <div style="grid-column:1/-1">
              <div style="font-size:9px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Workspace Name</div>
              <input id="edit-ws-name" type="text" value="${nameVal}" style="width:100%;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:13px;color:var(--txt);outline:none;font-family:inherit;box-sizing:border-box">
            </div>
            <div style="grid-column:1/-1">
              <div style="font-size:9px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Description</div>
              <textarea id="edit-ws-desc" style="width:100%;height:64px;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--txt);outline:none;font-family:inherit;resize:none;box-sizing:border-box">${descVal}</textarea>
            </div>
            <div style="grid-column:1/-1;display:grid;grid-template-columns:2fr 1fr;gap:10px">
              <div>
                <div style="font-size:9px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Address</div>
                <input id="edit-ws-addr" type="text" value="${addrVal}" style="width:100%;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--txt);outline:none;font-family:inherit;box-sizing:border-box">
              </div>
              <div>
                <div style="font-size:9px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">City</div>
                <input id="edit-ws-city" type="text" value="${cityVal}" style="width:100%;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--txt);outline:none;font-family:inherit;box-sizing:border-box">
              </div>
            </div>
            <div>
              <div style="font-size:9px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">State</div>
              <input id="edit-ws-state" type="text" value="${stateVal}" style="width:100%;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--txt);outline:none;font-family:inherit;box-sizing:border-box">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1.3fr;gap:10px">
              <div>
                <div style="font-size:9px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Pincode</div>
                <input id="edit-ws-pin" type="text" value="${pinVal}" style="width:100%;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--txt);outline:none;font-family:inherit;box-sizing:border-box">
              </div>
            </div>
                          <div style="grid-column:1/-1">
                <div style="font-size:9px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Amenities <span style="font-weight:400;text-transform:none;letter-spacing:0">(comma-separated)</span></div>
                </div>
            </div>
          </div>

        <div style="height:0.5px;background:var(--border);margin-bottom:22px"></div>

        <!-- ── Images ── -->
        <div style="margin-bottom:22px">
          <div style="font-size:9px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;display:flex;align-items:center;gap:6px">
            <span style="width:22px;height:22px;background:rgba(99,102,241,.14);border-radius:6px;display:inline-flex;align-items:center;justify-content:center">🖼️</span>
            Images
          </div>

          <div style="display:grid;grid-template-columns:200px 1fr;gap:14px;align-items:start">
            <!-- Cover -->
            <div>
              <div style="font-size:9px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px">Main Cover <span style="color:#f87171">*</span></div>
              ${renderCoverImageSlot(ws)}
            </div>

            <!-- Gallery -->
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
                <div style="font-size:9px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px">Gallery Slides <span style="color:#f87171">*</span></div>
                <span style="font-size:9px;color:var(--txt3);background:var(--bg3);padding:2px 8px;border-radius:100px;border:0.5px solid var(--border2)">${galleryImages.length} / ${galleryLimit} slides</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px">
                ${renderGallerySlotsGrid(ws, galleryLimit)}
              </div>
            </div>
          </div>
        </div>

        <div style="height:0.5px;background:var(--border);margin-bottom:22px"></div>

        <!-- ── Seating / Desk Categories ── -->
        <div style="margin-bottom:22px">
          <div style="font-size:9px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;display:flex;align-items:center;gap:6px">
            <span style="width:22px;height:22px;background:rgba(99,102,241,.14);border-radius:6px;display:inline-flex;align-items:center;justify-content:center">🪑</span>
            Seating / Desk Categories
            <span style="font-size:9px;font-weight:700;background:rgba(99,102,241,.12);color:#818cf8;padding:2px 8px;border-radius:100px">${desks.length} added</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:12px" id="edit-ws-desks-list">
            ${desks.length ? desks.map(d => `
              <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:11px">
                <div style="width:36px;height:36px;border-radius:9px;background:rgba(99,102,241,.12);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${typeEmojis[d.type]||'🪑'}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:700;color:var(--txt)">${d.deskNumber}</div>
                  <div style="font-size:10px;color:var(--txt3);margin-top:1px">${typeLabels[d.type]||d.type}</div>
                </div>
                <button onclick="App.deleteWorkspaceDesk('${ws.id}', '${d.id}', this)" style="padding:5px 12px;background:rgba(244,63,94,0.08);color:#f43f5e;border:0.5px solid rgba(244,63,94,0.25);border-radius:7px;font-size:10px;font-weight:700;cursor:pointer;flex-shrink:0">Delete</button>
              </div>`).join('') : `
            <div style="padding:22px;text-align:center;color:var(--txt3);background:var(--bg3);border:0.5px dashed var(--border2);border-radius:11px">
              <div style="font-size:20px;margin-bottom:6px">🪑</div>
              <div style="font-size:12px;font-weight:600">No seating categories yet</div>
              <div style="font-size:10px;margin-top:2px">Add your first category below</div>
            </div>`}
          </div>

          <div style="padding:16px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:11px">
            <div style="font-size:9px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Bulk Add Seats</div>
            <div style="display:grid;grid-template-columns:1fr 0.8fr 1.5fr;gap:8px;align-items:end">
              <div>
                <div style="font-size:8px;font-weight:700;color:var(--txt3);margin-bottom:3px">CATEGORY TYPE</div>
                <select id="add-desk-type" style="width:100%;padding:8px 10px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:8px;font-size:11px;color:var(--txt);outline:none;font-family:inherit;box-sizing:border-box">
                  ${Object.entries(typeLabels).map(([k,v]) => `<option value="${k}">${typeEmojis[k]||''} ${v}</option>`).join('')}
                </select>
              </div>
              <div>
                <div style="font-size:8px;font-weight:700;color:var(--txt3);margin-bottom:3px">TOTAL SEATS</div>
                <input id="add-desk-count" type="number" value="1" style="width:100%;padding:8px 10px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:8px;font-size:11px;color:var(--txt);outline:none;font-family:inherit;box-sizing:border-box">
              </div>
              <div>
                <div style="font-size:8px;font-weight:700;color:var(--txt3);margin-bottom:3px">DESCRIPTION</div>
                <input id="add-desk-desc" type="text" placeholder="e.g. Window view" style="width:100%;padding:8px 10px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:8px;font-size:11px;color:var(--txt);outline:none;font-family:inherit;box-sizing:border-box">
              </div>
            </div>
            <div style="margin-top:12px;text-align:right">
              <button onclick="App.addBulkWorkspaceDesks('${ws.id}', this)" style="padding:8px 14px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">+ Add Seats</button>
            </div>
          </div>
        </div>

        <div style="height:0.5px;background:var(--border);margin-bottom:22px"></div>

        <!-- ── Pricing Plans ── -->
        <div style="margin-bottom:22px">
          <div style="font-size:9px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;display:flex;align-items:center;gap:6px">
            <span style="width:22px;height:22px;background:rgba(99,102,241,.14);border-radius:6px;display:inline-flex;align-items:center;justify-content:center">💰</span>
            Pricing Plans
          </div>
          <div style="display:flex;flex-direction:column;gap:7px">
            ${ws.pricingPlans && ws.pricingPlans.length ? ws.pricingPlans.map(p => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:11px">
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:700;color:var(--txt);text-transform:capitalize">${p.type.toLowerCase()} Plan</div>
                </div>
                <div style="display:flex;align-items:center;gap:16px">
                  <div style="display:flex;flex-direction:column;align-items:flex-end">
                    <span style="font-size:9px;font-weight:700;color:var(--txt3);margin-bottom:4px">Hourly Rate (₹)</span>
                    <input type="number" value="${p.basePrice}" onchange="App.updatePricingPlanPrice('${ws.id}', '${p.id}', this.value)" style="width:70px;padding:4px 8px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:6px;font-size:12px;color:var(--txt);text-align:right">
                  </div>
                  <div style="display:flex;align-items:center;gap:9px">
                    <span style="font-size:9px;font-weight:700;color:var(--txt3)">${p.isActive?'ON':'OFF'}</span>
                    <div onclick="App.togglePricingPlan('${ws.id}', '${p.id}', ${!p.isActive}, ${p.basePrice})" style="width:36px;height:20px;border-radius:100px;background:${p.isActive?'#10b981':'var(--border2)'};position:relative;cursor:pointer;transition:background .2s;flex-shrink:0">
                      <div style="width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;top:3px;left:${p.isActive?'19':'3'}px;transition:left .18s"></div>
                    </div>
                  </div>
                </div>
              </div>`).join('') : `
              <div style="padding:16px;text-align:center;color:var(--txt3);font-size:11px">No pricing plans found.</div>
            `}
          </div>
        </div>

        <div style="height:0.5px;background:var(--border);margin-bottom:22px"></div>

        <!-- ── Custom Category Images (optional accordion) ── -->
        <div style="margin-bottom:26px">
          <div id="edit-ws-cat-header" onclick="App.toggleWsCategoryImages(document.getElementById('edit-ws-toggle-category-images'))" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:${showCategoryImages?'11px 11px 0 0':'11px'};transition:border-radius .2s">
            <div style="display:flex;align-items:center;gap:12px">
              <span style="width:36px;height:36px;background:rgba(99,102,241,.12);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px">📷</span>
              <div>
                <div style="font-size:13px;font-weight:700;color:var(--txt)">Custom Category Images</div>
                <div style="font-size:10px;color:var(--txt3);margin-top:2px">Optional — upload custom photos for each seating type</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:9px">
              <span style="font-size:9px;font-weight:700;color:var(--txt3)">${showCategoryImages?'ON':'OFF'}</span>
              <div id="edit-ws-toggle-category-images" data-on="${showCategoryImages}" onclick="event.stopPropagation();App.toggleWsCategoryImages(this)" style="width:36px;height:20px;border-radius:100px;background:${showCategoryImages?'#4f46e5':'var(--border2)'};position:relative;cursor:pointer;transition:background .2s;flex-shrink:0">
                <div style="width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;top:3px;left:${showCategoryImages?'19':'3'}px;transition:left .18s"></div>
              </div>
            </div>
          </div>
          <div id="edit-ws-category-images-section" class="toggle-section ${showCategoryImages?'':'hidden'}" style="background:var(--bg3);border:0.5px solid var(--border2);border-top:none;border-radius:0 0 11px 11px;padding:${showCategoryImages?'16px':'0'};max-height:800px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              ${renderCategorySlotsGrid(ws, uniqueCategories, typeLabels)}
            </div>
            ${!uniqueCategories.length ? `<div style="padding:20px 0;text-align:center;color:var(--txt3);font-size:11px">Add seating categories above to configure custom images.</div>` : ''}
          </div>
        </div>

        <div id="edit-ws-err" style="font-size:11px;color:#f87171;margin-bottom:10px;min-height:14px"></div>
        <div style="display:flex;gap:10px">
          <button onclick="App.submitEditWorkspace('${ws.id}', this)" style="flex:1;padding:12px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:0.2px">Save Changes</button>
          <button onclick="App.openMod('workspace')" style="padding:12px 20px;background:var(--bg3);color:var(--txt2);border:0.5px solid var(--border2);border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Cancel</button>
          <button onclick="App.deleteWorkspacePrompt('${ws.id}', '${ws.name.replace(/'/g, "\\'")}')" style="padding:12px 20px;background:rgba(244,63,94,0.1);color:#f43f5e;border:0.5px solid rgba(244,63,94,0.3);border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Delete Workspace</button>
        </div>
      `;
    } catch (err) {
      container.innerHTML = errCard(err.message);
    }
  }

  function renderCoverImageSlot(ws) {
    const images = ws.images || [];
    const matched = images.find(img => img.order === 0);
    if (matched) {
      return `
        <div style="position:relative;height:180px;border-radius:11px;overflow:hidden;background:var(--bg3)">
          <img src="${matched.url}" style="width:100%;height:100%;object-fit:cover">
          <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.5),transparent)"></div>
          <button onclick="App.deleteWorkspaceImage('${ws.id}', '${matched.id}', this)" style="position:absolute;top:8px;right:8px;width:26px;height:26px;background:rgba(0,0,0,.65);color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;line-height:1">✕</button>
          <div style="position:absolute;bottom:10px;left:12px;font-size:9px;font-weight:700;color:rgba(255,255,255,.8);background:rgba(0,0,0,.4);padding:2px 7px;border-radius:100px">COVER</div>
        </div>`;
    } else {
      return `
        <label style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;height:180px;border-radius:11px;cursor:pointer;overflow:hidden;border:1.5px dashed var(--border2);transition:border-color .2s" onmouseover="this.style.borderColor='var(--accent2)'" onmouseout="this.style.borderColor='var(--border2)'">
          <!-- Default Image Background Preview -->
          <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.3;filter:grayscale(50%)">
          <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:8px">
            <i class="ti ti-camera-plus" style="font-size:30px;color:var(--txt)"></i>
            <div style="font-size:12px;font-weight:700;color:var(--txt)">Upload Cover</div>
            <div style="font-size:9px;color:var(--txt);background:rgba(0,0,0,0.5);padding:2px 6px;border-radius:4px">Mobile App Default Previewing</div>
          </div>
          <input type="file" accept="image/*" onchange="App.uploadWorkspaceImage('${ws.id}', 0, this)" style="display:none">
        </label>`;
    }
  }

  function renderGallerySlotsGrid(ws, galleryLimit) {
    const images = ws.images || [];
    const galleryImages = images.filter(img => img.order > 0).sort((a,b) => a.order - b.order);
    let html = '';

    galleryImages.forEach(img => {
      html += `
        <div style="position:relative;aspect-ratio:4/3;border-radius:9px;overflow:hidden;background:var(--bg2)">
          <img src="${img.url}" style="width:100%;height:100%;object-fit:cover">
          <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.45),transparent)"></div>
          <button onclick="App.deleteWorkspaceImage('${ws.id}', '${img.id}', this)" style="position:absolute;top:5px;right:5px;width:22px;height:22px;background:rgba(0,0,0,.65);color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;line-height:1">✕</button>
          <div style="position:absolute;bottom:6px;left:8px;font-size:8px;font-weight:700;color:rgba(255,255,255,.75);background:rgba(0,0,0,.35);padding:1px 6px;border-radius:100px">SLIDE ${img.order}</div>
        </div>`;
    });

    if (galleryImages.length < galleryLimit) {
      const occupiedOrders = galleryImages.map(img => img.order);
      let nextFreeOrder = 1;
      while (occupiedOrders.includes(nextFreeOrder)) nextFreeOrder++;
      html += `
        <label style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;aspect-ratio:4/3;border:1.5px dashed var(--border2);border-radius:9px;cursor:pointer;overflow:hidden;transition:border-color .2s" onmouseover="this.style.borderColor='var(--accent2)'" onmouseout="this.style.borderColor='var(--border2)'">
          <img src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.3;filter:grayscale(50%)">
          <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <i class="ti ti-plus" style="font-size:20px;color:var(--txt)"></i>
            <div style="font-size:9px;font-weight:600;color:var(--txt)">Add Slide</div>
          </div>
          <input type="file" accept="image/*" onchange="App.uploadWorkspaceImage('${ws.id}', ${nextFreeOrder}, this)" style="display:none">
        </label>`;
    } else {
      html += `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;aspect-ratio:4/3;border:0.5px solid var(--border);border-radius:9px;background:var(--bg3);gap:4px">
          <i class="ti ti-lock" style="font-size:18px;color:var(--txt3)"></i>
          <div style="font-size:8px;color:var(--txt3);text-align:center">Slots full</div>
        </div>`;
    }
    return html;
  }

  function renderCategorySlotsGrid(ws, uniqueCategories, typeLabels) {
    const categoryOrders = { hot_desk:-1, private_cabin:-2, meeting_room:-3, shared_space:-4, event_hall:-5, virtual_office:-6, podcast_studio:-7, training_room:-8 };
    const typeEmojis = { hot_desk:'💼', private_cabin:'🚪', meeting_room:'📋', shared_space:'👥', event_hall:'🎪', virtual_office:'🌐', podcast_studio:'🎙️', training_room:'📚' };
    if (!uniqueCategories.length) return '';

    return uniqueCategories.map(cat => {
      const order = categoryOrders[cat] || -1;
      const label = typeLabels[cat] || cat;
      const images = ws.images || [];
      const matched = images.find(img => img.order === order);

      const slotHtml = matched ? `
        <div style="position:relative;aspect-ratio:16/9;border-radius:9px;overflow:hidden;background:var(--bg2)">
          <img src="${matched.url}" style="width:100%;height:100%;object-fit:cover">
          <button onclick="App.deleteWorkspaceImage('${ws.id}', '${matched.id}', this)" style="position:absolute;top:6px;right:6px;width:22px;height:22px;background:rgba(0,0,0,.65);color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center">✕</button>
        </div>` : `
        <label style="display:flex;flex-direction:column;align-items:center;justify-content:center;aspect-ratio:16/9;border:1.5px dashed var(--border2);border-radius:9px;cursor:pointer;background:var(--bg2);gap:5px;transition:border-color .2s" onmouseover="this.style.borderColor='var(--accent2)'" onmouseout="this.style.borderColor='var(--border2)'">
          <i class="ti ti-cloud-upload" style="font-size:18px;color:var(--txt3)"></i>
          <div style="font-size:9px;color:var(--txt3)">Upload photo</div>
          <input type="file" accept="image/*" onchange="App.uploadWorkspaceImage('${ws.id}', ${order}, this)" style="display:none">
        </label>`;

      return `
        <div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="font-size:13px">${typeEmojis[cat]||'📷'}</span>
            <div style="font-size:10px;font-weight:700;color:var(--txt)">${label}</div>
          </div>
          ${slotHtml}
        </div>`;
    }).join('');
  }

  async function submitEditWorkspace(wsId, btn) {
    const name = document.getElementById('edit-ws-name').value.trim();
    const desc = document.getElementById('edit-ws-desc').value.trim();
    const addr = document.getElementById('edit-ws-addr').value.trim();
    const city = document.getElementById('edit-ws-city').value.trim();
    const state = document.getElementById('edit-ws-state').value.trim();
    const pin = document.getElementById('edit-ws-pin').value.trim();
      const lat = parseFloat(document.getElementById('ws-lat').value);
      const lng = parseFloat(document.getElementById('ws-lng').value);
    const amenities = document.getElementById('edit-ws-amenities').value.split(',').map(a => a.trim()).filter(Boolean);
    
    const useCustomEl = document.getElementById('edit-ws-toggle-category-images');
    const useDefaultImages = useCustomEl ? (useCustomEl.getAttribute('data-on') !== 'true') : true;

    const errEl = document.getElementById('edit-ws-err');
    if (!name || !addr || !city || !state || !pin) {
      errEl.textContent = 'Please fill all required fields.';
      return;
    }

    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await API.workspaces.update(wsId, {
        name,
        description: desc || undefined,
        address: addr,
        city,
        state,
        pincode: pin,
          latitude: lat,
          longitude: lng,
          amenities,
          useDefaultImages
      });
      toast('Workspace details saved successfully! ✓');
      if (currentMod === 'workspace') openMod('workspace');
      document.getElementById('edit-ws-modal-overlay')?.remove();
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Save Workspace Details';
    }
  }

  async function addWorkspaceDesk(wsId, btn) {
    const numberInput = document.getElementById('add-desk-num');
    const typeSelect = document.getElementById('add-desk-type');
    
    const deskNumber = numberInput.value.trim().toUpperCase();
    const type = typeSelect.value;

    if (!deskNumber) {
      alert('Desk Identifier required.');
      return;
    }

    btn.disabled = true;
    try {
      await API.workspaces.addDesk(wsId, {
        deskNumber,
        type,
        description: `${typeLabelsMock(type)} Seat`
      });
      toast('Seating category added successfully! 🪑');
      numberInput.value = '';
      await renderEditWorkspaceModalContent(wsId);
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
    }
  }

  async function addBulkWorkspaceDesks(wsId, btn) {
    const typeSelect = document.getElementById('add-desk-type');
    const countInput = document.getElementById('add-desk-count');
    const descInput = document.getElementById('add-desk-desc');

    const type = typeSelect.value;
    const count = parseInt(countInput.value || '1', 10);
    const description = descInput.value.trim() || undefined;
    
    // Auto-generate prefix and random start number
    const prefix = type.split('_').map(w => w[0].toUpperCase()).join('') + '-';
    const startNumber = Math.floor(Math.random() * 900000) + 100000;

    if (isNaN(startNumber) || startNumber < 0) {
      alert('Start number must be a non-negative number.');
      return;
    }
    if (isNaN(count) || count <= 0) {
      alert('Total seats count must be at least 1.');
      return;
    }

    btn.disabled = true; btn.textContent = 'Adding…';
    try {
      const res = await API.workspaces.addBulkDesks(wsId, {
        prefix,
        startNumber,
        type,
        count,
        premiumExtra,
        description
      });
      toast(`Successfully added ${res.count || count} seats! 🪑`);
      countInput.value = '1';
      countInput.value = '1';
      premiumInput.value = '0';
      await renderEditWorkspaceModalContent(wsId);
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false; btn.textContent = '+ Add Seats';
    }
  }

  async function togglePricingPlan(wsId, planId, makeActive) {
    try {
      await API.workspaces.updatePlan(planId, { isActive: makeActive });
      toast(`Pricing plan ${makeActive ? 'enabled' : 'disabled'} ✓`);
      await renderEditWorkspaceModalContent(wsId);
    } catch (err) {
      alert(err.message);
    }
  }

  async function updatePricingPlanPrice(wsId, planId, newPrice) {
    try {
      await API.workspaces.updatePlan(planId, { basePrice: parseFloat(newPrice) });
      toast('Hourly rate updated ✓');
      // We don't re-render immediately to avoid losing focus, it will stay updated
    } catch (err) {
      alert(err.message);
    }
  }

  function typeLabelsMock(type) {
    const typeLabels = {
      'hot_desk': 'Hot Desk',
      'private_cabin': 'Private Cabin',
      'meeting_room': 'Meeting Room',
      'shared_space': 'Shared Space',
      'event_hall': 'Event Hall',
      'virtual_office': 'Virtual Office',
      'podcast_studio': 'Podcast Studio',
      'training_room': 'Training Room'
    };
    return typeLabels[type] || type;
  }

  async function deleteWorkspaceDesk(wsId, deskId, btn) {
    if (!confirm('Are you sure you want to delete this seating option? Associated bookings and QR codes will be deleted.')) return;
    btn.disabled = true; btn.textContent = '…';
    try {
      await API.workspaces.deleteDesk(deskId);
      toast('Seating option removed ✓');
      await renderEditWorkspaceModalContent(wsId);
    } catch (err) {
      alert(err.message);
      btn.disabled = false; btn.textContent = 'Delete';
    }
  }

  async function uploadWorkspaceImage(wsId, order, input) {
    const file = input.files[0];
    if (!file) return;

    const overlay = document.getElementById('edit-ws-container');
    const loader = document.createElement('div');
    loader.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;border-radius:16px';
    loader.innerHTML = `<i class="ti ti-loader-2" style="animation:spin 1s linear infinite;font-size:24px;color:#fff"></i>`;
    overlay.style.position = 'relative';
    overlay.appendChild(loader);

    try {
      await API.workspaces.uploadImage(wsId, file, order);
      toast('Image uploaded successfully! 🖼️');
      await renderEditWorkspaceModalContent(wsId);
    } catch (err) {
      alert(err.message);
      loader.remove();
    }
  }

  async function deleteWorkspaceImage(wsId, imageId, btn) {
    if (!confirm('Are you sure you want to delete this image?')) return;
    btn.disabled = true; btn.textContent = '…';
    try {
      await API.workspaces.removeImage(imageId);
      toast('Image deleted ✓');
      await renderEditWorkspaceModalContent(wsId);
    } catch (err) {
      alert(err.message);
      btn.disabled = false; btn.textContent = 'Delete';
    }
  }

  async function deleteWorkspacePrompt(wsId, wsName) {
    const input = prompt(`Type "${wsName}" to confirm deletion of this workspace:`);
    if (input !== wsName) {
      if (input !== null) alert('Workspace name did not match. Deletion cancelled.');
      return;
    }
    
    try {
      await API.workspaces.deactivate(wsId);
      toast('Workspace deleted successfully 🗑️');
      document.getElementById('edit-ws-modal-overlay')?.remove();
      if (currentMod === 'workspace') openMod('workspace');
    } catch (err) {
      alert(err.message);
    }
  }

  function toggleAllWs(master) {
    document.querySelectorAll('.bulk-ws-cb').forEach(cb => cb.checked = master.checked);
  }

  async function bulkDeactivateWs() {
    const cbs = Array.from(document.querySelectorAll('.bulk-ws-cb:checked'));
    if (!cbs.length) {
      alert('Select workspaces to deactivate.');
      return;
    }
    if (!confirm(`Are you sure you want to deactivate ${cbs.length} workspace(s)?`)) return;
    
    const btn = document.getElementById('btn-bulk-deactivate');
    if (btn) { btn.disabled = true; btn.textContent = 'Deactivating…'; }
    
    try {
      for (const cb of cbs) {
        await API.workspaces.deactivate(cb.value);
      }
      toast(`${cbs.length} workspace(s) deactivated 🗑️`);
      if (currentMod === 'workspace') openMod('workspace');
    } catch (err) {
      alert(err.message);
      if (btn) { btn.disabled = false; btn.textContent = '🗑 Bulk Deactivate'; }
    }
  }

  async function showGenQrModal() {
    const wsRes = await API.workspaces.getMy().catch(() => ({ data: [] }));
    const wsList = wsRes?.data || wsRes || [];
    if (!wsList.length) {
      toastErr('Create a workspace first.');
      return;
    }
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;display:flex;align-items:center;justify-content:center';
    ov.innerHTML = `
    <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:28px 32px;width:340px">
      <div style="font-size:14px;font-weight:800;color:var(--txt);margin-bottom:18px">Generate Desk QR Code</div>
      <div class="auth-field"><label>Select Workspace</label>
        <select id="qr-ws-id" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit">
          ${wsList.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
        </select>
      </div>
      <div class="auth-field"><label>Desk ID / Desk Number (Optional)</label><input id="qr-desk-id" type="text" placeholder="e.g. A1, B3" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
      <div id="qr-err" style="font-size:11px;color:#f87171;margin-bottom:8px;min-height:14px"></div>
      <div style="display:flex;gap:8px">
        <button id="qr-gen-btn" onclick="App.submitGenQr(this)" style="flex:1;padding:9px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Generate QR</button>
        <button onclick="this.closest('div[style]').remove()" style="padding:9px 14px;background:var(--bg3);color:var(--txt2);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Cancel</button>
      </div>
      <div id="qr-result-container" style="display:none;margin-top:20px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:var(--txt3);text-transform:uppercase;margin-bottom:10px">Generated Code</div>
        <img id="qr-img-el" style="background:#fff;padding:8px;border-radius:10px;margin-bottom:10px" />
        <div id="qr-code-val" style="font-size:13px;font-weight:800;font-family:monospace;color:var(--accent2);margin-bottom:12px"></div>
        <button onclick="App.printQr()" style="width:100%;padding:7px;background:var(--bg3);color:var(--txt2);border:0.5px solid var(--border2);border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">Print QR Code</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  }

  async function submitGenQr(btn) {
    const wsId = document.getElementById('qr-ws-id').value;
    const deskIdInput = document.getElementById('qr-desk-id').value.trim();
    const errEl = document.getElementById('qr-err');
    btn.disabled = true;
    btn.textContent = 'Generating…';

    try {
      let finalDeskId = undefined;
      if (deskIdInput) {
        const ws = await API.workspaces.getOne(wsId);
        const matchedDesk = (ws.desks || []).find(d => d.deskNumber.toUpperCase() === deskIdInput.toUpperCase());
        if (matchedDesk) {
          finalDeskId = matchedDesk.id;
        } else {
          const newDesk = await API.workspaces.addDesk(wsId, { deskNumber: deskIdInput.toUpperCase(), type: 'standard' });
          finalDeskId = newDesk.id;
        }
      }

      const res = await API.workspaces.generateQr(wsId, finalDeskId);
      const d = res?.data || res;
      const code = d?.code;
      if (!code) throw new Error('No QR code returned from server');

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${code}`;
      document.getElementById('qr-img-el').src = qrUrl;
      document.getElementById('qr-code-val').textContent = code;
      document.getElementById('qr-result-container').style.display = 'block';

      errEl.textContent = '';
      btn.style.display = 'none';
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate QR';
    }
  }

  function printQr() {
    const imgUrl = document.getElementById('qr-img-el').src;
    const codeVal = document.getElementById('qr-code-val').textContent;
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${codeVal}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
            img { width: 300px; height: 300px; padding: 10px; border: 1px solid #ccc; border-radius: 10px; }
            h1 { font-family: monospace; letter-spacing: 2px; margin-top: 20px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <img src="\${imgUrl}" />
          <h1>\${codeVal}</h1>
        </body>
      </html>
    `);
    win.document.close();
  }

  function toggleSw(el) {
    const isOn = el.getAttribute('data-on') === 'true';
    el.setAttribute('data-on', String(!isOn));
    el.style.background = !isOn ? '#4f46e5' : 'var(--border2)';
    const thumb = el.querySelector('div'); if (thumb) thumb.style.left = !isOn ? '19px' : '3px';
    toast('Setting updated!');
  }

  /* ─────────── UI HELPERS ─────────── */
  function loadingCard() {
    return `<div style="padding:40px;text-align:center;color:var(--txt3)"><div style="font-size:22px;animation:spin 1s linear infinite;display:inline-block">⟳</div><div style="font-size:11px;margin-top:8px">Loading live data…</div></div>`;
  }

  function emptyCard(msg) {
    return `<div style="padding:40px;text-align:center;color:var(--txt3);font-size:12px">${msg}</div>`;
  }

  function errCard(msg) {
    return `<div style="padding:24px;background:rgba(248,113,113,.06);border:0.5px solid rgba(248,113,113,.2);border-radius:10px;color:#f87171;font-size:12px;text-align:center">⚠ ${msg || 'Failed to load data'}</div>`;
  }

  /* ═══ SHORTCUTS MODAL ═══ */
  function openShortcutsModal() {
    if (document.getElementById('sc-modal-overlay')) return;
    const ov = document.createElement('div'); ov.id = 'sc-modal-overlay'; ov.className = 'sc-modal-overlay';
    ov.innerHTML = `
    <div class="sc-modal">
      <div class="sc-modal-head">
        <div class="sc-modal-title"><i class="ti ti-keyboard" style="color:var(--accent2)"></i> Keyboard Shortcuts</div>
        <div class="sc-modal-close" onclick="document.getElementById('sc-modal-overlay').remove()"><i class="ti ti-x"></i></div>
      </div>
      <div style="font-size:10px;color:var(--txt3);margin-bottom:12px">Press any key below to jump directly to that module</div>
      <div class="sc-modal-grid">
        ${SHORTCUTS.map(sh => `
        <div class="sc-key" onclick="${sh.id==='home'?'App.goHome()':'App.openMod(\''+sh.id+'\')'};document.getElementById('sc-modal-overlay')?.remove()">
          <div class="kbd">${sh.key}</div>
          <div class="sc-key-label">${sh.label}</div>
        </div>`).join('')}
      </div>
    </div>`;
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  }

  /* ═══ ONBOARDING TOUR ═══ */
  /* ─────────── EXTRA SERVICES ─────────── */
  async function rExtras(b, btns, isSilent = false) {
    btns.innerHTML = `<button class="dbtn pr" onclick="App.showAddExtraModal()">+ Extra Service</button>`;
    if (!isSilent) setHtml(b, loadingCard());
    try {
      const wsRes = await API.workspaces.getMy();
      const wsList = wsRes?.data || wsRes || [];
      if (!wsList.length) { setHtml(b, emptyCard('Create a workspace first.')); return; }
      const wsId = wsList[0].id;
      const res = await API.workspaces.getExtras(wsId);
      const list = res?.data || res || [];
      const active = list.filter(e => e.isActive).length;
      b.innerHTML = `
      <div class="g3">${[
        ['Active',   active,         'Available services', '#8b5cf6'],
        ['Total',    list.length,    'All services',       '#6d28d9'],
        ['Revenue',  list.reduce((a,e)=>a+Number(e.price),0).toLocaleString('en-IN',{style:'currency',currency:'INR'}), 'Combined price', '#34d399'],
      ].map(([l,v,s,c]) => `<div class="sc"><div class="sc-lb">${l}</div><div class="sc-v" style="color:${c}">${v}</div><div class="sc-s">${s}</div></div>`).join('')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${list.length ? list.map(e => `
        <div style="background:var(--bg2);border:0.5px dashed var(--border2);border-radius:10px;padding:12px;display:flex;gap:10px;align-items:center;position:relative">
          <div style="text-align:center;padding:8px 10px;background:var(--bg3);border-radius:7px;border-right:1.5px dashed var(--border2);min-width:50px">
            <div style="font-size:11px;font-weight:800;font-family:monospace;color:#8b5cf6;letter-spacing:1px">${e.name.substring(0,8)}</div>
            <div style="font-size:8px;color:var(--txt3);margin-top:1px">SERVICE</div>
          </div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:800;color:var(--txt)">₹${Number(e.price).toFixed(2)}</div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--txt3);margin-top:2px"><span>${e.description || '—'}</span><span class="badge ${e.isActive?'bs':'be'}">${e.isActive?'Active':'Off'}</span></div>
          </div>
          <button onclick="App.deleteExtra('${wsId}', '${e.id}')" style="position:absolute;top:10px;right:10px;background:rgba(248,113,113,0.1);color:#f87171;border:0.5px solid rgba(248,113,113,0.3);border-radius:6px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer"><i class="ti ti-trash" style="font-size:12px"></i></button>
        </div>`).join('') : `<div style="padding:24px;text-align:center;color:var(--txt3);font-size:12px;grid-column:1/-1">No extra services yet. Click "+ Extra Service" to create one.</div>`}
      </div>`;
    } catch (err) {
      setHtml(b, errCard(err.message));
    }
  }

  async function showAddExtraModal() {
    const wsRes = await API.workspaces.getMy().catch(()=>({ data:[] }));
    const wsList = wsRes?.data || wsRes || [];
    if (!wsList.length) { toastErr('Create a workspace first.'); return; }
    const wsId = wsList[0].id;
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;display:flex;align-items:center;justify-content:center';
    ov.innerHTML = `
    <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:28px 32px;width:340px">
      <div style="font-size:14px;font-weight:800;color:var(--txt);margin-bottom:18px">Add Extra Service</div>
      <div class="auth-field"><label>Service Name</label><input id="extra-name" type="text" placeholder="e.g. Lounge Access" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
      <div class="auth-field"><label>Description</label><input id="extra-desc" type="text" placeholder="Optional details" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
      <div class="auth-field"><label>Price (₹)</label><input id="extra-price" type="number" placeholder="e.g. 500" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
      <div id="extra-err" style="font-size:11px;color:#f87171;margin-bottom:8px;min-height:14px"></div>
      <div style="display:flex;gap:8px">
        <button onclick="App.submitExtra('${wsId}', this)" style="flex:1;padding:9px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Add Service</button>
        <button onclick="this.closest('div[style]').remove()" style="padding:9px 14px;background:var(--bg3);color:var(--txt2);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Cancel</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  }

  async function submitExtra(wsId, btn) {
    const name = document.getElementById('extra-name').value.trim();
    const desc = document.getElementById('extra-desc').value.trim();
    const price = document.getElementById('extra-price').value;
    const errEl = document.getElementById('extra-err');
    if (!name) { errEl.textContent = 'Service name required.'; return; }
    if (!price || Number(price) <= 0) { errEl.textContent = 'Valid price required.'; return; }
    btn.disabled = true; btn.textContent = 'Adding…';
    try {
      await API.workspaces.addExtra(wsId, { name, description: desc, price: Number(price) });
      btn.closest('div[style]').remove();
      toast('Extra service added!');
      if (currentMod === 'extras') openMod('extras');
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Add Service';
    }
  }

  async function deleteExtra(wsId, extraId) {
    if (!confirm('Delete this extra service?')) return;
    try {
      await API.workspaces.deleteExtra(wsId, extraId);
      toast('Extra service deleted');
      if (currentMod === 'extras') openMod('extras');
    } catch(e) {
      toastErr(e.message);
    }
  }

  async function rExtrasNew(b, btns, isSilent = false) {
    btns.innerHTML = `<button class="dbtn pr" onclick="document.getElementById('global-extra-name')?.focus()">+ Global Service</button>`;
    if (!isSilent) setHtml(b, loadingCard());
    try {
      const wsRes = await API.workspaces.getMy();
      const wsList = wsRes?.data || wsRes || [];
      if (!selectedExtrasWorkspaceId || !wsList.some(w => w.id === selectedExtrasWorkspaceId)) {
        selectedExtrasWorkspaceId = wsList[0]?.id || null;
      }

      const [globalRes, workspaceRes] = await Promise.all([
        API.workspaces.getGlobalExtras(),
        selectedExtrasWorkspaceId ? API.workspaces.getWorkspaceExtras(selectedExtrasWorkspaceId) : Promise.resolve({ data: [] }),
      ]);
      const globalList = globalRes?.data || globalRes || [];
      const workspaceList = workspaceRes?.data || workspaceRes || [];
      const enabledCount = workspaceList.filter(e => e.workspaceEnabled).length;

      b.innerHTML = `
      <div class="g3">${[
        ['Global Services', globalList.length, 'Manager catalog', '#8b5cf6'],
        ['Enabled Here', enabledCount, 'Selected workspace', '#34d399'],
        ['Workspaces', wsList.length, 'Locations', '#38bdf8'],
      ].map(([l,v,s,c]) => `<div class="sc"><div class="sc-lb">${l}</div><div class="sc-v" style="color:${c}">${v}</div><div class="sc-s">${s}</div></div>`).join('')}</div>

      <div class="tbl" style="margin-bottom:12px">
        <div class="tbl-bar">
          <div>
            <div class="tbl-ttl">Global Services</div>
            <div style="font-size:10px;color:var(--txt3);margin-top:2px">Create services once. Enable them per workspace below.</div>
          </div>
        </div>
        <div style="padding:12px;border-bottom:0.5px solid var(--border);display:grid;grid-template-columns:1.1fr 1.4fr .7fr auto;gap:8px;align-items:end">
          <div class="auth-field" style="margin:0"><label>Name</label><input id="global-extra-name" type="text" placeholder="Lounge Access" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
          <div class="auth-field" style="margin:0"><label>Description</label><input id="global-extra-desc" type="text" placeholder="Optional details" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
          <div class="auth-field" style="margin:0"><label>Price (INR)</label><input id="global-extra-price" type="number" min="1" placeholder="500" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
          <button class="dbtn pr" onclick="App.submitExtra(this)" style="height:37px">Add</button>
          <div id="global-extra-err" style="grid-column:1/-1;font-size:11px;color:#f87171;min-height:12px"></div>
        </div>
        ${globalList.length ? globalList.map(e => `
          <div class="trow" style="grid-template-columns:1.4fr 2fr .8fr .8fr;min-height:52px">
            <div>
              <div class="cn">${e.name}</div>
              <div style="font-size:9px;color:var(--txt3);margin-top:2px">Used in ${e._count?.workspaces || 0} workspace toggles</div>
            </div>
            <div class="ct">${e.description || 'No description'}</div>
            <div style="font-size:12px;font-weight:800;color:#8b5cf6">INR ${Number(e.price || 0).toFixed(0)}</div>
            <div style="display:flex;gap:6px;justify-content:flex-end;align-items:center">
              <span class="badge ${e.isActive?'bs':'be'}">${e.isActive?'Active':'Off'}</span>
              <button onclick="App.deleteExtra('${e.id}')" style="padding:5px 8px;background:rgba(248,113,113,0.1);color:#f87171;border:0.5px solid rgba(248,113,113,0.3);border-radius:6px;font-size:10px;font-weight:700;cursor:pointer">Delete</button>
            </div>
          </div>`).join('') : `<div style="padding:24px;text-align:center;color:var(--txt3);font-size:12px">No global services yet. Add one above.</div>`}
      </div>

      <div class="tbl">
        <div class="tbl-bar">
          <div>
            <div class="tbl-ttl">Workspace Service Toggles</div>
            <div style="font-size:10px;color:var(--txt3);margin-top:2px">Pick a workspace and turn global services on or off for that location.</div>
          </div>
          <select id="extras-workspace-select" onchange="App.loadExtras(this.value)" style="background:var(--bg3);color:var(--txt);border:0.5px solid var(--border2);border-radius:8px;padding:8px 10px;font-size:12px;font-family:inherit">
            ${wsList.length ? wsList.map(w => `<option value="${w.id}" ${w.id===selectedExtrasWorkspaceId?'selected':''}>${w.name}</option>`).join('') : '<option>No workspaces</option>'}
          </select>
        </div>
        ${wsList.length ? (workspaceList.length ? workspaceList.map(e => `
          <div class="trow" style="grid-template-columns:1.4fr 2fr .8fr .8fr;min-height:56px">
            <div>
              <div class="cn">${e.name}</div>
              <div style="font-size:9px;color:var(--txt3);margin-top:2px">${e.isActive ? 'Global service active' : 'Globally disabled'}</div>
            </div>
            <div class="ct">${e.description || 'No description'}</div>
            <div style="font-size:12px;font-weight:800;color:#8b5cf6">INR ${Number(e.price || 0).toFixed(0)}</div>
            <label style="justify-self:end;display:flex;align-items:center;gap:8px;font-size:11px;color:var(--txt2);font-weight:700">
              ${e.workspaceEnabled ? 'On' : 'Off'}
              <input type="checkbox" ${e.workspaceEnabled ? 'checked' : ''} ${e.isActive ? '' : 'disabled'} onchange="App.toggleWorkspaceExtra('${selectedExtrasWorkspaceId}', '${e.id}', this.checked, this)">
            </label>
          </div>`).join('') : `<div style="padding:24px;text-align:center;color:var(--txt3);font-size:12px">Add a global service first, then enable it for this workspace.</div>`) : `<div style="padding:24px;text-align:center;color:var(--txt3);font-size:12px">Create a workspace first.</div>`}
      </div>`;
    } catch (err) {
      setHtml(b, errCard(err.message));
    }
  }

  async function loadExtras(workspaceId) {
    selectedExtrasWorkspaceId = workspaceId || selectedExtrasWorkspaceId;
    const b = document.getElementById('dbody');
    const btns = document.getElementById('dbtns');
    if (b && btns) await rExtrasNew(b, btns);
  }

  async function showAddExtraModalNew() {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;display:flex;align-items:center;justify-content:center';
    ov.innerHTML = `
    <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:28px 32px;width:340px">
      <div style="font-size:14px;font-weight:800;color:var(--txt);margin-bottom:18px">Add Global Service</div>
      <div class="auth-field"><label>Service Name</label><input id="modal-extra-name" type="text" placeholder="e.g. Lounge Access" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
      <div class="auth-field"><label>Description</label><input id="modal-extra-desc" type="text" placeholder="Optional details" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
      <div class="auth-field"><label>Price (INR)</label><input id="modal-extra-price" type="number" placeholder="e.g. 500" style="width:100%;padding:9px 11px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;color:var(--txt);outline:none;font-family:inherit"></div>
      <div id="modal-extra-err" style="font-size:11px;color:#f87171;margin-bottom:8px;min-height:14px"></div>
      <div style="display:flex;gap:8px">
        <button onclick="App.submitExtra(this, 'modal')" style="flex:1;padding:9px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Add Service</button>
        <button onclick="this.closest('div[style]').remove()" style="padding:9px 14px;background:var(--bg3);color:var(--txt2);border:0.5px solid var(--border2);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Cancel</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  }

  async function submitExtraNew(btn, source = 'global') {
    const prefix = source === 'modal' ? 'modal-extra' : 'global-extra';
    const name = document.getElementById(`${prefix}-name`)?.value.trim();
    const desc = document.getElementById(`${prefix}-desc`)?.value.trim();
    const price = document.getElementById(`${prefix}-price`)?.value;
    const errEl = document.getElementById(`${prefix}-err`);
    if (!name) { errEl.textContent = 'Service name required.'; return; }
    if (!price || Number(price) <= 0) { errEl.textContent = 'Valid price required.'; return; }
    btn.disabled = true; btn.textContent = 'Adding...';
    try {
      await API.workspaces.addExtra({ name, description: desc, price: Number(price) });
      if (source === 'modal') btn.closest('div[style]').remove();
      toast('Global service added');
      if (currentMod === 'extras') openMod('extras');
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled = false; btn.textContent = source === 'modal' ? 'Add Service' : 'Add';
    }
  }

  async function deleteExtraNew(extraId) {
    if (!confirm('Delete this global service? It will be removed from every workspace.')) return;
    try {
      await API.workspaces.deleteExtra(extraId);
      toast('Global service deleted');
      if (currentMod === 'extras') openMod('extras');
    } catch(e) {
      toastErr(e.message);
    }
  }

  async function toggleWorkspaceExtra(wsId, extraId, isEnabled, input) {
    input.disabled = true;
    try {
      await API.workspaces.toggleWorkspaceExtra(wsId, extraId, isEnabled);
      toast(isEnabled ? 'Service enabled for workspace' : 'Service disabled for workspace');
      await loadExtras(wsId);
    } catch(e) {
      input.checked = !isEnabled;
      input.disabled = false;
      toastErr(e.message);
    }
  }

  /* ═══ TOUR ═══ */
  const TOUR_STEPS = [
    { title: 'Welcome to CoWork HQ! 🎉', desc: 'This quick tour shows you around the manager portal. Takes less than a minute!', pos: 'center', target: null },
    { title: 'Dashboard', desc: 'KPI cards show live revenue, bookings, and pending approvals fetched directly from your backend.', pos: 'bottom', target: null },
    { title: 'Keyboard Shortcuts', desc: 'Press D for Dashboard, B for Bookings, P for Payments, and more. Super fast navigation!', pos: 'bottom-left', target: 'shortcuts-btn' },
    { title: 'Profile & Theme', desc: 'Click your avatar to access settings or logout. Toggle light/dark mode with the sun icon.', pos: 'bottom-right', target: 'nav-av' },
  ];

  let tourStep = 0;

  function startTour() { tourStep = 0; renderTourStep(); }

  function renderTourStep() {
    clearTour();
    const step = TOUR_STEPS[tourStep]; if (!step) return;
    const bd = document.createElement('div'); bd.id = 'tour-backdrop'; bd.className = 'tour-backdrop';
    document.body.appendChild(bd);
    let rect = null;
    if (step.target) {
      const el = document.getElementById(step.target);
      if (el) {
        rect = el.getBoundingClientRect();
        const hl = document.createElement('div'); hl.id = 'tour-highlight'; hl.className = 'tour-highlight';
        hl.style.cssText = `top:${rect.top-4}px;left:${rect.left-4}px;width:${rect.width+8}px;height:${rect.height+8}px`;
        document.body.appendChild(hl);
      }
    }
    const card = document.createElement('div'); card.id = 'tour-card'; card.className = 'tour-card';
    const dots = TOUR_STEPS.map((_,i) => `<div class="tour-dot${i===tourStep?' active':''}"></div>`).join('');
    const isLast = tourStep === TOUR_STEPS.length - 1;
    const isFirst = tourStep === 0;
    card.innerHTML = `
      <div class="tour-step-label">Step ${tourStep+1} of ${TOUR_STEPS.length}</div>
      <div class="tour-title">${step.title}</div>
      <div class="tour-desc">${step.desc}</div>
      <div class="tour-nav">
        <div class="tour-dots">${dots}</div>
        <div class="tour-btns">
          <div class="tour-btn" onclick="App.endTour()">Skip</div>
          ${!isFirst ? `<div class="tour-btn" onclick="App.tourPrev()">← Back</div>` : ''}
          <div class="tour-btn primary" onclick="${isLast?'App.endTour()':'App.tourNext()'}">${isLast?'Done ✓':'Next →'}</div>
        </div>
      </div>`;
    positionTourCard(card, step.pos, rect);
    document.body.appendChild(card);
  }

  function positionTourCard(card, pos, rect) {
    document.body.appendChild(card);
    const cw = card.offsetWidth||280, ch = card.offsetHeight||160;
    const vw = window.innerWidth, vh = window.innerHeight;
    let top, left;
    if (!rect || pos==='center') { top=(vh-ch)/2; left=(vw-cw)/2; }
    else if (pos==='bottom'||pos==='bottom-left') {
      top=Math.min(rect.bottom+14, vh-ch-12);
      left=pos==='bottom-left'?Math.max(rect.left,8):Math.max(8,Math.min(rect.left+(rect.width-cw)/2, vw-cw-8));
    } else if (pos==='bottom-right') { top=rect.bottom+14; left=Math.max(8,rect.right-cw); }
    else if (pos==='top') { top=Math.max(8,rect.top-ch-14); left=Math.max(8,Math.min(rect.left+(rect.width-cw)/2, vw-cw-8)); }
    card.style.cssText = `top:${top}px;left:${left}px`;
  }

  function tourNext() { tourStep++; renderTourStep(); }
  function tourPrev() { tourStep--; renderTourStep(); }
  function endTour()  { 
    clearTour(); 
    if (currentUser?.id) localStorage.setItem('tour_seen_' + currentUser.id, 'true');
    toast('Tour complete! Use the ? icon in the nav to restart it anytime 🚀'); 
  }

  function clearTour() {
    ['tour-backdrop','tour-highlight','tour-card'].forEach(id => {
      const el = document.getElementById(id); if (el) el.remove();
    });
  }

  /* ═══ INIT ═══ */
  function init() {
    switchTab('login');
    // Auto-login if token exists
    const token = API.auth.getToken();
    const user  = API.auth.getUser();
    if (token && user) {
      currentUser = user;
      enterApp();
    }
  }

  let mapInstance = null;
  let mapMarker = null;

  function initMap(lat, lng) {
    const mapEl = document.getElementById('ws-map');
    if (!mapEl) return;
    
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
    }

    const defaultLat = lat || 18.5204;
    const defaultLng = lng || 73.8567;
    
    document.getElementById('ws-lat').value = defaultLat;
    document.getElementById('ws-lng').value = defaultLng;

    setTimeout(() => {
      mapInstance = L.map('ws-map').setView([defaultLat, defaultLng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance);

      mapMarker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(mapInstance);
      
      mapMarker.on('dragend', function(e) {
        const position = mapMarker.getLatLng();
        document.getElementById('ws-lat').value = position.lat;
        document.getElementById('ws-lng').value = position.lng;
      });

      mapInstance.on('click', function(e) {
        mapMarker.setLatLng(e.latlng);
        document.getElementById('ws-lat').value = e.latlng.lat;
        document.getElementById('ws-lng').value = e.latlng.lng;
      });
    }, 200);
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      toastErr('Geolocation is not supported by your browser');
      return;
    }
    const btn = event.currentTarget;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i> Locating...';
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (mapInstance && mapMarker) {
          mapInstance.flyTo([lat, lng], 15);
          mapMarker.setLatLng([lat, lng]);
          document.getElementById('ws-lat').value = lat;
          document.getElementById('ws-lng').value = lng;
        }
        btn.innerHTML = oldHtml;
        btn.disabled = false;
        toast('Location detected! ??');
      },
      (error) => {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
        toastErr('Unable to retrieve your location');
      }
    );
  }

  async function searchMapLocation() {
    const input = document.getElementById('ws-map-search');
    const query = input.value.trim();
    if (!query) return;
    
    const btn = event.currentTarget;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i>';
    btn.disabled = true;

    try {
      const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query));
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (mapInstance && mapMarker) {
          mapInstance.flyTo([lat, lng], 14);
          mapMarker.setLatLng([lat, lng]);
          document.getElementById('ws-lat').value = lat;
          document.getElementById('ws-lng').value = lng;
        }
      } else {
        toastErr('Location not found');
      }
    } catch (err) {
      toastErr('Search failed: ' + err.message);
    } finally {
      btn.innerHTML = oldHtml;
      btn.disabled = false;
    }
  }

  /* --- PUBLIC API --- */
  return {
    initMap, detectLocation, searchMapLocation,
    init, doLogin, doSignup, logout, forceLogout, switchTab, toggleTheme,
    goHome, openMod, toggleDD, loadBookings,
    confirmBooking, rejectBooking, escalateIssue,
    genStaffCode, openCreateWorkspacePage, renderWizStep, wizSubmitStep1, wizUploadImage, wizDeleteImage, wizToggleCategory, wizAddDesk, wizAddBulkDesk, wizDeleteDesk, wizFinish, showGenQrModal, submitGenQr, printQr,
    showWarnModal, showAddCouponModal, submitCoupon, deleteCoupon,
    markAllRead, payPlatformFee, saveSettings, showChangePwdModal, submitChangePwd,
    toggleSw, openShortcutsModal, toggleShortcuts, startTour, tourNext, tourPrev, endTour, toast, toastErr,
    ddGo,
    openManageWorkspacePage, renderEditWorkspaceModalContent, toggleWsCategoryImages,
    submitEditWorkspace, addWorkspaceDesk, addBulkWorkspaceDesks, deleteWorkspaceDesk,
    uploadWorkspaceImage, deleteWorkspaceImage, deleteWorkspacePrompt, togglePricingPlan, updatePricingPlanPrice,
    toggleAllWs, bulkDeactivateWs,
    rExtras: rExtrasNew, loadExtras, showAddExtraModal: showAddExtraModalNew,
    submitExtra: submitExtraNew, deleteExtra: deleteExtraNew, toggleWorkspaceExtra,
  };
})();














