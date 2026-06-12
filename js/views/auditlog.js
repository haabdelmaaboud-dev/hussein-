const AuditView = {
  async render() {
    const area = document.getElementById('contentArea');
    if (area) area.innerHTML = `
      <div class="view-header"><h2 class="view-title"><i class="ti ti-history"></i> Audit Log</h2>
        <button class="btn btn-secondary btn-sm" onclick="AuditView.render()"><i class="ti ti-refresh"></i> Refresh</button>
      </div>
      <div class="loading-block"><div class="spinner"></div><p>Loading audit log…</p></div>`;
    try {
      const res = await API.getAuditLog({});
      const log = res.data || res || [];
      const rows = log.length
        ? log.map(entry => `<tr>
            <td style="font-size:11px;white-space:nowrap">${entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}</td>
            <td><span class="audit-badge ${entry.type}">${entry.type||'—'}</span></td>
            <td style="font-weight:600">${entry.user||'—'}</td>
            <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${entry.detail||''}">${entry.detail||'—'}</td>
            <td style="color:var(--text-ter)">${entry.storeId||'—'}</td>
          </tr>`).join('')
        : '<tr><td colspan="5" class="empty-td"><div class="empty-state"><i class="ti ti-history"></i><p>No records yet</p></div></td></tr>';
      if (area) area.innerHTML = `
        <div class="view-header"><h2 class="view-title"><i class="ti ti-history"></i> Audit Log</h2>
          <button class="btn btn-secondary btn-sm" onclick="AuditView.render()"><i class="ti ti-refresh"></i> Refresh</button>
        </div>
        <div class="table-card"><div class="table-scroll">
          <table><thead><tr>
            <th style="width:150px">Date & Time</th><th style="width:160px">Action</th>
            <th style="width:120px">User</th><th>Details</th><th style="width:80px">Store</th>
          </tr></thead><tbody>${rows}</tbody></table>
        </div></div>`;
    } catch(e) {
      if (area) area.innerHTML += `<div class="error-msg">Failed: ${e.message}</div>`;
    }
  }
};
