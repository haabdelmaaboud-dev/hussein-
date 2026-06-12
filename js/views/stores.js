/* =====================================================
   views/stores.js
   FIXES:
   1. Engineer sees all stores YELLOW (unchecked) on open
   2. Search works correctly
   3. WhatsApp numbers preserved on quickToggle (bug fix)
   4. Need Visit card click shows visit status modal
   ===================================================== */
const StoresView = {
  filters: { view:'all', eng:'', area:'', device:'', q:'' },

  render() {
    const base  = STATE.myStores();
    const u     = STATE.currentUser;
    const stats = STATE.dailyStats();

    // For engineers: default view shows unchecked first (yellow)
    // Search is applied on top
    let filtered = STATE.applyFilters(base, StoresView.filters);

    // Sort: unchecked first (yellow), then checked
    filtered = [...filtered].sort((a, b) => {
      const aChecked = STATE.isCheckedToday(a.id) ? 1 : 0;
      const bChecked = STATE.isCheckedToday(b.id) ? 1 : 0;
      if (aChecked !== bChecked) return aChecked - bChecked; // unchecked first
      return String(a.branch).localeCompare(String(b.branch));
    });

    const filterBar = `
      <div class="filter-bar">
        <div class="filter-tabs-row">
          <div class="filter-tabs">
            ${['all','issues','ok','unchecked','critical'].map(v => `
              <button class="filter-tab ${StoresView.filters.view===v?'active':''}"
                onclick="StoresView.setFilter('view','${v}')">
                ${v==='all'?'All':v==='issues'?'Issues':v==='ok'?'OK':v==='unchecked'?'Unchecked':'Critical'}
                ${v==='unchecked' ? `<span class="tab-count-badge">${base.filter(s=>!STATE.isCheckedToday(s.id)).length}</span>` : ''}
              </button>`).join('')}
          </div>
          <div class="filter-search-row">
            <div class="search-box-wrap">
              <i class="ti ti-search search-box-ico"></i>
              <input
                class="search-box-inp"
                type="text"
                id="storeSearchInput"
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

    const progressBar = `
      <div class="stores-progress-bar">
        <div class="spb-left">
          <div class="spb-counts">
            <span class="spb-checked"><i class="ti ti-circle-check"></i> ${stats.checked} Checked</span>
            <span class="spb-remaining"><i class="ti ti-clock"></i> ${stats.remaining} Remaining</span>
            ${stats.critical > 0 ? `<span class="spb-critical"><i class="ti ti-alert-circle"></i> ${stats.critical} Critical</span>` : ''}
          </div>
          <div class="spb-track">
            <div class="spb-fill" style="width:${stats.pct}%"></div>
          </div>
        </div>
        <div class="spb-right">
          <span class="spb-pct">${stats.pct}%</span>
          <span class="spb-label">Today</span>
        </div>
        <div class="spb-sync"><div class="sync-dot"></div> ${filtered.length} of ${base.length} stores</div>
      </div>`;

    const rows  = filtered.map(s => StoresView.storeCard(s)).join('');
    const empty = `<div class="empty-state"><i class="ti ti-search-off"></i><p>No stores match your search</p></div>`;

    return `
      <div class="view-header">
        <h2 class="view-title"><i class="ti ti-building-store"></i> My Stores</h2>
        ${u.role==='engineer' ? `<span class="view-subtitle">Tap a device to mark it ✓ or ✗</span>` : ''}
      </div>
      ${filterBar}
      ${progressBar}
      <div class="stores-list" id="storesList">${filtered.length ? rows : empty}</div>`;
  },

  // ── Live search without full re-render (fix: search works) ──
  liveSearch(q) {
    StoresView.filters.q = q;
    const base     = STATE.myStores();
    const filtered = STATE.applyFilters(base, StoresView.filters).sort((a,b) => {
      const aC = STATE.isCheckedToday(a.id) ? 1 : 0;
      const bC = STATE.isCheckedToday(b.id) ? 1 : 0;
      return aC - bC;
    });
    const list = document.getElementById('storesList');
    if (list) {
      list.innerHTML = filtered.length
        ? filtered.map(s => StoresView.storeCard(s)).join('')
        : `<div class="empty-state"><i class="ti ti-search-off"></i><p>No stores match "<strong>${q}</strong>"</p></div>`;
    }
    // Update clear button
    const inp = document.getElementById('storeSearchInput');
    if (inp) inp.value = q;
  },

  clearSearch() {
    StoresView.filters.q = '';
    StoresView.setFilter('q', '');
  },

  // ── Store card — yellow if unchecked ────────────────────────
  storeCard(s) {
    const devs    = STATE.devList();
    const health  = STATE.healthLabel(s);
    const checked = STATE.isCheckedToday(s.id);
    const pct     = STATE.pct(s);
    const canEdit = STATE.canEdit(s);

    // Card state:
    // - unchecked → yellow border (needs-check)
    // - checked + healthy → green
    // - checked + issues → red/orange
    const cardClass = !checked
      ? 'store-card needs-check'
      : `store-card checked ${health}`;

    const dotClass = !checked ? 'unchecked' : health;

    return `<div class="${cardClass}" id="store-card-${s.id}">
      <div class="store-card-left">
        <div class="store-health-dot ${dotClass}"></div>
        <div class="store-card-info">
          <div class="store-card-name">${s.branch}</div>
          <div class="store-card-meta">${s.eng||'—'} · ${s.area||'—'}</div>
          ${!checked ? `<div class="store-card-status-tag unchecked-tag"><i class="ti ti-clock"></i> Not checked yet</div>` : ''}
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
          <button class="btn btn-sm btn-ghost" onclick="HistoryView.renderForStore(${s.id},'${s.branch.replace(/'/g,"\\'")}')" title="History">
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
    // Restore search focus
    if (key !== 'q') {
      const inp = document.getElementById('storeSearchInput');
      if (inp) inp.focus();
    }
  },

  // ── Quick toggle — FIX: preserves ALL fields including phone numbers ──
  async quickToggle(storeId, device) {
    const store = STATE.db.stores.find(s => String(s.id) === String(storeId));
    if (!store || !STATE.canEdit(store)) return;

    const newVal   = store[device] ? 0 : 1;
    const original = store[device];
    store[device]  = newVal;

    // Optimistic: update just this card's device button
    StoresView._updateCardDevice(storeId, device, newVal);

    try {
      // FIX: send ALL fields — never let undefined/empty overwrite phone numbers
      const payload = {
        id:      store.id,
        branch:  store.branch  || '',
        eng:     store.eng     || '',
        ops:     store.ops     || '',
        area:    store.area    || '',
        notes:   store.notes   || '',
        DMB:     store.DMB     ? 1 : 0,
        Kitchen: store.Kitchen ? 1 : 0,
        POS:     store.POS     ? 1 : 0,
        Kiosk:   store.Kiosk   ? 1 : 0,
        Tablet:  store.Tablet  ? 1 : 0,
        // ✅ ALWAYS preserve contact numbers
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
      STATE.markChecked(storeId);

      // After marking checked — update the whole card to show proper colors
      StoresView._refreshCard(storeId);

      const icon = newVal ? '✓' : '✗';
      UI.toast(`${icon} ${device} — ${store.branch}`, newVal ? 'ok' : 'warn');
    } catch(e) {
      store[device] = original;
      StoresView._updateCardDevice(storeId, device, original);
      UI.toast('Update failed: ' + e.message, 'err');
    }
  },

  // Update a single device button without full re-render
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

  // Refresh a full store card after checking
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

  // Called from dashboard KPI card click
  open() {
    const stores = STATE.myStores().filter(s =>
      s.issueStatus === 'open' && STATE.hasIssue(s)
    );

    if (!stores.length) {
      UI.openModal('Need Visit',
        `<div class="empty-state"><i class="ti ti-circle-check" style="color:var(--success)"></i>
         <p style="color:var(--success)">No stores need a visit right now!</p></div>`,
        `<button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>`
      );
      return;
    }

    const rows = stores.map(s => {
      const visited  = s.visitStatus === 'visited';
      const devs     = STATE.devList();
      const broken   = devs.filter(d => !s[d]);
      return `
        <div class="visit-item ${visited ? 'visit-done' : ''}" id="vi-${s.id}">
          <div class="visit-item-left">
            <div class="visit-dot ${visited ? 'done' : 'pending'}"></div>
            <div class="visit-info">
              <div class="visit-name">${s.branch}</div>
              <div class="visit-meta">${s.area} · ${s.eng}</div>
              <div class="visit-devices">${broken.map(d => `<span class="dev-tag-bad">${d}</span>`).join('')}</div>
              ${s.notes ? `<div class="visit-note">${s.notes}</div>` : ''}
            </div>
          </div>
          <div class="visit-item-right">
            ${visited
              ? `<span class="visit-badge done"><i class="ti ti-circle-check"></i> Visited</span>
                 <button class="btn btn-sm btn-ghost" onclick="NeedVisitView.markVisit(${s.id}, false)">Undo</button>`
              : `<button class="btn btn-sm btn-brand" onclick="NeedVisitView.markVisit(${s.id}, true)">
                   <i class="ti ti-map-pin"></i> Mark Visited
                 </button>`}
          </div>
        </div>`;
    }).join('');

    UI.openModal(
      `📍 Need Visit (${stores.length})`,
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
        ...store,
        visitStatus: store.visitStatus,
        // preserve all fields
        branchManagerName:  store.branchManagerName  || '',
        branchManagerPhone: store.branchManagerPhone || '',
        supervisorName:     store.supervisorName     || '',
        supervisorPhone:    store.supervisorPhone    || '',
        areaManagerName:    store.areaManagerName    || '',
        areaManagerPhone:   store.areaManagerPhone   || '',
      });

      // Update just this item in the modal
      const item = document.getElementById(`vi-${storeId}`);
      if (item) {
        item.classList.toggle('visit-done', visited);
        item.querySelector('.visit-item-right').innerHTML = visited
          ? `<span class="visit-badge done"><i class="ti ti-circle-check"></i> Visited</span>
             <button class="btn btn-sm btn-ghost" onclick="NeedVisitView.markVisit(${storeId}, false)">Undo</button>`
          : `<button class="btn btn-sm btn-brand" onclick="NeedVisitView.markVisit(${storeId}, true)">
               <i class="ti ti-map-pin"></i> Mark Visited
             </button>`;
        item.querySelector('.visit-dot').className = `visit-dot ${visited ? 'done' : 'pending'}`;
      }

      UI.toast(visited ? `✓ Visit logged for ${store.branch}` : 'Visit unmarked', visited ? 'ok' : 'info');
    } catch(e) {
      store.visitStatus = visited ? 'pending' : 'visited';
      UI.toast('Failed: ' + e.message, 'err');
    }
  }
};
