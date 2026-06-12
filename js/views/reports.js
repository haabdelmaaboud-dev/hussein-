/* =====================================================
   views/reports.js — Fixed PDF syntax error (#12)
   ===================================================== */
const ReportsView = {
  render() {
    const base = STATE.myStores();
    const devs = STATE.devList();
    const iss  = base.filter(s => STATE.hasIssue(s)).length;
    const tot  = base.length;

    return `
      <div class="view-header">
        <h2 class="view-title"><i class="ti ti-file-report"></i> Reports</h2>
      </div>
      <div class="reports-grid">
        <div class="report-card">
          <div class="report-icon ri-burg"><i class="ti ti-file-spreadsheet"></i></div>
          <div class="report-title">Full Summary Report</div>
          <div class="report-desc">All branches with device status, health scores and notes.</div>
          <div class="report-filters">
            ${UI.formGroup('Filter by engineer',
              `<select class="form-input" id="rep-eng">
                <option value="">All engineers</option>
                ${(STATE.db.lists.engineers||[]).map(e=>`<option>${e}</option>`).join('')}
              </select>`)}
            ${UI.formGroup('Filter by area',
              `<select class="form-input" id="rep-area">
                <option value="">All areas</option>
                ${(STATE.db.lists.areas||[]).map(a=>`<option>${a}</option>`).join('')}
              </select>`)}
            ${UI.formGroup('Show only',
              `<select class="form-input" id="rep-view">
                <option value="all">All branches</option>
                <option value="issues">Issues only</option>
                <option value="ok">Fully OK only</option>
              </select>`)}
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-brand" onclick="ReportsView.exportExcel()">
              <i class="ti ti-file-spreadsheet"></i> Export Excel
            </button>
            <button class="btn btn-secondary" onclick="ReportsView.exportPDF()">
              <i class="ti ti-file-type-pdf"></i> Export PDF
            </button>
          </div>
        </div>

        <div class="report-card">
          <div class="report-icon ri-red"><i class="ti ti-alert-triangle"></i></div>
          <div class="report-title">Issues Report</div>
          <div class="report-desc">Branches with device problems, status and resolution notes.</div>
          <div class="report-stats">
            <div class="rstat"><span class="rstat-v">${iss}</span><span class="rstat-l">Open issues</span></div>
            <div class="rstat"><span class="rstat-v">${tot}</span><span class="rstat-l">Total branches</span></div>
            <div class="rstat"><span class="rstat-v">${tot ? Math.round(iss/tot*100) : 0}%</span><span class="rstat-l">Issue rate</span></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-brand" onclick="ReportsView.exportIssuesExcel()">
              <i class="ti ti-file-spreadsheet"></i> Issues Excel
            </button>
            <button class="btn btn-secondary" onclick="ReportsView.exportIssuesPDF()">
              <i class="ti ti-file-type-pdf"></i> Issues PDF
            </button>
          </div>
        </div>
      </div>

      <div class="table-card">
        <div class="table-card-hdr">
          <h3><i class="ti ti-eye"></i> Preview</h3>
          <span class="muted" style="font-size:12px">${tot} branches · ${iss} with issues</span>
        </div>
        <div class="table-scroll">
          <table>
            <thead><tr>
              <th style="width:180px">Branch</th>
              <th>Engineer</th>
              <th>Area</th>
              ${devs.map(d=>`<th style="text-align:center;width:50px">${d}</th>`).join('')}
              <th style="text-align:center;width:60px">Score</th>
              <th>Notes</th>
            </tr></thead>
            <tbody>
              ${base.slice(0,15).map(s => `<tr class="${STATE.hasIssue(s)?'row-issue':''}">
                <td class="branch-cell">${s.branch}</td>
                <td class="muted">${s.eng||'—'}</td>
                <td class="muted">${s.area||'—'}</td>
                ${devs.map(d=>`<td style="text-align:center">${UI.devChip(s[d])}</td>`).join('')}
                <td style="text-align:center">${UI.scorePill(s)}</td>
                <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-sec)">${s.notes||'—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          ${tot > 15 ? `<div style="padding:10px 14px;font-size:12px;color:var(--text-ter)">Showing 15 of ${tot} — export to see all</div>` : ''}
        </div>
      </div>`;
  },

  getFiltered() {
    const eng  = document.getElementById('rep-eng')?.value  || '';
    const area = document.getElementById('rep-area')?.value || '';
    const view = document.getElementById('rep-view')?.value || 'all';
    return STATE.myStores().filter(s => {
      if (eng  && s.eng  !== eng)  return false;
      if (area && s.area !== area) return false;
      if (view === 'issues' && !STATE.hasIssue(s)) return false;
      if (view === 'ok'     &&  STATE.hasIssue(s)) return false;
      return true;
    });
  },

  exportExcel() {
    const stores = ReportsView.getFiltered();
    const devs   = STATE.devList();
    const headers = ['ID','Engineer','Branch','Ops Manager','Area Manager',...devs,'Score %','Health','Issue Status','Notes'];
    const rows = stores.map(s => [
      s.id, s.eng, s.branch, s.ops, s.area,
      ...devs.map(d => s[d] ? 'OK' : 'Issue'),
      STATE.pct(s) + '%',
      STATE.healthLabel(s),
      s.issueStatus || 'open',
      s.notes || ''
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))
      .join('\n');
    ReportsView._download('Shawarmer_IT_Report.csv', '\uFEFF' + csv, 'text/csv');
    UI.toast('Excel (CSV) exported', 'ok');
  },

  exportIssuesExcel() {
    const devs   = STATE.devList();
    const stores = STATE.myStores().filter(s => STATE.hasIssue(s));
    const headers = ['ID','Engineer','Branch','Area',...devs,'Score %','Health','Notes'];
    const rows = stores.map(s => [
      s.id, s.eng, s.branch, s.area,
      ...devs.map(d => s[d] ? 'OK' : '⚠ Issue'),
      STATE.pct(s) + '%',
      STATE.healthLabel(s),
      s.notes || ''
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))
      .join('\n');
    ReportsView._download('Shawarmer_Issues_Report.csv', '\uFEFF' + csv, 'text/csv');
    UI.toast('Issues Excel exported', 'ok');
  },

  exportPDF() {
    const stores = ReportsView.getFiltered();
    const devs   = STATE.devList();
    const date   = new Date().toLocaleDateString();
    const ok     = stores.filter(s => !STATE.hasIssue(s)).length;

    // Fix #12: no double << syntax — clean template
    const devHeaders = devs.map(d => `<th>${d}</th>`).join('');
    const scoreHeader = `<th>Score</th><th>Notes</th>`;

    const bodyRows = stores.map(s => {
      const devCells = devs.map(d =>
        `<td class="${s[d]?'ok':'bad'}">${s[d]?'✓':'✗'}</td>`
      ).join('');
      const scorePct = STATE.pct(s);
      return `<tr>
        <td><b>${s.branch}</b></td>
        <td>${s.eng}</td>
        <td>${s.area}</td>
        ${devCells}
        <td><span class="${scorePct===100?'score-ok':scorePct>=80?'score-warn':'score-bad'}">${scorePct}%</span></td>
        <td>${s.notes||''}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Shawarmer IT Report</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:20px}
      h1{font-size:16px;color:#6E0F1F;margin-bottom:4px}
      .meta{color:#6b7280;font-size:11px;margin-bottom:16px}
      .kpi-row{display:flex;gap:12px;margin-bottom:16px}
      .kpi{padding:8px 14px;border:1px solid #e5e7eb;border-radius:6px;text-align:center}
      .kpi-v{font-size:22px;font-weight:700;color:#6E0F1F;display:block}
      .kpi-l{font-size:10px;color:#6b7280}
      table{width:100%;border-collapse:collapse;font-size:10px}
      th{background:#f9fafb;padding:6px 8px;text-align:left;border:1px solid #e5e7eb;font-weight:700}
      td{padding:5px 8px;border:1px solid #e5e7eb;vertical-align:middle}
      tr:nth-child(even){background:#fafafa}
      .ok{color:#166534;font-weight:700}.bad{color:#991b1b;font-weight:700}
      .score-ok{background:#dcfce7;color:#166534;padding:1px 6px;border-radius:10px;font-weight:700}
      .score-warn{background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:10px;font-weight:700}
      .score-bad{background:#fee2e2;color:#991b1b;padding:1px 6px;border-radius:10px;font-weight:700}
    </style></head><body>
    <h1>Shawarmer IT Device Checklist Report</h1>
    <div class="meta">Generated: ${date} · ${stores.length} branches · ${ok} healthy · ${stores.length-ok} with issues</div>
    <div class="kpi-row">
      <div class="kpi"><span class="kpi-v">${stores.length}</span><span class="kpi-l">Total</span></div>
      <div class="kpi"><span class="kpi-v" style="color:#166534">${ok}</span><span class="kpi-l">Healthy</span></div>
      <div class="kpi"><span class="kpi-v" style="color:#991b1b">${stores.length-ok}</span><span class="kpi-l">Issues</span></div>
    </div>
    <table><thead><tr>
      <th>Branch</th><th>Engineer</th><th>Area</th>
      ${devHeaders}${scoreHeader}
    </tr></thead>
    <tbody>${bodyRows}</tbody></table>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
    UI.toast('PDF ready to print', 'ok');
  },

  exportIssuesPDF() {
    const stores = STATE.myStores().filter(s => STATE.hasIssue(s));
    const devs   = STATE.devList();
    const date   = new Date().toLocaleDateString();

    const devHeaders = devs.map(d => `<th>${d}</th>`).join('');
    const bodyRows = stores.map(s => {
      const devCells = devs.map(d =>
        `<td class="${s[d]?'ok':'bad'}">${s[d]?'✓':'✗'}</td>`
      ).join('');
      return `<tr>
        <td><b>${s.branch}</b></td><td>${s.eng}</td><td>${s.area}</td>
        ${devCells}
        <td class="bad">${STATE.pct(s)}%</td>
        <td>${s.issueStatus||'open'}</td>
        <td>${s.notes||''}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Shawarmer Issues Report</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:20px}
      h1{font-size:16px;color:#991b1b;margin-bottom:4px}
      .meta{color:#6b7280;font-size:11px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:10px}
      th{background:#fee2e2;padding:6px 8px;text-align:left;border:1px solid #fca5a5;font-weight:700;color:#991b1b}
      td{padding:5px 8px;border:1px solid #e5e7eb;vertical-align:middle}
      tr:nth-child(even){background:#fffbfb}
      .ok{color:#166534;font-weight:700}.bad{color:#991b1b;font-weight:700}
    </style></head><body>
    <h1>⚠️ Shawarmer IT Issues Report</h1>
    <div class="meta">Generated: ${date} · ${stores.length} branches with issues</div>
    <table><thead><tr>
      <th>Branch</th><th>Engineer</th><th>Area</th>
      ${devHeaders}<th>Score</th><th>Status</th><th>Notes</th>
    </tr></thead>
    <tbody>${bodyRows}</tbody></table>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  },

  _download(filename, content, type) {
    const blob = new Blob([content], { type: type + ';charset=utf-8' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
