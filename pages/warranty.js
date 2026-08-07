// Warranty Tracking Page — tracks 1-year labour warranty on paid invoices
Pages.warranty = function() {
  const warranties = Warranty._getAll();
  const active = warranties.filter(w => w.status === 'active');
  const expiring = warranties.filter(w => w.status === 'expiring');
  const expired = warranties.filter(w => w.status === 'expired');
  const extended = warranties.filter(w => w.extended);

  return `
    <div class="page-header"><h2>Warranty Tracking</h2><p>1-year labour warranty on all completed jobs</p></div>

    ${expiring.length > 0 ? `
    <div class="alert-card alert-gold" style="margin-bottom:16px">
      <div>
        <strong style="color:var(--gold-dark)">⚠️ ${expiring.length} Warrant${expiring.length>1?'ies':'y'} Expiring Soon</strong>
        <span style="margin-left:12px;color:var(--text-muted);font-size:13px">${expiring.map(w => App.esc(w.customer) + ' — expires ' + App.formatDate(w.expiryDate)).join(', ')}</span>
      </div>
      <button class="btn btn-sm btn-primary" onclick="window.location.hash='warranty'">Review</button>
    </div>` : ''}

    <div class="grid grid-4" style="margin-bottom:16px">
      <div class="stat-card">
        <div><div class="stat-value">${active.length}</div><div class="stat-label">Active</div></div>
      </div>
      <div class="stat-card" style="--stat-bg:var(--warning-bg)">
        <div><div class="stat-value" style="color:var(--warning)">${expiring.length}</div><div class="stat-label">Expiring Soon</div></div>
      </div>
      <div class="stat-card" style="--stat-bg:var(--danger-bg)">
        <div><div class="stat-value" style="color:var(--danger)">${expired.length}</div><div class="stat-label">Expired</div></div>
      </div>
      <div class="stat-card" style="--stat-bg:var(--success-bg)">
        <div><div class="stat-value" style="color:var(--success)">${extended.length}</div><div class="stat-label">Extended</div></div>
      </div>
    </div>

    ${warranties.length === 0
      ? '<div class="card"><div class="empty-state"><div class="icon">🛡️</div><h3>No warranties to track</h3><p>Warranties are automatically created from paid invoices</p></div></div>'
      : `<div class="card">
        <div class="card-header"><h3>All Warranties</h3>
          <div style="display:flex;gap:8px">
            <select class="form-control" id="warranty-filter" style="max-width:160px" onchange="Warranty._filter()">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
        <div class="table-wrap"><table id="warranty-table">
          <thead><tr>
            <th>Customer</th><th>Invoice #</th><th>Job Date</th><th>Warranty Expires</th>
            <th>Invoice Total</th><th>Status</th><th>Days Left</th><th>Actions</th>
          </tr></thead>
          <tbody>${warranties.map(w => {
            const daysLeft = Math.ceil((new Date(w.expiryDate) - new Date()) / 86400000);
            const statusClass = w.status === 'active' ? 'success' : w.status === 'expiring' ? 'warning' : 'danger';
            return `<tr class="warranty-row" data-status="${w.status}" data-customer="${(w.customer||'').toLowerCase()}">
              <td><strong>${App.esc(w.customer) || '—'}</strong></td>
              <td>${w.invoiceNumber || '—'}</td>
              <td>${App.formatDate(w.invoiceDate)}</td>
              <td>${App.formatDate(w.expiryDate)}${w.extended ? ' <span class="badge badge-info" style="font-size:10px">Extended</span>' : ''}</td>
              <td>${App.formatCurrency(w.invoiceTotal)}</td>
              <td><span class="badge badge-${statusClass}">${w.status}</span></td>
              <td>${daysLeft > 0 ? daysLeft + ' days' : '<span style="color:var(--danger)">Expired ' + Math.abs(daysLeft) + 'd ago</span>'}</td>
              <td style="white-space:nowrap">
                <button class="btn btn-sm btn-outline" onclick="Warranty.view('${w.id}')">Details</button>
                <button class="btn btn-sm btn-primary" onclick="Warranty.extend('${w.id}')">Extend</button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>`}`;
};

PageInit.warranty = function() {
  Warranty._filter();
};

const Warranty = {
  _getAll() {
    const invoices = (App.state.invoices || []).filter(i => i.status === 'paid');
    const extensions = App.state.warrantyExtensions || {};
    const today = new Date();
    today.setHours(0,0,0,0);

    return invoices.map(inv => {
      const ext = extensions[inv.id];
      const invoiceDate = new Date(inv.date);
      const baseExpiry = new Date(invoiceDate);
      baseExpiry.setFullYear(baseExpiry.getFullYear() + 1);

      let expiryDate = baseExpiry;
      let extended = false;
      if (ext && ext.newExpiryDate) {
        const extDate = new Date(ext.newExpiryDate);
        if (extDate > baseExpiry) {
          expiryDate = extDate;
          extended = true;
        }
      }

      const daysLeft = Math.ceil((expiryDate - today) / 86400000);
      let status;
      if (daysLeft <= 0) status = 'expired';
      else if (daysLeft <= 30) status = 'expiring';
      else status = 'active';

      return {
        id: inv.id,
        invoiceId: inv.id,
        invoiceNumber: inv.number,
        invoiceDate: inv.date,
        invoiceTotal: inv.total,
        customer: inv.customer,
        expiryDate: expiryDate.toISOString().split('T')[0],
        status,
        extended,
        extensionNote: ext ? ext.note : '',
        extensionDate: ext ? ext.date : ''
      };
    }).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  },

  _filter() {
    App.filterRows({ searchId: '', statusId: 'warranty-filter', rowClass: 'warranty-row', searchFields: [] });
  },

  view(id) {
    const w = this._getAll().find(x => x.id === id);
    if (!w) return;
    const inv = App.state.invoices.find(i => i.id === id);
    const daysLeft = Math.ceil((new Date(w.expiryDate) - new Date()) / 86400000);
    const ext = (App.state.warrantyExtensions || {})[id];

    App.openModal(`
      <div class="modal-header"><h3>Warranty — ${App.esc(w.customer)}</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div><strong>Invoice #:</strong><br>${w.invoiceNumber}</div>
        <div><strong>Invoice Total:</strong><br>${App.formatCurrency(w.invoiceTotal)}</div>
        <div><strong>Job Date:</strong><br>${App.formatDate(w.invoiceDate)}</div>
        <div><strong>Warranty Expires:</strong><br><span style="color:${daysLeft<=0?'var(--danger)':daysLeft<=30?'var(--warning)':'var(--success)'};font-weight:700">${App.formatDate(w.expiryDate)}</span></div>
        <div><strong>Days Remaining:</strong><br>${daysLeft > 0 ? daysLeft + ' days' : 'Expired ' + Math.abs(daysLeft) + ' days ago'}</div>
        <div><strong>Status:</strong><br><span class="badge badge-${w.status==='active'?'success':w.status==='expiring'?'warning':'danger'}">${w.status}</span></div>
      </div>
      ${ext ? `<div style="padding:12px;background:var(--info-bg);border-radius:8px;margin-bottom:16px">
        <strong>Extension:</strong> Extended on ${App.formatDate(ext.date)} to ${App.formatDate(ext.newExpiryDate)}
        ${ext.note ? '<br><em>' + ext.note + '</em>' : ''}
      </div>` : ''}
      ${inv && inv.items ? `<h4 style="margin:16px 0 8px;color:var(--navy)">Covered Items</h4>
        <table style="width:100%"><thead><tr><th>Service</th><th>Amount</th></tr></thead><tbody>
        ${inv.items.map(i => `<tr><td>${i.desc}</td><td>${App.formatCurrency(i.price)}</td></tr>`).join('')}
        </tbody></table>` : ''}
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Close</button>
        <button class="btn btn-primary" onclick="App.closeModal();Warranty.extend('${w.id}')">Extend Warranty</button>
      </div>
    `);
  },

  extend(id) {
    const w = this._getAll().find(x => x.id === id);
    if (!w) return;
    const currentExpiry = w.expiryDate;

    App.openModal(`
      <div class="modal-header"><h3>Extend Warranty — ${App.esc(w.customer)}</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <p style="margin-bottom:16px">Current expiry: <strong>${App.formatDate(currentExpiry)}</strong></p>
      <div class="form-group"><label>New Expiry Date</label>
        <input class="form-control" type="date" id="warranty-new-date" value="${currentExpiry}">
      </div>
      <div class="form-group"><label>Extension Reason</label>
        <select class="form-control" id="warranty-reason">
          <option value="Goodwill gesture">Goodwill gesture</option>
          <option value="Repeat customer">Repeat customer</option>
          <option value="Warranty claim follow-up">Warranty claim follow-up</option>
          <option value="Service plan benefit">Service plan benefit</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group"><label>Notes (optional)</label>
        <textarea class="form-control" id="warranty-notes" placeholder="Additional details..."></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Warranty._saveExtension('${id}')">Extend Warranty</button>
      </div>
    `);
  },

  _saveExtension(id) {
    const newDate = document.getElementById('warranty-new-date').value;
    const reason = document.getElementById('warranty-reason').value;
    const notes = document.getElementById('warranty-notes').value;

    if (!newDate) return App.toast('Select a new expiry date', 'error');

    const w = this._getAll().find(x => x.id === id);
    if (newDate <= w.expiryDate) return App.toast('New date must be after current expiry', 'error');

    if (!App.state.warrantyExtensions) App.state.warrantyExtensions = {};
    App.state.warrantyExtensions[id] = {
      date: App.today(),
      newExpiryDate: newDate,
      reason,
      note: notes
    };
    App.saveState();
    App.closeModal();
    App.handleRoute();
    App.toast('Warranty extended to ' + App.formatDate(newDate));
  },

  // Called by dashboard to get expiring warranties
  getExpiring() {
    return this._getAll().filter(w => w.status === 'expiring');
  }
};
