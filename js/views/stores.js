/* =====================================================
   views/stores.js — Updated tabs: All, Today, Unchecked, Issues, Critical
   Checked = lastCheckAt is today (from Sheets, not localStorage)
   ===================================================== */
const StoresView = {
  filters: { view:'all', eng:'', area:'', device:'', q:'' },

  // Check if store was checked today using lastCheckAt from Sheets
  isCheckedToday(store) {
    if (!store.lastCheckAt) return false;
    const today = new Date().toISOString().slice(0, 10);
    return String(store.lastCheckAt).slice(0, 10) === today;
  },

  render() {
    const base  = STATE.myStores();
    const u     = STATE.currentUser;

    const todayCount     = base.filter(s => StoresView.isCheckedToday(s)).length;
    const uncheckedCount = base.filter(s => !StoresView.isCheckedToday(s)).length;

    let filtered = StoresView._applyFilters(base);

    const filterBar = `
      <div class="filter-bar">
        <div class="filter-tabs-row">
          <div class="filter-tabs">
            ${[
              { v:'all',       label:'All',       count: null },
              { v:'today',     label:'Today',     count: todayCount },
              { v:'unchecked', label:'Unchecked', count: uncheckedCount },
              { v:'issues',    label:'Issues',    count: null },
              { v:'critical',  label:'Critical',  count: null },
            ].map(t => `
              <button class="filter-tab ${StoresView.filters.view===t.v?'active':''}"
                onclick="StoresView.setFilter('view','${t.v}')">
                ${t.label}
                ${t.count !== null ? `<span class="tab-count-badge">${t.count}</span>` : ''}
              </button>`).join('')}
          </div>
          <div class="filter-search-row">
            <div class="search-box-wrap">
              <i class="ti ti-search search-box-ico"></i>
              <input class="search-box-inp" type="text" id="storeSearchInput"
                placeholder="Search store or number…"
                value="${StoresView.filters.q}"
                oninput="StoresView.liveSearch(this.value)"
                autocomplete="off">
              ${StoresView.filters.q ? `<button class="search-clear" onclick="StoresView.clearSearch()"><i class="ti ti-x"></i></button>` : ''}
            </div>
            ${(u.role==='admin'||u.role==='ops') ? `
              <select class="filter-sel" onchange="StoresView.setFilter('eng',this.value)">
                <option value="">All Engineers</option>
                ${[...new Set(base.map(s=>s.eng))].sort().map(e=>`<option ${StoresView.filters.eng===e?'selected':''}>${e}</option>`).join('')}
              </select>` : ''}
            <select class="filter-sel" onchange="StoresView.setFilter('area',this.value)">
              <option value="">All Areas</option>
              ${[...new Set(base.map(s=>s.area))].sort().map(a=>`<option ${StoresView.filters.area===a?'selected':''}>${a}</option>`).join('')}
            </select>
            <select class="filter-sel" onchange="StoresView.setFilter('device',this.value)">
              <option value="">Any Device</option>
              ${STATE.devList().map(d=>`<option value="${d}" ${StoresView.filters.device===d?'selected':''}>${d} issues</option>`).join('')}
            </select>
            ${u.role==='admin' ? `<button class="btn btn-brand btn-sm" onclick="MODALS.openAddStore()"><i class="ti ti-plus"></i> Add</button>` : ''}
          </div>
        </div>
      </div>`;

    const checked   = base.filter(s => StoresView.isCheckedToday(s)).length;
    const remaining = base.length - checked;
    const pct       = base.length ? Math.round(checked / base.length * 100) : 0;
    const critical  = base.filter(s => STATE.healthLabel(s) === 'critical').length;

    const progressBar = `
      <div class="stores-progress-bar">
        <div class="spb-left">
          <div class="spb-counts">
            <span class="spb-checked"><i class="ti ti-circle-check"></i> ${checked} Checked</span>
            <span class="spb-remaining"><i class="ti ti-clock"></i> ${remaining} Remaining</span>
            ${critical > 0 ? `<span class="spb-critical"><i class="ti ti-alert-circle"></i> ${critical} Critical</span>` : ''}
          </div>
          <div class="spb-track"><div class="spb-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="spb-right">
          <span class="spb-pct">${pct}%</span>
          <span class="spb-label">Today</span>
        </div>
        <div class="spb-sync"><div class="sync-dot"></div> ${filtered.length} of ${base.length} stores</div>
      </div>`;

    const rows  = filtered.map(s => StoresView.storeCard(s)).join('');
    const empty = `<div class="empty-state"><i class="ti ti-search-off"></i><p>No stores match</p></div>`;

    return `
      <div class="view-header">
        <h2 class="view-title"><i class="ti ti-building-store"></i> My Stores</h2>
        ${u.role==='engineer' ? `<span class="view-subtitle">Tap a device to mark it ✓ or ✗</span>` : ''}
      </div>
      ${filterBar}
      ${progressBar}
      <div class="stores-list" id="storesList">${filtered.length ? rows : empty}</div>`;
  },

  _applyFilters(base) {
    const f = StoresView.filters;
    let result = base.filter(s => {
      if (f.eng    && s.eng    !== f.eng)    return false;
      if (f.area   && s.area   !== f.area)   return false;
      if (f.device && s[f.device] === 1)     return false;
      if (f.q) {
        const q = f.q.toLowerCase();
        if (!s.branch?.toLowerCase().includes(q) && !String(s.id).includes(q)) return false;
      }
      if (f.view === 'today')     return StoresView.isCheckedToday(s);
      if (f.view === 'unchecked') return !StoresView.isCheckedToday(s);
      if (f.view === 'issues')    return STATE.hasIssue(s);
      if (f.view === 'critical')  return STATE.healthLabel(s) === 'critical';
      return true;
    });

    // Sort: unchecked first, then by branch name
    return result.sort((a, b) => {
      const aC = StoresView.isCheckedToday(a) ? 1 : 0;
      const bC = StoresView.isCheckedToday(b) ? 1 : 0;
      if (aC !== bC) return aC - bC;
      return String(a.branch).localeCompare(String(b.branch));
    });
  },

  liveSearch(q) {
    StoresView.filters.q = q;
    const list = document.getElementById('storesList');
    const base = STATE.myStores();
    const filtered = StoresView._applyFilters(base);
    if (list) {
      list.innerHTML = filtered.length
        ? filtered.map(s => StoresView.storeCard(s)).join('')
        : `<div class="empty-state"><i class="ti ti-search-off"></i><p>No stores match "<strong>${q}</strong>"</p></div>`;
    }
  },

  clearSearch() {
    StoresView.filters.q = '';
    StoresView.setFilter('q', '');
  },

  storeCard(s) {
    const devs    = STATE.devList();
    const health  = STATE.healthLabel(s);
    const checked = StoresView.isCheckedToday(s);
    const pct     = STATE.pct(s);
    const canEdit = STATE.canEdit(s);

    // Show last check time if checked today, or last update date if not
    let timeLabel = '';
    if (checked && s.lastCheckAt) {
      const t = new Date(s.lastCheckAt);
      timeLabel = `<div class="store-card-status-tag checked-tag"><i class="ti ti-circle-check"></i> ${t.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>`;
    } else if (s.lastCheckAt) {
      const d = new Date(s.lastCheckAt);
      timeLabel = `<div class="store-card-status-tag unchecked-tag"><i class="ti ti-clock"></i> Last: ${d.toLocaleDateString([],{day:'numeric',month:'short'})}</div>`;
    } else {
      timeLabel = `<div class="store-card-status-tag unchecked-tag"><i class="ti ti-clock"></i> Not checked yet</div>`;
    }

    const cardClass = !checked ? 'store-card needs-check' : `store-card checked ${health}`;
    const dotClass  = !checked ? 'unchecked' : health;

    return `<div class="${cardClass}" id="store-card-${s.id}">
      <div class="store-card-left">
        <div class="store-health-dot ${dotClass}"></div>
        <div class="store-card-info">
          <div class="store-card-name">${s.branch}</div>
          <div class="store-card-meta">${s.eng||'—'} · ${s.area||'—'}</div>
          ${timeLabel}
          ${s.notes ? `<div class="store-card-note"><i class="ti ti-note"></i> ${String(s.notes).substring(0,50)}${s.notes.length>50?'…':''}</div>` : ''}
        </div>
      </div>
      <div class="store-card-devices">
        ${devs.map(d => `
          <div class="dev-quick-btn ${!checked ? 'unchecked-dev' : (s[d]?'ok':'issue')}"
               title="${d}: ${!checked ? 'Tap to check' : (s[d]?'Working':'Issue')}"
               ${canEdit ? `onclick="StoresView.quickToggle(${s.id},'${d}')"` : ''}>
            <i class="ti ${!checked ? 'ti-minus' : (s[d]?'ti-check':'ti-x')}"></i>
            <span>${d}</span>
          </div>`).join('')}
      </div>
      <div class="store-card-right">
        ${checked
          ? `<span class="score-pill ${health==='healthy'?'sp-100':health==='warning'?'sp-80':'sp-low'}">${pct}%</span>`
          : `<span class="score-pill sp-unchecked">—%</span>`}
        <div class="store-card-actions">
          ${canEdit
            ? `<button class="btn btn-sm btn-secondary" onclick="MODALS.openEdit(${s.id})"><i class="ti ti-edit"></i></button>`
            : `<button class="btn btn-sm btn-ghost" onclick="MODALS.openView(${s.id})"><i class="ti ti-eye"></i></button>`}
          <button class="btn btn-sm btn-ghost" onclick="COMM.openStoreCommunication(${s.id})" title="WhatsApp">
            <i class="ti ti-brand-whatsapp"></i>
          </button>
          <button class="btn btn-sm btn-ghost" onclick="HistoryView.renderForStore(${s.id},'${s.branch.replace(/'/g,"\\'")}')">
            <i class="ti ti-history"></i>
          </button>
        </div>
      </div>
    </div>`;
  },

  setFilter(key, val) {
    StoresView.filters[key] = val;
    const area = document.getElementById('contentArea');
    if (area) area.innerHTML = StoresView.render();
    if (key !== 'q') {
      const inp = document.getElementById('storeSearchInput');
      if (inp) inp.focus();
    }
  },

  async quickToggle(storeId, device) {
    const store = STATE.db.stores.find(s => String(s.id) === String(storeId));
    if (!store || !STATE.canEdit(store)) return;

    const newVal   = store[device] ? 0 : 1;
    const original = store[device];
    store[device]  = newVal;

    StoresView._updateCardDevice(storeId, device, newVal);

    try {
      const payload = {
        id: store.id, branch: store.branch||'', eng: store.eng||'',
        ops: store.ops||'', area: store.area||'', notes: store.notes||'',
        DMB: store.DMB?1:0, Kitchen: store.Kitchen?1:0, POS: store.POS?1:0,
        Kiosk: store.Kiosk?1:0, Tablet: store.Tablet?1:0,
        branchManagerName:  store.branchManagerName  || '',
        branchManagerPhone: store.branchManagerPhone || '',
        supervisorName:     store.supervisorName     || '',
        supervisorPhone:    store.supervisorPhone    || '',
        areaManagerName:    store.areaManagerName    || '',
        areaManagerPhone:   store.areaManagerPhone   || '',
        extraContacts:      store.extraContacts      || '',
        issueStatus:        store.issueStatus        || '',
      };

      await API.updateStore(payload);

      // Update lastCheckAt locally so isCheckedToday works immediately
      store.lastCheckAt = new Date().toISOString();
      STATE.markChecked(storeId);
      StoresView._refreshCard(storeId);

      UI.toast(`${newVal?'✓':'✗'} ${device} — ${store.branch}`, newVal?'ok':'warn');
    } catch(e) {
      store[device] = original;
      StoresView._updateCardDevice(storeId, device, original);
      UI.toast('Update failed: ' + e.message, 'err');
    }
  },

  _updateCardDevice(storeId, device, val) {
    const card = document.getElementById(`store-card-${storeId}`);
    if (!card) return;
    const devs = STATE.devList();
    const idx  = devs.indexOf(device);
    const btns = card.querySelectorAll('.dev-quick-btn');
    if (btns[idx]) {
      btns[idx].className = `dev-quick-btn ${val ? 'ok' : 'issue'}`;
      btns[idx].querySelector('i').className = `ti ${val ? 'ti-check' : 'ti-x'}`;
    }
  },

  _refreshCard(storeId) {
    const store = STATE.db.stores.find(s => String(s.id) === String(storeId));
    if (!store) return;
    const card = document.getElementById(`store-card-${storeId}`);
    if (!card) return;
    card.outerHTML = StoresView.storeCard(store);
  }
};

/* =====================================================
   Need Visit — modal with visit status
   ===================================================== */
const NeedVisitView = {
  open() {
    const stores = STATE.myStores().filter(s => s.issueStatus === 'open' && STATE.hasIssue(s));
    if (!stores.length) {
      UI.openModal('Need Visit',
        `<div class="empty-state"><i class="ti ti-circle-check" style="color:var(--success)"></i>
         <p style="color:var(--success)">No stores need a visit right now!</p></div>`,
        `<button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>`
      );
      return;
    }
    const rows = stores.map(s => {
      const visited = s.visitStatus === 'visited';
      const broken  = STATE.devList().filter(d => !s[d]);
      return `<div class="visit-item ${visited?'visit-done':''}" id="vi-${s.id}">
        <div class="visit-item-left">
          <div class="visit-dot ${visited?'done':'pending'}"></div>
          <div class="visit-info">
            <div class="visit-name">${s.branch}</div>
            <div class="visit-meta">${s.area} · ${s.eng}</div>
            <div class="visit-devices">${broken.map(d=>`<span class="dev-tag-bad">${d}</span>`).join('')}</div>
            ${s.notes?`<div class="visit-note">${s.notes}</div>`:''}
          </div>
        </div>
        <div class="visit-item-right">
          ${visited
            ? `<span class="visit-badge done"><i class="ti ti-circle-check"></i> Visited</span>
               <button class="btn btn-sm btn-ghost" onclick="NeedVisitView.markVisit(${s.id},false)">Undo</button>`
            : `<button class="btn btn-sm btn-brand" onclick="NeedVisitView.markVisit(${s.id},true)">
                 <i class="ti ti-map-pin"></i> Mark Visited
               </button>`}
        </div>
      </div>`;
    }).join('');
    UI.openModal(`📍 Need Visit (${stores.length})`,
      `<div class="visit-list">${rows}</div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>
       <button class="btn btn-brand" onclick="COMM.openAreaSummary()">
         <i class="ti ti-brand-whatsapp"></i> Send Summary
       </button>`
    );
  },

  async markVisit(storeId, visited) {
    const store = STATE.db.stores.find(s => String(s.id) === String(storeId));
    if (!store) return;
    store.visitStatus = visited ? 'visited' : 'pending';
    try {
      await API.updateStore({
        ...store, visitStatus: store.visitStatus,
        branchManagerName:  store.branchManagerName  || '',
        branchManagerPhone: store.branchManagerPhone || '',
        supervisorName:     store.supervisorName     || '',
        supervisorPhone:    store.supervisorPhone    || '',
        areaManagerName:    store.areaManagerName    || '',
        areaManagerPhone:   store.areaManagerPhone   || '',
      });
      const item = document.getElementById(`vi-${storeId}`);
      if (item) {
        item.classList.toggle('visit-done', visited);
        item.querySelector('.visit-item-right').innerHTML = visited
          ? `<span class="visit-badge done"><i class="ti ti-circle-check"></i> Visited</span>
             <button class="btn btn-sm btn-ghost" onclick="NeedVisitView.markVisit(${storeId},false)">Undo</button>`
          : `<button class="btn btn-sm btn-brand" onclick="NeedVisitView.markVisit(${storeId},true)">
               <i class="ti ti-map-pin"></i> Mark Visited
             </button>`;
        item.querySelector('.visit-dot').className = `visit-dot ${visited?'done':'pending'}`;
      }
      UI.toast(visited?`✓ Visit logged for ${store.branch}`:'Visit unmarked', visited?'ok':'info');
    } catch(e) {
      store.visitStatus = visited ? 'pending' : 'visited';
      UI.toast('Failed: ' + e.message, 'err');
    }
  }
};
