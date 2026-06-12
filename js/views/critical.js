const CriticalView = {
  render() {
    const stores  = STATE.myStores().filter(s => STATE.healthLabel(s) === 'critical' || STATE.hasIssue(s));
    const devs    = STATE.devList();
    stores.sort((a,b) => STATE.pct(a) - STATE.pct(b));
    return `
      <div class="view-header">
        <h2 class="view-title"><i class="ti ti-alert-triangle"></i> Critical Stores</h2>
        <span class="badge-danger">${stores.length} stores need attention</span>
      </div>
      ${stores.length ? `<div class="critical-list">${stores.map(s => `
        <div class="critical-card" onclick="MODALS.openEdit(${s.id})">
          <div class="crit-indicator"></div>
          <div class="crit-body">
            <div class="crit-name">${s.branch}</div>
            <div class="crit-meta">${s.eng} · ${s.area}</div>
            <div class="crit-devices">${devs.map(d=>`<span class="dev-status ${s[d]?'ok':'issue'}">${d}: ${s[d]?'✓':'✗'}</span>`).join('')}</div>
            ${s.notes ? `<div class="crit-note">${s.notes}</div>` : ''}
          </div>
          <div class="crit-right">
            <span class="score-pill sp-low">${STATE.pct(s)}%</span>
            <div class="crit-time">${s.lastCheckAt ? new Date(s.lastCheckAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : 'Not checked'}</div>
            <i class="ti ti-chevron-right"></i>
          </div>
        </div>`).join('')}</div>`
      : `<div class="empty-state"><i class="ti ti-circle-check" style="color:var(--success)"></i><p style="color:var(--success)">All stores are operational!</p></div>`}`;
  }
};
