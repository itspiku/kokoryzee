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

function buildCerebellum() {
  const g = new THREE.SphereGeometry(1, 64, 48);
  const pos = g.attributes.position;
  const sulc = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ridge = 0.5 + 0.5 * Math.sin(y * 46 + Math.sin(x * 4) * 1.5);
    const r = 1 + 0.045 * ridge;
    pos.setXYZ(i, x * 0.46 * r, y * 0.2 * r, z * 0.3 * r);
    sulc[i] = 1 - ridge * 0.8;
  }
  g.setAttribute('aSulc', new THREE.BufferAttribute(sulc, 1));
  g.computeVertexNormals();
  return g;
}

// ── shader ──
const VERT = /* glsl */ `
  attribute float aSulc;
  varying vec3 vPos; varying vec3 vN; varying vec3 vV; varying float vSulc;
  void main(){
    vPos = position;
    vSulc = aSulc;
    vec4 mv = modelViewMatrix * vec4(position,1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG = /* glsl */ `
  precision highp float;
  uniform vec4 uRegions[6];
  uniform float uAct[6];
  uniform vec3 uCols[6];
  uniform float uHeat; uniform float uAnat; uniform float uTime; uniform float uSel; uniform vec3 uBase;
  varying vec3 vPos; varying vec3 vN; varying vec3 vV; varying float vSulc;
  void main(){
    vec3 N = normalize(vN); vec3 V = normalize(vV);
    float fres = pow(1.0 - max(dot(N,V),0.0), 2.3);
    vec3 L1 = normalize(vec3(-0.55,0.85,0.65));
    vec3 L2 = normalize(vec3(0.7,0.1,-0.6));
    float dif = max(dot(N,L1),0.0)*0.62 + max(dot(N,L2),0.0)*0.22 + 0.34;
    vec3 col = uBase * dif;
    col *= 1.0 - 0.62*vSulc;
    vec3 hc = vec3(0.0); float hw = 0.0;
    vec3 anat = vec3(0.0);
    for(int i=0;i<6;i++){
      float d = distance(vPos, uRegions[i].xyz) / uRegions[i].w;
      float w = exp(-d*d*2.1);
      float a = uAct[i];
      vec3 lowC = vec3(0.30,0.42,0.88);
      vec3 midC = vec3(0.22,0.82,0.70);
      vec3 hiC  = vec3(1.0,0.72,0.32);
      vec3 c = a < 0.5 ? mix(lowC, midC, smoothstep(0.15,0.5,a)) : mix(midC, hiC, smoothstep(0.5,0.85,a));
      float sel = 1.0 + step(abs(uSel-float(i)),0.5) * (0.3 + 0.2*sin(uTime*3.4));
      float wt = w * (0.45 + 0.8*a) * sel;
      hc += c * wt; hw += wt;
      anat += uCols[i] * w * 0.7 * (1.0 + step(abs(uSel-float(i)),0.5)*0.6);
    }
    vec3 hcol = hc / max(hw, 0.0001);
    col = mix(col, hcol * (0.75 + 0.35*dif) * (1.0 - 0.45*vSulc), smoothstep(0.04, 0.55, hw) * 0.85 * uHeat);
    col += hcol * hw * 0.22 * uHeat;
    col = mix(col, anat * (0.7+0.4*dif) + col*0.35, clamp(length(anat),0.0,1.0) * uAnat);
    col += vec3(0.42,0.9,0.82) * fres * 0.62;
    float alpha = 0.8 + 0.2*fres;
    gl_FragColor = vec4(col, alpha);
  }
`;

