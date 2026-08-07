// Customers Page — with search and detail view
Pages.customers = function() {
  const custs = App.state.customers || [];
  return `
    <div class="page-header"><h2>Customers</h2><p>Manage your customer directory</p></div>
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-primary" onclick="Customers.new()">+ Add Customer</button>
      <input class="form-control" id="cust-search" placeholder="Search customers..." style="max-width:250px" oninput="Customers._filter()">
    </div>
    ${custs.length === 0
      ? '<div class="card"><div class="empty-state"><div class="icon" id="empty-customers"></div><h3>No customers yet</h3><p>Add your first customer to get started</p></div></div>'
      : (() => {
          // Calculate lifetime value for each customer and sort by total spent
          const custsWithValue = custs.map(c => {
            const invs = (App.state.invoices||[]).filter(i=>i.customer===c.name&&i.status==='paid');
            const spent = invs.reduce((s,i)=>s+i.total,0);
            const jobCount = (App.state.jobs||[]).filter(j=>j.customer===c.name).length;
            const activePlans = (App.state.maintenancePlans||[]).filter(p=>p.customer===c.name&&p.status==='active').length;
            return { ...c, spent, jobCount, activePlans, paidInvoiceCount: invs.length };
          }).sort((a,b) => b.spent - a.spent);

          return `<div class="card"><div class="table-wrap"><table id="cust-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Jobs</th><th>Total Spent</th><th>Status</th><th></th></tr></thead>
        <tbody>${custsWithValue.map(c => {
          const isVIP = c.spent >= 2000;
          const isRepeat = c.jobCount > 1;
          const hasActivePlan = c.activePlans > 0;
          return `<tr class="cust-row" data-search="${(c.name+' '+(c.phone||'')+' '+(c.email||'')+' '+(c.address||'')).toLowerCase()}">
            <td>
              <a href="#" onclick="Customers.detail('${c.id}');return false" style="color:var(--navy);font-weight:600;text-decoration:none">${App.esc(c.name)}</a>
              ${isVIP ? ' <span class="badge badge-success" style="font-size:10px">⭐ VIP</span>' : ''}
              ${isRepeat ? ' <span class="badge badge-info" style="font-size:10px">🔄 Repeat</span>' : ''}
              ${hasActivePlan ? ' <span class="badge badge-warning" style="font-size:10px">🔧 Plan</span>' : ''}
            </td>
            <td>${c.phone||'—'}</td>
            <td>${c.jobCount}</td>
            <td style="font-weight:600;color:${c.spent>0?'var(--success)':'var(--text-muted)'}">${App.formatCurrency(c.spent)}</td>
            <td>${c.activePlans > 0 ? '<span class="badge badge-success">Active Plan</span>' : c.spent > 0 ? '<span class="badge badge-info">Customer</span>' : '<span class="badge badge-muted">Lead</span>'}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm btn-outline" onclick="Customers.edit('${c.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="Customers.remove('${c.id}')">✕</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div></div>`;
        })()}`;
};

PageInit.customers = function() {
  Customers._filter();
};

const Customers = {
  _filter() {
    const q = (document.getElementById('cust-search')?.value || '').toLowerCase();
    document.querySelectorAll('.cust-row').forEach(row => {
      row.style.display = row.dataset.search.includes(q) ? '' : 'none';
    });
  },

  detail(id) {
    const c = App.state.customers.find(x => x.id === id);
    if (!c) return;
    const jobs = (App.state.jobs||[]).filter(j => j.customer === c.name).sort((a,b) => b.date.localeCompare(a.date));
    const quotes = (App.state.quotes||[]).filter(q => q.customer === c.name).sort((a,b) => b.date.localeCompare(a.date));
    const invs = (App.state.invoices||[]).filter(i => i.customer === c.name).sort((a,b) => b.date.localeCompare(a.date));
    const paidInvs = invs.filter(i => i.status === 'paid');
    const totalSpent = paidInvs.reduce((s,i) => s + (i.total||0), 0);
    const unpaidInvs = invs.filter(i => i.status !== 'paid');
    const outstanding = unpaidInvs.reduce((s,i) => s + (i.total||0), 0);

    App.openModal(`
      <div class="modal-header"><h3>${App.esc(c.name)}</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div><strong>Phone:</strong><br>${c.phone||'—'}</div>
        <div><strong>Email:</strong><br>${c.email||'—'}</div>
        <div><strong>Address:</strong><br>${c.address ? App.googleMapsLink(c.address) : '—'}</div>
        <div><strong>Total Paid:</strong><br><span style="color:var(--success);font-weight:700">${App.formatCurrency(totalSpent)}</span></div>
        ${outstanding > 0 ? `<div><strong>Outstanding:</strong><br><span style="color:var(--danger);font-weight:700">${App.formatCurrency(outstanding)}</span></div>` : ''}
      </div>
      ${c.notes ? `<div style="margin-bottom:16px;padding:12px;background:var(--bg);border-radius:8px"><strong>Notes:</strong> ${c.notes}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${c.phone ? `<button class="btn btn-sm btn-outline" onclick="window.open('tel:${c.phone}')">📞 Call</button>` : ''}
        ${c.phone ? `<button class="btn btn-sm btn-outline" onclick="window.open('sms:${c.phone.replace(/\D/g,'')}?body=${encodeURIComponent('Hi '+c.name+', this is '+App.getBusinessInfo().contact+' from '+App.getBusinessInfo().name+'. ')}')">📱 Text</button>` : ''}
        ${c.email ? `<button class="btn btn-sm btn-outline" onclick="window.open('mailto:${c.email}')">📧 Email</button>` : ''}
        ${c.address ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}" target="_blank" class="btn btn-sm btn-outline">📍 Directions</a>` : ''}
      </div>

      ${jobs.length > 0 ? `
      <h4 style="margin:16px 0 8px;color:var(--navy)">Jobs (${jobs.length})</h4>
      <table style="width:100%"><thead><tr><th>Date</th><th>Title</th><th>Status</th></tr></thead><tbody>
        ${jobs.map(j => `<tr><td>${App.formatDate(j.date)}</td><td>${j.title}</td>
          <td><span class="badge badge-${j.status==='completed'?'success':j.status==='in-progress'?'info':'warning'}">${j.status||'scheduled'}</span></td></tr>`).join('')}
      </tbody></table>` : ''}

      ${quotes.length > 0 ? `
      <h4 style="margin:16px 0 8px;color:var(--navy)">Quotes (${quotes.length})</h4>
      <table style="width:100%"><thead><tr><th>#</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>
        ${quotes.map(q => `<tr><td>#${q.number}</td><td>${App.formatDate(q.date)}</td><td>${App.formatCurrency(q.total)}</td>
          <td><span class="badge badge-${q.status==='accepted'?'success':q.status==='sent'?'info':'warning'}">${q.status}</span></td></tr>`).join('')}
      </tbody></table>` : ''}

      ${invs.length > 0 ? `
      <h4 style="margin:16px 0 8px;color:var(--navy)">Invoices (${invs.length})</h4>
      <table style="width:100%"><thead><tr><th>#</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>
        ${invs.map(i => `<tr><td>#${i.number}</td><td>${App.formatDate(i.date)}</td><td>${App.formatCurrency(i.total)}</td>
          <td><span class="badge badge-${i.status==='paid'?'success':i.status==='overdue'?'danger':'warning'}">${i.status}</span></td></tr>`).join('')}
      </tbody></table>` : ''}

      ${jobs.length===0 && quotes.length===0 && invs.length===0 ? '<p style="color:var(--text-muted);text-align:center;padding:16px">No history yet</p>' : ''}

      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Close</button>
        <button class="btn btn-primary" onclick="App.closeModal();Customers.edit('${c.id}')">Edit Customer</button>
      </div>
    `);
  },

  new() {
    App.openModal(`<div class="modal-header"><h3>New Customer</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div class="form-group"><label>Name</label><input class="form-control" id="cf-name"></div>
      <div class="form-group"><label>Phone</label><input class="form-control" id="cf-phone" type="tel"></div>
      <div class="form-group"><label>Email</label><input class="form-control" id="cf-email" type="email"></div>
      <div class="form-group"><label>Address</label><input class="form-control" id="cf-addr"></div>
      <div class="form-group"><label>Notes</label><textarea class="form-control" id="cf-notes"></textarea></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Customers._saveNew()">Add Customer</button>
      </div>`);
  },
  _saveNew() {
    const name = document.getElementById('cf-name').value.trim();
    if (!name) return App.toast('Name is required','error');
    App.state.customers.push({
      id: App.genId(), name,
      phone: document.getElementById('cf-phone').value,
      email: document.getElementById('cf-email').value,
      address: document.getElementById('cf-addr').value,
      notes: document.getElementById('cf-notes').value
    });
    App.saveState(); App.closeModal(); App.handleRoute(); App.toast('Customer added');
  },
  edit(id) {
    const c = App.state.customers.find(x => x.id === id);
    if (!c) return;
    App.openModal(`<div class="modal-header"><h3>Edit Customer</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div class="form-group"><label>Name</label><input class="form-control" id="cf-name" value="${c.name}"></div>
      <div class="form-group"><label>Phone</label><input class="form-control" id="cf-phone" type="tel" value="${c.phone||''}"></div>
      <div class="form-group"><label>Email</label><input class="form-control" id="cf-email" type="email" value="${c.email||''}"></div>
      <div class="form-group"><label>Address</label><input class="form-control" id="cf-addr" value="${c.address||''}"></div>
      <div class="form-group"><label>Notes</label><textarea class="form-control" id="cf-notes">${c.notes||''}</textarea></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Customers._saveEdit('${id}')">Save</button>
      </div>`);
  },
  _saveEdit(id) {
    const c = App.state.customers.find(x => x.id === id);
    c.name = document.getElementById('cf-name').value.trim();
    c.phone = document.getElementById('cf-phone').value;
    c.email = document.getElementById('cf-email').value;
    c.address = document.getElementById('cf-addr').value;
    c.notes = document.getElementById('cf-notes').value;
    App.saveState(); App.closeModal(); App.handleRoute(); App.toast('Customer updated');
  },
  async remove(id) {
    if (await App.confirm('Delete this customer?')) {
      App.state.customers = App.state.customers.filter(c => c.id !== id);
      App.saveState(); App.handleRoute(); App.toast('Customer deleted');
    }
  }
};
