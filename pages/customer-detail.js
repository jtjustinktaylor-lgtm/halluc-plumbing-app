// Customer Detail Page — Full customer history & profile
Pages['customer-detail'] = function() {
  // Extract customer ID from hash: #customer-detail/{id}
  const hash = window.location.hash.slice(1);
  const id = hash.split('/')[1];
  if (!id) return '<div class="empty-state"><div class="icon">🚧</div><h3>No customer selected</h3><p><a href="#customers">← Back to Customers</a></p></div>';
  return CustomerDetail.render(id);
};

const CustomerDetail = {
  view(id) {
    window.location.hash = 'customer-detail/' + id;
  },

  render(customerId) {
    const c = (App.state.customers || []).find(x => x.id === customerId);
    if (!c) return '<div class="empty-state"><div class="icon">🚧</div><h3>Customer not found</h3><p><a href="#customers">← Back to Customers</a></p></div>';

    const jobs = (App.state.jobs || []).filter(j => j.customer === c.name).sort((a,b) => b.date.localeCompare(a.date));
    const quotes = (App.state.quotes || []).filter(q => q.customer === c.name).sort((a,b) => b.date.localeCompare(a.date));
    const invs = (App.state.invoices || []).filter(i => i.customer === c.name).sort((a,b) => b.date.localeCompare(a.date));
    const paidInvs = invs.filter(i => i.status === 'paid');
    const totalRevenue = paidInvs.reduce((s, i) => s + (i.total || 0), 0);
    const outstanding = invs.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const followUps = (App.state.followUps || []).filter(f => f.customerName === c.name);
    const plans = (App.state.maintenancePlans || []).filter(p => p.customer === c.name);
    const avgJobValue = paidInvs.length > 0 ? totalRevenue / paidInvs.length : 0;
    const lastJob = jobs.find(j => j.status === 'completed');
    const daysSince = lastJob ? Math.floor((Date.now() - new Date(lastJob.date).getTime()) / 86400000) : null;
    const isVIP = totalRevenue >= 2000;
    const custNum = c.customerId || 'C-' + String((App.state.customers || []).indexOf(c) + 1).padStart(4, '0');

    // Build unified timeline
    const timeline = [];
    jobs.forEach(j => timeline.push({ date: j.date, type: 'job', icon: '🔧', label: j.title || 'Job', status: j.status, id: j.id, detail: j.customer || '' }));
    quotes.forEach(q => timeline.push({ date: q.date, type: 'quote', icon: '📋', label: 'Quote #' + q.number + ' — ' + App.formatCurrency(q.total), status: q.status, id: q.id }));
    invs.forEach(i => timeline.push({ date: i.date, type: 'invoice', icon: '💰', label: 'Invoice #' + i.number + ' — ' + App.formatCurrency(i.total), status: i.status, id: i.id }));
    followUps.forEach(f => timeline.push({ date: f.dueDate || f.createdAt, type: 'followup', icon: '📧', label: 'Follow-Up — ' + (f.reason || 'general'), status: f.status, id: f.id }));
    timeline.sort((a,b) => b.date.localeCompare(a.date));

    return `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <h2>${App.esc(c.name)}</h2>
            ${isVIP ? '<span class="badge badge-success" style="font-size:11px">⭐ VIP</span>' : ''}
            ${plans.filter(p => p.status === 'active').length > 0 ? '<span class="badge badge-warning" style="font-size:11px">🔧 Maintenance Plan</span>' : ''}
          </div>
          <p>Customer ID: ${custNum}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a href="#customers" class="btn btn-outline">← Customers</a>
          <button class="btn btn-outline" onclick="CustomerDetail.editCustomer('${c.id}')">✏️ Edit</button>
          <button class="btn btn-primary" onclick="CustomerDetail.newQuoteFor('${App.esc(c.name)}')">📋 New Quote</button>
          <button class="btn btn-primary" onclick="CustomerDetail.newInvoiceFor('${App.esc(c.name)}')">💰 New Invoice</button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-4" style="margin-bottom:20px">
        <div class="stat-card"><div><div class="stat-value" style="color:var(--success)">${App.formatCurrency(totalRevenue)}</div><div class="stat-label">Total Revenue</div></div></div>
        ${outstanding > 0 ? `<div class="stat-card"><div><div class="stat-value" style="color:var(--danger)">${App.formatCurrency(outstanding)}</div><div class="stat-label">Outstanding</div></div></div>` : '<div class="stat-card"><div><div class="stat-value" style="color:var(--success)">$0.00</div><div class="stat-label">Outstanding</div></div></div>'}
        <div class="stat-card"><div><div class="stat-value">${jobs.length}</div><div class="stat-label">Total Jobs</div></div></div>
        <div class="stat-card"><div><div class="stat-value">${App.formatCurrency(avgJobValue)}</div><div class="stat-label">Avg Job Value</div></div></div>
      </div>

      <div class="grid grid-2">
        <!-- Contact Info Card -->
        <div class="card">
          <div class="card-header"><h3>📇 Contact Info</h3></div>
          <div style="display:grid;gap:10px;font-size:14px">
            <div><strong>Phone:</strong> ${c.phone ? `<a href="tel:${c.phone}" style="color:var(--navy)">${App.esc(c.phone)}</a>` : '—'}</div>
            <div><strong>Email:</strong> ${c.email ? `<a href="mailto:${c.email}" style="color:var(--navy)">${App.esc(c.email)}</a>` : '—'}</div>
            <div><strong>Address:</strong> ${c.address ? App.googleMapsLink(c.address) : '—'}</div>
            ${c.notes ? `<div style="margin-top:8px;padding:10px;background:var(--bg);border-radius:8px"><strong>Notes:</strong> ${App.esc(c.notes)}</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
            ${c.phone ? `<button class="btn btn-sm btn-outline" onclick="window.open('tel:${c.phone}')">📞 Call</button>` : ''}
            ${c.phone ? `<button class="btn btn-sm btn-outline" onclick="window.open('sms:${c.phone.replace(/\D/g,'')}?body=${encodeURIComponent('Hi '+c.name+', this is '+App.getBusinessInfo().contact+' from '+App.getBusinessInfo().name+'. ')}')">📱 Text</button>` : ''}
            ${c.email ? `<button class="btn btn-sm btn-outline" onclick="window.open('mailto:${c.email}')">📧 Email</button>` : ''}
            ${c.address ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}" target="_blank" class="btn btn-sm btn-outline">📍 Directions</a>` : ''}
          </div>
        </div>

        <!-- Quick Stats Card -->
        <div class="card">
          <div class="card-header"><h3>📊 Summary</h3></div>
          <div style="display:grid;gap:10px;font-size:14px">
            <div><strong>Paid Invoices:</strong> ${paidInvs.length}</div>
            <div><strong>Open Quotes:</strong> ${quotes.filter(q => q.status === 'pending' || q.status === 'sent').length}</div>
            <div><strong>Active Plans:</strong> ${plans.filter(p => p.status === 'active').length}</div>
            <div><strong>Pending Follow-Ups:</strong> ${followUps.filter(f => f.status === 'pending').length}</div>
            ${daysSince !== null ? `<div><strong>Last Service:</strong> <span style="color:${daysSince > 365 ? 'var(--danger)' : daysSince > 180 ? 'var(--warning)' : 'var(--text)'}">${App.formatDate(lastJob.date)} (${daysSince} days ago)</span></div>` : '<div><strong>Last Service:</strong> —</div>'}
            ${lastJob ? `<div><strong>Last Job:</strong> ${App.esc(lastJob.title || 'Job')}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div class="card" style="margin-top:20px">
        <div class="card-header"><h3>📅 Timeline (${timeline.length})</h3></div>
        ${timeline.length === 0
          ? '<p style="color:var(--text-muted);text-align:center;padding:24px">No activity yet</p>'
          : `<div class="table-wrap"><table>
              <thead><tr><th style="width:30px"></th><th>Date</th><th>Type</th><th>Description</th><th>Status</th></tr></thead>
              <tbody>${timeline.map(t => `<tr>
                <td style="text-align:center">${t.icon}</td>
                <td>${App.formatDate(t.date)}</td>
                <td><span class="badge badge-${t.type==='job'?'info':t.type==='quote'?'warning':t.type==='followup'?'muted':'success'}">${t.type}</span></td>
                <td>${App.esc(t.label)}</td>
                <td><span class="badge badge-${t.status==='completed'||t.status==='paid'||t.status==='accepted'||t.status==='sent'?'success':t.status==='overdue'||t.status==='cancelled'?'danger':'warning'}">${t.status}</span></td>
              </tr>`).join('')}</tbody>
            </table></div>`}
      </div>
    `;
  },

  editCustomer(id) {
    Customers.edit(id);
  },

  newQuoteFor(name) {
    window.location.hash = 'quotes';
    setTimeout(() => {
      Quotes.new();
      setTimeout(() => {
        const el = document.getElementById('qf-cust');
        if (el) el.value = name;
      }, 100);
    }, 200);
  },

  newInvoiceFor(name) {
    window.location.hash = 'invoices';
    setTimeout(() => {
      Invoices.new();
      setTimeout(() => {
        const el = document.getElementById('if-cust');
        if (el) el.value = name;
      }, 100);
    }, 200);
  }
};
