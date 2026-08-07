// Scheduler Page — with job-to-invoice conversion
Pages.scheduler = function() {
  const jobs = App.state.jobs || [];
  const today = App.today();
  const thisWeek = jobs.filter(j => {
    const d = new Date(j.date); const now = new Date();
    const diff = (d - now) / 86400000;
    return diff >= -1 && diff <= 7;
  }).sort((a,b) => a.date.localeCompare(b.date) || (a.time||'').localeCompare(b.time||''));

  return `
    <div class="page-header"><h2>Job Scheduler</h2><p>Schedule and track jobs</p></div>
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-primary" onclick="Scheduler.addJob()">+ New Job</button>
      <input class="form-control" id="sched-search" placeholder="Search jobs..." style="max-width:250px" oninput="Scheduler._filter()">
      <select class="form-control" id="sched-status-filter" style="max-width:160px" onchange="Scheduler._filter()">
        <option value="">All Statuses</option>
        <option value="scheduled">Scheduled</option>
        <option value="in-progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-header"><h3>This Week</h3></div>
        ${thisWeek.length === 0
          ? '<div class="empty-state"><div class="icon" id="empty-scheduler"></div><h3>No upcoming jobs</h3></div>'
          : thisWeek.map(j => `<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
              <div><strong>${App.esc(j.title)}</strong><br><small>${App.formatDate(j.date)} ${j.time||''} — ${App.esc(j.customer)||'No customer'}</small>
                ${j.address?'<br><small>'+App.googleMapsLink(j.address)+'</small>':''}</div>
              <div style="display:flex;gap:6px">
                <span class="badge badge-${j.status==='completed'?'success':j.status==='in-progress'?'info':'warning'}">${j.status||'scheduled'}</span>
                <button class="btn btn-sm btn-outline" onclick="Scheduler.edit('${j.id}')">Edit</button>
              </div>
            </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-header"><h3>All Jobs</h3></div>
        <div class="table-wrap"><table id="sched-table">
          <thead><tr><th>Date</th><th>Job</th><th>Customer</th><th>📷</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${(jobs||[]).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30).map(j => {
            const pc = (j.photos||[]).length;
            return `<tr class="sched-row" data-search="${(j.title+' '+(j.customer||'')+' '+(j.address||'')).toLowerCase()}" data-status="${j.status||'scheduled'}">
            <td>${App.formatDate(j.date)}</td><td>${j.title}</td><td>${App.esc(j.customer)||'—'}</td>
            <td>${pc > 0 ? '<span class="badge badge-info">📷 '+pc+'</span>' : '—'}</td>
            <td><span class="badge badge-${j.status==='completed'?'success':j.status==='in-progress'?'info':'warning'}">${j.status||'scheduled'}</span></td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm btn-outline" onclick="Scheduler.edit('${j.id}')">Edit</button>
              ${j.status==='completed' && j.customer && !j.invoiced ? `<button class="btn btn-sm btn-primary" onclick="Scheduler.toInvoice('${j.id}')">→ Invoice</button>` : ''}
              <button class="btn btn-sm btn-danger" onclick="Scheduler.remove('${j.id}')">✕</button></td>
          </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>
    </div>`;
};

PageInit.scheduler = function() {
  Scheduler._filter();
};

const Scheduler = {
  _filter() {
    App.filterRows({ searchId: 'sched-search', statusId: 'sched-status-filter', rowClass: 'sched-row', searchFields: ['search'] });
  },

  addJob() {
    const id = App.genId();
    App.state.jobs.push({ id, title:'', customer:'', date: App.today(), time:'', address:'', notes:'', status:'scheduled', photos:[] });
    App.saveState();
    this.edit(id);
  },
  edit(id) {
    const j = App.state.jobs.find(x => x.id === id);
    if (!j) return;
    if (!j.photos) j.photos = [];
    const custs = (App.state.customers || []).map(c => `<option value="${c.name}" ${j.customer===c.name?'selected':''}>${c.name}</option>`).join('');
    const photoCount = j.photos.length;
    App.openModal(`<div class="modal-header"><h3>${j.title?'Edit':'New'} Job</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div class="form-group"><label>Title</label><input class="form-control" id="jf-title" value="${j.title||''}"></div>
      <div class="form-group"><label>Customer</label>
        <select class="form-control" id="jf-cust-select" onchange="document.getElementById('jf-cust').value=this.value">
          <option value="">— Select existing or type below —</option>
          ${custs}
        </select>
        <input class="form-control" id="jf-cust" value="${j.customer||''}" placeholder="Or type customer name" style="margin-top:6px">
      </div>
      <div class="form-group"><label>Date</label><input class="form-control" type="date" id="jf-date" value="${j.date}"></div>
      <div class="form-group"><label>Time</label><input class="form-control" type="time" id="jf-time" value="${j.time||''}"></div>
      <div class="form-group"><label>Address</label><input class="form-control" id="jf-addr" value="${j.address||''}"></div>
      <div class="form-group"><label>Status</label>
        <select class="form-control" id="jf-status" onchange="document.getElementById('jf-sig-section').style.display = this.value === 'completed' ? '' : 'none'">
          <option value="scheduled" ${j.status==='scheduled'?'selected':''}>Scheduled</option>
          <option value="in-progress" ${j.status==='in-progress'?'selected':''}>In Progress</option>
          <option value="completed" ${j.status==='completed'?'selected':''}>Completed</option>
          <option value="cancelled" ${j.status==='cancelled'?'selected':''}>Cancelled</option>
        </select></div>
      <div class="form-group"><label>Notes</label><textarea class="form-control" id="jf-notes">${j.notes||''}</textarea></div>

      <div class="form-group" id="jf-sig-section" style="${j.status === 'completed' ? '' : 'display:none'}">
        <div id="jf-signature-pad"></div>
      </div>

      <div class="form-group">
        <label>📷 Photos (${photoCount})</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px" id="jf-photos">
          ${j.photos.map((p,idx) => `<div style="position:relative;width:80px;height:80px;border-radius:6px;overflow:hidden;border:1px solid var(--border-light)">
            <img src="${p.url}" alt="${App.escapeHtml(p.caption||p.name)}" style="width:100%;height:100%;object-fit:cover">
            <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);color:#fff;font-size:9px;padding:2px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${App.escapeHtml(p.caption||'')}</div>
            <button onclick="Scheduler.removePhoto('${id}',${idx})" style="position:absolute;top:2px;right:2px;background:rgba(220,38,38,0.85);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;line-height:1">✕</button>
          </div>`).join('')}
        </div>
        <input type="file" id="jf-photo-input" accept="image/*" multiple style="display:none" onchange="Scheduler.handlePhotoUpload('${id}',this.files)">
        <button class="btn btn-sm btn-outline" onclick="document.getElementById('jf-photo-input').click()">📷 Add Photos</button>
      </div>

      <div class="modal-footer">
        ${j.signature ? '<div style="margin-right:auto"><img src="'+j.signature+'" style="max-width:120px;border:1px solid var(--border);border-radius:4px;background:#fff;padding:2px"><br><small style="color:var(--success)">✓ Customer signed</small></div>' : ''}
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Scheduler._save('${id}')">Save</button>
      </div>`);
    // Initialize signature pad if status is completed
    if (j.status === 'completed' || document.getElementById('jf-status')?.value === 'completed') {
      setTimeout(() => SignaturePad.render('jf-signature-pad', { existing: j.signature || '', label: 'Customer Sign-Off (Job Completion)' }), 100);
    }
  },
  _save(id) {
    const j = App.state.jobs.find(x => x.id === id);
    if (!j) return App.toast('Job not found', 'error');
    j.title = document.getElementById('jf-title').value;
    j.customer = document.getElementById('jf-cust').value;
    j.date = document.getElementById('jf-date').value;
    j.time = document.getElementById('jf-time').value;
    j.address = document.getElementById('jf-addr').value;
    j.status = document.getElementById('jf-status').value;
    j.notes = document.getElementById('jf-notes').value;
    // Capture signature if completed
    const sigData = SignaturePad.toDataURL('jf-signature-pad');
    if (sigData) j.signature = sigData;
    App.saveState(); App.closeModal(); App.handleRoute(); App.toast('Job saved');
  },

  handlePhotoUpload(jobId, files) {
    const j = App.state.jobs.find(x => x.id === jobId);
    if (!j) return;
    if (!j.photos) j.photos = [];
    Array.from(files).forEach(file => {
      // Compress photo before storing
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          const MAX = 800;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
            else { w = Math.round(w * MAX / h); h = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.6);
          j.photos.push({
            url: compressed,
            name: file.name,
            date: App.today(),
            caption: ''
          });
          App.saveState();
          this.edit(jobId);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  async removePhoto(jobId, photoIdx) {
    if (!(await App.confirm('Delete this photo?'))) return;
    const j = App.state.jobs.find(x => x.id === jobId);
    if (!j || !j.photos) return;
    j.photos.splice(photoIdx, 1);
    App.saveState();
    this.edit(jobId);
  },

  toInvoice(jobId) {
    const j = App.state.jobs.find(x => x.id === jobId);
    if (!j) return App.toast('Job not found', 'error');
    if (j.invoiced) return App.toast('Already invoiced — check Invoices', 'error');
    const invId = App.genId();
    const invNum = App.state.nextInvoiceNum++;
    App.state.invoices.push({
      id: invId, number: invNum, date: App.today(), dueDate: '',
      customer: j.customer, customerEmail: '',
      items: [{ desc: j.title || 'Service call', price: 0 }],
      notes: j.notes || '', status: 'unpaid',
      subtotal: 0, tax: 0, total: 0, taxExempt: false, jobId: j.id
    });
    if (j.signature) { const _inv = App.state.invoices.find(i => i.id === invId); if (_inv) _inv.signature = j.signature; }
    j.invoiced = true;
    j.invoiceId = invId;
    App.saveState();
    App.toast('Invoice #' + invNum + ' created — add items and pricing');
    window.location.hash = 'invoices';
    setTimeout(() => Invoices.edit(invId), 300);
  },
  async remove(id) {
    if (await App.confirm('Delete this job?')) {
      App.state.jobs = App.state.jobs.filter(j => j.id !== id);
      App.saveState(); App.handleRoute(); App.toast('Job deleted');
    }
  }
};
