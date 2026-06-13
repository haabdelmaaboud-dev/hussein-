/* =====================================================
   modals.js — Fixed: all modal dialogs working
   ===================================================== */
const MODALS = {

  openView(id) {
    const r = STATE.db.stores.find(x => String(x.id) === String(id));
    if (!r) { UI.toast('Store not found', 'err'); return; }
    const devs = STATE.devList();
    UI.openModal(r.branch,
      `<div class="store-info-block">
        <div class="sib-name">${r.branch}</div>
        <div class="sib-meta">Engineer: ${r.eng} · Area: ${r.area} · Ops: ${r.ops||'—'}</div>
      </div>
      <div class="section-div">Device Status</div>
      <div class="toggle-rows">
        ${devs.map(d => `<div class="toggle-row">
          <span class="toggle-lbl">${UI.devChip(r[d])} ${d}</span>
          <span class="score-pill ${r[d]?'sp-100':'sp-low'}">${r[d]?'Working':'Issue'}</span>
        </div>`).join('')}
      </div>
      ${r.notes ? `<div class="section-div">Notes</div><div class="notes-display">${r.notes}</div>` : ''}`,
      `<button class="btn btn-secondary" onclick="HistoryView.renderForStore(${r.id},'${r.branch.replace(/'/g,"\\'")}')">
        <i class="ti ti-history"></i> History
      </button>
      <button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>`
    );
  },

  openEdit(id) {
    const r = STATE.db.stores.find(x => String(x.id) === String(id));
    if (!r) { UI.toast('Store not found', 'err'); return; }
    if (!STATE.canEdit(r)) { MODALS.openView(id); return; }
    STATE.editId = id;
    const devs = STATE.devList();
    const statusOpts = ['open','in-progress','resolved','closed'].map(s =>
      `<option value="${s}" ${(r.issueStatus||'open')===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
    ).join('');

    UI.openModal('Edit Store',
      `<div class="store-info-block">
        <div class="sib-name">${r.branch}</div>
        <div class="sib-meta">Engineer: ${r.eng} · Area: ${r.area}</div>
      </div>
      <div class="section-div">Device Status — tap to toggle</div>
      <div class="toggle-rows">
        ${devs.map(d => UI.deviceToggle(d, !!r[d], 'ed')).join('')}
      </div>
      ${UI.formGroup('Issue Status',
        `<select class="form-input" id="ed-status">
          <option value="">— No issue status —</option>${statusOpts}
        </select>`)}
      ${UI.formGroup('Notes / Issues', UI.formTextarea('ed-notes', 'Describe any issues…', r.notes||''))}
      <div style="display:flex;gap:6px;margin-top:4px">
        <button class="btn btn-sm btn-ghost" onclick="HistoryView.renderForStore(${r.id},'${r.branch.replace(/'/g,"\\'")}')">
          <i class="ti ti-history"></i> History
        </button>
        <button class="btn btn-sm btn-ghost" onclick="COMM.openStoreCommunication(${r.id})">
          <i class="ti ti-message-circle"></i> Contact
        </button>
      </div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-brand" id="saveEditBtn" onclick="MODALS.saveEdit()">
         <i class="ti ti-check"></i> Save to Google Sheets
       </button>`
    );
  },

  async saveEdit() {
    const r = STATE.db.stores.find(x => String(x.id) === String(STATE.editId));
    if (!r) return;
    const btn  = document.getElementById('saveEditBtn');
    const devs = STATE.devList();
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin .6s linear infinite"></i> Saving…'; }

    const upd = {
      id: r.id, branch: r.branch, eng: r.eng, ops: r.ops||'', area: r.area,
      issueStatus: document.getElementById('ed-status')?.value || '',
      notes: document.getElementById('ed-notes')?.value || '',
      // ✅ Always preserve contact fields — never send empty to overwrite
      branchManagerName:  r.branchManagerName  || '',
      branchManagerPhone: r.branchManagerPhone || '',
      supervisorName:     r.supervisorName     || '',
      supervisorPhone:    r.supervisorPhone    || '',
      areaManagerName:    r.areaManagerName    || '',
      areaManagerPhone:   r.areaManagerPhone   || '',
      extraContacts:      r.extraContacts      || '',
      visitStatus:        r.visitStatus        || '',
    };
    devs.forEach(d => { upd[d] = document.getElementById(`ed-${d}`)?.checked ? 1 : 0; });

    try {
      await API.updateStore(upd);
      const oldDevs = devs.reduce((acc, d) => ({ ...acc, [d]: r[d] }), {});
      Object.assign(r, upd);
      STATE.markChecked(r.id);
      NOTIF.checkIssues([{ ...r, ...oldDevs }], [r]);
      UI.closeModal();
      APP.refreshTab();
      UI.toast('Saved to Google Sheets', 'ok');
    } catch(e) {
      UI.toast('Save failed: ' + e.message, 'err');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Save to Google Sheets'; }
    }
  },

  openAddStore() {
    const devs = STATE.devList();
    const eO   = (STATE.db.lists.engineers||[]).map(e=>`<option>${e}</option>`).join('');
    const oO   = (STATE.db.lists.ops||[]).map(e=>`<option>${e}</option>`).join('');
    const aO   = (STATE.db.lists.areas||[]).map(e=>`<option>${e}</option>`).join('');

    UI.openModal('Add New Store',
      `${UI.formGroup('Branch Name', UI.formInput('ns-branch','text','e.g. 310-AlNakheel'))}
       <div class="form-grid">
         ${UI.formGroup('Engineer', `<select class="form-input" id="ns-eng">${eO}</select>`)}
         ${UI.formGroup('Ops Manager', `<select class="form-input" id="ns-ops">${oO}</select>`)}
       </div>
       ${UI.formGroup('Area Manager', `<select class="form-input" id="ns-area">${aO}</select>`)}
       <div class="section-div">Device Status</div>
       <div class="toggle-rows">
         ${devs.map(d => UI.deviceToggle(d, true, 'ns')).join('')}
       </div>
       ${UI.formGroup('Notes', UI.formTextarea('ns-notes','Any known issues…'))}`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-brand" id="addStoreBtn" onclick="MODALS.saveAddStore()">
         <i class="ti ti-plus"></i> Add Store
       </button>`
    );
  },

  async saveAddStore() {
    const branch = document.getElementById('ns-branch')?.value.trim();
    if (!branch) { UI.toast('Branch name is required', 'err'); return; }
    const btn  = document.getElementById('addStoreBtn');
    const devs = STATE.devList();
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin .6s linear infinite"></i> Adding…'; }

    const s = {
      branch,
      eng:        document.getElementById('ns-eng')?.value   || '',
      ops:        document.getElementById('ns-ops')?.value   || '',
      area:       document.getElementById('ns-area')?.value  || '',
      notes:      document.getElementById('ns-notes')?.value || '',
      visitStatus: '',
      issueStatus: 'open',
      branchManagerName:'', branchManagerPhone:'',
      supervisorName:'',    supervisorPhone:'',
      areaManagerName:'',   areaManagerPhone:'',
      extraContacts:''
    };
    devs.forEach(d => { s[d] = document.getElementById(`ns-${d}`)?.checked ? 1 : 0; });

    try {
      const res = await API.addStore(s);
      s.id = res.id || res.data?.id;
      STATE.db.stores.push(s);
      UI.closeModal();
      APP.showTab('stores');
      UI.toast('Store added', 'ok');
    } catch(e) {
      UI.toast('Failed: ' + e.message, 'err');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-plus"></i> Add Store'; }
    }
  },

  openAddUser() {
    const eO = (STATE.db.lists.engineers||[]).map(e=>`<option>${e}</option>`).join('');
    UI.openModal('Create User Account',
      `${UI.formGroup('Full Name', UI.formInput('nu-name','text','Full name'))}
       <div class="form-grid">
         ${UI.formGroup('Username', UI.formInput('nu-user','text','e.g. eng.ahmed'))}
         ${UI.formGroup('Password', UI.formInput('nu-pass','password','Min 6 chars'))}
       </div>
       ${UI.formGroup('Role',
         `<select class="form-input" id="nu-role" onchange="MODALS._updateRoleRef()">
           <option value="engineer">Engineer</option>
           <option value="area">Area Manager</option>
           <option value="ops">Ops Manager</option>
           <option value="admin">Admin</option>
         </select>`)}
       <div id="nu-ref-wrap">
         ${UI.formGroup('<span id="nu-ref-lbl">Link to engineer</span>',
           `<select class="form-input" id="nu-ref">${eO}</select>`)}
       </div>
       ${UI.formGroup('Status',
         `<select class="form-input" id="nu-status">
           <option value="active">Active</option>
           <option value="disabled">Disabled</option>
         </select>`)}`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-brand" id="addUserBtn" onclick="MODALS.saveAddUser()">
         <i class="ti ti-user-plus"></i> Create Account
       </button>`
    );
  },

  _updateRoleRef() {
    const role = document.getElementById('nu-role')?.value;
    const map  = { engineer: STATE.db.lists.engineers, area: STATE.db.lists.areas, ops: STATE.db.lists.ops, admin: [] };
    const lbl  = document.getElementById('nu-ref-lbl');
    const sel  = document.getElementById('nu-ref');
    const wrap = document.getElementById('nu-ref-wrap');
    if (lbl) lbl.innerHTML = role === 'admin' ? 'No link required' : `Link to ${UI.roleLabel(role)}`;
    if (sel) sel.innerHTML = (map[role]||[]).map(e => `<option>${e}</option>`).join('');
    if (wrap) wrap.style.opacity = role === 'admin' ? '0.4' : '1';
  },

  async saveAddUser() {
    const name     = document.getElementById('nu-name')?.value.trim();
    const username = document.getElementById('nu-user')?.value.trim();
    const password = document.getElementById('nu-pass')?.value;
    const role     = document.getElementById('nu-role')?.value;
    const ref      = document.getElementById('nu-ref')?.value || '';
    const status   = document.getElementById('nu-status')?.value || 'active';
    if (!name||!username||!password) { UI.toast('All fields required', 'err'); return; }
    if (STATE.db.users.find(u => u.username === username)) { UI.toast('Username already taken', 'err'); return; }
    const btn = document.getElementById('addUserBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin .6s linear infinite"></i> Creating…'; }
    try {
      const res = await API.addUser({ username, password, role, name, ref, status });
      STATE.db.users.push({ id: res.id||('u'+Date.now()), username, password, role, name, ref, status });
      UI.closeModal();
      APP.refreshTab();
      UI.toast('User account created', 'ok');
    } catch(e) {
      UI.toast('Failed: ' + e.message, 'err');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-user-plus"></i> Create Account'; }
    }
  },

  openEditUser(id) {
    const u = STATE.db.users.find(x => x.id === id);
    if (!u) return;
    UI.openModal('Edit User',
      `${UI.formGroup('Full Name', UI.formInput('eu-name','text','', u.name||u.username))}
       ${UI.formGroup('Role',
         `<select class="form-input" id="eu-role">
           ${['engineer','area','ops','admin'].map(r =>
             `<option value="${r}" ${u.role===r?'selected':''}>${UI.roleLabel(r)}</option>`).join('')}
         </select>`)}
       ${UI.formGroup('Status',
         `<select class="form-input" id="eu-status">
           <option value="active"   ${(u.status||'active')==='active'?'selected':''}>Active</option>
           <option value="disabled" ${u.status==='disabled'?'selected':''}>Disabled</option>
         </select>`)}`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-brand" id="euBtn" onclick="MODALS.saveEditUser('${id}')">
         <i class="ti ti-check"></i> Save Changes
       </button>`
    );
  },

  async saveEditUser(id) {
    const name   = document.getElementById('eu-name')?.value.trim();
    const role   = document.getElementById('eu-role')?.value;
    const status = document.getElementById('eu-status')?.value;
    const btn    = document.getElementById('euBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      await API.updateUser({ id, name, role, status });
      const u = STATE.db.users.find(x => x.id === id);
      if (u) Object.assign(u, { name, role, status });
      UI.closeModal();
      APP.refreshTab();
      UI.toast('User updated', 'ok');
    } catch(e) {
      UI.toast('Failed: ' + e.message, 'err');
      if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
    }
  },

  openResetPassword(id) {
    const u = STATE.db.users.find(x => x.id === id);
    if (!u) return;
    UI.openModal(`Reset Password — ${u.name||u.username}`,
      `<div class="store-info-block"><div class="sib-meta">Username: ${u.username} · ${UI.roleLabel(u.role)}</div></div>
       ${UI.formGroup('New Password', UI.formInput('rp-new','password','Min 6 characters'))}
       ${UI.formGroup('Confirm Password', UI.formInput('rp-conf','password','Repeat new password'))}
       <div id="rp-err" class="error-msg hidden"></div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-brand" id="rpBtn" onclick="MODALS.saveResetPassword('${id}')">
         <i class="ti ti-key"></i> Reset Password
       </button>`
    );
  },

  async saveResetPassword(id) {
    const nw   = document.getElementById('rp-new')?.value;
    const conf = document.getElementById('rp-conf')?.value;
    const errEl = document.getElementById('rp-err');
    const show  = m => { if(errEl){errEl.textContent=m;errEl.classList.remove('hidden');} };
    if (!nw||!conf) { show('Both fields required'); return; }
    if (nw !== conf) { show('Passwords do not match'); return; }
    if (nw.length < 6) { show('Minimum 6 characters'); return; }
    const btn = document.getElementById('rpBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      await API.changePassword(id, '', nw);
      const u = STATE.db.users.find(x => x.id === id);
      if (u) u.password = nw;
      UI.closeModal();
      UI.toast('Password reset', 'ok');
    } catch(e) {
      show(e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Reset Password'; }
    }
  },

  openIssueStatus(id) {
    const r = STATE.db.stores.find(x => String(x.id) === String(id));
    if (!r) return;
    STATE.editId = id;
    const statusOpts = ['open','in-progress','resolved','closed'].map(s =>
      `<option value="${s}" ${(r.issueStatus||'open')===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
    ).join('');
    UI.openModal('Update Issue Status',
      `<div class="store-info-block">
        <div class="sib-name">${r.branch}</div>
        <div class="sib-meta">Score: ${STATE.pct(r)}%</div>
      </div>
      ${UI.formGroup('Status', `<select class="form-input" id="is-status">${statusOpts}</select>`)}
      ${UI.formGroup('Resolution Notes', UI.formTextarea('is-notes','Describe what was done…', r.resolutionNotes||''))}`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-brand" id="isBtn" onclick="MODALS.saveIssueStatus()">
         <i class="ti ti-flag"></i> Update Status
       </button>`
    );
  },

  async saveIssueStatus() {
    const r      = STATE.db.stores.find(x => String(x.id) === String(STATE.editId));
    if (!r) return;
    const status = document.getElementById('is-status')?.value;
    const notes  = document.getElementById('is-notes')?.value || '';
    const btn    = document.getElementById('isBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      await API.updateIssue({ storeId: r.id, branch: r.branch, issueStatus: status, resolutionNotes: notes });
      r.issueStatus = status; r.resolutionNotes = notes;
      UI.closeModal(); APP.refreshTab();
      UI.toast(`Issue marked as ${status}`, 'ok');
    } catch(e) {
      UI.toast('Failed: ' + e.message, 'err');
      if (btn) { btn.disabled = false; btn.textContent = 'Update Status'; }
    }
  },

  openEditContacts(id) {
    const r = STATE.db.stores.find(x => String(x.id) === String(id));
    if (!r) { UI.toast('Store not found', 'err'); return; }
    STATE.editId = id;
    UI.openModal(`Contacts — ${r.branch}`,
      `<div class="store-info-block">
        <div class="sib-name">${r.branch}</div>
        <div class="sib-meta">${r.area||'—'} · ${r.eng||'—'}</div>
      </div>
      <div class="section-div"><i class="ti ti-user-circle"></i> Branch Manager</div>
      <div class="form-grid">
        ${UI.formGroup('Name',  UI.formInput('ec-bmName',  'text', 'Branch Manager name',  r.branchManagerName  || ''))}
        ${UI.formGroup('Phone', UI.formInput('ec-bmPhone', 'tel',  'e.g. 966501234567',    r.branchManagerPhone || ''))}
      </div>
      <div class="section-div"><i class="ti ti-user-check"></i> Supervisor</div>
      <div class="form-grid">
        ${UI.formGroup('Name',  UI.formInput('ec-supName',  'text', 'Supervisor name',   r.supervisorName  || ''))}
        ${UI.formGroup('Phone', UI.formInput('ec-supPhone', 'tel',  'e.g. 966501234567', r.supervisorPhone || ''))}
      </div>
      <div class="section-div"><i class="ti ti-user-star"></i> Area Manager</div>
      <div class="form-grid">
        ${UI.formGroup('Name',  UI.formInput('ec-amName',  'text', 'Area Manager name',  r.areaManagerName  || ''))}
        ${UI.formGroup('Phone', UI.formInput('ec-amPhone', 'tel',  'e.g. 966501234567',  r.areaManagerPhone || ''))}
      </div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-brand" id="ecBtn" onclick="MODALS.saveEditContacts()">
         <i class="ti ti-check"></i> Save Contacts
       </button>`
    );
  },

  async saveEditContacts() {
    const r = STATE.db.stores.find(x => String(x.id) === String(STATE.editId));
    if (!r) return;
    const btn = document.getElementById('ecBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin .6s linear infinite"></i> Saving…'; }

    const upd = {
      id: r.id, branch: r.branch, eng: r.eng, ops: r.ops||'', area: r.area,
      notes: r.notes||'', issueStatus: r.issueStatus||'',
      DMB: r.DMB, Kitchen: r.Kitchen, POS: r.POS, Kiosk: r.Kiosk, Tablet: r.Tablet,
      branchManagerName:  document.getElementById('ec-bmName')?.value.trim()  || '',
      branchManagerPhone: document.getElementById('ec-bmPhone')?.value.trim() || '',
      supervisorName:     document.getElementById('ec-supName')?.value.trim()  || '',
      supervisorPhone:    document.getElementById('ec-supPhone')?.value.trim() || '',
      areaManagerName:    document.getElementById('ec-amName')?.value.trim()  || '',
      areaManagerPhone:   document.getElementById('ec-amPhone')?.value.trim() || '',
      extraContacts: r.extraContacts || '',
    };

    try {
      await API.updateStore(upd);
      Object.assign(r, upd);
      UI.closeModal();
      // Refresh contacts grid if we are on contacts tab
      if (APP.currentTab === 'contacts') {
        ContactsView.updateGrid();
      }
      UI.toast('Contacts saved', 'ok');
    } catch(e) {
      UI.toast('Save failed: ' + e.message, 'err');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Save Contacts'; }
    }
  }

};
