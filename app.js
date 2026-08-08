// Halluc Plumbing — App Core
// Routing, state, navigation, utilities

// Page renderers and initializers — declared first so page scripts can register
var Pages = {};
var PageInit = {};

const App = {
  currentPage: 'dashboard',
  state: {},

  init() {
    this.loadState();
    this.injectIcons();
    this.initDarkMode();
    this.initCommandPalette();
    this.bindNavigation();
    this.bindMobileMenu();
    this.updateSidebarFooter();
    this.handleRoute();
    window.addEventListener('hashchange', () => this.handleRoute());
    // Offline indicator
    const banner = document.getElementById('offline-banner');
    if (banner) {
      const update = () => { banner.style.display = navigator.onLine ? 'none' : 'block'; };
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      update();
    }
  },

  // --- State Management (localStorage) ---
  loadState() {
    const saved = localStorage.getItem('halluc_plumbing_state');
    try {
      this.state = saved ? JSON.parse(saved) : {
        quotes: [],
        invoices: [],
        jobs: [],
        customers: [],
        expenses: [],
        maintenancePlans: [],
        discounts: [],
        followUps: [],
        warrantyExtensions: {},
        nextQuoteNum: 1001,
        nextInvoiceNum: 5001,
      };
    } catch (e) {
      console.error('Failed to parse saved state, resetting:', e);
      this.state = {
        quotes: [], invoices: [], jobs: [], customers: [],
        expenses: [], maintenancePlans: [], discounts: [],
        followUps: [], warrantyExtensions: {},
        nextQuoteNum: 1001, nextInvoiceNum: 5001,
      };
    }
    // Restore persisted rate overrides
    if (this.state.hourlyRates) Object.assign(HOURLY_RATES, this.state.hourlyRates);
    if (this.state.materialMarkup) Object.assign(MATERIAL_MARKUP, this.state.materialMarkup);
    if (this.state.flatRates) Object.assign(FLAT_RATES, this.state.flatRates);
    // Show onboarding if business info not configured
    if (!this.state.businessInfo) {
      this.showOnboarding();
    }
  },

  saveState() {
    try {
      localStorage.setItem('halluc_plumbing_state', JSON.stringify(this.state));
    } catch (e) {
      this.toast('⚠️ Storage full! Export your data in Settings to free space.', 'error', 8000);
      console.error('saveState failed:', e);
      return;
    }
    // Auto-backup: save to a dated backup key once per day
    const today = new Date().toISOString().slice(0, 10);
    const lastBackup = localStorage.getItem('halluc_plumbing_last_backup');
    if (lastBackup !== today) {
      try {
        localStorage.setItem('halluc_plumbing_backup_' + today, JSON.stringify(this.state));
        localStorage.setItem('halluc_plumbing_last_backup', today);
        // Clean old backups (keep last 7 days)
        for (let i = 8; i <= 30; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          localStorage.removeItem('halluc_plumbing_backup_' + d.toISOString().slice(0, 10));
        }
      } catch (e) {
        // localStorage full — clean oldest backups and retry
        for (let i = 30; i <= 90; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          localStorage.removeItem('halluc_plumbing_backup_' + d.toISOString().slice(0, 10));
        }
      }
    }
  },

  restoreFromBackup() {
    // Find the most recent backup
    const keys = Object.keys(localStorage).filter(k => k.startsWith('halluc_plumbing_backup_')).sort().reverse();
    if (keys.length === 0) { this.toast('No backups found', 'warning'); return; }
    const latest = keys[0];
    const date = latest.replace('halluc_plumbing_backup_', '');
    this.openModal(`
      <div class="modal-header"><h3>Restore from Backup</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <p>Restore data from <strong>${date}</strong>?</p>
      <p style="color:var(--text-muted);font-size:13px">This will replace all current data. ${keys.length} backup(s) available.</p>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="App._doRestore('${latest}')">Restore</button>
      </div>
    `);
  },

  _doRestore(key) {
    const data = localStorage.getItem(key);
    if (!data) { this.toast('Backup not found', 'error'); return; }
    try {
      this.state = JSON.parse(data);
      this.saveState();
      this.closeModal();
      this.handleRoute();
      this.toast('Data restored from backup');
    } catch (e) {
      this.toast('Restore failed: ' + e.message, 'error');
    }
  },

  getBackupInfo() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('halluc_plumbing_backup_')).sort().reverse();
    const sizes = keys.map(k => {
      const data = localStorage.getItem(k);
      return { date: k.replace('halluc_plumbing_backup_', ''), size: data ? (data.length / 1024).toFixed(1) + ' KB' : '0 KB' };
    });
    return sizes;
  },

  showOnboarding() {
    this.openModal(`
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:48px;margin-bottom:16px">🔧</div>
        <h2 style="margin-bottom:8px">Welcome to Halluc Plumbing</h2>
        <p style="color:var(--text-muted);margin-bottom:24px">Let's set up your business info. This appears on quotes, invoices, and printed documents.</p>
      </div>
      <div class="form-group">
        <label>Business Name</label>
        <input class="form-control" id="ob-name" value="" placeholder="Your business name">
      </div>
      <div class="form-group">
        <label>Contact Name</label>
        <input class="form-control" id="ob-contact" value="" placeholder="Your name">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label>Phone</label>
          <input class="form-control" id="ob-phone" value="" placeholder="(555) 123-4567" type="tel">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input class="form-control" id="ob-email" value="" placeholder="you@business.com" type="email">
        </div>
      </div>
      <div class="form-group">
        <label>Address</label>
        <input class="form-control" id="ob-addr" value="" placeholder="City, Province/State">
      </div>
      <div class="form-group">
        <label>HST Number (optional)</label>
        <input class="form-control" id="ob-hst" placeholder="123456789RT0001">
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="App._saveOnboarding()" style="width:100%">Get Started</button>
      </div>
    `);
  },

  _saveOnboarding() {
    this.state.businessInfo = {
      name: document.getElementById('ob-name').value.trim(),
      contact: document.getElementById('ob-contact').value.trim(),
      phone: document.getElementById('ob-phone').value.trim(),
      email: document.getElementById('ob-email').value.trim(),
      address: document.getElementById('ob-addr').value.trim(),
      hstNumber: document.getElementById('ob-hst').value.trim(),
    };
    this.saveState();
    this.closeModal();
    this.handleRoute();
    this.toast('Business info saved — you\'re all set!');
  },

  getBusinessInfo() {
    return this.state.businessInfo || {
      name: 'Halluc Plumbing',
      contact: 'Justin Taylor',
      phone: '(519) 350-8772',
      email: 'jtjustinktaylor-lgtm@protonmail.com',
      address: 'Chatham-Kent, Ontario',
      hstNumber: '',
    };
  },

  updateSidebarFooter() {
    const biz = this.getBusinessInfo();
    const el = document.getElementById('sidebar-contact');
    if (el) el.textContent = biz.contact;
    const phone = document.getElementById('sidebar-phone');
    if (phone) phone.textContent = biz.phone;
    const addr = document.getElementById('sidebar-address');
    if (addr) addr.textContent = biz.address;
  },

  // --- Utility: Escape HTML to prevent XSS ---
  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  // Short alias for template use
  esc(str) { return this.escapeHtml(str); },

  // Shared filter helper for list pages
  filterRows({ searchId, statusId, rowClass, searchFields = ['customer', 'number'] }) {
    const q = (document.getElementById(searchId)?.value || '').toLowerCase();
    const status = document.getElementById(statusId)?.value || '';
    document.querySelectorAll('.' + rowClass).forEach(row => {
      const matchText = !q || searchFields.some(f => (row.dataset[f] || '').includes(q));
      const matchStatus = !status || row.dataset.status === status;
      row.style.display = (matchText && matchStatus) ? '' : 'none';
    });
  },

  // Shared flat-rate dropdown HTML
  flatRateDropdown(id) {
    const cats = Object.entries(FLAT_RATES);
    return `<select class="form-control" id="${id}"><option value="">Select a service...</option>
      ${cats.map(([k,v])=>`<optgroup label="${v.label}">${v.items.map(i=>`<option value="${i.id}" data-price="${i.price}">${i.desc} — ${App.formatCurrency(i.price)}</option>`).join('')}</optgroup>`).join('')}
    </select>`;
  },

  // --- Data Backup / Export / Import ---
  exportData() {
    const data = JSON.stringify(this.state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'halluc-plumbing-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    this.toast('Data exported successfully');
  },

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.quotes || !data.invoices) throw new Error('Invalid backup file');
        if (!(await this.confirm('This will replace ALL current data. Continue?'))) return;
        this.state = data;
        this.saveState();
        this.handleRoute();
        this.toast('Data imported successfully');
      } catch (err) {
        this.toast('Import failed: ' + err.message, 'error');
      }
    };
    input.click();
  },

  // --- Overdue Invoice Detection ---
  checkOverdue() {
    const today = this.today();
    let count = 0;
    (this.state.invoices || []).forEach(inv => {
      if (inv.status === 'unpaid' && inv.dueDate && inv.dueDate < today) {
        inv.status = 'overdue';
        count++;
      }
    });
    if (count > 0) this.saveState();
    return count;
  },

  getOverdueInvoices() {
    return (this.state.invoices || []).filter(i => i.status === 'overdue');
  },

  getUpcomingMaintenance() {
    const today = this.today();
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
    const cutoff = inTwoWeeks.toISOString().split('T')[0];
    return (this.state.maintenancePlans || []).filter(p =>
      p.status === 'active' && p.nextVisit && p.nextVisit >= today && p.nextVisit <= cutoff
    );
  },

  // --- SVG Icon Injection ---
  injectIcons() {
    if (typeof Icons === 'undefined') return;
    const iconMap = {
      'nav-icon-dashboard': 'dashboard', 'nav-icon-quotes': 'quotes',
      'nav-icon-invoices': 'invoices', 'nav-icon-scheduler': 'scheduler',
      'nav-icon-rates': 'rates', 'nav-icon-customers': 'customers',
      'nav-icon-tracker': 'tracker', 'nav-icon-maintenance': 'maintenance',
      'nav-icon-discounts': 'discounts', 'nav-icon-quote-request': 'quoteRequest', 'nav-icon-warranty': 'warranty', 'nav-icon-followups': 'scheduler', 'nav-icon-eod': 'dashboard', 'nav-icon-settings': 'rates', 'nav-icon-mileage': 'tracker', 'nav-icon-inventory': 'tracker', 'nav-icon-export': 'invoices', 'cmd-icon': 'search',
    };
    Object.entries(iconMap).forEach(([elId, iconName]) => {
      const el = document.getElementById(elId);
      if (el && Icons[iconName]) el.innerHTML = Icons[iconName];
    });
    this._updateThemeIcon();
  },

  // --- Page-specific icon injection (called after page render) ---
  injectPageIcons() {
    if (typeof Icons === 'undefined') return;
    const pageIconMap = {
      'stat-today-jobs': 'scheduler',
      'stat-pending-quotes': 'quotes',
      'stat-revenue': 'invoices',
      'stat-profit': 'tracker',
      'rate-icon-std': 'rates',
      'rate-icon-ah': 'moon',
      'rate-icon-hol': 'wrench',
      'stat-tracker-revenue': 'invoices',
      'stat-tracker-expenses': 'tracker',
      'stat-tracker-profit': 'tracker',
      'stat-tracker-month': 'scheduler',
      'empty-scheduler': 'scheduler',
      'empty-quotes': 'quotes',
      'empty-customers': 'customers',
      'empty-maintenance': 'maintenance',
      'empty-discounts': 'discounts',
    };
    Object.entries(pageIconMap).forEach(([elId, iconName]) => {
      const el = document.getElementById(elId);
      if (el && Icons[iconName]) el.innerHTML = Icons[iconName];
    });
  },

  // --- Dark Mode ---
  initDarkMode() {
    const saved = localStorage.getItem('halluc_theme');
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('dark-mode-toggle')?.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('halluc_theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('halluc_theme', 'dark');
      }
      this._updateThemeIcon();
    });
  },

  _updateThemeIcon() {
    const el = document.getElementById('theme-icon');
    if (!el || typeof Icons === 'undefined') return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    el.innerHTML = isDark ? Icons.sun : Icons.moon;
  },

  // --- Command Palette ---
  initCommandPalette() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'cmd-palette-overlay';
    overlay.className = 'hidden';
    overlay.innerHTML = `
      <div id="cmd-palette">
        <input id="cmd-palette-input" type="text" placeholder="Search pages, actions..." autocomplete="off">
        <div id="cmd-palette-results"></div>
      </div>`;
    document.body.appendChild(overlay);

    const pages = [
      { id: 'dashboard', label: 'Dashboard', hint: 'Overview & stats' },
      { id: 'quotes', label: 'Quotes', hint: 'Create & manage quotes' },
      { id: 'invoices', label: 'Invoices', hint: 'Billing & payments' },
      { id: 'scheduler', label: 'Scheduler', hint: 'Job scheduling' },
      { id: 'rates', label: 'Rates', hint: 'Flat rates & hourly' },
      { id: 'customers', label: 'Customers', hint: 'Customer directory' },
      { id: 'tracker', label: 'Profit Tracker', hint: 'Revenue & expenses' },
      { id: 'maintenance', label: 'Maintenance', hint: 'Service plans' },
      { id: 'warranty', label: 'Warranty', hint: 'Warranty tracking' },
      { id: 'followups', label: 'Follow-Ups', hint: 'Post-job customer follow-ups' },
      { id: 'eod', label: 'End-of-Day Report', hint: 'Daily summary & print' },
      { id: 'mileage', label: 'Mileage', hint: 'Travel tracking & deductions' },
      { id: 'inventory', label: 'Inventory', hint: 'Parts & supplies tracking' },
      { id: 'discounts', label: 'Discounts', hint: 'Promotions & deals' },
      { id: 'settings', label: 'Settings', hint: 'Backup, Formspree, config' },
      { id: 'export', label: 'Export', hint: 'QuickBooks & Xero export' },
      { id: 'storage', label: 'Storage Manager', hint: 'Monitor & clean localStorage' },
    ];

    const actions = [
      { id: '_newQuote', label: 'New Quote', hint: 'Quick action' },
      { id: '_newInvoice', label: 'New Invoice', hint: 'Quick action' },
      { id: '_newJob', label: 'Schedule Job', hint: 'Quick action' },
      { id: '_newCustomer', label: 'Add Customer', hint: 'Quick action' },
      { id: '_toggleTheme', label: 'Toggle Dark Mode', hint: 'Appearance' },
    ];

    const allItems = [...pages, ...actions];
    let activeIdx = 0;

    const render = (query) => {
      const q = (query || '').toLowerCase();
      const filtered = q ? allItems.filter(i => i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q)) : allItems;
      const container = document.getElementById('cmd-palette-results');
      if (filtered.length === 0) {
        container.innerHTML = '<div class="cmd-empty">No results found</div>';
        return;
      }
      activeIdx = 0;
      container.innerHTML = filtered.map((item, i) => {
        const isPage = pages.includes(item);
        const icon = isPage && Icons[item.id] ? Icons[item.id] : (Icons.wrench || '');
        return `<div class="cmd-result${i === 0 ? ' active' : ''}" data-id="${item.id}" data-idx="${i}">
          <div class="cmd-icon">${icon}</div>
          <div class="cmd-label">${item.label}</div>
          <div class="cmd-hint">${item.hint}</div>
        </div>`;
      }).join('');
      container.querySelectorAll('.cmd-result').forEach(el => {
        el.addEventListener('click', () => execute(el.dataset.id));
      });
    };

    const execute = (id) => {
      overlay.classList.add('hidden');
      if (id === '_newQuote') { window.location.hash = 'quotes'; setTimeout(() => Quotes.new(), 200); }
      else if (id === '_newInvoice') { window.location.hash = 'invoices'; setTimeout(() => Invoices.new(), 200); }
      else if (id === '_newJob') { window.location.hash = 'scheduler'; setTimeout(() => Scheduler.addJob(), 200); }
      else if (id === '_newCustomer') { window.location.hash = 'customers'; setTimeout(() => Customers.new(), 200); }
      else if (id === '_toggleTheme') { document.getElementById('dark-mode-toggle')?.click(); }
      else { window.location.hash = id; }
    };

    const open = () => {
      overlay.classList.remove('hidden');
      const input = document.getElementById('cmd-palette-input');
      input.value = '';
      render('');
      setTimeout(() => input.focus(), 50);
    };

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const isOpen = !overlay.classList.contains('hidden');
        if (isOpen) overlay.classList.add('hidden');
        else open();
      }
      if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
        overlay.classList.add('hidden');
      }
    });

    // Input filtering
    document.getElementById('cmd-palette-input')?.addEventListener('input', (e) => {
      render(e.target.value);
    });

    // Arrow key navigation
    document.getElementById('cmd-palette-input')?.addEventListener('keydown', (e) => {
      const results = document.querySelectorAll('#cmd-palette-results .cmd-result');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, results.length - 1);
        results.forEach((r, i) => r.classList.toggle('active', i === activeIdx));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
        results.forEach((r, i) => r.classList.toggle('active', i === activeIdx));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const active = results[activeIdx];
        if (active) execute(active.dataset.id);
      }
    });

    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });

    // Sidebar button
    document.getElementById('cmd-palette-btn')?.addEventListener('click', open);
  },

  // --- Navigation ---
  bindNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        window.location.hash = page;
        document.getElementById('sidebar').classList.remove('open');
      });
    });
  },

  bindMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle) {
      toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && e.target !== toggle) {
        sidebar.classList.remove('open');
      }
    });
  },

  handleRoute() {
    const hash = window.location.hash.slice(1) || 'dashboard';
    this.currentPage = hash;
    this.checkOverdue();
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === hash);
    });
    const content = document.getElementById('content');
    // Support parameterized routes: try exact match first, then base route
    const baseRoute = hash.split('/')[0];
    const renderer = Pages[hash] || Pages[baseRoute];
    if (renderer) {
      content.innerHTML = renderer();
      if (PageInit && PageInit[baseRoute]) PageInit[baseRoute]();
      this.injectPageIcons();
    } else {
      content.innerHTML = '<div class="empty-state"><div class="icon">🚧</div><h3>Page not found</h3></div>';
    }
  },

  // --- Utilities ---
  formatCurrency(amount) {
    return '$' + (Number(amount) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  formatDateInput(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    return new Date(dateStr).toISOString().split('T')[0];
  },

  today() {
    return new Date().toISOString().split('T')[0];
  },

  genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  // --- Search Helper ---
  googleMapsLink(address) {
    if (!address) return '—';
    const encoded = encodeURIComponent(address);
    return `<a href="https://www.google.com/maps/search/?api=1&query=${encoded}" target="_blank" rel="noopener" title="Open in Google Maps" style="color:var(--navy);text-decoration:underline dotted">${address} <span style="font-size:12px">🗺️</span></a>`;
  },

  matchesSearch(text, query) {
    if (!query) return true;
    return (text || '').toLowerCase().includes(query.toLowerCase());
  },

  // --- Toast Notifications ---
  toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-exit');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
  },

  // --- Modal ---
  openModal(html) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = html;
    overlay.classList.remove('hidden');
    overlay.onclick = (e) => {
      if (e.target === overlay) this.closeModal();
    };
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  },

  // --- Confirm Dialog ---
  confirm(message) {
    return new Promise(resolve => {
      this.openModal(`
        <div class="modal-header">
          <h3>Confirm</h3>
          <button class="modal-close" onclick="App.closeModal()">✕</button>
        </div>
        <p style="margin:16px 0;font-size:15px;">${message}</p>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="App.closeModal();App._confirmResolve(false)">Cancel</button>
          <button class="btn btn-danger" onclick="App.closeModal();App._confirmResolve(true)">Confirm</button>
        </div>
      `);
      this._confirmResolve = resolve;
    });
  },

  _quickExpense() {
    const desc = document.getElementById('qe-desc')?.value?.trim();
    const amt = parseFloat(document.getElementById('qe-amt')?.value) || 0;
    const cat = document.getElementById('qe-cat')?.value || 'other';
    if (!desc || !amt) return this.toast('Enter description and amount', 'error');
    if (!this.state.expenses) this.state.expenses = [];
    this.state.expenses.push({ id: this.genId(), desc, amount: amt, category: cat, date: this.today() });
    this.saveState();
    this.toast('Expense added: ' + this.formatCurrency(amt));
    document.getElementById('qe-desc').value = '';
    document.getElementById('qe-amt').value = '';
  },

  // --- CSV Export (for tax time) ---
  exportCSV(type) {
    let rows = [];
    let filename = '';
    if (type === 'invoices') {
      rows.push(['Invoice #','Date','Customer','Subtotal','HST','Total','Status','Paid Date','Payment Method']);
      (this.state.invoices || []).forEach(inv => {
        const lastPay = (inv.payments || []).at(-1);
        rows.push([inv.number, inv.date, inv.customer||'', inv.subtotal||0, inv.tax||0, inv.total||0, inv.status, inv.paidDate||'', lastPay ? lastPay.method : '']);
      });
      filename = 'halluc-plumbing-invoices-' + this.today() + '.csv';
    } else if (type === 'expenses') {
      rows.push(['Date','Category','Description','Amount','Vendor']);
      (this.state.expenses || []).forEach(e => {
        rows.push([e.date, e.category||'', e.desc, e.amount, e.vendor||'']);
      });
      filename = 'halluc-plumbing-expenses-' + this.today() + '.csv';
    } else if (type === 'customers') {
      rows.push(['Name','Email','Phone','Address','Notes']);
      (this.state.customers || []).forEach(c => {
        rows.push([c.name, c.email||'', c.phone||'', c.address||'', c.notes||'']);
      });
      filename = 'halluc-plumbing-customers-' + this.today() + '.csv';
    } else if (type === 'annual') {
      rows.push(['Type','Invoice/Expense #','Date','Customer/Vendor','Description','Subtotal','HST','Total','Status','Category','Paid Date','Payment Method']);
      (this.state.invoices || []).forEach(inv => {
        const lastPay = (inv.payments || []).at(-1);
        rows.push(['Invoice', inv.number, inv.date, inv.customer||'', (inv.items||[]).map(i=>i.desc).join('; '), inv.subtotal||0, inv.tax||0, inv.total||0, inv.status, '', inv.paidDate||'', lastPay ? lastPay.method : '']);
      });
      (this.state.expenses || []).forEach(e => {
        rows.push(['Expense', e.id, e.date, e.vendor||'', e.desc, '', '', e.amount, '', e.category||'', '', '']);
      });
      filename = 'halluc-plumbing-annual-report-' + this.today() + '.csv';
    } else if (type === 'mileage') {
      rows.push(['Date','Miles','Purpose','Route']);
      (this.state.mileage || []).forEach(m => {
        rows.push([m.date, m.miles, m.purpose||'', m.route||'']);
      });
      filename = 'halluc-plumbing-mileage-' + this.today() + '.csv';
    }
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    this.toast(type.charAt(0).toUpperCase() + type.slice(1) + ' exported as CSV');
  },

  // --- Download helper for filtered CSV ---
  downloadCSV(rows, filename) {
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  // --- Print ---
  printSection(html, title) {
    const biz = this.getBusinessInfo();
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>${title} — ${biz.name}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:40px;color:#1a1a1a;}
        h1{color:#1B3A5C;border-bottom:3px solid #D4AF37;padding-bottom:8px;}
        table{width:100%;border-collapse:collapse;margin:16px 0;}
        th,td{padding:8px 12px;border:1px solid #ddd;text-align:left;font-size:13px;}
        th{background:#1B3A5C;color:white;}
        .total{font-weight:bold;font-size:16px;text-align:right;margin-top:12px;}
        .header-info{display:flex;justify-content:space-between;margin-bottom:24px;}
        .brand-print{font-size:24px;color:#D4AF37;font-weight:bold;}
      </style></head><body>
      <div class="header-info">
        <div><span class="brand-print">🔧 ${biz.name}</span><br>
        <small>${biz.contact} | ${biz.phone} | ${biz.address}</small>${biz.hstNumber ? "<br><small>HST: " + biz.hstNumber + "</small>" : ""}</div>
        <div style="text-align:right"><h1>${title}</h1></div>
      </div>
      ${html}
      </body></html>`);
    win.document.close();
    win.print();
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
