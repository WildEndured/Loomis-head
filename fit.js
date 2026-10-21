// 3点合わせ（SPEC F11）: 下絵の上で 目尻 → もう片方の目尻 → あご先 を押すと、頭の向き・位置・大きさを合わせる。
// 押した点は残り、ドラッグすると頭がついてくる。「完了」か Esc で終わる。

import { t } from 'i18n.js';

const LOOSE_PX = 12;   // 合わせたあとのずれがこれより大きいときは、角度を選び直す案内を出す

/**
 * @param {import('./scene.js').HeadView} view
 * @param {{ layer: HTMLElement, bar: HTMLElement, msg: HTMLElement, start: HTMLButtonElement, done: HTMLButtonElement, other: HTMLButtonElement, frame: () => { cx: number, cy: number, s: number }, stage: HTMLElement, beforeChange: () => void }} ui
 */
export function setupFit(view, ui) {
  let active = false;
  let pts = [];        // { x, y, u, v, el }  x,y = 画面(px)、u,v = 下絵に対する位置（画面の大きさが変わっても絵の同じ所を指す）
  // 案内は data-i18n で持つので、言語を変えると自動で訳し直される
  const showMsg = (key) => {
    ui.msg.dataset.i18n = key;
    ui.msg.textContent = t(key);
  };

  const local = (e) => {
    const r = ui.layer.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const place = (p) => {
    p.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
  };
  const pin = (p) => {               // 画面の位置 → 下絵に対する位置
    const f = ui.frame();
    p.u = (p.x - f.cx) / f.s;
    p.v = (p.y - f.cy) / f.s;
  };
  const unpin = (p) => {             // 下絵に対する位置 → 画面の位置
    const f = ui.frame();
    p.x = f.cx + p.u * f.s;
    p.y = f.cy + p.v * f.s;
  };

  const fit = (refine) => {
    const { err, choices } = view.fitToPoints(pts, refine);
    if (refine) return;
    showMsg(err > LOOSE_PX ? 'fit.loose' : 'fit.adjust');
    ui.other.hidden = choices < 2;   // 上向き／下向きのように、同じくらい合う向きが2つあるときだけ出す
  };

  function begin() {
    active = true;
    clear();
    ui.layer.hidden = false;
    ui.bar.hidden = false;
    ui.start.setAttribute('aria-pressed', 'true');
    showMsg('fit.step0');
    ui.other.hidden = true;
  }

  function end() {
    active = false;
    clear();
    ui.layer.hidden = true;
    ui.bar.hidden = true;
    ui.start.setAttribute('aria-pressed', 'false');
  }

  function clear() {
    for (const p of pts) p.el.remove();
    pts = [];
  }

  function addPoint(pos) {
    const el = document.createElement('span');
    el.className = 'fit-pt';
    ui.layer.appendChild(el);
    const p = { ...pos, el };
    pin(p);
    pts.push(p);
    place(p);
    bindDrag(p);
    if (pts.length < 3) showMsg(`fit.step${pts.length}`);
    else {
      ui.beforeChange();
      fit(false);
    }
  }

  // 点のドラッグ。3点そろっていれば、動かしている間ずっと頭を合わせ直す
  function bindDrag(p) {
    let dragging = false, moved = false;
    p.el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      try { p.el.setPointerCapture(e.pointerId); } catch { /* つかめなくても動かせる */ }
      dragging = true;
      moved = false;
    });
    p.el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      if (!moved && pts.length === 3) ui.beforeChange();   // ドラッグ1回を「ひとつ前に戻す」の1回に
      moved = true;
      Object.assign(p, local(e));
      pin(p);
      place(p);
      if (pts.length === 3) fit(true);
    });
    const stop = () => {
      if (dragging && moved && pts.length === 3) fit(false);   // 離したら、ほかの向きの答えも含めて合わせ直す
      dragging = false;
    };
    p.el.addEventListener('pointerup', stop);
    p.el.addEventListener('pointercancel', stop);
  }

  ui.layer.addEventListener('pointerdown', (e) => {
    if (!active || pts.length >= 3 || e.target !== ui.layer) return;
    e.preventDefault();
    addPoint(local(e));
  });
  ui.start.addEventListener('click', () => (active ? end() : begin()));
  ui.done.addEventListener('click', end);
  ui.other.addEventListener('click', () => {
    ui.beforeChange();
    view.nextFitChoice();
  });
  document.addEventListener('keydown', (e) => {
    if (active && e.key === 'Escape') end();
  });
  // 画面の大きさが変わったら（スマホのアドレスバー・引き出しなど）、点を絵の同じ所へ戻して合わせ直す
  new ResizeObserver(() => {
    if (!active || !pts.length) return;
    for (const p of pts) { unpin(p); place(p); }
    if (pts.length === 3) requestAnimationFrame(() => fit(true));   // 3D側の大きさが変わってから
  }).observe(ui.stage);

  return {
    end,
    // 角度ボタンを押したとき: 3点そろっていれば、その角度から合わせ直す
    refit: () => { if (active && pts.length === 3) fit(false); },
  };
}
