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
              <a href="#" onclick="CustomerDetail.view('${c.id}');return false" style="color:var(--navy);font-weight:600;text-decoration:none">${App.esc(c.name)}</a>
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
    const plans = (App.state.maintenancePlans||[]).filter(p => p.customer === c.name);
    const followUps = (App.state.followUps||[]).filter(f => f.customerName === c.name);

    // Build unified timeline
    const timeline = [];
    jobs.forEach(j => timeline.push({ date: j.date, type: 'job', icon: '🔧', label: j.title, status: j.status, id: j.id }));
    quotes.forEach(q => timeline.push({ date: q.date, type: 'quote', icon: '📋', label: `Quote #${q.number} — ${App.formatCurrency(q.total)}`, status: q.status, id: q.id }));
    invs.forEach(i => timeline.push({ date: i.date, type: 'invoice', icon: '💰', label: `Invoice #${i.number} — ${App.formatCurrency(i.total)}`, status: i.status, id: i.id }));
    timeline.sort((a,b) => b.date.localeCompare(a.date));

    // Stats
    const avgJobValue = paidInvs.length > 0 ? totalSpent / paidInvs.length : 0;
    const lastService = jobs.find(j => j.status === 'completed');
    const daysSince = lastService ? Math.floor((Date.now() - new Date(lastService.date).getTime()) / 86400000) : null;
    const isVIP = totalSpent >= 2000;
    const custNum = c.customerId || (c.customerId = 'C-' + String(App.state.customers.indexOf(c) + 1).padStart(4, '0'));
    App.saveState(); // persist the ID

    App.openModal(`
      <div class="modal-header">
        <h3>${App.esc(c.name)} ${isVIP ? '<span class="badge badge-success" style="font-size:11px">⭐ VIP</span>' : ''}</h3>
        <button class="modal-close" onclick="App.closeModal()">✕</button>
      </div>

      <!-- Customer ID & Contact -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
        <span style="background:var(--bg);padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;color:var(--text-muted)">ID: ${custNum}</span>
        ${plans.length > 0 ? `<span class="badge badge-success">🔧 ${plans.length} Maintenance Plan${plans.length>1?'s':''}</span>` : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${c.phone ? `<button class="btn btn-sm btn-outline" onclick="window.open('tel:${c.phone}')">📞 Call</button>` : ''}
        ${c.phone ? `<button class="btn btn-sm btn-outline" onclick="window.open('sms:${c.phone.replace(/\D/g,'')}?body=${encodeURIComponent('Hi '+c.name+', this is '+App.getBusinessInfo().contact+' from '+App.getBusinessInfo().name+'. ')}')">📱 Text</button>` : ''}
        ${c.email ? `<button class="btn btn-sm btn-outline" onclick="window.open('mailto:${c.email}')">📧 Email</button>` : ''}
        ${c.address ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}" target="_blank" class="btn btn-sm btn-outline">📍 Directions</a>` : ''}
      </div>

      <!-- Stats Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:16px">
        <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px">
          <div style="font-size:20px;font-weight:700;color:var(--success)">${App.formatCurrency(totalSpent)}</div>
          <div style="font-size:11px;color:var(--text-muted)">Total Spent</div>
        </div>
        ${outstanding > 0 ? `<div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px">
          <div style="font-size:20px;font-weight:700;color:var(--danger)">${App.formatCurrency(outstanding)}</div>
          <div style="font-size:11px;color:var(--text-muted)">Outstanding</div>
        </div>` : ''}
        <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px">
          <div style="font-size:20px;font-weight:700;color:var(--navy)">${jobs.length}</div>
          <div style="font-size:11px;color:var(--text-muted)">Total Jobs</div>
        </div>
        <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px">
          <div style="font-size:20px;font-weight:700;color:var(--navy)">${App.formatCurrency(avgJobValue)}</div>
          <div style="font-size:11px;color:var(--text-muted)">Avg Value</div>
        </div>
        ${daysSince !== null ? `<div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px">
          <div style="font-size:20px;font-weight:700;color:${daysSince > 365 ? 'var(--danger)' : daysSince > 180 ? 'var(--warning)' : 'var(--navy)'}">${daysSince}d</div>
          <div style="font-size:11px;color:var(--text-muted)">Since Last</div>
        </div>` : ''}
      </div>

      <!-- Contact Info -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:13px">
        <div><strong>Phone:</strong> ${c.phone||'—'}</div>
        <div><strong>Email:</strong> ${c.email||'—'}</div>
        <div style="grid-column:1/-1"><strong>Address:</strong> ${c.address||'—'}</div>
      </div>
      ${c.notes ? `<div style="margin-bottom:16px;padding:10px;background:var(--bg);border-radius:8px;font-size:13px"><strong>Notes:</strong> ${c.notes}</div>` : ''}

      <!-- Timeline -->
      ${timeline.length > 0 ? `
      <h4 style="margin:16px 0 8px;color:var(--navy)">📅 History (${timeline.length})</h4>
      <div style="max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
        <table style="width:100%;font-size:13px"><tbody>
          ${timeline.map(t => `<tr>
            <td style="width:20px;text-align:center">${t.icon}</td>
            <td>${App.formatDate(t.date)}</td>
            <td>${t.label}</td>
            <td><span class="badge badge-${t.status==='completed'||t.status==='paid'||t.status==='accepted'?'success':t.status==='overdue'||t.status==='cancelled'?'danger':'warning'}">${t.status}</span></td>
          </tr>`).join('')}
        </tbody></table>
      </div>` : '<p style="color:var(--text-muted);text-align:center;padding:16px">No history yet</p>'}

      <!-- Follow-ups -->
      ${followUps.length > 0 ? `
      <h4 style="margin:16px 0 8px;color:var(--navy)">📧 Follow-ups (${followUps.length})</h4>
      <table style="width:100%;font-size:13px"><tbody>
        ${followUps.map(f => `<tr><td>${App.formatDate(f.dueDate||f.createdAt)}</td><td>${f.type||'general'}</td><td><span class="badge badge-${f.status==='sent'?'success':'warning'}">${f.status}</span></td></tr>`).join('')}
      </tbody></table>` : ''}

      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Close</button>
        <button class="btn btn-outline" onclick="App.closeModal();Scheduler.newForCustomer('${App.esc(c.name)}')">📅 New Job</button>
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
