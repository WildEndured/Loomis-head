// three.js での表示・回転・番号表示（SPEC F1, F4, F6）。
// 形の計算は loomis.js。ここは「点の並び → チューブ」と、頭の向き・位置・拡大の操作だけを持つ。

import * as THREE from 'three';
import { buildHead, makeBall, RED } from 'loomis.js';

// 線と球の色。style.css の --guide-red / --guide-blue / --sphere から読む（デザインを変えても追従する）
export const COLORS = { red: '#f03e6e', blue: '#3b7cff', gray: '#cdc7d6' };

export function readThemeColors() {
  const cs = getComputedStyle(document.documentElement);
  for (const [key, prop] of [['red', '--guide-red'], ['blue', '--guide-blue'], ['gray', '--sphere']]) {
    const v = cs.getPropertyValue(prop).trim();
    if (v) COLORS[key] = v;
  }
}

const DIST = 6;                 // カメラと頭の距離（パースの強さが決まる。拡大はカメラのズームで行うので変わらない）
const NEED_H = 3.6;             // 拡大1倍のとき縦に収める範囲（頭の上〜あご ≒ 2.4）
const NEED_W = 2.6;             // 縦長の画面で横に収める範囲
const HOME_Y = 0.18;            // 「向きをリセット」で頭全体が中央に来るように少し上げる
const LIFT = 0.35;              // 球・③の上の線を「線の太さ × これ」だけ外へ浮かせる
const ZOOM_MIN = 0.3, ZOOM_MAX = 6;
const SPHERE_OPACITY = 0.55;

const LABEL_TEXT = { 1: '①', 2: '②', 3: '③', 4: '④', 5: '⑤', 6: '⑥', 7: '⑦', 8: '⑧', A: 'Ⓐ', B: 'Ⓑ', C: 'Ⓒ' };
const LABEL_COLOR = { 1: 'red', 2: 'red', 3: 'red', 6: 'red', 4: 'blue', 5: 'blue', 7: 'blue', 8: 'blue', A: 'ink', B: 'ink', C: 'ink' };

// 仕様の座標（Z-up、正面 = -Y）→ three.js（Y-up、正面 = +Z ＝ カメラ側）
const v3 = (p) => new THREE.Vector3(p[0], p[2], -p[1]);

/* ---------- ジオメトリ ---------- */

class GeoBuilder {
  constructor() { this.pos = []; this.nor = []; this.idx = []; }
  vert(p, n) {
    this.pos.push(p.x, p.y, p.z);
    this.nor.push(n.x, n.y, n.z);
    return this.pos.length / 3 - 1;
  }
  // 面の向きを頂点の法線にそろえる（巻き方向を気にせず三角形を足せる）
  tri(a, b, c) {
    const P = this.pos, N = this.nor;
    const e1x = P[b * 3] - P[a * 3], e1y = P[b * 3 + 1] - P[a * 3 + 1], e1z = P[b * 3 + 2] - P[a * 3 + 2];
    const e2x = P[c * 3] - P[a * 3], e2y = P[c * 3 + 1] - P[a * 3 + 1], e2z = P[c * 3 + 2] - P[a * 3 + 2];
    const cx = e1y * e2z - e1z * e2y, cy = e1z * e2x - e1x * e2z, cz = e1x * e2y - e1y * e2x;
    const nx = N[a * 3] + N[b * 3] + N[c * 3], ny = N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1], nz = N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2];
    if (cx * nx + cy * ny + cz * nz < 0) this.idx.push(a, c, b);
    else this.idx.push(a, b, c);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

// 左右を平らに切った球（x 軸まわりに回した形 ＋ 両側のふた）。上・後ろの伸びは makeBall のとおり
function sphereGeometry(solid) {
  const ball = makeBall(solid);
  const { width, cut, r0 } = ball;
  const g = new GeoBuilder();
  const SEG_A = 48, SEG_R = 72;
  const a0 = Math.acos(r0);               // x = width·sin(a) が ±cut になる角度
  const rows = [];
  for (let i = 0; i <= SEG_A; i++) {
    const a = -a0 + (2 * a0 * i) / SEG_A;
    const x = width * Math.sin(a), rho = Math.cos(a);
    const row = [];
    for (let j = 0; j < SEG_R; j++) {
      const t = (j / SEG_R) * Math.PI * 2;
      const q = ball.stretch(x, rho * Math.cos(t), rho * Math.sin(t));
      row.push(g.vert(v3(q), v3(ball.normal(...q))));
    }
    rows.push(row);
  }
  for (let i = 0; i < SEG_A; i++) {
    for (let j = 0; j < SEG_R; j++) {
      const j2 = (j + 1) % SEG_R;
      g.tri(rows[i][j], rows[i][j2], rows[i + 1][j2]);
      g.tri(rows[i][j], rows[i + 1][j2], rows[i + 1][j]);
    }
  }
  for (const sx of [1, -1]) {
    const n = new THREE.Vector3(sx, 0, 0);
    const c = g.vert(new THREE.Vector3(sx * cut, 0, 0), n);
    const ring = [];
    for (let j = 0; j < SEG_R; j++) {
      const t = (j / SEG_R) * Math.PI * 2;
      ring.push(g.vert(v3(ball.stretch(sx * cut, r0 * Math.cos(t), r0 * Math.sin(t))), n));
    }
    for (let j = 0; j < SEG_R; j++) g.tri(c, ring[j], ring[(j + 1) % SEG_R]);
  }
  return g.geometry();
}

function addBall(g, c, r) {
  const LAT = 6, LON = 10;
  const rows = [];
  for (let i = 0; i <= LAT; i++) {
    const a = (i / LAT) * Math.PI;
    const row = [];
    for (let j = 0; j < LON; j++) {
      const b = (j / LON) * Math.PI * 2;
      const n = new THREE.Vector3(Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b));
      row.push(g.vert(c.clone().addScaledVector(n, r), n));
    }
    rows.push(row);
  }
  for (let i = 0; i < LAT; i++) {
    for (let j = 0; j < LON; j++) {
      const j2 = (j + 1) % LON;
      g.tri(rows[i][j], rows[i][j2], rows[i + 1][j2]);
      g.tri(rows[i][j], rows[i + 1][j2], rows[i + 1][j]);
    }
  }
}

// 点の並びを同じ太さのチューブにする。開いた線の端は球で丸める（線どうしが離れて見えないように）
function addTube(g, pts, closed, r) {
  const RADIAL = 10;
  const n = pts.length;
  if (n < 2) return;
  const T = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const next = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const t = next.clone().sub(prev);
    if (t.lengthSq() < 1e-16) t.copy(T[i - 1] ?? new THREE.Vector3(1, 0, 0));
    T.push(t.normalize());
  }
  const N = Math.abs(T[0].y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  N.addScaledVector(T[0], -N.dot(T[0])).normalize();
  const q = new THREE.Quaternion();
  const rings = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      q.setFromUnitVectors(T[i - 1], T[i]);
      N.applyQuaternion(q);
      N.addScaledVector(T[i], -N.dot(T[i])).normalize();
    }
    const B = new THREE.Vector3().crossVectors(T[i], N);
    const ring = [];
    for (let j = 0; j < RADIAL; j++) {
      const a = (j / RADIAL) * Math.PI * 2;
      const d = N.clone().multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      ring.push(g.vert(pts[i].clone().addScaledVector(d, r), d));
    }
    rings.push(ring);
  }
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const r1 = rings[i], r2 = rings[(i + 1) % n];
    for (let j = 0; j < RADIAL; j++) {
      const j2 = (j + 1) % RADIAL;
      g.tri(r1[j], r1[j2], r2[j2]);
      g.tri(r1[j], r2[j2], r2[j]);
    }
  }
  if (!closed) {
    addBall(g, pts[0], r);
    addBall(g, pts[n - 1], r);
  }
}

/** 形と線の太さから、球・赤い線・青い線のジオメトリを作る（表示と3D保存で共用） */
export function buildGeometries(shape, line) {
  const head = buildHead(shape, line * LIFT);
  const red = new GeoBuilder(), blue = new GeoBuilder();
  for (const l of head.lines) addTube(l.color === RED ? red : blue, l.pts.map(v3), l.closed, line);
  return { head, sphere: sphereGeometry(head.solid), red: red.geometry(), blue: blue.geometry() };
}

/* ---------- 表示 ---------- */

export class HeadView {
  /**
   * @param {HTMLElement} host       canvas を入れる要素
   * @param {HTMLElement} labelHost  番号ラベルを並べる要素（host と同じ大きさで重ねる）
   */
  constructor(host, labelHost) {
    this.host = host;
    this.labelHost = labelHost;
    this.onViewChange = null;
    this.onGestureStart = null;   // 回す・動かす・拡大の1回ぶんが始まったとき（ひとつ前に戻す用）
    this.display = { sphere: true, labels: true };
    this.zoom = 1;

    const renderer = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.appendChild(renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 0, DIST);
    this.camera.updateMatrixWorld();   // 描画前でも画面座標の計算に使うため

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(-2.5, 3, 4);
    this.scene.add(key);

    const steps = new Uint8Array([150, 205, 255]);   // 3段のトーン（マンガのかげ）
    const gradient = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;

    this.head = new THREE.Group();
    this.scene.add(this.head);
    // 球はまず奥行きだけ書き（裏側の線を隠す）、線を描いたあと半透明で色を重ねる（下絵が透けて見える）
    this.sphereDepth = new THREE.Mesh(undefined, new THREE.MeshBasicMaterial({ colorWrite: false }));
    this.sphereDepth.renderOrder = -1;
    this.sphere = new THREE.Mesh(undefined, new THREE.MeshToonMaterial({
      color: COLORS.gray, gradientMap: gradient, transparent: true, opacity: SPHERE_OPACITY, depthWrite: false,
    }));
    this.redLines = new THREE.Mesh(undefined, new THREE.MeshBasicMaterial({ color: COLORS.red }));
    this.blueLines = new THREE.Mesh(undefined, new THREE.MeshBasicMaterial({ color: COLORS.blue }));
    this.head.add(this.sphereDepth, this.sphere, this.redLines, this.blueLines);

    this.applyColors();

    this.labels = {};
    this.labelState = [];
    for (const id of Object.keys(LABEL_TEXT)) {
      const el = document.createElement('span');
      el.className = `guide-label guide-label--${LABEL_COLOR[id]}`;
      el.textContent = LABEL_TEXT[id];
      labelHost.appendChild(el);
      this.labels[id] = el;
    }

    this.resetView(false);
    this.bindPointer();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
  }

  /* --- 形・表示 --- */

  setShape(shape, line) {
    const built = buildGeometries(shape, line);
    for (const m of [this.sphereDepth, this.redLines, this.blueLines]) m.geometry?.dispose();
    this.headData = built.head;
    this.sphereDepth.geometry = built.sphere;
    this.sphere.geometry = built.sphere;
    this.redLines.geometry = built.red;
    this.blueLines.geometry = built.blue;
    this.requestRender();
  }

  applyColors() {
    readThemeColors();
    this.sphere.material.color.set(COLORS.gray);
    this.redLines.material.color.set(COLORS.red);
    this.blueLines.material.color.set(COLORS.blue);
    this.requestRender();
  }

  setDisplay({ sphere, labels }) {
    this.display = { sphere: !!sphere, labels: !!labels };
    this.sphereDepth.visible = this.sphere.visible = this.display.sphere;
    this.requestRender();
  }

  /* --- 向き・位置・拡大 --- */

  resetView(notify = true) {
    this.head.quaternion.identity();
    this.head.position.set(0, HOME_Y, 0);
    this.zoom = 1;
    this.applyCamera();
    if (notify) this.changed();
  }

  // 縦軸まわりに deg 度回した向きにする（位置と拡大はそのまま）
  setYaw(deg) {
    this.head.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(deg));
    this.changed();
  }

  isYaw(deg) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(deg));
    return this.head.quaternion.angleTo(q) < THREE.MathUtils.degToRad(2);
  }

  getView() {
    const q = this.head.quaternion, p = this.head.position;
    return { q: [q.x, q.y, q.z, q.w], pos: [p.x, p.y], zoom: this.zoom };
  }

  setView(v) {
    const ok = (a, n) => Array.isArray(a) && a.length === n && a.every(Number.isFinite);
    if (!v || !ok(v.q, 4) || !ok(v.pos, 2) || !Number.isFinite(v.zoom)) return;
    this.head.quaternion.set(...v.q).normalize();
    this.head.position.set(v.pos[0], v.pos[1], 0);
    this.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom));
    this.applyCamera();
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h);
    this.applyCamera();
  }

  // 画角は「頭が画面に収まる高さ」から決める（位置は動かさないのでパースは変わらない）
  applyCamera() {
    if (!this.width) return;
    const aspect = this.width / this.height;
    this.visibleH = Math.max(NEED_H, NEED_W / aspect);
    this.camera.aspect = aspect;
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(this.visibleH / 2 / DIST));
    this.camera.zoom = this.zoom;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  pxToWorld() {
    return this.visibleH / this.zoom / this.height;
  }

  headOnScreen() {
    const v = this.head.position.clone().project(this.camera);
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height };
  }

  // トラックボール: 頭の中心を中心とする仮想の球をつかんで回す。球の外側をなぞると画面の奥行き方向に回る（かしげ）
  ballVector(x, y) {
    const c = this.headOnScreen();
    const r = 0.45 * Math.min(this.width, this.height);
    let vx = (x - c.x) / r, vy = -(y - c.y) / r;
    const d2 = vx * vx + vy * vy;
    if (d2 > 1) {
      const d = Math.sqrt(d2);
      return new THREE.Vector3(vx / d, vy / d, 0);
    }
    return new THREE.Vector3(vx, vy, Math.sqrt(1 - d2));
  }

  rotateBetween(x0, y0, x1, y1) {
    const a = this.ballVector(x0, y0), b = this.ballVector(x1, y1);
    const q = new THREE.Quaternion().setFromUnitVectors(a, b);
    if (![q.x, q.y, q.z, q.w].every(Number.isFinite)) return;
    this.head.quaternion.premultiply(q).normalize();
  }

  panBy(dx, dy) {
    const k = this.pxToWorld();
    this.head.position.x += dx * k;
    this.head.position.y -= dy * k;
  }

  // (x, y) の下にある点が動かないように拡大する
  zoomAt(factor, x, y) {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom * factor));
    const f = next / this.zoom;
    if (f === 1) return;
    const mx = x - this.width / 2, my = y - this.height / 2;
    this.zoom = next;
    this.applyCamera();
    this.panBy(mx * (1 - f), my * (1 - f));
  }

  bindPointer() {
    const el = this.renderer.domElement;
    el.style.touchAction = 'none';
    const pts = new Map();
    let mode = null, last = null, pinch = null, moved = false, lastWheel = 0;
    const local = (e) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const pinchInfo = () => {
      const [a, b] = [...pts.values()];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
    };

    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      try { el.setPointerCapture(e.pointerId); } catch { /* つかめなくても操作は続ける */ }
      pts.set(e.pointerId, local(e));
      if (pts.size === 1) {
        moved = false;
        mode = e.button === 2 || e.button === 1 || e.shiftKey ? 'pan' : 'rotate';
        last = local(e);
      } else if (pts.size === 2) {
        mode = 'pinch';
        pinch = pinchInfo();
      }
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const p = local(e);
      pts.set(e.pointerId, p);
      if (mode && !moved) { moved = true; this.onGestureStart?.(); }
      if (mode === 'rotate') {
        this.rotateBetween(last.x, last.y, p.x, p.y);
        last = p;
      } else if (mode === 'pan') {
        this.panBy(p.x - last.x, p.y - last.y);
        last = p;
      } else if (mode === 'pinch' && pts.size >= 2) {
        const now = pinchInfo();
        this.panBy(now.x - pinch.x, now.y - pinch.y);
        if (pinch.d > 0 && now.d > 0) this.zoomAt(now.d / pinch.d, now.x, now.y);
        pinch = now;
      } else return;
      this.changed();
    });
    const end = (e) => {
      if (!pts.delete(e.pointerId)) return;
      if (pts.size === 1 && mode === 'pinch') {
        mode = 'rotate';                 // 指を1本離したら、残った指で回す（その位置から）
        last = [...pts.values()][0];
      } else if (pts.size === 0) mode = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.timeStamp - lastWheel > 500) this.onGestureStart?.();   // 続けて回したホイールは1回ぶん
      lastWheel = e.timeStamp;
      const p = local(e);
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      this.zoomAt(Math.exp(-dy * 0.0015), p.x, p.y);
      this.changed();
    }, { passive: false });
  }

  changed() {
    this.requestRender();
    this.onViewChange?.();
  }

  /* --- 3点合わせ（目尻×2＋あご先） --- */

  // 頭のローカル（仕様の座標）の点 p を、向き q・位置 (px, py)・拡大 zoom のときの画面座標へ
  projectPose(p, q, px, py, zoom) {
    const v = v3(p).applyQuaternion(q);
    const x = v.x + px, y = v.y + py, depth = DIST - v.z;
    const f = zoom / Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const nx = ((f / this.camera.aspect) * x) / depth, ny = (f * y) / depth;
    return { x: ((nx + 1) / 2) * this.width, y: ((1 - ny) / 2) * this.height };
  }

  /**
   * 画面上の3点（targets = [目尻, 目尻, あご先]、px）に頭の目印が重なるように、向き・位置・拡大を決めて反映する。
   * 3点だけでは「上向き／下向き」などが決まらないことがあるので、合う答えのうち今の向きにいちばん近いものを選ぶ。
   * refine = true（点をドラッグ中）は、今の向きから少し動かすだけ。
   * @returns {{ err: number, choices: number }} 合わせたあとのずれ（px、3点の平均）と、同じくらい合う別の向きの数（自分を含む）
   */
  fitToPoints(targets, refine = false) {
    const lm = this.headData?.landmarks;
    if (!lm || targets.length < 3 || !this.width) return { err: Infinity, choices: 0 };
    const q0 = this.head.quaternion.clone();
    const pos0 = this.head.position;
    const assigns = refine && this.fitAssign ? [this.fitAssign] : [[0, 1], [1, 0]];
    const starts = refine ? [new THREE.Quaternion()] : [[0, 0], [30, 0], [-30, 0], [0, 25], [0, -25], [30, 20], [-30, 20], [30, -20], [-30, -20]]
      .map(([yaw, pitch]) => new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(pitch), THREE.MathUtils.degToRad(yaw), 0)));

    const front = new THREE.Vector3(0, 0, 1);   // 顔の正面（three.js の +Z）
    let best = null;
    const results = [];
    for (const assign of assigns) {
      const P = [lm.eyes[assign[0]], lm.eyes[assign[1]], lm.chin];
      for (const s of starts) {
        const qi = s.clone().multiply(q0);
        const r = this.solvePose(P, targets, qi, pos0.x, pos0.y, this.zoom, refine);
        r.assign = assign;
        r.facing = front.clone().applyQuaternion(r.q).z;
        r.dist = r.q.angleTo(q0);
        results.push(r);
        if (!best || r.err < best.err) best = r;
      }
    }
    // ずれが小さい答えのうち、顔がこちらを向いていて、今の向きに近いもの
    const ok = results.filter((r) => r.err <= Math.max(2, best.err * 1.5) && r.facing > -0.1);
    ok.sort((a, b) => a.dist - b.dist);
    // 同じ向き（8°以内）は1つにまとめる。残りが「別の向き」の候補
    const choices = [];
    for (const r of ok.length ? ok : [best]) {
      if (!choices.some((c) => c.q.angleTo(r.q) < THREE.MathUtils.degToRad(8))) choices.push(r);
    }
    if (!refine) this.fitChoices = choices;
    const pick = choices[0];
    this.applyFit(pick);
    return { err: pick.err, choices: refine ? (this.fitChoices?.length ?? 1) : choices.length };
  }

  // 「別の向き」: 同じくらい合う、もう一方の答えに切り替える
  nextFitChoice() {
    const list = this.fitChoices;
    if (!list || list.length < 2) return;
    list.push(list.shift());
    this.applyFit(list[0]);
  }

  applyFit(pick) {
    this.fitAssign = pick.assign;
    this.head.quaternion.copy(pick.q);
    this.head.position.set(pick.px, pick.py, 0);
    this.zoom = pick.zoom;
    this.applyCamera();
    this.changed();
  }

  // 減衰つき最小二乗（Levenberg-Marquardt）。未知数は 回転の差分3・位置2・拡大(log)1 の6つ
  solvePose(P, T, qi, px0, py0, zoom0, refine) {
    const pose = (x) => {
      const w = new THREE.Vector3(x[0], x[1], x[2]);
      const ang = w.length();
      const dq = ang > 1e-12 ? new THREE.Quaternion().setFromAxisAngle(w.divideScalar(ang), ang) : new THREE.Quaternion();
      return { q: dq.multiply(qi), px: x[3], py: x[4], zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.exp(x[5]))) };
    };
    const resid = (x) => {
      const p = pose(x);
      const r = [];
      for (let i = 0; i < 3; i++) {
        const s = this.projectPose(P[i], p.q, p.px, p.py, p.zoom);
        r.push(s.x - T[i].x, s.y - T[i].y);
      }
      return r;
    };
    const cost = (r) => r.reduce((a, v) => a + v * v, 0);

    let x = [0, 0, 0, px0, py0, Math.log(zoom0)];
    if (!refine) {
      // 最初に位置と大きさだけざっと合わせる（3点の重心と広がり）
      const spread = (pts) => {
        const cx = (pts[0].x + pts[1].x + pts[2].x) / 3, cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
        return { cx, cy, r: Math.hypot(...pts.map((p) => Math.hypot(p.x - cx, p.y - cy))) || 1 };
      };
      const st = spread(T);
      const sm = spread(P.map((p) => this.projectPose(p, qi, px0, py0, zoom0)));
      const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom0 * (st.r / sm.r)));
      x[5] = Math.log(z);
      const sm2 = spread(P.map((p) => this.projectPose(p, qi, px0, py0, z)));
      const k = this.visibleH / z / this.height;
      x[3] += (st.cx - sm2.cx) * k;
      x[4] -= (st.cy - sm2.cy) * k;
    }

    let r = resid(x), c = cost(r), lambda = 1e-2;
    const H = 1e-5;
    for (let it = 0; it < (refine ? 15 : 60) && c > 1e-4; it++) {
      const J = [];
      for (let j = 0; j < 6; j++) {
        const xh = x.slice();
        xh[j] += H;
        const rh = resid(xh);
        J.push(rh.map((v, i) => (v - r[i]) / H));   // J[j][i] = ∂r_i/∂x_j
      }
      const A = [...Array(6)].map((_, a) => [...Array(6)].map((_, b) => J[a].reduce((s, v, i) => s + v * J[b][i], 0)));
      const g = [...Array(6)].map((_, a) => J[a].reduce((s, v, i) => s + v * r[i], 0));
      let improved = false;
      for (let tries = 0; tries < 8 && !improved; tries++) {
        const M = A.map((row, a) => row.map((v, b) => (a === b ? v * (1 + lambda) + 1e-9 : v)));
        const d = solveLinear(M, g.map((v) => -v));
        if (!d) { lambda *= 10; continue; }
        const xn = x.map((v, j) => v + d[j]);
        const rn = resid(xn), cn = cost(rn);
        if (cn < c) { x = xn; r = rn; c = cn; lambda = Math.max(1e-7, lambda / 3); improved = true; }
        else lambda *= 5;
      }
      if (!improved) break;
    }
    const p = pose(x);
    return { ...p, err: Math.sqrt(c / 3) };
  }

  /* --- 描画 --- */

  requestRender() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.renderNow();
    });
  }

  renderNow() {
    if (!this.width || !this.headData) return;
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
  }

  // 各ラベルは候補位置のうち「隠れていなくて、いちばんこちらを向いている」ものに出す
  updateLabels() {
    this.labelState = [];
    const on = this.display.labels;
    this.head.updateMatrixWorld();
    const cam = this.camera.position;
    const camLocal = this.head.worldToLocal(cam.clone());
    for (const [id, el] of Object.entries(this.labels)) {
      const cands = on ? this.headData.labels[id] ?? [] : [];
      let best = null;
      for (const c of cands) {
        const pl = v3(c.p);
        const pw = pl.clone().applyMatrix4(this.head.matrixWorld);
        const nw = v3(c.n).applyQuaternion(this.head.quaternion);
        const facing = nw.dot(cam.clone().sub(pw).normalize());
        const hidden = this.display.sphere && this.occluded(camLocal, pl);
        const score = facing - (hidden ? 10 : 0);
        if (!best || score > best.score) best = { score, hidden, pw, nw, t: c.t };
      }
      if (!best || best.hidden) {
        el.hidden = true;
        continue;
      }
      // ずらす向き: 線があればその横（外側か右上の側）、なければ外側
      const s = this.toScreen(best.pw);
      const sn = this.toScreen(best.pw.clone().addScaledVector(best.nw, 0.15));
      let nx = sn.x - s.x, ny = sn.y - s.y;
      const dn = Math.hypot(nx, ny);
      const side = dn > 4 ? [nx / dn, ny / dn] : [0.6, -0.8];
      let dx = side[0], dy = side[1];
      if (best.t) {
        const tw = v3(best.t).normalize().applyQuaternion(this.head.quaternion);
        const st = this.toScreen(best.pw.clone().addScaledVector(tw, 0.1));
        const tx = st.x - s.x, ty = st.y - s.y, dt = Math.hypot(tx, ty);
        if (dt > 1) {
          dx = -ty / dt; dy = tx / dt;
          if (dx * side[0] + dy * side[1] < 0) { dx = -dx; dy = -dy; }
        }
      }
      // ほかの番号と重なるときは、同じ向きにもう少し離す
      let x = s.x + dx * 14, y = s.y + dy * 14;
      for (let k = 0; k < 4 && this.labelState.some((o) => Math.hypot(o.x - x, o.y - y) < 19); k++) {
        x += dx * 11;
        y += dy * 11;
      }
      el.hidden = false;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      this.labelState.push({ text: LABEL_TEXT[id], el, x, y });
    }
  }

  toScreen(v) {
    const p = v.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * this.width, y: ((1 - p.y) / 2) * this.height };
  }

  // 頭のローカル座標で、カメラから点までの間に球（左右を切り、上・後ろを伸ばした形）があるか
  occluded(o3, target3) {
    const { width, cut, r0, top, back } = this.headData.solid;
    const toSpec = (v) => [v.x, -v.z, v.y];          // three.js → 仕様の座標
    const o = toSpec(o3), q = toSpec(target3);
    let d = [q[0] - o[0], q[1] - o[1], q[2] - o[2]];
    const dist = Math.hypot(...d);
    d = d.map((v) => v / dist);
    const at = (t) => [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
    const sy = (y) => (y > 0 ? back : 1), sz = (z) => (z > 0 ? top : 1);
    let hit = Infinity;
    // 曲面: 上下・前後の4つの区画ごとに楕円体として解き、その区画に当たった点だけ使う
    for (const by of new Set([1, back])) {
      for (const bz of new Set([1, top])) {
        const k = [1 / (width * width), 1 / (by * by), 1 / (bz * bz)];
        const a = k[0] * d[0] * d[0] + k[1] * d[1] * d[1] + k[2] * d[2] * d[2];
        const b = 2 * (k[0] * o[0] * d[0] + k[1] * o[1] * d[1] + k[2] * o[2] * d[2]);
        const c = k[0] * o[0] * o[0] + k[1] * o[1] * o[1] + k[2] * o[2] * o[2] - 1;
        const disc = b * b - 4 * a * c;
        if (disc < 0) continue;
        const sq = Math.sqrt(disc);
        for (const t of [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) {
          const p = at(t);
          if (t > 0 && Math.abs(p[0]) <= cut && sy(p[1]) === by && sz(p[2]) === bz) hit = Math.min(hit, t);
        }
      }
    }
    // 左右のふた
    if (Math.abs(d[0]) > 1e-9) {
      for (const sx of [cut, -cut]) {
        const t = (sx - o[0]) / d[0];
        const p = at(t);
        const yu = p[1] / sy(p[1]), zu = p[2] / sz(p[2]);
        if (t > 0 && yu * yu + zu * zu <= r0 * r0) hit = Math.min(hit, t);
      }
    }
    return hit < dist - 0.02;
  }
}

// 連立一次方程式 M d = b（部分ピボットのガウス消去）。解けないときは null
function solveLinear(M, b) {
  const n = b.length;
  const A = M.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (Math.abs(A[piv][c]) < 1e-14) return null;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k];
    }
  }
  const d = new Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = A[r][n];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * d[k];
    d[r] = s / A[r][r];
  }
  return d.every(Number.isFinite) ? d : null;
}
