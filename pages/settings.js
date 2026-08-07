// Settings Page — Formspree config, backup/restore, data management
Pages.settings = function() {
  const formspree = App.state.formspreeEndpoint || '';
  const backups = App.getBackupInfo();
  const stateSize = (JSON.stringify(App.state).length / 1024).toFixed(1);
  const storageLimit = 5120; // 5MB typical localStorage limit
  const usagePercent = (stateSize / storageLimit * 100).toFixed(1);
  const isWarning = usagePercent > 60;
  const isCritical = usagePercent > 80;
  const totalCustomers = (App.state.customers || []).length;
  const totalInvoices = (App.state.invoices || []).length;
  const totalQuotes = (App.state.quotes || []).length;
  const totalJobs = (App.state.jobs || []).length;

  return `
    <div class="page-header">
      <h2>Settings</h2>
      <p>Configure your app, manage backups, and set up integrations</p>
    </div>

    <!-- Formspree Configuration -->
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">📧 Formspree — Contact Form Endpoint</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">
        Your booking, quote request, and referral forms submit to Formspree. Create a free form at
        <a href="https://formspree.io" target="_blank" rel="noopener" style="color:var(--primary)">formspree.io</a>
        and paste your endpoint below.
      </p>
      <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:250px;margin-bottom:0">
          <label>Formspree Endpoint</label>
          <input class="form-control" id="set-formspree" value="${formspree}" placeholder="https://formspree.io/f/your-form-id">
        </div>
        <button class="btn btn-primary" onclick="Settings.saveFormspree()">Save</button>
      </div>
      ${formspree ? `<p style="color:var(--success);font-size:12px;margin-top:8px">✓ Forms will submit to: ${formspree}</p>` : `<p style="color:var(--warning,#e5a500);font-size:12px;margin-top:8px">⚠ No endpoint configured — forms will fall back to phone call</p>`}
    </div>

    <!-- Backup & Restore -->
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">💾 Backup & Restore</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">
        Auto-backup runs daily (7-day rolling). You can also manually export or restore.
      </p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
        <button class="btn btn-primary" onclick="App.exportData()">📦 Export All Data</button>
        <button class="btn btn-outline" onclick="App.importData()">📥 Import from File</button>
        <button class="btn btn-outline" onclick="App.restoreFromBackup()">🔄 Restore from Auto-Backup</button>
      </div>
      ${backups.length > 0 ? `
      <div style="font-size:13px;color:var(--text-muted)">
        <strong>Auto-backups available:</strong> ${backups.map(b => `${b.date} (${b.size})`).join(' · ')}
      </div>` : '<p style="font-size:13px;color:var(--text-muted)">No auto-backups yet. They are created daily as you use the app.</p>'}
    </div>

    <!-- Data Summary -->
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">📊 Data Summary</h3>
      <div class="grid grid-4">
        <div class="stat-card">
          <div class="stat-value">${totalCustomers}</div>
          <div class="stat-label">Customers</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalQuotes}</div>
          <div class="stat-label">Quotes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalInvoices}</div>
          <div class="stat-label">Invoices</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalJobs}</div>
          <div class="stat-label">Jobs</div>
        </div>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin-top:8px">Storage used: ${stateSize} KB of ~5 MB (${usagePercent}%)</p>
      <div style="margin-top:8px;background:var(--border,#e0e0e0);border-radius:4px;height:8px;overflow:hidden">
        <div style="height:100%;width:${Math.min(usagePercent, 100)}%;background:${isCritical ? 'var(--danger,#dc3545)' : isWarning ? 'var(--warning,#e5a500)' : 'var(--success,#28a745)'};border-radius:4px;transition:width 0.3s"></div>
      </div>
      ${isCritical ? '<p style="color:var(--danger,#dc3545);font-size:12px;margin-top:6px">⚠️ Storage nearly full! Export data and clear old records to free space. Consider backing up and removing old jobs/invoices.</p>' : isWarning ? '<p style="color:var(--warning,#e5a500);font-size:12px;margin-top:6px">⚡ Storage getting full. Export data periodically to stay safe.</p>' : ''}
    </div>

    <!-- Quick Tools -->
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">🧰 Quick Tools</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">
        Accounting exports and storage management.
      </p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="window.location.hash='export'">📤 Export for QuickBooks/Xero</button>
        <button class="btn btn-outline" onclick="window.location.hash='storage'">💾 Storage Manager</button>
      </div>
    </div>

    <!-- Quick Danger Zone -->
    <div class="card" style="border-color:var(--danger,#dc3545)">
      <h3 style="margin-bottom:12px;color:var(--danger,#dc3545)">⚠️ Danger Zone</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">
        These actions cannot be undone. Export your data first.
      </p>
      <button class="btn btn-danger" onclick="Settings.clearAllData()">Clear All Data</button>
    </div>
  `;
};

PageInit.settings = function() {};

const Settings = {
  saveFormspree() {
    const endpoint = document.getElementById('set-formspree').value.trim();
    App.state.formspreeEndpoint = endpoint;
    App.saveState();
    App.toast(endpoint ? 'Formspree endpoint saved' : 'Formspree endpoint cleared');
    App.handleRoute();
  },

  async clearAllData() {
    if (!(await App.confirm('This will permanently delete ALL data — quotes, invoices, jobs, customers, everything. Export first if you want to keep anything. Continue?'))) return;
    if (!(await App.confirm('Are you absolutely sure? This cannot be undone.'))) return;
    localStorage.removeItem('halluc_plumbing_state');
    location.reload();
  }
};
