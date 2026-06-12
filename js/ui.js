/* =====================================================
   ui.js — Fixed: added devChip(), scorePill(), missing helpers
   ===================================================== */
const UI = {

  setSync(state, label) {
    const dot = document.getElementById('syncDot');
    const lbl = document.getElementById('syncLabel');
    if (!dot) return;
    dot.className = 'sync-dot' + (state==='busy'?' busy':state==='offline'?' offline':'');
    if (lbl) lbl.textContent = label||(state==='live'?'Live':state==='busy'?'Syncing…':'Offline');
  },

  setLoader(pct, msg) {
    const f = document.getElementById('loaderFill');
    const m = document.getElementById('loaderMsg');
    if (f) f.style.width = pct + '%';
    if (m) m.textContent = msg;
  },

  showContentLoader(show) {
    const el = document.getElementById('contentLoader');
    if (el) el.classList.toggle('hidden', !show);
  },

  toast(msg, type = 'info', duration = 4000) {
    const stack = document.getElementById('toastStack');
    if (!stack) return;
    const icons = { ok:'ti-circle-check', err:'ti-alert-circle', info:'ti-info-circle', warn:'ti-alert-triangle' };
    const cls   = { ok:'toast-ok', err:'toast-err', info:'toast-info', warn:'toast-warn' };
    const el    = document.createElement('div');
    el.className = `toast-item ${cls[type]||'toast-info'}`;
    el.innerHTML = `<i class="ti ${icons[type]||'ti-info-circle'}"></i><span>${msg}</span>
      <button onclick="this.parentElement.remove()"><i class="ti ti-x"></i></button>`;
    stack.appendChild(el);
    setTimeout(() => { el.classList.add('fade-out'); setTimeout(() => el.remove(), 300); }, duration);
  },

  openModal(title, body, footer) {
    document.getElementById('modalTitle').textContent  = title;
    document.getElementById('modalBody').innerHTML     = body;
    document.getElementById('modalFooter').innerHTML   = footer || '';
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.body.style.overflow = '';
    STATE.editId = null;
  },

  confirm(msg, onConfirm, danger = true) {
    UI.openModal('Confirm Action',
      `<div class="confirm-msg">
        <i class="ti ti-alert-triangle" style="color:var(--warning);font-size:36px"></i>
        <p>${msg}</p>
      </div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn ${danger?'btn-danger':'btn-brand'}" onclick="(${onConfirm.toString()})();UI.closeModal()">Confirm</button>`
    );
  },

  initials(name) {
    return (name||'').split(' ').map(w => w[0]||'').join('').substring(0,2).toUpperCase();
  },

  greeting(name) {
    const h = new Date().getHours();
    const g = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
    return name ? `${g}, ${name.split(' ')[0]}` : g;
  },

  roleLabel(r) { return {admin:'Admin',engineer:'Engineer',area:'Area Manager',ops:'Ops Manager'}[r]||r; },
  roleCls(r)   { return {admin:'rc-admin',engineer:'rc-eng',area:'rc-area',ops:'rc-ops'}[r]||''; },

  // ── Device chip ──────────────────────────────────────
  devChip(val) {
    return `<span class="dev-status ${val?'ok':'issue'}"><i class="ti ${val?'ti-check':'ti-x'}"></i></span>`;
  },

  // ── Score pill ───────────────────────────────────────
  scorePill(store) {
    const h = STATE.healthLabel(store);
    return `<span class="score-pill ${h}">${STATE.pct(store)}%</span>`;
  },

  kpiCard({ icon, iconClass, label, value, sub, trend, trendDir }) {
    const trendHtml = trend ? `<span class="kpi-trend ${trendDir}">${trend}</span>` : '';
    return `<div class="kpi-card">
      <div class="kpi-header">
        <div class="kpi-icon-wrap ${iconClass}"><i class="ti ${icon}"></i></div>
        ${trendHtml}
      </div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-label">${label}</div>
      ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
    </div>`;
  },

  progressRing(pct, size = 140) {
    const r    = (size - 16) / 2;
    const circ = 2 * Math.PI * r;
    const off  = circ - (pct / 100) * circ;
    return `<div class="progress-ring-wrap">
      <svg class="progress-ring-svg" width="${size}" height="${size}">
        <circle class="progress-ring-bg"   cx="${size/2}" cy="${size/2}" r="${r}"/>
        <circle class="progress-ring-fill" cx="${size/2}" cy="${size/2}" r="${r}"
          stroke-dasharray="${circ}" stroke-dashoffset="${off}"/>
      </svg>
      <div class="progress-ring-text">
        <div class="progress-ring-pct">${pct}%</div>
        <div class="progress-ring-label">Completed Today</div>
      </div>
    </div>`;
  },

  heatGrid(stores) {
    const cells = stores.map(s => {
      const h = STATE.healthLabel(s);
      return `<div class="heat-cell ${h}" title="${s.branch} — ${STATE.pct(s)}%" onclick="MODALS.openEdit(${s.id})"></div>`;
    }).join('');
    return `<div class="heat-grid">${cells}</div>
      <div class="heat-legend">
        <div class="heat-legend-item"><div class="heat-legend-dot" style="background:var(--success)"></div>Healthy (${stores.filter(s=>STATE.healthLabel(s)==='healthy').length})</div>
        <div class="heat-legend-item"><div class="heat-legend-dot" style="background:var(--warning)"></div>Warning (${stores.filter(s=>STATE.healthLabel(s)==='warning').length})</div>
        <div class="heat-legend-item"><div class="heat-legend-dot" style="background:var(--danger)"></div>Critical (${stores.filter(s=>STATE.healthLabel(s)==='critical').length})</div>
        <div class="heat-legend-item"><div class="heat-legend-dot" style="background:var(--border)"></div>Not Checked (${stores.filter(s=>!STATE.isCheckedToday(s.id)).length})</div>
      </div>`;
  },

  activityItem(act) {
    const time  = act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—';
    const typeMap = {
      check:         { icon:'ti-circle-check', cls:'success', label:'Completed' },
      issue:         { icon:'ti-alert-triangle', cls:'warning', label:'Warning' },
      critical:      { icon:'ti-alert-circle', cls:'danger', label:'Critical' },
      communication: { icon:'ti-message-circle', cls:'info', label:'Sent' },
      default:       { icon:'ti-check', cls:'success', label:'Done' }
    };
    const t = typeMap[act.type] || typeMap.default;
    return `<div class="activity-item">
      <div class="activity-time">${time}</div>
      <div class="activity-icon-wrap ${t.cls}"><i class="ti ${t.icon}"></i></div>
      <div class="activity-content">
        <div class="activity-text">${act.details || act.type || 'Action performed'}</div>
      </div>
      <span class="activity-status ${t.cls}">${t.label}</span>
    </div>`;
  },

  criticalItem(store) {
    const issues = STATE.devList().filter(d => !store[d]);
    const time   = store.lastCheckAt ? new Date(store.lastCheckAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—';
    return `<div class="critical-item" onclick="MODALS.openEdit(${store.id})">
      <div class="critical-indicator"></div>
      <div class="critical-info">
        <div class="critical-name">${store.branch}</div>
        <div class="critical-meta">${store.area||'—'}</div>
      </div>
      <div class="critical-issues"><i class="ti ti-alert-circle"></i> ${issues.length} Issue${issues.length!==1?'s':''}</div>
      <div class="critical-time">${time}</div>
      <i class="ti ti-chevron-right critical-arrow"></i>
    </div>`;
  },

  deviceToggle(device, checked, idPrefix) {
    const id = `${idPrefix}-${device}`;
    const iconMap = { DMB:'ti-device-tv', Kitchen:'ti-tools-kitchen', POS:'ti-cash-register', Kiosk:'ti-device-tablet', Tablet:'ti-device-mobile' };
    return `<div class="toggle-item ${checked?'active':''}" id="ti-${id}">
      <div class="toggle-label"><i class="ti ${iconMap[device]||'ti-device-laptop'}"></i>${device}</div>
      <label class="toggle-sw">
        <input type="checkbox" id="${id}" ${checked?'checked':''} onchange="UI.refreshDeviceToggle('${id}')">
        <span class="tog-track"></span>
      </label>
    </div>`;
  },

  refreshDeviceToggle(id) {
    const chk  = document.getElementById(id)?.checked;
    const item = document.getElementById('ti-' + id);
    if (item) item.classList.toggle('active', chk);
  },

  branchRow(store) {
    const devs   = STATE.devList();
    const health = STATE.healthLabel(store);
    const checked = STATE.isCheckedToday(store.id);
    return `<div class="branch-row ${checked?'checked':''}">
      <div class="branch-avatar">${UI.initials(store.branch)}</div>
      <div class="branch-info">
        <div class="branch-name">${store.branch}</div>
        <div class="branch-meta">${store.eng||'—'} · ${store.area||'—'}</div>
      </div>
      <div class="branch-devices">
        ${devs.map(d=>`<span class="dev-status ${store[d]?'ok':'issue'}" title="${d}">
          <i class="ti ${store[d]?'ti-check':'ti-x'}"></i> ${d}
        </span>`).join('')}
      </div>
      <div class="branch-actions">
        <span class="score-pill ${health}">${STATE.pct(store)}%</span>
        <button class="btn btn-sm btn-ghost" onclick="COMM.openStoreCommunication(${store.id})" title="Contact">
          <i class="ti ti-message-circle"></i>
        </button>
        ${STATE.canEdit(store)
          ? `<button class="btn btn-sm btn-secondary" onclick="MODALS.openEdit(${store.id})"><i class="ti ti-edit"></i></button>`
          : `<button class="btn btn-sm btn-ghost" onclick="MODALS.openView(${store.id})"><i class="ti ti-eye"></i></button>`}
      </div>
    </div>`;
  },

  table(headers, rows, emptyMsg = 'No data available') {
    if (!rows || !rows.length) return `<div class="empty-state"><i class="ti ti-inbox"></i><p>${emptyMsg}</p></div>`;
    return `<div class="table-wrap"><table>
      <thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table></div>`;
  },

  formGroup(label, inputHTML) {
    return `<div class="form-group"><label class="form-label">${label}</label>${inputHTML}</div>`;
  },
  formInput(id, type='text', placeholder='', value='') {
    return `<input class="form-input" type="${type}" id="${id}" placeholder="${placeholder}" value="${value||''}">`;
  },
  formSelect(id, options, selected='') {
    return `<select class="form-input" id="${id}">${options.map(o=>
      typeof o==='string'
        ? `<option ${o===selected?'selected':''}>${o}</option>`
        : `<option value="${o.v}" ${o.v===selected?'selected':''}>${o.l}</option>`
    ).join('')}</select>`;
  },
  formTextarea(id, placeholder='', value='') {
    return `<textarea class="form-input form-textarea" id="${id}" placeholder="${placeholder}">${value||''}</textarea>`;
  },

  sparkline(data, color='var(--brand)', width=80, height=30) {
    if (!data || !data.length) return '';
    const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max - min || 1;
    const pts = data.map((v,i)=>`${(i/(data.length-1))*width},${height-((v-min)/range)*height}`).join(' ');
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <polyline fill="none" stroke="${color}" stroke-width="2" points="${pts}" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
};

function closeModal()          { UI.closeModal(); }
function handleOverlayClick(e) { if (e.target===document.getElementById('modalOverlay')) UI.closeModal(); }
