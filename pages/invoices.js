// Invoices Page — with search/filter
Pages.invoices = function() {
  const invs = App.state.invoices || [];
  return `
    <div class="page-header"><h2>Invoices</h2><p>Create, track, and manage invoices</p></div>
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-primary" onclick="Invoices.new()">+ New Invoice</button>
      <input class="form-control" id="inv-search" placeholder="Search invoices..." style="max-width:250px" oninput="Invoices._filter()">
      <select class="form-control" id="inv-status-filter" style="max-width:160px" onchange="Invoices._filter()">
        <option value="">All Statuses</option>
        <option value="unpaid">Unpaid</option>
        <option value="overdue">Overdue</option>
        <option value="paid">Paid</option>
      </select>
      <button class="btn btn-outline" onclick="Invoices.exportFilteredCSV()">📊 Export CSV</button>
      <button class="btn btn-outline" onclick="App.exportCSV('annual')">📋 Annual Report CSV</button>
    </div>
    ${invs.length === 0
      ? '<div class="card"><div class="empty-state"><div class="icon">💰</div><h3>No invoices yet</h3><p>Create an invoice or convert a quote</p></div></div>'
      : `<div class="card"><div class="table-wrap"><table id="inv-table">
        <thead><tr><th>#</th><th>Customer</th><th>Date</th><th>Due</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${invs.map(i => `<tr class="inv-row" data-customer="${(i.customer||'').toLowerCase()}" data-status="${i.status}" data-number="${i.number}">
          <td>${i.number}</td><td>${App.esc(i.customer)||'—'}</td><td>${App.formatDate(i.date)}</td><td>${i.status==='overdue' && i.dueDate ? '<span class="aging-90">'+App.formatDate(i.dueDate)+' ('+Math.floor((Date.now()-new Date(i.dueDate))/86400000)+'d overdue)</span>' : App.formatDate(i.dueDate)}</td>
          <td>${App.formatCurrency(i.total)}</td>
          <td><span class="badge badge-${i.status==='paid'?'success':i.status==='overdue'?'danger':'warning'}">${i.status}</span></td>
          <td style="white-space:nowrap"><button class="btn btn-sm btn-outline" onclick="Invoices.view('${i.id}')">View</button>
            ${i.status!=='paid'?`<button class="btn btn-sm btn-primary" onclick="Invoices.markPaid('${i.id}')">Paid</button>`:''}
            ${i.status!=='paid'?`<button class="btn btn-sm btn-quick-pay" onclick="Invoices.recordPayment('${i.id}')">💵 Pay</button>`:''}
            ${i.status==='overdue'?`<button class="btn btn-sm btn-outline" onclick="Invoices.sendReminder('${i.id}')" title="Send payment reminder">📧 Remind${(i.reminders&&i.reminders.length)?' ('+i.reminders.length+')':''}</button>`:''}
            <button class="btn btn-sm btn-secondary" onclick="Invoices.print('${i.id}')">Print</button>
            <button class="btn btn-sm btn-danger" onclick="Invoices.remove('${i.id}')">✕</button></td>
        </tr>`).join('')}</tbody>
      </table></div></div>`}`;
};

PageInit.invoices = function() {
  Invoices._filter();
};

const Invoices = {
  _filter() {
    App.filterRows({ searchId: 'inv-search', statusId: 'inv-status-filter', rowClass: 'inv-row' });
  },

  new() {
    const id = App.genId();
    const num = App.state.nextInvoiceNum++;
    App.state.invoices.push({ id, number: num, date: App.today(), dueDate: '', customer:'', customerEmail:'', items:[], notes:'', status:'unpaid', subtotal:0, tax:0, total:0, taxExempt:false, payments:[] });
    App.saveState();
    this.edit(id);
  },
  edit(id) {
    const inv = App.state.invoices.find(x => x.id === id);
    if (!inv) return;
    App.openModal(this._form(inv));
  },
  _form(inv) {
    const cats = Object.entries(FLAT_RATES);
    const custs = (App.state.customers || []).map(c => `<option value="${c.name}" data-email="${c.email||''}" data-addr="${c.address||''}">${c.name}</option>`).join('');
    return `<div class="modal-header"><h3>Invoice #${inv.number}</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div class="form-group"><label>Customer</label>
        <select class="form-control" id="if-cust-select" onchange="Invoices._fillCustomer('${inv.id}',this.value)">
          <option value="">— Select existing or type below —</option>
          ${custs}
        </select>
        <input class="form-control" id="if-cust" value="${inv.customer||''}" placeholder="Or type customer name" style="margin-top:6px">
      </div>
      <div class="form-group"><label>Customer Email</label><input class="form-control" id="if-email" value="${inv.customerEmail||''}"></div>
      <div class="form-group"><label>Due Date</label><input class="form-control" type="date" id="if-due" value="${inv.dueDate||App.today()}"></div>
      <div class="form-group"><label>Add from Flat Rates</label>
        ${App.flatRateDropdown('if-add')}
        <button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="Invoices._addItem('${inv.id}')">+ Add</button>
      </div>
      <div class="form-group"><label>Custom Item</label>
        <div style="display:flex;gap:8px">
          <input class="form-control" id="if-custom-desc" placeholder="Description" style="flex:2">
          <input class="form-control" id="if-custom-price" type="number" step="0.01" placeholder="Price" style="flex:1">
          <button class="btn btn-sm btn-outline" onclick="Invoices._addCustom('${inv.id}')">+</button>
        </div>
      </div>
      <div id="if-items">${this._renderItems(inv)}</div>
      <div class="form-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="if-exempt" ${inv.taxExempt?'checked':''} onchange="Invoices._toggleTax('${inv.id}',this.checked)"> Tax Exempt (no HST)</label></div>
      <div class="form-group"><label>Notes</label><textarea class="form-control" id="if-notes">${inv.notes||''}</textarea></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="Invoices._save('${inv.id}');App.closeModal()">Save</button>
        <button class="btn btn-primary" onclick="Invoices._save('${inv.id}');Invoices._email('${inv.id}');App.closeModal()">Save & Email</button>
      </div>`;
  },
  _fillCustomer(iid, name) {
    if (!name) return;
    const c = App.state.customers.find(x => x.name === name);
    if (!c) return;
    document.getElementById('if-cust').value = c.name;
    document.getElementById('if-email').value = c.email || '';
  },
  _renderItems(inv) {
    if (!inv.items.length) return '<p style="color:var(--text-muted);font-size:13px">No items yet</p>';
    return `<table><thead><tr><th>Item</th><th>Price</th><th></th></tr></thead><tbody>
      ${inv.items.map((it,i) => `<tr><td>${it.desc}</td><td>${App.formatCurrency(it.price)}</td>
        <td><button class="btn btn-sm btn-danger" onclick="Invoices._removeItem('${inv.id}',${i})">✕</button></td></tr>`).join('')}
    </tbody></table>
    <div style="text-align:right;margin-top:8px">
      <div>Subtotal: ${App.formatCurrency(inv.subtotal)}</div>
      <div>${inv.taxExempt ? 'HST: Exempt' : 'HST (13%): ' + App.formatCurrency(inv.tax)}</div>
      <div style="font-size:18px;font-weight:700;color:var(--navy)">Total: ${App.formatCurrency(inv.total)}</div>
    </div>`;
  },
  _addItem(iid) {
    const sel = document.getElementById('if-add');
    const opt = sel.options[sel.selectedIndex];
    if (!opt.value) return;
    const inv = App.state.invoices.find(x => x.id === iid);
    inv.items.push({ desc: opt.textContent.split(' — ')[0], price: parseFloat(opt.dataset.price) });
    this._recalc(inv); App.saveState(); this._refresh(iid);
  },
  _addCustom(iid) {
    const desc = document.getElementById('if-custom-desc').value.trim();
    const price = parseFloat(document.getElementById('if-custom-price').value) || 0;
    if (!desc || !price) return App.toast('Enter description and price','error');
    const inv = App.state.invoices.find(x => x.id === iid);
    inv.items.push({ desc, price });
    this._recalc(inv); App.saveState(); this._refresh(iid);
  },
  _removeItem(iid, idx) {
    const inv = App.state.invoices.find(x => x.id === iid);
    inv.items.splice(idx, 1);
    this._recalc(inv); App.saveState(); this._refresh(iid);
  },
  _recalc(inv) {
    inv.subtotal = inv.items.reduce((s,i) => s + i.price, 0);
    inv.tax = inv.taxExempt ? 0 : +(inv.subtotal * TAX_RATE).toFixed(2);
    inv.total = +(inv.subtotal + inv.tax).toFixed(2);
  },
  _save(iid) {
    const inv = App.state.invoices.find(x => x.id === iid);
    inv.customer = document.getElementById('if-cust').value;
    inv.customerEmail = document.getElementById('if-email').value;
    inv.dueDate = document.getElementById('if-due').value;
    inv.notes = document.getElementById('if-notes')?.value || '';
    App.saveState(); App.handleRoute(); App.toast('Invoice saved');
  },
  _refresh(iid) {
    const inv = App.state.invoices.find(x => x.id === iid);
    document.getElementById('if-items').innerHTML = this._renderItems(inv);
  },
  _email(invId) {
    const inv = App.state.invoices.find(x => x.id === invId);
    if (!inv) return;
    const biz = App.getBusinessInfo();
    const body = `Hi ${inv.customer},\n\nInvoice #${inv.number} from ${biz.name}.\n\n` +
      inv.items.map(i => `${i.desc}: ${App.formatCurrency(i.price)}`).join('\n') +
      `\n\nSubtotal: ${App.formatCurrency(inv.subtotal)}\nHST: ${App.formatCurrency(inv.tax)}\nTotal: ${App.formatCurrency(inv.total)}` +
      `\n\nPayment due: ${inv.dueDate || 'Upon receipt'}\nPlease send e-transfer to ${biz.phone} or call to arrange payment.\n\nThanks,\n${biz.contact}\n${biz.name}`;
    window.open(`mailto:${inv.customerEmail}?subject=Invoice #${inv.number} — ${biz.name}&body=${encodeURIComponent(body)}`);
  },
  markPaid(id) {
    const inv = App.state.invoices.find(x => x.id === id);
    if (!inv) return;
    // Show signature capture modal before marking paid
    App.openModal(`
      <div class="modal-header">
        <h3>Mark as Paid — Invoice #${inv.number}</h3>
        <button class="modal-close" onclick="App.closeModal()">✕</button>
      </div>
      <p style="margin-bottom:12px"><strong>Customer:</strong> ${App.esc(inv.customer) || '—'}<br>
      <strong>Total:</strong> ${App.formatCurrency(inv.total)}</p>
      <div class="form-group">
        <label>Payment Method</label>
        <select class="form-control" id="paid-method">
          <option value="e-transfer">E-Transfer</option>
          <option value="cash">Cash</option>
          <option value="cheque">Cheque</option>
          <option value="card">Credit Card</option>
        </select>
      </div>
      <div class="form-group" id="inv-sig-pad"></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Invoices._confirmPaid('${id}')">Confirm Paid</button>
      </div>
    `);
    setTimeout(() => SignaturePad.render('inv-sig-pad', { existing: inv.signature || '', label: 'Customer Sign-Off (Optional)' }), 100);
  },
  _confirmPaid(id) {
    const inv = App.state.invoices.find(x => x.id === id);
    if (!inv) return;
    inv.status = 'paid';
    inv.paidDate = inv.paidDate || App.today();
    inv.paymentMethod = document.getElementById('paid-method').value;
    const sig = SignaturePad.toDataURL('inv-sig-pad');
    if (sig) inv.signature = sig;

    // Auto-create 30-day follow-up reminder
    if (!App.state.followUps) App.state.followUps = [];
    const alreadyScheduled = App.state.followUps.some(f => f.invoiceId === id && f.status === 'pending');
    if (!alreadyScheduled && inv.customer) {
      const followDate = new Date();
      followDate.setDate(followDate.getDate() + 30);
      App.state.followUps.push({
        id: App.genId(),
        customerId: (App.state.customers || []).find(c => c.name === inv.customer)?.id || '',
        customerName: inv.customer,
        invoiceId: id,
        invoiceTotal: inv.total,
        followUpDate: followDate.toISOString().slice(0, 10),
        status: 'pending',
        createdAt: App.today(),
        reason: 'post-job'
      });
    }

    App.saveState(); App.handleRoute(); App.toast('Invoice marked as paid');
  },
  recordPayment(id) {
    const inv = App.state.invoices.find(x => x.id === id);
    if (!inv) return;
    const paidSoFar = (inv.payments||[]).reduce((s,p)=>s+p.amount,0);
    const remaining = inv.total - paidSoFar;
    App.openModal(`
      <div class="modal-header"><h3>Record Payment — Invoice #${inv.number}</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <p style="margin-bottom:16px">Remaining balance: <strong>${App.formatCurrency(remaining)}</strong></p>
      <div class="form-group"><label>Amount</label><input class="form-control" type="number" step="0.01" id="pay-amt" value="${remaining.toFixed(2)}"></div>
      <div class="form-group"><label>Method</label>
        <select class="form-control" id="pay-method">
          <option value="e-transfer">E-Transfer</option><option value="cash">Cash</option>
          <option value="cheque">Cheque</option><option value="card">Credit Card</option>
        </select></div>
      <div class="form-group"><label>Notes</label><input class="form-control" id="pay-notes" placeholder="Optional"></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Invoices._savePayment('${id}')">Record Payment</button>
      </div>
    `);
  },
  _savePayment(id) {
    const inv = App.state.invoices.find(x => x.id === id);
    const amt = parseFloat(document.getElementById('pay-amt').value)||0;
    const method = document.getElementById('pay-method').value;
    const notes = document.getElementById('pay-notes').value;
    if (amt<=0) return App.toast('Enter an amount','error');
    if (!inv.payments) inv.payments = [];
    inv.payments.push({ amount:amt, method, notes, date:App.today() });
    const paidSoFar = inv.payments.reduce((s,p)=>s+p.amount,0);
    if (paidSoFar >= inv.total) inv.status = 'paid';
    App.saveState(); App.closeModal(); App.handleRoute();
    App.toast('Payment recorded: '+App.formatCurrency(amt));
  },
  view(id) { this.edit(id); },
  print(id) {
    const inv = App.state.invoices.find(x => x.id === id);
    if (!inv) return;
    const paidSoFar = (inv.payments || []).reduce((s, p) => s + p.amount, 0);
    const paymentInfo = inv.status === 'paid'
      ? `<p style="color:var(--success);font-weight:600">✓ Paid in full on ${App.formatDate(inv.paidDate || inv.date)}</p>`
      : `<p><strong>Amount Due:</strong> ${App.formatCurrency(inv.total - paidSoFar)}</p>`;

    const html = `
      <div style="margin-bottom:24px">
        <p><strong>Customer:</strong> ${App.esc(inv.customer)}</p>
        ${inv.address ? `<p><strong>Address:</strong> ${inv.address}</p>` : ''}
        <p><strong>Invoice #:</strong> ${inv.number}</p>
        <p><strong>Date:</strong> ${App.formatDate(inv.date)}</p>
        <p><strong>Due:</strong> ${App.formatDate(inv.dueDate)}</p>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th style="text-align:left;border-bottom:2px solid #333;padding:8px">Service</th><th style="text-align:right;border-bottom:2px solid #333;padding:8px">Amount</th></tr></thead>
        <tbody>
        ${inv.items.map(i => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.desc}</td><td style="text-align:right;padding:8px;border-bottom:1px solid #eee">${App.formatCurrency(i.price)}</td></tr>`).join('')}
        </tbody>
      </table>
      <div style="text-align:right;margin-top:12px;padding-top:12px;border-top:2px solid #333">
        <div>Subtotal: ${App.formatCurrency(inv.subtotal)}</div>
        <div>${inv.taxExempt ? 'HST: Exempt' : 'HST (13%): ' + App.formatCurrency(inv.tax)}</div>
        <div style="font-size:18px;font-weight:700;margin-top:4px">Total: ${App.formatCurrency(inv.total)}</div>
      </div>
      ${paymentInfo}
      ${inv.signature ? `<div style="margin-top:16px"><div style="font-size:12px;color:#666;margin-bottom:4px">Customer Sign-Off</div><img src="${inv.signature}" alt="Customer signature" style="max-width:200px;border:1px solid #ddd;border-radius:4px;background:#fff;padding:4px"></div>` : ''}
      ${inv.notes ? `<p style="margin-top:16px"><strong>Notes:</strong> ${inv.notes}</p>` : ''}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #ccc;font-size:11px;color:#666">
        <p><strong>Terms & Conditions</strong></p>
        <p>Payment is due within 30 days of invoice date. A late payment fee of 2% per month will be applied to overdue balances. All labour is warranted for one (1) year from the date of service. Parts are covered by manufacturer warranty. HST (13%) is included in all prices unless noted as tax-exempt. Diagnostic/service call fee of $99 applies and is waived on jobs over $500.</p>
        <p style="margin-top:12px"><strong>${App.getBusinessInfo().name}</strong><br>
        ${App.getBusinessInfo().contact}, Licensed Plumber<br>
        ${App.getBusinessInfo().address}<br>
        Tel: ${App.getBusinessInfo().phone}<br>
        Email: ${App.getBusinessInfo().email}${App.getBusinessInfo().hstNumber ? '<br>HST: ' + App.getBusinessInfo().hstNumber : ''}</p>
      </div>`;
    App.printSection(html, `Invoice #${inv.number}`);
  },
  _toggleTax(iid, checked) {
    const inv = App.state.invoices.find(x => x.id === iid);
    inv.taxExempt = checked;
    this._recalc(inv); App.saveState();
    this._refresh(iid);
  },
  async remove(id) {
    if (await App.confirm('Delete this invoice?')) {
      App.state.invoices = App.state.invoices.filter(i => i.id !== id);
      App.saveState(); App.handleRoute(); App.toast('Invoice deleted');
    }
  },

  sendReminder(id) {
    const inv = App.state.invoices.find(x => x.id === id);
    if (!inv) return;
    const daysOverdue = inv.dueDate ? Math.floor((Date.now() - new Date(inv.dueDate)) / 86400000) : 0;
    const paidSoFar = (inv.payments || []).reduce((s, p) => s + p.amount, 0);
    const remaining = inv.total - paidSoFar;
    const reminderCount = (inv.reminders || []).length + 1;

    App.openModal(`
      <div class="modal-header"><h3>Send Payment Reminder — Invoice #${inv.number}</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div style="margin-bottom:16px">
        <p><strong>Customer:</strong> ${App.esc(inv.customer)}</p>
        <p><strong>Amount Due:</strong> <span style="color:var(--danger);font-weight:700">${App.formatCurrency(remaining)}</span></p>
        <p><strong>Days Overdue:</strong> <span style="color:var(--danger)">${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}</span></p>
        <p><strong>Reminder #:</strong> ${reminderCount}</p>
        ${inv.reminders && inv.reminders.length > 0 ? `<p style="font-size:12px;color:var(--text-muted)">Previous reminders: ${inv.reminders.map(r => App.formatDate(r.date)).join(', ')}</p>` : ''}
      </div>
      <div class="form-group"><label>Reminder Method</label>
        <select class="form-control" id="rem-method">
          <option value="email">Email</option>
          <option value="phone">Phone Call</option>
          <option value="text">Text Message</option>
        </select></div>
      <div class="form-group"><label>Custom Message (optional)</label>
        <textarea class="form-control" id="rem-note" rows="3" placeholder="Add a personal note..."></textarea></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Invoices._sendReminderNow('${id}')">Send Reminder</button>
      </div>
    `);
  },

  _sendReminderNow(id) {
    const inv = App.state.invoices.find(x => x.id === id);
    if (!inv) return;
    const method = document.getElementById('rem-method').value;
    const note = document.getElementById('rem-note').value;
    const paidSoFar = (inv.payments || []).reduce((s, p) => s + p.amount, 0);
    const remaining = inv.total - paidSoFar;
    const daysOverdue = inv.dueDate ? Math.floor((Date.now() - new Date(inv.dueDate)) / 86400000) : 0;

    // Track reminder
    if (!inv.reminders) inv.reminders = [];
    inv.reminders.push({ date: App.today(), method, note, amount: remaining, daysOverdue });
    App.saveState();

    const biz = App.getBusinessInfo();

    // Open email for email method
    if (method === 'email' && inv.customerEmail) {
      const reminderNum = inv.reminders.length;
      const body = `Hi ${inv.customer},\n\nThis is a friendly reminder that Invoice #${inv.number} for ${App.formatCurrency(remaining)} is now ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue.\n\n` +
        `Original Amount: ${App.formatCurrency(inv.total)}\nAmount Due: ${App.formatCurrency(remaining)}\nDue Date: ${inv.dueDate || 'Upon receipt'}\n\n` +
        `Please arrange payment at your earliest convenience. E-transfer to ${biz.phone} or call to discuss.\n\n` +
        (note ? `Note: ${note}\n\n` : '') +
        `Thank you,\n${biz.contact}\n${biz.name}\n${biz.phone}`;
      window.open(`mailto:${inv.customerEmail}?subject=Payment Reminder — Invoice #${inv.number} (${daysOverdue} days overdue)&body=${encodeURIComponent(body)}`);
    }

    App.closeModal(); App.handleRoute();
    App.toast(`Reminder #${inv.reminders.length} sent via ${method}`);
  },

  exportFilteredCSV() {
    const search = (document.getElementById('inv-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('inv-status-filter')?.value || '';
    let invs = App.state.invoices || [];
    if (search) invs = invs.filter(i => (i.customer||'').toLowerCase().includes(search) || String(i.number).includes(search));
    if (statusFilter) invs = invs.filter(i => i.status === statusFilter);
    const rows = [['Invoice #','Date','Customer','Subtotal','HST','Total','Status','Paid Date','Payment Method']];
    invs.forEach(inv => {
      const lastPay = (inv.payments || []).at(-1);
      rows.push([inv.number, inv.date, inv.customer||'', inv.subtotal||0, inv.tax||0, inv.total||0, inv.status, inv.paidDate||'', lastPay ? lastPay.method : '']);
    });
    App.downloadCSV(rows, 'halluc-plumbing-invoices-' + App.today() + '.csv');
    App.toast('Invoices exported as CSV');
  }
};
