/* =====================================================
   views/admin.js — Fixed: AdminView.render() now exists
   ===================================================== */
const AdminView = {
  render() {
    const users = STATE.db.users;
    const listDefs = [
      { k:'engineers', icon:'ti-tool',          label:'Engineers'     },
      { k:'ops',       icon:'ti-briefcase',     label:'Ops Managers'  },
      { k:'areas',     icon:'ti-map-pin',       label:'Area Managers' },
      { k:'devices',   icon:'ti-device-laptop', label:'Devices'       }
    ];

    const userRows = users.map(u => `
      <div class="user-row ${u.status==='disabled'?'user-disabled':''}">
        <div class="user-av">${UI.initials(u.name||u.username)}</div>
        <div class="user-row-info">
          <div class="user-row-name">${u.name||u.username}
            ${u.status==='disabled' ? '<span class="badge-gray" style="font-size:10px">Disabled</span>' : ''}
          </div>
          <div class="user-row-sub">${u.username} · ${UI.roleLabel(u.role)}</div>
        </div>
        <span class="role-chip ${UI.roleCls(u.role)}">${UI.roleLabel(u.role)}</span>
        <div class="user-row-actions">
          <button class="btn btn-sm btn-ghost" onclick="MODALS.openEditUser('${u.id}')" title="Edit">
            <i class="ti ti-edit"></i>
          </button>
          <button class="btn btn-sm btn-ghost" onclick="MODALS.openResetPassword('${u.id}')" title="Reset password">
            <i class="ti ti-key"></i>
          </button>
          <button class="btn btn-sm btn-ghost" onclick="AdminActions.toggleUserStatus('${u.id}','${u.status||'active'}')"
            title="${u.status==='disabled'?'Enable':'Disable'}">
            <i class="ti ${u.status==='disabled'?'ti-player-play':'ti-player-pause'}"></i>
          </button>
          ${u.id !== 'u1' && u.id !== STATE.currentUser?.id
            ? `<button class="btn btn-sm btn-ghost" onclick="AdminActions.removeUser('${u.id}')" title="Delete" style="color:var(--danger)">
                <i class="ti ti-trash"></i>
              </button>` : ''}
        </div>
      </div>`).join('');

    const listCards = listDefs.map(ld => `
      <div class="admin-card">
        <div class="admin-card-title"><i class="ti ${ld.icon}"></i>${ld.label}</div>
        <div class="tag-cloud">
          ${(STATE.db.lists[ld.k]||[]).map(v => `
            <span class="tag">${v}
              <button class="tag-x" onclick="AdminActions.removeListItem('${ld.k}','${v.replace(/'/g,"\\'")}')">&#x2715;</button>
            </span>`).join('')}
        </div>
        <div class="add-row">
          <input class="form-input" type="text" id="ni-${ld.k}" placeholder="Add new…">
          <button class="btn btn-sm btn-brand" onclick="AdminActions.addListItem('${ld.k}','ni-${ld.k}')">
            <i class="ti ti-plus"></i>
          </button>
        </div>
      </div>`).join('');

    return `
      <div class="view-header">
        <h2 class="view-title"><i class="ti ti-settings"></i> Admin Panel</h2>
      </div>
      <div class="admin-section-card" style="margin-bottom:16px">
        <div class="admin-card-title" style="font-size:13px;font-weight:700;margin-bottom:12px">
          <i class="ti ti-users"></i> User Accounts
          <span class="muted" style="font-weight:400;margin-left:6px">${users.length} users</span>
        </div>
        <div class="user-list">${userRows || '<div class="empty-state" style="padding:1rem"><p>No users</p></div>'}</div>
        <button class="btn btn-brand btn-sm" style="margin-top:12px" onclick="MODALS.openAddUser()">
          <i class="ti ti-user-plus"></i> Add User Account
        </button>
      </div>
      <div class="admin-grid">${listCards}</div>`;
  }
};

// Admin action methods (separate from AdminView to avoid confusion)
const AdminActions = {
  async removeUser(id) {
    UI.confirm('Delete this user account permanently?', async () => {
      try {
        await API.removeUser(id);
        STATE.db.users = STATE.db.users.filter(u => u.id !== id);
        APP.refreshTab();
        UI.toast('User removed', 'ok');
      } catch(e) { UI.toast('Failed: ' + e.message, 'err'); }
    });
  },

  async toggleUserStatus(id, current) {
    const newStatus = current === 'disabled' ? 'active' : 'disabled';
    try {
      await API.updateUser({ id, status: newStatus });
      const u = STATE.db.users.find(x => x.id === id);
      if (u) u.status = newStatus;
      APP.refreshTab();
      UI.toast(`User ${newStatus}`, 'ok');
    } catch(e) { UI.toast('Failed: ' + e.message, 'err'); }
  },

  async addListItem(key, inputId) {
    const val = document.getElementById(inputId)?.value.trim();
    if (!val) return;
    if ((STATE.db.lists[key]||[]).includes(val)) { UI.toast('Already exists', 'err'); return; }
    try {
      await API.addListItem(key, val);
      if (!STATE.db.lists[key]) STATE.db.lists[key] = [];
      STATE.db.lists[key].push(val);
      APP.refreshTab();
      UI.toast('Added', 'ok');
    } catch(e) { UI.toast('Failed: ' + e.message, 'err'); }
  },

  async removeListItem(key, val) {
    try {
      await API.removeListItem(key, val);
      STATE.db.lists[key] = (STATE.db.lists[key]||[]).filter(x => x !== val);
      APP.refreshTab();
      UI.toast('Removed', 'info');
    } catch(e) { UI.toast('Failed: ' + e.message, 'err'); }
  }
};

// Keep ADMIN alias for backward compatibility
// const ADMIN = AdminActions;
