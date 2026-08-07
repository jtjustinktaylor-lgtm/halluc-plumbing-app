// Dashboard Page — Modernized with trend indicators, richer layout
Pages.dashboard = function() {
  const s = App.state;
  const todayJobs = (s.jobs || []).filter(j => j.date === App.today());
  const pendingQuotes = (s.quotes || []).filter(q => q.status === 'pending');
  const quoteRequests = (s.quotes || []).filter(q => q.status === 'request');
  const unpaidInv = (s.invoices || []).filter(i => i.status !== 'paid');
  const overdueInv = App.getOverdueInvoices();
  const upcomingMaint = App.getUpcomingMaintenance();
  const totalRevenue = (s.invoices || []).filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.total || 0), 0);
  const totalExpenses = (s.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  const overdueTotal = overdueInv.reduce((sum, i) => sum + (i.total || 0), 0);

  // This month vs last month for trend indicators
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const monthRev = (s.invoices || []).filter(i => i.status === 'paid' && (i.date||'').startsWith(thisMonth))
    .reduce((sum, i) => sum + (i.total || 0), 0);
  const lastMonthRev = (s.invoices || []).filter(i => i.status === 'paid' && (i.date||'').startsWith(lastMonth))
    .reduce((sum, i) => sum + (i.total || 0), 0);
  const revTrend = lastMonthRev > 0 ? (((monthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(0) : null;

  const totalCustomers = (s.customers || []).length;
  const activePlans = (s.maintenancePlans || []).filter(p => p.status === 'active').length;

  return `
    <div class="page-header">
      <h2>Dashboard</h2>
      <p>Welcome back, Justin — ${new Date().toLocaleDateString('en-CA', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
    </div>

    ${quoteRequests.length > 0 ? `
    <div class="alert-card alert-gold">
      <div>
        <strong style="color:var(--gold-dark)">📋 ${quoteRequests.length} New Quote Request${quoteRequests.length>1?'s':''}</strong>
        <span style="margin-left:12px;color:var(--text-muted);font-size:13px">${quoteRequests.map(q => q.customer + (q.urgency==='emergency'?' 🚨':'')).join(', ')}</span>
      </div>
      <button class="btn btn-sm btn-primary" onclick="window.location.hash='quotes'">Review</button>
    </div>` : ''}

    ${overdueInv.length > 0 ? `
    <div class="alert-card alert-danger">
      <div>
        <strong style="color:var(--danger)" class="alert-pulse">${overdueInv.length} Overdue Invoice${overdueInv.length>1?'s':''}</strong>
        <span style="margin-left:12px;color:var(--text-muted);font-size:13px">Total outstanding: ${App.formatCurrency(overdueTotal)}</span>
        ${overdueInv.length > 0 ? `<div style="margin-top:6px;display:flex;gap:12px;font-size:11px">
          ${(() => { const d30=overdueInv.filter(i=>{const d=Math.floor((Date.now()-new Date(i.dueDate))/86400000);return d>=1&&d<=30});const d60=overdueInv.filter(i=>{const d=Math.floor((Date.now()-new Date(i.dueDate))/86400000);return d>30&&d<=60});const d90=overdueInv.filter(i=>{const d=Math.floor((Date.now()-new Date(i.dueDate))/86400000);return d>60});return (d30.length?`<span class="badge badge-warning">${d30.length} (1-30d)</span>`:'')+(d60.length?`<span class="badge badge-warning">${d60.length} (31-60d)</span>`:'')+(d90.length?`<span class="badge badge-danger">${d90.length} (60d+)</span>`:'')})()}
        </div>` : ''}
      </div>
      <button class="btn btn-sm btn-danger" onclick="window.location.hash='invoices'">View</button>
    </div>` : ''}

    ${(() => {
      const followUps = (App.state.followUps || []).filter(f => f.status === 'pending');
      const today = App.today();
      const dueFollowUps = followUps.filter(f => f.followUpDate <= today);
      if (dueFollowUps.length === 0) return '';
      return `
        <div class="alert-card alert-gold">
          <div>
            <strong style="color:var(--gold-dark)">📞 ${dueFollowUps.length} Follow-Up${dueFollowUps.length!==1?'s':''} Due</strong>
            <span style="margin-left:12px;color:var(--text-muted);font-size:13px">${dueFollowUps.map(f => f.customerName + ' — ' + App.formatCurrency(f.invoiceTotal)).join(', ')}</span>
          </div>
          <div style="display:flex;gap:6px">
            ${dueFollowUps.slice(0, 3).map(f => `
              <button class="btn btn-sm btn-primary" onclick="FollowUps.markDone('${f.id}')" title="Mark done">✓ ${f.customerName.split(' ')[0]}</button>
            `).join('')}
            <button class="btn btn-sm btn-outline" onclick="FollowUps.viewAll()">All</button>
          </div>
        </div>`;
    })()}
    ${upcomingMaint.length > 0 ? `
    <div class="alert-card alert-gold">
      <div>
        <strong style="color:var(--gold-dark)">🔧 ${upcomingMaint.length} Maintenance Visit${upcomingMaint.length>1?'s':''} Coming Up</strong>
        <span style="margin-left:12px;color:var(--text-muted);font-size:13px">${upcomingMaint.map(p => p.customer + ' — ' + App.formatDate(p.nextVisit)).join(', ')}</span>
      </div>
      <button class="btn btn-sm btn-primary" onclick="window.location.hash='maintenance'">View Plans</button>
    </div>` : ''}

    ${typeof Warranty !== 'undefined' && Warranty.getExpiring().length > 0 ? `
    <div class="alert-card alert-gold">
      <div>
        <strong style="color:var(--gold-dark)">🛡️ ${Warranty.getExpiring().length} Warrant${Warranty.getExpiring().length>1?'ies':'y'} Expiring Soon</strong>
        <span style="margin-left:12px;color:var(--text-muted);font-size:13px">${Warranty.getExpiring().map(w => w.customer + ' — ' + App.formatDate(w.expiryDate)).join(', ')}</span>
      </div>
      <button class="btn btn-sm btn-primary" onclick="window.location.hash='warranty'">Review</button>
    </div>` : ''}

    <div class="grid grid-4">
      <div class="stat-card">
        <div class="stat-icon" id="stat-today-jobs"></div>
        <div>
          <div class="stat-value">${todayJobs.length}</div>
          <div class="stat-label">Today's Jobs</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" id="stat-pending-quotes"></div>
        <div>
          <div class="stat-value">${pendingQuotes.length}</div>
          <div class="stat-label">Pending Quotes</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" id="stat-revenue"></div>
        <div>
          <div class="stat-value">${App.formatCurrency(totalRevenue)}</div>
          <div class="stat-label">Total Revenue</div>
          ${revTrend !== null ? `<div class="stat-trend ${Number(revTrend)>=0?'up':'down'}">${Number(revTrend)>=0?'↑':'↓'} ${Math.abs(revTrend)}% vs last month</div>` : ''}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" id="stat-profit"></div>
        <div>
          <div class="stat-value" style="color:${(totalRevenue-totalExpenses)>=0?'var(--success)':'var(--danger)'}">${App.formatCurrency(totalRevenue - totalExpenses)}</div>
          <div class="stat-label">Net Profit</div>
        </div>
      </div>
    </div>

    <div class="grid grid-3" style="margin-top:14px">
      <div class="stat-card" style="--stat-bg:var(--info-bg)">
        <div><div class="stat-value" style="font-size:20px">${totalCustomers}</div><div class="stat-label">Customers</div></div>
      </div>
      <div class="stat-card" style="--stat-bg:var(--success-bg)">
        <div><div class="stat-value" style="font-size:20px">${unpaidInv.length}</div><div class="stat-label">Unpaid Invoices</div></div>
      </div>
      <div class="stat-card" style="--stat-bg:var(--warning-bg)">
        <div><div class="stat-value" style="font-size:20px">${activePlans}</div><div class="stat-label">Active Plans</div></div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-top:20px">
      <div class="card">
        <div class="card-header"><h3>Today's Schedule</h3>
          <button class="btn btn-sm btn-primary" onclick="window.location.hash='scheduler'">View All</button>
        </div>
        ${todayJobs.length === 0
          ? '<div class="empty-state"><div class="icon" id="empty-scheduler"></div><h3>No jobs today</h3><p>Schedule a job to see it here</p></div>'
          : todayJobs.map(j => `<div style="padding:10px 0;border-bottom:1px solid var(--border-light);display:flex;gap:12px;align-items:start">
              <div style="width:8px;height:8px;border-radius:50%;background:var(--gold);margin-top:6px;flex-shrink:0"></div>
              <div style="flex:1">
                <strong style="font-size:14px">${j.title || 'Job'}</strong>
                <div style="font-size:13px;color:var(--text-muted);margin-top:2px">${j.time || 'All day'} — ${j.customer || 'No customer'}${j.address ? ' · ' + j.address : ''}</div>
              </div>
              <span class="badge badge-${j.status==='completed'?'success':j.status==='in-progress'?'info':'warning'}">${j.status||'scheduled'}</span>
            </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent Quotes</h3>
          <button class="btn btn-sm btn-primary" onclick="window.location.hash='quotes'">New Quote</button>
        </div>
        ${pendingQuotes.length === 0
          ? '<div class="empty-state"><div class="icon" id="empty-quotes"></div><h3>No pending quotes</h3><p>Create a quote to get started</p></div>'
          : pendingQuotes.slice(0,5).map(q => `<div style="padding:10px 0;border-bottom:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center">
              <div>
                <strong style="font-size:14px">${q.customer || 'Customer'}</strong>
                <div style="font-size:12px;color:var(--text-muted)">#${q.number} · ${App.formatDate(q.date)}</div>
              </div>
              <div style="text-align:right">
                <strong style="font-size:15px">${App.formatCurrency(q.total)}</strong>
                <div><span class="badge badge-warning">${q.status}</span></div>
              </div>
            </div>`).join('')}
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-header"><h3>Quick Actions</h3></div>
      <div class="quick-actions-grid">
        <div class="quick-action-card" onclick="window.location.hash='quotes';setTimeout(()=>Quotes.new(),200)">
          <div class="qa-icon">📋</div><div class="qa-label">New Quote</div>
        </div>
        <div class="quick-action-card" onclick="window.location.hash='invoices';setTimeout(()=>Invoices.new(),200)">
          <div class="qa-icon">💰</div><div class="qa-label">New Invoice</div>
        </div>
        <div class="quick-action-card" onclick="window.location.hash='scheduler';setTimeout(()=>Scheduler.addJob(),200)">
          <div class="qa-icon">📅</div><div class="qa-label">Schedule Job</div>
        </div>
        <div class="quick-action-card" onclick="window.location.hash='customers';setTimeout(()=>Customers.new(),200)">
          <div class="qa-icon">👤</div><div class="qa-label">Add Customer</div>
        </div>
        <div class="quick-action-card" onclick="window.location.hash='tracker'">
          <div class="qa-icon">📊</div><div class="qa-label">Profit Tracker</div>
        </div>
        <div class="quick-action-card" onclick="window.location.hash='rates'">
          <div class="qa-icon">💲</div><div class="qa-label">Rate Book</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-header"><h3>Quick Expense Entry</h3></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end">
        <div class="form-group" style="margin:0;flex:2"><label>Description</label><input class="form-control" id="qe-desc" placeholder="e.g. Copper pipe fittings"></div>
        <div class="form-group" style="margin:0;flex:1"><label>Amount ($)</label><input class="form-control" type="number" step="0.01" id="qe-amt" placeholder="0.00"></div>
        <div class="form-group" style="margin:0;flex:1"><label>Category</label>
          <select class="form-control" id="qe-cat">
            <option value="materials">Materials</option><option value="tools">Tools</option>
            <option value="fuel">Fuel</option><option value="vehicle">Vehicle</option>
            <option value="insurance">Insurance</option><option value="other">Other</option>
          </select></div>
        <button class="btn btn-primary" onclick="App._quickExpense()" style="height:40px">+ Add</button>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-header"><h3>Data Backup & Export</h3></div>
      <div style="display:flex;flex-wrap:wrap;gap:12px">
        <button class="btn btn-outline" onclick="App.exportData()">📥 Export All Data</button>
        <button class="btn btn-outline" onclick="App.importData()">📤 Import Backup</button>
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-light)">
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:8px">Tax-time CSV exports:</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button class="btn btn-sm btn-outline" onclick="App.exportCSV('invoices')">📊 Invoices</button>
          <button class="btn btn-sm btn-outline" onclick="App.exportCSV('expenses')">📊 Expenses</button>
          <button class="btn btn-sm btn-outline" onclick="App.exportCSV('customers')">📊 Customers</button>
        </div>
      </div>
    </div>`;
};
