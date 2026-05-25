// ── Template images loaded from files (no Base64 embedding) ─────────────────

const AR_IMG = new Image();
AR_IMG.src = '/template_arabic.png.jpg';

let VK_AR_IMG = null;
let VK_TR_IMG = null;

const VK_AR_IMG_STATIC = new Image();
VK_AR_IMG_STATIC.src = '/template_arabic.png.jpg';
VK_AR_IMG_STATIC.onload = function() {
  VK_AR_IMG = VK_AR_IMG_STATIC;
  _hideVKPromptIfReady();
};

const VK_TR_IMG_STATIC = new Image();
VK_TR_IMG_STATIC.src = '/template_turkish.png.jpg';
VK_TR_IMG_STATIC.onload = function() {
  VK_TR_IMG = VK_TR_IMG_STATIC;
  _hideVKPromptIfReady();
};

// ── Org slot images ───────────────────────────────────────────────────────────
const ORG_IMGS = { stk: null, ummetin: null, kayra: null, custom: null };
let ORG_ACTIVE_SLOT = 'custom';

const ORG_STK_IMG_STATIC = new Image();
ORG_STK_IMG_STATIC.src = '/STK.jpg';

const ORG_UMMETIN_IMG_STATIC = new Image();
ORG_UMMETIN_IMG_STATIC.src = '/UMMETIN.jpg';

const ORG_KAYRA_IMG_STATIC = new Image();
ORG_KAYRA_IMG_STATIC.src = '/KAYRA.jpg';


function _hideVKPromptIfReady() {
  if ((VK_AR_IMG && VK_AR_IMG.naturalWidth) || (VK_TR_IMG && VK_TR_IMG.naturalWidth)) {
    const prompt = document.getElementById('vk-upload-prompt');
    if (prompt) prompt.style.display = 'none';
    _updateVKStatus();
  }
}
ORG_STK_IMG_STATIC.onload = function() { ORG_IMGS.stk = ORG_STK_IMG_STATIC; var b = document.getElementById('org-status-stk'); if(b) b.textContent = '✓'; };
ORG_UMMETIN_IMG_STATIC.onload = function() { ORG_IMGS.ummetin = ORG_UMMETIN_IMG_STATIC; var b = document.getElementById('org-status-ummetin'); if(b) b.textContent = '✓'; };
ORG_KAYRA_IMG_STATIC.onload = function() { ORG_IMGS.kayra = ORG_KAYRA_IMG_STATIC; var b = document.getElementById('org-status-kayra'); if(b) b.textContent = '✓'; };



// Layout constants (1754x1241)
const BANNER_Y_START = 710;
const BANNER_Y_END   = 974;
const BANNER_CENTER_Y = (710 + 974) / 2;  // ~842
const DONOR_CENTER_Y  = 590;  // center of white donor zone (y=466-710)
const IMG_W = 1754;
const IMG_H = 1241;
const LEFT_MARGIN  = 120;
const RIGHT_MARGIN = 120;
const USABLE_W = IMG_W - LEFT_MARGIN - RIGHT_MARGIN;

function toggleAuto(lang, field) {
  const autoId = `${lang}-${field}-auto`;
  const sliderId = `${lang}-${field}-size`;
  const slider = document.getElementById(sliderId);
  const isAuto = document.getElementById(autoId).checked;
  slider.disabled = isAuto;
  slider.style.opacity = isAuto ? "0.4" : "1";
  if (lang === "ar") renderArabic();
  else if (lang === "en") renderEnglish();
  else renderOrgs();
}

function getSize(lang, field, ctx, text, maxWidth, maxSize, minSize, fontFace) {
  const isAuto = document.getElementById(`${lang}-${field}-auto`).checked;
  if (isAuto) {
    let size = maxSize;
    while (size >= minSize) {
      ctx.font = `bold ${size}px "${fontFace}", serif`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    document.getElementById(`${lang}-${field}-size`).value = size;
    document.getElementById(`${lang}-${field}-size-val`).textContent = size;
    return size;
  } else {
    return parseInt(document.getElementById(`${lang}-${field}-size`).value);
  }
}

function getFont(lang, field) {
  const el = document.getElementById(`${lang}-${field}-font`);
  return el ? el.value : "Amiri";
}

function _fieldEnabled(lang, field) {
  const el = document.getElementById(`${lang}-${field}-enabled`);
  return el ? el.checked : true;
}

function drawCertText(ctx, donorText, projectText, lang) {
  const isRTL = (lang !== "orgs-ltr");
  const dir = isRTL ? "rtl" : "ltr";
  ctx.textBaseline = "middle";

  const donorFont = getFont(lang, "donor");
  const projFont  = getFont(lang, "proj");

  const donorX = parseInt(document.getElementById(`${lang}-donor-x`).value);
  const donorY = parseInt(document.getElementById(`${lang}-donor-y`).value);
  const projX  = parseInt(document.getElementById(`${lang}-proj-x`).value);
  const projY  = parseInt(document.getElementById(`${lang}-proj-y`).value);

  // ---- PROJECT NAME ----
  if (_fieldEnabled(lang, "proj")) {
    const projLines = projectText.trim().split("\n").filter(Boolean);
    const projText = projLines.join(" | ");
    const projSize = getSize(lang, "proj", ctx, projText, USABLE_W * 0.85, 72, 28, projFont);
    ctx.font = `bold ${projSize}px "${projFont}", serif`;
    ctx.fillStyle = "#FFFFFF";
    ctx.direction = dir;
    ctx.textAlign = "center";
    ctx.fillText(projText, projX, projY);
  }

  // ---- DONOR NAME ----
  if (_fieldEnabled(lang, "donor")) {
    const donorLines = donorText.trim().split("\n").filter(Boolean);
    const totalLines = donorLines.length || 1;
    const lineSpacing = Math.min(90, 244 / (totalLines + 0.5));
    const longestLine = donorLines.reduce((a,b) => a.length > b.length ? a : b, "");
    const donorSize = getSize(lang, "donor", ctx, longestLine, USABLE_W * 0.8, 64, 22, donorFont);
    ctx.font = `bold ${donorSize}px "${donorFont}", serif`;
    ctx.fillStyle = "#1e2f5a";
    ctx.direction = dir;
    ctx.textAlign = "center";
    const startY = donorY - ((totalLines - 1) * lineSpacing) / 2;
    donorLines.forEach((line, i) => ctx.fillText(line.trim(), donorX, startY + i * lineSpacing));
  }
}

function renderArabic() {
  const canvas = document.getElementById("canvas-arabic");
  const ctx = canvas.getContext("2d");
  const donor   = document.getElementById("ar-donor").value || "اسم المتبرع";
  const project = document.getElementById("ar-project").value || "اسم المشروع";

  ctx.clearRect(0, 0, IMG_W, IMG_H);
  if (AR_IMG.complete && AR_IMG.naturalWidth > 0) {
    ctx.drawImage(AR_IMG, 0, 0);
    drawCertText(ctx, donor, project, "ar");

    // Show toggle button and canvas
    const toggle = document.getElementById("ar-toggle");
    const wrapper = document.getElementById("ar-canvas-wrapper");
    toggle.style.display = "block";
    if (wrapper.style.display === "none") {
      // first render — show canvas automatically
      wrapper.style.display = "block";
      toggle.textContent = "↑ إخفاء المعاينة";
    }
    document.getElementById("ar-status").textContent = "✓ اللوحة جاهزة للتحميل";
  }
}

// ===================== VACİP KURBAN / الأضاحي TAB =====================

function _isArabic(text) {
  return /[؀-ۿ]/.test(text);
}

let VK_TEMPLATE_MODE = 'auto'; // 'auto' | 'arabic' | 'turkish'

function setVKTemplate(mode) {
  VK_TEMPLATE_MODE = mode;
  ['auto','arabic','turkish'].forEach(m => {
    const btn = document.getElementById('vk-tpl-' + m);
    if (btn) btn.classList.toggle('vk-tpl-active', m === mode);
  });
  renderVacip();
  if (typeof saveState === 'function') saveState();
}

function _getVKImg(donorText) {
  if (VK_TEMPLATE_MODE === 'arabic')  return VK_AR_IMG;
  if (VK_TEMPLATE_MODE === 'turkish') return VK_TR_IMG;
  return _isArabic(donorText) ? VK_AR_IMG : VK_TR_IMG;
}

function _updateVKStatus() {
  const hasTR = VK_TR_IMG && VK_TR_IMG.naturalWidth;
  const hasAR = VK_AR_IMG && VK_AR_IMG.naturalWidth;
  const tr = document.getElementById('vk-upload-tr-badge');
  const ar = document.getElementById('vk-upload-ar-badge');
  if (tr) tr.textContent = hasTR ? '✓' : '—';
  if (ar) ar.textContent = hasAR ? '✓' : '—';
}

function renderVacip() {
  const donor   = document.getElementById("vk-donor").value   || "اسم المتبرع";
  const project = document.getElementById("vk-project").value || "";
  _hideVKPromptIfReady();
  const img = _getVKImg(donor);
  if (!img || !img.naturalWidth) {
    const needed = _isArabic(donor) ? 'القالب العربي' : 'القالب التركي';
    document.getElementById("vk-status").textContent = `⚠ يرجى رفع ${needed} أولاً`;
    return;
  }
  const canvas = document.getElementById("canvas-vacip");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, IMG_W, IMG_H);
  ctx.drawImage(img, 0, 0, IMG_W, IMG_H);
  drawCertText(ctx, donor, project, "vk");
  const wrapper = document.getElementById('vk-canvas-wrapper');
  if (wrapper.style.display === 'none') wrapper.style.display = 'block';
  document.getElementById("vk-status").textContent = "✓ اللوحة جاهزة للتحميل";
}

function loadVacipTemplate(input, type) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      if (type === 'tr') VK_TR_IMG = img;
      else               VK_AR_IMG = img;
      _updateVKStatus();
      document.getElementById('vk-upload-prompt').style.display = 'none';
      renderVacip();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ===================== ORGS MULTI-SLOT =====================

Object.defineProperty(window, 'ORG_IMG', {
  get: () => ORG_IMGS[ORG_ACTIVE_SLOT],
});

// Per-slot field IDs to snapshot when switching
const ORG_SLOT_FIELD_IDS = [
  'org-donor','org-project','org-batch-names',
  'org-donor-font','org-proj-font',
  'org-donor-size','org-proj-size',
  'org-donor-y','org-proj-y',
  'org-donor-x','org-proj-x',
];
const ORG_SLOT_CHECKBOX_IDS = [
  'org-donor-enabled','org-proj-enabled',
  'org-donor-auto','org-proj-auto',
];

// Default values for each org slot field
const ORG_SLOT_DEFAULTS = {
  'org-donor': '', 'org-project': '', 'org-batch-names': '',
  'org-donor-font': 'Amiri', 'org-proj-font': 'Amiri',
  'org-donor-size': '64', 'org-proj-size': '72',
  'org-donor-y': '590', 'org-proj-y': '842',
  'org-donor-x': '877', 'org-proj-x': '877',
};
const ORG_SLOT_CHECKBOX_DEFAULTS = {
  'org-donor-enabled': true, 'org-proj-enabled': true,
  'org-donor-auto': true, 'org-proj-auto': true,
};

// In-memory per-slot settings store
const ORG_SLOT_SETTINGS = { stk: null, ummetin: null, kayra: null, custom: null };

function _saveOrgSlotToMemory(slot) {
  const snapshot = { fields: {}, checkboxes: {} };
  ORG_SLOT_FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) snapshot.fields[id] = el.value;
  });
  ORG_SLOT_CHECKBOX_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) snapshot.checkboxes[id] = el.checked;
  });
  ORG_SLOT_SETTINGS[slot] = snapshot;
}

function _loadOrgSlotFromMemory(slot) {
  const snapshot = ORG_SLOT_SETTINGS[slot];
  ORG_SLOT_FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = snapshot ? (snapshot.fields[id] ?? ORG_SLOT_DEFAULTS[id] ?? '') : (ORG_SLOT_DEFAULTS[id] ?? '');
  });
  ORG_SLOT_CHECKBOX_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = snapshot ? (snapshot.checkboxes[id] ?? ORG_SLOT_CHECKBOX_DEFAULTS[id] ?? true) : (ORG_SLOT_CHECKBOX_DEFAULTS[id] ?? true);
  });
  // Sync slider display values
  ['org-donor-size','org-proj-size','org-donor-y','org-proj-y','org-donor-x','org-proj-x'].forEach(id => {
    const el = document.getElementById(id);
    const valEl = document.getElementById(id + '-val');
    if (el && valEl) valEl.textContent = el.value;
  });
}

function selectOrgSlot(slot) {
  // Save current slot before switching
  _saveOrgSlotToMemory(ORG_ACTIVE_SLOT);
  ORG_ACTIVE_SLOT = slot;
  document.querySelectorAll('.org-slot-btn').forEach(b => b.classList.remove('org-slot-active'));
  const btn = document.getElementById(`org-slot-${slot}`);
  if (btn) btn.classList.add('org-slot-active');
  // Load the new slot's settings into the UI
  _loadOrgSlotFromMemory(slot);
  renderOrgs();
  if (typeof saveState === 'function') saveState();
}

function renderOrgs() {
  const img = ORG_IMGS[ORG_ACTIVE_SLOT];
  if (!img || !img.complete || !img.naturalWidth) {
    document.getElementById("org-status").textContent = "⚠ ارفع قالباً للجهة المختارة أولاً";
    return;
  }
  const canvas = document.getElementById("canvas-orgs-offscreen");
  const ctx = canvas.getContext("2d");
  const donor   = document.getElementById("org-donor").value || "اسم الجهة";
  const project = document.getElementById("org-project").value || "اسم المشروع";
  ctx.clearRect(0, 0, IMG_W, IMG_H);
  ctx.drawImage(img, 0, 0, IMG_W, IMG_H);
  drawCertText(ctx, donor, project, "org");
  document.getElementById('org-upload-prompt').style.display = 'none';
  const wrapper = document.getElementById('org-canvas-wrapper');
  if (wrapper) wrapper.style.display = 'block';
  document.getElementById("org-status").textContent = "✓ اللوحة جاهزة للتحميل";
}

function loadOrgTemplate(input, slot) {
  const file = input.files[0];
  if (!file) return;
  const s = slot || ORG_ACTIVE_SLOT;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      ORG_IMGS[s] = img;
      const badge = document.getElementById(`org-status-${s}`);
      if (badge) badge.textContent = '✓';
      selectOrgSlot(s);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderEnglish() {
  if (!EN_IMG || !EN_IMG.complete || !EN_IMG.naturalWidth) return;
  const canvas = document.getElementById("canvas-english");
  const ctx = canvas.getContext("2d");
  const donor   = document.getElementById("en-donor").value || "اسم المتبرع";
  const project = document.getElementById("en-project").value || "اسم المشروع";
  ctx.clearRect(0, 0, IMG_W, IMG_H);
  ctx.drawImage(EN_IMG, 0, 0, IMG_W, IMG_H);
  drawCertText(ctx, donor, project, "en");
  document.getElementById("en-status").textContent = "✓ اللوحة جاهزة للتحميل";
}

function loadEnglishTemplate(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    EN_IMG = new Image();
    EN_IMG.onload = function() {
      document.getElementById('en-upload-prompt').style.display = 'none';
      document.getElementById('en-canvas-wrapper').style.display = 'block';
      renderEnglish();
    };
    EN_IMG.src = e.target.result;
  };
  reader.readAsDataURL(file);
}


// Returns the org/tab name label for use in filenames
function _getTabLabel(lang) {
  if (lang === 'orgs')  return _getOrgSlotName();
  if (lang === 'vacip') return 'الأضاحي';
  if (lang.startsWith('ct-')) {
    const ct = CUSTOM_TABS.find(t => t.id === lang.slice(3));
    return ct ? ct.name : 'جهة';
  }
  return '';
}

// Returns the active org slot display name
function _getOrgSlotName() {
  if (ORG_ACTIVE_SLOT === 'stk')     return 'STK';
  if (ORG_ACTIVE_SLOT === 'ummetin') return 'ÜMMETİN ABİSİ';
  if (ORG_ACTIVE_SLOT === 'kayra')   return 'KAYRA';
  // custom slot: try to read from the uploaded file badge or fallback
  return 'الجهة';
}

function _sanitize(str) {
  return (str || '').trim().replace(/[\\/:"*?<>|]+/g, '').replace(/\s+/g, '_').substring(0, 60);
}

// Single certificate filename: "اسم المتبرع - الجهة"
function getFileName(lang) {
  let donor = '';
  if (lang.startsWith('ct-')) {
    const el = document.getElementById('ct-' + lang.slice(3) + '-donor');
    donor = (el && el.value) || '';
  } else {
    const idMap = { orgs: 'org-donor', vacip: 'vk-donor', arabic: 'ar-donor', english: 'en-donor' };
    const el = document.getElementById(idMap[lang] || 'ar-donor');
    donor = el ? el.value : '';
  }
  const tabLabel = _getTabLabel(lang);
  const base = donor ? _sanitize(donor) + (tabLabel ? ' - ' + _sanitize(tabLabel) : '') : 'لوحة';
  return base || 'لوحة';
}

// Batch filename: "اسم الجهة-عدد التصاميم"
function getBatchFileName(lang, count) {
  const tabLabel = _getTabLabel(lang) || 'إنتاج';
  return _sanitize(tabLabel) + '-' + count;
}

function getStatusEl(lang) {
  if (lang.startsWith('ct-')) return document.getElementById('ct-' + lang.slice(3) + '-status');
  const idMap = { arabic: "ar-status", english: "en-status", orgs: "org-status", vacip: "vk-status" };
  return document.getElementById(idMap[lang] || "ar-status");
}

function downloadCert(lang, format) {
  // Save to history before downloading
  try {
    const tabId  = lang.startsWith('ct-') ? lang.slice(3) : lang;
    const isOrgs = lang === 'orgs', isVK = lang === 'vacip', isCT = lang.startsWith('ct-');
    const prefix = isOrgs ? 'org' : isVK ? 'vk' : null;
    const pid    = f => isCT ? 'ct-' + tabId + '-' + f : prefix + '-' + f;
    const gv     = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    const gb     = id => { const el = document.getElementById(id); return el ? el.checked : true; };
    const donor  = gv(pid('donor'));
    const project = gv(pid('project'));
    if (donor) {
      const settings = {
        donorFont: gv(pid('donor-font')), projFont: gv(pid('proj-font')),
        donorSize: parseInt(gv(pid('donor-size'))), projSize: parseInt(gv(pid('proj-size'))),
        donorY: parseInt(gv(pid('donor-y'))), projY: parseInt(gv(pid('proj-y'))),
        donorX: parseInt(gv(pid('donor-x'))), projX: parseInt(gv(pid('proj-x'))),
        donorMaxW: parseInt(gv(pid('donor-maxw'))||1400), projMaxW: parseInt(gv(pid('proj-maxw'))||1400),
        donorAuto: gb(pid('donor-auto')), projAuto: gb(pid('proj-auto')),
        donorEnabled: gb(pid('donor-enabled')), projEnabled: gb(pid('proj-enabled')),
      };
      histSaveSingle(lang, donor, project, settings);
    }
  } catch(e) {}

  const canvasId = lang === 'english'    ? 'canvas-english' :
                   lang === 'orgs'       ? 'canvas-orgs-offscreen' :
                   lang === 'vacip'      ? 'canvas-vacip' :
                   lang.startsWith('ct-')? 'canvas-' + lang :
                                           'canvas-arabic';
  const canvas = document.getElementById(canvasId);
  const name = getFileName(lang);
  const statusEl = getStatusEl(lang);
  statusEl.textContent = "⏳ جارٍ التحضير...";

  if (format === "pdf") {
    canvas.toBlob(function(blob) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const imgData = e.target.result.split(",")[1]; // base64 only
        const W = canvas.width;
        const H = canvas.height;

        // Build minimal PDF manually
        const lines = [];
        lines.push("%PDF-1.4");
        // Object 1: catalog
        const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj";
        // Object 2: pages
        const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`;
        // Object 3: page (size in pts: 1px = 0.75pt)
        const wPt = (W * 0.75).toFixed(2);
        const hPt = (H * 0.75).toFixed(2);
        const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wPt} ${hPt}] /Contents 5 0 R /Resources << /XObject << /Img 4 0 R >> >> >>\nendobj`;
        // Object 4: image XObject
        const imgBytes = atob(imgData);
        const imgLen = imgBytes.length;
        const obj4 = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgLen} >>\nstream\n`;
        // Object 5: content stream (draw image)
        const contentStr = `q ${wPt} 0 0 ${hPt} 0 0 cm /Img Do Q`;
        const contentBytes = contentStr.length;
        const obj5 = `5 0 obj\n<< /Length ${contentBytes} >>\nstream\n${contentStr}\nendstream\nendobj`;

        // We need a JPEG not PNG for DCTDecode
        // Re-render canvas as JPEG
        const jpegData = canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
        const jpegBytes = atob(jpegData);
        const jpegLen = jpegBytes.length;

        const obj4b = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegLen} >>\nstream\n`;

        // Build PDF as binary
        let pdf = "%PDF-1.4\n";
        const offsets = [];

        function addObj(n, str) {
          offsets[n] = pdf.length;
          pdf += str + "\n";
        }

        // We'll build using Uint8Array for binary safety
        const enc = new TextEncoder();
        const parts = [];
        let offset = 0;
        const byteOffsets = [];

        function pushText(s) {
          const b = enc.encode(s);
          parts.push(b);
          offset += b.length;
        }
        function pushBinary(ab) {
          parts.push(ab);
          offset += ab.length;
        }

        pushText("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

        byteOffsets[1] = offset;
        pushText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

        byteOffsets[2] = offset;
        pushText("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

        byteOffsets[3] = offset;
        pushText(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wPt} ${hPt}] /Contents 5 0 R /Resources << /XObject << /Img 4 0 R >> >> >>\nendobj\n`);

        byteOffsets[4] = offset;
        pushText(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegLen} >>\nstream\n`);
        // push raw JPEG bytes
        const jpegArr = new Uint8Array(jpegLen);
        for (let i = 0; i < jpegLen; i++) jpegArr[i] = jpegBytes.charCodeAt(i);
        pushBinary(jpegArr);
        pushText("\nendstream\nendobj\n");

        byteOffsets[5] = offset;
        pushText(`5 0 obj\n<< /Length ${contentBytes} >>\nstream\n${contentStr}\nendstream\nendobj\n`);

        const xrefOffset = offset;
        const numObjs = 6;
        let xref = `xref\n0 ${numObjs}\n0000000000 65535 f \n`;
        for (let i = 1; i < numObjs; i++) {
          xref += String(byteOffsets[i]).padStart(10, "0") + " 00000 n \n";
        }
        pushText(xref);
        pushText(`trailer\n<< /Size ${numObjs} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

        // Combine all parts
        let totalLen = 0;
        for (const p of parts) totalLen += p.length;
        const result = new Uint8Array(totalLen);
        let pos = 0;
        for (const p of parts) { result.set(p, pos); pos += p.length; }

        const pdfBlob = new Blob([result], { type: "application/pdf" });
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.download = `${name}.pdf`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        statusEl.textContent = "✓ تم تحميل PDF";
      };
      reader.readAsDataURL(blob);
    }, "image/png");
    return;
  }

  // PNG
  canvas.toBlob(function(blob) {
    if (!blob) {
      try {
        const link = document.createElement("a");
        link.download = `${name}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        statusEl.textContent = "✓ تم التحميل";
      } catch(e) {
        statusEl.textContent = "❌ فشل التحميل";
      }
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${name}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    statusEl.textContent = "✓ تم التحميل بنجاح";
  }, "image/png");
}

function shareWhatsapp(lang) {
  const canvasId = lang === 'english' ? 'canvas-english' :
                   lang === 'orgs'    ? 'canvas-orgs-offscreen' :
                   lang === 'vacip'   ? 'canvas-vacip' :
                                        'canvas-arabic';
  const canvas = document.getElementById(canvasId);
  const name = getFileName(lang);
  const statusEl = getStatusEl(lang);

  canvas.toBlob(function(blob) {
    if (!blob) { statusEl.textContent = "❌ تعذّر تجهيز الصورة"; return; }
    const file = new File([blob], `${name}.png`, { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name })
        .then(() => { statusEl.textContent = "✓ تمت المشاركة"; })
        .catch(() => { fallbackWhatsapp(canvas, name, statusEl); });
    } else {
      fallbackWhatsapp(canvas, name, statusEl);
    }
  }, "image/png");
}

function fallbackWhatsapp(canvas, name, statusEl) {
  canvas.toBlob(function(blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${name}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setTimeout(() => { window.open("https://web.whatsapp.com", "_blank"); }, 800);
    statusEl.textContent = "✓ تم تحميل الصورة — افتح واتساب وأرسلها يدوياً";
  }, "image/png");
}

function togglePreview(lang) {
  const wrapper = document.getElementById(`${lang === 'orgs' ? 'org' : lang === 'english' ? 'en' : 'ar'}-canvas-wrapper`);
  const btn = document.getElementById(`${lang === 'orgs' ? 'org' : lang === 'english' ? 'en' : 'ar'}-toggle`);
  if (wrapper.style.display === 'none') {
    wrapper.style.display = 'block';
    btn.textContent = '↑ إخفاء المعاينة';
    if (lang === 'arabic') renderArabic();
    else if (lang === 'english') renderEnglish();
    else renderOrgs();
  } else {
    wrapper.style.display = 'none';
    btn.textContent = '👁 إظهار المعاينة ↓';
  }
}

// ===================== BATCH =====================
const batchOpts = { ar: 'pdf', en: 'pdf', org: 'pdf', vk: 'pdf' };

function selectBatchOpt(prefix, mode) {
  batchOpts[prefix] = mode;
  document.getElementById(`${prefix}-batch-opt-pdf`).classList.toggle('selected', mode === 'pdf');
  document.getElementById(`${prefix}-batch-opt-imgs`).classList.toggle('selected', mode === 'imgs');
}

function getBatchCanvas(lang) {
  const c = document.createElement('canvas');
  c.width = IMG_W; c.height = IMG_H;
  return c;
}

function drawOnCanvas(canvas, name, project, lang, img, settings) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, IMG_W, IMG_H);
  // For vacip tab, pick template based on whether name is Arabic
  const actualImg = (lang === 'vacip') ? (_getVKImg(name) || img) : img;
  if (!actualImg || !actualImg.naturalWidth) return;
  ctx.drawImage(actualImg, 0, 0, IMG_W, IMG_H);
  const l = lang === 'arabic' ? 'ar' : lang === 'english' ? 'en' : lang === 'vacip' ? 'vk' : 'org';
  drawCertTextDirect(ctx, name, project, l, settings);
}

// s = optional per-entry settings override; null = read from DOM
function _resolveSettings(lang, s) {
  const g = (id) => document.getElementById(id);
  const gv = (id, def) => { const el = g(id); return el ? parseInt(el.value) : def; };
  const enabledEl = (id) => { const el = g(id); return el ? el.checked : true; };
  return {
    donorFont    : s?.donorFont    ?? getFont(lang, 'donor'),
    projFont     : s?.projFont     ?? getFont(lang, 'proj'),
    donorX       : s?.donorX       ?? parseInt(g(`${lang}-donor-x`).value),
    donorY       : s?.donorY       ?? parseInt(g(`${lang}-donor-y`).value),
    projX        : s?.projX        ?? parseInt(g(`${lang}-proj-x`).value),
    projY        : s?.projY        ?? parseInt(g(`${lang}-proj-y`).value),
    donorSize    : s?.donorSize    ?? parseInt(g(`${lang}-donor-size`).value),
    projSize     : s?.projSize     ?? parseInt(g(`${lang}-proj-size`).value),
    donorAuto    : s?.donorAuto    ?? g(`${lang}-donor-auto`).checked,
    projAuto     : s?.projAuto     ?? g(`${lang}-proj-auto`).checked,
    donorEnabled : s?.donorEnabled ?? enabledEl(`${lang}-donor-enabled`),
    projEnabled  : s?.projEnabled  ?? enabledEl(`${lang}-proj-enabled`),
    donorMaxW    : s?.donorMaxW    ?? gv(`${lang}-donor-maxw`, 1400),
    projMaxW     : s?.projMaxW     ?? gv(`${lang}-proj-maxw`,  1400),
    donorColor   : s?.donorColor   ?? ((g(`${lang}-donor-color`) || {}).value || '#1e2f5a'),
    projColor    : s?.projColor    ?? ((g(`${lang}-proj-color`)  || {}).value || '#ffffff'),
  };
}

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

function drawCertTextDirect(ctx, donorText, projectText, lang, settings) {
  const s   = _resolveSettings(lang, settings || null);
  const dir = 'rtl';
  ctx.textBaseline = 'middle';

  // Project
  if (s.projEnabled !== false) {
    const projLines = projectText.trim().split('\n').filter(Boolean);
    const projText2 = projLines.join(' | ');
    const projSize  = _calcSize(ctx, projText2, s.projMaxW ?? USABLE_W * 0.85, 72, 28, s.projFont, s.projAuto, s.projSize);
    ctx.font = `bold ${projSize}px "${s.projFont}", serif`;
    ctx.fillStyle = s.projColor || '#ffffff';
    ctx.direction = dir;
    ctx.textAlign = 'center';
    ctx.fillText(projText2, s.projX, s.projY);
  }

  // Donor
  if (s.donorEnabled !== false) {
    const donorLines  = donorText.trim().split('\n').filter(Boolean);
    const totalLines  = donorLines.length || 1;
    const lineSpacing = Math.min(90, 244 / (totalLines + 0.5));
    const longestLine = donorLines.reduce((a, b) => a.length > b.length ? a : b, '');
    const donorSize   = _calcSize(ctx, longestLine, s.donorMaxW ?? USABLE_W * 0.8, 64, 22, s.donorFont, s.donorAuto, s.donorSize);
    ctx.font = `bold ${donorSize}px "${s.donorFont}", serif`;
    ctx.fillStyle = s.donorColor || '#1e2f5a';
    ctx.direction = dir;
    ctx.textAlign = 'center';
    const startY = s.donorY - ((totalLines - 1) * lineSpacing) / 2;
    donorLines.forEach((line, i) => ctx.fillText(line.trim(), s.donorX, startY + i * lineSpacing));
  }
}

function canvasToJpegBase64(canvas) {
  return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
}

// ===================== BATCH PREVIEW + EDIT =====================
let _pendingBatch = null;  // { lang, prefix, entries:[{name,project}], img }
let _editingIndex = null;
const THUMB_W = 480;
const THUMB_H = Math.round(IMG_H * (480 / IMG_W));

async function startBatch(lang) {
  // Custom tab support
  if (lang.startsWith('ct-')) {
    const tabId = lang.slice(3);
    const tab   = CUSTOM_TABS.find(t => t.id === tabId);
    if (!tab || !tab.img || !tab.img.naturalWidth) { alert('يجب رفع القالب أولاً'); return; }
    const p = 'ct-' + tabId + '-';
    const namesRaw = (document.getElementById(p + 'batch-names') || {}).value || '';
    if (!namesRaw.trim()) { alert('أدخل أسماء أولاً'); return; }
    const defaultProject = (document.getElementById(p + 'project') || {}).value || '';
    const names = namesRaw.split('\n').map(n => n.trim()).filter(Boolean);
    const initSettings = {
      donorFont: (document.getElementById(p+'donor-font')||{}).value||'Amiri',
      projFont:  (document.getElementById(p+'proj-font') ||{}).value||'Amiri',
      donorSize: parseInt((document.getElementById(p+'donor-size')||{}).value)||64,
      projSize:  parseInt((document.getElementById(p+'proj-size') ||{}).value)||72,
      donorY:    parseInt((document.getElementById(p+'donor-y')   ||{}).value)||590,
      projY:     parseInt((document.getElementById(p+'proj-y')    ||{}).value)||842,
      donorX:    parseInt((document.getElementById(p+'donor-x')   ||{}).value)||877,
      projX:     parseInt((document.getElementById(p+'proj-x')    ||{}).value)||877,
      donorAuto: (document.getElementById(p+'donor-auto')   ||{}).checked!==false,
      projAuto:  (document.getElementById(p+'proj-auto')    ||{}).checked!==false,
      donorEnabled:(document.getElementById(p+'donor-enabled')||{}).checked!==false,
      projEnabled: (document.getElementById(p+'proj-enabled') ||{}).checked!==false,
    };
    const entries = names.map(name => ({ name, project: defaultProject, settings: { ...initSettings } }));
    _pendingBatch = { lang, prefix: p.slice(0,-1), entries, img: tab.img };
    openBatchPreviewGrid();
    return;
  }

  const prefix = lang === 'arabic' ? 'ar' : lang === 'english' ? 'en' : lang === 'vacip' ? 'vk' : 'org';
  const namesRaw = document.getElementById(`${prefix}-batch-names`).value.trim();
  if (!namesRaw) { alert('أدخل أسماء أولاً'); return; }

  const projectEl = document.getElementById(lang === 'arabic' ? 'ar-project' : lang === 'english' ? 'en-project' : lang === 'vacip' ? 'vk-project' : 'org-project');
  const defaultProject = projectEl.value || 'اسم المشروع';

  const img = lang === 'arabic' ? AR_IMG :
              lang === 'english' ? EN_IMG :
              lang === 'vacip'   ? (VK_TR_IMG || VK_AR_IMG) :
              ORG_IMG;
  if (lang === 'vacip' && !VK_TR_IMG && !VK_AR_IMG) { alert('يجب رفع قالب واحد على الأقل أولاً'); return; }
  if (lang !== 'vacip' && (!img || !img.naturalWidth)) { alert('يجب رفع القالب أولاً'); return; }

  const names = namesRaw.split('\n').map(n => n.trim()).filter(Boolean);
  if (names.length === 0) { alert('لا توجد أسماء صالحة'); return; }

  const initSettings = _resolveSettings(prefix, null);
  const entries = names.map(name => ({ name, project: defaultProject, settings: { ...initSettings } }));
  _pendingBatch = { lang, prefix, entries, img };
  openBatchPreviewGrid();
}

function _renderThumb(entry) {
  const { lang, img } = _pendingBatch;
  const c = getBatchCanvas(lang);
  drawOnCanvas(c, entry.name, entry.project, lang, img, entry.settings);
  const thumb = document.createElement('canvas');
  thumb.width = THUMB_W; thumb.height = THUMB_H;
  thumb.getContext('2d').drawImage(c, 0, 0, THUMB_W, THUMB_H);
  return thumb.toDataURL('image/jpeg', 0.75);
}

async function openBatchPreviewGrid() {
  const modal = document.getElementById('batch-preview-modal');
  const { entries } = _pendingBatch;

  document.getElementById('batch-preview-count').textContent = `${entries.length} شهادة`;
  document.getElementById('batch-preview-generating').style.display = 'flex';
  document.getElementById('batch-preview-actions').style.display = 'none';
  document.getElementById('batch-edit-view').style.display = 'none';
  document.getElementById('batch-grid-view').style.display = 'block';
  document.getElementById('batch-preview-grid').innerHTML = '';
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';

  for (let i = 0; i < entries.length; i++) {
    _appendCard(i, _renderThumb(entries[i]));
    if (i % 4 === 0) await new Promise(r => setTimeout(r, 0));
  }

  document.getElementById('batch-preview-generating').style.display = 'none';
  document.getElementById('batch-preview-actions').style.display = 'flex';
}

function _appendCard(index, thumbSrc) {
  const entry = _pendingBatch.entries[index];
  const grid = document.getElementById('batch-preview-grid');

  const card = document.createElement('div');
  card.className = 'preview-card';
  card.id = `bcard-${index}`;

  const img = document.createElement('img');
  img.src = thumbSrc;

  const footer = document.createElement('div');
  footer.className = 'preview-card-footer';

  const label = document.createElement('span');
  label.className = 'preview-card-name';
  label.textContent = `${index + 1}. ${entry.name}`;

  const editBtn = document.createElement('button');
  editBtn.className = 'preview-card-edit-btn';
  editBtn.textContent = '✏️ تعديل';
  editBtn.onclick = (e) => { e.stopPropagation(); openCardEditor(index); };

  footer.appendChild(label);
  footer.appendChild(editBtn);
  card.appendChild(img);
  card.appendChild(footer);
  card.onclick = () => openCardEditor(index);
  grid.appendChild(card);
}

const FONT_OPTIONS = [
  // ── خطوط عربية ──
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
  // ── خطوط أجنبية راقية ──
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

function _populateFontSelects() {
  ['batch-edit-donor-font','batch-edit-proj-font'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel || sel.options.length > 1) return;
    sel.innerHTML = '';
    FONT_OPTIONS.forEach(f => {
      const o = document.createElement('option');
      o.value = f.v; o.textContent = f.l;
      sel.appendChild(o);
    });
  });
}

function _editVal(id) { return document.getElementById(id); }

function openCardEditor(index) {
  _editingIndex = index;
  const entry   = _pendingBatch.entries[index];
  const { entries } = _pendingBatch;
  const s = entry.settings;

  _populateFontSelects();
  document.getElementById('batch-grid-view').style.display = 'none';
  document.getElementById('batch-edit-view').style.display = 'flex';
  document.getElementById('batch-edit-title').textContent = `تعديل الشهادة ${index + 1} من ${entries.length}`;

  // Text
  _editVal('batch-edit-name').value    = entry.name;
  _editVal('batch-edit-project').value = entry.project;

  // Font selects
  _setSelect('batch-edit-donor-font', s.donorFont);
  _setSelect('batch-edit-proj-font',  s.projFont);

  // Sizes
  _setRange('batch-edit-donor-size', 'batch-edit-donor-size-val', s.donorSize);
  _setRange('batch-edit-proj-size',  'batch-edit-proj-size-val',  s.projSize);

  // Auto checkboxes
  _editVal('batch-edit-donor-auto').checked    = s.donorAuto;
  _editVal('batch-edit-proj-auto').checked     = s.projAuto;
  _editVal('batch-edit-donor-size').disabled   = s.donorAuto;
  _editVal('batch-edit-proj-size').disabled    = s.projAuto;
  const dEn = _editVal('batch-edit-donor-enabled');
  const pEn = _editVal('batch-edit-proj-enabled');
  if (dEn) dEn.checked = s.donorEnabled !== false;
  if (pEn) pEn.checked = s.projEnabled  !== false;

  // Positions
  _setRange('batch-edit-donor-x', 'batch-edit-donor-x-val', s.donorX);
  _setRange('batch-edit-donor-y', 'batch-edit-donor-y-val', s.donorY);
  _setRange('batch-edit-proj-x',  'batch-edit-proj-x-val',  s.projX);
  _setRange('batch-edit-proj-y',  'batch-edit-proj-y-val',  s.projY);

  // Navigation
  _editVal('batch-edit-prev').disabled = index === 0;
  _editVal('batch-edit-next').disabled = index === entries.length - 1;

  // wait one frame so flex layout is calculated before reading clientWidth
  requestAnimationFrame(() => refreshEditPreview());
}

function _setSelect(id, val) {
  const el = _editVal(id);
  el.value = val;
  if (el.value !== val) el.value = el.options[0].value;
}

function _setRange(rangeId, valId, val) {
  const el = _editVal(rangeId);
  el.value = val;
  _editVal(valId).textContent = val;
}

function _readEditSettings() {
  const donorAuto = _editVal('batch-edit-donor-auto').checked;
  const projAuto  = _editVal('batch-edit-proj-auto').checked;
  const donorEnabledEl = _editVal('batch-edit-donor-enabled');
  const projEnabledEl  = _editVal('batch-edit-proj-enabled');
  return {
    donorFont    : _editVal('batch-edit-donor-font').value,
    projFont     : _editVal('batch-edit-proj-font').value,
    donorSize    : parseInt(_editVal('batch-edit-donor-size').value),
    projSize     : parseInt(_editVal('batch-edit-proj-size').value),
    donorAuto,
    projAuto,
    donorX       : parseInt(_editVal('batch-edit-donor-x').value),
    donorY       : parseInt(_editVal('batch-edit-donor-y').value),
    projX        : parseInt(_editVal('batch-edit-proj-x').value),
    projY        : parseInt(_editVal('batch-edit-proj-y').value),
    donorEnabled : donorEnabledEl ? donorEnabledEl.checked : true,
    projEnabled  : projEnabledEl  ? projEnabledEl.checked  : true,
  };
}

function refreshEditPreview() {
  const nameVal = _editVal('batch-edit-name').value;
  const projVal = _editVal('batch-edit-project').value;
  const { lang, img } = _pendingBatch;
  const settings = _readEditSettings();

  _editVal('batch-edit-donor-size').disabled = settings.donorAuto;
  _editVal('batch-edit-proj-size').disabled  = settings.projAuto;
  _editVal('batch-edit-donor-size').style.opacity = settings.donorAuto ? '0.4' : '1';
  _editVal('batch-edit-proj-size').style.opacity  = settings.projAuto  ? '0.4' : '1';

  const c = getBatchCanvas(lang);
  drawOnCanvas(c, nameVal, projVal, lang, img, settings);

  const wrap    = document.getElementById('batch-edit-canvas-wrap');
  const preview = document.getElementById('batch-edit-canvas-preview');

  // clientWidth can be 0 if DOM not yet painted — fall back to window width minus panel
  const availW = wrap.clientWidth > 10 ? wrap.clientWidth : (window.innerWidth - 340);
  const scale  = Math.min(1, (availW - 16) / IMG_W);
  const dispH  = Math.round(IMG_H * scale);

  wrap.style.height             = dispH + 'px';
  preview.style.transform       = `scale(${scale})`;
  preview.style.transformOrigin = 'top left';
  preview.getContext('2d').drawImage(c, 0, 0);
}

function saveCardEdit() {
  const i = _editingIndex;
  const nameVal = _editVal('batch-edit-name').value.trim();
  const projVal = _editVal('batch-edit-project').value.trim();
  if (nameVal) _pendingBatch.entries[i].name    = nameVal;
  if (projVal) _pendingBatch.entries[i].project = projVal;
  _pendingBatch.entries[i].settings = _readEditSettings();

  const thumbSrc = _renderThumb(_pendingBatch.entries[i]);
  const card = document.getElementById(`bcard-${i}`);
  if (card) {
    card.querySelector('img').src = thumbSrc;
    card.querySelector('.preview-card-name').textContent = `${i + 1}. ${_pendingBatch.entries[i].name}`;
  }
  backToGrid();
}

function navigateEdit(direction) {
  saveCardEdit();
  const next = _editingIndex + direction;
  if (next >= 0 && next < _pendingBatch.entries.length) openCardEditor(next);
}

function backToGrid() {
  document.getElementById('batch-edit-view').style.display = 'none';
  document.getElementById('batch-grid-view').style.display = 'block';
  // Scroll to the edited card
  const card = document.getElementById(`bcard-${_editingIndex}`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  _editingIndex = null;
}

function closeBatchPreview() {
  document.getElementById('batch-preview-modal').style.display = 'none';
  document.body.style.overflow = '';
  _pendingBatch = null;
  _editingIndex = null;
}

async function confirmBatchDownload() {
  if (!_pendingBatch) return;
  const { lang, prefix, entries, img } = _pendingBatch;
  // Save full batch (with per-card edits) to history
  try { histSaveBatch(lang, entries); } catch(e) {}
  closeBatchPreview();

  const mode = batchOpts[prefix];
  const progressEl = document.getElementById(`${prefix}-batch-progress`);
  const barEl = document.getElementById(`${prefix}-batch-bar`);
  const textEl = document.getElementById(`${prefix}-batch-text`);
  progressEl.style.display = 'block';

  if (mode === 'pdf') {
    textEl.textContent = 'جارٍ بناء PDF...';
    const jpegDataList = [];

    for (let i = 0; i < entries.length; i++) {
      barEl.style.width = `${Math.round((i / entries.length) * 80)}%`;
      textEl.textContent = `معالجة ${i + 1} من ${entries.length}: ${entries[i].name}`;
      await new Promise(r => setTimeout(r, 10));

      const c = getBatchCanvas(lang);
      drawOnCanvas(c, entries[i].name, entries[i].project, lang, img, entries[i].settings);
      jpegDataList.push({ data: canvasToJpegBase64(c), w: IMG_W, h: IMG_H });
    }

    barEl.style.width = '90%';
    textEl.textContent = 'جارٍ تجميع PDF...';
    await new Promise(r => setTimeout(r, 20));

    const pdfBytes = buildMultiPagePDF(jpegDataList);
    barEl.style.width = '100%';
    textEl.textContent = `✓ تم — ${entries.length} لوحة في PDF واحد`;

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getBatchFileName(lang, entries.length)}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

  } else {
    for (let i = 0; i < entries.length; i++) {
      barEl.style.width = `${Math.round(((i + 1) / entries.length) * 100)}%`;
      textEl.textContent = `تحميل ${i + 1} من ${entries.length}: ${entries[i].name}`;
      await new Promise(r => setTimeout(r, 50));

      const c = getBatchCanvas(lang);
      drawOnCanvas(c, entries[i].name, entries[i].project, lang, img, entries[i].settings);

      await new Promise(resolve => {
        c.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${_sanitize(entries[i].name)} - ${_sanitize(_getTabLabel(lang))}.png`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(() => { URL.revokeObjectURL(url); resolve(); }, 300);
        }, 'image/png');
      });
    }
    textEl.textContent = `✓ تم تحميل ${entries.length} صورة`;
  }
}

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
  // obj numbering: 1=catalog, 2=pages, 3..N+2=page objs, N+3..2N+2=img objs, 2N+3..3N+2=content objs

  pushText('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // Catalog
  byteOffsets[1] = offset;
  pushText(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // Pages
  const kids = pages.map((_, i) => `${3 + i} 0 R`).join(' ');
  byteOffsets[2] = offset;
  pushText(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${N} >>\nendobj\n`);

  // For each page: page obj, image obj, content obj
  for (let i = 0; i < N; i++) {
    const { data, w, h } = pages[i];
    const wPt = (w * 0.75).toFixed(2);
    const hPt = (h * 0.75).toFixed(2);
    const pageObjN    = 3 + i;
    const imgObjN     = 3 + N + i;
    const contentObjN = 3 + 2 * N + i;

    // Page obj
    byteOffsets[pageObjN] = offset;
    pushText(`${pageObjN} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wPt} ${hPt}] /Contents ${contentObjN} 0 R /Resources << /XObject << /Img${i} ${imgObjN} 0 R >> >> >>\nendobj\n`);

    // Image obj
    const jpegBytes = atob(data);
    const jpegLen = jpegBytes.length;
    const jpegArr = new Uint8Array(jpegLen);
    for (let j = 0; j < jpegLen; j++) jpegArr[j] = jpegBytes.charCodeAt(j);

    byteOffsets[imgObjN] = offset;
    pushText(`${imgObjN} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegLen} >>\nstream\n`);
    pushBin(jpegArr);
    pushText(`\nendstream\nendobj\n`);

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


function switchTab(tab, btnEl) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  const tabEl = document.getElementById("tab-" + tab);
  if (tabEl) tabEl.classList.add("active");
  const btn = btnEl || document.getElementById("tabBtn-" + tab);
  if (btn) btn.classList.add("active");
  if (tab === "orgs")         renderOrgs();
  else if (tab === "vacip")   renderVacip();
  else                        _ctRender(tab);
}

// ===================== CUSTOM TABS =====================

const CT_STATE_KEY = 'donor_cert_custom_tabs_v1';
let CUSTOM_TABS = [];   // [{ id, name, templateDataUrl }]
let _ctCounter  = 0;

const CT_FIELD_IDS   = ['donor','project','batch-names','donor-font','proj-font','donor-size','proj-size','donor-y','proj-y','donor-x','proj-x','donor-maxw','proj-maxw','donor-color','proj-color'];
const CT_CB_IDS      = ['donor-enabled','proj-enabled','donor-auto','proj-auto'];
const CT_SLIDER_IDS  = ['donor-size','proj-size','donor-y','proj-y','donor-x','proj-x'];

function _ctPrefix(id) { return 'ct-' + id + '-'; }

function _ctFieldId(tabId, field) { return _ctPrefix(tabId) + field; }

function _ctEl(tabId, field) { return document.getElementById(_ctFieldId(tabId, field)); }

function _ctSliders(tabId) {
  CT_SLIDER_IDS.forEach(f => {
    const el = _ctEl(tabId, f);
    const vEl = document.getElementById(_ctFieldId(tabId, f) + '-val');
    if (el && vEl) vEl.textContent = el.value;
  });
}

function renderCustomTab(tabId) {
  const tab = CUSTOM_TABS.find(t => t.id === tabId);
  if (!tab) return;
  if (!tab.img || !tab.img.naturalWidth) {
    const status = document.getElementById('ct-' + tabId + '-status');
    if (status) status.textContent = '⚠ ارفع قالب الجهة أولاً';
    return;
  }
  const canvas  = document.getElementById('canvas-ct-' + tabId);
  if (!canvas) return;
  const ctx     = canvas.getContext('2d');
  ctx.clearRect(0, 0, IMG_W, IMG_H);
  ctx.drawImage(tab.img, 0, 0, IMG_W, IMG_H);
  // reuse drawCertText with a fake prefix — read values directly
  const donor   = (_ctEl(tabId,'donor') || {}).value   || '';
  const project = (_ctEl(tabId,'project') || {}).value || '';
  const pf      = _ctPrefix(tabId);
  // temporarily alias IDs so drawCertText can read them
  _withAliasedIds(pf, 'ct-', tabId, () => drawCertText(ctx, donor, project, 'ct-' + tabId));
  const wrapper = document.getElementById('ct-' + tabId + '-canvas-wrapper');
  if (wrapper) wrapper.style.display = 'block';
  const prompt  = document.getElementById('ct-' + tabId + '-upload-prompt');
  if (prompt)  prompt.style.display  = 'none';
  const status  = document.getElementById('ct-' + tabId + '-status');
  if (status)  status.textContent    = '✓ اللوحة جاهزة للتحميل';
  saveCustomTabs();
}

// drawCertText reads IDs like `${lang}-donor`, `${lang}-proj-font` etc.
// We need to alias our ct-{id}-donor → a fake lang prefix.
// Simpler: build settings object and call drawCertTextDirect.
function _ctRender(tabId) {
  const tab = CUSTOM_TABS.find(t => t.id === tabId);
  if (!tab) return;
  if (!tab.img || !tab.img.naturalWidth) {
    const s = document.getElementById('ct-' + tabId + '-status');
    if (s) s.textContent = '⚠ ارفع قالب الجهة أولاً';
    return;
  }
  const canvas = document.getElementById('canvas-ct-' + tabId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, IMG_W, IMG_H);
  ctx.drawImage(tab.img, 0, 0, IMG_W, IMG_H);

  const donor   = (_ctEl(tabId,'donor')   || {}).value || '';
  const project = (_ctEl(tabId,'project') || {}).value || '';

  const settings = {
    donorFont:    (_ctEl(tabId,'donor-font')   || {}).value || 'Amiri',
    projFont:     (_ctEl(tabId,'proj-font')    || {}).value || 'Amiri',
    donorSize:    parseInt((_ctEl(tabId,'donor-size') || {}).value) || 64,
    projSize:     parseInt((_ctEl(tabId,'proj-size')  || {}).value) || 72,
    donorY:       parseInt((_ctEl(tabId,'donor-y')    || {}).value) || 590,
    projY:        parseInt((_ctEl(tabId,'proj-y')     || {}).value) || 842,
    donorX:       parseInt((_ctEl(tabId,'donor-x')    || {}).value) || 877,
    projX:        parseInt((_ctEl(tabId,'proj-x')     || {}).value) || 877,
    donorAuto:    (_ctEl(tabId,'donor-auto')   || {}).checked !== false,
    projAuto:     (_ctEl(tabId,'proj-auto')    || {}).checked !== false,
    donorEnabled: (_ctEl(tabId,'donor-enabled')|| {}).checked !== false,
    projEnabled:  (_ctEl(tabId,'proj-enabled') || {}).checked !== false,
    donorMaxW:    parseInt((_ctEl(tabId,'donor-maxw')  || {}).value) || 1400,
    projMaxW:     parseInt((_ctEl(tabId,'proj-maxw')   || {}).value) || 1400,
    donorColor:   (_ctEl(tabId,'donor-color') || {}).value || '#1e2f5a',
    projColor:    (_ctEl(tabId,'proj-color')  || {}).value || '#ffffff',
  };
  drawCertTextDirect(ctx, donor, project, 'ct', settings);

  const wrapper = document.getElementById('ct-' + tabId + '-canvas-wrapper');
  if (wrapper) wrapper.style.display = 'block';
  const prompt  = document.getElementById('ct-' + tabId + '-upload-prompt');
  if (prompt)   prompt.style.display  = 'none';
  const status  = document.getElementById('ct-' + tabId + '-status');
  if (status)   status.textContent    = '✓ اللوحة جاهزة للتحميل';
  saveCustomTabs();
}

function loadCustomTemplate(input, tabId) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const tab = CUSTOM_TABS.find(t => t.id === tabId);
      if (tab) { tab.img = img; tab.templateDataUrl = e.target.result; }
      _ctRender(tabId);
      saveCustomTabs();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function _buildCustomTabPanel(tab) {
  const id   = tab.id;
  const p    = 'ct-' + id + '-';
  const div  = document.createElement('div');
  div.id     = 'tab-' + id;
  div.className = 'tab-content main';
  div.innerHTML = `
  <div class="panel">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid rgba(200,164,90,0.25);">
      <h2 style="margin:0;padding:0;border:none;">📋 ${tab.name}</h2>
      <button class="hist-btn" onclick="openHistoryModal('${id}')" title="سجل العمليات">🕐</button>
    </div>

    <div class="field">
      <label class="field-toggle-label">اسم المتبرع / المتبرعين<label class="toggle-switch"><input type="checkbox" id="${p}donor-enabled" checked onchange="_ctRender('${id}')"><span class="toggle-slider"></span></label></label>
      <textarea id="${p}donor" rows="3" placeholder="أدخل اسم المتبرع" oninput="_ctRender('${id}')"></textarea>
    </div>

    <div class="field">
      <label class="field-toggle-label">اسم المشروع<label class="toggle-switch"><input type="checkbox" id="${p}proj-enabled" checked onchange="_ctRender('${id}')"><span class="toggle-slider"></span></label></label>
      <input type="text" id="${p}project" placeholder="اسم المشروع" oninput="_ctRender('${id}')">
    </div>

    <div class="field">
      <div class="font-section">
        <div class="font-section-title">🔤 نوع الخط</div>
        <label style="font-size:12px;color:#9aaccc">خط اسم المتبرع</label>
        <select id="${p}donor-font" onchange="_ctRender('${id}')" style="width:100%;padding:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(200,164,90,0.3);border-radius:8px;color:#e8e8e8;font-family:'Cairo',sans-serif;font-size:13px;margin-bottom:8px"></select>
        <label style="font-size:12px;color:#9aaccc">خط اسم المشروع</label>
        <select id="${p}proj-font" onchange="_ctRender('${id}')" style="width:100%;padding:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(200,164,90,0.3);border-radius:8px;color:#e8e8e8;font-family:'Cairo',sans-serif;font-size:13px"></select>
      </div>
    </div>

    <div class="field">
      <div class="font-section">
        <div class="font-section-title">📐 حجم وموضع — المتبرع</div>
        <label style="font-size:12px;color:#9aaccc">الحجم</label>
        <div class="font-control">
          <input type="range" id="${p}donor-size" min="20" max="300" value="64" oninput="document.getElementById('${p}donor-size-val').textContent=this.value;_ctRender('${id}')">
          <span class="size-val" id="${p}donor-size-val">64</span>
        </div>
        <label class="auto-toggle"><input type="checkbox" id="${p}donor-auto" checked onchange="toggleAuto('ct-${id}','donor')"> حجم تلقائي</label>
        <label style="font-size:12px;color:#9aaccc;margin-top:8px;display:block">🎨 لون الاسم</label>
        <div class="color-row">
          <input type="color" id="${p}donor-color" value="#1e2f5a" oninput="_ctRender('${id}')">
          <span class="color-val" id="${p}donor-color-val">#1e2f5a</span>
          <button class="color-reset" onclick="document.getElementById('${p}donor-color').value='#1e2f5a';_ctRender('${id}')">↺</button>
        </div>
        <label style="font-size:12px;color:#9aaccc;margin-top:8px;display:block">↔ عرض الإطار (حد الاسم)</label>
        <div class="font-control">
          <input type="range" id="${p}donor-maxw" min="200" max="1754" value="1400" oninput="document.getElementById('${p}donor-maxw-val').textContent=this.value;_ctRender('${id}')">
          <span class="size-val" id="${p}donor-maxw-val">1400</span>
        </div>
        <label style="font-size:12px;color:#9aaccc;margin-top:8px;display:block">الارتفاع (Y)</label>
        <div class="font-control">
          <input type="range" id="${p}donor-y" min="50" max="1200" value="590" oninput="document.getElementById('${p}donor-y-val').textContent=this.value;_ctRender('${id}')">
          <span class="size-val" id="${p}donor-y-val">590</span>
        </div>
        <label style="font-size:12px;color:#9aaccc;margin-top:6px;display:block">المحور الأفقي (X)</label>
        <div class="font-control">
          <input type="range" id="${p}donor-x" min="0" max="1754" value="877" oninput="document.getElementById('${p}donor-x-val').textContent=this.value;_ctRender('${id}')">
          <span class="size-val" id="${p}donor-x-val">877</span>
        </div>
      </div>
    </div>

    <div class="field">
      <div class="font-section">
        <div class="font-section-title">📋 حجم وموضع — المشروع</div>
        <label style="font-size:12px;color:#9aaccc">الحجم</label>
        <div class="font-control">
          <input type="range" id="${p}proj-size" min="20" max="300" value="72" oninput="document.getElementById('${p}proj-size-val').textContent=this.value;_ctRender('${id}')">
          <span class="size-val" id="${p}proj-size-val">72</span>
        </div>
        <label class="auto-toggle"><input type="checkbox" id="${p}proj-auto" checked onchange="toggleAuto('ct-${id}','proj')"> حجم تلقائي</label>
        <label style="font-size:12px;color:#9aaccc;margin-top:8px;display:block">🎨 لون المشروع</label>
        <div class="color-row">
          <input type="color" id="${p}proj-color" value="#ffffff" oninput="_ctRender('${id}')">
          <span class="color-val" id="${p}proj-color-val">#ffffff</span>
          <button class="color-reset" onclick="document.getElementById('${p}proj-color').value='#ffffff';_ctRender('${id}')">↺</button>
        </div>
        <label style="font-size:12px;color:#9aaccc;margin-top:8px;display:block">↔ عرض الإطار (حد المشروع)</label>
        <div class="font-control">
          <input type="range" id="${p}proj-maxw" min="200" max="1754" value="1400" oninput="document.getElementById('${p}proj-maxw-val').textContent=this.value;_ctRender('${id}')">
          <span class="size-val" id="${p}proj-maxw-val">1400</span>
        </div>
        <label style="font-size:12px;color:#9aaccc;margin-top:8px;display:block">الارتفاع (Y)</label>
        <div class="font-control">
          <input type="range" id="${p}proj-y" min="50" max="1200" value="842" oninput="document.getElementById('${p}proj-y-val').textContent=this.value;_ctRender('${id}')">
          <span class="size-val" id="${p}proj-y-val">842</span>
        </div>
        <label style="font-size:12px;color:#9aaccc;margin-top:6px;display:block">المحور الأفقي (X)</label>
        <div class="font-control">
          <input type="range" id="${p}proj-x" min="0" max="1754" value="877" oninput="document.getElementById('${p}proj-x-val').textContent=this.value;_ctRender('${id}')">
          <span class="size-val" id="${p}proj-x-val">877</span>
        </div>
      </div>
    </div>

    <div class="field">
      <label>القالب</label>
      <div class="upload-zone upload-zone-row" onclick="document.getElementById('${p}upload').click()">
        <input type="file" id="${p}upload" accept="image/*" style="display:none" onchange="loadCustomTemplate(this,'${id}')">
        <span class="upload-zone-flag">📎</span>
        <div class="upload-zone-info">
          <div>رفع قالب الجهة</div>
          <div class="upload-zone-sub">PNG / JPG</div>
        </div>
        <span id="${p}upload-badge" class="upload-zone-badge">—</span>
      </div>
    </div>

    <button class="btn-generate" onclick="_ctRender('${id}')">🔄 معاينة اللوحة</button>
    <div class="export-btns">
      <button class="btn-download visible" onclick="downloadCert('ct-${id}','png')">⬇ PNG</button>
      <button class="btn-download visible" onclick="downloadCert('ct-${id}','pdf')">⬇ PDF</button>
      <button class="btn-whatsapp" onclick="shareWhatsapp('ct-${id}')">📲 واتساب</button>
    </div>

    <div class="batch-section">
      <div class="batch-title">⚡ إنتاج جماعي</div>
      <textarea id="${p}batch-names" placeholder="أدخل اسماً في كل سطر"></textarea>
      <div class="batch-hint">كل سطر = لوحة منفصلة</div>
      <div class="batch-options">
        <div class="batch-opt selected" id="${p}batch-opt-pdf" onclick="selectBatchOpt('ct-${id}','pdf')">📄 PDF واحد</div>
        <div class="batch-opt" id="${p}batch-opt-imgs" onclick="selectBatchOpt('ct-${id}','imgs')">🖼 صور منفردة</div>
      </div>
      <button class="btn-batch" onclick="startBatch('ct-${id}')">🚀 ابدأ الإنتاج</button>
      <div class="batch-progress" id="${p}batch-progress">
        <div class="progress-bar-wrap"><div class="progress-bar-fill" id="${p}batch-bar"></div></div>
        <div class="progress-text" id="${p}batch-text">جارٍ المعالجة...</div>
      </div>
    </div>

    <div style="margin-top:16px;text-align:center;">
      <button onclick="removeCustomTab('${id}')" style="background:rgba(220,60,60,0.15);border:1px solid rgba(220,60,60,0.35);color:#e07070;font-family:'Cairo',sans-serif;font-size:12px;padding:7px 18px;border-radius:8px;cursor:pointer;">🗑 حذف هذا التبويب</button>
    </div>
  </div>

  <div class="preview-area">
    <div id="ct-${id}-upload-prompt" style="width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;background:rgba(255,255,255,0.04);border:2px dashed rgba(200,164,90,0.3);border-radius:12px;cursor:pointer;gap:12px" onclick="document.getElementById('${p}upload').click()">
      <div style="font-size:40px">📋</div>
      <div style="color:#c8a45a;font-size:15px;font-weight:700">ارفع قالب الجهة</div>
      <div style="color:#9aaccc;font-size:12px">اضغط هنا أو استخدم زر الرفع في الجانب</div>
    </div>
    <div class="canvas-wrapper" id="ct-${id}-canvas-wrapper" style="display:none">
      <canvas id="canvas-ct-${id}" width="1754" height="1241"></canvas>
    </div>
    <div class="status" id="ct-${id}-status"></div>
  </div>`;
  return div;
}

function _addCustomTabToDOM(tab) {
  const modal = document.getElementById('batch-preview-modal');
  const panel = _buildCustomTabPanel(tab);
  document.body.insertBefore(panel, modal);
  // Add tab button before the + button
  const tabsBar = document.getElementById('tabs-bar');
  const addBtn  = document.getElementById('tab-add-btn');
  const btn     = document.createElement('button');
  btn.className = 'tab-btn';
  btn.id        = 'tabBtn-' + tab.id;
  btn.innerHTML = `📋 ${tab.name} <span class="tab-close" onclick="event.stopPropagation();removeCustomTab('${tab.id}')">✕</span>`;
  btn.onclick   = (e) => switchTab(tab.id, btn);
  tabsBar.insertBefore(btn, addBtn);
  // Init font selects
  [tab.id + '-donor-font', tab.id + '-proj-font'].map(f => 'ct-' + f).forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = '';
    FONT_OPTIONS.forEach(f => {
      const o = document.createElement('option');
      o.value = f.v; o.textContent = f.l; sel.appendChild(o);
    });
  });
  // Re-attach batch opts save hooks
  if (typeof _hookStateSave === 'function') {
    ['ct-' + tab.id + '-donor','ct-' + tab.id + '-project','ct-' + tab.id + '-batch-names'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.addEventListener('input', saveCustomTabs); el.addEventListener('change', saveCustomTabs); }
    });
  }
}

function addCustomTab(name) {
  if (!name || !name.trim()) return;
  const id  = 'ct' + (++_ctCounter) + '_' + Date.now();
  const tab = { id, name: name.trim(), templateDataUrl: null, img: null };
  CUSTOM_TABS.push(tab);
  _addCustomTabToDOM(tab);
  switchTab(id, document.getElementById('tabBtn-' + id));
  saveCustomTabs();
}

function removeCustomTab(tabId) {
  if (!confirm('حذف هذا التبويب نهائياً؟')) return;
  CUSTOM_TABS = CUSTOM_TABS.filter(t => t.id !== tabId);
  const panel = document.getElementById('tab-' + tabId);
  if (panel) panel.remove();
  const btn = document.getElementById('tabBtn-' + tabId);
  if (btn) btn.remove();
  switchTab('arabic', document.getElementById('tabBtn-arabic'));
  saveCustomTabs();
}

function saveCustomTabs() {
  try {
    const data = CUSTOM_TABS.map(t => {
      const p = 'ct-' + t.id + '-';
      const fields = {};
      CT_FIELD_IDS.forEach(f => { const el = document.getElementById(p + f); if (el) fields[f] = el.value; });
      const checkboxes = {};
      CT_CB_IDS.forEach(f => { const el = document.getElementById(p + f); if (el) checkboxes[f] = el.checked; });
      return { id: t.id, name: t.name, templateDataUrl: t.templateDataUrl, fields, checkboxes };
    });
    localStorage.setItem(CT_STATE_KEY, JSON.stringify({ tabs: data, counter: _ctCounter }));
  } catch(e) {}
}

function loadCustomTabs() {
  try {
    const raw = localStorage.getItem(CT_STATE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.counter) _ctCounter = saved.counter;
    (saved.tabs || []).forEach(tData => {
      const tab = { id: tData.id, name: tData.name, templateDataUrl: tData.templateDataUrl, img: null };
      CUSTOM_TABS.push(tab);
      _addCustomTabToDOM(tab);
      // Restore field values
      const p = 'ct-' + tab.id + '-';
      if (tData.fields)    Object.entries(tData.fields).forEach(([f,v]) => { const el = document.getElementById(p+f); if(el) el.value = v; });
      if (tData.checkboxes) Object.entries(tData.checkboxes).forEach(([f,v]) => { const el = document.getElementById(p+f); if(el) el.checked = v; });
      // Restore slider display values
      CT_SLIDER_IDS.forEach(f => { const el = document.getElementById(p+f); const ve = document.getElementById(p+f+'-val'); if(el&&ve) ve.textContent = el.value; });
      // Reload template image
      if (tData.templateDataUrl) {
        const img = new Image();
        img.onload = () => { tab.img = img; document.getElementById('ct-'+tab.id+'-upload-prompt').style.display='none'; document.getElementById(p+'upload-badge').textContent='✓'; };
        img.src = tData.templateDataUrl;
      }
    });
  } catch(e) {}
}

// Modal handlers
function openNewTabModal() {
  const m = document.getElementById('new-tab-modal');
  m.style.display = 'flex';
  setTimeout(() => document.getElementById('new-tab-name').focus(), 50);
}
function closeNewTabModal() {
  document.getElementById('new-tab-modal').style.display = 'none';
  document.getElementById('new-tab-name').value = '';
}
function confirmNewTab() {
  const name = document.getElementById('new-tab-name').value.trim();
  if (!name) { document.getElementById('new-tab-name').focus(); return; }
  closeNewTabModal();
  addCustomTab(name);
}
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('new-tab-modal').style.display === 'flex') confirmNewTab();
  if (e.key === 'Escape' && document.getElementById('new-tab-modal').style.display === 'flex') closeNewTabModal();
});

// Populate all font selects on page load
function _initAllFontSelects() {
  const mainSelects = [
    ['ar-donor-font'],['ar-proj-font'],
    ['en-donor-font'],['en-proj-font'],
    ['org-donor-font'],['org-proj-font'],
    ['vk-donor-font'],['vk-proj-font'],
  ];
  mainSelects.forEach(([id]) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value || sel.options[0]?.value || 'Amiri';
    sel.innerHTML = '';
    FONT_OPTIONS.forEach(f => {
      const o = document.createElement('option');
      o.value = f.v; o.textContent = f.l;
      if (f.v === cur) o.selected = true;
      sel.appendChild(o);
    });
  });
}
// ── localStorage state persistence ──────────────────────────────────────────

const STATE_KEY = 'donor_cert_state_v1';

const STATE_FIELDS = [
  // text fields
  'ar-donor','ar-project','en-donor','en-project','org-donor','org-project','vk-donor','vk-project',
  // batch textarea
  'ar-batch-names','en-batch-names','org-batch-names','vk-batch-names',
  // font selects
  'ar-donor-font','ar-proj-font','en-donor-font','en-proj-font',
  'org-donor-font','org-proj-font','vk-donor-font','vk-proj-font',
  // size sliders
  'ar-donor-size','ar-proj-size','en-donor-size','en-proj-size',
  'org-donor-size','org-proj-size','vk-donor-size','vk-proj-size',
  // max-width sliders
  'org-donor-maxw','org-proj-maxw','vk-donor-maxw','vk-proj-maxw',
  // color pickers
  'org-donor-color','org-proj-color','vk-donor-color','vk-proj-color',
  // Y sliders
  'ar-donor-y','ar-proj-y','en-donor-y','en-proj-y',
  'org-donor-y','org-proj-y','vk-donor-y','vk-proj-y',
  // X sliders
  'ar-donor-x','ar-proj-x','en-donor-x','en-proj-x',
  'org-donor-x','org-proj-x','vk-donor-x','vk-proj-x',
];

const STATE_CHECKBOXES = [
  'ar-donor-enabled','ar-proj-enabled','en-donor-enabled','en-proj-enabled',
  'org-donor-enabled','org-proj-enabled','vk-donor-enabled','vk-proj-enabled',
  'ar-donor-auto','ar-proj-auto','en-donor-auto','en-proj-auto',
  'org-donor-auto','org-proj-auto','vk-donor-auto','vk-proj-auto',
];

function saveState() {
  try {
    // Snapshot current org slot before saving
    _saveOrgSlotToMemory(ORG_ACTIVE_SLOT);
    const state = { fields: {}, checkboxes: {}, orgSlot: ORG_ACTIVE_SLOT, orgSlotSettings: ORG_SLOT_SETTINGS, vkTemplateMode: VK_TEMPLATE_MODE };
    STATE_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) state.fields[id] = el.value;
    });
    STATE_CHECKBOXES.forEach(id => {
      const el = document.getElementById(id);
      if (el) state.checkboxes[id] = el.checked;
    });
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);

    // Restore per-slot org settings first
    if (state.orgSlotSettings) {
      ['stk','ummetin','kayra','custom'].forEach(slot => {
        if (state.orgSlotSettings[slot]) ORG_SLOT_SETTINGS[slot] = state.orgSlotSettings[slot];
      });
    }

    // Restore non-org fields
    if (state.fields) {
      Object.entries(state.fields).forEach(([id, val]) => {
        if (id.startsWith('org-')) return; // handled per-slot below
        const el = document.getElementById(id);
        if (el) el.value = val;
      });
    }
    if (state.checkboxes) {
      Object.entries(state.checkboxes).forEach(([id, val]) => {
        if (id.startsWith('org-')) return;
        const el = document.getElementById(id);
        if (el) el.checked = val;
      });
    }

    // Update displayed slider values for non-org tabs
    STATE_FIELDS.forEach(id => {
      if (id.startsWith('org-')) return;
      if (!id.endsWith('-size') && !id.endsWith('-y') && !id.endsWith('-x')) return;
      const el = document.getElementById(id);
      const valEl = document.getElementById(id + '-val');
      if (el && valEl) valEl.textContent = el.value;
    });

    // Restore VK template mode
    if (state.vkTemplateMode) setVKTemplate(state.vkTemplateMode);

    // Activate saved org slot (loads its settings into UI)
    const savedSlot = state.orgSlot || 'custom';
    ORG_ACTIVE_SLOT = savedSlot;
    document.querySelectorAll('.org-slot-btn').forEach(b => b.classList.remove('org-slot-active'));
    const btn = document.getElementById(`org-slot-${savedSlot}`);
    if (btn) btn.classList.add('org-slot-active');
    _loadOrgSlotFromMemory(savedSlot);
  } catch(e) {}
}

// Hook save into all inputs/selects after DOM is ready
function _hookStateSave() {
  STATE_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', saveState);
    if (el) el.addEventListener('change', saveState);
  });
  STATE_CHECKBOXES.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', saveState);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  _initAllFontSelects();
  loadState();
  _hookStateSave();
  _hideVKPromptIfReady();
  loadCustomTabs();
  // Sync color-val display on any color input change
  document.addEventListener('input', e => {
    if (e.target.type === 'color') {
      const valEl = document.getElementById(e.target.id + '-val');
      if (valEl) valEl.textContent = e.target.value;
    }
  });
});

// Close batch preview modal when clicking backdrop
document.addEventListener('click', function(e) {
  const modal = document.getElementById('batch-preview-modal');
  if (e.target === modal) closeBatchPreview();
});

// ── HISTORY SYSTEM ────────────────────────────────────────────────────────────

const HIST_KEY      = 'donor_cert_history_v2';
const HIST_MAX      = 50;
let   _hist         = [];

function _histLoad() {
  try { _hist = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch(e) { _hist = []; }
}

function _histSave() {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(_hist.slice(0, HIST_MAX))); } catch(e) {}
}

function _histTabLabel(tabId) {
  if (tabId === 'orgs')  return '🏢 الجهات';
  if (tabId === 'vacip') return '🐑 الأضاحي';
  const ct = CUSTOM_TABS.find(t => t.id === tabId);
  return ct ? '📋 ' + ct.name : tabId;
}

// Save a single-certificate history entry
function histSaveSingle(lang, donor, project, settings) {
  const tabId = lang.startsWith('ct-') ? lang.slice(3) : lang;
  _hist.unshift({
    id:        Date.now() + '_' + Math.random().toString(36).slice(2,6),
    type:      'single',
    tabId,
    tabLabel:  _histTabLabel(tabId),
    ts:        Date.now(),
    donor,
    project,
    settings:  JSON.parse(JSON.stringify(settings || {})),
  });
  _histSave();
}

// Save a batch history entry (full entries array with per-card settings)
function histSaveBatch(lang, entries) {
  const tabId = lang.startsWith('ct-') ? lang.slice(3) : lang;
  _hist.unshift({
    id:        Date.now() + '_' + Math.random().toString(36).slice(2,6),
    type:      'batch',
    tabId,
    tabLabel:  _histTabLabel(tabId),
    ts:        Date.now(),
    count:     entries.length,
    entries:   JSON.parse(JSON.stringify(entries)),
    lang,
  });
  _histSave();
}

// Restore a single entry into the tab's form fields and re-render
function histRestoreSingle(entry) {
  closeHistoryModal();
  const tabId  = entry.tabId;
  const lang   = tabId;
  const isOrgs = tabId === 'orgs';
  const isVK   = tabId === 'vacip';
  const isCT   = !isOrgs && !isVK;

  // Switch to the correct tab
  const btn = document.getElementById('tabBtn-' + tabId);
  if (btn) switchTab(tabId, btn);

  const prefix = isOrgs ? 'org' : isVK ? 'vk' : 'ct-' + tabId + '-';
  const pid    = id => isCT ? 'ct-' + tabId + '-' + id : prefix + '-' + id;

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) { el.value = val; } };
  const setCB  = (id, val) => { const el = document.getElementById(id); if (el) { el.checked = val; } };
  const setDisp = (id, val) => { const el = document.getElementById(id + '-val'); if (el) el.textContent = val; };

  setVal(pid('donor'),      entry.donor);
  setVal(pid('project'),    entry.project);

  const s = entry.settings || {};
  if (s.donorFont)    setVal(pid('donor-font'),    s.donorFont);
  if (s.projFont)     setVal(pid('proj-font'),     s.projFont);
  if (s.donorSize)  { setVal(pid('donor-size'),    s.donorSize);  setDisp(pid('donor-size'),  s.donorSize); }
  if (s.projSize)   { setVal(pid('proj-size'),     s.projSize);   setDisp(pid('proj-size'),   s.projSize); }
  if (s.donorY)     { setVal(pid('donor-y'),       s.donorY);     setDisp(pid('donor-y'),     s.donorY); }
  if (s.projY)      { setVal(pid('proj-y'),        s.projY);      setDisp(pid('proj-y'),      s.projY); }
  if (s.donorX)     { setVal(pid('donor-x'),       s.donorX);     setDisp(pid('donor-x'),     s.donorX); }
  if (s.projX)      { setVal(pid('proj-x'),        s.projX);      setDisp(pid('proj-x'),      s.projX); }
  if (s.donorMaxW)  { setVal(pid('donor-maxw'),    s.donorMaxW);  setDisp(pid('donor-maxw'),  s.donorMaxW); }
  if (s.projMaxW)   { setVal(pid('proj-maxw'),     s.projMaxW);   setDisp(pid('proj-maxw'),   s.projMaxW); }
  if (s.donorAuto   !== undefined) setCB(pid('donor-auto'),    s.donorAuto);
  if (s.projAuto    !== undefined) setCB(pid('proj-auto'),     s.projAuto);
  if (s.donorEnabled !== undefined) setCB(pid('donor-enabled'), s.donorEnabled);
  if (s.projEnabled  !== undefined) setCB(pid('proj-enabled'),  s.projEnabled);

  // Re-render
  setTimeout(() => {
    if (isOrgs)  renderOrgs();
    else if (isVK) renderVacip();
    else           _ctRender(tabId);
  }, 80);
}

// Restore a batch entry — reloads _pendingBatch and opens preview
function histRestoreBatch(entry) {
  closeHistoryModal();
  const tabId = entry.tabId;
  const btn   = document.getElementById('tabBtn-' + tabId);
  if (btn) switchTab(tabId, btn);

  // Determine img
  let img = null;
  if (tabId === 'orgs')  img = ORG_IMG;
  else if (tabId === 'vacip') img = VK_TR_IMG || VK_AR_IMG;
  else { const ct = CUSTOM_TABS.find(t => t.id === tabId); img = ct ? ct.img : null; }

  if (!img || !img.naturalWidth) {
    alert('القالب غير محمّل، يرجى رفع القالب أولاً ثم استعادة السجل'); return;
  }

  const prefix = tabId === 'orgs' ? 'org' : tabId === 'vacip' ? 'vk' : 'ct-' + tabId;
  _pendingBatch = { lang: entry.lang || tabId, prefix, entries: JSON.parse(JSON.stringify(entry.entries)), img };
  openBatchPreviewGrid();
}

// Format timestamp
function _histFmtTime(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Open history modal
function openHistoryModal(filterTabId) {
  _histLoad();
  const modal = document.getElementById('history-modal');
  modal.style.display = 'flex';

  const list = document.getElementById('history-list');
  const filtered = filterTabId ? _hist.filter(e => e.tabId === filterTabId) : _hist;

  if (filtered.length === 0) {
    list.innerHTML = `<div style="text-align:center;color:#556688;padding:40px 20px;font-size:14px;">لا يوجد سجل بعد<br><span style="font-size:11px;">يُحفظ تلقائياً عند التحميل</span></div>`;
    return;
  }

  list.innerHTML = filtered.map(e => {
    const icon     = e.type === 'batch' ? '⚡' : '👤';
    const title    = e.type === 'batch'
      ? `${e.count} اسم — إنتاج جماعي`
      : (e.donor || '—');
    const subtitle = e.type === 'single' && e.project ? `<div style="font-size:11px;color:#7a8fa8;margin-top:2px;">${e.project}</div>` : '';
    const tabBadge = filterTabId ? '' : `<span style="font-size:10px;background:rgba(200,164,90,0.15);color:#c8a45a;padding:2px 7px;border-radius:10px;margin-bottom:4px;display:inline-block;">${e.tabLabel}</span><br>`;
    return `
    <div class="hist-entry" onclick="histRestore('${e.id}')">
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <div style="font-size:22px;flex-shrink:0;margin-top:2px;">${icon}</div>
        <div style="flex:1;min-width:0;">
          ${tabBadge}
          <div style="font-size:13px;color:#e8e8e8;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
          ${subtitle}
          <div style="font-size:11px;color:#556688;margin-top:4px;">${_histFmtTime(e.ts)}</div>
        </div>
        <button onclick="event.stopPropagation();histDelete('${e.id}')" style="background:none;border:none;color:#556688;cursor:pointer;font-size:14px;padding:2px 4px;flex-shrink:0;" title="حذف">✕</button>
      </div>
    </div>`;
  }).join('');

  // Store current filter
  modal.dataset.filter = filterTabId || '';
}

function histRestore(id) {
  const entry = _hist.find(e => e.id === id);
  if (!entry) return;
  if (entry.type === 'single') histRestoreSingle(entry);
  else histRestoreBatch(entry);
}

function histDelete(id) {
  _hist = _hist.filter(e => e.id !== id);
  _histSave();
  const modal = document.getElementById('history-modal');
  openHistoryModal(modal.dataset.filter || undefined);
}

function closeHistoryModal() {
  document.getElementById('history-modal').style.display = 'none';
}

// Build history modal HTML (called once on page load)
function _buildHistoryModal() {
  const div = document.createElement('div');
  div.id = 'history-modal';
  div.style.cssText = 'display:none;position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.75);align-items:flex-start;justify-content:flex-end;';
  div.innerHTML = `
  <div style="background:#1a2a4a;width:360px;max-width:100vw;height:100vh;overflow-y:auto;border-left:1px solid rgba(200,164,90,0.35);display:flex;flex-direction:column;">
    <div style="background:linear-gradient(90deg,#29407d,#1e2f5a);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #c8a45a;flex-shrink:0;">
      <div style="font-family:'Amiri',serif;font-size:17px;color:#f0d98a;">🕐 سجل العمليات</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button onclick="histClearAll()" style="background:rgba(220,60,60,0.15);border:1px solid rgba(220,60,60,0.3);color:#e07070;font-family:'Cairo',sans-serif;font-size:11px;padding:4px 10px;border-radius:6px;cursor:pointer;">مسح الكل</button>
        <button onclick="closeHistoryModal()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#e8e8e8;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px;">✕</button>
      </div>
    </div>
    <div id="history-list" style="flex:1;padding:12px;display:flex;flex-direction:column;gap:8px;"></div>
  </div>`;
  div.addEventListener('click', e => { if (e.target === div) closeHistoryModal(); });
  document.body.appendChild(div);
}

function histClearAll() {
  const modal = document.getElementById('history-modal');
  const filter = modal.dataset.filter;
  if (filter) _hist = _hist.filter(e => e.tabId !== filter);
  else _hist = [];
  _histSave();
  openHistoryModal(filter || undefined);
}

document.addEventListener('DOMContentLoaded', () => {
  _histLoad();
  _buildHistoryModal();
});

