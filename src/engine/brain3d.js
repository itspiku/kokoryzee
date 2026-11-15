// Procedural brain for the digital-twin workspace (three.js) ──
// A stylised cortex generated from noise-folded geometry, with a shader that paints
// region-level *proxy* activity, a TMS-target marker and connectivity pulses.
// It is a generic template — explicitly not the patient's own scan.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BRAIN_REGIONS } from '../data/content.js';
import { mulberry32, smoothstep, clamp } from '../lib/util.js';

// ── simplex noise (3D) ──
const G3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
const perm = new Uint8Array(512);
(() => {
  const r = mulberry32(20241);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();
function noise3(xin, yin, zin) {
  const F3 = 1 / 3, G = 1 / 6;
  const s = (xin + yin + zin) * F3;
  const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
  const t = (i + j + k) * G;
  const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
  let i1, j1, k1, i2, j2, k2;
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
    else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
  } else if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
  else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
  else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
  const x1 = x0 - i1 + G, y1 = y0 - j1 + G, z1 = z0 - k1 + G;
  const x2 = x0 - i2 + 2 * G, y2 = y0 - j2 + 2 * G, z2 = z0 - k2 + 2 * G;
  const x3 = x0 - 1 + 3 * G, y3 = y0 - 1 + 3 * G, z3 = z0 - 1 + 3 * G;
  const ii = i & 255, jj = j & 255, kk = k & 255;
  const corner = (x, y, z, gi) => {
    let t = 0.6 - x * x - y * y - z * z;
    if (t < 0) return 0;
    t *= t;
    const g = G3[gi % 12];
    return t * t * (g[0] * x + g[1] * y + g[2] * z);
  };
  const n0 = corner(x0, y0, z0, perm[ii + perm[jj + perm[kk]]]);
  const n1 = corner(x1, y1, z1, perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]]);
  const n2 = corner(x2, y2, z2, perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]]);
  const n3 = corner(x3, y3, z3, perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]]);
  return 32 * (n0 + n1 + n2 + n3);
}
const ridged = (x, y, z, f, o) => 1 - Math.abs(noise3(x * f + o, y * f + o * 0.7, z * f + o * 1.3));

// ── geometry ──
function buildCortex(detail = 40) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4);
  const pos = g.attributes.position;
  const n = pos.count;
  const sulc = new Float32Array(n);
  const SX = 0.8, SY = 0.66, SZ = 1.08;
  for (let i = 0; i < n; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    let X = px * SX, Y = py * SY, Z = pz * SZ;
    // flatter underside, temporal bulge, tapered poles
    if (Y < 0) Y *= 0.62;
    const temporal = smoothstep(-0.1, -0.42, Y) * Math.exp(-(((pz - 0.1) / 0.5) ** 2));
    X *= 1 + 0.16 * temporal;
    Y -= 0.04 * temporal;
    X *= 1 - 0.24 * smoothstep(0.45, 1, pz);
    X *= 1 - 0.12 * smoothstep(0.5, 1, -pz);
    Y *= 1 - 0.1 * smoothstep(0.6, 1, pz);
    // longitudinal fissure
    const fis = Math.exp(-((X / 0.05) ** 2)) * smoothstep(-0.12, 0.35, Y);
    Y -= 0.12 * fis;
    X += Math.sign(X || 1) * 0.028 * fis;
    // gyri (smooth hills) separated by sharp sulci (creases where noise crosses zero)
    const n1 = Math.abs(noise3(px * 2.4, py * 2.4, pz * 2.4));
    const n2 = Math.abs(noise3(px * 5.0 + 7, py * 5.0 + 3, pz * 5.0 + 9));
    const mix = 0.66 * n1 + 0.34 * n2;
    const d = clamp(Math.pow(mix, 0.62) / 0.62);
    const crease = 1 - smoothstep(0, 0.14, mix);
    // lateral (Sylvian) fissure
    const syl = Math.exp(-(((Y - (-0.1 + 0.1 * Z)) / 0.05) ** 2)) * smoothstep(0.3, 0.6, Math.abs(X)) * smoothstep(-0.75, 0.15, Z);
    // outward direction of the ellipsoid
    let nx = X / (SX * SX), ny = Y / (SY * SY), nz = Z / (SZ * SZ);
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    const disp = 0.09 * d - 0.07 * syl - 0.03 * fis;
    pos.setXYZ(i, X + nx * disp, Y + ny * disp, Z + nz * disp);
    sulc[i] = clamp(crease * 0.95 + (1 - d) * 0.25 + syl * 0.8 + fis * 0.6);
  }
  g.setAttribute('aSulc', new THREE.BufferAttribute(sulc, 1));
  g.computeVertexNormals();
  return g;
}

