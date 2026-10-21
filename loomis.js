// 形の計算（SPEC §7）。three.js に依存しない。
// 座標: 球の半径 R = 1、原点 = 球の中心、正面 = -Y、後ろ = +Y、右 = +X、上 = +Z。
// 出力は「点の並び（ポリライン）」と「番号ラベルの候補位置」だけ。太さや描画は scene.js 側。

// label は日本語の名前（SPEC §8 と同じ）。画面に出す名前は i18n.js の param.*
export const SHAPE_PARAMS = [
  { key: 'cut',        label: '頭の幅',                 min: 0.4,  max: 0.95, step: 0.01, def: 0.73 },
  { key: 'top',        label: 'てっぺんの高さ',         min: 0.8,  max: 1.4,  step: 0.01, def: 1 },
  { key: 'back',       label: '後頭部の出っ張り',       min: 0.8,  max: 1.4,  step: 0.01, def: 1 },
  { key: 'r0',         label: '③ 側面の円の大きさ',     min: 0.3,  max: 0.95, step: 0.01, def: 0.68 },
  { key: 'eye',        label: '② 眉・目の線の高さ',     min: -0.9, max: 0.9,  step: 0.01, def: 0 },
  { key: 'forehead',   label: '④ 生え際の高さ',         min: 0.3,  max: 1.4,  step: 0.01, def: 1 },
  { key: 'jaw_start',  label: 'Ⓐ 顎ラインの起点',       min: -60,  max: 60,   step: 1,    def: 0,  unit: '°' },
  { key: 'jaw_len',    label: '⑦ 顎ライン Ⓐ→Ⓑの長さ', min: 0,    max: 1.2,  step: 0.01, def: 0.4 },
  { key: 'jaw_tilt',   label: '⑦ 顎ライン Ⓐ→Ⓑの傾き', min: -40,  max: 70,   step: 1,    def: 10, unit: '°' },
  { key: 'jaw_x',      label: 'Ⓑ エラの幅',             min: 0.2,  max: 0.95, step: 0.01, def: 0.62 },
  { key: 'chin_len',   label: 'Ⓒ あご先の高さ',         min: 0.5,  max: 1.5,  step: 0.01, def: 1 },
  { key: 'chin_front', label: 'Ⓒ あご先の前後',         min: 0.4,  max: 1.4,  step: 0.01, def: 0.85 },
  { key: 'chin_w',     label: 'Ⓒ あご先の幅',           min: 0.03, max: 0.6,  step: 0.01, def: 0.22 },
  { key: 'chin_round', label: 'Ⓒ あご先の丸み',         min: 0,    max: 1,    step: 0.01, def: 0.5 },
];

export const LINE_PARAM = { key: 'line', label: '線の太さ', min: 0.002, max: 0.05, step: 0.001, def: 0.012 };

export const RED = 'red';
export const BLUE = 'blue';

const CORNER = 0.05;       // ⑦の角の丸みの最小（Ⓑはこれで固定）
const EYE_X = 0.6;         // 3点合わせの目尻（仮）: ②の高さで、中心から「頭の幅 × これ」の位置（SPEC §12）
const MAX_Z = 0.98;        // 球の上の線を引ける高さの上限（球の極で線が潰れないように）
const LOOP_SEGMENTS = 128;

export function defaultShape() {
  const s = {};
  for (const p of SHAPE_PARAMS) s[p.key] = p.def;
  return s;
}

export function clampShape(input) {
  const s = {};
  for (const p of SHAPE_PARAMS) {
    const v = Number(input?.[p.key]);
    s[p.key] = Number.isFinite(v) ? Math.min(p.max, Math.max(p.min, v)) : p.def;
  }
  return s;
}

const rad = (d) => (d * Math.PI) / 180;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mirror = (a) => [-a[0], a[1], a[2]];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * 頭の球: 横は width 倍、上半分は top 倍、後ろ半分は back 倍に伸ばした球。左右を |x| = cut で切る。
 * 上半分・後ろ半分だけを伸ばすので、顔の側（前・下）は元の球のまま。継ぎ目もなめらか。
 */
export function makeBall({ cut, r0, top = 1, back = 1 }) {
  const width = cut / Math.sqrt(1 - r0 * r0);   // 「頭の幅」と「③の大きさ」から横の伸びを逆算（§7）
  const sy = (y) => (y > 0 ? back : 1);
  const sz = (z) => (z > 0 ? top : 1);
  return {
    width, cut, r0, top, back, sy, sz,
    // 単位球の上の点 (x, y, z) を伸ばした球の上へ
    stretch: (x, y, z) => [x, y * sy(y), z * sz(z)],
    // 伸ばした球の上の点の外向きの法線
    normal: (x, y, z) => norm([x / (width * width), y / (sy(y) ** 2), z / (sz(z) ** 2)]),
  };
}

/**
 * 頭の形を組み立てる。
 * @param {object} input 形のパラメータ（SHAPE_PARAMS のキー）
 * @param {number} lift  球・③の面の上の線を外へ浮かせる量（線が球に埋まらないように。scene が線の太さから決める）
 */
export function buildHead(input, lift = 0) {
  const s = clampShape(input);
  const ball = makeBall(s);
  const { width, cut, r0, stretch, normal } = ball;

  const zEye = s.eye * r0;
  const zHair = Math.min(s.forehead * r0, MAX_Z * s.top);
  const zNose = -r0;
  const zChin = -r0 - r0 * s.chin_len;
  const xPlane = cut + lift;

  // 球の表面の点を、法線方向に lift だけ浮かせる
  const surf = (p) => {
    const n = normal(...p);
    return [p[0] + n[0] * lift, p[1] + n[1] * lift, p[2] + n[2] * lift];
  };
  // ③の面の縁（単位円の角度 t → 伸ばした楕円の上）
  const rim = (t, x = xPlane) => {
    const [, y, z] = stretch(0, r0 * Math.cos(t), r0 * Math.sin(t));
    return [x, y, z];
  };

  const lines = [];
  const labels = {};
  const add = (id, color, pts, closed = false) => lines.push({ id, color, closed, pts });

  // 高さ z で球を一周する線。③の面で切れる場合は前後2本の弧になる
  const ring = (z) => {
    const zu = z / ball.sz(z);                       // 単位球での高さ
    const rho = Math.sqrt(Math.max(0, 1 - zu * zu));
    const half = width * rho;
    const at = (t) => surf(stretch(half * Math.cos(t), rho * Math.sin(t), zu));
    if (half <= cut * (1 + 1e-6)) {
      const pts = [];
      for (let i = 0; i < LOOP_SEGMENTS; i++) pts.push(at((i / LOOP_SEGMENTS) * Math.PI * 2));
      return [{ pts, closed: true }];
    }
    const t0 = Math.acos(cut / half);
    const arc = (a, b) => {
      const n = Math.max(8, Math.round((LOOP_SEGMENTS * (b - a)) / (Math.PI * 2)));
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push(at(a + ((b - a) * i) / n));
      return { pts, closed: false };
    };
    return [arc(-Math.PI + t0, -t0), arc(t0, Math.PI - t0)];   // 前の弧、後ろの弧
  };

  // ラベル候補: 輪の上の何点か（n = 球の法線、t = 線の向き）。①と交わる前後の真ん中は避ける
  const ringLabels = (parts) => {
    const out = [];
    for (const part of parts) {
      const fr = part.closed ? [0.125, 0.375, 0.625, 0.875] : [0.28, 0.72];
      const last = part.pts.length - 1;
      for (const f of fr) {
        const i = Math.round(f * last);
        const p = part.pts[i];
        out.push({ p, n: normal(...p), t: sub(part.pts[Math.min(last, i + 1)], part.pts[Math.max(0, i - 1)]) });
      }
    }
    return out;
  };

  // ① 中心線（x = 0 の縦の一周）
  {
    const pts = [];
    for (let i = 0; i < LOOP_SEGMENTS; i++) {
      const t = (i / LOOP_SEGMENTS) * Math.PI * 2;
      pts.push(surf(stretch(0, Math.cos(t), Math.sin(t))));
    }
    add('1', RED, pts, true);
    labels['1'] = [22.5, 67.5, 112.5, 157.5].map((d) => {
      const t = rad(d);
      const p = surf(stretch(0, Math.cos(t), Math.sin(t)));
      return { p, n: normal(...p), t: stretch(0, -Math.sin(t), Math.cos(t)) };
    });
  }

  // ② 横の線 ④ 生え際 ⑤ 鼻の線
  for (const [id, color, z] of [['2', RED, zEye], ['4', BLUE, zHair], ['5', BLUE, zNose]]) {
    const parts = ring(z);
    for (const part of parts) add(id, color, part.pts, part.closed);
    labels[id] = ringLabels(parts);
  }

  // ③ 側面の円と十字（左右）。上・後ろを伸ばすと卵形になる
  labels['3'] = [];
  for (const sx of [1, -1]) {
    const x = sx * xPlane;
    const circle = [];
    for (let i = 0; i < LOOP_SEGMENTS; i++) circle.push(rim((i / LOOP_SEGMENTS) * Math.PI * 2, x));
    add('3', RED, circle, true);
    add('3', RED, [rim(Math.PI / 2, x), rim(-Math.PI / 2, x)]);
    add('3', RED, [rim(Math.PI, x), rim(0, x)]);
    labels['3'].push({ p: rim(Math.PI / 4, x), n: [sx, 0, 0], t: [0, -1, 1] });
  }

  // 制御点（右側。左は x を反転）
  const A = rim(rad(-90 - s.jaw_start));
  const tilt = rad(s.jaw_tilt);
  const B = [s.jaw_x, A[1] - s.jaw_len * Math.sin(tilt), A[2] - s.jaw_len * Math.cos(tilt)];
  const Cf = [s.chin_w, -s.chin_front, zChin];

  // ⑦ 顎ライン（1本につながる）。Ⓒのまわりの角は「あご先の丸み」で丸める
  const k = s.chin_round;
  const jaw = rounded([
    { p: A }, { p: B, k: 0 }, { p: Cf, k },
    { p: mirror(Cf), k }, { p: mirror(B), k: 0 }, { p: mirror(A) },
  ], CORNER);
  add('7', BLUE, jaw.pts);
  const cornerOf = (v) => jaw.corners.find((c) => c.v === v)?.p ?? v;
  const CfR = cornerOf(Cf);
  const CfL = mirror(CfR);

  // ⑧ 頬の線（Ⓒ → ②と③の縁が交わる点）
  const zEyeU = zEye / ball.sz(zEye);
  const eyeEdge = [xPlane, -Math.sqrt(Math.max(0, r0 * r0 - zEyeU * zEyeU)), zEye];
  add('8', BLUE, [CfR, eyeEdge]);
  add('8', BLUE, [CfL, mirror(eyeEdge)]);

  // ⑥ 顔の前の線（②の高さの球の前 → Ⓒ。⑦の真ん中の点。丸みを変えても⑦の上にある）
  const front = surf(stretch(0, -Math.sqrt(Math.max(0, 1 - zEyeU * zEyeU)), zEyeU));
  const chinMid = [0, -s.chin_front, zChin];
  add('6', RED, [front, chinMid]);

  // ラベル候補（ワイヤー側）
  const out = (p) => norm(p);
  const BR = cornerOf(B);
  const jawMid = lerp(BR, CfR, 0.5);
  const jawDir = sub(CfR, BR);
  const cheek = lerp(CfR, eyeEdge, 0.5);
  const cheekDir = sub(eyeEdge, CfR);
  labels['6'] = [{ p: lerp(front, chinMid, 0.8), n: [0, -1, 0], t: sub(chinMid, front) }];
  labels['7'] = [{ p: jawMid, n: out(jawMid), t: jawDir }, { p: mirror(jawMid), n: out(mirror(jawMid)), t: mirror(jawDir) }];
  labels['8'] = [{ p: cheek, n: out(cheek), t: cheekDir }, { p: mirror(cheek), n: out(mirror(cheek)), t: mirror(cheekDir) }];
  labels['A'] = [{ p: A, n: norm([1, 0, -0.4]) }, { p: mirror(A), n: norm([-1, 0, -0.4]) }];
  labels['B'] = [{ p: BR, n: out(BR) }, { p: mirror(BR), n: out(mirror(BR)) }];
  labels['C'] = [{ p: chinMid, n: norm([0, -1, -1]) }];

  // 3点合わせ用の目印。ルーミスの形に目はないので、目尻は②の上の仮の位置（EYE_X）
  const eyeX = EYE_X * cut;
  const eyeY = -Math.sqrt(Math.max(0, 1 - zEyeU * zEyeU - (eyeX / width) ** 2));
  const landmarks = { eyes: [[eyeX, eyeY, zEye], [-eyeX, eyeY, zEye]], chin: chinMid };

  return { lines, labels, landmarks, solid: { width, cut, r0, top: s.top, back: s.back } };
}

/**
 * 折れ線の角を丸める（2次ベジェ）。重なった点は除く。
 * 各角 {p, k}: k = 0 なら丸み CORNER の小さな角、k が 1 に近いほど隣の辺の半分まで使って大きく丸める。
 * どちらも隣の辺の半分を超えない＝どの値でも線が離れたり折り返したりしない。
 * corners: 各角の丸めた弧の中点（⑧のように角へつなぐ線の端に使う）
 */
function rounded(items, radius) {
  const pts0 = [];
  for (const it of items) {
    if (!pts0.length || len(sub(it.p, pts0[pts0.length - 1].p)) > 1e-6) pts0.push(it);
  }
  if (pts0.length < 3) return { pts: pts0.map((it) => it.p), corners: [] };

  const out = [pts0[0].p];
  const corners = [];
  for (let i = 1; i < pts0.length - 1; i++) {
    const P = pts0[i - 1].p, V = pts0[i].p, N = pts0[i + 1].p;
    const kk = pts0[i].k ?? 0;
    const d1 = sub(V, P), d2 = sub(N, V);
    const L1 = len(d1), L2 = len(d2);
    const u1 = norm(d1), u2 = norm(d2);
    const cos = Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2]));
    const turn = Math.acos(cos);
    if (turn < 1e-3) { out.push(V); corners.push({ v: V, p: V }); continue; }
    const base = radius * Math.tan(Math.min(turn, Math.PI * 0.95) / 2);
    const t1 = Math.min(Math.max(base, kk * 0.5 * L1), L1 * 0.5);
    const t2 = Math.min(Math.max(base, kk * 0.5 * L2), L2 * 0.5);
    const T1 = [V[0] - u1[0] * t1, V[1] - u1[1] * t1, V[2] - u1[2] * t1];
    const T2 = [V[0] + u2[0] * t2, V[1] + u2[1] * t2, V[2] + u2[2] * t2];
    const STEPS = 2 * (3 + Math.round(kk * 9));   // 偶数にして、弧の中点（⑧のつなぎ目）が必ず線の上の点になるように
    for (let j = 0; j <= STEPS; j++) {
      const s = j / STEPS, a = (1 - s) * (1 - s), b = 2 * s * (1 - s), c = s * s;
      out.push([a * T1[0] + b * V[0] + c * T2[0], a * T1[1] + b * V[1] + c * T2[1], a * T1[2] + b * V[2] + c * T2[2]]);
    }
    corners.push({ v: V, p: [0.25 * T1[0] + 0.5 * V[0] + 0.25 * T2[0], 0.25 * T1[1] + 0.5 * V[1] + 0.25 * T2[1], 0.25 * T1[2] + 0.5 * V[2] + 0.25 * T2[2]] });
  }
  out.push(pts0[pts0.length - 1].p);
  return { pts: out, corners };
}
