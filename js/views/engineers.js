const EngineersView = {
  render() {
    const stores = STATE.myStores();
    const byEng  = {};
    stores.forEach(s => {
      if (!byEng[s.eng]) byEng[s.eng] = { name:s.eng, t:0, ok:0, critical:0, checked:0 };
      const d = byEng[s.eng];
      d.t++;
      if (!STATE.hasIssue(s)) d.ok++;
      if (STATE.healthLabel(s)==='critical') d.critical++;
      if (STATE.isCheckedToday(s.id)) d.checked++;
    });
    const rows = Object.values(byEng).map(d => {
      const pct = d.t ? Math.round(d.ok/d.t*100) : 0;
      return `<div class="eng-card">
        <div class="eng-card-avatar">${UI.initials(d.name)}</div>
        <div class="eng-card-info">
          <div class="eng-card-name">${d.name}</div>
          <div class="eng-card-meta">${d.t} stores · ${d.checked} checked today</div>
          <div class="eng-bar"><div class="eng-bar-fill ${pct<50?'crit':pct<80?'warn':''}" style="width:${pct}%"></div></div>
        </div>
        <div class="eng-card-stats">
          <span class="score-pill ${pct===100?'sp-100':pct>=80?'sp-80':'sp-low'}">${pct}%</span>
          ${d.critical>0 ? `<span class="badge-danger">${d.critical} critical</span>` : '<span class="badge-success">OK</span>'}
        </div>
      </div>`;
    });
    return `<div class="view-header"><h2 class="view-title"><i class="ti ti-users"></i> Engineers</h2></div>
      <div class="eng-list-full">${rows.length ? rows.join('') : '<div class="empty-state"><i class="ti ti-users"></i><p>No engineer data</p></div>'}</div>`;
  }
};
