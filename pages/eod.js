// End-of-Day Report Page — one-click daily summary
Pages.eod = function() {
  const s = App.state;
  const today = App.today();
  const todayJobs = (s.jobs || []).filter(j => j.date === today);
  const completedJobs = todayJobs.filter(j => j.status === 'completed');
  const scheduledJobs = todayJobs.filter(j => j.status !== 'completed');

  // Revenue collected today
  const paidToday = (s.invoices || []).filter(i => i.paidDate === today || (i.payments || []).some(p => p.date === today));
  const revenueToday = paidToday.reduce((sum, i) => {
    if (i.paidDate === today) return sum + (i.total || 0);
    return sum + (i.payments || []).filter(p => p.date === today).reduce((s2, p) => s2 + p.amount, 0);
  }, 0);

  // Invoices and quotes created today
  const invoicesToday = (s.invoices || []).filter(i => i.date === today);
  const quotesToday = (s.quotes || []).filter(q => q.date === today);

  // Follow-ups
  const followUps = (s.followUps || []).filter(f => f.status === 'pending');
  const dueFollowUps = followUps.filter(f => f.followUpDate <= today);
  const upcomingFollowUps = followUps.filter(f => f.followUpDate > today);

  // Overdue invoices
  const overdueInv = (s.invoices || []).filter(i => i.status === 'overdue');
  const overdueTotal = overdueInv.reduce((sum, i) => sum + (i.total || 0), 0);

  // Maintenance
  const activePlans = (s.maintenancePlans || []).filter(p => p.status === 'active');
  const mrr = activePlans.reduce((sum, p) => {
    if (p.frequency === 'Monthly') return sum + p.price;
    if (p.frequency === 'Quarterly') return sum + (p.price / 3);
    if (p.frequency === 'Annual') return sum + (p.price / 12);
    return sum + p.price;
  }, 0);

  const inTwoWeeks = new Date();
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
  const cutoff = inTwoWeeks.toISOString().split('T')[0];
  const upcomingMaint = activePlans.filter(p => p.nextVisit && p.nextVisit >= today && p.nextVisit <= cutoff);

  // Expenses today
  const expensesToday = (s.expenses || []).filter(e => e.date === today);
  const expensesTodayTotal = expensesToday.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Mileage today
  const mileageToday = (s.mileage || []).filter(m => m.date === today);
  const milesToday = mileageToday.reduce((sum, m) => sum + (m.miles || 0), 0);
  const mileageRate = s.mileageRate || 0.70; // CRA rate 2024
  const mileageDeduction = milesToday * mileageRate;

  // Mileage this month
  const monthStart = today.slice(0, 7);
  const mileageMonth = (s.mileage || []).filter(m => m.date && m.date.startsWith(monthStart));
  const milesMonth = mileageMonth.reduce((sum, m) => sum + (m.miles || 0), 0);

  // Profit
  const profitToday = revenueToday - expensesTodayTotal;
  const totalCustomers = (s.customers || []).length;
  const totalRevenue = (s.invoices || []).filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0);

  const reportDate = new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `
    <div class="page-header">
      <h2>End-of-Day Report</h2>
      <p>${reportDate}</p>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="App.printSection(document.getElementById('eod-report').innerHTML, 'End-of-Day Report — ${today}')">🖨️ Print Report</button>
      <button class="btn btn-outline" onclick="EOD.logMileage()">🚗 Log Miles</button>
    </div>

    <div id="eod-report">
      <!-- Revenue & Profit -->
      <div class="grid grid-4" style="margin-bottom:16px">
        <div class="stat-card">
          <div class="stat-value" style="color:var(--success)">${App.formatCurrency(revenueToday)}</div>
          <div class="stat-label">Revenue Collected Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${App.formatCurrency(expensesTodayTotal)}</div>
          <div class="stat-label">Expenses Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:${profitToday >= 0 ? 'var(--success)' : 'var(--danger)'}">${App.formatCurrency(profitToday)}</div>
          <div class="stat-label">Profit Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${App.formatCurrency(totalRevenue)}</div>
          <div class="stat-label">Total Revenue (All Time)</div>
        </div>
      </div>

      <!-- Mileage -->
      <div class="grid grid-3" style="margin-bottom:16px">
        <div class="stat-card">
          <div class="stat-value">${milesToday.toFixed(1)}</div>
          <div class="stat-label">Miles Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${App.formatCurrency(mileageDeduction)}</div>
          <div class="stat-label">Deduction Today ($${mileageRate}/mi)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${milesMonth.toFixed(1)}</div>
          <div class="stat-label">Miles This Month</div>
        </div>
      </div>

      <!-- Activity -->
      <div class="grid grid-4" style="margin-bottom:16px">
        <div class="stat-card">
          <div class="stat-value">${completedJobs.length}</div>
          <div class="stat-label">Jobs Completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${scheduledJobs.length}</div>
          <div class="stat-label">Jobs Scheduled</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${invoicesToday.length}</div>
          <div class="stat-label">Invoices Created</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${quotesToday.length}</div>
          <div class="stat-label">Quotes Created</div>
        </div>
      </div>

      <!-- Customers & Plans -->
      <div class="grid grid-3" style="margin-bottom:16px">
        <div class="stat-card">
          <div class="stat-value">${totalCustomers}</div>
          <div class="stat-label">Total Customers</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${App.formatCurrency(mrr)}</div>
          <div class="stat-label">Monthly Recurring Revenue</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${activePlans.length}</div>
          <div class="stat-label">Active Maintenance Plans</div>
        </div>
      </div>

      ${dueFollowUps.length > 0 ? `
      <div class="card" style="margin-bottom:16px;border-left:4px solid var(--danger)">
        <h3 style="margin-bottom:8px">📞 Follow-Ups Due (${dueFollowUps.length})</h3>
        ${dueFollowUps.map(f => `<div style="padding:4px 0;font-size:14px">${f.customerName} — ${App.formatCurrency(f.invoiceTotal || 0)} — scheduled ${App.formatDate(f.followUpDate)}</div>`).join('')}
      </div>` : ''}

      ${overdueInv.length > 0 ? `
      <div class="card" style="margin-bottom:16px;border-left:4px solid var(--danger)">
        <h3 style="margin-bottom:8px">⚠️ Overdue Invoices (${overdueInv.length}) — ${App.formatCurrency(overdueTotal)}</h3>
        ${overdueInv.map(i => `<div style="padding:4px 0;font-size:14px">#${i.number} — ${i.customer || '—'} — ${App.formatCurrency(i.total)} — due ${App.formatDate(i.dueDate)}</div>`).join('')}
      </div>` : ''}

      ${upcomingMaint.length > 0 ? `
      <div class="card" style="margin-bottom:16px;border-left:4px solid var(--gold-dark, #c8a84e)">
        <h3 style="margin-bottom:8px">🔧 Upcoming Maintenance (${upcomingMaint.length})</h3>
        ${upcomingMaint.map(p => `<div style="padding:4px 0;font-size:14px">${p.customer} — ${p.planName} — ${App.formatDate(p.nextVisit)}</div>`).join('')}
      </div>` : ''}

      ${todayJobs.length > 0 ? `
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:8px">📋 Today's Jobs</h3>
        ${todayJobs.map(j => `<div style="padding:4px 0;font-size:14px">${j.customer || '—'} — ${j.title} — <span class="badge badge-${j.status==='completed'?'success':'warning'}">${j.status || 'scheduled'}</span></div>`).join('')}
      </div>` : ''}

      ${paidToday.length > 0 ? `
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:8px">💰 Payments Received Today</h3>
        ${paidToday.map(i => `<div style="padding:4px 0;font-size:14px">#${i.number} — ${i.customer || '—'} — ${App.formatCurrency(i.total)}</div>`).join('')}
      </div>` : ''}

      ${todayJobs.length === 0 && paidToday.length === 0 && dueFollowUps.length === 0 && overdueInv.length === 0 ? `
      <div class="card">
        <div class="empty-state">
          <h3>Quiet day — no activity recorded today</h3>
          <p>Schedule jobs, create quotes, or check follow-ups to get things moving.</p>
        </div>
      </div>` : ''}
    </div>
  `;
};

PageInit.eod = function() {};
const EOD = {
  logMileage() {
    const today = App.today();
    App.openModal(`
      <div class="modal-header"><h3>🚗 Log Mileage</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div class="form-group"><label>Date</label><input class="form-control" id="ml-date" type="date" value="${today}"></div>
      <div class="form-group"><label>Miles</label><input class="form-control" id="ml-miles" type="number" step="0.1" min="0" placeholder="e.g. 45.5"></div>
      <div class="form-group"><label>Purpose</label><input class="form-control" id="ml-purpose" placeholder="e.g. Job at 123 Main St, supply run"></div>
      <div class="form-group"><label>From → To (optional)</label><input class="form-control" id="ml-route" placeholder="e.g. Home → 123 Main St → Home"></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="EOD._saveMileage()">Log Miles</button>
      </div>
    `);
  },
  _saveMileage() {
    const miles = parseFloat(document.getElementById('ml-miles').value);
    if (!miles || miles <= 0) return App.toast('Enter miles driven', 'error');
    if (!App.state.mileage) App.state.mileage = [];
    App.state.mileage.push({
      id: App.genId(),
      date: document.getElementById('ml-date').value || App.today(),
      miles,
      purpose: document.getElementById('ml-purpose').value,
      route: document.getElementById('ml-route').value
    });
    App.saveState();
    App.closeModal();
    App.handleRoute();
    App.toast(`${miles} miles logged`);
  }
};
