// Follow-Up Reminders Page — post-job customer retention
Pages.followups = function() {
  const followUps = App.state.followUps || [];
  const today = App.today();
  const pending = followUps.filter(f => f.status === 'pending');
  const due = pending.filter(f => f.followUpDate <= today);
  const upcoming = pending.filter(f => f.followUpDate > today);
  const done = followUps.filter(f => f.status === 'done');
  const skipped = followUps.filter(f => f.status === 'skipped');

  return `
    <div class="page-header">
      <h2>Follow-Up Reminders</h2>
      <p>Stay connected with customers after every job — build loyalty, get reviews, prevent callbacks</p>
    </div>

    <div class="grid grid-4" style="margin-bottom:16px">
      <div class="stat-card">
        <div class="stat-icon" id="stat-fu-due"></div>
        <div>
          <div class="stat-value" style="color:${due.length > 0 ? 'var(--danger)' : 'var(--text)'}">${due.length}</div>
          <div class="stat-label">Due Now</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" id="stat-fu-upcoming"></div>
        <div>
          <div class="stat-value">${upcoming.length}</div>
          <div class="stat-label">Upcoming</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" id="stat-fu-done"></div>
        <div>
          <div class="stat-value" style="color:var(--success)">${done.length}</div>
          <div class="stat-label">Completed</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" id="stat-fu-rate"></div>
        <div>
          <div class="stat-value">${done.length + skipped.length > 0 ? Math.round(done.length / (done.length + skipped.length) * 100) : 0}%</div>
          <div class="stat-label">Completion Rate</div>
        </div>
      </div>
    </div>

    ${due.length > 0 ? `
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px;color:var(--danger)">📞 Follow-Ups Due Now</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Customer</th><th>Job Total</th><th>Scheduled</th><th>Days Overdue</th><th>Actions</th></tr></thead>
        <tbody>${due.map(f => {
          const daysOverdue = Math.floor((new Date(today) - new Date(f.followUpDate)) / 86400000);
          return `<tr>
            <td><strong>${App.esc(f.customerName)}</strong></td>
            <td>${App.formatCurrency(f.invoiceTotal || 0)}</td>
            <td>${App.formatDate(f.followUpDate)}</td>
            <td><span class="badge badge-danger">${daysOverdue}d</span></td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm btn-primary" onclick="FollowUps.markDone('${f.id}')">✓ Done</button>
              <button class="btn btn-sm btn-outline" onclick="FollowUps.contact('${f.id}')">📧 Contact</button>
              <button class="btn btn-sm btn-outline" onclick="FollowUps.skip('${f.id}')">Skip</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>` : ''}

    ${upcoming.length > 0 ? `
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px;color:var(--navy)">📅 Upcoming Follow-Ups</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Customer</th><th>Job Total</th><th>Scheduled</th><th>Actions</th></tr></thead>
        <tbody>${upcoming.map(f => `
          <tr>
            <td><strong>${App.esc(f.customerName)}</strong></td>
            <td>${App.formatCurrency(f.invoiceTotal || 0)}</td>
            <td>${App.formatDate(f.followUpDate)}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm btn-primary" onclick="FollowUps.markDone('${f.id}')">✓ Done</button>
              <button class="btn btn-sm btn-outline" onclick="FollowUps.skip('${f.id}')">Skip</button>
            </td>
          </tr>
        `).join('')}</tbody>
      </table></div>
    </div>` : ''}

    ${pending.length === 0 ? `
    <div class="card">
      <div class="empty-state">
        <div class="icon" id="empty-followups"></div>
        <h3>No follow-ups scheduled</h3>
        <p>Follow-ups are automatically created when you mark invoices as paid. They'll appear here 30 days later.</p>
      </div>
    </div>` : ''}

    ${done.length > 0 ? `
    <details style="margin-top:16px">
      <summary style="cursor:pointer;font-weight:600;padding:8px">✅ Completed (${done.length})</summary>
      <div class="card" style="margin-top:8px"><div class="table-wrap"><table>
        <thead><tr><th>Customer</th><th>Job Total</th><th>Scheduled</th><th>Completed</th></tr></thead>
        <tbody>${done.slice(0, 20).map(f => `
          <tr>
            <td>${App.esc(f.customerName)}</td>
            <td>${App.formatCurrency(f.invoiceTotal || 0)}</td>
            <td>${App.formatDate(f.followUpDate)}</td>
            <td>${App.formatDate(f.completedAt)}</td>
          </tr>
        `).join('')}</tbody>
      </table></div></div>
    </details>` : ''}
  `;
};

PageInit.followups = function() {
  App.injectIcons({
    'stat-fu-due': 'scheduler',
    'stat-fu-upcoming': 'scheduler',
    'stat-fu-done': 'invoices',
    'stat-fu-rate': 'tracker',
    'empty-followups': 'scheduler',
  });
};

const FollowUps = {
  markDone(id) {
    const fu = (App.state.followUps || []).find(f => f.id === id);
    if (!fu) return;
    fu.status = 'done';
    fu.completedAt = App.today();
    App.saveState(); App.handleRoute(); App.toast('Follow-up marked complete');
  },

  skip(id) {
    const fu = (App.state.followUps || []).find(f => f.id === id);
    if (!fu) return;
    fu.status = 'skipped';
    fu.skippedAt = App.today();
    App.saveState(); App.handleRoute(); App.toast('Follow-up skipped');
  },

  contact(id) {
    const fu = (App.state.followUps || []).find(f => f.id === id);
    if (!fu) return;
    const biz = App.getBusinessInfo();
    const cust = (App.state.customers || []).find(c => c.name === fu.customerName);
    const email = cust?.email || '';
    const phone = cust?.phone || '';
    const body = `Hi ${fu.customerName},\n\nJust following up on the recent plumbing work we did for you. Everything going well?\n\nIf you have any questions or concerns, don't hesitate to reach out.\n\nIf you're happy with our work, we'd really appreciate a Google review — it helps us a lot as a small local business.\n\nThanks for choosing ${biz.name}!\n\n${biz.contact}\n${biz.phone}`;
    // Show contact options
    App.openModal(`
      <div class="modal-header"><h3>Contact ${App.esc(fu.customerName)}</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>
      <div style="display:flex;flex-direction:column;gap:12px;padding:16px 0">
        ${email ? `<button class="btn btn-outline" onclick="window.open('mailto:${email}?subject=Following Up — ${biz.name}&body=${encodeURIComponent(body)}');App.closeModal()">📧 Email</button>` : ''}
        ${phone ? `<button class="btn btn-outline" onclick="window.open('sms:${phone.replace(/\D/g,'')}?body=${encodeURIComponent('Hi '+fu.customerName+', just following up on the recent plumbing work. Everything going well? Thanks! '+biz.contact+' — '+biz.name)}');App.closeModal()">📱 Text</button>` : ''}
        ${phone ? `<button class="btn btn-outline" onclick="window.open('tel:${phone}');App.closeModal()">📞 Call</button>` : ''}
        ${!email && !phone ? '<p style="color:var(--text-muted);text-align:center">No contact info on file</p>' : ''}
      </div>
    `);
  },

  viewAll() {
    window.location.hash = 'followups';
  }
};
