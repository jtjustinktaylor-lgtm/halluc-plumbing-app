// Signature Pad — canvas-based, no dependencies
// Used for customer sign-off on job completion and invoice acceptance

const SignaturePad = {
  _canvas: null,
  _ctx: null,
  _drawing: false,
  _hasSignature: false,
  _lastX: 0,
  _lastY: 0,

  /**
   * Render a signature capture widget into a container element.
   * Returns the container id for later retrieval.
   */
  render(containerId, opts = {}) {
    const { width = 400, height = 150, label = 'Customer Signature', existing = '' } = opts;
    const container = document.getElementById(containerId);
    if (!container) return;

    const canvasId = containerId + '-canvas';
    const clearBtnId = containerId + '-clear';
    const statusId = containerId + '-status';

    container.innerHTML = `
      <div style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
        <label style="font-weight:600;font-size:14px">${label}</label>
        <div style="display:flex;gap:8px;align-items:center">
          <span id="${statusId}" style="font-size:12px;color:var(--text-muted)">${existing ? '✓ Signature loaded' : 'Sign below'}</span>
          <button class="btn btn-sm btn-outline" id="${clearBtnId}" type="button">Clear</button>
        </div>
      </div>
      <div style="position:relative;border:2px dashed var(--border);border-radius:8px;background:#fff;cursor:crosshair;touch-action:none">
        <canvas id="${canvasId}" width="${width}" height="${height}" style="display:block;width:100%;height:auto"></canvas>
        ${!existing ? '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#ccc;font-size:16px;pointer-events:none;font-style:italic" class="sig-placeholder">Sign here</div>' : ''}
      </div>
    `;

    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    this._canvas = canvas;
    this._ctx = ctx;
    this._hasSignature = !!existing;

    // Scale for retina
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;

    // White background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    // Draw signature line
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, height - 25);
    ctx.lineTo(width - 20, height - 25);
    ctx.stroke();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;

    // Load existing signature if provided
    if (existing) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        // Redraw signature line on top
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, height - 25);
        ctx.lineTo(width - 20, height - 25);
        ctx.stroke();
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2.5;
      };
      img.src = existing;
    }

    // Mouse events
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (width / rect.width),
        y: (e.clientY - rect.top) * (height / rect.height)
      };
    };

    const startDraw = (e) => {
      e.preventDefault();
      this._drawing = true;
      const pos = getPos(e);
      this._lastX = pos.x;
      this._lastY = pos.y;
      // Hide placeholder
      const ph = container.querySelector('.sig-placeholder');
      if (ph) ph.style.display = 'none';
    };

    const draw = (e) => {
      if (!this._drawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(this._lastX, this._lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      this._lastX = pos.x;
      this._lastY = pos.y;
      this._hasSignature = true;
    };

    const endDraw = () => {
      this._drawing = false;
      if (this._hasSignature) {
        document.getElementById(statusId).textContent = '✓ Signed';
        document.getElementById(statusId).style.color = 'var(--success)';
      }
    };

    // Touch events
    const getTouchPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * (width / rect.width),
        y: (touch.clientY - rect.top) * (height / rect.height)
      };
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseleave', endDraw);

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._drawing = true;
      const pos = getTouchPos(e);
      this._lastX = pos.x;
      this._lastY = pos.y;
      const ph = container.querySelector('.sig-placeholder');
      if (ph) ph.style.display = 'none';
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (!this._drawing) return;
      e.preventDefault();
      const pos = getTouchPos(e);
      ctx.beginPath();
      ctx.moveTo(this._lastX, this._lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      this._lastX = pos.x;
      this._lastY = pos.y;
      this._hasSignature = true;
    }, { passive: false });

    canvas.addEventListener('touchend', endDraw);

    // Clear button
    document.getElementById(clearBtnId).addEventListener('click', () => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
      // Redraw signature line
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, height - 25);
      ctx.lineTo(width - 20, height - 25);
      ctx.stroke();
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2.5;
      this._hasSignature = false;
      document.getElementById(statusId).textContent = 'Sign below';
      document.getElementById(statusId).style.color = 'var(--text-muted)';
      const ph = container.querySelector('.sig-placeholder');
      if (ph) ph.style.display = '';
    });
  },

  /**
   * Get the signature as a data URL (PNG). Returns empty string if not signed.
   */
  toDataURL(containerId) {
    const canvas = document.getElementById(containerId + '-canvas');
    if (!canvas || !this._hasSignature) return '';
    return canvas.toDataURL('image/png');
  },

  /**
   * Check if a signature has been captured.
   */
  hasSignature() {
    return this._hasSignature;
  },

  /**
   * Render a signature image (read-only) for display on printed docs / history.
   */
  renderReadOnly(containerId, dataUrl, opts = {}) {
    const { label = 'Customer Signature', maxWidth = 250 } = opts;
    const container = document.getElementById(containerId);
    if (!container || !dataUrl) return;
    container.innerHTML = `
      <div style="margin-top:8px">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">${label}</div>
        <img src="${dataUrl}" alt="Customer signature" style="max-width:${maxWidth}px;border:1px solid var(--border);border-radius:4px;background:#fff;padding:4px">
      </div>
    `;
  }
};
