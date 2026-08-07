// Quote Request Page — Customer-facing form
Pages['quote-request'] = function() {
  const cats = Object.entries(FLAT_RATES);
  return `
    <div class="page-header"><h2>Request a Quote</h2><p>Tell us about your plumbing needs and we'll get back to you quickly</p></div>
    <div class="card" style="max-width:720px">
      <form id="qr-form" onsubmit="QuoteRequest._submit(event)">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label>Your Name *</label><input class="form-control" id="qr-name" required></div>
          <div class="form-group"><label>Phone Number *</label><input class="form-control" id="qr-phone" type="tel" required></div>
        </div>
        <div class="form-group"><label>Email</label><input class="form-control" id="qr-email" type="email"></div>
        <div class="form-group"><label>Service Address *</label><input class="form-control" id="qr-addr" placeholder="123 Main St, Chatham, ON" required></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label>Type of Service</label>
            <select class="form-control" id="qr-type">
              <option value="">— Select —</option>
              ${cats.map(([k,v])=>`<optgroup label="${v.label}">${v.items.map(i=>`<option value="${i.desc}">${i.desc}</option>`).join('')}</optgroup>`).join('')}
              <option value="other">Other (describe below)</option>
            </select>
          </div>
          <div class="form-group"><label>Preferred Date</label><input class="form-control" id="qr-date" type="date"></div>
        </div>
        <div class="form-group"><label>Describe Your Issue *</label>
          <textarea class="form-control" id="qr-desc" rows="4" placeholder="Tell us what's happening — leaks, clogs, installations, renovations, etc." required></textarea>
        </div>
        <div class="form-group"><label>Urgency</label>
          <select class="form-control" id="qr-urgency">
            <option value="normal">Normal — within a few days</option>
            <option value="soon">Soon — within 24 hours</option>
            <option value="emergency">Emergency — ASAP</option>
          </select>
        </div>
        <div class="form-group"><label>How did you hear about us?</label>
          <select class="form-control" id="qr-source">
            <option value="">— Select —</option>
            <option value="referral">Friend / Referral</option>
            <option value="google">Google Search</option>
            <option value="social">Social Media</option>
            <option value="sign">Sign / Vehicle</option>
            <option value="repeat">Returning Customer</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div style="display:flex;gap:12px;margin-top:16px">
          <button type="submit" class="btn btn-primary" style="flex:1">Submit Quote Request</button>
          <button type="reset" class="btn btn-outline">Clear</button>
        </div>
      </form>
    </div>
    <div class="card" style="max-width:720px;margin-top:16px;background:var(--bg)">
      <p style="font-size:14px;color:var(--text-muted);margin:0">🔧 <strong>Need help now?</strong> Call <a href="tel:${App.getBusinessInfo().phone.replace(/[^0-9]/g,'')}" style="color:var(--navy)">${App.getBusinessInfo().phone}</a> for immediate assistance. Emergency service available.</p>
    </div>`;
};

const QuoteRequest = {
  _submit(e) {
    e.preventDefault();
    const name = document.getElementById('qr-name').value.trim();
    const phone = document.getElementById('qr-phone').value.trim();
    const addr = document.getElementById('qr-addr').value.trim();
    const desc = document.getElementById('qr-desc').value.trim();
    if (!name || !phone || !addr || !desc) return App.toast('Please fill in all required fields', 'error');

    const num = App.state.nextQuoteNum++;
    const serviceType = document.getElementById('qr-type').value;
    const urgency = document.getElementById('qr-urgency').value;
    const prefDate = document.getElementById('qr-date').value;
    const email = document.getElementById('qr-email').value.trim();
    const source = document.getElementById('qr-source').value;

    App.state.quotes.push({
      id: App.genId(), number: num, date: App.today(),
      customer: name, customerEmail: email, customerPhone: phone,
      address: addr, serviceType, preferredDate: prefDate,
      urgency, source, description: desc,
      items: [], notes: `Service: ${serviceType||'Not specified'}\nUrgency: ${urgency}\nSource: ${source||'N/A'}\nPreferred date: ${prefDate||'Flexible'}\n\n${desc}`,
      status: 'request', subtotal: 0, tax: 0, total: 0, taxExempt: false
    });
    App.saveState();

    document.getElementById('qr-form').reset();
    App.toast('Quote request submitted! We\'ll be in touch soon.');
    setTimeout(() => { window.location.hash = 'quotes'; }, 1500);
  }
};
