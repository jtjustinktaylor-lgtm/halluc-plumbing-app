// Inventory / Parts Tracking Page
Pages.inventory = function() {
  const items = App.state.inventory || [];
  const lowStock = items.filter(i => i.reorderLevel > 0 && i.qty <= i.reorderLevel);
  const totalValue = items.reduce((s, i) => s + (i.qty * (i.unitCost || 0)), 0);
  const totalItems = items.reduce((s, i) => s + (i.qty || 0), 0);
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort();

  return `
    <div class="page-header"><h2>Inventory</h2><p>Track parts, supplies, and stock levels</p></div>
    <div class="grid grid-4">
      <div class="stat-card"><div><div class="stat-value">${items.length}</div><div class="stat-label">Unique Parts</div></div></div>
      <div class="stat-card"><div><div class="stat-value">${totalItems}</div><div class="stat-label">Total Units</div></div></div>
      <div class="stat-card"><div><div class="stat-value" style="color:var(--success)">${App.formatCurrency(totalValue)}</div><div class="stat-label">Inventory Value</div></div></div>
      <div class="stat-card"><div><div class="stat-value" style="color:${lowStock.length > 0 ? 'var(--danger)' : 'var(--success)'}">${lowStock.length}</div><div class="stat-label">Low Stock Alerts</div></div></div>
    </div>

    ${lowStock.length > 0 ? `
    <div class="card" style="margin-top:20px;border-left:4px solid var(--danger)">
      <div class="card-header"><h3>⚠️ Low Stock Alerts</h3></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Part</th><th>SKU</th><th>Current Qty</th><th>Reorder Level</th><th>Supplier</th><th></th></tr></thead>
        <tbody>${lowStock.map(i => `<tr>
          <td><strong>${App.esc(i.name)}</strong></td>
          <td>${App.esc(i.sku || '—')}</td>
          <td style="color:var(--danger);font-weight:700">${i.qty}</td>
          <td>${i.reorderLevel}</td>
          <td>${App.esc(i.supplier || '—')}</td>
          <td><button class="btn btn-sm btn-outline" onclick="Inventory.adjustStock('${i.id}')">📦 Restock</button></td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>` : ''}

    <div class="card" style="margin-top:20px">
      <div class="card-header"><h3>Parts List</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="Inventory.addItem()">+ Add Part</button>
          <button class="btn btn-outline" onclick="Inventory.exportCSV()">📊 Export CSV</button>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
        <input class="form-control" id="inv-search" placeholder="Search parts..." style="max-width:250px" oninput="Inventory._filter()">
        <select class="form-control" id="inv-cat-filter" style="max-width:160px" onchange="Inventory._filter()">
          <option value="">All Categories</option>
          ${categories.map(c => `<option value="${App.esc(c)}">${App.esc(c)}</option>`).join('')}
        </select>
        <select class="form-control" id="inv-loc-filter" style="max-width:160px" onchange="Inventory._filter()">
          <option value="">All Locations</option>
          <option value="truck">Truck</option>
          <option value="warehouse">Warehouse</option>
        </select>
      </div>
      ${items.length === 0
        ? '<div class="empty-state"><div class="icon">📦</div><h3>No parts in inventory</h3><p>Add your first part to start tracking</p></div>'
        : `<div class="table-wrap"><table id="inv-table">
            <thead><tr><th>Name</th><th>SKU</th><th>Category</th><th>Qty</th><th>Unit Cost</th><th>Value</th><th>Location</th><th>Status</th><th></th></tr></thead>
            <tbody>${items.sort((a,b) => a.name.localeCompare(b.name)).map(i => {
              const isLow = i.reorderLevel > 0 && i.qty <= i.reorderLevel;
              const value = i.qty * (i.unitCost || 0);
              return `<tr class="inv-row" data-search="${(i.name+' '+(i.sku||'')+' '+(i.supplier||'')+' '+(i.category||'')).toLowerCase()}" data-cat="${i.category || ''}" data-loc="${i.location || ''}">
                <td><strong>${App.esc(i.name)}</strong></td>
                <td>${App.esc(i.sku || '—')}</td>
                <td>${App.esc(i.category || '—')}</td>
                <td style="font-weight:600;color:${isLow ? 'var(--danger)' : 'var(--text)'}">${i.qty}</td>
                <td>${App.formatCurrency(i.unitCost)}</td>
                <td>${App.formatCurrency(value)}</td>
                <td><span class="badge badge-${i.location==='truck'?'info':'muted'}">${i.location || '—'}</span></td>
                <td>${isLow ? '<span class="badge badge-danger">Low</span>' : '<span class="badge badge-success">OK</span>'}</td>
                <td style="white-space:nowrap">
                  <button class="btn btn-sm btn-outline" onclick="Inventory.adjustStock('${i.id}')" title="Adjust stock">📦</button>
                  <button class="btn btn-sm btn-outline" onclick="Inventory.editItem('${i.id}')">Edit</button>
                  <button class="btn btn-sm btn-danger" onclick="Inventory.removeItem('${i.id}')">✕</button>
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table></div>`}
    </div>
  `;
};

PageInit.inventory = function() {
  Inventory._filter();
};

const Inventory = {
  _filter() {
    const q = (document.getElementById('inv-search')?.value || '').toLowerCase();
    const cat = document.getElementById('inv-cat-filter')?.value || '';
    const loc = document.getElementById('inv-loc-filter')?.value || '';
    document.querySelectorAll('.inv-row').forEach(row => {
      const matchText = !q || (row.dataset.search || '').includes(q);
      const matchCat = !cat || row.dataset.cat === cat;
      const matchLoc = !loc || row.dataset.loc === loc;
      row.style.display = (matchText && matchCat && matchLoc) ? '' : 'none';
    });
  },

  addItem() {
    const jobs = (App.state.jobs || []).filter(j => j.status !== 'completed' || (j.date || '') >= new Date(Date.now() - 30*86400000).toISOString().slice(0,10));
    const jobOptions = jobs.map(j => `<option value="${j.id}">${App.esc(j.title || 'Job')} — ${App.esc(j.customer || '')} (${App.formatDate(j.date)})</option>`).join('');

    App.openModal(`
      <div class="modal-header"><h3>Add Part</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>Name *</label><input class="form-control" id="ip-name"></div>
        <div class="form-group"><label>SKU</label><input class="form-control" id="ip-sku" placeholder="e.g. PVC-050-10"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>Category</label>
          <select class="form-control" id="ip-cat">
            <option value="">— Select —</option>
            <option value="Pipe & Fittings">Pipe & Fittings</option>
            <option value="Valves">Valves</option>
            <option value="Fixtures">Fixtures</option>
            <option value="Water Heaters">Water Heaters</option>
            <option value="Tools">Tools</option>
            <option value="Consumables">Consumables</option>
            <option value="Adhesives & Sealants">Adhesives & Sealants</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="form-group"><label>Location</label>
          <select class="form-control" id="ip-loc">
            <option value="truck">Truck</option>
            <option value="warehouse">Warehouse</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div class="form-group"><label>Quantity *</label><input class="form-control" type="number" id="ip-qty" value="0"></div>
        <div class="form-group"><label>Unit Cost ($)</label><input class="form-control" type="number" step="0.01" id="ip-cost" value="0"></div>
        <div class="form-group"><label>Reorder Level</label><input class="form-control" type="number" id="ip-reorder" value="0"></div>
      </div>
      <div class="form-group"><label>Supplier</label><input class="form-control" id="ip-supplier" placeholder="Supplier name"></div>
      <div class="form-group"><label>Notes</label><textarea class="form-control" id="ip-notes" placeholder="Optional notes"></textarea></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Inventory._saveItem()">Add Part</button>
      </div>
    `);
  },

  _saveItem() {
    const name = document.getElementById('ip-name').value.trim();
    if (!name) return App.toast('Part name is required', 'error');
    const qty = parseInt(document.getElementById('ip-qty').value) || 0;
    const unitCost = parseFloat(document.getElementById('ip-cost').value) || 0;
    if (!App.state.inventory) App.state.inventory = [];
    App.state.inventory.push({
      id: App.genId(),
      name,
      sku: document.getElementById('ip-sku').value.trim(),
      category: document.getElementById('ip-cat').value,
      qty,
      unitCost,
      reorderLevel: parseInt(document.getElementById('ip-reorder').value) || 0,
      supplier: document.getElementById('ip-supplier').value.trim(),
      location: document.getElementById('ip-loc').value,
      notes: document.getElementById('ip-notes').value.trim(),
      createdAt: App.today(),
      updatedAt: App.today()
    });
    App.saveState(); App.closeModal(); App.handleRoute(); App.toast('Part added: ' + name);
  },

  editItem(id) {
    const i = (App.state.inventory || []).find(x => x.id === id);
    if (!i) return;
    App.openModal(`
      <div class="modal-header"><h3>Edit Part</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>Name *</label><input class="form-control" id="ip-name" value="${App.esc(i.name)}"></div>
        <div class="form-group"><label>SKU</label><input class="form-control" id="ip-sku" value="${App.esc(i.sku || '')}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>Category</label>
          <select class="form-control" id="ip-cat">
            <option value="" ${!i.category?'selected':''}>— Select —</option>
            <option value="Pipe & Fittings" ${i.category==='Pipe & Fittings'?'selected':''}>Pipe & Fittings</option>
            <option value="Valves" ${i.category==='Valves'?'selected':''}>Valves</option>
            <option value="Fixtures" ${i.category==='Fixtures'?'selected':''}>Fixtures</option>
            <option value="Water Heaters" ${i.category==='Water Heaters'?'selected':''}>Water Heaters</option>
            <option value="Tools" ${i.category==='Tools'?'selected':''}>Tools</option>
            <option value="Consumables" ${i.category==='Consumables'?'selected':''}>Consumables</option>
            <option value="Adhesives & Sealants" ${i.category==='Adhesives & Sealants'?'selected':''}>Adhesives & Sealants</option>
            <option value="Other" ${i.category==='Other'?'selected':''}>Other</option>
          </select>
        </div>
        <div class="form-group"><label>Location</label>
          <select class="form-control" id="ip-loc">
            <option value="truck" ${i.location==='truck'?'selected':''}>Truck</option>
            <option value="warehouse" ${i.location==='warehouse'?'selected':''}>Warehouse</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div class="form-group"><label>Quantity *</label><input class="form-control" type="number" id="ip-qty" value="${i.qty}"></div>
        <div class="form-group"><label>Unit Cost ($)</label><input class="form-control" type="number" step="0.01" id="ip-cost" value="${i.unitCost}"></div>
        <div class="form-group"><label>Reorder Level</label><input class="form-control" type="number" id="ip-reorder" value="${i.reorderLevel}"></div>
      </div>
      <div class="form-group"><label>Supplier</label><input class="form-control" id="ip-supplier" value="${App.esc(i.supplier || '')}"></div>
      <div class="form-group"><label>Notes</label><textarea class="form-control" id="ip-notes">${App.esc(i.notes || '')}</textarea></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Inventory._saveEdit('${id}')">Save</button>
      </div>
    `);
  },

  _saveEdit(id) {
    const i = (App.state.inventory || []).find(x => x.id === id);
    if (!i) return;
    const name = document.getElementById('ip-name').value.trim();
    if (!name) return App.toast('Part name is required', 'error');
    i.name = name;
    i.sku = document.getElementById('ip-sku').value.trim();
    i.category = document.getElementById('ip-cat').value;
    i.qty = parseInt(document.getElementById('ip-qty').value) || 0;
    i.unitCost = parseFloat(document.getElementById('ip-cost').value) || 0;
    i.reorderLevel = parseInt(document.getElementById('ip-reorder').value) || 0;
    i.supplier = document.getElementById('ip-supplier').value.trim();
    i.location = document.getElementById('ip-loc').value;
    i.notes = document.getElementById('ip-notes').value.trim();
    i.updatedAt = App.today();
    App.saveState(); App.closeModal(); App.handleRoute(); App.toast('Part updated');
  },

  adjustStock(id) {
    const i = (App.state.inventory || []).find(x => x.id === id);
    if (!i) return;
    App.openModal(`
      <div class="modal-header"><h3>Adjust Stock — ${App.esc(i.name)}</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <p style="margin-bottom:16px">Current quantity: <strong>${i.qty}</strong></p>
      <div class="form-group"><label>Adjustment Type</label>
        <select class="form-control" id="adj-type">
          <option value="add">Add Stock (+)</option>
          <option value="subtract">Remove Stock (−)</option>
          <option value="set">Set Exact Quantity</option>
        </select>
      </div>
      <div class="form-group"><label>Quantity</label><input class="form-control" type="number" id="adj-qty" value="1" min="0"></div>
      <div class="form-group"><label>Reason</label>
        <select class="form-control" id="adj-reason">
          <option value="restock">Restock / Purchase</option>
          <option value="used">Used on Job</option>
          <option value="damaged">Damaged / Lost</option>
          <option value="correction">Inventory Correction</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-group"><label>Job (optional)</label>
        <select class="form-control" id="adj-job">
          <option value="">— None —</option>
          ${(App.state.jobs || []).slice(0, 20).map(j => `<option value="${j.id}">${App.esc(j.title || 'Job')} — ${App.esc(j.customer || '')} (${App.formatDate(j.date)})</option>`).join('')}
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Inventory._doAdjust('${id}')">Apply</button>
      </div>
    `);
  },

  _doAdjust(id) {
    const i = (App.state.inventory || []).find(x => x.id === id);
    if (!i) return;
    const type = document.getElementById('adj-type').value;
    const qty = parseInt(document.getElementById('adj-qty').value) || 0;
    const reason = document.getElementById('adj-reason').value;
    const jobId = document.getElementById('adj-job').value;
    if (qty <= 0) return App.toast('Enter a valid quantity', 'error');

    if (type === 'add') i.qty += qty;
    else if (type === 'subtract') {
      if (i.qty < qty) return App.toast('Not enough stock', 'error');
      i.qty -= qty;
    } else {
      i.qty = qty;
    }
    i.updatedAt = App.today();

    // Track usage if linked to a job
    if (jobId && type === 'subtract') {
      const job = (App.state.jobs || []).find(j => j.id === jobId);
      if (job) {
        if (!job.partsUsed) job.partsUsed = [];
        job.partsUsed.push({ itemId: id, name: i.name, qty, cost: qty * (i.unitCost || 0) });
      }
    }

    App.saveState(); App.closeModal(); App.handleRoute();
    App.toast('Stock adjusted: ' + i.name + ' → ' + i.qty + ' units');
  },

  async removeItem(id) {
    if (await App.confirm('Delete this part from inventory?')) {
      App.state.inventory = (App.state.inventory || []).filter(i => i.id !== id);
      App.saveState(); App.handleRoute(); App.toast('Part removed');
    }
  },

  exportCSV() {
    const items = App.state.inventory || [];
    const rows = [['Name','SKU','Category','Quantity','Unit Cost','Total Value','Reorder Level','Supplier','Location','Notes']];
    items.forEach(i => {
      rows.push([i.name, i.sku || '', i.category || '', i.qty, i.unitCost, (i.qty * (i.unitCost || 0)).toFixed(2), i.reorderLevel || '', i.supplier || '', i.location || '', i.notes || '']);
    });
    App.downloadCSV(rows, 'halluc-plumbing-inventory-' + App.today() + '.csv');
    App.toast('Inventory exported as CSV');
  }
};
