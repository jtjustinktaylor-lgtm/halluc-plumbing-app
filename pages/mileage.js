// Mileage / Travel Tracking Page
Pages.mileage = function() {
  const trips = App.state.mileage || [];
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTrips = trips.filter(t => (t.date || '').startsWith(thisMonth));
  const monthMiles = monthTrips.reduce((s, t) => s + (t.distance || 0), 0);
  const monthDeduction = monthTrips.reduce((s, t) => s + (t.amount || 0), 0);
  const yearStr = String(new Date().getFullYear());
  const yearTrips = trips.filter(t => (t.date || '').startsWith(yearStr));
  const yearMiles = yearTrips.reduce((s, t) => s + (t.distance || 0), 0);
  const yearDeduction = yearTrips.reduce((s, t) => s + (t.amount || 0), 0);
  const totalMiles = trips.reduce((s, t) => s + (t.distance || 0), 0);
  const totalDeduction = trips.reduce((s, t) => s + (t.amount || 0), 0);

  // Monthly breakdown for current year
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyBreakdown = months.map((m, idx) => {
    const prefix = yearStr + '-' + String(idx + 1).padStart(2, '0');
    const mTrips = yearTrips.filter(t => (t.date || '').startsWith(prefix));
    return { month: m, trips: mTrips.length, miles: mTrips.reduce((s, t) => s + (t.distance || 0), 0), deduction: mTrips.reduce((s, t) => s + (t.amount || 0), 0) };
  });

  return `
    <div class="page-header"><h2>Mileage Tracker</h2><p>Track travel for tax deductions</p></div>
    <div class="grid grid-4">
      <div class="stat-card"><div><div class="stat-value">${monthMiles.toFixed(1)}</div><div class="stat-label">This Month (miles)</div></div></div>
      <div class="stat-card"><div><div class="stat-value">${App.formatCurrency(monthDeduction)}</div><div class="stat-label">This Month Deduction</div></div></div>
      <div class="stat-card"><div><div class="stat-value">${yearMiles.toFixed(1)}</div><div class="stat-label">${yearStr} Total Miles</div></div></div>
      <div class="stat-card"><div><div class="stat-value">${App.formatCurrency(yearDeduction)}</div><div class="stat-label">${yearStr} Deduction</div></div></div>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header"><h3>Trip Log</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="Mileage.addTrip()">+ Log Trip</button>
          <button class="btn btn-outline" onclick="Mileage.exportCSV()">📊 Export CSV</button>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
        <input class="form-control" id="mile-search" placeholder="Search trips..." style="max-width:200px" oninput="Mileage._filter()">
        <input class="form-control" type="date" id="mile-from" style="max-width:160px" onchange="Mileage._filter()" placeholder="From">
        <input class="form-control" type="date" id="mile-to" style="max-width:160px" onchange="Mileage._filter()" placeholder="To">
        <select class="form-control" id="mile-purpose-filter" style="max-width:160px" onchange="Mileage._filter()">
          <option value="">All Purposes</option>
          <option value="job">Job</option>
          <option value="estimate">Estimate</option>
          <option value="supply run">Supply Run</option>
          <option value="other">Other</option>
        </select>
      </div>
      ${trips.length === 0
        ? '<div class="empty-state"><div class="icon">🚗</div><h3>No trips logged</h3><p>Log your first trip to start tracking mileage</p></div>'
        : `<div class="table-wrap"><table id="mile-table">
            <thead><tr><th>Date</th><th>From</th><th>To</th><th>Purpose</th><th>Distance</th><th>Deduction</th><th>Notes</th><th></th></tr></thead>
            <tbody>${trips.sort((a,b) => b.date.localeCompare(a.date)).map(t => `
              <tr class="mile-row" data-purpose="${t.purpose || ''}" data-date="${t.date || ''}" data-search="${((t.from||'')+' '+(t.to||'')+' '+(t.notes||'')+' '+(t.purpose||'')).toLowerCase()}">
                <td>${App.formatDate(t.date)}</td>
                <td>${App.esc(t.from || '—')}</td>
                <td>${App.esc(t.to || '—')}</td>
                <td><span class="badge badge-${t.purpose==='job'?'info':t.purpose==='estimate'?'warning':'muted'}">${App.esc(t.purpose || '—')}</span></td>
                <td>${(t.distance || 0).toFixed(1)} ${t.unit || 'mi'}</td>
                <td style="font-weight:600;color:var(--success)">${App.formatCurrency(t.amount)}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${App.esc(t.notes || '')}">${App.esc(t.notes || '—')}</td>
                <td style="white-space:nowrap">
                  <button class="btn btn-sm btn-outline" onclick="Mileage.editTrip('${t.id}')">Edit</button>
                  <button class="btn btn-sm btn-danger" onclick="Mileage.removeTrip('${t.id}')">✕</button>
                </td>
              </tr>`).join('')}</tbody>
          </table></div>`}
    </div>

    <!-- Monthly Breakdown -->
    ${yearTrips.length > 0 ? `
    <div class="card" style="margin-top:20px">
      <div class="card-header"><h3>📊 ${yearStr} Monthly Breakdown</h3>
        <button class="btn btn-sm btn-outline" onclick="Mileage.printReport()">🖨️ Print Report</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Month</th><th>Trips</th><th>Miles</th><th>Deduction</th></tr></thead>
        <tbody>${monthlyBreakdown.map(m => `<tr>
          <td>${m.month}</td><td>${m.trips}</td><td>${m.miles.toFixed(1)}</td><td>${App.formatCurrency(m.deduction)}</td>
        </tr>`).join('')}
          <tr style="font-weight:700;border-top:2px solid var(--navy)">
            <td>Total</td><td>${yearTrips.length}</td><td>${yearMiles.toFixed(1)}</td><td>${App.formatCurrency(yearDeduction)}</td>
          </tr>
        </tbody></table></div>
    </div>` : ''}

    <!-- Rate Config -->
    <div class="card" style="margin-top:20px">
      <div class="card-header"><h3>⚙️ Rate Settings</h3></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:400px">
        <div class="form-group"><label>Rate per Mile ($)</label><input class="form-control" type="number" step="0.01" id="mile-rate" value="${App.state.mileageRate || 0.70}" onchange="Mileage._saveRate()"></div>
        <div class="form-group"><label>Unit</label>
          <select class="form-control" id="mile-unit" onchange="Mileage._saveRate()">
            <option value="mi" ${(App.state.mileageUnit || 'mi') === 'mi' ? 'selected' : ''}>Miles (IRS)</option>
            <option value="km" ${(App.state.mileageUnit || 'mi') === 'km' ? 'selected' : ''}>Kilometers (CRA)</option>
          </select>
        </div>
      </div>
      <p style="color:var(--text-muted);font-size:12px;margin-top:8px">Default: $0.70/mi (2026 IRS) or $0.72/km (CRA). Adjust as needed.</p>
    </div>
  `;
};

PageInit.mileage = function() {
  Mileage._filter();
};

const Mileage = {
  _filter() {
    const q = (document.getElementById('mile-search')?.value || '').toLowerCase();
    const from = document.getElementById('mile-from')?.value || '';
    const to = document.getElementById('mile-to')?.value || '';
    const purpose = document.getElementById('mile-purpose-filter')?.value || '';
    document.querySelectorAll('.mile-row').forEach(row => {
      const matchText = !q || (row.dataset.search || '').includes(q);
      const matchPurpose = !purpose || row.dataset.purpose === purpose;
      const matchFrom = !from || row.dataset.date >= from;
      const matchTo = !to || row.dataset.date <= to;
      row.style.display = (matchText && matchPurpose && matchFrom && matchTo) ? '' : 'none';
    });
  },

  _getRate() {
    return parseFloat(document.state?.mileageRate) || parseFloat(App.state.mileageRate) || 0.70;
  },

  _getUnit() {
    return App.state.mileageUnit || 'mi';
  },

  _saveRate() {
    App.state.mileageRate = parseFloat(document.getElementById('mile-rate').value) || 0.70;
    App.state.mileageUnit = document.getElementById('mile-unit').value;
    App.saveState();
    App.toast('Mileage rate updated');
  },

  addTrip() {
    if (!App.state.mileage) App.state.mileage = [];
    const rate = App.state.mileageRate || 0.70;
    const unit = App.state.mileageUnit || 'mi';
    const jobs = (App.state.jobs || []).filter(j => j.status !== 'completed' || (j.date || '') >= new Date(Date.now() - 30*86400000).toISOString().slice(0,10));
    const jobOptions = jobs.map(j => `<option value="${j.id}">${App.esc(j.title || 'Job')} — ${App.esc(j.customer || '')} (${App.formatDate(j.date)})</option>`).join('');

    App.openModal(`
      <div class="modal-header"><h3>Log Trip</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div class="form-group"><label>Date</label><input class="form-control" type="date" id="mt-date" value="${App.today()}"></div>
      <div class="form-group"><label>From Address</label><input class="form-control" id="mt-from" placeholder="Starting location"></div>
      <div class="form-group"><label>To Address</label><input class="form-control" id="mt-to" placeholder="Destination"></div>
      <div class="form-group"><label>Purpose</label>
        <select class="form-control" id="mt-purpose">
          <option value="job">Job</option>
          <option value="estimate">Estimate</option>
          <option value="supply run">Supply Run</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>Distance (${unit})</label><input class="form-control" type="number" step="0.1" id="mt-distance" oninput="Mileage._calcAmount()"></div>
        <div class="form-group"><label>Deduction ($)</label><input class="form-control" type="number" step="0.01" id="mt-amount" value="0" readonly style="background:var(--bg)"></div>
      </div>
      <div class="form-group"><label>Link to Job (optional)</label>
        <select class="form-control" id="mt-job">
          <option value="">— None —</option>
          ${jobOptions}
        </select>
      </div>
      <div class="form-group"><label>Notes</label><input class="form-control" id="mt-notes" placeholder="Optional notes"></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Mileage._saveTrip()">Save Trip</button>
      </div>
    `);
  },

  _calcAmount() {
    const dist = parseFloat(document.getElementById('mt-distance')?.value) || 0;
    const rate = App.state.mileageRate || 0.70;
    const amtEl = document.getElementById('mt-amount');
    if (amtEl) amtEl.value = (dist * rate).toFixed(2);
  },

  _saveTrip() {
    const date = document.getElementById('mt-date').value;
    const from = document.getElementById('mt-from').value.trim();
    const to = document.getElementById('mt-to').value.trim();
    const purpose = document.getElementById('mt-purpose').value;
    const distance = parseFloat(document.getElementById('mt-distance').value) || 0;
    const notes = document.getElementById('mt-notes').value.trim();
    const jobId = document.getElementById('mt-job').value;
    const rate = App.state.mileageRate || 0.70;
    const unit = App.state.mileageUnit || 'mi';
    const amount = parseFloat((distance * rate).toFixed(2));

    if (!date) return App.toast('Date is required', 'error');
    if (!from) return App.toast('From address is required', 'error');
    if (!to) return App.toast('To address is required', 'error');
    if (distance <= 0) return App.toast('Distance must be greater than 0', 'error');

    if (!App.state.mileage) App.state.mileage = [];
    App.state.mileage.push({
      id: App.genId(), date, from, to, purpose, distance, unit, rate, amount, notes, jobId, createdAt: App.today()
    });
    App.saveState(); App.closeModal(); App.handleRoute(); App.toast('Trip logged: ' + distance.toFixed(1) + ' ' + unit);
  },

  editTrip(id) {
    const t = (App.state.mileage || []).find(x => x.id === id);
    if (!t) return;
    const jobs = (App.state.jobs || []).filter(j => j.status !== 'completed' || (j.date || '') >= new Date(Date.now() - 30*86400000).toISOString().slice(0,10));
    const jobOptions = jobs.map(j => `<option value="${j.id}" ${t.jobId === j.id ? 'selected' : ''}>${App.esc(j.title || 'Job')} — ${App.esc(j.customer || '')} (${App.formatDate(j.date)})</option>`).join('');

    App.openModal(`
      <div class="modal-header"><h3>Edit Trip</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div class="form-group"><label>Date</label><input class="form-control" type="date" id="mt-date" value="${t.date}"></div>
      <div class="form-group"><label>From Address</label><input class="form-control" id="mt-from" value="${App.esc(t.from)}"></div>
      <div class="form-group"><label>To Address</label><input class="form-control" id="mt-to" value="${App.esc(t.to)}"></div>
      <div class="form-group"><label>Purpose</label>
        <select class="form-control" id="mt-purpose">
          <option value="job" ${t.purpose==='job'?'selected':''}>Job</option>
          <option value="estimate" ${t.purpose==='estimate'?'selected':''}>Estimate</option>
          <option value="supply run" ${t.purpose==='supply run'?'selected':''}>Supply Run</option>
          <option value="other" ${t.purpose==='other'?'selected':''}>Other</option>
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>Distance (${t.unit || 'mi'})</label><input class="form-control" type="number" step="0.1" id="mt-distance" value="${t.distance}" oninput="Mileage._calcAmountEdit('${id}')"></div>
        <div class="form-group"><label>Deduction ($)</label><input class="form-control" type="number" step="0.01" id="mt-amount" value="${t.amount}" readonly style="background:var(--bg)"></div>
      </div>
      <div class="form-group"><label>Link to Job (optional)</label>
        <select class="form-control" id="mt-job">
          <option value="">— None —</option>
          ${jobOptions}
        </select>
      </div>
      <div class="form-group"><label>Notes</label><input class="form-control" id="mt-notes" value="${App.esc(t.notes || '')}"></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Mileage._saveEditTrip('${id}')">Save</button>
      </div>
    `);
  },

  _calcAmountEdit(id) {
    const t = (App.state.mileage || []).find(x => x.id === id);
    if (!t) return;
    const dist = parseFloat(document.getElementById('mt-distance')?.value) || 0;
    const rate = t.rate || App.state.mileageRate || 0.70;
    const amtEl = document.getElementById('mt-amount');
    if (amtEl) amtEl.value = (dist * rate).toFixed(2);
  },

  _saveEditTrip(id) {
    const t = (App.state.mileage || []).find(x => x.id === id);
    if (!t) return;
    const distance = parseFloat(document.getElementById('mt-distance').value) || 0;
    if (distance <= 0) return App.toast('Distance must be greater than 0', 'error');
    t.date = document.getElementById('mt-date').value;
    t.from = document.getElementById('mt-from').value.trim();
    t.to = document.getElementById('mt-to').value.trim();
    t.purpose = document.getElementById('mt-purpose').value;
    t.distance = distance;
    t.amount = parseFloat((distance * t.rate).toFixed(2));
    t.jobId = document.getElementById('mt-job').value;
    t.notes = document.getElementById('mt-notes').value.trim();
    App.saveState(); App.closeModal(); App.handleRoute(); App.toast('Trip updated');
  },

  async removeTrip(id) {
    if (await App.confirm('Delete this trip?')) {
      App.state.mileage = (App.state.mileage || []).filter(t => t.id !== id);
      App.saveState(); App.handleRoute(); App.toast('Trip deleted');
    }
  },

  exportCSV() {
    const trips = App.state.mileage || [];
    const rows = [['Date','From','To','Purpose','Distance','Unit','Rate','Deduction','Notes','Job ID']];
    trips.forEach(t => {
      rows.push([t.date, t.from, t.to, t.purpose || '', t.distance, t.unit || 'mi', t.rate, t.amount, t.notes || '', t.jobId || '']);
    });
    App.downloadCSV(rows, 'halluc-plumbing-mileage-' + App.today() + '.csv');
    App.toast('Mileage exported as CSV');
  },

  printReport() {
    const yearStr = String(new Date().getFullYear());
    const trips = (App.state.mileage || []).filter(t => (t.date || '').startsWith(yearStr));
    const totalMiles = trips.reduce((s, t) => s + (t.distance || 0), 0);
    const totalDeduction = trips.reduce((s, t) => s + (t.amount || 0), 0);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyRows = months.map((m, idx) => {
      const prefix = yearStr + '-' + String(idx + 1).padStart(2, '0');
      const mTrips = trips.filter(t => (t.date || '').startsWith(prefix));
      const mDist = mTrips.reduce((s, t) => s + (t.distance || 0), 0);
      const mDed = mTrips.reduce((s, t) => s + (t.amount || 0), 0);
      return `<tr><td>${m}</td><td>${mTrips.length}</td><td>${mDist.toFixed(1)}</td><td>${App.formatCurrency(mDed)}</td></tr>`;
    }).join('');

    const tripRows = trips.sort((a,b) => a.date.localeCompare(b.date)).map(t =>
      `<tr><td>${App.formatDate(t.date)}</td><td>${t.from}</td><td>${t.to}</td><td>${t.purpose || ''}</td><td>${t.distance.toFixed(1)} ${t.unit || 'mi'}</td><td>${App.formatCurrency(t.amount)}</td></tr>`
    ).join('');

    App.printSection(`
      <div style="text-align:center;margin-bottom:24px">
        <h2 style="color:#1B3A5C;margin:0">Mileage Report — ${yearStr}</h2>
        <p style="color:#666">${App.getBusinessInfo().name} • ${App.getBusinessInfo().contact}</p>
      </div>
      <div style="display:flex;justify-content:space-around;margin:24px 0;padding:16px;background:#f8f9fa;border-radius:8px">
        <div style="text-align:center"><div style="font-size:12px;color:#666">Total Trips</div><div style="font-size:20px;font-weight:700">${trips.length}</div></div>
        <div style="text-align:center"><div style="font-size:12px;color:#666">Total Miles</div><div style="font-size:20px;font-weight:700">${totalMiles.toFixed(1)}</div></div>
        <div style="text-align:center"><div style="font-size:12px;color:#666">Total Deduction</div><div style="font-size:20px;font-weight:700">${App.formatCurrency(totalDeduction)}</div></div>
      </div>
      <h3>Monthly Summary</h3>
      <table><thead><tr><th>Month</th><th>Trips</th><th>Miles</th><th>Deduction</th></tr></thead><tbody>${monthlyRows}
        <tr style="font-weight:700;border-top:2px solid #1B3A5C"><td>Total</td><td>${trips.length}</td><td>${totalMiles.toFixed(1)}</td><td>${App.formatCurrency(totalDeduction)}</td></tr></tbody></table>
      ${trips.length > 0 ? `<h3 style="margin-top:24px">Trip Details</h3>
        <table><thead><tr><th>Date</th><th>From</th><th>To</th><th>Purpose</th><th>Distance</th><th>Deduction</th></tr></thead><tbody>${tripRows}</tbody></table>` : ''}
      <div style="margin-top:32px;font-size:11px;color:#999;text-align:center">Generated ${App.formatDate(App.today())} — Halluc Plumbing Business Manager</div>
    `, yearStr + ' Mileage Report');
  }
};
