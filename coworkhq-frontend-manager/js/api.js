/* ============================================================
   CoWork HQ — API Service Layer (js/api.js)
   All REST calls to the NestJS backend are centralised here.
   JWT storage, bearer injection, and 401 logout handled here.
   ============================================================ */

const API = (() => {
  // ── Token helpers ────────────────────────────────────────────────
  const getToken  = ()    => localStorage.getItem('cwh_access_token');
  const saveTokens = (at, rt) => {
    localStorage.setItem('cwh_access_token',  at);
    localStorage.setItem('cwh_refresh_token', rt);
  };
  const clearTokens = () => {
    localStorage.removeItem('cwh_access_token');
    localStorage.removeItem('cwh_refresh_token');
    localStorage.removeItem('cwh_user');
  };
  const saveUser = (u) => localStorage.setItem('cwh_user', JSON.stringify(u));
  const getUser  = ()   => {
    try { return JSON.parse(localStorage.getItem('cwh_user') || 'null'); }
    catch { return null; }
  };

  // ── Core fetch wrapper ───────────────────────────────────────────
  async function req(method, path, body = null, isPublic = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (!isPublic) {
      const t = getToken();
      if (t) headers['Authorization'] = `Bearer ${t}`;
    }

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${CONFIG.API_BASE_URL}${path}`, opts);

    // Unauthorised → clear session and reload to auth
    if (res.status === 401) {
      clearTokens();
      if (typeof App !== 'undefined') App.forceLogout();
      throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.message || `Request failed (${res.status})`;
      throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
    }

    return data;
  }

  async function reqMultipart(method, path, formData) {
    const headers = {};
    const t = getToken();
    if (t) headers['Authorization'] = `Bearer ${t}`;

    const opts = { method, headers, body: formData };
    const res = await fetch(`${CONFIG.API_BASE_URL}${path}`, opts);

    if (res.status === 401) {
      clearTokens();
      if (typeof App !== 'undefined') App.forceLogout();
      throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || `Request failed (${res.status})`;
      throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
    return data;
  }

  const get    = (path, pub=false)      => req('GET',    path, null, pub);
  const post   = (path, body, pub=false) => req('POST',   path, body, pub);
  const patch  = (path, body)            => req('PATCH',  path, body);
  const del    = (path)                  => req('DELETE', path);

  // ─────────────────────────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────────────────────────
  const auth = {
    async login(email, password) {
      const data = await post('/auth/login', { email, password }, true);
      saveTokens(data.data.accessToken, data.data.refreshToken);
      saveUser(data.data.user);
      return data.data;
    },

    async register(name, email, password, role = 'MANAGER', businessName = '') {
      const payload = { name, email, password, role };
      if (role === 'MANAGER') payload.businessName = businessName || name;
      const data = await post('/auth/register', payload, true);
      saveTokens(data.data.accessToken, data.data.refreshToken);
      saveUser(data.data.user);
      return data.data;
    },

    async refresh() {
      const rt = localStorage.getItem('cwh_refresh_token');
      if (!rt) throw new Error('No refresh token');
      const data = await post('/auth/refresh', { refreshToken: rt }, true);
      saveTokens(data.data.accessToken, data.data.refreshToken);
      return data.data;
    },

    async changePassword(currentPassword, newPassword) {
      return patch('/auth/change-password', { currentPassword, newPassword });
    },

    logout: clearTokens,
    getUser,
    getToken,
    isLoggedIn: () => !!getToken(),
  };

  // ─────────────────────────────────────────────────────────────────
  // USERS / PROFILE
  // ─────────────────────────────────────────────────────────────────
  const users = {
    getMe: ()                   => get('/users/me'),
    updateMe: (dto)             => patch('/users/me', dto),
    updateManagerProfile: (dto) => patch('/users/me/manager-profile', dto),
    getLoyaltyPoints: ()        => get('/users/me/loyalty'),
    submitFeedback: (dto)       => post('/users/feedback', dto),
    getWorkspaceFeedbacks: (id) => get(`/users/feedback/${id}`),
    warnCustomer: (dto)         => post('/users/warn-customer', dto),
    getManagerCustomers: ()     => get('/users/manager/customers'),
  };

  // ─────────────────────────────────────────────────────────────────
  // WORKSPACES
  // ─────────────────────────────────────────────────────────────────
  const workspaces = {
    getAll:         (q = {}) => {
      const params = new URLSearchParams(q).toString();
      return get(`/workspaces${params ? '?' + params : ''}`, true);
    },
    getOne:         (id)     => get(`/workspaces/${id}`, true),
    getMy:          ()       => get('/workspaces/my'),
    getDashboard:   ()       => get('/workspaces/manager/dashboard'),
    getAvailability:(id, dt) => get(`/workspaces/${id}/availability?date=${dt}`, true),
    getCoupons:     (id)     => get(`/workspaces/${id}/coupons`),
    getMyStaff:     ()       => get('/workspaces/staff-codes/my-staff'),
    create:         (dto)    => post('/workspaces', dto),
    update:         (id,dto) => patch(`/workspaces/${id}`, dto),
    deactivate:     (id)     => del(`/workspaces/${id}`),
    addDesk:        (id,dto) => post(`/workspaces/${id}/desks`, dto),
    addBulkDesks:   (id,dto) => post(`/workspaces/${id}/desks/bulk`, dto),
    updateDesk:     (did,dto)=> patch(`/workspaces/desks/${did}`, dto),
    deleteDesk:     (did)    => del(`/workspaces/desks/${did}`),
    addPricingPlan: (id,dto) => post(`/workspaces/${id}/pricing`, dto),
    updatePlan:     (pid,dto)=> patch(`/workspaces/pricing/${pid}`, dto),
    createCoupon:   (id,dto) => post(`/workspaces/${id}/coupons`, dto),
    deleteCoupon:   (couponId) => del(`/workspaces/coupons/${couponId}`),
    generateQr:     (id,did) => post(`/workspaces/${id}/qr${did ? '?deskId='+did : ''}`),
    generateStaffCode: ()    => post('/workspaces/staff-codes/generate', {}),
    uploadImage:    (id, file, order) => {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('order', String(order));
      return reqMultipart('POST', `/workspaces/${id}/images`, fd);
    },
    removeImage:    (imageId) => del(`/workspaces/images/${imageId}`),
    
    // Extra Services
    getExtras:      (id)     => get(`/workspaces/${id}/extra-services`, true),
    getGlobalExtras:()       => get('/extra-services'),
    addExtra:       (dto)    => post('/extra-services', dto),
    updateExtra:    (id,dto) => patch(`/extra-services/${id}`, dto),
    deleteExtra:    (id)     => del(`/extra-services/${id}`),
    getWorkspaceExtras:(id)  => get(`/workspaces/${id}/extra-services/manage`),
    toggleWorkspaceExtra:(wsId, id, isEnabled) => patch(`/workspaces/${wsId}/extra-services/${id}/toggle`, { isEnabled }),
  };

  // ─────────────────────────────────────────────────────────────────
  // BOOKINGS
  // ─────────────────────────────────────────────────────────────────
  const bookings = {
    create:           (dto)        => post('/bookings', dto),
    getMy:            (status)     => get(`/bookings/my${status ? '?status='+status : ''}`),
    getManagerBookings:(status)    => get(`/bookings/manager${status ? '?status='+status : ''}`),
    getOne:           (id)         => get(`/bookings/${id}`),
    confirm:          (id)         => patch(`/bookings/${id}/confirm`),
    reject:           (id, reason) => patch(`/bookings/${id}/reject`, { reason }),
    cancel:           (id)         => patch(`/bookings/${id}/cancel`),
    reschedule:       (id, dto)    => patch(`/bookings/${id}/reschedule`, dto),
  };

  // ─────────────────────────────────────────────────────────────────
  // PAYMENTS
  // ─────────────────────────────────────────────────────────────────
  const payments = {
    createOrder:      (bookingId) => post(`/payments/order/${bookingId}`),
    verify:           (dto)       => post('/payments/verify', dto),
    getManagerPayments:()         => get('/payments/manager'),
    payPlatformFee:   (month)     => post('/payments/platform-fee', { month }),
  };

  // ─────────────────────────────────────────────────────────────────
  // ISSUES
  // ─────────────────────────────────────────────────────────────────
  const issues = {
    getAll:   (workspaceId, status) => {
      const q = new URLSearchParams({ workspaceId, ...(status && { status }) }).toString();
      return get(`/issues?${q}`);
    },
    getMy:    ()              => get('/issues/my'),
    resolve:  (id, note)      => patch(`/issues/${id}/resolve`, { note }),
    escalate: (id)            => patch(`/issues/${id}/escalate`),
  };

  // ─────────────────────────────────────────────────────────────────
  // NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────────
  const notifications = {
    getUnread: ()     => get('/notifications'),
    markRead:  (ids)  => patch('/notifications/mark-read', { ids }),
  };

  // ─────────────────────────────────────────────────────────────────
  // ADMIN (for future admin portal)
  // ─────────────────────────────────────────────────────────────────
  const admin = {
    getDashboard:       ()         => get('/admin/dashboard'),
    getUsers:           (role,page)=> get(`/admin/users?role=${role||''}&page=${page||1}`),
    banUser:            (id,reason)=> patch(`/admin/users/${id}/ban`, { reason }),
    unbanUser:          (id)       => patch(`/admin/users/${id}/unban`),
    getWorkspaces:      (city,page)=> get(`/admin/workspaces?city=${city||''}&page=${page||1}`),
    suspendWorkspace:   (id)       => patch(`/admin/workspaces/${id}/suspend`),
    getPlatformFees:    (status)   => get(`/admin/platform-fees?status=${status||''}`),
    getOccupancyAnalytics:(city)   => get(`/admin/analytics/occupancy?city=${city||''}`),
    getFeedbacks:       (resolved) => get(`/admin/feedbacks?resolved=${resolved ?? ''}`),
    respondFeedback:    (id,dto)   => patch(`/admin/feedbacks/${id}`, dto),
  };

  return { auth, users, workspaces, bookings, payments, issues, notifications, admin };
})();
