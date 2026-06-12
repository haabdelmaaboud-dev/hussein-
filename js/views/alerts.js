const AlertsView = {
  render() {
    const stores  = STATE.myStores();
    const critical = stores.filter(s => STATE.healthLabel(s)==='critical');
    const uncheck  = stores.filter(s => !STATE.isCheckedToday(s.id));
    const alerts   = [
      ...critical.map(s => ({ type:'critical', icon:'ti-alert-circle', color:'danger',
        msg: `${s.branch} is critical — ${STATE.devList().filter(d=>!s[d]).join(', ')} offline`, store:s })),
      ...(uncheck.length > 5 ? [{ type:'warn', icon:'ti-clock', color:'warning',
        msg: `${uncheck.length} stores haven't been checked today` }] : [])
    ];
    return `<div class="view-header"><h2 class="view-title"><i class="ti ti-bell"></i> Alerts</h2>
      <span class="badge-danger">${alerts.length} active</span></div>
      ${alerts.length
        ? `<div class="alerts-list">${alerts.map(a=>`
            <div class="alert-item ${a.color}">
              <i class="ti ${a.icon}"></i>
              <span>${a.msg}</span>
              ${a.store ? `<button class="btn btn-sm btn-ghost" onclick="MODALS.openEdit(${a.store.id})" style="margin-left:auto">Fix</button>` : ''}
            </div>`).join('')}</div>`
        : '<div class="empty-state"><i class="ti ti-bell-off"></i><p>No active alerts</p></div>'}`;
  }
};
