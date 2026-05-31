// ── infrastructure.js — Canvas rendering, storage, export ───────────────────
// Depends on: domain.js (must be loaded first)

// ── EXIF orientation fix ──────────────────────────────────────────────────────

function _readExifOrientation(view) {
  if (view.byteLength < 4) return 1;
  if (view.getUint16(0, false) !== 0xFFD8) return 1;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xFFE1) {
      if (offset + 6 > view.byteLength) return 1;
      if (view.getUint32(offset + 2, false) !== 0x45786966) return 1;
      const little = view.getUint16(offset + 8, false) === 0x4949;
      offset += 10;
      if (offset + 2 > view.byteLength) return 1;
      const tags = view.getUint16(offset, little);
      offset += 2;
      for (let i = 0; i < tags; i++) {
        if (offset + i * 12 + 10 > view.byteLength) break;
        if (view.getUint16(offset + i * 12, little) === 0x0112) {
          return view.getUint16(offset + i * 12 + 8, little);
        }
      }
      return 1;
    } else if ((marker & 0xFF00) !== 0xFF00) {
      break;
    } else {
      if (offset + 2 > view.byteLength) break;
      offset += view.getUint16(offset, false);
    }
  }
  return 1;
}

/**
 * Reads EXIF orientation from a File and corrects rotation via an off-screen
 * canvas if needed. Always calls callback(dataUrl, imgElement).
 * @param {File} file
 * @param {function(string, HTMLImageElement): void} callback
 */
function fixImageOrientation(file, callback) {
  const rawReader  = new FileReader();
  const dataReader = new FileReader();
  let rawBuf = null, dataUrl = null, imgEl = null;
  let rawDone = false, dataDone = false;

  function _tryProcess() {
    if (!rawDone || !dataDone) return;
    if (imgEl === null) return;

    let orientation = 1;
    try {
      const view = new DataView(rawBuf);
      orientation = _readExifOrientation(view);
    } catch (_) {}

    if (orientation <= 1 || orientation > 8) {
      callback(dataUrl, imgEl);
      return;
    }

    try {
      const w = imgEl.naturalWidth, h = imgEl.naturalHeight;
      const swap = orientation >= 5;
      const canvas = document.createElement('canvas');
      canvas.width  = swap ? h : w;
      canvas.height = swap ? w : h;
      const ctx = canvas.getContext('2d');
      ctx.save();
      switch (orientation) {
        case 2: ctx.transform(-1, 0, 0,  1, w, 0); break;
        case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
        case 4: ctx.transform( 1, 0, 0, -1, 0, h); break;
        case 5: ctx.transform( 0, 1, 1,  0, 0, 0); break;
        case 6: ctx.transform( 0, 1,-1,  0, h, 0); break;
        case 7: ctx.transform( 0,-1,-1,  0, h, w); break;
        case 8: ctx.transform( 0,-1, 1,  0, 0, w); break;
      }
      ctx.drawImage(imgEl, 0, 0);
      ctx.restore();
      const correctedUrl = canvas.toDataURL('image/jpeg', 0.92);
      if (!correctedUrl || correctedUrl === 'data:,') { callback(dataUrl, imgEl); return; }
      const correctedImg = new Image();
      correctedImg.onload = function() { callback(correctedUrl, correctedImg); };
      correctedImg.onerror = function() { callback(dataUrl, imgEl); };
      correctedImg.src = correctedUrl;
    } catch (_) {
      callback(dataUrl, imgEl);
    }
  }

  rawReader.onload = function(e) {
    rawBuf = e.target.result; rawDone = true; _tryProcess();
  };
  rawReader.onerror = function() {
    rawBuf = new ArrayBuffer(0); rawDone = true; _tryProcess();
  };

  dataReader.onload = function(e) {
    dataUrl = e.target.result; dataDone = true;
    const img = new Image();
    img.onload = function() { imgEl = img; _tryProcess(); };
    img.onerror = function() { imgEl = img; callback(dataUrl, img); };
    img.src = dataUrl;
  };
  dataReader.onerror = function() {
    callback('', new Image());
  };

  rawReader.readAsArrayBuffer(file);
  dataReader.readAsDataURL(file);
}

// ── CanvasRenderer ────────────────────────────────────────────────────────────
const CanvasRenderer = {
  /**
   * Draw donor and project text onto ctx using a resolved settings object.
   * USABLE_W must be defined in the outer scope (app.js).
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} donorText
   * @param {string} projectText
   * @param {object} s  certificate settings (from _resolveSettings or CertificateSettings)
   */
  drawText(ctx, donorText, projectText, s) {
    // fallback usable width — app.js defines USABLE_W
    const usableW = (typeof USABLE_W !== 'undefined') ? USABLE_W : 1514;

    ctx.textBaseline = 'middle';

    // Project text
    if (s.projEnabled !== false) {
      const projLines = (projectText || '').trim().split('\n').filter(Boolean);
      const projText2 = projLines.join(' | ');
      const projSize  = DomainLayer._calcSize(ctx, projText2, s.projMaxW || usableW * 0.85, 72, 28, s.projFont, s.projAuto, s.projSize);
      ctx.font = `bold ${projSize}px "${s.projFont}", serif`;
      ctx.fillStyle = s.projColor || '#ffffff';
      ctx.direction = DomainLayer._resolveTextDirection(s.projDir, projText2);
      ctx.textAlign = s.projAlign || 'center';
      ctx.fillText(projText2, s.projX, s.projY);
    }

    // Donor text
    if (s.donorEnabled !== false) {
      const donorLines  = (donorText || '').trim().split('\n').filter(Boolean);
      const totalLines  = donorLines.length || 1;
      const autoSpacing = Math.min(90, 244 / (totalLines + 0.5));
      const lineSpacing = (s.donorLineH && s.donorLineH > 0) ? s.donorLineH : autoSpacing;
      const longestLine = donorLines.reduce((a, b) => a.length > b.length ? a : b, '');
      const donorSize   = DomainLayer._calcSize(ctx, longestLine, s.donorMaxW || usableW * 0.8, 64, 22, s.donorFont, s.donorAuto, s.donorSize);
      ctx.font = `bold ${donorSize}px "${s.donorFont}", serif`;
      ctx.fillStyle = s.donorColor || '#1e2f5a';
      ctx.textAlign = s.donorAlign || 'center';
      const startY = s.donorY - ((totalLines - 1) * lineSpacing) / 2;
      donorLines.forEach((line, i) => {
        ctx.direction = DomainLayer._resolveTextDirection(s.donorDir, line);
        ctx.fillText(line.trim(), s.donorX, startY + i * lineSpacing);
      });
    }
  },
};

// ── TemplateStorage (IndexedDB for 3:4 vert templates) ───────────────────────
const TemplateStorage = {
  _DB_NAME:  'donor_cert_templates_db',
  _DB_STORE: 'vert_templates',
  _DB_KEY:   'templates_v1',

  open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this._DB_NAME, 1);
      req.onupgradeneeded = function() {
        const db = req.result;
        if (!db.objectStoreNames.contains(TemplateStorage._DB_STORE)) {
          db.createObjectStore(TemplateStorage._DB_STORE);
        }
      };
      req.onsuccess = function() { resolve(req.result); };
      req.onerror   = function() { reject(req.error); };
    });
  },

  async save(userTemplates, activeUserIdx) {
    if (!window.indexedDB) return;
    try {
      const db = await this.open();
      const stored = {
        activeIdx: Math.max(0, activeUserIdx),
        templates: userTemplates.map(t => ({ name: t.name, dataUrl: t.dataUrl })),
      };
      await new Promise((resolve, reject) => {
        const tx = db.transaction(this._DB_STORE, 'readwrite');
        tx.objectStore(this._DB_STORE).put(stored, this._DB_KEY);
        tx.oncomplete = resolve;
        tx.onerror = function() { reject(tx.error); };
      });
      db.close();
    } catch (e) {
      console.warn('TemplateStorage.save failed', e);
    }
  },

  async load() {
    if (!window.indexedDB) return null;
    try {
      const db = await this.open();
      const result = await new Promise((resolve, reject) => {
        const tx = db.transaction(this._DB_STORE, 'readonly');
        const req = tx.objectStore(this._DB_STORE).get(this._DB_KEY);
        req.onsuccess = function() { resolve(req.result); };
        req.onerror   = function() { reject(req.error); };
      });
      db.close();
      return result || null;
    } catch (e) {
      console.warn('TemplateStorage.load failed', e);
      return null;
    }
  },
};

// ── Exporter ─────────────────────────────────────────────────────────────────
const Exporter = {
  /**
   * Download canvas as PNG.
   * @param {HTMLCanvasElement} canvas
   * @param {string} name  filename without extension
   * @param {HTMLElement} statusEl
   */
  downloadPng(canvas, name, statusEl) {
    if (statusEl) statusEl.textContent = '⏳ جارٍ التحضير...';
    try {
      canvas.toBlob(function(blob) {
        try {
          const url = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/jpeg', 0.95);
          const link = document.createElement('a');
          link.download = `${name}.png`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          if (blob) setTimeout(() => URL.revokeObjectURL(url), 5000);
          if (statusEl) statusEl.textContent = '✓ تم التحميل بنجاح';
        } catch (e) {
          if (statusEl) statusEl.textContent = '❌ فشل التحميل: ' + e.message;
        }
      }, 'image/png');
    } catch (e) {
      // Last resort dataURL
      try {
        const link = document.createElement('a');
        link.download = `${name}.png`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (statusEl) statusEl.textContent = '✓ تم التحميل';
      } catch (e2) {
        if (statusEl) statusEl.textContent = '❌ ' + e2.message;
      }
    }
  },

  /**
   * Download canvas as PDF (single page).
   * @param {HTMLCanvasElement} canvas
   * @param {string} name
   * @param {HTMLElement} statusEl
   */
  downloadPdf(canvas, name, statusEl) {
    if (statusEl) statusEl.textContent = '⏳ جارٍ التحضير...';
    canvas.toBlob(function(blob) {
      if (!blob) { if (statusEl) statusEl.textContent = '❌ القالب غير مُحمَّل — اضغط معاينة أولاً'; return; }
      const W = canvas.width;
      const H = canvas.height;
      const wPt = (W * 0.75).toFixed(2);
      const hPt = (H * 0.75).toFixed(2);

      const jpegData = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
      const jpegBytes = atob(jpegData);
      const jpegLen = jpegBytes.length;
      const contentStr = `q ${wPt} 0 0 ${hPt} 0 0 cm /Img Do Q`;
      const contentBytes = contentStr.length;

      const enc = new TextEncoder();
      const parts = [];
      let offset = 0;
      const byteOffsets = [];

      function pushText(s) {
        const b = enc.encode(s); parts.push(b); offset += b.length;
      }
      function pushBinary(ab) {
        parts.push(ab); offset += ab.length;
      }

      pushText('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');
      byteOffsets[1] = offset;
      pushText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
      byteOffsets[2] = offset;
      pushText('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
      byteOffsets[3] = offset;
      pushText(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wPt} ${hPt}] /Contents 5 0 R /Resources << /XObject << /Img 4 0 R >> >> >>\nendobj\n`);
      byteOffsets[4] = offset;
      pushText(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegLen} >>\nstream\n`);
      const jpegArr = new Uint8Array(jpegLen);
      for (let i = 0; i < jpegLen; i++) jpegArr[i] = jpegBytes.charCodeAt(i);
      pushBinary(jpegArr);
      pushText('\nendstream\nendobj\n');
      byteOffsets[5] = offset;
      pushText(`5 0 obj\n<< /Length ${contentBytes} >>\nstream\n${contentStr}\nendstream\nendobj\n`);

      const xrefOffset = offset;
      const numObjs = 6;
      let xref = `xref\n0 ${numObjs}\n0000000000 65535 f \n`;
      for (let i = 1; i < numObjs; i++) {
        xref += String(byteOffsets[i]).padStart(10, '0') + ' 00000 n \n';
      }
      pushText(xref);
      pushText(`trailer\n<< /Size ${numObjs} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

      let totalLen = 0;
      for (const p of parts) totalLen += p.length;
      const result = new Uint8Array(totalLen);
      let pos = 0;
      for (const p of parts) { result.set(p, pos); pos += p.length; }

      const pdfBlob = new Blob([result], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.download = `${name}.pdf`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      if (statusEl) statusEl.textContent = '✓ تم تحميل PDF';
    }, 'image/png');
  },

  /**
   * Share via Web Share API (with PNG file), fallback to download + open WhatsApp.
   * @param {HTMLCanvasElement} canvas
   * @param {string} name
   * @param {HTMLElement} statusEl
   */
  shareWhatsapp(canvas, name, statusEl) {
    const self = this;
    canvas.toBlob(function(blob) {
      if (!blob) { if (statusEl) statusEl.textContent = '❌ تعذّر تجهيز الصورة'; return; }
      const file = new File([blob], `${name}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: name })
          .then(() => { if (statusEl) statusEl.textContent = '✓ تمت المشاركة'; })
          .catch(() => { self.fallback(canvas, name, statusEl); });
      } else {
        self.fallback(canvas, name, statusEl);
      }
    }, 'image/png');
  },

  /**
   * Fallback: download PNG then open WhatsApp web.
   */
  fallback(canvas, name, statusEl) {
    canvas.toBlob(function(blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${name}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setTimeout(() => { window.open('https://web.whatsapp.com', '_blank'); }, 800);
      if (statusEl) statusEl.textContent = '✓ تم تحميل الصورة — افتح واتساب وأرسلها يدوياً';
    }, 'image/png');
  },
};

// ── Exports ───────────────────────────────────────────────────────────────────
window.Infrastructure = {
  CanvasRenderer,
  TemplateStorage,
  Exporter,
  fixImageOrientation,
};
