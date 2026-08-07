// Maintenance Plans Page — Wired to Invoices, Billing History, MRR
Pages.maintenance = function() {
  const plans = App.state.maintenancePlans || [];
  const activePlans = plans.filter(p => p.status === 'active');
  const mrr = activePlans.reduce((sum, p) => {
    if (p.frequency === 'Monthly') return sum + p.price;
    if (p.frequency === 'Quarterly') return sum + (p.price / 3);
    if (p.frequency === 'Annual') return sum + (p.price / 12);
    return sum + p.price;
  }, 0);
  const arr = mrr * 12;
  const totalBilled = plans.reduce((sum, p) => sum + (p.billingHistory || []).reduce((s, b) => s + b.amount, 0), 0);

  return `
    <div class="page-header">
      <h2>Maintenance Plans</h2>
      <p>Manage recurring service plans — bill, track, and retain customers</p>
    </div>

    <div class="grid grid-4" style="margin-bottom:16px">
      <div class="stat-card">
        <div class="stat-icon" id="stat-maint-active"></div>
        <div>
          <div class="stat-value">${activePlans.length}</div>
          <div class="stat-label">Active Plans</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" id="stat-maint-mrr"></div>
        <div>
          <div class="stat-value">${App.formatCurrency(mrr)}</div>
          <div class="stat-label">Monthly Recurring Revenue</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" id="stat-maint-arr"></div>
        <div>
          <div class="stat-value">${App.formatCurrency(arr)}</div>
          <div class="stat-label">Annual Run Rate</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" id="stat-maint-billed"></div>
        <div>
          <div class="stat-value">${App.formatCurrency(totalBilled)}</div>
          <div class="stat-label">Total Billed</div>
        </div>
      </div>
    </div>

    <div style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="Maint.new()">+ New Plan</button>
      <button class="btn btn-outline" onclick="Maint.showTemplates()">Plan Templates</button>
    </div>

    ${plans.length === 0
      ? `<div class="card"><div class="empty-state">
          <div class="icon" id="empty-maintenance"></div>
          <h3>No maintenance plans</h3>
          <p>Create plans to generate recurring revenue and keep customers coming back</p>
        </div></div>`
      : `<div class="card"><div class="table-wrap"><table>
        <thead><tr>
          <th>Customer</th><th>Plan</th><th>Frequency</th><th>Price</th>
          <th>Next Visit</th><th>Billed</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>${plans.map(p => {
          const billedCount = (p.billingHistory || []).length;
          const overdue = p.nextVisit && p.nextVisit < App.today() && p.status === 'active';
          return `<tr style="${overdue ? 'background:rgba(220,53,69,0.08)' : ''}">
            <td><strong>${App.esc(p.customer) || '(no customer)'}</strong></td>
            <td>${p.planName}</td>
            <td>${p.frequency}</td>
            <td>${App.formatCurrency(p.price)}/${p.frequency==='Monthly'?'mo':p.frequency==='Quarterly'?'qtr':'yr'}</td>
            <td>
              ${App.formatDate(p.nextVisit)}
              ${overdue ? '<span class="badge badge-danger" style="margin-left:4px">Overdue</span>' : ''}
            </td>
            <td>${billedCount}×</td>
            <td>
              <span class="badge badge-${p.status==='active'?'success':p.status==='paused'?'warning':'muted'}">${p.status}</span>
            </td>
            <td style="white-space:nowrap">
              ${p.status === 'active' ? `
                <button class="btn btn-sm btn-primary" onclick="Maint.billNow('${p.id}')" title="Generate invoice and advance next visit">Bill Now</button>
                <button class="btn btn-sm btn-outline" onclick="Maint.togglePause('${p.id}')" title="Pause this plan">⏸</button>
              ` : p.status === 'paused' ? `
                <button class="btn btn-sm btn-success" onclick="Maint.togglePause('${p.id}')" title="Resume this plan">▶</button>
              ` : ''}
              <button class="btn btn-sm btn-outline" onclick="Maint.viewHistory('${p.id}')" title="View billing history">📋</button>
              <button class="btn btn-sm btn-outline" onclick="Maint.edit('${p.id}')" title="Edit plan">✎</button>
              <button class="btn btn-sm btn-danger" onclick="Maint.remove('${p.id}')" title="Delete plan">✕</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div></div>`}`;
};

PageInit.maintenance = function() {
  App.injectIcons({
    'stat-maint-active': Icons.maintenance || Icons.jobs,
    'stat-maint-mrr': Icons.revenue || Icons.invoices,
    'stat-maint-arr': Icons.revenue || Icons.invoices,
    'stat-maint-billed': Icons.invoices,
    'empty-maintenance': Icons.maintenance || Icons.jobs,
  });
};

const Maint = {
  _advanceNextVisit(p) {
    const d = new Date(p.nextVisit || App.today());
    if (p.frequency === 'Monthly') d.setMonth(d.getMonth() + 1);
    else if (p.frequency === 'Quarterly') d.setMonth(d.getMonth() + 3);
    else if (p.frequency === 'Annual') d.setFullYear(d.getFullYear() + 1);
    p.nextVisit = d.toISOString().slice(0, 10);
  },

  billNow(id) {
    const p = (App.state.maintenancePlans || []).find(x => x.id === id);
    if (!p) return;
    if (!p.customer) { App.toast('Set a customer name first', 'warning'); return; }

    // Find or create customer
    let cust = (App.state.customers || []).find(c => c.name === p.customer);
    if (!cust) {
      cust = { id: App.genId(), name: p.customer, email: '', phone: '', address: '', createdAt: App.today() };
      if (!App.state.customers) App.state.customers = [];
      App.state.customers.push(cust);
    }

    // Create invoice from plan
    const subtotal = p.price;
    const tax = +(subtotal * 0.13).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);

    const invoice = {
      id: App.genId(),
      number: App.state.nextInvoiceNum++,
      customer: p.customer,
      email: cust.email || '',
      phone: cust.phone || '',
      address: cust.address || '',
      items: [{ desc: `${p.planName} — ${p.frequency} Service`, qty: 1, price: p.price }],
      subtotal,
      tax,
      total,
      date: App.today(),
      dueDate: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0,10); })(),
      status: 'sent',
      payments: [],
      notes: `Auto-generated from maintenance plan: ${p.planName}`,
      maintenancePlanId: p.id,
    };

    if (!App.state.invoices) App.state.invoices = [];
    App.state.invoices.push(invoice);

    // Record billing history
    if (!p.billingHistory) p.billingHistory = [];
    p.billingHistory.push({
      invoiceId: invoice.id,
      date: App.today(),
      amount: total,
      frequency: p.frequency,
    });

    // Advance next visit
    this._advanceNextVisit(p);

    App.saveState();
    App.toast(`Invoice ${invoice.id} created — ${App.formatCurrency(total)}`);
    App.handleRoute();
  },

  togglePause(id) {
    const p = (App.state.maintenancePlans || []).find(x => x.id === id);
    if (!p) return;
    p.status = p.status === 'active' ? 'paused' : 'active';
    App.saveState();
    App.toast(p.status === 'active' ? 'Plan resumed' : 'Plan paused');
    App.handleRoute();
  },

  viewHistory(id) {
    const p = (App.state.maintenancePlans || []).find(x => x.id === id);
    if (!p) return;
    const history = p.billingHistory || [];
    const totalBilled = history.reduce((s, b) => s + b.amount, 0);

    App.openModal(`
      <div class="modal-header">
        <h3>Billing History — ${p.planName}</h3>
        <button class="modal-close" onclick="App.closeModal()">✕</button>
      </div>
      <div style="margin-bottom:12px">
        <strong>Customer:</strong> ${App.esc(p.customer) || '(none)'}<br>
        <strong>Plan:</strong> ${p.planName} — ${App.formatCurrency(p.price)}/${p.frequency.toLowerCase()}<br>
        <strong>Total Billed:</strong> ${App.formatCurrency(totalBilled)} (${history.length} invoices)
      </div>
      ${history.length === 0
        ? '<p style="color:var(--text-muted)">No billing history yet. Use "Bill Now" to generate the first invoice.</p>'
        : `<div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Invoice</th><th>Amount</th></tr></thead>
          <tbody>${history.map(b => `
            <tr>
              <td>${App.formatDate(b.date)}</td>
              <td><a href="#invoices" onclick="App.closeModal();setTimeout(()=>Invoices.edit('${b.invoiceId}'),200)">${b.invoiceId}</a></td>
              <td>${App.formatCurrency(b.amount)}</td>
            </tr>
          `).join('')}</tbody>
        </table></div>`}
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Close</button>
      </div>
    `);
  },

  showTemplates() {
    App.openModal(`
      <div class="modal-header">
        <h3>Plan Templates</h3>
        <button class="modal-close" onclick="App.closeModal()">✕</button>
      </div>
      <div style="display:grid;gap:12px">
        <div class="card" style="cursor:pointer" onclick="Maint._fromTemplate('basic')">
          <h4>🔧 Basic Plan — $19.99/mo</h4>
          <p>Annual water heater flush, faucet inspection, drain check. <strong>Good for:</strong> budget-conscious homeowners who want preventive care.</p>
        </div>
        <div class="card" style="cursor:pointer" onclick="Maint._fromTemplate('standard')">
          <h4>⚙️ Standard Plan — $34.99/mo</h4>
          <p>Basic + priority scheduling, 10% off all repairs, annual backflow test. <strong>Good for:</strong> most residential customers.</p>
        </div>
        <div class="card" style="cursor:pointer" onclick="Maint._fromTemplate('premium')">
          <h4>⭐ Premium Plan — $59.99/mo</h4>
          <p>Standard + 15% off all work, no after-hours surcharge, 2 visits/year, no service call fee. <strong>Good for:</strong> landlords, property managers, older homes.</p>
        </div>
        <div class="card" style="cursor:pointer" onclick="Maint._fromTemplate('commercial')">
          <h4>🏢 Commercial Plan — $89.99/mo</h4>
          <p>Quarterly inspections, priority emergency response, 20% off repairs, annual backflow certification, grease trap service. <strong>Good for:</strong> restaurants, offices, retail.</p>
        </div>
        <div class="card" style="cursor:pointer" onclick="Maint._fromTemplate('annual')">
          <h4>📅 Annual Plan — $199/yr</h4>
          <p>One annual inspection, water heater flush, drain check, 10% off any needed repairs. <strong>Good for:</strong> customers who prefer a one-time payment.</p>
        </div>
      </div>
    `);
  },

  _fromTemplate(tier) {
    App.closeModal();
    const templates = {
      basic: {
        planName: 'Basic Maintenance', price: 19.99, frequency: 'Monthly',
        services: 'Annual water heater flush, faucet inspection, drain check, supply line inspection'
      },
      standard: {
        planName: 'Standard Maintenance', price: 34.99, frequency: 'Monthly',
        services: 'Basic + priority scheduling, 10% off repairs, annual backflow test, toilet inspection'
      },
      premium: {
        planName: 'Premium Maintenance', price: 59.99, frequency: 'Monthly',
        services: 'Standard + 15% off all work, no after-hours surcharge, 2 visits/year, no service call fee, emergency priority'
      },
      commercial: {
        planName: 'Commercial Maintenance', price: 89.99, frequency: 'Monthly',
        services: 'Quarterly inspections, priority emergency, 20% off repairs, annual backflow cert, grease trap service'
      },
      annual: {
        planName: 'Annual Maintenance', price: 199, frequency: 'Annual',
        services: 'One annual inspection, water heater flush, drain check, supply line check, 10% off repairs'
      },
    };
    const t = templates[tier];
    App.state.maintenancePlans.push({
      id: App.genId(), customer: '', ...t, nextVisit: App.today(), status: 'active', billingHistory: []
    });
    App.saveState();
    const last = App.state.maintenancePlans[App.state.maintenancePlans.length - 1];
    this.edit(last.id);
  },

  new() {
    App.state.maintenancePlans.push({
      id: App.genId(), customer: '', planName: '', price: 0, frequency: 'Monthly',
      services: '', nextVisit: App.today(), status: 'active', billingHistory: []
    });
    App.saveState();
    const last = App.state.maintenancePlans[App.state.maintenancePlans.length - 1];
    this.edit(last.id);
  },

  edit(id) {
    const p = (App.state.maintenancePlans || []).find(x => x.id === id);
    if (!p) return;
    // Build customer autocomplete from existing customers
    const customerOptions = (App.state.customers || []).map(c =>
      `<option value="${c.name.replace(/"/g, '&quot;')}">`
    ).join('');
    App.openModal(`
      <div class="modal-header">
        <h3>Edit Plan</h3>
        <button class="modal-close" onclick="App.closeModal()">✕</button>
      </div>
      <div class="form-group">
        <label>Customer</label>
        <input class="form-control" id="mf-cust" value="${p.customer}" list="customer-list" placeholder="Start typing for suggestions...">
        <datalist id="customer-list">${customerOptions}</datalist>
      </div>
      <div class="form-group">
        <label>Plan Name</label>
        <input class="form-control" id="mf-name" value="${p.planName}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label>Price ($)</label>
          <input class="form-control" type="number" step="0.01" id="mf-price" value="${p.price}">
        </div>
        <div class="form-group">
          <label>Frequency</label>
          <select class="form-control" id="mf-freq">
            <option ${p.frequency==='Monthly'?'selected':''}>Monthly</option>
            <option ${p.frequency==='Quarterly'?'selected':''}>Quarterly</option>
            <option ${p.frequency==='Annual'?'selected':''}>Annual</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Services Included</label>
        <textarea class="form-control" id="mf-svc" rows="3">${p.services||''}</textarea>
      </div>
      <div class="form-group">
        <label>Next Visit</label>
        <input class="form-control" type="date" id="mf-next" value="${p.nextVisit}">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select class="form-control" id="mf-status">
          <option ${p.status==='active'?'selected':''}>active</option>
          <option ${p.status==='paused'?'selected':''}>paused</option>
          <option ${p.status==='cancelled'?'selected':''}>cancelled</option>
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Maint._save('${id}')">Save</button>
      </div>
    `);
  },

  _save(id) {
    const p = (App.state.maintenancePlans || []).find(x => x.id === id);
    if (!p) return;
    const oldCustomer = p.customer;
    p.customer = document.getElementById('mf-cust').value;
    p.planName = document.getElementById('mf-name').value;
    p.price = parseFloat(document.getElementById('mf-price').value) || 0;
    p.frequency = document.getElementById('mf-freq').value;
    p.services = document.getElementById('mf-svc').value;
    p.nextVisit = document.getElementById('mf-next').value;
    p.status = document.getElementById('mf-status').value;

    // Auto-link customer if new name
    if (p.customer && p.customer !== oldCustomer) {
      const exists = (App.state.customers || []).find(c => c.name === p.customer);
      if (!exists) {
        if (!App.state.customers) App.state.customers = [];
        App.state.customers.push({
          id: App.genId(), name: p.customer, email: '', phone: '', address: '', createdAt: App.today()
        });
      }
    }

    App.saveState(); App.closeModal(); App.handleRoute(); App.toast('Plan saved');
  },

  async remove(id) {
    if (await App.confirm('Delete this maintenance plan?')) {
      App.state.maintenancePlans = App.state.maintenancePlans.filter(p => p.id !== id);
      App.saveState(); App.handleRoute(); App.toast('Plan deleted');
    }
  }
};
