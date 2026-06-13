/* =====================================================
   views/contacts.js — Contact Directory
   All branches with WhatsApp contact buttons
   Accessible to all roles
   ===================================================== */
const ContactsView = {
  q: '',

  render() {
    const stores = STATE.db.stores || [];
    const q = ContactsView.q.toLowerCase();
    const filtered = q
      ? stores.filter(s =>
          (s.branch || '').toLowerCase().includes(q) ||
          (s.area   || '').toLowerCase().includes(q) ||
          (s.eng    || '').toLowerCase().includes(q)
        )
      : stores;

    return `
      <div class="view-header">
        <h2 class="view-title"><i class="ti ti-address-book"></i> Contact Directory</h2>
        <span class="muted" style="font-size:13px;margin-top:4px">${filtered.length} of ${stores.length} branches</span>
      </div>

      <div class="filter-bar" style="margin-bottom:16px">
        <div class="search-box">
          <i class="ti ti-search"></i>
          <input class="filter-inp" type="text" id="contactSearchInput"
            placeholder="Search branch, area, engineer…"
            value="${ContactsView.q.replace(/"/g,'&quot;')}">
        </div>
      </div>

      ${filtered.length === 0
        ? `<div class="empty-state"><i class="ti ti-address-book-off"></i><p>No branches found</p></div>`
        : `<div class="contacts-grid" id="contactsGrid">${filtered.map(s => ContactsView.card(s)).join('')}</div>`
      }`;
  },

  bindSearch() {
    const input = document.getElementById('contactSearchInput');
    if (!input) return;
    input.addEventListener('input', (e) => {
      ContactsView.q = e.target.value;
      ContactsView.updateGrid();
    });
    input.focus();
  },

  updateGrid() {
    const stores = STATE.db.stores || [];
    const q = ContactsView.q.toLowerCase();
    const filtered = q
      ? stores.filter(s =>
          (s.branch || '').toLowerCase().includes(q) ||
          (s.area   || '').toLowerCase().includes(q) ||
          (s.eng    || '').toLowerCase().includes(q)
        )
      : stores;

    const grid = document.getElementById('contactsGrid');
    const area = document.getElementById('contentArea');

    // Update count
    const countEl = area?.querySelector('.muted');
    if (countEl) countEl.textContent = `${filtered.length} of ${stores.length} branches`;

    if (grid) {
      grid.innerHTML = filtered.length
        ? filtered.map(s => ContactsView.card(s)).join('')
        : `<div class="empty-state"><i class="ti ti-address-book-off"></i><p>No branches found</p></div>`;
    }
  },

  card(s) {
    const waBtn = (name, phone, label, icon) => {
      if (!phone) return `
        <div class="contact-person no-contact">
          <i class="ti ${icon}"></i>
          <div class="contact-info">
            <div class="contact-role">${label}</div>
            <div class="contact-name muted">—</div>
          </div>
          <button class="btn btn-sm btn-ghost" disabled title="No number">
            <i class="ti ti-brand-whatsapp"></i>
          </button>
        </div>`;

      const clean = String(phone).replace(/\D/g,'');
      const url   = `https://wa.me/${clean}`;
      return `
        <div class="contact-person">
          <i class="ti ${icon}"></i>
          <div class="contact-info">
            <div class="contact-role">${label}</div>
            <div class="contact-name">${name || phone}</div>
          </div>
          <a href="${url}" target="_blank" class="btn btn-sm btn-whatsapp" title="WhatsApp ${name||phone}">
            <i class="ti ti-brand-whatsapp"></i>
          </a>
        </div>`;
    };

    return `
      <div class="contact-card">
        <div class="contact-card-header">
          <div class="contact-branch-icon"><i class="ti ti-building-store"></i></div>
          <div class="contact-branch-info">
            <div class="contact-branch-name">${s.branch}</div>
            <div class="contact-branch-meta">${s.area || '—'} · ${s.eng || '—'}</div>
          </div>
          <button class="btn btn-sm btn-ghost contact-edit-btn" onclick="MODALS.openEditContacts(${s.id})" title="Edit contacts">
            <i class="ti ti-edit"></i>
          </button>
        </div>
        <div class="contact-persons">
          ${waBtn(s.branchManagerName, s.branchManagerPhone, 'Branch Manager', 'ti-user-circle')}
          ${waBtn(s.supervisorName,    s.supervisorPhone,    'Supervisor',      'ti-user-check')}
          ${waBtn(s.areaManagerName,   s.areaManagerPhone,   'Area Manager',    'ti-user-star')}
        </div>
      </div>`;
  }
};
