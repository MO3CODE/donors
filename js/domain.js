// ── domain.js — Pure domain logic, no DOM access ─────────────────────────────

// ── Font options ──────────────────────────────────────────────────────────────
const FONT_OPTIONS = [
  // Arabic fonts
  { v:'Amiri',               l:'Amiri — أميري' },
  { v:'Cairo',               l:'Cairo — كايرو' },
  { v:'Scheherazade New',    l:'Scheherazade — شهرزاد' },
  { v:'Lateef',              l:'Lateef — لطيف' },
  { v:'Rakkas',              l:'Rakkas — رقاص' },
  { v:'Reem Kufi',           l:'Reem Kufi — ريم كوفي' },
  { v:'Noto Naskh Arabic',   l:'Noto Naskh — نوتو نسخ' },
  { v:'Noto Kufi Arabic',    l:'Noto Kufi — نوتو كوفي' },
  { v:'Alexandria',          l:'Alexandria — الإسكندرية' },
  { v:'Mada',                l:'Mada — مدى' },
  { v:'Tajawal',             l:'Tajawal — تجوّل' },
  { v:'IBM Plex Sans Arabic',l:'IBM Plex Arabic — IBM بلكس' },
  { v:'Noto Sans Arabic',    l:'Noto Sans Arabic — نوتو سانس' },
  { v:'Changa',              l:'Changa — تشانجا' },
  { v:'Harmattan',           l:'Harmattan — هارماتان' },
  { v:'Mirza',               l:'Mirza — ميرزا' },
  { v:'Aref Ruqaa',          l:'Aref Ruqaa — عارف رقعة' },
  { v:'Qahiri',              l:'Qahiri — قاهري' },
  { v:'Markazi Text',        l:'Markazi Text — مركزي' },
  // Decorative / Latin fonts
  { v:'Pinyon Script',       l:'Pinyon Script — أوباما ✦' },
  { v:'Great Vibes',         l:'Great Vibes — جريت فايبس' },
  { v:'Dancing Script',      l:'Dancing Script — دانسينج' },
  { v:'Tangerine',           l:'Tangerine — تانجرين' },
  { v:'Satisfy',             l:'Satisfy — ساتيسفاي' },
  { v:'Alex Brush',          l:'Alex Brush — أليكس براش' },
  { v:'Allura',              l:'Allura — ألورا' },
  { v:'Italianno',           l:'Italianno — إيطالياننو' },
  { v:'Pacifico',            l:'Pacifico — باسيفيكو' },
  { v:'Lobster',             l:'Lobster — لوبستر' },
  { v:'Cinzel',              l:'Cinzel — سينزيل' },
  { v:'Playfair Display',    l:'Playfair Display — بلايفير' },
  { v:'Cormorant Garamond',  l:'Cormorant Garamond — كورموران' },
  { v:'IM Fell English',     l:'IM Fell English — كلاسيكي' },
  { v:'Merriweather',        l:'Merriweather — ميريويذر' },
  { v:'Righteous',           l:'Righteous — رايتشس' },
  { v:'Roboto',              l:'Roboto — روبوتو' },
  { v:'Roboto Black',        l:'Roboto Black — روبوتو أسود' },
  { v:'Arial',               l:'Arial — أريال' },
  { v:'Baloo 2',             l:'Baloo 2 — بالو' },
];

// ── Text direction resolver ────────────────────────────────────────────────────
/**
 * Resolves the canvas text direction.
 * @param {string} mode  'ltr' | 'rtl' | 'auto'
 * @param {string} text  the text to test when mode === 'auto'
 * @returns {'ltr'|'rtl'}
 */
function _resolveTextDirection(mode, text) {
  if (mode === 'ltr' || mode === 'rtl') return mode;
  return /[؀-ۿ]/.test(text || '') ? 'rtl' : 'ltr';
}

// ── Auto/fixed font size calculator ──────────────────────────────────────────
/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @param {number} maxSize
 * @param {number} minSize
 * @param {string} fontFace
 * @param {boolean} autoMode  true = shrink to fit, false = use fixedSize
 * @param {number} fixedSize  used when autoMode === false
 * @returns {number}
 */
function _calcSize(ctx, text, maxWidth, maxSize, minSize, fontFace, autoMode, fixedSize) {
  if (autoMode) {
    let size = maxSize;
    while (size >= minSize) {
      ctx.font = `bold ${size}px "${fontFace}", serif`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    return size;
  }
  return fixedSize;
}

// ── Multi-page PDF builder ────────────────────────────────────────────────────
/**
 * Builds a minimal multi-page PDF binary from an array of JPEG pages.
 * @param {{ data: string, w: number, h: number }[]} pages  data = base64 JPEG
 * @returns {Uint8Array}
 */
function buildMultiPagePDF(pages) {
  const enc = new TextEncoder();
  const parts = [];
  let offset = 0;
  const byteOffsets = {};

  function pushText(s) {
    const b = enc.encode(s);
    parts.push(b); offset += b.length;
  }
  function pushBin(arr) {
    parts.push(arr); offset += arr.length;
  }

  const N = pages.length;
  // obj numbering:
  //   1 = catalog, 2 = pages,
  //   3..N+2       = page objects
  //   N+3..2N+2    = image XObjects
  //   2N+3..3N+2   = content streams

  pushText('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // Catalog
  byteOffsets[1] = offset;
  pushText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Pages
  const kids = pages.map((_, i) => `${3 + i} 0 R`).join(' ');
  byteOffsets[2] = offset;
  pushText(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${N} >>\nendobj\n`);

  for (let i = 0; i < N; i++) {
    const { data, w, h } = pages[i];
    const wPt = (w * 0.75).toFixed(2);
    const hPt = (h * 0.75).toFixed(2);
    const pageObjN    = 3 + i;
    const imgObjN     = 3 + N + i;
    const contentObjN = 3 + 2 * N + i;

    // Page object
    byteOffsets[pageObjN] = offset;
    pushText(`${pageObjN} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wPt} ${hPt}] /Contents ${contentObjN} 0 R /Resources << /XObject << /Img${i} ${imgObjN} 0 R >> >> >>\nendobj\n`);

    // Image XObject
    const jpegBytes = atob(data);
    const jpegLen = jpegBytes.length;
    const jpegArr = new Uint8Array(jpegLen);
    for (let j = 0; j < jpegLen; j++) jpegArr[j] = jpegBytes.charCodeAt(j);

    byteOffsets[imgObjN] = offset;
    pushText(`${imgObjN} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegLen} >>\nstream\n`);
    pushBin(jpegArr);
    pushText('\nendstream\nendobj\n');

    // Content stream
    const cs = `q ${wPt} 0 0 ${hPt} 0 0 cm /Img${i} Do Q`;
    byteOffsets[contentObjN] = offset;
    pushText(`${contentObjN} 0 obj\n<< /Length ${cs.length} >>\nstream\n${cs}\nendstream\nendobj\n`);
  }

  const totalObjs = 3 + 3 * N;
  const xrefOffset = offset;
  let xref = `xref\n0 ${totalObjs}\n0000000000 65535 f \n`;
  for (let i = 1; i < totalObjs; i++) {
    xref += String(byteOffsets[i] || 0).padStart(10, '0') + ' 00000 n \n';
  }
  pushText(xref);
  pushText(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  let total = 0;
  for (const p of parts) total += p.length;
  const result = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) { result.set(p, pos); pos += p.length; }
  return result;
}

// ── Canvas to JPEG base64 ─────────────────────────────────────────────────────
/**
 * @param {HTMLCanvasElement} canvas
 * @returns {string} base64-encoded JPEG (no data: prefix)
 */
function canvasToJpegBase64(canvas) {
  return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
}

// ── CertificateSettings factory ───────────────────────────────────────────────
/**
 * Returns a settings object with all certificate text rendering parameters.
 * All fields have safe defaults.
 */
function CertificateSettings({
  donorFont = 'Amiri', projFont = 'Amiri',
  donorX = 877, donorY = 590, projX = 877, projY = 842,
  donorSize = 64, projSize = 72,
  donorAuto = true, projAuto = true,
  donorEnabled = true, projEnabled = true,
  donorMaxW = 1400, projMaxW = 1400,
  donorColor = '#1e2f5a', projColor = '#ffffff',
  donorDir = 'rtl', projDir = 'rtl',
  donorAlign = 'center', projAlign = 'center',
  donorLineH = 0,
} = {}) {
  return {
    donorFont, projFont,
    donorX, donorY, projX, projY,
    donorSize, projSize,
    donorAuto, projAuto,
    donorEnabled, projEnabled,
    donorMaxW, projMaxW,
    donorColor, projColor,
    donorDir, projDir,
    donorAlign, projAlign,
    donorLineH,
  };
}

// ── Exports ───────────────────────────────────────────────────────────────────
window.DomainLayer = {
  FONT_OPTIONS,
  _resolveTextDirection,
  _calcSize,
  buildMultiPagePDF,
  canvasToJpegBase64,
  CertificateSettings,
};
