// パネルの独自スクロールバー（ブラウザのものは細くてつかみにくく、ホイールは行き過ぎるため）
// つまみをドラッグ、または溝を押すと、つまみの中心がそこへ飛ぶ。

const MIN_THUMB = 44;   // つまみの最小の高さ（px）

/**
 * @param {HTMLElement} scroller  スクロールする要素（パネルの中身）
 * @param {HTMLElement} bar       溝の要素（最初の子がつまみ）
 */
export function setupScrollbar(scroller, bar) {
  const thumb = bar.firstElementChild;
  let drag = null;

  const metrics = () => {
    const trackH = bar.clientHeight;
    const max = scroller.scrollHeight - scroller.clientHeight;
    const thumbH = Math.min(trackH, Math.max(MIN_THUMB, (trackH * scroller.clientHeight) / scroller.scrollHeight));
    return { max, thumbH, room: Math.max(1, trackH - thumbH) };
  };

  const update = () => {
    bar.hidden = scroller.clientHeight === 0 || scroller.scrollHeight - scroller.clientHeight <= 1;
    if (bar.hidden) return;
    const m = metrics();
    thumb.style.height = `${m.thumbH}px`;
    thumb.style.transform = `translateY(${(scroller.scrollTop / m.max) * m.room}px)`;
  };

  bar.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const m = metrics();
    if (e.target !== thumb) {
      const y = e.clientY - bar.getBoundingClientRect().top - m.thumbH / 2;
      scroller.scrollTop = (y / m.room) * m.max;
    }
    drag = { y: e.clientY, top: scroller.scrollTop };
    try { bar.setPointerCapture(e.pointerId); } catch { /* つかめなくても動かせる */ }
    bar.classList.add('dragging');
  });
  bar.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const m = metrics();
    scroller.scrollTop = drag.top + ((e.clientY - drag.y) * m.max) / m.room;
  });
  const end = () => {
    drag = null;
    bar.classList.remove('dragging');
  };
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);

  scroller.addEventListener('scroll', update, { passive: true });
  // パネルの高さ（引き出しの開閉など）や中身の長さが変わったら測り直す
  const ro = new ResizeObserver(update);
  ro.observe(scroller);
  for (const child of scroller.children) ro.observe(child);
  update();
}
