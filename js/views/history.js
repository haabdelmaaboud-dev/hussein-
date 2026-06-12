const HistoryView = {
  async renderForStore(storeId, branchName) {
    UI.openModal(`History — ${branchName}`,
      `<div class="loading-block"><div class="spinner"></div><p>Loading history…</p></div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>`
    );
    try {
      const res = await API.getStoreHistory(storeId);
      const history = res.data || res || [];
      const rows = history.length
        ? history.map(h => `<div class="history-item">
            <div class="history-time">${h.timestamp ? new Date(h.timestamp).toLocaleString() : '—'}</div>
            <div class="history-user"><i class="ti ti-user"></i> ${h.changedBy||'—'}</div>
            <div class="history-devices">${(h.deviceSnapshot||'').split(',').map((s,i)=>{
              const devs=['DMB','Kitchen','POS','Kiosk','Tablet'];
              const ok=s.trim()==='OK';
              return `<span class="dev-status ${ok?'ok':'issue'}">${devs[i]||i}: ${s.trim()}</span>`;
            }).join('')}</div>
            ${h.notes ? `<div class="history-note">${h.notes}</div>` : ''}
          </div>`).join('')
        : '<div class="empty-state" style="padding:1rem"><i class="ti ti-history"></i><p>No history yet</p></div>';
      document.getElementById('modalBody').innerHTML = `<div class="history-list">${rows}</div>`;
    } catch(e) {
      document.getElementById('modalBody').innerHTML = `<div class="error-msg">Failed: ${e.message}</div>`;
    }
  }
};
