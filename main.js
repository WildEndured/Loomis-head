// 起動・状態管理・自動保存（SPEC F2〜F8）

import { SHAPE_PARAMS, LINE_PARAM, defaultShape, clampShape } from 'loomis.js';
import { PRESETS, presetShape } from 'presets.js';
import { HeadView } from 'scene.js';
import { LANGS, t, initialLang, setLang } from 'i18n.js';
import { setupFit } from 'fit.js';
import { setupScrollbar } from 'scrollbar.js';
import { saveImage, deleteImage, loadImages } from 'images-store.js';

const STORE_KEY = 'loomis-head:v1';
// テスト中の機能（3点で合わせる・GLB の半透明の球）は URL に ?dev を付けたときだけ出す（SPEC §12）
const DEV = new URLSearchParams(location.search).has('dev');
const HISTORY_MAX = 100;

const SLOTS = [
  { id: 'front' },     // 名前は i18n.js（view.*）
  { id: 'side' },
  { id: 'oblique' },
];
const UNDERLAY_PARAMS = [
  { key: 'scale',  min: 0.2, max: 3,    step: 0.01, def: 1,   fmt: (v) => `${Math.round(v * 100)}%` },
  { key: 'rot',    min: -180, max: 180, step: 1,    def: 0,   fmt: (v) => `${v}°` },
  { key: 'transp', min: 0,   max: 0.95, step: 0.01, def: 0.4, fmt: (v) => `${Math.round(v * 100)}%` },
];
const LINE = { ...LINE_PARAM, fmt: (v) => v.toFixed(3) };
const shapeFmt = (p) => (v) => (p.unit ? `${Math.round(v)}${p.unit}` : v.toFixed(2));

const $ = (id) => document.getElementById(id);

/* ---------- 状態 ---------- */

function defaultSlot() {
  return Object.fromEntries(UNDERLAY_PARAMS.map((p) => [p.key, p.def]));
}

function defaultState() {
  return {
    preset: 'standard',
    shape: defaultShape(),
    display: { line: LINE.def, sphere: true, labels: true },
    underlay: { tab: 'front', slots: Object.fromEntries(SLOTS.map((s) => [s.id, defaultSlot()])) },
    view: null,
  };
}

const clampTo = (p, v) => (Number.isFinite(Number(v)) ? Math.min(p.max, Math.max(p.min, Number(v))) : p.def);

// 保存データは信用しない: 足りない値は初期値、範囲外は範囲内に
function sanitize(raw) {
  const s = defaultState();
  if (!raw || typeof raw !== 'object') return s;
  s.shape = clampShape(raw.shape);
  s.preset = PRESETS.some((p) => p.id === raw.preset) ? raw.preset : null;
  if (raw.display) {
    s.display.line = clampTo(LINE, raw.display.line);
    s.display.sphere = raw.display.sphere !== false;
    s.display.labels = raw.display.labels !== false;
  }
  if (raw.underlay) {
    if (SLOTS.some((x) => x.id === raw.underlay.tab)) s.underlay.tab = raw.underlay.tab;
    for (const slot of SLOTS) {
      const src = raw.underlay.slots?.[slot.id] ?? {};
      for (const p of UNDERLAY_PARAMS) s.underlay.slots[slot.id][p.key] = clampTo(p, src[p.key]);
    }
  }
  s.view = raw.view ?? null;
  return s;
}

function load() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(STORE_KEY)));
  } catch {
    return defaultState();
  }
}

let state = load();
let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      state.view = view.getView();
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch { /* 保存できなくても普通に動く */ }
  }, 300);
}

/* ---------- 3D ---------- */

// WebGL（3D）が使えない端末・設定では作れないので、真っ白にせず案内を出して止める
let view;
try {
  view = new HeadView($('gl'), $('labels'));
} catch (err) {
  window.__loomisShowError?.('webgl');
  throw err;
}
view.setView(state.view);
view.onViewChange = save;
view.onGestureStart = () => pushHistory();   // 頭を回す・動かす・拡大も1回ずつ戻せる

const fitter = setupFit(view, {
  layer: $('fit-layer'), bar: $('fit-bar'), msg: $('fit-msg'), start: $('fit-start'), done: $('fit-done'), other: $('fit-other'),
  stage: $('stage'), beforeChange: () => pushHistory(),
  // 下絵の中心と、画面に収めたときの倍率（下絵がなければ画面の短い辺）。3点を絵の同じ所に留めるのに使う
  frame: () => {
    const st = $('stage'), cur = images[state.underlay.tab];
    const w = st.clientWidth, h = st.clientHeight;
    return { cx: w / 2, cy: h / 2, s: cur ? Math.min(w / cur.w, h / cur.h) : Math.min(w, h) };
  },
});

$('fit-start').hidden = !DEV;

/* ---------- ひとつ前に戻す ---------- */

// 操作の直前の状態（形・設定・頭の向き）を積む。読み込んだ下絵の画像そのものは含めない
const history = [];
const snapshot = () => JSON.stringify({ ...state, view: view.getView() });

function pushHistory() {
  history.push(snapshot());
  if (history.length > HISTORY_MAX) history.shift();
  $('undo').disabled = false;
}

function undo() {
  const cur = snapshot();
  let prev;
  do prev = history.pop(); while (prev === cur);   // 何も変わらなかった操作は飛ばす
  $('undo').disabled = history.length === 0;
  if (!prev) return;
  const raw = JSON.parse(prev);
  state = sanitize(raw);
  view.setView(raw.view);
  syncAll();
  applyShape();
  renderUnderlay();
  save();
}

function applyShape() {
  view.setShape(state.shape, state.display.line);
}

/* ---------- スライダー ---------- */

/**
 * スライダー1本。ダブルクリック／長押しで初期値に戻す。
 * get/set は状態への読み書き。戻り値の sync() で表示を状態に合わせる。
 */
function makeSlider(host, p, idPrefix, get, set, fmt) {
  const row = document.createElement('div');
  row.className = 'slider';
  const id = `${idPrefix}-${p.key}`;
  row.innerHTML = `<label for="${id}"></label><input type="range" id="${id}"><output for="${id}"></output>`;
  const [label, input, out] = row.children;
  label.dataset.i18n = `param.${p.key}`;
  label.textContent = t(label.dataset.i18n);
  Object.assign(input, { min: p.min, max: p.max, step: p.step });
  host.appendChild(row);

  const sync = () => {
    const v = get();
    input.value = v;
    out.textContent = fmt(v);
  };
  let dragging = false;
  input.addEventListener('input', () => {
    if (!dragging) { pushHistory(); dragging = true; }   // つまんで離すまでを1回の操作にする
    set(Number(input.value));
    out.textContent = fmt(Number(input.value));
  });
  input.addEventListener('change', () => { dragging = false; });
  const reset = () => {
    pushHistory();
    set(p.def);
    sync();
  };
  row.addEventListener('dblclick', reset);

  let timer = 0, start = null;
  input.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    start = { x: e.clientX, y: e.clientY };
    timer = setTimeout(() => { reset(); navigator.vibrate?.(15); }, 600);
  });
  input.addEventListener('pointermove', (e) => {
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) clearTimeout(timer);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) input.addEventListener(ev, () => { clearTimeout(timer); start = null; });

  sync();
  return sync;
}

const syncers = [];

// 形
// グループの最初のスライダーの前に見出しを入れる（名前は i18n.js の group.*）
const SHAPE_GROUPS = { cut: 'group.head', eye: 'group.face', jaw_start: 'group.jaw', chin_len: 'group.chin' };
for (const p of SHAPE_PARAMS) {
  if (SHAPE_GROUPS[p.key]) {
    const h = document.createElement('h3');
    h.className = 'group-h';
    h.dataset.i18n = SHAPE_GROUPS[p.key];
    h.textContent = t(h.dataset.i18n);
    $('shape-sliders').appendChild(h);
  }
  syncers.push(makeSlider($('shape-sliders'), p, 'shape', () => state.shape[p.key], (v) => {
    state.shape[p.key] = v;
    state.preset = null;     // 動かしたら、どのプリセットも選ばれていない状態
    renderPresets();
    applyShape();
    save();
  }, shapeFmt(p)));
}

// 表示
syncers.push(makeSlider($('display-sliders'), LINE, 'display', () => state.display.line, (v) => {
  state.display.line = v;
  applyShape();
  save();
}, LINE.fmt));

// 下絵（いま選んでいる枠の値を読み書き）
const curSlot = () => state.underlay.slots[state.underlay.tab];
for (const p of UNDERLAY_PARAMS) {
  syncers.push(makeSlider($('underlay-sliders'), p, 'underlay', () => curSlot()[p.key], (v) => {
    curSlot()[p.key] = v;
    renderUnderlay();
    save();
  }, p.fmt));
}

/* ---------- プリセット ---------- */

const presetButtons = PRESETS.map((p) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.dataset.i18n = `preset.${p.id}`;
  b.textContent = t(b.dataset.i18n);
  b.addEventListener('click', () => {
    pushHistory();
    state.preset = p.id;
    state.shape = presetShape(p.id);
    syncAll();
    applyShape();
    save();
  });
  $('presets').appendChild(b);
  return b;
});

function renderPresets() {
  PRESETS.forEach((p, i) => presetButtons[i].setAttribute('aria-pressed', String(state.preset === p.id)));
}

/* ---------- 表示の切り替え ---------- */

function renderDisplay() {
  $('toggle-sphere').setAttribute('aria-pressed', String(state.display.sphere));
  $('toggle-labels').setAttribute('aria-pressed', String(state.display.labels));
  view.setDisplay(state.display);
}
for (const [btn, key] of [['toggle-sphere', 'sphere'], ['toggle-labels', 'labels']]) {
  $(btn).addEventListener('click', () => {
    pushHistory();
    state.display[key] = !state.display[key];
    renderDisplay();
    save();
  });
}

/* ---------- 下絵 ---------- */

const images = {};   // 枠ごとの画像（端末内だけ。保存しない）
const tabButtons = SLOTS.map((slot) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.setAttribute('role', 'tab');
  b.dataset.i18n = `view.${slot.id}`;
  b.textContent = t(b.dataset.i18n);
  b.addEventListener('click', () => {
    state.underlay.tab = slot.id;    // 頭の向きは変えない
    syncAll();
    renderUnderlay();
    save();
  });
  $('underlay-tabs').appendChild(b);
  return b;
});

function renderUnderlay() {
  const tab = state.underlay.tab;
  SLOTS.forEach((s, i) => {
    tabButtons[i].setAttribute('aria-selected', String(s.id === tab));
    tabButtons[i].classList.toggle('has-image', !!images[s.id]);
  });
  const img = $('underlay-img');
  const cur = images[tab];
  $('underlay-remove').hidden = !cur;
  $('underlay-sliders').hidden = !cur;   // 大きさ・回転・透明度は画像を読み込んでから出す
  $('underlay-name').textContent = cur ? cur.name : t('underlay.hint');
  if (!cur) {
    img.removeAttribute('src');
    return;
  }
  if (img.getAttribute('src') !== cur.url) img.src = cur.url;
  const stage = $('stage');
  const fit = Math.min(stage.clientWidth / cur.w, stage.clientHeight / cur.h);   // 画面に収まる大きさが 100%
  const s = curSlot();
  img.style.width = `${cur.w * fit}px`;
  img.style.height = `${cur.h * fit}px`;
  img.style.transform = `translate(-50%, -50%) rotate(${s.rot}deg) scale(${s.scale})`;
  img.style.opacity = String(1 - s.transp);
}

// 画像を枠に入れる。persist: この端末のブラウザに保存して、次に開いたときも戻す（サーバーには送らない）
function loadUnderlay(file, { slot = state.underlay.tab, name = file?.name, persist = true } = {}) {
  if (!file || !file.type.startsWith('image/')) return;
  const label = name || t('underlay.pasted');
  const url = URL.createObjectURL(file);
  const probe = new Image();
  probe.onload = () => {
    if (images[slot]) URL.revokeObjectURL(images[slot].url);
    images[slot] = { url, name: label, w: probe.naturalWidth, h: probe.naturalHeight };
    if (persist) saveImage(slot, file, label);
    renderUnderlay();
  };
  probe.onerror = () => URL.revokeObjectURL(url);
  probe.src = url;
}

$('underlay-pick').addEventListener('click', () => $('underlay-input').click());
$('underlay-input').addEventListener('change', (e) => {
  loadUnderlay(e.target.files?.[0]);
  e.target.value = '';
});
$('underlay-remove').addEventListener('click', () => {
  const slot = state.underlay.tab;
  if (images[slot]) URL.revokeObjectURL(images[slot].url);
  delete images[slot];
  deleteImage(slot);
  renderUnderlay();
});
document.addEventListener('paste', (e) => {
  const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
  if (item) {
    e.preventDefault();
    loadUnderlay(item.getAsFile());
  }
});

// ドラッグ＆ドロップ（画面のどこに落としても、いま選んでいる枠に入る）
let dragDepth = 0;
const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');
window.addEventListener('dragenter', (e) => {
  if (!hasFiles(e)) return;
  dragDepth++;
  $('drop-cover').hidden = false;
});
window.addEventListener('dragleave', () => {
  if (--dragDepth <= 0) { dragDepth = 0; $('drop-cover').hidden = true; }
});
window.addEventListener('dragover', (e) => {
  if (hasFiles(e)) e.preventDefault();
});
window.addEventListener('drop', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth = 0;
  $('drop-cover').hidden = true;
  loadUnderlay(e.dataTransfer.files?.[0]);
});

new ResizeObserver(() => renderUnderlay()).observe($('stage'));

/* ---------- 保存 ---------- */

async function runSave(btn, fn) {
  const msg = $('save-msg');
  btn.disabled = true;
  msg.textContent = '';
  try {
    await fn();
  } catch (err) {
    console.error(err);
    msg.textContent = t('save.error');
  } finally {
    btn.disabled = false;
  }
}
$('save-png').addEventListener('click', (e) => runSave(e.currentTarget, async () => {
  const { savePNG } = await import('export.js');
  const font = getComputedStyle(document.querySelector('.guide-label')).font;
  await savePNG(view, font);
}));
$('save-glb').addEventListener('click', (e) => runSave(e.currentTarget, async () => {
  const { saveGLB } = await import('export.js');
  await saveGLB(state.shape, state.display.line, { clearSphere: DEV });
}));

/* ---------- リセット ---------- */

$('reset-all').addEventListener('click', () => {
  fitter.end();
  pushHistory();
  state = defaultState();   // 読み込んだ下絵の画像はそのまま（外すのは × で）
  view.resetView(false);
  syncAll();
  applyShape();
  renderUnderlay();
  save();
});

/* ---------- このツールについて ---------- */

$('about-open').addEventListener('click', () => $('about').showModal());
$('about').addEventListener('click', (e) => {   // 枠の外（暗いところ）を押したら閉じる
  const r = $('about').getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) $('about').close();
});

/* ---------- スマホの引き出し ---------- */

$('sheet-handle').addEventListener('click', () => {
  const open = $('panel').classList.toggle('open');
  $('sheet-handle').setAttribute('aria-expanded', String(open));
});

/* ---------- 角度ボタン（横・斜めはもう一度押すと反対向き） ---------- */

const ANGLES = { front: [0], side: [-90, 90], oblique: [-45, 45] };   // 縦軸まわりの回転（°）。- で顔が画面の左を向く
for (const b of document.querySelectorAll('[data-angle]')) {
  b.addEventListener('click', () => {
    const [first, second] = ANGLES[b.dataset.angle];
    const deg = second !== undefined && view.isYaw(first) ? second : first;
    pushHistory();
    view.setYaw(deg);
    fitter.refit();
  });
}

$('undo').addEventListener('click', undo);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
  }
});

/* ---------- 言語 ---------- */

const langSelect = $('lang');
for (const l of LANGS) langSelect.add(new Option(l.label, l.id));
langSelect.addEventListener('change', () => {
  setLang(langSelect.value);
  renderUnderlay();
});
setLang(initialLang());
langSelect.value = document.documentElement.lang;

/* ---------- 起動 ---------- */

function syncAll() {
  for (const s of syncers) s();
  renderPresets();
  renderDisplay();
}

syncAll();
applyShape();
renderUnderlay();
setupScrollbar($('panel-body'), $('panel-scrollbar'));   // パネルの中身ができてから測る
// 前回の下絵を戻す
loadImages(SLOTS.map((x) => x.id)).then((saved) => {
  for (const [slot, v] of Object.entries(saved)) loadUnderlay(v.blob, { slot, name: v.name, persist: false });
});
// 見出しのフォントが届いたらラベル位置を描き直す（文字幅が変わるため）
document.fonts?.ready.then(() => view.requestRender());
window.__loomisReady = true;   // 起動できた（index.html の起動チェック用）
