// ============================================================
//  app.js — Shawarmer IT Operations v5.1 FIXED
//  Fixed: showTab routing, data flow, API token, refreshTab,
//         buildSidebar, pollData path, notifications, all aliases
// ============================================================

// ── View aliases (fix bug #17-23) ──────────────────────────
const DASHBOARD  = { render: () => DashboardView.render() };
const STORES     = { render: () => StoresView.render() };
const CRITICAL   = { render: () => CriticalView.render() };
const REPORTS    = { render: () => ReportsView.render() };
const ENGINEERS  = { render: () => EngineersView.render() };
const ALERTS     = { render: () => AlertsView.render() };
const AUDITLOG   = { render: () => AuditView.render()  };  // async but that's fine
const HISTORY    = { render: () => { document.getElementById('contentArea').innerHTML =
  `<div class="view-header"><h2 class="view-title"><i class="ti ti-history"></i> Store History</h2></div>
   <div class="empty-state"><i class="ti ti-history"></i><p>Select a store to view its history.</p></div>`; } };
const ADMIN      = Object.assign({ render: () => AdminView.render() },
  // keep ADMIN action methods accessible
  typeof AdminView !== 'undefined' ? {} : {}
);
const PROFILE    = { render: () => ProfileView.render() };

const APP = {
  currentTab: 'dashboard',
  sidebarOpen: false,
  theme: localStorage.getItem('shawarmer_theme') || 'light',
  pollTimer: null,

  // ── Init ───────────────────────────────────────────────
  init() {
    this.setupEventListeners();
    this.loadTheme();
    this.updateDate();
    this.showScreen('loading');
  },

  // ── Auth check after loading ───────────────────────────
  async afterLoad() {
    const storedUser  = localStorage.getItem('shawarmer_user');
    const storedToken = localStorage.getItem('shawarmer_token');
    if (storedUser && storedToken) {
      try {
        STATE.currentUser = JSON.parse(storedUser);
        // Load data then go to app
        await this.loadAllData();
        this.enterApp();
        return;
      } catch(e) { this.doLogout(); }
    }
    this.showScreen('login');
  },

  // ── Load all data from API ─────────────────────────────
  async loadAllData() {
    try {
      const result = await API.getAll();
      // API returns { ok:true, data:{ stores, users, lists, timestamp } }
      const data = result.data || result;
      STATE.db.stores    = data.stores    || [];
      STATE.db.users     = data.users     || [];
      STATE.db.lists     = data.lists     || { engineers:[], ops:[], areas:[], devices:[] };
      STATE.db.timestamp = data.timestamp || Date.now();
      // Load daily state
      STATE.loadDaily();
      return true;
    } catch(e) {
      console.error('loadAllData failed:', e);
      UI.toast('Failed to load data: ' + e.message, 'err');
      return false;
    }
  },

  // ── Enter main app ─────────────────────────────────────
  enterApp() {
    this.showScreen('app');
    this.updateUserDisplay();
    this.renderSidebar();
    this.showTab(APP_CONFIG.LAST_TAB || 'dashboard');
    this.startPolling();
    NOTIF.updateBadge();
    // Update login stats
    this._updateLoginStats();
  },

  _updateLoginStats() {
    const tot = document.getElementById('lsTotal');
    const eng = document.getElementById('lsEngineers');
    const area= document.getElementById('lsArea');
    if (tot)  tot.textContent  = STATE.db.stores.length;
    if (eng)  eng.textContent  = (STATE.db.lists.engineers||[]).length;
    if (area) area.textContent = (STATE.db.lists.areas||[]).length;
  },

  // ── Login ──────────────────────────────────────────────
  async login() {
    const username = document.getElementById('liUser')?.value.trim();
    const password = document.getElementById('liPass')?.value;
    const errEl    = document.getElementById('liErr');
    const btn      = document.getElementById('loginBtn');

    if (errEl) errEl.textContent = '';
    if (!username || !password) {
      if (errEl) errEl.textContent = 'Please enter username and password';
      return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-sm"></span> Signing in…'; }

    try {
      const result = await API.verifyLogin(username, password);

      if (result.ok && result.user) {
        STATE.currentUser = result.user;
        localStorage.setItem('shawarmer_user',  JSON.stringify(result.user));
        localStorage.setItem('shawarmer_token', result.token || '');

        this.showScreen('loading');
        await this.loadAllData();
        this.enterApp();
      } else {
        if (errEl) errEl.textContent = result.error || 'Incorrect username or password';
      }
    } catch(err) {
      if (errEl) errEl.textContent = 'Connection error. Please try again.';
      console.error('Login error:', err);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-login"></i> Sign in'; }
    }
  },

  // ── Logout ─────────────────────────────────────────────
  async logout() {
    try { await API.logAction('LOGOUT', 'User logged out'); } catch(_) {}
    this.doLogout();
  },

  doLogout() {
    STATE.currentUser = null;
    this.stopPolling();
    localStorage.removeItem('shawarmer_user');
    localStorage.removeItem('shawarmer_token');
    this.showScreen('login');
    const u = document.getElementById('liUser');
    const p = document.getElementById('liPass');
    const e = document.getElementById('liErr');
    if (u) u.value = '';
    if (p) p.value = '';
    if (e) e.textContent = '';
  },

  // ── Screen management ──────────────────────────────────
  showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const screens = { loading:'screenLoading', login:'screenLogin', app:'screenApp' };
    const el = document.getElementById(screens[name]);
    if (el) el.classList.remove('hidden');

    if (name === 'loading') {
      this.animateLoader();
    }
  },

  animateLoader() {
    const fill = document.getElementById('loaderFill');
    const msg  = document.getElementById('loaderMsg');
    const steps = [
      [25,  'Connecting to server…'],
      [50,  'Loading store data…'],
      [75,  'Syncing…'],
      [100, 'Ready!']
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i >= steps.length) {
        clearInterval(interval);
        setTimeout(() => this.afterLoad(), 300);
        return;
      }
      if (fill) fill.style.width = steps[i][0] + '%';
      if (msg)  msg.textContent  = steps[i][1];
      i++;
    }, 400);
  },

  // ── Tab routing (fix #1,#10,#11,#14,#17-23) ───────────
  showTab(tabId) {
    if (!STATE.currentUser) return;
    if (!this.canAccessTab(tabId)) {
      UI.toast("You don't have access to this section", 'warn');
      return;
    }

    this.currentTab       = tabId;
    APP_CONFIG.LAST_TAB   = tabId;
    STATE.currentTab      = tabId;

    // Update sidebar & mobile nav active states
    document.querySelectorAll('.sidebar-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tabId);
    });
    document.querySelectorAll('.mobile-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tabId);
    });

    // Clear content
    const area = document.getElementById('contentArea');
    if (area) area.innerHTML = '';

    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      this.sidebarOpen = false;
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebarOverlay')?.classList.add('hidden');
    }

    // Route to view (fix all name mismatches)
    switch(tabId) {
      case 'dashboard':  if (area) area.innerHTML = DashboardView.render(); break;
      case 'stores':     if (area) area.innerHTML = StoresView.render();    break;
      case 'critical':   if (area) area.innerHTML = CriticalView.render();  break;
      case 'reports':    if (area) area.innerHTML = ReportsView.render();   break;
      case 'engineers':  if (area) area.innerHTML = EngineersView.render(); break;
      case 'alerts':     if (area) area.innerHTML = AlertsView.render();    break;
      case 'admin':      if (area) area.innerHTML = AdminView.render();     break;
      case 'profile':    if (area) area.innerHTML = ProfileView.render();   break;
      case 'password':   if (area) area.innerHTML = ProfileView.render();   break;
      case 'contacts':   if (area) { area.innerHTML = ContactsView.render(); ContactsView.bindSearch(); } break;
      case 'auditlog':   AuditView.render(); break;   // async, sets DOM itself
      case 'history':
        if (area) area.innerHTML = `
          <div class="view-header"><h2 class="view-title"><i class="ti ti-history"></i> Store History</h2></div>
          <div class="empty-state"><i class="ti ti-history"></i><p>Open a store and click <strong>History</strong> to view its timeline.</p></div>`;
        break;
      default:
        if (area) area.innerHTML = DashboardView.render();
    }
  },

  // ── refreshTab (fix #3) ────────────────────────────────
  refreshTab() {
    this.showTab(this.currentTab);
  },

  canAccessTab(tabId) {
    if (!STATE.currentUser) return false;
    const item = NAV_ITEMS.find(n => n.id === tabId);
    if (!item) return tabId === 'password' || tabId === 'contacts'; // always allow these
    return item.roles.includes(STATE.currentUser.role);
  },

  // ── Sidebar (fix #4 — was buildSidebar()) ──────────────
  renderSidebar() {
    const navEl   = document.getElementById('navItems');
    const mobileEl = document.getElementById('mobileNav');
    if (!navEl) return;

    const role     = STATE.currentUser?.role;
    const filtered = NAV_ITEMS.filter(n => n.roles.includes(role));

    navEl.innerHTML = filtered.map(item => `
      <div class="sidebar-nav-item ${this.currentTab === item.id ? 'active' : ''}"
           data-tab="${item.id}"
           onclick="APP.showTab('${item.id}')">
        <i class="ti ${item.icon}"></i>
        <span>${item.label}</span>
      </div>`).join('');

    // Mobile nav — show top 4 + fab
    if (mobileEl) {
      const mobileItems = filtered.slice(0, 2).concat(filtered.slice(2, 4));
      mobileEl.innerHTML = `
        ${mobileItems.slice(0,2).map(item => `
          <div class="mobile-nav-item ${this.currentTab === item.id ? 'active' : ''}"
               data-tab="${item.id}" onclick="APP.showTab('${item.id}')">
            <i class="ti ${item.icon}"></i>
            <span>${item.label}</span>
          </div>`).join('')}
        <div class="mobile-nav-item mobile-nav-fab" onclick="APP.quickAction()">
          <div class="mobile-fab-inner"><i class="ti ti-plus"></i></div>
        </div>
        ${mobileItems.slice(2).map(item => `
          <div class="mobile-nav-item ${this.currentTab === item.id ? 'active' : ''}"
               data-tab="${item.id}" onclick="APP.showTab('${item.id}')">
            <i class="ti ${item.icon}"></i>
            <span>${item.label}</span>
          </div>`).join('')}`;
    }

    // Sidebar user display
    this.updateUserDisplay();
  },

  // ── buildSidebar alias (fix #4) ───────────────────────
  buildSidebar() { this.renderSidebar(); },

  // ── User display ───────────────────────────────────────
  updateUserDisplay() {
    const u = STATE.currentUser;
    if (!u) return;

    const nameEl   = document.getElementById('sidebarUserName');
    const roleEl   = document.getElementById('sidebarUserRole');
    const avatarEl = document.getElementById('sidebarAvatar');
    const greetEl  = document.getElementById('greetingText');

    const displayName = u.name || u.username || 'User';
    if (nameEl)   nameEl.textContent   = displayName;
    if (roleEl)   roleEl.textContent   = ROLE_LABELS[u.role] || u.role;
    if (avatarEl) avatarEl.textContent = UI.initials(displayName);

    if (greetEl) {
      greetEl.innerHTML = `
        <div class="greeting-main">${UI.greeting(displayName)} 👋</div>
        <div class="greeting-sub">Here's what's happening with your stores today.</div>`;
    }

    // Sidebar area card
    const areaCard = document.getElementById('sbAreaCard');
    if (areaCard && u.ref) {
      const storeCount = STATE.myStores().length;
      areaCard.innerHTML = `
        <div class="area-name">${u.ref}</div>
        <div class="area-count">${storeCount} Stores Assigned</div>`;
    }
  },

  // ── Sidebar toggle ─────────────────────────────────────
  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    document.getElementById('sidebar')?.classList.toggle('open', this.sidebarOpen);
    document.getElementById('sidebarOverlay')?.classList.toggle('hidden', !this.sidebarOpen);
  },

  // ── Theme ──────────────────────────────────────────────
  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme();
  },

  loadTheme() {
    this.theme = localStorage.getItem('shawarmer_theme') || 'light';
    this.applyTheme();
  },

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
    localStorage.setItem('shawarmer_theme', this.theme);
    const btn = document.getElementById('themeBtn');
    if (btn) btn.innerHTML = `<i class="ti ti-${this.theme === 'dark' ? 'sun' : 'moon'}"></i>`;
  },

  // ── Date display ───────────────────────────────────────
  updateDate() {
    const now  = new Date();
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dayEl  = document.getElementById('dateDay');
    const wdEl   = document.getElementById('dateWeekday');
    if (dayEl) dayEl.textContent  = `${now.getDate()} ${months[now.getMonth()]}`;
    if (wdEl)  wdEl.textContent   = days[now.getDay()];
  },

  // ── Global search ──────────────────────────────────────
  handleGlobalSearch(query) {
    const results = document.getElementById('searchResults');
    if (!query || query.length < 2) {
      if (results) results.classList.add('hidden');
      return;
    }
    const q = query.toLowerCase();
    const matches = STATE.myStores()
      .filter(s => s.branch?.toLowerCase().includes(q) || String(s.id).includes(q) || s.area?.toLowerCase().includes(q))
      .slice(0, 8);

    if (!matches.length || !results) return;
    results.classList.remove('hidden');
    results.innerHTML = matches.map(s => {
      const health = STATE.healthLabel(s);
      return `<div class="search-item" onclick="MODALS.openEdit(${s.id});document.getElementById('searchResults').classList.add('hidden');document.getElementById('globalSearch').value=''">
        <div class="search-item-icon ${health === 'healthy' ? 'si-ok' : 'si-issue'}">
          <i class="ti ${health === 'healthy' ? 'ti-check' : 'ti-alert-triangle'}"></i>
        </div>
        <div>
          <div style="font-weight:600;font-size:13px">${s.branch}</div>
          <div style="font-size:11px;color:var(--text-ter)">${s.eng} · ${s.area}</div>
        </div>
        <span class="score-pill ${health}" style="margin-left:auto">${STATE.pct(s)}%</span>
      </div>`;
    }).join('');
  },

  // ── Notifications (fix #13) ────────────────────────────
  showNotifications() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      NOTIF.renderPanel();  // fix: was NOTIF.renderList()
      // Mark all read after open
      setTimeout(() => {
        STATE.notifications.forEach(n => n.read = true);
        localStorage.setItem('notifs', JSON.stringify(STATE.notifications));
        NOTIF.updateBadge();
      }, 1500);
    }
  },

  // ── Polling (fix #2 — pollData path) ──────────────────
  startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(() => this.pollData(), 30000);
  },

  stopPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  },

  async pollData() {
    try {
      const res = await API.getDashboardSummary();
      // Fix #2: API returns { ok:true, summary:{ stats:{...}, ... } }
      const summary = res.summary || {};
      const stats   = summary.stats || {};
      const criticalCount = stats.critical || 0;

      // Also check for timestamp change to refresh data
      if (res.timestamp && res.timestamp !== STATE.db.timestamp) {
        await this.loadAllData();
        this.refreshTab();
        UI.toast('Data updated', 'info');
      }

      this.updateBadges(criticalCount);
    } catch(e) {
      console.log('Poll failed:', e.message);
    }
  },

  updateBadges(criticalCount) {
    const notifBadge    = document.getElementById('notifBadge');
    const mobileCritical = document.getElementById('mobileCriticalBadge');
    const mobileAlert    = document.getElementById('mobileAlertBadge');
    const unread         = STATE.unreadCount();

    if (notifBadge) {
      notifBadge.textContent = unread;
      notifBadge.classList.toggle('hidden', unread === 0);
    }
    if (mobileCritical) {
      mobileCritical.textContent = criticalCount;
      mobileCritical.classList.toggle('hidden', criticalCount === 0);
    }
  },

  // ── Quick actions ──────────────────────────────────────
  quickAction() {
    if (STATE.isEngineer()) {
      this.showTab('stores');
    } else {
      MODALS.openAddStore();
    }
  },

  // ── Start Day (fix #5) ────────────────────────────────
  startDay() {
    STATE.startDay();
    const btn = document.getElementById('startDayBtn');
    if (btn) {
      btn.innerHTML = '<i class="ti ti-check"></i> Day Started';
      btn.disabled  = true;
      btn.classList.add('btn-success');
    }
    UI.toast('Day started! Good luck with your rounds.', 'ok');
    API.logAction('DAY_START', STATE.currentUser?.name, 'Engineer started daily rounds').catch(() => {});
    this.refreshTab();
  },

  installPWA() {
    if (window.APP_INSTALL_PROMPT) window.APP_INSTALL_PROMPT();
  },

  // ── Event listeners ────────────────────────────────────
  setupEventListeners() {
    document.getElementById('liPass')?.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.login();
    });

    // Close search on click outside
    document.addEventListener('click', e => {
      if (!e.target.closest('.tb-search-wrap')) {
        document.getElementById('searchResults')?.classList.add('hidden');
      }
      if (!e.target.closest('.notif-wrap') && !e.target.closest('.notif-panel')) {
        document.getElementById('notifPanel')?.classList.add('hidden');
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        document.getElementById('sidebarOverlay')?.classList.add('hidden');
      }
    });

    window.addEventListener('online',  () => UI.toast('Back online', 'ok'));
    window.addEventListener('offline', () => UI.toast('You are offline', 'warn'));
  }
};

// ── Global helpers ─────────────────────────────────────────
function closeModal()         { UI.closeModal(); }
function handleOverlayClick(e){ if (e.target === document.getElementById('modalOverlay')) UI.closeModal(); }

// ── Boot ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => APP.init());
