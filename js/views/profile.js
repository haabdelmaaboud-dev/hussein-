const ProfileView = {
  render() {
    const u = STATE.currentUser;
    return `
      <div class="view-header"><h2 class="view-title"><i class="ti ti-user"></i> My Profile</h2></div>
      <div class="profile-grid">
        <div class="profile-card">
          <div class="profile-avatar">${UI.initials(u.name||u.username)}</div>
          <div class="profile-name">${u.name||u.username}</div>
          <div class="profile-user">@${u.username}</div>
          <span class="role-chip ${UI.roleCls(u.role)}" style="margin-top:8px">${UI.roleLabel(u.role)}</span>
          ${u.ref ? `<div style="font-size:12px;color:var(--text-ter);margin-top:8px">Area: ${u.ref}</div>` : ''}
        </div>
        <div class="profile-form">
          <div class="profile-section-title"><i class="ti ti-key"></i> Change Password</div>
          <div class="form-group"><label class="form-label">Current Password</label>
            <input class="form-input" type="password" id="pw-old" placeholder="Enter current password"></div>
          <div class="form-group"><label class="form-label">New Password</label>
            <input class="form-input" type="password" id="pw-new" placeholder="Minimum 6 characters"></div>
          <div class="form-group"><label class="form-label">Confirm New Password</label>
            <input class="form-input" type="password" id="pw-confirm" placeholder="Repeat new password"></div>
          <div id="pw-err" class="error-msg hidden"></div>
          <button class="btn btn-brand" onclick="ProfileView.changePassword()">
            <i class="ti ti-check"></i> Update Password
          </button>
        </div>
      </div>`;
  },

  async changePassword() {
    const u    = STATE.currentUser;
    const old  = document.getElementById('pw-old')?.value;
    const nw   = document.getElementById('pw-new')?.value;
    const conf = document.getElementById('pw-confirm')?.value;
    const errEl = document.getElementById('pw-err');
    const show  = (msg) => { if(errEl){errEl.textContent=msg;errEl.classList.remove('hidden');} };

    if (!old || !nw || !conf)    { show('All fields are required'); return; }
    if (nw !== conf)              { show('Passwords do not match'); return; }
    if (nw.length < 6)            { show('Minimum 6 characters'); return; }
    if (errEl) errEl.classList.add('hidden');

    try {
      await API.changePassword(u.id, old, nw);
      u.password = nw;
      localStorage.setItem('shawarmer_user', JSON.stringify(u));
      UI.toast('Password updated', 'ok');
      ['pw-old','pw-new','pw-confirm'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    } catch(e) { show(e.message); }
  }
};
