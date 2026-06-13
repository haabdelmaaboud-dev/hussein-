// ============================================================
//  api.js — Fixed: token from localStorage (set at login),
//  correct response path parsing, all endpoints
// ============================================================
const API = {

  // ── Core GET ───────────────────────────────────────────
  async call(action, params = {}, retries = 0) {
    // Token is stored in localStorage after login (returned by Apps Script getToken())
    const token = localStorage.getItem('shawarmer_token') || '';
    const query = new URLSearchParams({ action, token, _: Date.now(), ...params });
    const url   = `${APP_CONFIG.API_URL}?${query.toString()}`;

    try {
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.ok === false && data.error === 'Unauthorized' && retries < 1) {
        // Token may have expired — force re-login
        APP.doLogout();
        throw new Error('Session expired. Please log in again.');
      }
      return data;
    } catch (err) {
      if (retries < APP_CONFIG.MAX_RETRIES) {
        await new Promise(r => setTimeout(r, APP_CONFIG.RETRY_DELAY * (retries + 1)));
        return this.call(action, params, retries + 1);
      }
      throw err;
    }
  },

  // ── Auth ────────────────────────────────────────────────
  async verifyLogin(username, password) {
    const url = `${APP_CONFIG.API_URL}?action=verifyLogin&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&_=${Date.now()}`;
    const res = await fetch(url);
    return res.json();
  },

  async ping() {
    const res = await fetch(`${APP_CONFIG.API_URL}?action=ping`);
    return res.json();
  },

  // ── Read ────────────────────────────────────────────────
  getAll()                { return this.call('getAll'); },
  getStores()             { return this.call('getStores'); },
  getStoresLite()         { return this.call('getStoresLite'); },
  getLists()              { return this.call('getLists'); },
  getStats()              { return this.call('getStats'); },
  getDashboardSummary()   { return this.call('getDashboardSummary'); },
  getEngineerStats()      { return this.call('getEngineerStats'); },
  getAuditLog(f = {})     { return this.call('getAuditLog', f); },
  getStoreHistory(id)     { return this.call('getHistory', { storeId: id }); },
  getIssues(f = {})       { return this.call('getIssues', f); },
  getNotifications(f = {}){ return this.call('getNotifications', f); },

  // ── Store writes ─────────────────────────────────────────
  updateStore(data) {
    const user = JSON.parse(localStorage.getItem('shawarmer_user') || '{}');
    return this.call('updateStore', { ...data, user: user.username || user.name || 'system' });
  },

  addStore(data) {
    const user = JSON.parse(localStorage.getItem('shawarmer_user') || '{}');
    return this.call('addStore', { ...data, user: user.username || user.name || 'system' });
  },

  deleteStore(id) {
    const user = JSON.parse(localStorage.getItem('shawarmer_user') || '{}');
    return this.call('deleteStore', { id, user: user.username || user.name || 'system' });
  },

  updateIssue(data) {
    const user = JSON.parse(localStorage.getItem('shawarmer_user') || '{}');
    return this.call('updateIssue', { ...data, user: user.username || user.name || 'system' });
  },

  bulkUpdateStores(stores) {
    const user = JSON.parse(localStorage.getItem('shawarmer_user') || '{}');
    return this.call('bulkUpdateStores', { stores: JSON.stringify(stores), user: user.username || user.name || 'system' });
  },

  generateWhatsapp(type, storeId) {
    const user = JSON.parse(localStorage.getItem('shawarmer_user') || '{}');
    return this.call('generateWhatsapp', { type, storeId, user: user.name || 'system' });
  },

  // ── User writes ──────────────────────────────────────────
  addUser(data) {
    const user = JSON.parse(localStorage.getItem('shawarmer_user') || '{}');
    return this.call('addUser', { ...data, by: user.username || 'admin' });
  },

  updateUser(data) {
    const user = JSON.parse(localStorage.getItem('shawarmer_user') || '{}');
    return this.call('updateUser', { ...data, by: user.username || 'admin' });
  },

  removeUser(id) {
    const user = JSON.parse(localStorage.getItem('shawarmer_user') || '{}');
    return this.call('removeUser', { id, user: user.username || 'admin' });
  },

  changePassword(id, oldPassword, newPassword) {
    const user = JSON.parse(localStorage.getItem('shawarmer_user') || '{}');
    const hashedOld = oldPassword ? hashPassword(oldPassword) : '';
    const hashedNew = hashPassword(newPassword);
    return this.call('changePassword', { id, oldPassword: hashedOld, newPassword: hashedNew, by: user.username || 'admin' });
  },

  // ── List writes ──────────────────────────────────────────
  addListItem(list, value)    { return this.call('addListItem',    { list, value }); },
  removeListItem(list, value) { return this.call('removeListItem', { list, value }); },

  // ── Notifications ────────────────────────────────────────
  createNotification(n)      { return this.call('createNotification', n); },
  markNotificationRead(id)   { return this.call('markNotificationRead', { id }); },

  // ── Audit ────────────────────────────────────────────────
  logAction(type, detail, storeId) {
    const user = JSON.parse(localStorage.getItem('shawarmer_user') || '{}');
    return this.call('logAction', {
      type, detail: detail || '',
      user: user.username || user.name || 'system',
      storeId: storeId || ''
    }).catch(() => {}); // non-critical, swallow errors
  }
};
