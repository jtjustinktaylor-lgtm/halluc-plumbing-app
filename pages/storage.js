// Storage Manager Page — Quota Monitor & Cleanup
// Global: StorageManager

Pages.storage = function() {
  const stateStr = JSON.stringify(App.state);
  const stateBytes = new Blob([stateStr]).size;
  const stateKB = (stateBytes / 1024).toFixed(1);
  const MAX_BYTES = 5 * 1024 * 1024; // 5MB
  const usagePercent = (stateBytes / MAX_BYTES * 100).toFixed(1);
  const barColor = usagePercent >= 95 ? 'var(--danger,#dc3545)' : usagePercent >= 80 ? 'var(--warning,#e5a500)' : 'var(--success,#28a745)';
  const statusEmoji = usagePercent >= 95 ? '🔴' : usagePercent >= 80 ? '🟡' : '🟢';

  // Breakdown by category
  const categories = [
    { key: 'invoices', label: 'Invoices', icon: '📄' },
    { key: 'quotes', label: 'Quotes', icon: '📝' },
    { key: 'customers', label: 'Customers', icon: '👥' },
    { key: 'jobs', label: 'Jobs', icon: '🔧' },
    { key: 'expenses', label: 'Expenses', icon: '💰' },
    { key: 'maintenancePlans', label: 'Maintenance Plans', icon: '🔄' },
    { key: 'discounts', label: 'Discounts', icon: '🏷️' },
    { key: 'followUps', label: 'Follow-Ups', icon: '📞' },
    { key: 'mileage', label: 'Mileage', icon: '🚗' },
    { key: 'inventory', label: 'Inventory', icon: '📦' },
    { key: 'businessInfo', label: 'Business Info', icon: '🏢' },
    { key: 'exportHistory', label: 'Export History', icon: '📤' },
    { key: 'warrantyExtensions', label: 'Warranty', icon: '🛡️' },
  ];

  const breakdown = categories.map(cat => {
    const data = App.state[cat.key];
    if (!data) return { ...cat, count: 0, sizeBytes: 0, sizeKB: '0.0' };
    const json = JSON.stringify(data);
    const sizeBytes = new Blob([json]).size;
    const count = Array.isArray(data) ? data.length : (typeof data === 'object' ? Object.keys(data).length : 1);
    return { ...cat, count, sizeBytes, sizeKB: (sizeBytes / 1024).toFixed(1) };
  }).filter(c => c.sizeBytes > 0);

  // Calculate "other" (keys not in the categories list)
  const listedKeys = new Set(categories.map(c => c.key));
  const otherKeys = Object.keys(App.state).filter(k => !listedKeys.has(k));
  let otherBytes = 0;
  otherKeys.forEach(k => {
    otherBytes += new Blob([JSON.stringify(App.state[k])]).size;
  });

  // Backup info
  const backupKeys = Object.keys(localStorage).filter(k => k.startsWith('halluc_plumbing_backup_'));
  const backupTotal = backupKeys.reduce((s, k) => s + (localStorage.getItem(k)?.length || 0), 0);

  // Full localStorage usage
  let totalLocalStorage = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    totalLocalStorage += (localStorage.getItem(k)?.length || 0);
  }

  // Cleanup suggestions
  const cleanupSuggestions = [];
  // Old backups
  const oldBackups = backupKeys.filter(k => {
    const dateStr = k.replace('halluc_plumbing_backup_', '');
    const d = new Date(dateStr);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d < weekAgo;
  });
  if (oldBackups.length > 0) {
    const oldSize = oldBackups.reduce((s, k) => s + (localStorage.getItem(k)?.length || 0), 0);
    cleanupSuggestions.push({
      id: 'old-backups',
      label: `Remove ${oldBackups.length} backup(s) older than 7 days`,
      detail: `${(oldSize / 1024).toFixed(1)} KB`,
      action: 'StorageManager.cleanOldBackups()',
      icon: '🗑️'
    });
  }

  // Completed jobs older than 1 year
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oldJobs = (App.state.jobs || []).filter(j =>
    j.status === 'completed' && j.date && new Date(j.date) < oneYearAgo
  );
  if (oldJobs.length > 0) {
    const jobSize = new Blob([JSON.stringify(oldJobs)]).size;
    cleanupSuggestions.push({
      id: 'old-jobs',
      label: `Archive ${oldJobs.length} completed job(s) older than 1 year`,
      detail: `${(jobSize / 1024).toFixed(1)} KB`,
      action: 'StorageManager.archiveOldJobs()',
      icon: '📋'
    });
  }

  // Empty/zero-value entries
  const emptyInvoices = (App.state.invoices || []).filter(i => !i.total || i.total === 0).length;
  const emptyQuotes = (App.state.quotes || []).filter(q => !q.total || q.total === 0).length;
  const emptyExpenses = (App.state.expenses || []).filter(e => !e.amount || e.amount === 0).length;
  const totalEmpty = emptyInvoices + emptyQuotes + emptyExpenses;
  if (totalEmpty > 0) {
    cleanupSuggestions.push({
      id: 'empty-entries',
      label: `Remove ${totalEmpty} empty/zero-value entries`,
      detail: `${emptyInvoices} invoices, ${emptyQuotes} quotes, ${emptyExpenses} expenses`,
      action: 'StorageManager.cleanEmptyEntries()',
      icon: '✨'
    });
  }

  // Paid invoices (potential archive target)
  const paidInvoices = (App.state.invoices || []).filter(i => i.status === 'paid').length;
  if (paidInvoices > 10) {
    cleanupSuggestions.push({
      id: 'paid-invoices',
      label: `Archive ${paidInvoices} paid invoices to free space`,
      detail: 'Export to CSV first, then remove',
      action: 'StorageManager.archivePaidInvoices()',
      icon: '📥'
    });
  }

  return `
    <div class="page-header">
      <h2>💾 Storage Manager</h2>
      <p>Monitor localStorage usage, view breakdown, and clean up to free space</p>
    </div>

    <!-- Usage Meter -->
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">${statusEmoji} Storage Usage — ${stateKB} KB / 5 MB (${usagePercent}%)</h3>
      <div style="background:var(--border,#e0e0e0);border-radius:8px;height:28px;overflow:hidden;position:relative;margin-bottom:8px">
        <div style="height:100%;width:${Math.min(usagePercent, 100)}%;background:${barColor};border-radius:8px;transition:width 0.5s;display:flex;align-items:center;justify-content:center;min-width:${usagePercent > 5 ? '60px' : '0'}">
          <span style="color:white;font-size:12px;font-weight:700;text-shadow:0 1px 2px rgba(0,0,0,0.3)">${usagePercent}%</span>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted)">
        <span>App State: ${stateKB} KB</span>
        <span>Backups: ${(backupTotal / 1024).toFixed(1)} KB</span>
        <span>Total localStorage: ${(totalLocalStorage / 1024).toFixed(1)} KB</span>
        <span>Limit: 5,120 KB</span>
      </div>
      ${usagePercent >= 80 ? `<div style="margin-top:8px;padding:8px 12px;border-radius:6px;background:${usagePercent >= 95 ? 'var(--danger-bg,rgba(220,53,69,0.1))' : 'var(--warning-bg,rgba(229,165,0,0.1))'};font-size:13px;color:${usagePercent >= 95 ? 'var(--danger,#dc3545)' : 'var(--warning,#e5a500)'}">
        ${usagePercent >= 95 ? '🚨 Storage critically low! Export and clean up immediately to prevent data loss.' : '⚠️ Storage getting full. Consider cleaning up old data.'}
      </div>` : ''}
    </div>

    <!-- Breakdown by Category -->
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">📊 Storage Breakdown</h3>
      <div style="display:grid;gap:6px">
        ${breakdown.sort((a, b) => b.sizeBytes - a.sizeBytes).map(cat => {
          const pct = stateBytes > 0 ? (cat.sizeBytes / stateBytes * 100).toFixed(1) : 0;
          return `
            <div style="display:flex;align-items:center;gap:12px">
              <span style="font-size:16px;width:24px;text-align:center">${cat.icon}</span>
              <div style="flex:1">
                <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px">
                  <span><strong>${cat.label}</strong> <span style="color:var(--text-muted)">(${cat.count} items)</span></span>
                  <span style="color:var(--text-muted)">${cat.sizeKB} KB · ${pct}%</span>
                </div>
                <div style="background:var(--border,#e0e0e0);border-radius:3px;height:6px;overflow:hidden">
                  <div style="height:100%;width:${Math.min(pct, 100)}%;background:var(--primary);border-radius:3px;min-width:${pct > 0 ? '2px' : '0'}"></div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
        ${otherBytes > 0 ? `
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:16px;width:24px;text-align:center">📁</span>
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;font-size:13px">
                <span><strong>Other</strong> <span style="color:var(--text-muted)">(${otherKeys.length} keys)</span></span>
                <span style="color:var(--text-muted)">${(otherBytes / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Backup Details -->
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">🗃️ Backup Storage</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
        <div class="stat-card">
          <div class="stat-value">${backupKeys.length}</div>
          <div class="stat-label">Backups</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${(backupTotal / 1024).toFixed(1)} KB</div>
          <div class="stat-label">Backup Size</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${oldBackups.length}</div>
          <div class="stat-label">Older than 7 days</div>
        </div>
      </div>
      ${backupKeys.length > 0 ? `
        <details style="font-size:13px">
          <summary style="cursor:pointer;color:var(--primary);font-weight:600">Show all backups (${backupKeys.length})</summary>
          <table class="table" style="margin-top:8px;font-size:12px">
            <thead><tr><th>Backup Date</th><th>Size</th><th>Action</th></tr></thead>
            <tbody>
              ${backupKeys.sort().reverse().map(k => {
                const date = k.replace('halluc_plumbing_backup_', '');
                const size = ((localStorage.getItem(k)?.length || 0) / 1024).toFixed(1);
                const isOld = oldBackups.includes(k);
                return `<tr>
                  <td>${App.escapeHtml(date)} ${isOld ? '<span style="color:var(--warning,#e5a500);font-size:11px">old</span>' : ''}</td>
                  <td>${size} KB</td>
                  <td><button class="btn btn-outline btn-sm" onclick="if(confirm('Delete this backup?')){localStorage.removeItem('${k}');App.toast('Backup deleted');App.handleRoute();}">🗑️</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </details>
      ` : '<p style="color:var(--text-muted);font-size:13px">No backups stored.</p>'}
    </div>

    <!-- Cleanup Suggestions -->
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">🧹 Cleanup Suggestions</h3>
      ${cleanupSuggestions.length > 0 ? `
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          <button class="btn btn-outline" onclick="StorageManager.exportBeforeCleanup()">📦 Export All Data First</button>
          <button class="btn btn-primary" onclick="StorageManager.runAllCleanups()">🧹 Run All Cleanups</button>
        </div>
        <div style="display:grid;gap:8px">
          ${cleanupSuggestions.map(s => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--bg-secondary);border-radius:6px;border:1px solid var(--border)">
              <span style="font-size:20px">${s.icon}</span>
              <div style="flex:1">
                <div style="font-size:14px;font-weight:600">${App.escapeHtml(s.label)}</div>
                <div style="font-size:12px;color:var(--text-muted)">${App.escapeHtml(s.detail)}</div>
              </div>
              <button class="btn btn-outline btn-sm" onclick="${s.action}">Clean</button>
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="text-align:center;padding:20px">
          <div style="font-size:32px;margin-bottom:8px">✨</div>
          <p style="color:var(--text-muted)">All clean! No cleanup suggestions at this time.</p>
        </div>
      `}
    </div>

    <!-- Danger Zone -->
    <div class="card" style="border-color:var(--danger,#dc3545)">
      <h3 style="margin-bottom:12px;color:var(--danger,#dc3545)">⚠️ Danger Zone</h3>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">
        These actions are irreversible. Export your data first.
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-danger" onclick="StorageManager.clearAllBackups()">🗑️ Delete All Backups</button>
        <button class="btn btn-danger" onclick="StorageManager.clearExportHistory()">📤 Clear Export History</button>
        <button class="btn btn-outline" style="border-color:var(--danger,#dc3545);color:var(--danger,#dc3545)" onclick="App.exportData()">📦 Export All Data (Safety Copy)</button>
      </div>
    </div>
  `;
};

PageInit.storage = function() {};

const StorageManager = {
  exportBeforeCleanup() {
    App.exportData();
    App.toast('Data exported — safe to clean up now');
  },

  cleanOldBackups() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('halluc_plumbing_backup_'));
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    let removed = 0;
    keys.forEach(k => {
      const dateStr = k.replace('halluc_plumbing_backup_', '');
      if (new Date(dateStr) < weekAgo) {
        localStorage.removeItem(k);
        removed++;
      }
    });
    App.toast(`Removed ${removed} old backup(s)`);
    App.handleRoute();
  },

  archiveOldJobs() {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const before = (App.state.jobs || []).length;
    // Export old jobs to a downloadable file first
    const oldJobs = (App.state.jobs || []).filter(j =>
      j.status === 'completed' && j.date && new Date(j.date) < oneYearAgo
    );
    if (oldJobs.length > 0) {
      const data = JSON.stringify(oldJobs, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `halluc-archived-jobs-${App.today()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Remove from state
      App.state.jobs = (App.state.jobs || []).filter(j =>
        !(j.status === 'completed' && j.date && new Date(j.date) < oneYearAgo)
      );
      App.saveState();
      App.toast(`Archived and removed ${oldJobs.length} old job(s)`);
    } else {
      App.toast('No old completed jobs to archive', 'warning');
    }
    App.handleRoute();
  },

  cleanEmptyEntries() {
    let removed = 0;
    // Empty invoices
    const invBefore = (App.state.invoices || []).length;
    App.state.invoices = (App.state.invoices || []).filter(i => i.total && i.total > 0);
    removed += invBefore - App.state.invoices.length;

    // Empty quotes
    const qBefore = (App.state.quotes || []).length;
    App.state.quotes = (App.state.quotes || []).filter(q => q.total && q.total > 0);
    removed += qBefore - App.state.quotes.length;

    // Empty expenses
    const eBefore = (App.state.expenses || []).length;
    App.state.expenses = (App.state.expenses || []).filter(e => e.amount && e.amount > 0);
    removed += eBefore - App.state.expenses.length;

    App.saveState();
    App.toast(`Removed ${removed} empty/zero-value entries`);
    App.handleRoute();
  },

  archivePaidInvoices() {
    App.toast('Export paid invoices first, then they can be removed from Settings', 'info');
    window.location.hash = 'export';
  },

  async runAllCleanups() {
    if (!(await App.confirm('Run all cleanup suggestions? This will remove old backups, archive old jobs, and clean empty entries. A data export is recommended first.'))) return;
    this.cleanOldBackups();
    this.archiveOldJobs();
    this.cleanEmptyEntries();
    App.toast('All cleanups completed');
  },

  clearAllBackups() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('halluc_plumbing_backup_'));
    if (keys.length === 0) return App.toast('No backups to delete', 'warning');
    if (!confirm(`Delete all ${keys.length} backups? This cannot be undone.`)) return;
    keys.forEach(k => localStorage.removeItem(k));
    App.toast(`Deleted ${keys.length} backup(s)`);
    App.handleRoute();
  },

  clearExportHistory() {
    if (!App.state.exportHistory || App.state.exportHistory.length === 0) {
      return App.toast('No export history to clear', 'warning');
    }
    if (!confirm('Clear export history?')) return;
    App.state.exportHistory = [];
    App.saveState();
    App.toast('Export history cleared');
    App.handleRoute();
  }
};
