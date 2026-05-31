// ── app.js — Thin UI coordinator ─────────────────────────────────────────────
// Depends on: js/domain.js, js/infrastructure.js (loaded before this file)

// ── Layer accessors (safe lazy references — avoids top-level crash if a script fails to load) ──
// domain.js declares these as global function declarations:
//   _resolveTextDirection, _calcSize, buildMultiPagePDF, canvasToJpegBase64, CertificateSettings
// infrastructure.js declares fixImageOrientation as a global function declaration.
// CanvasRenderer / TemplateStorage / Exporter are const in infrastructure.js,
// exposed via window.Infrastructure — always access them as Infrastructure.*
function _getInfra() { return window.Infrastructure || {}; }
function _getDomain() { return window.DomainLayer || {}; }

// ── Template image globals ────────────────────────────────────────────────────
const AR_IMG = new Image();
AR_IMG.src = '/template_arabic.png.jpg';

// Stub for legacy English tab
let EN_IMG = null;

let VK_AR_IMG     = null;
let VK_TR_IMG     = null;
let VK_SADAKA_IMG = null;
let VK_NAFILE_IMG = null;

const VK_AR_IMG_STATIC = new Image();
VK_AR_IMG_STATIC.src = '/template_arabic.png.jpg';
VK_AR_IMG_STATIC.onload = function() { VK_AR_IMG = VK_AR_IMG_STATIC; _hideVKPromptIfReady(); };

const VK_TR_IMG_STATIC = new Image();
VK_TR_IMG_STATIC.src = '/template_turkish.png.jpg';
VK_TR_IMG_STATIC.onload = function() { VK_TR_IMG = VK_TR_IMG_STATIC; _hideVKPromptIfReady(); };

const VK_SADAKA_IMG_STATIC = new Image();
VK_SADAKA_IMG_STATIC.src = '/SADAKA.jpg';
VK_SADAKA_IMG_STATIC.onload = function() { VK_SADAKA_IMG = VK_SADAKA_IMG_STATIC; _hideVKPromptIfReady(); };

const VK_NAFILE_IMG_STATIC = new Image();
VK_NAFILE_IMG_STATIC.src = '/nafile.jpg';
VK_NAFILE_IMG_STATIC.onload = function() { VK_NAFILE_IMG = VK_NAFILE_IMG_STATIC; _hideVKPromptIfReady(); };

// ── Org slot images ───────────────────────────────────────────────────────────
const ORG_IMGS = { stk: null, ummetin: null, kayra: null, custom: null };
let ORG_ACTIVE_SLOT = 'custom';

const ORG_STK_IMG_STATIC    = new Image(); ORG_STK_IMG_STATIC.src    = '/STK.jpg';
const ORG_UMMETIN_IMG_STATIC = new Image(); ORG_UMMETIN_IMG_STATIC.src = '/UMMETIN.jpg';
const ORG_KAYRA_IMG_STATIC  = new Image(); ORG_KAYRA_IMG_STATIC.src  = '/KAYRA.jpg';

ORG_STK_IMG_STATIC.onload    = function() { ORG_IMGS.stk    = ORG_STK_IMG_STATIC;    const b = document.getElementById('org-status-stk');    if (b) b.textContent = '✓'; };
ORG_UMMETIN_IMG_STATIC.onload = function() { ORG_IMGS.ummetin = ORG_UMMETIN_IMG_STATIC; const b = document.getElementById('org-status-ummetin'); if (b) b.textContent = '✓'; };
ORG_KAYRA_IMG_STATIC.onload  = function() { ORG_IMGS.kayra  = ORG_KAYRA_IMG_STATIC;  const b = document.getElementById('org-status-kayra');  if (b) b.textContent = '✓'; };

// Virtual ORG_IMG getter (legacy support)
Object.defineProperty(window, 'ORG_IMG', {
  get: () => ORG_IMGS[ORG_ACTIVE_SLOT],
});

// ── Layout constants ──────────────────────────────────────────────────────────
const IMG_W = 1754;
const IMG_H = 1241;
const VERT_W = 1240;
const VERT_H = 1653;
const LEFT_MARGIN  = 120;
const RIGHT_MARGIN = 120;
const USABLE_W = IMG_W - LEFT_MARGIN - RIGHT_MARGIN;

const BANNER_Y_START  = 710;
const BANNER_Y_END    = 974;
const BANNER_CENTER_Y = (710 + 974) / 2;
const DONOR_CENTER_Y  = 590;

// ── Vert template list ────────────────────────────────────────────────────────
let VERT_IMG_LIST  = [];
let VERT_ACTIVE_IDX = 0;

const VERT_STATIC_PRESETS = [
  { src: '/guzeleser.png',     name: 'Güzel Eser - Vacip' },
  { src: '/guzeleserar.png',   name: 'گوزل إيسر - الأضاحي' },
  { src: '/guzelsadaka.png',   name: 'Güzel Eser - Sadaka' },
  { src: '/guzelnafile.png',   name: 'Güzel Eser - Nafile' },
  { src: '/stk.png',           name: 'STK - Vacip' },
  { src: '/kayra.png',         name: 'KAYRA - Vacip' },
  { src: '/ummetin_abisi.png', name: 'Ümmetin Abisi - Vacip' },
];

function _loadVertStaticPresets(callback) {
  let done = 0;
  const results = [];
  VERT_STATIC_PRESETS.forEach(function(preset, i) {
    const img = new Image();
    img.onload = function() {
      results[i] = { img, name: preset.name, dataUrl: preset.src, isStatic: true };
      done++;
      if (done === VERT_STATIC_PRESETS.length) callback(results.filter(Boolean));
    };
    img.onerror = function() {
      done++;
      if (done === VERT_STATIC_PRESETS.length) callback(results.filter(Boolean));
    };
    img.src = preset.src;
  });
}

function _getActiveVertTemplate() {
  return VERT_IMG_LIST.length > 0 ? VERT_IMG_LIST[VERT_ACTIVE_IDX] : null;
}

function _getVertTemplateName(fileName) {
  const name = (fileName || '').replace(/(?:\.(?:png|jpe?g|webp|gif|bmp))+$/i, '').trim();
  return name || 'template';
}

async function saveVertTemplates() {
  if (!window.indexedDB) return;
  try {
    const userTemplates = VERT_IMG_LIST.filter(t => !t.isStatic);
    const staticCount   = VERT_IMG_LIST.length - userTemplates.length;
    const activeUserIdx = Math.max(0, VERT_ACTIVE_IDX - staticCount);
    await Infrastructure.TemplateStorage.save(userTemplates, activeUserIdx);
  } catch (e) {
    console.warn('saveVertTemplates failed', e);
  }
}

async function loadVertTemplates() {
  // Load static presets first
  await new Promise(resolve => {
    _loadVertStaticPresets(function(presets) {
      const userUploaded = VERT_IMG_LIST.filter(t => !t.isStatic);
      VERT_IMG_LIST = [...presets, ...userUploaded];
      resolve();
    });
  });

  // Restore user-uploaded from IndexedDB
  if (!window.indexedDB) {
    updateVertTemplatesList();
    if (VERT_IMG_LIST.length > 0) renderVert();
    return;
  }
  try {
    const stored = await Infrastructure.TemplateStorage.load();
    if (stored && Array.isArray(stored.templates) && stored.templates.length) {
      const userTemplates = await Promise.all(stored.templates.map(template => new Promise(resolve => {
        const img = new Image();
        img.onload  = function() { resolve({ img, name: template.name || 'template', dataUrl: template.dataUrl }); };
        img.onerror = function() { resolve(null); };
        img.src = template.dataUrl;
      })));
      const staticPresets = VERT_IMG_LIST.filter(t => t.isStatic);
      VERT_IMG_LIST = [...staticPresets, ...userTemplates.filter(Boolean)];
      const savedIdx = Number(stored.activeIdx) || 0;
      VERT_ACTIVE_IDX = Math.min(
        staticPresets.length + savedIdx,
        Math.max(0, VERT_IMG_LIST.length - 1)
      );
    }
  } catch (e) {
    console.warn('loadVertTemplates failed', e);
  }
  updateVertTemplatesList();
  if (VERT_IMG_LIST.length > 0) renderVert();
}

// ── Vacip template mode ───────────────────────────────────────────────────────
let VK_TEMPLATE_MODE = 'auto';

function _hideVKPromptIfReady() {
  if ((VK_AR_IMG && VK_AR_IMG.naturalWidth) || (VK_TR_IMG && VK_TR_IMG.naturalWidth) ||
      (VK_SADAKA_IMG && VK_SADAKA_IMG.naturalWidth) || (VK_NAFILE_IMG && VK_NAFILE_IMG.naturalWidth)) {
    const prompt = document.getElementById('vk-upload-prompt');
    if (prompt) prompt.style.display = 'none';
    _updateVKStatus();
  }
}

function _updateVKStatus() {
  const hasTR = VK_TR_IMG && VK_TR_IMG.naturalWidth;
  const hasAR = VK_AR_IMG && VK_AR_IMG.naturalWidth;
  const tr = document.getElementById('vk-upload-tr-badge');
  const ar = document.getElementById('vk-upload-ar-badge');
  if (tr) tr.textContent = hasTR ? '✓' : '—';
  if (ar) ar.textContent = hasAR ? '✓' : '—';
}

function _isArabic(text) {
  return /[؀-ۿ]/.test(text);
}

function setVKTemplate(mode) {
  VK_TEMPLATE_MODE = mode;
  ['auto','arabic','turkish','sadaka','nafile'].forEach(m => {
    const btn = document.getElementById('vk-tpl-' + m);
    if (btn) btn.classList.toggle('vk-tpl-active', m === mode);
  });
  renderVacip();
  if (typeof saveState === 'function') saveState();
}

function _getVKImg(donorText) {
  if (VK_TEMPLATE_MODE === 'arabic')  return VK_AR_IMG;
  if (VK_TEMPLATE_MODE === 'turkish') return VK_TR_IMG;
  if (VK_TEMPLATE_MODE === 'sadaka')  return VK_SADAKA_IMG;
  if (VK_TEMPLATE_MODE === 'nafile')  return VK_NAFILE_IMG;
  return _isArabic(donorText) ? VK_AR_IMG : VK_TR_IMG;
}

// ── Org slot per-slot settings ────────────────────────────────────────────────
const ORG_SLOT_FIELD_IDS = [
  'org-donor','org-project','org-batch-names','org-batch-group-size',
  'org-donor-font','org-proj-font','org-donor-dir','org-proj-dir','org-donor-align','org-proj-align',
  'org-donor-size','org-proj-size',
  'org-donor-y','org-proj-y',
  'org-donor-x','org-proj-x',
];
const ORG_SLOT_CHECKBOX_IDS = [
  'org-donor-enabled','org-proj-enabled',
  'org-donor-auto','org-proj-auto',
];
const ORG_SLOT_DEFAULTS = {
  'org-donor': '', 'org-project': '', 'org-batch-names': '', 'org-batch-group-size': '1',
  'org-donor-font': 'Amiri', 'org-proj-font': 'Amiri',
  'org-donor-dir': 'rtl', 'org-proj-dir': 'rtl',
  'org-donor-align': 'center', 'org-proj-align': 'center',
  'org-donor-size': '64', 'org-proj-size': '72',
  'org-donor-y': '590', 'org-proj-y': '842',
  'org-donor-x': '877', 'org-proj-x': '877',
};
const ORG_SLOT_CHECKBOX_DEFAULTS = {
  'org-donor-enabled': true, 'org-proj-enabled': true,
  'org-donor-auto': true, 'org-proj-auto': true,
};
const ORG_SLOT_SETTINGS = { stk: null, ummetin: null, kayra: null, custom: null };

function _saveOrgSlotToMemory(slot) {
  const snapshot = { fields: {}, checkboxes: {} };
  ORG_SLOT_FIELD_IDS.forEach(id => { const el = document.getElementById(id); if (el) snapshot.fields[id] = el.value; });
  ORG_SLOT_CHECKBOX_IDS.forEach(id => { const el = document.getElementById(id); if (el) snapshot.checkboxes[id] = el.checked; });
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
  ['org-donor-size','org-proj-size','org-donor-y','org-proj-y','org-donor-x','org-proj-x'].forEach(id => {
    const el   = document.getElementById(id);
    const valEl = document.getElementById(id + '-val');
    if (el && valEl) valEl.textContent = el.value;
  });
}

function selectOrgSlot(slot) {
  _saveOrgSlotToMemory(ORG_ACTIVE_SLOT);
  ORG_ACTIVE_SLOT = slot;
  document.querySelectorAll('.org-slot-btn').forEach(b => b.classList.remove('org-slot-active'));
  const btn = document.getElementById('org-slot-' + slot);
  if (btn) btn.classList.add('org-slot-active');
  _loadOrgSlotFromMemory(slot);
  renderOrgs();
  if (typeof saveState === 'function') saveState();
}

// ── Font and direction helpers (DOM-bound) ────────────────────────────────────
function getFont(lang, field) {
  const el = document.getElementById(`${lang}-${field}-font`);
  return el ? el.value : 'Amiri';
}

function _fieldEnabled(lang, field) {
  const el = document.getElementById(`${lang}-${field}-enabled`);
  return el ? el.checked : true;
}

function getDirection(lang, field, text) {
  const el = document.getElementById(`${lang}-${field}-dir`);
  return _resolveTextDirection(el ? el.value : 'rtl', text);
}

function getAlignment(lang, field) {
  const el = document.getElementById(`${lang}-${field}-align`);
  return el ? el.value : 'center';
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
  }
  return parseInt(document.getElementById(`${lang}-${field}-size`).value);
}

function toggleAuto(lang, field) {
  const autoId  = `${lang}-${field}-auto`;
  const sliderId = `${lang}-${field}-size`;
  const slider  = document.getElementById(sliderId);
  const isAuto  = document.getElementById(autoId).checked;
  slider.disabled = isAuto;
  slider.style.opacity = isAuto ? '0.4' : '1';
  if (lang === 'ar' || lang === 'ar-donor' || lang === 'ar-proj') renderArabic();
  else if (lang === 'en') renderEnglish();
  else if (lang === 'vt') renderVert();
  else if (lang === 'vk') renderVacip();
  else if (lang.startsWith('ct-')) _ctRender(lang.slice(3));
  else renderOrgs();
}

// ── Settings resolver ─────────────────────────────────────────────────────────
function _resolveSettings(lang, s) {
  const g   = (id) => document.getElementById(id);
  const gv  = (id, def) => { const el = g(id); return el ? parseInt(el.value) : def; };
  const enabledEl = (id) => { const el = g(id); return el ? el.checked : true; };

  const defaults = (typeof CertificateSettings === 'function') ? CertificateSettings() : {};

  return {
    donorFont    : s?.donorFont    ?? getFont(lang, 'donor'),
    projFont     : s?.projFont     ?? getFont(lang, 'proj'),
    donorX       : s?.donorX       ?? gv(`${lang}-donor-x`,   defaults.donorX),
    donorY       : s?.donorY       ?? gv(`${lang}-donor-y`,   defaults.donorY),
    projX        : s?.projX        ?? gv(`${lang}-proj-x`,    defaults.projX),
    projY        : s?.projY        ?? gv(`${lang}-proj-y`,    defaults.projY),
    donorSize    : s?.donorSize    ?? gv(`${lang}-donor-size`, defaults.donorSize),
    projSize     : s?.projSize     ?? gv(`${lang}-proj-size`,  defaults.projSize),
    donorAuto    : s?.donorAuto    ?? (g(`${lang}-donor-auto`) ? g(`${lang}-donor-auto`).checked : true),
    projAuto     : s?.projAuto     ?? (g(`${lang}-proj-auto`)  ? g(`${lang}-proj-auto`).checked  : true),
    donorEnabled : s?.donorEnabled ?? enabledEl(`${lang}-donor-enabled`),
    projEnabled  : s?.projEnabled  ?? enabledEl(`${lang}-proj-enabled`),
    donorMaxW    : s?.donorMaxW    ?? gv(`${lang}-donor-maxw`, defaults.donorMaxW),
    projMaxW     : s?.projMaxW     ?? gv(`${lang}-proj-maxw`,  defaults.projMaxW),
    donorColor   : s?.donorColor   ?? ((g(`${lang}-donor-color`) || {}).value || defaults.donorColor),
    projColor    : s?.projColor    ?? ((g(`${lang}-proj-color`)  || {}).value || defaults.projColor),
    donorDir     : s?.donorDir     ?? ((g(`${lang}-donor-dir`)   || {}).value || defaults.donorDir),
    projDir      : s?.projDir      ?? ((g(`${lang}-proj-dir`)    || {}).value || defaults.projDir),
    donorAlign   : s?.donorAlign   ?? ((g(`${lang}-donor-align`) || {}).value || defaults.donorAlign),
    projAlign    : s?.projAlign    ?? ((g(`${lang}-proj-align`)  || {}).value || defaults.projAlign),
    donorLineH   : s?.donorLineH   ?? gv(`${lang}-donor-lineh`, defaults.donorLineH),
  };
}

// ── drawCertTextDirect — calls CanvasRenderer ─────────────────────────────────
function drawCertTextDirect(ctx, donorText, projectText, lang, settings) {
  const s = _resolveSettings(lang, settings || null);
  Infrastructure.CanvasRenderer.drawText(ctx, donorText, projectText, s);
}

// Legacy drawCertText (kept for compatibility — called from renderArabic/renderEnglish)
function drawCertText(ctx, donorText, projectText, lang) {
  drawCertTextDirect(ctx, donorText, projectText, lang, null);
}

// ── Render functions ──────────────────────────────────────────────────────────
function renderOrgs() {
  const img = ORG_IMGS[ORG_ACTIVE_SLOT];
  if (!img || !img.complete || !img.naturalWidth) {
    document.getElementById('org-status').textContent = '⚠ ارفع قالباً للجهة المختارة أولاً';
    return;
  }
  const canvas = document.getElementById('canvas-orgs-offscreen');
  const ctx    = canvas.getContext('2d');
  const donor  = document.getElementById('org-donor').value   || 'اسم الجهة';
  const project= document.getElementById('org-project').value || 'اسم المشروع';
  ctx.clearRect(0, 0, IMG_W, IMG_H);
  ctx.drawImage(img, 0, 0, IMG_W, IMG_H);
  drawCertTextDirect(ctx, donor, project, 'org', null);
  document.getElementById('org-upload-prompt').style.display = 'none';
  const wrapper = document.getElementById('org-canvas-wrapper');
  if (wrapper) wrapper.style.display = 'block';
  document.getElementById('org-status').textContent = '✓ اللوحة جاهزة للتحميل';
}

function renderVacip() {
  const donor  = document.getElementById('vk-donor').value   || 'اسم المتبرع';
  const project= document.getElementById('vk-project').value || '';
  _hideVKPromptIfReady();
  const img = _getVKImg(donor);
  if (!img || !img.naturalWidth) {
    const needed = _isArabic(donor) ? 'القالب العربي' : 'القالب التركي';
    document.getElementById('vk-status').textContent = `⚠ يرجى رفع ${needed} أولاً`;
    return;
  }
  const canvas = document.getElementById('canvas-vacip');
  const ctx    = canvas.getContext('2d');
  ctx.clearRect(0, 0, IMG_W, IMG_H);
  ctx.drawImage(img, 0, 0, IMG_W, IMG_H);
  drawCertTextDirect(ctx, donor, project, 'vk', null);
  const wrapper = document.getElementById('vk-canvas-wrapper');
  if (wrapper.style.display === 'none') wrapper.style.display = 'block';
  document.getElementById('vk-status').textContent = '✓ اللوحة جاهزة للتحميل';
}

function renderVert() {
  const template = _getActiveVertTemplate();
  const img = template ? template.img : null;
  if (!img || !img.complete || !img.naturalWidth) {
    document.getElementById('vt-status').textContent = '⚠ ارفع قالباً أولاً';
    return;
  }
  const canvas  = document.getElementById('canvas-vert');
  const ctx     = canvas.getContext('2d');
  const donor   = document.getElementById('vt-donor').value   || 'اسم المتبرع';
  const project = document.getElementById('vt-project').value || 'اسم المشروع';
  ctx.clearRect(0, 0, VERT_W, VERT_H);
  ctx.drawImage(img, 0, 0, VERT_W, VERT_H);
  drawCertTextDirect(ctx, donor, project, 'vt', null);
  document.getElementById('vt-upload-prompt').style.display = 'none';
  const wrapper = document.getElementById('vt-canvas-wrapper');
  if (wrapper) wrapper.style.display = 'block';
  document.getElementById('vt-status').textContent = '✓ اللوحة جاهزة للتحميل';
}

// Stub implementations for Arabic/English tabs (no panel in current HTML)
function renderArabic() {
  const canvas = document.getElementById('canvas-arabic');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!AR_IMG || !AR_IMG.complete || !AR_IMG.naturalWidth) return;
  const donor   = (document.getElementById('ar-donor')   || {}).value || 'اسم المتبرع';
  const project = (document.getElementById('ar-project') || {}).value || 'اسم المشروع';
  ctx.clearRect(0, 0, IMG_W, IMG_H);
  ctx.drawImage(AR_IMG, 0, 0);
  drawCertText(ctx, donor, project, 'ar');
}

function renderEnglish() {
  if (!EN_IMG || !EN_IMG.complete || !EN_IMG.naturalWidth) return;
  const canvas = document.getElementById('canvas-english');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const donor   = (document.getElementById('en-donor')   || {}).value || 'اسم المتبرع';
  const project = (document.getElementById('en-project') || {}).value || 'اسم المشروع';
  ctx.clearRect(0, 0, IMG_W, IMG_H);
  ctx.drawImage(EN_IMG, 0, 0);
  drawCertText(ctx, donor, project, 'en');
}

// ── Template loaders ──────────────────────────────────────────────────────────
function loadVertTemplate(input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  let loaded = 0;
  files.forEach(function(file) {
    fixImageOrientation(file, function(dataUrl, img) {
      VERT_IMG_LIST.push({ img, name: _getVertTemplateName(file.name), dataUrl });
      loaded++;
      if (loaded === files.length) {
        VERT_ACTIVE_IDX = VERT_IMG_LIST.length - 1;
        updateVertTemplatesList();
        renderVert();
        saveVertTemplates();
      }
    });
  });
  input.value = '';
}

function updateVertTemplatesList() {
  const grid    = document.getElementById('vt-templates-grid');
  const listDiv = document.getElementById('vt-templates-list');
  if (!grid || !VERT_IMG_LIST.length) {
    if (listDiv) listDiv.style.display = 'none';
    const wrapper = document.getElementById('vt-canvas-wrapper');
    const prompt  = document.getElementById('vt-upload-prompt');
    if (wrapper) wrapper.style.display = 'none';
    if (prompt)  prompt.style.display  = 'flex';
    return;
  }
  listDiv.style.display = 'block';
  grid.innerHTML = '';
  VERT_IMG_LIST.forEach(function(template, idx) {
    const thumb = document.createElement('div');
    thumb.style.cssText = 'position:relative;cursor:pointer;border-radius:6px;overflow:hidden;border:2px solid ' +
      (idx === VERT_ACTIVE_IDX ? '#c8a45a' : 'rgba(200,164,90,0.3)') +
      ';width:55px;height:73px;flex-shrink:0;';
    thumb.title = template.name;
    const cv = document.createElement('canvas');
    cv.width = 55; cv.height = 73;
    cv.getContext('2d').drawImage(template.img, 0, 0, 55, 73);
    thumb.appendChild(cv);
    const lbl = document.createElement('div');
    lbl.textContent = template.name;
    lbl.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.55);color:#f0d98a;font-size:10px;text-align:center;padding:2px;font-family:Cairo,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    thumb.appendChild(lbl);
    const del = document.createElement('div');
    del.textContent = '✕';
    if (template.isStatic) {
      del.style.cssText = 'display:none;';
    } else {
      del.style.cssText = 'position:absolute;top:0;right:0;background:rgba(180,50,50,0.85);color:#fff;font-size:10px;padding:1px 4px;cursor:pointer;border-radius:0 0 0 4px;';
    }
    del.onclick = function(ev) {
      ev.stopPropagation();
      if (VERT_IMG_LIST[idx] && VERT_IMG_LIST[idx].isStatic) return;
      VERT_IMG_LIST.splice(idx, 1);
      if (VERT_ACTIVE_IDX >= VERT_IMG_LIST.length) VERT_ACTIVE_IDX = Math.max(0, VERT_IMG_LIST.length - 1);
      updateVertTemplatesList();
      if (VERT_IMG_LIST.length > 0) renderVert();
      saveVertTemplates();
    };
    thumb.appendChild(del);
    thumb.onclick = function() { VERT_ACTIVE_IDX = idx; updateVertTemplatesList(); renderVert(); saveVertTemplates(); };
    grid.appendChild(thumb);
  });
}

function loadVacipTemplate(input, type) {
  const file = input.files[0];
  if (!file) return;
  fixImageOrientation(file, function(dataUrl, img) {
    if (type === 'tr') VK_TR_IMG = img;
    else               VK_AR_IMG = img;
    _updateVKStatus();
    document.getElementById('vk-upload-prompt').style.display = 'none';
    renderVacip();
  });
}

function loadOrgTemplate(input, slot) {
  const file = input.files[0];
  if (!file) return;
  const s = slot || ORG_ACTIVE_SLOT;
  fixImageOrientation(file, function(dataUrl, img) {
    ORG_IMGS[s] = img;
    const badge = document.getElementById('org-status-' + s);
    if (badge) badge.textContent = '✓';
    selectOrgSlot(s);
  });
}

function loadEnglishTemplate(input) {
  const file = input.files[0];
  if (!file) return;
  fixImageOrientation(file, function(dataUrl, img) {
    EN_IMG = img;
    const prompt  = document.getElementById('en-upload-prompt');
    const wrapper = document.getElementById('en-canvas-wrapper');
    if (prompt)  prompt.style.display  = 'none';
    if (wrapper) wrapper.style.display = 'block';
    renderEnglish();
  });
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tab, btnEl) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const tabEl = document.getElementById('tab-' + tab);
  if (tabEl) tabEl.classList.add('active');
  const btn = btnEl || document.getElementById('tabBtn-' + tab);
  if (btn) btn.classList.add('active');
  updateBottomNav(tab);
  if (tab === 'orgs')       renderOrgs();
  else if (tab === 'vacip') renderVacip();
  else if (tab === 'vert')  renderVert();
  else                      _ctRender(tab);
}

function updateBottomNav(tabId) {
  document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('navBtn-' + tabId);
  if (btn) btn.classList.add('active');
}

// ── Preview toggle ────────────────────────────────────────────────────────────
function togglePreview(lang) {
  const prefixMap = { orgs: 'org', english: 'en', arabic: 'ar' };
  const prefix = prefixMap[lang] || lang;
  const wrapper = document.getElementById(prefix + '-canvas-wrapper');
  const btn     = document.getElementById(prefix + '-toggle');
  if (!wrapper) return;
  if (wrapper.style.display === 'none') {
    wrapper.style.display = 'block';
    if (btn) btn.textContent = '↑ إخفاء المعاينة';
    if (lang === 'arabic')  renderArabic();
    else if (lang === 'english') renderEnglish();
    else renderOrgs();
  } else {
    wrapper.style.display = 'none';
    if (btn) btn.textContent = '👁 إظهار المعاينة ↓';
  }
}

// ── File naming ───────────────────────────────────────────────────────────────
function _getTabLabel(lang) {
  if (lang === 'orgs')   return _getOrgSlotName();
  if (lang === 'vacip')  return 'Güzel Eser';
  if (lang === 'vert')   return 'قياس 3:4';
  if (lang.startsWith('ct-')) {
    const ct = CUSTOM_TABS.find(t => t.id === lang.slice(3));
    return ct ? ct.name : 'جهة';
  }
  return '';
}

function _getOrgSlotName() {
  if (ORG_ACTIVE_SLOT === 'stk')     return 'STK';
  if (ORG_ACTIVE_SLOT === 'ummetin') return 'ÜMMETİN ABİSİ';
  if (ORG_ACTIVE_SLOT === 'kayra')   return 'KAYRA';
  return 'الجهة';
}

function _sanitize(str) {
  return (str || '').trim().replace(/[\\/:"*?<>|]+/g, '').replace(/\s+/g, '_').substring(0, 60);
}

function _getVertExportName(number) {
  const template = _getActiveVertTemplate();
  const base = _sanitize(template ? template.name : '') || 'template';
  return `${base}_buyukbas-${number}`;
}

function getFileName(lang) {
  let donor = '';
  if (lang.startsWith('ct-')) {
    const el = document.getElementById('ct-' + lang.slice(3) + '-donor');
    donor = (el && el.value) || '';
  } else {
    const idMap = { orgs: 'org-donor', vacip: 'vk-donor', vert: 'vt-donor', arabic: 'ar-donor', english: 'en-donor' };
    const el = document.getElementById(idMap[lang] || 'ar-donor');
    donor = el ? el.value : '';
  }
  if (lang === 'vert') return _getVertExportName(1);
  const tabLabel = _getTabLabel(lang);
  const base = donor ? _sanitize(donor) + (tabLabel ? ' - ' + _sanitize(tabLabel) : '') : 'لوحة';
  return base || 'لوحة';
}

function getBatchFileName(lang, count) {
  if (lang === 'vert') return _getVertExportName(count);
  const tabLabel = _getTabLabel(lang) || 'إنتاج';
  return _sanitize(tabLabel) + '-' + count;
}

function getStatusEl(lang) {
  if (lang.startsWith('ct-')) return document.getElementById('ct-' + lang.slice(3) + '-status');
  const idMap = { arabic: 'ar-status', english: 'en-status', orgs: 'org-status', vacip: 'vk-status', vert: 'vt-status' };
  return document.getElementById(idMap[lang] || 'ar-status');
}

// ── Download / share ──────────────────────────────────────────────────────────
function downloadCert(lang, format) {
  // Save to history
  try {
    const tabId  = lang.startsWith('ct-') ? lang.slice(3) : lang;
    const isOrgs = lang === 'orgs', isVK = lang === 'vacip', isVert = lang === 'vert', isCT = lang.startsWith('ct-');
    const prefix = isOrgs ? 'org' : isVK ? 'vk' : isVert ? 'vt' : null;
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
        donorMaxW: parseInt(gv(pid('donor-maxw')) || 1400), projMaxW: parseInt(gv(pid('proj-maxw')) || 1400),
        donorDir: gv(pid('donor-dir')) || 'rtl', projDir: gv(pid('proj-dir')) || 'rtl',
        donorAlign: gv(pid('donor-align')) || 'center', projAlign: gv(pid('proj-align')) || 'center',
        donorAuto: gb(pid('donor-auto')), projAuto: gb(pid('proj-auto')),
        donorEnabled: gb(pid('donor-enabled')), projEnabled: gb(pid('proj-enabled')),
      };
      histSaveSingle(lang, donor, project, settings);
    }
  } catch (e) {}

  const canvasId = lang === 'english'     ? 'canvas-english' :
                   lang === 'orgs'        ? 'canvas-orgs-offscreen' :
                   lang === 'vacip'       ? 'canvas-vacip' :
                   lang === 'vert'        ? 'canvas-vert' :
                   lang.startsWith('ct-') ? 'canvas-ct-' + lang.slice(3) :
                                            'canvas-arabic';
  const canvas   = document.getElementById(canvasId);
  const name     = getFileName(lang);
  const statusEl = getStatusEl(lang);

  if (!canvas) { if (statusEl) statusEl.textContent = '❌ لا يوجد قالب للتحميل'; return; }

  if (format === 'pdf') {
    Infrastructure.Exporter.downloadPdf(canvas, name, statusEl);
  } else {
    Infrastructure.Exporter.downloadPng(canvas, name, statusEl);
  }
}

function shareWhatsapp(lang) {
  const canvasId = lang === 'english'     ? 'canvas-english' :
                   lang === 'orgs'        ? 'canvas-orgs-offscreen' :
                   lang === 'vacip'       ? 'canvas-vacip' :
                   lang === 'vert'        ? 'canvas-vert' :
                   lang.startsWith('ct-') ? 'canvas-ct-' + lang.slice(3) :
                                            'canvas-arabic';
  const canvas   = document.getElementById(canvasId);
  const name     = getFileName(lang);
  const statusEl = getStatusEl(lang);
  Infrastructure.Exporter.shareWhatsapp(canvas, name, statusEl);
}

// Keep legacy fallbackWhatsapp name working
function fallbackWhatsapp(canvas, name, statusEl) {
  Infrastructure.Exporter.fallback(canvas, name, statusEl);
}

// ── Batch ─────────────────────────────────────────────────────────────────────
const batchOpts = { vt: 'pdf', ar: 'pdf', en: 'pdf', org: 'pdf', vk: 'pdf' };

function selectBatchOpt(prefix, mode) {
  batchOpts[prefix] = mode;
  document.getElementById(`${prefix}-batch-opt-pdf`).classList.toggle('selected', mode === 'pdf');
  document.getElementById(`${prefix}-batch-opt-imgs`).classList.toggle('selected', mode === 'imgs');
}

function getBatchCanvas(lang) {
  const c = document.createElement('canvas');
  if (lang === 'vert') { c.width = VERT_W; c.height = VERT_H; }
  else { c.width = IMG_W; c.height = IMG_H; }
  return c;
}

function drawOnCanvas(canvas, name, project, lang, img, settings, forceImg) {
  const ctx = canvas.getContext('2d');
  const cW = lang === 'vert' ? VERT_W : IMG_W;
  const cH = lang === 'vert' ? VERT_H : IMG_H;
  ctx.clearRect(0, 0, cW, cH);
  const actualImg = forceImg || ((lang === 'vacip') ? (_getVKImg(name) || img) : img);
  if (!actualImg || !actualImg.naturalWidth) return;
  ctx.drawImage(actualImg, 0, 0, cW, cH);
  const l = lang === 'arabic' ? 'ar' : lang === 'english' ? 'en' : lang === 'vert' ? 'vt' : lang === 'vacip' ? 'vk' : 'org';
  drawCertTextDirect(ctx, name, project, l, settings);
}

let _pendingBatch  = null;
let _editingIndex  = null;
const THUMB_W = 480;

function _getBatchGroupSize(prefix) {
  const el    = document.getElementById(`${prefix}-batch-group-size`);
  const value = el ? parseInt(el.value, 10) : 1;
  return Number.isFinite(value) && value > 0 ? Math.min(value, 100) : 1;
}

function _groupBatchNames(names, prefix) {
  const size   = _getBatchGroupSize(prefix);
  const groups = [];
  for (let i = 0; i < names.length; i += size) {
    groups.push(names.slice(i, i + size).join('\n'));
  }
  return groups;
}

async function startBatch(lang) {
  if (lang.startsWith('ct-')) {
    const tabId = lang.slice(3);
    const tab   = CUSTOM_TABS.find(t => t.id === tabId);
    if (!tab || !tab.img || !tab.img.naturalWidth) { alert('يجب رفع القالب أولاً'); return; }
    const p = 'ct-' + tabId + '-';
    const namesRaw = (document.getElementById(p + 'batch-names') || {}).value || '';
    if (!namesRaw.trim()) { alert('أدخل أسماء أولاً'); return; }
    const defaultProject = (document.getElementById(p + 'project') || {}).value || '';
    const names = namesRaw.split('\n').map(n => n.trim()).filter(Boolean);
    const initSettings = _resolveSettings('ct-' + tabId, null);
    const entries = _groupBatchNames(names, p.slice(0, -1)).map(name => ({ name, project: defaultProject, settings: { ...initSettings } }));
    _pendingBatch = { lang, prefix: p.slice(0, -1), entries, img: tab.img };
    openBatchPreviewGrid();
    return;
  }

  const prefix = lang === 'arabic' ? 'ar' : lang === 'english' ? 'en' : lang === 'vacip' ? 'vk' : lang === 'vert' ? 'vt' : 'org';
  const namesRaw = document.getElementById(`${prefix}-batch-names`).value.trim();
  if (!namesRaw) { alert('أدخل أسماء أولاً'); return; }

  const projectEl = document.getElementById(
    lang === 'arabic' ? 'ar-project' : lang === 'english' ? 'en-project' :
    lang === 'vacip'  ? 'vk-project' : lang === 'vert'    ? 'vt-project' : 'org-project'
  );
  const defaultProject = projectEl.value || 'اسم المشروع';

  const img = lang === 'arabic'  ? AR_IMG :
              lang === 'english' ? EN_IMG :
              lang === 'vacip'   ? (_getVKImg((document.getElementById('vk-donor') || {}).value || '') || VK_TR_IMG || VK_AR_IMG || VK_SADAKA_IMG || VK_NAFILE_IMG) :
              lang === 'vert'    ? (_getActiveVertTemplate() || {}).img :
              ORG_IMG;

  if (lang === 'vacip' && !VK_TR_IMG && !VK_AR_IMG && !VK_SADAKA_IMG && !VK_NAFILE_IMG) { alert('يجب رفع قالب واحد على الأقل أولاً'); return; }
  if (lang !== 'vacip' && (!img || !img.naturalWidth)) { alert('يجب رفع القالب أولاً'); return; }

  const names = namesRaw.split('\n').map(n => n.trim()).filter(Boolean);
  if (!names.length) { alert('لا توجد أسماء صالحة'); return; }

  const initSettings = _resolveSettings(prefix, null);
  const entries = _groupBatchNames(names, prefix).map(name => ({ name, project: defaultProject, settings: { ...initSettings } }));
  _pendingBatch = { lang, prefix, entries, img };
  openBatchPreviewGrid();
}

function _entryForceImg(entry) {
  return (entry.templateOverride && entry.templateOverride.img) || null;
}

function _renderThumb(entry) {
  const { lang, img } = _pendingBatch;
  const c = getBatchCanvas(lang);
  drawOnCanvas(c, entry.name, entry.project, lang, img, entry.settings, _entryForceImg(entry));
  const thumb = document.createElement('canvas');
  const thumbH = Math.round(c.height * (THUMB_W / c.width));
  thumb.width = THUMB_W; thumb.height = thumbH;
  thumb.getContext('2d').drawImage(c, 0, 0, THUMB_W, thumbH);
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
  const grid  = document.getElementById('batch-preview-grid');

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

function _populateFontSelects() {
  ['batch-edit-donor-font','batch-edit-proj-font'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel || sel.options.length > 1) return;
    sel.innerHTML = '';
    DomainLayer.FONT_OPTIONS.forEach(f => {
      const o = document.createElement('option');
      o.value = f.v; o.textContent = f.l; sel.appendChild(o);
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

  _editVal('batch-edit-name').value    = entry.name;
  _editVal('batch-edit-project').value = entry.project;

  _setSelect('batch-edit-donor-font',  s.donorFont);
  _setSelect('batch-edit-proj-font',   s.projFont);
  _setSelect('batch-edit-donor-dir',   s.donorDir || 'rtl');
  _setSelect('batch-edit-proj-dir',    s.projDir  || 'rtl');
  _setSelect('batch-edit-donor-align', s.donorAlign || 'center');
  _setSelect('batch-edit-proj-align',  s.projAlign  || 'center');

  _setRange('batch-edit-donor-size', 'batch-edit-donor-size-val', s.donorSize);
  _setRange('batch-edit-proj-size',  'batch-edit-proj-size-val',  s.projSize);

  _editVal('batch-edit-donor-auto').checked  = s.donorAuto;
  _editVal('batch-edit-proj-auto').checked   = s.projAuto;
  _editVal('batch-edit-donor-size').disabled = s.donorAuto;
  _editVal('batch-edit-proj-size').disabled  = s.projAuto;
  const dEn = _editVal('batch-edit-donor-enabled');
  const pEn = _editVal('batch-edit-proj-enabled');
  if (dEn) dEn.checked = s.donorEnabled !== false;
  if (pEn) pEn.checked = s.projEnabled  !== false;

  _setRange('batch-edit-donor-lineh', 'batch-edit-donor-lineh-val', s.donorLineH || 0);
  _setRange('batch-edit-donor-x', 'batch-edit-donor-x-val', s.donorX);
  _setRange('batch-edit-donor-y', 'batch-edit-donor-y-val', s.donorY);
  _setRange('batch-edit-proj-x',  'batch-edit-proj-x-val',  s.projX);
  _setRange('batch-edit-proj-y',  'batch-edit-proj-y-val',  s.projY);

  _editVal('batch-edit-prev').disabled = index === 0;
  _editVal('batch-edit-next').disabled = index === entries.length - 1;

  _buildTplButtons(entry);
  requestAnimationFrame(() => refreshEditPreview());
}

function _buildTplButtons(entry) {
  const wrap = document.getElementById('batch-edit-tpl-btns');
  const cur  = document.getElementById('batch-edit-tpl-current');
  if (!wrap) return;
  wrap.innerHTML = '';

  const TEMPLATES = _pendingBatch.lang === 'vert' ? [
    { key: 'default', label: 'Default', img: null },
    ...VERT_IMG_LIST.map((template, idx) => ({ key: 'vert-' + idx, label: template.name, img: template.img })),
  ] : [
    { key: 'default',   label: '↩ افتراضي',           img: null },
    { key: 'stk',       label: 'STK',                  img: ORG_IMGS.stk },
    { key: 'ummetin',   label: 'ÜMMETİN ABİSİ',       img: ORG_IMGS.ummetin },
    { key: 'kayra',     label: 'KAYRA',                 img: ORG_IMGS.kayra },
    { key: 'vk-ar',     label: '🇾🇪 القربان — عربي',  img: VK_AR_IMG },
    { key: 'vk-tr',     label: '🇹🇷 القربان — تركي',  img: VK_TR_IMG },
    { key: 'vk-sadaka', label: '🟢 صدقة كربانى',        img: VK_SADAKA_IMG },
    { key: 'vk-nafile', label: '🔵 نافلة كربانى',       img: VK_NAFILE_IMG },
    ...CUSTOM_TABS.filter(t => t.img).map(t => ({ key: 'ct-' + t.id, label: t.name, img: t.img })),
  ];

  const activeKey = entry.templateOverride ? entry.templateOverride.key : 'default';

  TEMPLATES.forEach(tpl => {
    if (tpl.key !== 'default' && !tpl.img) return;
    const btn = document.createElement('button');
    btn.className = 'batch-tpl-btn' + (tpl.key === activeKey ? ' active' : '');
    btn.textContent = tpl.label;
    btn.onclick = () => {
      entry.templateOverride = tpl.key === 'default' ? null : { key: tpl.key, img: tpl.img, label: tpl.label };
      _buildTplButtons(entry);
      refreshEditPreview();
    };
    wrap.appendChild(btn);
  });

  cur.textContent = activeKey === 'default'
    ? 'القالب الافتراضي للدفعة'
    : `القالب: ${entry.templateOverride.label}`;
}

function _setSelect(id, val) {
  const el = _editVal(id);
  el.value = val;
  if (el.value !== val && el.options.length) el.value = el.options[0].value;
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
    donorDir     : _editVal('batch-edit-donor-dir').value,
    projDir      : _editVal('batch-edit-proj-dir').value,
    donorAlign   : _editVal('batch-edit-donor-align').value,
    projAlign    : _editVal('batch-edit-proj-align').value,
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
    donorLineH   : parseInt(_editVal('batch-edit-donor-lineh').value) || 0,
  };
}

function refreshEditPreview() {
  const nameVal = _editVal('batch-edit-name').value;
  const projVal = _editVal('batch-edit-project').value;
  const { lang } = _pendingBatch;
  const settings = _readEditSettings();
  const entry    = _pendingBatch.entries[_editingIndex];

  _editVal('batch-edit-donor-size').disabled = settings.donorAuto;
  _editVal('batch-edit-proj-size').disabled  = settings.projAuto;
  _editVal('batch-edit-donor-size').style.opacity = settings.donorAuto ? '0.4' : '1';
  _editVal('batch-edit-proj-size').style.opacity  = settings.projAuto  ? '0.4' : '1';

  const c = getBatchCanvas(lang);
  drawOnCanvas(c, nameVal, projVal, lang, _pendingBatch.img, settings, _entryForceImg(entry));

  const wrap    = document.getElementById('batch-edit-canvas-wrap');
  const preview = document.getElementById('batch-edit-canvas-preview');

  const isMobile = window.innerWidth <= 700;
  const fallbackW = isMobile ? (window.innerWidth - 24) : (window.innerWidth - 340);
  const availW = wrap.clientWidth > 10 ? wrap.clientWidth : fallbackW;
  const scale  = Math.min(1, (availW - 16) / c.width);
  const dispH  = Math.round(c.height * scale);

  wrap.style.height             = dispH + 'px';
  preview.style.transform       = `scale(${scale})`;
  preview.style.transformOrigin = 'top left';
  preview.width                 = c.width;
  preview.height                = c.height;
  preview.getContext('2d').drawImage(c, 0, 0);
}

function saveCardEdit() {
  const i        = _editingIndex;
  const nameVal  = _editVal('batch-edit-name').value.trim();
  const projVal  = _editVal('batch-edit-project').value.trim();
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
  const card = document.getElementById(`bcard-${_editingIndex}`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  _editingIndex = null;
}

function closeBatchPreview() {
  document.getElementById('batch-preview-modal').style.display = 'none';
  document.body.style.overflow = '';
  _pendingBatch  = null;
  _editingIndex  = null;
}

async function confirmBatchDownload() {
  if (!_pendingBatch) return;
  const { lang, prefix, entries, img } = _pendingBatch;
  try { histSaveBatch(lang, entries); } catch (e) {}
  closeBatchPreview();

  const mode       = batchOpts[prefix] || 'pdf';
  const progressEl = document.getElementById(`${prefix}-batch-progress`);
  const barEl      = document.getElementById(`${prefix}-batch-bar`);
  const textEl     = document.getElementById(`${prefix}-batch-text`);
  if (progressEl) progressEl.style.display = 'block';

  if (mode === 'pdf') {
    if (textEl) textEl.textContent = 'جارٍ بناء PDF...';
    const jpegDataList = [];

    for (let i = 0; i < entries.length; i++) {
      if (barEl) barEl.style.width = `${Math.round((i / entries.length) * 80)}%`;
      if (textEl) textEl.textContent = `معالجة ${i + 1} من ${entries.length}: ${entries[i].name}`;
      await new Promise(r => setTimeout(r, 10));

      const c = getBatchCanvas(lang);
      drawOnCanvas(c, entries[i].name, entries[i].project, lang, img, entries[i].settings, _entryForceImg(entries[i]));
      jpegDataList.push({ data: DomainLayer.canvasToJpegBase64(c), w: c.width, h: c.height });
    }

    if (barEl) barEl.style.width = '90%';
    if (textEl) textEl.textContent = 'جارٍ تجميع PDF...';
    await new Promise(r => setTimeout(r, 20));

    const pdfBytes = DomainLayer.buildMultiPagePDF(jpegDataList);
    if (barEl) barEl.style.width = '100%';
    if (textEl) textEl.textContent = `✓ تم — ${entries.length} لوحة في PDF واحد`;

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${getBatchFileName(lang, entries.length)}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

  } else {
    for (let i = 0; i < entries.length; i++) {
      if (barEl) barEl.style.width = `${Math.round(((i + 1) / entries.length) * 100)}%`;
      if (textEl) textEl.textContent = `تحميل ${i + 1} من ${entries.length}: ${entries[i].name}`;
      await new Promise(r => setTimeout(r, 50));

      const c = getBatchCanvas(lang);
      drawOnCanvas(c, entries[i].name, entries[i].project, lang, img, entries[i].settings, _entryForceImg(entries[i]));

      await new Promise(resolve => {
        c.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          const a   = document.createElement('a');
          a.href = url;
          a.download = lang === 'vert'
            ? `${_getVertExportName(i + 1)}.png`
            : `${_sanitize(entries[i].name)} - ${_sanitize(_getTabLabel(lang))}.png`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(() => { URL.revokeObjectURL(url); resolve(); }, 300);
        }, 'image/png');
      });
    }
    if (textEl) textEl.textContent = `✓ تم تحميل ${entries.length} صورة`;
  }
}

// ── Custom tabs ───────────────────────────────────────────────────────────────
const CT_STATE_KEY  = 'donor_cert_custom_tabs_v1';
let   CUSTOM_TABS   = [];
let   _ctCounter    = 0;

const CT_FIELD_IDS  = ['donor','project','batch-names','batch-group-size','donor-font','proj-font','donor-dir','proj-dir','donor-align','proj-align','donor-size','proj-size','donor-y','proj-y','donor-x','proj-x','donor-maxw','proj-maxw','donor-color','proj-color','donor-lineh'];
const CT_CB_IDS     = ['donor-enabled','proj-enabled','donor-auto','proj-auto'];
const CT_SLIDER_IDS = ['donor-size','proj-size','donor-y','proj-y','donor-x','proj-x'];

function _ctPrefix(id)        { return 'ct-' + id + '-'; }
function _ctFieldId(tabId, f) { return _ctPrefix(tabId) + f; }
function _ctEl(tabId, f)      { return document.getElementById(_ctFieldId(tabId, f)); }

function _ctSliders(tabId) {
  CT_SLIDER_IDS.forEach(f => {
    const el = _ctEl(tabId, f);
    const vEl = document.getElementById(_ctFieldId(tabId, f) + '-val');
    if (el && vEl) vEl.textContent = el.value;
  });
}

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

  const donor   = (_ctEl(tabId, 'donor')   || {}).value || '';
  const project = (_ctEl(tabId, 'project') || {}).value || '';

  const settings = {
    donorFont:    (_ctEl(tabId,'donor-font')    || {}).value || 'Amiri',
    projFont:     (_ctEl(tabId,'proj-font')     || {}).value || 'Amiri',
    donorDir:     (_ctEl(tabId,'donor-dir')     || {}).value || 'rtl',
    projDir:      (_ctEl(tabId,'proj-dir')      || {}).value || 'rtl',
    donorAlign:   (_ctEl(tabId,'donor-align')   || {}).value || 'center',
    projAlign:    (_ctEl(tabId,'proj-align')    || {}).value || 'center',
    donorSize:    parseInt((_ctEl(tabId,'donor-size')  || {}).value) || 64,
    projSize:     parseInt((_ctEl(tabId,'proj-size')   || {}).value) || 72,
    donorY:       parseInt((_ctEl(tabId,'donor-y')     || {}).value) || 590,
    projY:        parseInt((_ctEl(tabId,'proj-y')      || {}).value) || 842,
    donorX:       parseInt((_ctEl(tabId,'donor-x')     || {}).value) || 877,
    projX:        parseInt((_ctEl(tabId,'proj-x')      || {}).value) || 877,
    donorAuto:    (_ctEl(tabId,'donor-auto')    || {}).checked !== false,
    projAuto:     (_ctEl(tabId,'proj-auto')     || {}).checked !== false,
    donorEnabled: (_ctEl(tabId,'donor-enabled') || {}).checked !== false,
    projEnabled:  (_ctEl(tabId,'proj-enabled')  || {}).checked !== false,
    donorMaxW:    parseInt((_ctEl(tabId,'donor-maxw')  || {}).value) || 1400,
    projMaxW:     parseInt((_ctEl(tabId,'proj-maxw')   || {}).value) || 1400,
    donorColor:   (_ctEl(tabId,'donor-color')   || {}).value || '#1e2f5a',
    projColor:    (_ctEl(tabId,'proj-color')    || {}).value || '#ffffff',
    donorLineH:   parseInt((_ctEl(tabId,'donor-lineh') || {}).value) || 0,
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

// renderCustomTab kept for any legacy inline calls — delegates to _ctRender
function renderCustomTab(tabId) { _ctRender(tabId); }

function loadCustomTemplate(input, tabId) {
  const file = input.files[0];
  if (!file) return;
  fixImageOrientation(file, function(dataUrl, img) {
    const tab = CUSTOM_TABS.find(t => t.id === tabId);
    if (tab) { tab.img = img; tab.templateDataUrl = dataUrl; }
    _ctRender(tabId);
    saveCustomTabs();
  });
}

function _buildCustomTabPanel(tab) {
  const id  = tab.id;
  const p   = 'ct-' + id + '-';
  const div = document.createElement('div');
  div.id        = 'tab-' + id;
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

    <div class="field adv-section">
      <details>
        <summary>🔤 إعدادات الخط</summary>
        <div class="font-section" style="border-radius:0 0 10px 10px;margin-top:0;border-top:none;">
          <div class="font-section-title">🔤 نوع الخط</div>
          <label style="font-size:12px;color:#9aaccc">خط اسم المتبرع</label>
          <select id="${p}donor-font" onchange="_ctRender('${id}')" style="width:100%;padding:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(200,164,90,0.3);border-radius:8px;color:#e8e8e8;font-family:'Cairo',sans-serif;font-size:13px;margin-bottom:8px"></select>
          <label style="font-size:12px;color:#9aaccc">اتجاه اسم المتبرع</label>
          <select id="${p}donor-dir" onchange="_ctRender('${id}')" style="width:100%;padding:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(200,164,90,0.3);border-radius:8px;color:#e8e8e8;font-family:'Cairo',sans-serif;font-size:13px;margin-bottom:8px">
            <option value="rtl" selected>يمين إلى يسار</option><option value="ltr">يسار إلى يمين</option><option value="auto">تلقائي حسب النص</option>
          </select>
          <label style="font-size:12px;color:#9aaccc">محاذاة اسم المتبرع</label>
          <select id="${p}donor-align" onchange="_ctRender('${id}')" style="width:100%;padding:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(200,164,90,0.3);border-radius:8px;color:#e8e8e8;font-family:'Cairo',sans-serif;font-size:13px;margin-bottom:8px">
            <option value="center" selected>وسط</option><option value="right">يمين</option><option value="left">يسار</option>
          </select>
          <label style="font-size:12px;color:#9aaccc">خط اسم المشروع</label>
          <select id="${p}proj-font" onchange="_ctRender('${id}')" style="width:100%;padding:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(200,164,90,0.3);border-radius:8px;color:#e8e8e8;font-family:'Cairo',sans-serif;font-size:13px"></select>
          <label style="font-size:12px;color:#9aaccc;margin-top:8px">اتجاه اسم المشروع</label>
          <select id="${p}proj-dir" onchange="_ctRender('${id}')" style="width:100%;padding:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(200,164,90,0.3);border-radius:8px;color:#e8e8e8;font-family:'Cairo',sans-serif;font-size:13px">
            <option value="rtl" selected>يمين إلى يسار</option><option value="ltr">يسار إلى يمين</option><option value="auto">تلقائي حسب النص</option>
          </select>
          <label style="font-size:12px;color:#9aaccc;margin-top:8px">محاذاة اسم المشروع</label>
          <select id="${p}proj-align" onchange="_ctRender('${id}')" style="width:100%;padding:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(200,164,90,0.3);border-radius:8px;color:#e8e8e8;font-family:'Cairo',sans-serif;font-size:13px">
            <option value="center" selected>وسط</option><option value="right">يمين</option><option value="left">يسار</option>
          </select>
        </div>
      </details>
    </div>

    <div class="field adv-section">
      <details>
        <summary>📐 حجم وموضع — المتبرع</summary>
        <div class="font-section" style="border-radius:0 0 10px 10px;margin-top:0;border-top:none;">
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
          <label style="font-size:12px;color:#9aaccc;margin-top:8px;display:block">↔ عرض الإطار</label>
          <div class="font-control">
            <input type="range" id="${p}donor-maxw" min="200" max="1754" value="1400" oninput="document.getElementById('${p}donor-maxw-val').textContent=this.value;_ctRender('${id}')">
            <span class="size-val" id="${p}donor-maxw-val">1400</span>
          </div>
          <label style="font-size:12px;color:#9aaccc;margin-top:8px;display:block">تباعد السطور (0=تلقائي)</label>
          <div class="font-control">
            <input type="range" id="${p}donor-lineh" min="0" max="200" value="0" oninput="document.getElementById('${p}donor-lineh-val').textContent=this.value;_ctRender('${id}')">
            <span class="size-val" id="${p}donor-lineh-val">0</span>
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
      </details>
    </div>

    <div class="field adv-section">
      <details>
        <summary>📋 حجم وموضع — المشروع</summary>
        <div class="font-section" style="border-radius:0 0 10px 10px;margin-top:0;border-top:none;">
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
          <label style="font-size:12px;color:#9aaccc;margin-top:8px;display:block">↔ عرض الإطار</label>
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
      </details>
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
      <div class="batch-group-row">
        <label for="${p}batch-group-size">عدد الأسماء في الصفحة الواحدة</label>
        <input type="number" id="${p}batch-group-size" min="1" max="100" value="1">
      </div>
      <div class="batch-hint">كل اسم في سطر، وسيتم جمع العدد المحدد تحت بعض في كل لوحة.</div>
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
  const tabsBar = document.getElementById('tabs-bar');
  const addBtn  = document.getElementById('tab-add-btn');
  const btn     = document.createElement('button');
  btn.className = 'tab-btn';
  btn.id        = 'tabBtn-' + tab.id;
  btn.innerHTML = `📋 ${tab.name} <span class="tab-close" onclick="event.stopPropagation();removeCustomTab('${tab.id}')">✕</span>`;
  btn.onclick   = () => switchTab(tab.id, btn);
  tabsBar.insertBefore(btn, addBtn);

  // Init font selects
  [tab.id + '-donor-font', tab.id + '-proj-font'].map(f => 'ct-' + f).forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = '';
    DomainLayer.FONT_OPTIONS.forEach(f => {
      const o = document.createElement('option');
      o.value = f.v; o.textContent = f.l; sel.appendChild(o);
    });
  });

  // Hook save
  ['ct-' + tab.id + '-donor','ct-' + tab.id + '-project','ct-' + tab.id + '-batch-names','ct-' + tab.id + '-batch-group-size'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.addEventListener('input', saveCustomTabs); el.addEventListener('change', saveCustomTabs); }
  });
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
  switchTab('orgs', document.getElementById('tabBtn-orgs'));
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
  } catch (e) {}
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
      const p = 'ct-' + tab.id + '-';
      if (tData.fields)     Object.entries(tData.fields).forEach(([f,v]) => { const el = document.getElementById(p+f); if (el) el.value = v; });
      if (tData.checkboxes) Object.entries(tData.checkboxes).forEach(([f,v]) => { const el = document.getElementById(p+f); if (el) el.checked = v; });
      CT_SLIDER_IDS.forEach(f => { const el = document.getElementById(p+f); const ve = document.getElementById(p+f+'-val'); if (el && ve) ve.textContent = el.value; });
      if (tData.templateDataUrl) {
        const img = new Image();
        img.onload = () => {
          tab.img = img;
          const pr = document.getElementById('ct-' + tab.id + '-upload-prompt');
          if (pr) pr.style.display = 'none';
          const badge = document.getElementById(p + 'upload-badge');
          if (badge) badge.textContent = '✓';
        };
        img.src = tData.templateDataUrl;
      }
    });
  } catch (e) {}
}

// ── Modal handlers ────────────────────────────────────────────────────────────
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
  const modal = document.getElementById('new-tab-modal');
  if (!modal) return;
  if (e.key === 'Enter'  && modal.style.display === 'flex') confirmNewTab();
  if (e.key === 'Escape' && modal.style.display === 'flex') closeNewTabModal();
});

// ── Font selects init ─────────────────────────────────────────────────────────
function _initAllFontSelects() {
  const mainSelects = [
    'ar-donor-font','ar-proj-font',
    'en-donor-font','en-proj-font',
    'org-donor-font','org-proj-font',
    'vk-donor-font','vk-proj-font',
    'vt-donor-font','vt-proj-font',
  ];
  mainSelects.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value || (sel.options[0] && sel.options[0].value) || 'Amiri';
    sel.innerHTML = '';
    DomainLayer.FONT_OPTIONS.forEach(f => {
      const o = document.createElement('option');
      o.value = f.v; o.textContent = f.l;
      if (f.v === cur) o.selected = true;
      sel.appendChild(o);
    });
  });
}

// ── State persistence ─────────────────────────────────────────────────────────
const STATE_KEY = 'donor_cert_state_v1';

const STATE_FIELDS = [
  'ar-donor','ar-project','en-donor','en-project','org-donor','org-project','vk-donor','vk-project','vt-donor','vt-project',
  'ar-batch-names','en-batch-names','org-batch-names','vk-batch-names','vt-batch-names',
  'org-batch-group-size','vk-batch-group-size','vt-batch-group-size',
  'ar-donor-font','ar-proj-font','en-donor-font','en-proj-font',
  'org-donor-font','org-proj-font','vk-donor-font','vk-proj-font','vt-donor-font','vt-proj-font',
  'org-donor-dir','org-proj-dir','vk-donor-dir','vk-proj-dir','vt-donor-dir','vt-proj-dir',
  'org-donor-align','org-proj-align','vk-donor-align','vk-proj-align','vt-donor-align','vt-proj-align',
  'ar-donor-size','ar-proj-size','en-donor-size','en-proj-size',
  'org-donor-size','org-proj-size','vk-donor-size','vk-proj-size','vt-donor-size','vt-proj-size',
  'org-donor-maxw','org-proj-maxw','vk-donor-maxw','vk-proj-maxw','vt-donor-maxw','vt-proj-maxw',
  'org-donor-lineh','vk-donor-lineh','vt-donor-lineh',
  'org-donor-color','org-proj-color','vk-donor-color','vk-proj-color','vt-donor-color','vt-proj-color',
  'ar-donor-y','ar-proj-y','en-donor-y','en-proj-y',
  'org-donor-y','org-proj-y','vk-donor-y','vk-proj-y','vt-donor-y','vt-proj-y',
  'ar-donor-x','ar-proj-x','en-donor-x','en-proj-x',
  'org-donor-x','org-proj-x','vk-donor-x','vk-proj-x','vt-donor-x','vt-proj-x',
];

const STATE_CHECKBOXES = [
  'ar-donor-enabled','ar-proj-enabled','en-donor-enabled','en-proj-enabled',
  'org-donor-enabled','org-proj-enabled','vk-donor-enabled','vk-proj-enabled','vt-donor-enabled','vt-proj-enabled',
  'ar-donor-auto','ar-proj-auto','en-donor-auto','en-proj-auto',
  'org-donor-auto','org-proj-auto','vk-donor-auto','vk-proj-auto','vt-donor-auto','vt-proj-auto',
];

function saveState() {
  try {
    _saveOrgSlotToMemory(ORG_ACTIVE_SLOT);
    const state = { fields: {}, checkboxes: {}, orgSlot: ORG_ACTIVE_SLOT, orgSlotSettings: ORG_SLOT_SETTINGS, vkTemplateMode: VK_TEMPLATE_MODE };
    STATE_FIELDS.forEach(id => { const el = document.getElementById(id); if (el) state.fields[id] = el.value; });
    STATE_CHECKBOXES.forEach(id => { const el = document.getElementById(id); if (el) state.checkboxes[id] = el.checked; });
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);

    if (state.orgSlotSettings) {
      ['stk','ummetin','kayra','custom'].forEach(slot => {
        if (state.orgSlotSettings[slot]) ORG_SLOT_SETTINGS[slot] = state.orgSlotSettings[slot];
      });
    }

    if (state.fields) {
      Object.entries(state.fields).forEach(([id, val]) => {
        if (id.startsWith('org-')) return;
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

    STATE_FIELDS.forEach(id => {
      if (id.startsWith('org-')) return;
      if (!id.endsWith('-size') && !id.endsWith('-y') && !id.endsWith('-x')) return;
      const el   = document.getElementById(id);
      const valEl = document.getElementById(id + '-val');
      if (el && valEl) valEl.textContent = el.value;
    });

    if (state.vkTemplateMode) setVKTemplate(state.vkTemplateMode);

    const savedSlot = state.orgSlot || 'custom';
    ORG_ACTIVE_SLOT = savedSlot;
    document.querySelectorAll('.org-slot-btn').forEach(b => b.classList.remove('org-slot-active'));
    const btn = document.getElementById('org-slot-' + savedSlot);
    if (btn) btn.classList.add('org-slot-active');
    _loadOrgSlotFromMemory(savedSlot);
  } catch (e) {}
}

function _hookStateSave() {
  STATE_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.addEventListener('input', saveState); el.addEventListener('change', saveState); }
  });
  STATE_CHECKBOXES.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', saveState);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _initAllFontSelects();
  loadState();
  _hookStateSave();
  _hideVKPromptIfReady();
  loadCustomTabs();
  loadVertTemplates();

  document.addEventListener('input', e => {
    if (e.target.type === 'color') {
      const valEl = document.getElementById(e.target.id + '-val');
      if (valEl) valEl.textContent = e.target.value;
    }
  });
});

document.addEventListener('click', function(e) {
  const modal = document.getElementById('batch-preview-modal');
  if (e.target === modal) closeBatchPreview();
});

// ── History system ─────────────────────────────────────────────────────────────
const HIST_KEY = 'donor_cert_history_v2';
const HIST_MAX = 50;
let   _hist    = [];

function _histLoad() {
  try { _hist = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch (e) { _hist = []; }
}
function _histSave() {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(_hist.slice(0, HIST_MAX))); } catch (e) {}
}

function _histTabLabel(tabId) {
  if (tabId === 'orgs')  return '🏢 الجهات';
  if (tabId === 'vacip') return '🐑 الأضاحي';
  if (tabId === 'vert')  return '📐 قياس 3:4';
  const ct = CUSTOM_TABS.find(t => t.id === tabId);
  return ct ? '📋 ' + ct.name : tabId;
}

function histSaveSingle(lang, donor, project, settings) {
  const tabId = lang.startsWith('ct-') ? lang.slice(3) : lang;
  _hist.unshift({
    id:       Date.now() + '_' + Math.random().toString(36).slice(2,6),
    type:     'single',
    tabId,
    tabLabel: _histTabLabel(tabId),
    ts:       Date.now(),
    donor, project,
    settings: JSON.parse(JSON.stringify(settings || {})),
  });
  _histSave();
}

function histSaveBatch(lang, entries) {
  const tabId = lang.startsWith('ct-') ? lang.slice(3) : lang;
  _hist.unshift({
    id:       Date.now() + '_' + Math.random().toString(36).slice(2,6),
    type:     'batch',
    tabId,
    tabLabel: _histTabLabel(tabId),
    ts:       Date.now(),
    count:    entries.length,
    entries:  JSON.parse(JSON.stringify(entries)),
    lang,
  });
  _histSave();
}

function histRestoreSingle(entry) {
  closeHistoryModal();
  const tabId  = entry.tabId;
  const isOrgs = tabId === 'orgs';
  const isVK   = tabId === 'vacip';
  const isVert = tabId === 'vert';
  const isCT   = !isOrgs && !isVK && !isVert;

  const btn = document.getElementById('tabBtn-' + tabId);
  if (btn) switchTab(tabId, btn);

  const prefix = isOrgs ? 'org' : isVK ? 'vk' : isVert ? 'vt' : 'ct-' + tabId + '-';
  const pid    = id => isCT ? 'ct-' + tabId + '-' + id : prefix + '-' + id;

  const setVal  = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  const setCB   = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
  const setDisp = (id, val) => { const el = document.getElementById(id + '-val'); if (el) el.textContent = val; };

  setVal(pid('donor'),   entry.donor);
  setVal(pid('project'), entry.project);

  const s = entry.settings || {};
  if (s.donorFont)  setVal(pid('donor-font'),  s.donorFont);
  if (s.projFont)   setVal(pid('proj-font'),   s.projFont);
  if (s.donorDir)   setVal(pid('donor-dir'),   s.donorDir);
  if (s.projDir)    setVal(pid('proj-dir'),    s.projDir);
  if (s.donorAlign) setVal(pid('donor-align'), s.donorAlign);
  if (s.projAlign)  setVal(pid('proj-align'),  s.projAlign);
  if (s.donorSize) { setVal(pid('donor-size'), s.donorSize);  setDisp(pid('donor-size'),  s.donorSize); }
  if (s.projSize)  { setVal(pid('proj-size'),  s.projSize);   setDisp(pid('proj-size'),   s.projSize); }
  if (s.donorY)    { setVal(pid('donor-y'),    s.donorY);     setDisp(pid('donor-y'),     s.donorY); }
  if (s.projY)     { setVal(pid('proj-y'),     s.projY);      setDisp(pid('proj-y'),      s.projY); }
  if (s.donorX)    { setVal(pid('donor-x'),    s.donorX);     setDisp(pid('donor-x'),     s.donorX); }
  if (s.projX)     { setVal(pid('proj-x'),     s.projX);      setDisp(pid('proj-x'),      s.projX); }
  if (s.donorMaxW) { setVal(pid('donor-maxw'), s.donorMaxW);  setDisp(pid('donor-maxw'),  s.donorMaxW); }
  if (s.projMaxW)  { setVal(pid('proj-maxw'),  s.projMaxW);   setDisp(pid('proj-maxw'),   s.projMaxW); }
  if (s.donorAuto    !== undefined) setCB(pid('donor-auto'),    s.donorAuto);
  if (s.projAuto     !== undefined) setCB(pid('proj-auto'),     s.projAuto);
  if (s.donorEnabled !== undefined) setCB(pid('donor-enabled'), s.donorEnabled);
  if (s.projEnabled  !== undefined) setCB(pid('proj-enabled'),  s.projEnabled);

  setTimeout(() => {
    if (isOrgs)       renderOrgs();
    else if (isVK)    renderVacip();
    else if (isVert)  renderVert();
    else              _ctRender(tabId);
  }, 80);
}

function histRestoreBatch(entry) {
  closeHistoryModal();
  const tabId = entry.tabId;
  const btn   = document.getElementById('tabBtn-' + tabId);
  if (btn) switchTab(tabId, btn);

  let img = null;
  if (tabId === 'orgs')       img = ORG_IMG;
  else if (tabId === 'vacip') img = _getVKImg('') || VK_TR_IMG || VK_AR_IMG || VK_SADAKA_IMG || VK_NAFILE_IMG;
  else if (tabId === 'vert')  img = (_getActiveVertTemplate() || {}).img;
  else { const ct = CUSTOM_TABS.find(t => t.id === tabId); img = ct ? ct.img : null; }

  if (!img || !img.naturalWidth) { alert('القالب غير محمّل، يرجى رفع القالب أولاً ثم استعادة السجل'); return; }

  const prefix = tabId === 'orgs' ? 'org' : tabId === 'vacip' ? 'vk' : tabId === 'vert' ? 'vt' : 'ct-' + tabId;
  _pendingBatch = { lang: entry.lang || tabId, prefix, entries: JSON.parse(JSON.stringify(entry.entries)), img };
  openBatchPreviewGrid();
}

function _histFmtTime(ts) {
  const d   = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openHistoryModal(filterTabId) {
  _histLoad();
  const modal = document.getElementById('history-modal');
  modal.style.display = 'flex';

  const list     = document.getElementById('history-list');
  const filtered = filterTabId ? _hist.filter(e => e.tabId === filterTabId) : _hist;

  if (!filtered.length) {
    list.innerHTML = `<div style="text-align:center;color:#556688;padding:40px 20px;font-size:14px;">لا يوجد سجل بعد<br><span style="font-size:11px;">يُحفظ تلقائياً عند التحميل</span></div>`;
    modal.dataset.filter = filterTabId || '';
    return;
  }

  list.innerHTML = filtered.map(e => {
    const icon     = e.type === 'batch' ? '⚡' : '👤';
    const title    = e.type === 'batch' ? `${e.count} اسم — إنتاج جماعي` : (e.donor || '—');
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
        <button onclick="closeHistoryModal()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#e8e8e8;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px;min-height:unset;">✕</button>
      </div>
    </div>
    <div id="history-list" style="flex:1;padding:12px;display:flex;flex-direction:column;gap:8px;"></div>
  </div>`;
  div.addEventListener('click', e => { if (e.target === div) closeHistoryModal(); });
  document.body.appendChild(div);
}

function histClearAll() {
  const modal  = document.getElementById('history-modal');
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
