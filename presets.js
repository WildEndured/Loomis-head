// プリセット値（SPEC §8 の仮値。実装後に見た目で調整する）
// 書いていないキーは「標準」（SHAPE_PARAMS の初期値）になる。

import { defaultShape } from './loomis.js';

export const PRESETS = [
  { id: 'standard', label: '標準',       values: { r0: 0.68, eye: 0.0,   jaw_len: 0.40, jaw_x: 0.62, chin_len: 1.0,  chin_w: 0.22 } },
  { id: 'youth',    label: '少年・青年', values: { r0: 0.70, eye: -0.1,  jaw_len: 0.45, jaw_x: 0.60, chin_len: 1.05, chin_w: 0.18 } },
  { id: 'girl',     label: '少女',       values: { r0: 0.64, eye: -0.35, jaw_len: 0.30, jaw_x: 0.55, chin_len: 0.85, chin_w: 0.16 } },
  { id: 'child',    label: '子ども',     values: { r0: 0.58, eye: -0.6,  jaw_len: 0.20, jaw_x: 0.60, chin_len: 0.65, chin_w: 0.25 } },
];

export function presetShape(id) {
  const p = PRESETS.find((x) => x.id === id) ?? PRESETS[0];
  return { ...defaultShape(), ...p.values };
}
