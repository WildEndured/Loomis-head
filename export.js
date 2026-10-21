// 保存（SPEC F7）。PNG = 今の見た目（下絵なし・透明背景・画面の2倍）、3D = GLB（実寸・Y-up・赤/青/灰）

import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildGeometries, COLORS } from 'scene.js';

const REAL_RADIUS = 0.09;   // 球の半径の実寸（m）
const PNG_SCALE = 2;

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** @param {import('./scene.js').HeadView} view */
export async function savePNG(view, labelFont) {
  const { renderer, width: w, height: h } = view;
  const prev = renderer.getPixelRatio();
  renderer.setPixelRatio(PNG_SCALE);
  renderer.setSize(w, h, false);
  view.renderNow();

  const out = document.createElement('canvas');
  out.width = Math.round(w * PNG_SCALE);
  out.height = Math.round(h * PNG_SCALE);
  const ctx = out.getContext('2d');
  ctx.drawImage(renderer.domElement, 0, 0, out.width, out.height);   // 描いた直後なのでバッファが読める

  // 番号（表示中のときだけ）。画面と同じ色・同じフチ
  ctx.scale(PNG_SCALE, PNG_SCALE);
  const halo = getComputedStyle(document.documentElement).getPropertyValue('--label-halo').trim() || '#fff';
  ctx.font = labelFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const l of view.labelState) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = halo;
    ctx.strokeText(l.text, l.x, l.y);
    ctx.fillStyle = getComputedStyle(l.el).color;
    ctx.fillText(l.text, l.x, l.y);
  }

  renderer.setPixelRatio(prev);
  renderer.setSize(w, h, false);
  view.renderNow();

  const blob = await new Promise((res) => out.toBlob(res, 'image/png'));
  if (!blob) throw new Error('PNG を作れませんでした');
  download(blob, `loomis-head-${stamp()}.png`);
}

const CLEAR_SPHERE = { color: '#ffffff', opacity: 0.55 };   // 半透明の球（クリスタで後ろに回った線を薄く見せる用）

/** GLB の中身を作る（ArrayBuffer）。パーツ: 球・（半透明の球）・赤い線・青い線 */
export async function buildGLB(shape, line, { clearSphere = false } = {}) {
  const g = buildGeometries(shape, line);
  const mat = (color, name, opts = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, ...opts });
    m.name = name;
    return m;
  };
  const root = new THREE.Group();
  root.name = 'loomis-head';
  const parts = [
    ['sphere', g.sphere, mat(COLORS.gray, 'gray')],
    ...(clearSphere ? [['sphere-clear', g.sphere.clone(), mat(CLEAR_SPHERE.color, 'clear', { transparent: true, opacity: CLEAR_SPHERE.opacity, depthWrite: false })]] : []),
    ['lines-red', g.red, mat(COLORS.red, 'red')],
    ['lines-blue', g.blue, mat(COLORS.blue, 'blue')],
  ];
  for (const [name, geo, m] of parts) {
    geo.scale(REAL_RADIUS, REAL_RADIUS, REAL_RADIUS);   // 実寸は頂点に直接入れる（読み込む側のノード変換の扱いに左右されない）
    geo.name = name;
    const mesh = new THREE.Mesh(geo, m);
    mesh.name = name;
    root.add(mesh);
  }

  const glb = await new GLTFExporter().parseAsync(root, { binary: true });
  for (const [, geo, m] of parts) { geo.dispose(); m.dispose(); }
  return glb;
}

export async function saveGLB(shape, line, opts) {
  const glb = await buildGLB(shape, line, opts);
  download(new Blob([glb], { type: 'model/gltf-binary' }), `loomis-head-${stamp()}.glb`);
}
