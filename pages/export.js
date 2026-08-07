// Export Page — QuickBooks/Xero Compatible Export
// Global: ExportPage

Pages.export = function() {
  const invoices = App.state.invoices || [];
  const expenses = App.state.expenses || [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');

  // Summary stats
  const totalInvoices = invoices.length;
  const totalInvoiceAmount = invoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalTaxCollected = invoices.reduce((s, i) => s + (Number(i.tax) || 0), 0);

  const exportHistory = App.state.exportHistory || [];

  return `
    <div class="page-header">
      <h2>📤 Export — QuickBooks & Xero</h2>
      <p>Export invoices and expenses in QBO XML or CSV format for import into accounting software</p>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-4" style="margin-bottom:16px">
      <div class="stat-card">
        <div class="stat-value">${totalInvoices}</div>
        <div class="stat-label">Invoices</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${App.formatCurrency(totalInvoiceAmount)}</div>
        <div class="stat-label">Invoice Total</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${App.formatCurrency(totalExpenses)}</div>
        <div class="stat-label">Total Expenses</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${App.formatCurrency(totalTaxCollected)}</div>
        <div class="stat-label">HST/GST Collected</div>
      </div>
    </div>

    <!-- Export Configuration -->
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">📅 Export Range & Format</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end;flex-wrap:wrap">
        <div class="form-group" style="margin-bottom:0">
          <label>Start Date</label>
          <input type="date" class="form-control" id="export-start" value="${currentYear}-01-01">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>End Date</label>
          <input type="date" class="form-control" id="export-end" value="${App.today()}">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>Format</label>
          <select class="form-control" id="export-format">
            <option value="csv">CSV (QuickBooks & Xero)</option>
            <option value="qbo">QBO XML (QuickBooks Online)</option>
            <option value="iif">IIF (QuickBooks Desktop)</option>
          </select>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline" onclick="ExportPage.preview()">👁️ Preview</button>
          <button class="btn btn-primary" onclick="ExportPage.download()">⬇️ Download</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="ExportPage.setRange('thisMonth')">This Month</button>
        <button class="btn btn-outline btn-sm" onclick="ExportPage.setRange('lastMonth')">Last Month</button>
        <button class="btn btn-outline btn-sm" onclick="ExportPage.setRange('thisQuarter')">This Quarter</button>
        <button class="btn btn-outline btn-sm" onclick="ExportPage.setRange('thisYear')">This Year</button>
        <button class="btn btn-outline btn-sm" onclick="ExportPage.setRange('lastYear')">Last Year</button>
      </div>
    </div>

    <!-- Preview Area -->
    <div class="card" style="margin-bottom:16px" id="export-preview-card" style="display:none">
      <h3 style="margin-bottom:12px">📋 Export Preview</h3>
      <div id="export-preview" style="font-size:13px;color:var(--text-muted)">Click <strong>Preview</strong> to see what will be exported.</div>
    </div>

    <!-- Tax Summary -->
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">🏛️ Tax Summary (HST/GST)</h3>
      ${ExportPage._renderTaxSummary(invoices, expenses)}
    </div>

    <!-- Export History -->
    <div class="card">
      <h3 style="margin-bottom:12px">📜 Export History</h3>
      ${exportHistory.length > 0 ? `
        <table class="table" style="font-size:13px">
          <thead><tr><th>Date</th><th>Format</th><th>Range</th><th>Records</th><th>File</th></tr></thead>
          <tbody>
            ${exportHistory.slice(-10).reverse().map(h => `
              <tr>
                <td>${App.formatDate(h.date)}</td>
                <td>${App.escapeHtml(h.format)}</td>
                <td>${App.escapeHtml(h.range)}</td>
                <td>${h.records}</td>
                <td>${App.escapeHtml(h.filename)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p style="color:var(--text-muted);font-size:13px">No exports yet. Use the controls above to export your data.</p>'}
    </div>
  `;
};

PageInit.export = function() {};

const ExportPage = {
  _getFilteredData() {
    const startDate = document.getElementById('export-start')?.value || '';
    const endDate = document.getElementById('export-end')?.value || '';
    const invoices = (App.state.invoices || []).filter(inv => {
      if (startDate && inv.date < startDate) return false;
      if (endDate && inv.date > endDate) return false;
      return true;
    });
    const expenses = (App.state.expenses || []).filter(exp => {
      if (startDate && exp.date < startDate) return false;
      if (endDate && exp.date > endDate) return false;
      return true;
    });
    return { invoices, expenses, startDate, endDate };
  },

  _renderTaxSummary(invoices, expenses) {
    // Group tax by quarter
    const quarters = {};
    invoices.forEach(inv => {
      if (!inv.date) return;
      const d = new Date(inv.date);
      const q = Math.ceil((d.getMonth() + 1) / 3);
      const key = d.getFullYear() + ' Q' + q;
      if (!quarters[key]) quarters[key] = { collected: 0, invoiced: 0, count: 0 };
      quarters[key].collected += Number(inv.tax) || 0;
      quarters[key].invoiced += Number(inv.total) || 0;
      quarters[key].count++;
    });

    const entries = Object.entries(quarters).sort((a, b) => b[0].localeCompare(a[0]));
    if (entries.length === 0) {
      return '<p style="color:var(--text-muted);font-size:13px">No invoice data available for tax summary.</p>';
    }

    return `
      <table class="table" style="font-size:13px">
        <thead><tr><th>Period</th><th>Invoices</th><th>Invoiced (Pre-Tax)</th><th>HST/GST Collected</th></tr></thead>
        <tbody>
          ${entries.map(([period, data]) => `
            <tr>
              <td><strong>${App.escapeHtml(period)}</strong></td>
              <td>${data.count}</td>
              <td>${App.formatCurrency(data.invoiced - data.collected)}</td>
              <td style="color:var(--primary);font-weight:600">${App.formatCurrency(data.collected)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="font-weight:700">
            <td>Total</td>
            <td>${entries.reduce((s, [,d]) => s + d.count, 0)}</td>
            <td>${App.formatCurrency(entries.reduce((s, [,d]) => s + d.invoiced - d.collected, 0))}</td>
            <td style="color:var(--primary)">${App.formatCurrency(entries.reduce((s, [,d]) => s + d.collected, 0))}</td>
          </tr>
        </tfoot>
      </table>
    `;
  },

  setRange(preset) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    let start, end;

    switch (preset) {
      case 'thisMonth':
        start = new Date(year, month, 1);
        end = today;
        break;
      case 'lastMonth':
        start = new Date(year, month - 1, 1);
        end = new Date(year, month, 0);
        break;
      case 'thisQuarter': {
        const qStart = Math.floor(month / 3) * 3;
        start = new Date(year, qStart, 1);
        end = today;
        break;
      }
      case 'thisYear':
        start = new Date(year, 0, 1);
        end = today;
        break;
      case 'lastYear':
        start = new Date(year - 1, 0, 1);
        end = new Date(year - 1, 11, 31);
        break;
    }

    const startEl = document.getElementById('export-start');
    const endEl = document.getElementById('export-end');
    if (startEl) startEl.value = start.toISOString().split('T')[0];
    if (endEl) endEl.value = end.toISOString().split('T')[0];
  },

  preview() {
    const { invoices, expenses, startDate, endDate } = this._getFilteredData();
    const format = document.getElementById('export-format')?.value || 'csv';
    const previewEl = document.getElementById('export-preview');
    if (!previewEl) return;

    if (invoices.length === 0 && expenses.length === 0) {
      previewEl.innerHTML = '<p style="color:var(--warning,#e5a500)">⚠️ No records found in the selected date range.</p>';
      return;
    }

    let html = `<div style="margin-bottom:12px">
      <strong>${invoices.length}</strong> invoice(s) · <strong>${expenses.length}</strong> expense(s) ·
      Range: <strong>${startDate || 'Start'}</strong> to <strong>${endDate || 'End'}</strong>
    </div>`;

    if (format === 'csv') {
      const rows = this._buildCSVRows(invoices, expenses);
      html += `<div style="max-height:300px;overflow:auto;background:var(--bg-secondary);border-radius:6px;padding:8px">
        <table style="font-size:11px;width:100%;border-collapse:collapse">
          <thead><tr style="background:var(--primary);color:white">
            ${rows[0].map(c => `<th style="padding:4px 6px;text-align:left;white-space:nowrap">${App.escapeHtml(c)}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${rows.slice(1, 26).map(r => `<tr>${r.map(c => `<td style="padding:3px 6px;border-bottom:1px solid var(--border);white-space:nowrap">${App.escapeHtml(c)}</td>`).join('')}</tr>`).join('')}
            ${rows.length > 26 ? `<tr><td colspan="${rows[0].length}" style="padding:6px;color:var(--text-muted);font-style:italic">… and ${rows.length - 26} more rows</td></tr>` : ''}
          </tbody>
        </table>
      </div>`;
    } else {
      html += `<div style="max-height:300px;overflow:auto;background:var(--bg-secondary);border-radius:6px;padding:8px">
        <pre style="font-size:11px;margin:0;white-space:pre-wrap">${App.escapeHtml(format === 'qbo' ? this._buildQBOXML(invoices, expenses, startDate, endDate).substring(0, 3000) + '\n...' : this._buildIIF(invoices, expenses).substring(0, 3000) + '\n...')}</pre>
      </div>`;
    }

    previewEl.innerHTML = html;
  },

  download() {
    const { invoices, expenses, startDate, endDate } = this._getFilteredData();
    const format = document.getElementById('export-format')?.value || 'csv';

    if (invoices.length === 0 && expenses.length === 0) {
      App.toast('No records to export in the selected range', 'warning');
      return;
    }

    let content, filename, mimeType;

    if (format === 'csv') {
      const rows = this._buildCSVRows(invoices, expenses);
      content = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
      filename = `halluc-plumbing-export-${startDate}-to-${endDate}.csv`;
      mimeType = 'text/csv';
    } else if (format === 'qbo') {
      content = this._buildQBOXML(invoices, expenses, startDate, endDate);
      filename = `halluc-plumbing-export-${startDate}-to-${endDate}.qbo`;
      mimeType = 'application/xml';
    } else {
      content = this._buildIIF(invoices, expenses);
      filename = `halluc-plumbing-export-${startDate}-to-${endDate}.iif`;
      mimeType = 'text/plain';
    }

    // Trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    // Log to export history
    if (!App.state.exportHistory) App.state.exportHistory = [];
    App.state.exportHistory.push({
      id: App.genId(),
      date: App.today(),
      format: format.toUpperCase(),
      range: `${startDate} to ${endDate}`,
      records: invoices.length + expenses.length,
      filename: filename
    });
    // Keep only last 50 entries
    if (App.state.exportHistory.length > 50) {
      App.state.exportHistory = App.state.exportHistory.slice(-50);
    }
    App.saveState();

    App.toast(`Exported ${invoices.length + expenses.length} records as ${format.toUpperCase()}`);
    App.handleRoute(); // Refresh to show history
  },

  _buildCSVRows(invoices, expenses) {
    const headers = ['Date', 'Type', 'Number', 'Customer/Vendor', 'Description', 'Amount', 'Tax', 'Total', 'Status'];
    const rows = [headers];

    invoices.forEach(inv => {
      const desc = (inv.items || []).map(i => i.desc).join('; ');
      rows.push([
        inv.date || '',
        'Invoice',
        inv.number || '',
        inv.customer || '',
        desc,
        (Number(inv.subtotal) || 0).toFixed(2),
        (Number(inv.tax) || 0).toFixed(2),
        (Number(inv.total) || 0).toFixed(2),
        inv.status || ''
      ]);
    });

    expenses.forEach(exp => {
      rows.push([
        exp.date || '',
        'Expense',
        exp.id || '',
        exp.vendor || '',
        exp.desc || '',
        (Number(exp.amount) || 0).toFixed(2),
        '0.00',
        (Number(exp.amount) || 0).toFixed(2),
        'paid'
      ]);
    });

    return rows;
  },

  _buildQBOXML(invoices, expenses, startDate, endDate) {
    const biz = App.getBusinessInfo();
    const now = new Date().toISOString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="220" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>
<OFX>
  <SIGNONMSGSRSV1>
    <SONRS>
      <STATUS><CODE>0<SEVERITY>INFO</STATUS>
      <DTSERVER>${now.replace(/[-:T]/g, '').slice(0, 14)}
      <LANGUAGE>ENG
    </SONRS>
  </SIGNONMSGSRSV1>
  <INVSTMTMSGSRSV1>
    <INVSTMTTRNRS>
      <TRNUID>${App.genId()}
      <STATUS><CODE>0<SEVERITY>INFO</STATUS>
      <INVSTMTRS>
        <DTASOF>${now.replace(/[-:T]/g, '').slice(0, 14)}
        <CURDEF>CAD
        <INVACCTFROM>
          <ACCTID>HALLUC-PLUMBING
        </INVACCTFROM>
        <INVBANKTRAN>
          <STMTTRN>
`;

    invoices.forEach(inv => {
      const txnDate = (inv.date || '').replace(/-/g, '');
      xml += `            <STMTTRN>
              <TRNTYPE>CREDIT
              <DTPOSTED>${txnDate}
              <TRNAMT>${(Number(inv.total) || 0).toFixed(2)}
              <FITID>${inv.number || inv.id}
              <NAME>${this._escapeXml(inv.customer || 'Customer')}
              <MEMO>Invoice ${inv.number || ''} — ${this._escapeXml((inv.items || []).map(i => i.desc).join(', '))}
            </STMTTRN>
`;
    });

    expenses.forEach(exp => {
      const txnDate = (exp.date || '').replace(/-/g, '');
      xml += `            <STMTTRN>
              <TRNTYPE>DEBIT
              <DTPOSTED>${txnDate}
              <TRNAMT>-${(Number(exp.amount) || 0).toFixed(2)}
              <FITID>${exp.id}
              <NAME>${this._escapeXml(exp.vendor || 'Vendor')}
              <MEMO>Expense — ${this._escapeXml(exp.desc || '')}
            </STMTTRN>
`;
    });

    xml += `          </STMTTRN>
        </INVBANKTRAN>
      </INVSTMTRS>
    </INVSTMTTRNRS>
  </INVSTMTMSGSRSV1>
</OFX>`;

    return xml;
  },

  _buildIIF(invoices, expenses) {
    let iif = '!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\n';
    iif += '!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\n';
    iif += '!ENDTRNS\n';

    invoices.forEach(inv => {
      const desc = (inv.items || []).map(i => i.desc).join('; ');
      iif += `TRNS\tINVOICE\t${inv.date || ''}\tAccounts Receivable\t${inv.customer || ''}\t${(Number(inv.total) || 0).toFixed(2)}\t${inv.number || ''}\t${desc}\n`;
      iif += `SPL\tINVOICE\t${inv.date || ''}\tSales\t${inv.customer || ''}\t${(Number(inv.subtotal) || 0).toFixed(2)}\t${inv.number || ''}\t${desc}\n`;
      if (Number(inv.tax) > 0) {
        iif += `SPL\tINVOICE\t${inv.date || ''}\tHST/GST Collected\t${inv.customer || ''}\t${(Number(inv.tax) || 0).toFixed(2)}\t${inv.number || ''}\tTax\n`;
      }
      iif += 'ENDTRNS\n';
    });

    expenses.forEach(exp => {
      iif += `TRNS\tCHECK\t${exp.date || ''}\tBank\t${exp.vendor || ''}\t-${(Number(exp.amount) || 0).toFixed(2)}\t${exp.id || ''}\t${exp.desc || ''}\n`;
      iif += `SPL\tCHECK\t${exp.date || ''}\t${(exp.category || 'Expense').replace(/\t/g, ' ')}\t${exp.vendor || ''}\t${(Number(exp.amount) || 0).toFixed(2)}\t${exp.id || ''}\t${exp.desc || ''}\n`;
      iif += 'ENDTRNS\n';
    });

    return iif;
  },

  _escapeXml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
};
