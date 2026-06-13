/* =====================================================
   state.js — Fixed: loadDaily, healthLabel, isCheckedToday,
   startDay, unreadCount, addNotification, canEdit
   ===================================================== */

const ROLE_LABELS = { admin:'Admin', engineer:'Engineer', area:'Area Manager', ops:'Ops Manager' };

const NAV_ITEMS = [
  { id:'dashboard',  icon:'ti-layout-dashboard', label:'Dashboard',      roles:['admin','engineer','area','ops'] },
  { id:'stores',     icon:'ti-building-store',   label:'My Stores',      roles:['admin','engineer','area','ops'] },
  { id:'critical',   icon:'ti-alert-triangle',   label:'Critical Stores',roles:['admin','engineer','area','ops'] },
  { id:'reports',    icon:'ti-chart-bar',         label:'Reports',        roles:['admin','area','ops'] },
  { id:'engineers',  icon:'ti-users',             label:'Engineers',      roles:['admin','area','ops'] },
  { id:'alerts',     icon:'ti-bell',              label:'Alerts',         roles:['admin','area','ops'] },
  { id:'auditlog',   icon:'ti-history',           label:'Audit Log',      roles:['admin','ops'] },
  { id:'admin',      icon:'ti-settings',          label:'Settings',       roles:['admin'] },
  { id:'profile',    icon:'ti-user',              label:'My Profile',     roles:['admin','engineer','area','ops'] },
  { id:'contacts',   icon:'ti-address-book',     label:'Contact Directory', roles:['admin','engineer','area','ops'] },
];

const STATE = {
  currentUser: null,
  currentTab: 'dashboard',
  editId: null,

  db: {
    stores:    [],
    users:     [],
    lists:     { engineers:[], ops:[], areas:[], devices:[] },
    timestamp: 0
  },

  // Daily tracking (localStorage-based for fast access)
  daily: {
    date:       '',
    checkedIds: []
  },

  // In-app notifications
  notifications: JSON.parse(localStorage.getItem('notifs') || '[]'),

  // ── Daily state ──────────────────────────────────────
  loadDaily() {
    const today    = new Date().toISOString().slice(0, 10);
    const stored   = JSON.parse(localStorage.getItem('shawarmer_daily') || '{}');
    if (stored.date === today) {
      STATE.daily = stored;
    } else {
      STATE.daily = { date: today, checkedIds: [] };
      STATE.saveDaily();
    }
  },

  saveDaily() {
    localStorage.setItem('shawarmer_daily', JSON.stringify(STATE.daily));
  },

  startDay() {
    const today       = new Date().toISOString().slice(0, 10);
    STATE.daily.date  = today;
    STATE.daily.checkedIds = [];
    STATE.saveDaily();
  },

  markChecked(storeId) {
    const id = String(storeId);
    if (!STATE.daily.checkedIds.includes(id)) {
      STATE.daily.checkedIds.push(id);
      STATE.saveDaily();
    }
  },

  isCheckedToday(storeId) {
    return STATE.daily.checkedIds.includes(String(storeId));
  },

  // ── Device helpers ───────────────────────────────────
  devList() {
    const d = STATE.db.lists.devices;
    return (d && d.length) ? d : ['DMB', 'Kitchen', 'POS', 'Kiosk', 'Tablet'];
  },

  score(store) {
    const devs = STATE.devList();
    return devs.reduce((sum, d) => sum + (store[d] ? 1 : 0), 0);
  },

  pct(store) {
    const devs = STATE.devList();
    return devs.length ? Math.round(STATE.score(store) / devs.length * 100) : 0;
  },

  hasIssue(store) {
    return STATE.score(store) < STATE.devList().length;
  },

  // ── Health label (fix #5 — expanded status) ──────────
  healthLabel(store) {
    const p    = STATE.pct(store);
    const devs = STATE.devList();
    const criticalDevices = ['POS', 'Kitchen'];
    const criticalDown = criticalDevices.filter(d => devs.includes(d) && !store[d]).length;

    if (p === 100)        return 'healthy';
    if (criticalDown >= 2) return 'critical';
    if (criticalDown >= 1) return 'critical';
    if (p >= 80)           return 'warning';
    if (p >= 40)           return 'critical';
    return 'critical';
  },

  scoreCls(store) {
    const h = STATE.healthLabel(store);
    return h === 'healthy' ? 'sp-100' : h === 'warning' ? 'sp-80' : 'sp-low';
  },

  // ── Store filtering ──────────────────────────────────
  myStores() {
    const u = STATE.currentUser;
    if (!u) return [];
    let s = STATE.db.stores;
    if (u.role === 'engineer') s = s.filter(x => x.eng  === u.ref);
    if (u.role === 'area')     s = s.filter(x => x.area === u.ref);
    if (u.role === 'ops')      s = s.filter(x => x.ops  === u.ref);
    return s;
  },

  applyFilters(stores, filters = {}) {
    return stores.filter(r => {
      if (filters.eng    && r.eng    !== filters.eng)    return false;
      if (filters.ops    && r.ops    !== filters.ops)    return false;
      if (filters.area   && r.area   !== filters.area)   return false;
      if (filters.store  && r.branch !== filters.store)  return false;
      if (filters.device && r[filters.device] === 1)     return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        if (!r.branch?.toLowerCase().includes(q) && !String(r.id).includes(q)) return false;
      }
      if (filters.view === 'issues' && !STATE.hasIssue(r)) return false;
      if (filters.view === 'ok'     &&  STATE.hasIssue(r)) return false;
      if (filters.view === 'unchecked' && STATE.isCheckedToday(r.id)) return false;
      if (filters.view === 'critical' && STATE.healthLabel(r) !== 'critical') return false;
      return true;
    });
  },

  canEdit(store) {
    const u = STATE.currentUser;
    if (!u) return false;
    if (u.role === 'admin')    return true;
    if (u.role === 'engineer') return u.ref === store.eng;
    if (u.role === 'area')     return u.ref === store.area;
    if (u.role === 'ops')      return u.ref === store.ops;
    return false;
  },

  isAdmin()    { return STATE.currentUser?.role === 'admin'; },
  isEngineer() { return STATE.currentUser?.role === 'engineer'; },
  isArea()     { return STATE.currentUser?.role === 'area'; },

  // ── Daily stats ──────────────────────────────────────
  dailyStats() {
    const stores  = STATE.myStores();
    const checked = stores.filter(s => STATE.isCheckedToday(s.id)).length;
    const total   = stores.length;
    const issues  = stores.filter(s => STATE.hasIssue(s)).length;
    const critical= stores.filter(s => STATE.healthLabel(s) === 'critical').length;
    return { total, checked, remaining: total - checked, issues, critical, pct: total ? Math.round(checked/total*100) : 0 };
  },

  // ── Notifications ────────────────────────────────────
  addNotification(msg, type, storeId) {
    const n = { id: Date.now(), msg, type: type||'info', storeId: storeId||'', ts: new Date().toISOString(), read: false };
    STATE.notifications.unshift(n);
    if (STATE.notifications.length > 100) STATE.notifications = STATE.notifications.slice(0, 100);
    localStorage.setItem('notifs', JSON.stringify(STATE.notifications));
    return n;
  },

  unreadCount() {
    return STATE.notifications.filter(n => !n.read).length;
  }
};
