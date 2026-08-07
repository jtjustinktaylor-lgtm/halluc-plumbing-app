// Profit Tracker Page — with Year-End Summary & Job Costing
Pages.tracker = function() {
  const exps = App.state.expenses || [];
  const invs = App.state.invoices || [];
  const quotes = App.state.quotes || [];
  const paidInvs = invs.filter(i => i.status === 'paid');
  const totalRev = paidInvs.reduce((s,i) => s + (i.total||0), 0);
  const totalExp = exps.reduce((s,e) => s + (e.amount||0), 0);
  const profit = totalRev - totalExp;
  const thisMonth = new Date().toISOString().slice(0,7);
  const monthExp = exps.filter(e => (e.date||'').startsWith(thisMonth));
  const monthRev = paidInvs.filter(i => (i.date||'').startsWith(thisMonth));
  const mRev = monthRev.reduce((s,i)=>s+i.total,0);
  const mExp = monthExp.reduce((s,e)=>s+e.amount,0);

  // Year-end summary data
  const year = new Date().getFullYear();
  const yearStr = String(year);
  const yearInvs = paidInvs.filter(i => (i.date||'').startsWith(yearStr));
  const yearExps = exps.filter(e => (e.date||'').startsWith(yearStr));
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyData = months.map((m,idx) => {
    const prefix = yearStr + '-' + String(idx+1).padStart(2,'0');
    const rev = yearInvs.filter(i=>(i.date||'').startsWith(prefix)).reduce((s,i)=>s+i.total,0);
    const exp = yearExps.filter(e=>(e.date||'').startsWith(prefix)).reduce((s,e)=>s+e.amount,0);
    return { month:m, rev, exp, profit: rev-exp };
  });
  const yearRev = yearInvs.reduce((s,i)=>s+i.total,0);
  const yearExp = yearExps.reduce((s,e)=>s+e.amount,0);

  // Top customers this year
  const custTotals = {};
  yearInvs.forEach(i => { custTotals[i.customer||'Unknown'] = (custTotals[i.customer||'Unknown']||0) + i.total; });
  const topCusts = Object.entries(custTotals).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Job costing: quotes with actual costs
  const costedQuotes = quotes.filter(q => q.actualMaterials != null || q.actualLabor != null);

  return `
    <div class="page-header"><h2>Profit Tracker</h2><p>Track revenue, expenses, and profitability</p></div>
    <div class="grid grid-4">
      <div class="stat-card"><div class="stat-icon" id="stat-tracker-revenue"></div><div><div class="stat-value">${App.formatCurrency(totalRev)}</div><div class="stat-label">Total Revenue</div></div></div>
      <div class="stat-card"><div class="stat-icon" id="stat-tracker-expenses"></div><div><div class="stat-value">${App.formatCurrency(totalExp)}</div><div class="stat-label">Total Expenses</div></div></div>
      <div class="stat-card"><div class="stat-icon" id="stat-tracker-profit"></div><div><div class="stat-value" style="color:${profit>=0?'var(--success)':'var(--danger)'}">${App.formatCurrency(profit)}</div><div class="stat-label">Net Profit</div></div></div>
      <div class="stat-card"><div class="stat-icon" id="stat-tracker-month"></div><div><div class="stat-value">${App.formatCurrency(mRev-mExp)}</div><div class="stat-label">This Month</div></div></div>
    </div>

    <!-- Year-End Summary Report -->
    <div class="card" style="margin-top:20px">
      <div class="card-header"><h3>📊 Year-End Summary — ${year}</h3>
        <button class="btn btn-sm btn-outline" onclick="Tracker.printYearEnd()">🖨️ Print Report</button></div>
      <div class="grid grid-3" style="margin-bottom:16px">
        <div class="stat-card"><div><div class="stat-value">${App.formatCurrency(yearRev)}</div><div class="stat-label">${year} Revenue</div></div></div>
        <div class="stat-card"><div><div class="stat-value">${App.formatCurrency(yearExp)}</div><div class="stat-label">${year} Expenses</div></div></div>
        <div class="stat-card"><div><div class="stat-value" style="color:${(yearRev-yearExp)>=0?'var(--success)':'var(--danger)'}">${App.formatCurrency(yearRev-yearExp)}</div><div class="stat-label">${year} Net Profit</div></div></div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Profit</th></tr></thead>
        <tbody>${monthlyData.map(m => `<tr><td>${m.month}</td><td>${App.formatCurrency(m.rev)}</td><td>${App.formatCurrency(m.exp)}</td>
          <td style="color:${m.profit>=0?'var(--success)':'var(--danger)'}">${App.formatCurrency(m.profit)}</td></tr>`).join('')}
          <tr style="font-weight:700;border-top:2px solid var(--navy)"><td>Total</td><td>${App.formatCurrency(yearRev)}</td><td>${App.formatCurrency(yearExp)}</td>
          <td style="color:${(yearRev-yearExp)>=0?'var(--success)':'var(--danger)'}">${App.formatCurrency(yearRev-yearExp)}</td></tr></tbody></table></div>
      ${topCusts.length > 0 ? `<div style="margin-top:16px"><strong>Top Customers (${year}):</strong>
        <ol style="margin:8px 0 0 20px">${topCusts.map(([name,amt])=>`<li>${name} — ${App.formatCurrency(amt)}</li>`).join('')}</ol></div>` : ''}
    </div>

    <!-- Job Costing Section -->
    ${costedQuotes.length > 0 ? `<div class="card" style="margin-top:20px">
      <div class="card-header"><h3>🔧 Job Costing — Quoted vs Actual</h3></div>
      <div class="table-wrap"><table><thead><tr><th>Quote #</th><th>Customer</th><th>Quoted</th><th>Materials</th><th>Labor</th><th>Actual Total</th><th>Margin</th></tr></thead>
        <tbody>${costedQuotes.map(q => {
          const actual = (q.actualMaterials||0) + (q.actualLabor||0);
          const margin = q.total - actual;
          const pct = q.total > 0 ? ((margin/q.total)*100).toFixed(1) : '0';
          return `<tr><td>#${q.number}</td><td>${q.customer||'—'}</td><td>${App.formatCurrency(q.total)}</td>
            <td>${App.formatCurrency(q.actualMaterials||0)}</td><td>${App.formatCurrency(q.actualLabor||0)}</td>
            <td>${App.formatCurrency(actual)}</td>
            <td style="color:${margin>=0?'var(--success)':'var(--danger)'}">${App.formatCurrency(margin)} (${pct}%)</td></tr>`;
        }).join('')}</tbody></table></div>
    </div>` : ''}

    <div class="grid grid-2" style="margin-top:20px">
      <div class="card">
        <div class="card-header"><h3>Expenses</h3>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-primary" onclick="Tracker.addExpense()">+ Add</button>
            <button class="btn btn-sm btn-outline" onclick="Tracker.exportExpensesCSV()">📊 Export CSV</button>
            <button class="btn btn-sm btn-outline" onclick="App.exportCSV('annual')">📋 Annual Report CSV</button>
          </div>
        </div>
        ${exps.length === 0 ? '<p style="color:var(--text-muted)">No expenses recorded</p>' :
          `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th></th></tr></thead>
            <tbody>${exps.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20).map(e => `<tr>
              <td>${App.formatDate(e.date)}</td><td>${e.desc}</td><td>${e.category||'—'}</td><td>${App.formatCurrency(e.amount)}</td>
              <td><button class="btn btn-sm btn-danger" onclick="Tracker.removeExpense('${e.id}')">✕</button></td>
            </tr>`).join('')}</tbody></table></div>`}
      </div>
      <div class="card">
        <div class="card-header"><h3>Revenue (Paid Invoices)</h3></div>
        ${paidInvs.length === 0 ? '<p style="color:var(--text-muted)">No paid invoices yet</p>' :
          `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Amount</th></tr></thead>
            <tbody>${paidInvs.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20).map(i => `<tr>
              <td>${App.formatDate(i.date)}</td><td>#${i.number}</td><td>${i.customer||'—'}</td><td>${App.formatCurrency(i.total)}</td>
            </tr>`).join('')}</tbody></table></div>`}
      </div>
    </div>`;
};

const Tracker = {
  addExpense() {
    App.openModal(`<div class="modal-header"><h3>Add Expense</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div class="form-group"><label>Date</label><input class="form-control" type="date" id="ef-date" value="${App.today()}"></div>
      <div class="form-group"><label>Description</label><input class="form-control" id="ef-desc"></div>
      <div class="form-group"><label>Category</label>
        <select class="form-control" id="ef-cat">
          <option>Materials</option><option>Tools</option><option>Vehicle</option><option>Insurance</option>
          <option>Advertising</option><option>Phone/Internet</option><option>Office</option><option>Other</option>
        </select></div>
      <div class="form-group"><label>Amount ($)</label><input class="form-control" type="number" step="0.01" id="ef-amt"></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Tracker._saveExpense()">Add Expense</button>
      </div>`);
  },
  _saveExpense() {
    const desc = document.getElementById('ef-desc').value.trim();
    const amt = parseFloat(document.getElementById('ef-amt').value)||0;
    if (!desc || !amt) return App.toast('Fill in all fields','error');
    App.state.expenses.push({
      id: App.genId(), date: document.getElementById('ef-date').value,
      desc, category: document.getElementById('ef-cat').value, amount: amt
    });
    App.saveState(); App.closeModal(); App.handleRoute(); App.toast('Expense added');
  },
  async removeExpense(id) {
    if (await App.confirm('Delete this expense?')) {
      App.state.expenses = App.state.expenses.filter(e => e.id !== id);
      App.saveState(); App.handleRoute(); App.toast('Expense deleted');
    }
  },

  exportExpensesCSV() {
    const exps = App.state.expenses || [];
    const rows = [['Date','Category','Description','Amount','Vendor']];
    exps.forEach(e => {
      rows.push([e.date, e.category||'', e.desc, e.amount, e.vendor||'']);
    });
    App.downloadCSV(rows, 'halluc-plumbing-expenses-' + App.today() + '.csv');
    App.toast('Expenses exported as CSV');
  },

  printYearEnd() {
    const year = new Date().getFullYear();
    const yearStr = String(year);
    const paidInvs = (App.state.invoices||[]).filter(i => i.status === 'paid' && (i.date||'').startsWith(yearStr));
    const exps = (App.state.expenses||[]).filter(e => (e.date||'').startsWith(yearStr));
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const yearRev = paidInvs.reduce((s,i)=>s+i.total,0);
    const yearExp = exps.reduce((s,e)=>s+e.amount,0);
    const custTotals = {};
    paidInvs.forEach(i => { custTotals[i.customer||'Unknown'] = (custTotals[i.customer||'Unknown']||0) + i.total; });
    const topCusts = Object.entries(custTotals).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const catTotals = {};
    exps.forEach(e => { catTotals[e.category||'Other'] = (catTotals[e.category||'Other']||0) + e.amount; });
    const rows = months.map((m,idx) => {
      const prefix = yearStr + '-' + String(idx+1).padStart(2,'0');
      const rev = paidInvs.filter(i=>(i.date||'').startsWith(prefix)).reduce((s,i)=>s+i.total,0);
      const exp = exps.filter(e=>(e.date||'').startsWith(prefix)).reduce((s,e)=>s+e.amount,0);
      return `<tr><td>${m}</td><td>${App.formatCurrency(rev)}</td><td>${App.formatCurrency(exp)}</td><td style="color:${(rev-exp)>=0?'#16a34a':'#dc2626'}">${App.formatCurrency(rev-exp)}</td></tr>`;
    }).join('');
    App.printSection(`
      <div style="text-align:center;margin-bottom:24px">
        <h2 style="color:#1B3A5C;margin:0">Halluc Plumbing</h2>
        <p style="color:#666">Year-End Summary Report — ${year}</p>
        <p style="color:#666;font-size:12px">${App.getBusinessInfo().contact} • ${App.getBusinessInfo().address} • ${App.getBusinessInfo().phone}</p>
      </div>
      <div style="display:flex;justify-content:space-around;margin:24px 0;padding:16px;background:#f8f9fa;border-radius:8px">
        <div style="text-align:center"><div style="font-size:12px;color:#666">Total Revenue</div><div style="font-size:20px;font-weight:700">${App.formatCurrency(yearRev)}</div></div>
        <div style="text-align:center"><div style="font-size:12px;color:#666">Total Expenses</div><div style="font-size:20px;font-weight:700">${App.formatCurrency(yearExp)}</div></div>
        <div style="text-align:center"><div style="font-size:12px;color:#666">Net Profit</div><div style="font-size:20px;font-weight:700;color:${(yearRev-yearExp)>=0?'#16a34a':'#dc2626'}">${App.formatCurrency(yearRev-yearExp)}</div></div>
      </div>
      <h3>Monthly Breakdown</h3>
      <table><thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Profit</th></tr></thead><tbody>${rows}
        <tr style="font-weight:700;border-top:2px solid #1B3A5C"><td>Total</td><td>${App.formatCurrency(yearRev)}</td><td>${App.formatCurrency(yearExp)}</td><td style="color:${(yearRev-yearExp)>=0?'#16a34a':'#dc2626'}">${App.formatCurrency(yearRev-yearExp)}</td></tr></tbody></table>
      ${topCusts.length > 0 ? `<h3 style="margin-top:24px">Top Customers</h3><ol>${topCusts.map(([name,amt])=>`<li>${name} — ${App.formatCurrency(amt)}</li>`).join('')}</ol>` : ''}
      ${Object.keys(catTotals).length > 0 ? `<h3 style="margin-top:24px">Expenses by Category</h3><table><thead><tr><th>Category</th><th>Total</th></tr></thead><tbody>${Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>`<tr><td>${cat}</td><td>${App.formatCurrency(amt)}</td></tr>`).join('')}</tbody></table>` : ''}
      <div style="margin-top:32px;font-size:11px;color:#999;text-align:center">Generated ${new Date().toLocaleDateString('en-CA')} — Halluc Plumbing Business Manager</div>
    `, year + ' Year-End Summary');
  }
};
