// Discounts Page
Pages.discounts = function() {
  const discs = App.state.discounts || [];
  return `
    <div class="page-header"><h2>Discounts</h2><p>Manage promotional discounts and loyalty offers</p></div>
    <div style="margin-bottom:16px"><button class="btn btn-primary" onclick="Discounts.new()">+ New Discount</button></div>
    ${discs.length === 0
      ? '<div class="card"><div class="empty-state"><div class="icon" id="empty-discounts"></div><h3>No discounts yet</h3><p>Create discounts to offer customers</p></div></div>'
      : `<div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Type</th><th>Value</th><th>Applies To</th><th>Valid Until</th><th>Status</th><th></th></tr></thead>
        <tbody>${discs.map(d => `<tr>
          <td><strong>${d.name}</strong></td>
          <td>${d.type==='percent'?'Percentage':'Flat Amount'}</td>
          <td>${d.type==='percent'?d.value+'%':App.formatCurrency(d.value)}</td>
          <td>${d.appliesTo||'All services'}</td>
          <td>${d.validUntil?App.formatDate(d.validUntil):'No expiry'}</td>
          <td><span class="badge badge-${d.active?'success':'danger'}">${d.active?'Active':'Inactive'}</span></td>
          <td><button class="btn btn-sm btn-outline" onclick="Discounts.edit('${d.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="Discounts.remove('${d.id}')">✕</button></td>
        </tr>`).join('')}</tbody>
      </table></div></div>`}
    <div class="card" style="margin-top:16px">
      <div class="card-header"><h3>Quick Discount Templates</h3></div>
      <div style="display:flex;flex-wrap:wrap;gap:12px">
        <button class="btn btn-outline" onclick="Discounts._template('senior')">👴 Senior (10%)</button>
        <button class="btn btn-outline" onclick="Discounts._template('military')">🎖️ Military (15%)</button>
        <button class="btn btn-outline" onclick="Discounts._template('referral')">🤝 Referral ($50 off)</button>
        <button class="btn btn-outline" onclick="Discounts._template('repeat')">🔄 Repeat Customer (10%)</button>
        <button class="btn btn-outline" onclick="Discounts._template('seasonal')">☀️ Seasonal (20%)</button>
      </div>
    </div>`;
};

const Discounts = {
  new() {
    App.openModal(`<div class="modal-header"><h3>New Discount</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div class="form-group"><label>Name</label><input class="form-control" id="df-name"></div>
      <div class="form-group"><label>Type</label>
        <select class="form-control" id="df-type">
          <option value="percent">Percentage (%)</option>
          <option value="flat">Flat Amount ($)</option>
        </select></div>
      <div class="form-group"><label>Value</label><input class="form-control" type="number" step="0.01" id="df-val"></div>
      <div class="form-group"><label>Applies To</label><input class="form-control" id="df-applies" placeholder="All services (or specify)"></div>
      <div class="form-group"><label>Valid Until</label><input class="form-control" type="date" id="df-exp"></div>
      <div class="form-group"><label>Active</label>
        <select class="form-control" id="df-active"><option value="true">Yes</option><option value="false">No</option></select></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Discounts._saveNew()">Add Discount</button>
      </div>`);
  },
  _saveNew() {
    const name = document.getElementById('df-name').value.trim();
    if (!name) return App.toast('Name is required','error');
    App.state.discounts.push({
      id: App.genId(), name,
      type: document.getElementById('df-type').value,
      value: parseFloat(document.getElementById('df-val').value)||0,
      appliesTo: document.getElementById('df-applies').value,
      validUntil: document.getElementById('df-exp').value,
      active: document.getElementById('df-active').value==='true'
    });
    App.saveState(); App.closeModal(); App.handleRoute(); App.toast('Discount added');
  },
  edit(id) {
    const d = App.state.discounts.find(x => x.id === id);
    if (!d) return;
    App.openModal(`<div class="modal-header"><h3>Edit Discount</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div class="form-group"><label>Name</label><input class="form-control" id="df-name" value="${d.name}"></div>
      <div class="form-group"><label>Type</label>
        <select class="form-control" id="df-type">
          <option value="percent" ${d.type==='percent'?'selected':''}>Percentage (%)</option>
          <option value="flat" ${d.type==='flat'?'selected':''}>Flat Amount ($)</option>
        </select></div>
      <div class="form-group"><label>Value</label><input class="form-control" type="number" step="0.01" id="df-val" value="${d.value}"></div>
      <div class="form-group"><label>Applies To</label><input class="form-control" id="df-applies" value="${d.appliesTo||''}"></div>
      <div class="form-group"><label>Valid Until</label><input class="form-control" type="date" id="df-exp" value="${d.validUntil||''}"></div>
      <div class="form-group"><label>Active</label>
        <select class="form-control" id="df-active">
          <option value="true" ${d.active?'selected':''}>Yes</option>
          <option value="false" ${!d.active?'selected':''}>No</option>
        </select></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Discounts._saveEdit('${id}')">Save</button>
      </div>`);
  },
  _saveEdit(id) {
    const d = App.state.discounts.find(x => x.id === id);
    d.name = document.getElementById('df-name').value.trim();
    d.type = document.getElementById('df-type').value;
    d.value = parseFloat(document.getElementById('df-val').value)||0;
    d.appliesTo = document.getElementById('df-applies').value;
    d.validUntil = document.getElementById('df-exp').value;
    d.active = document.getElementById('df-active').value==='true';
    App.saveState(); App.closeModal(); App.handleRoute(); App.toast('Discount updated');
  },
  _template(type) {
    const templates = {
      senior: { name:'Senior Discount', type:'percent', value:10, appliesTo:'All services' },
      military: { name:'Military/Veteran Discount', type:'percent', value:15, appliesTo:'All services' },
      referral: { name:'Referral Bonus', type:'flat', value:50, appliesTo:'Next service call' },
      repeat: { name:'Repeat Customer', type:'percent', value:10, appliesTo:'All services' },
      seasonal: { name:'Seasonal Promotion', type:'percent', value:20, appliesTo:'Water heater services' },
    };
    const t = templates[type];
    App.state.discounts.push({ id: App.genId(), ...t, validUntil: '', active: true });
    App.saveState(); App.handleRoute(); App.toast(t.name + ' added');
  },
  async remove(id) {
    if (await App.confirm('Delete this discount?')) {
      App.state.discounts = App.state.discounts.filter(d => d.id !== id);
      App.saveState(); App.handleRoute(); App.toast('Discount deleted');
    }
  }
};
