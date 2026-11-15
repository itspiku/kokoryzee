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

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createBrain(container, { onPick, theme = 'dark' } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  const home = new THREE.Vector3(-2.7, 1.05, 3.3);
  camera.position.copy(home);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 3.0;
  controls.maxDistance = 8;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.7;
  let resumeT = null;
  controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(resumeT); focusTween = null; });
  controls.addEventListener('end', () => { resumeT = setTimeout(() => (controls.autoRotate = true), 4500); });

  // mesh group
  const root = new THREE.Group();
  scene.add(root);

  const regions = BRAIN_REGIONS;
  const uRegions = regions.map((r) => new THREE.Vector4(r.pos[0], r.pos[1], r.pos[2], r.r));
  const uniforms = {
    uRegions: { value: uRegions },
    uAct: { value: new Array(6).fill(0.5) },
    uCols: { value: regions.map((r) => new THREE.Color(r.color)) },
    uHeat: { value: 1 },
    uAnat: { value: 0 },
    uTime: { value: 0 },
    uSel: { value: -1 },
    uBase: { value: new THREE.Color(0.5, 0.64, 0.64) },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: true });
  const cortexGeo = buildCortex(40);
  const cortex = new THREE.Mesh(cortexGeo, mat);
  cortex.renderOrder = 2;
  root.add(cortex);

  const cere = new THREE.Mesh(buildCerebellum(), new THREE.ShaderMaterial({ uniforms: { ...uniforms, uBase: { value: new THREE.Color(0.4, 0.55, 0.57) } }, vertexShader: VERT, fragmentShader: FRAG, transparent: true }));
  cere.position.set(0, -0.36, -0.78);
  cere.renderOrder = 2;
  root.add(cere);
  const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.42, 6, 16), new THREE.MeshBasicMaterial({ color: 0x46666a, transparent: true, opacity: 0.85 }));
  stem.position.set(0, -0.52, -0.3);
  stem.rotation.x = 0.35;
  root.add(stem);

  // deep glows
  const dot = dotTexture();
  const glows = regions.map((r) => {
    if (!r.deep) return null;
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: new THREE.Color(r.color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
    m.position.set(...r.pos);
    m.scale.setScalar(r.r * 1.9);
    m.renderOrder = 1;
    root.add(m);
    return m;
  });

  // ── find surface anchors by raycasting from outside toward the centre ──
  const ray = new THREE.Raycaster();
  const anchors = regions.map((r) => {
    const dir = new THREE.Vector3(...r.pos).normalize();
    ray.set(dir.clone().multiplyScalar(4), dir.clone().negate());
    const hit = ray.intersectObject(cortex)[0];
    return hit ? { p: hit.point.clone(), n: hit.face.normal.clone().transformDirection(cortex.matrixWorld) } : { p: new THREE.Vector3(...r.pos), n: dir };
  });

  // TMS marker at DLPFC
  const tms = new THREE.Group();
  const di = regions.findIndex((r) => r.id === 'dlpfc');
  const a = anchors[di];
  const tmsMat = new THREE.MeshBasicMaterial({ color: 0xffc46a, transparent: true, opacity: 0.95 });
  const coil1 = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 12, 48), tmsMat);
  const coil2 = coil1.clone();
  coil1.position.x = -0.1; coil2.position.x = 0.1;
  const coilG = new THREE.Group();
  coilG.add(coil1, coil2);
  coilG.position.set(0, 0, 0.17);
  const stemLine = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 8), new THREE.MeshBasicMaterial({ color: 0xffc46a, transparent: true, opacity: 0.5 }));
  stemLine.rotation.x = Math.PI / 2; stemLine.position.z = 0.17;
  const pulse = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.006, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.8 }));
  tms.add(coilG, stemLine, pulse);
  tms.position.copy(a.p);
  tms.lookAt(a.p.clone().add(a.n));
  tms.renderOrder = 4;
  root.add(tms);

  // ── connectivity ──
  const linkGroup = new THREE.Group();
  root.add(linkGroup);
  let linkObjs = [];
  const curves = {};
  function setLinks(links) {
    linkObjs.forEach((o) => { linkGroup.remove(o.line); o.line.geometry.dispose(); });
    linkObjs = [];
    links.forEach((l, k) => {
      const ia = regions.findIndex((r) => r.id === l.a), ib = regions.findIndex((r) => r.id === l.b);
      const A = new THREE.Vector3(...regions[ia].pos), B = new THREE.Vector3(...regions[ib].pos);
      const mid = A.clone().add(B).multiplyScalar(0.5);
      const out = mid.clone().normalize().multiplyScalar(0.28);
      mid.add(out);
      const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: new THREE.Color(regions[ia].color).lerp(new THREE.Color(regions[ib].color), 0.5), transparent: true, opacity: 0.15 + l.w * 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
      line.renderOrder = 3;
      linkGroup.add(line);
      linkObjs.push({ line, curve, w: l.w, speed: 0.12 + l.w * 0.25, off: (k * 0.37) % 1 });
    });
    const pts = new Float32Array(linkObjs.length * 3);
    pulsePts.geometry.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  }
  const pulsePts = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: dot, size: 0.14, color: 0xcffff2, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  pulsePts.renderOrder = 5;
  pulsePts.frustumCulled = false;
  root.add(pulsePts);

  // ── ambient dust ──
  const dust = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(Array.from({ length: 150 * 3 }, () => (Math.random() - 0.5) * 6)), 3)),
    new THREE.PointsMaterial({ map: dot, size: 0.05, color: 0x9fe3d3, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scene.add(dust);

  // ── state ──
  let layer = 'activity';
  let selected = -1;
  let target = new Array(6).fill(0.5);
  let focusTween = null;
  let running = true;

  function setActivity(map) {
    target = regions.map((r) => map[r.id] ?? 0.5);
  }
  function setLayer(l) {
    layer = l;
    linkGroup.visible = l === 'connectivity';
    pulsePts.visible = l === 'connectivity';
  }
  function select(id) {
    selected = regions.findIndex((r) => r.id === id);
    uniforms.uSel.value = selected;
  }
  function focus(id) {
    const i = regions.findIndex((r) => r.id === id);
    if (i < 0) return;
    const dir = (anchors[i] ? anchors[i].p.clone() : new THREE.Vector3(...regions[i].pos)).normalize();
    const to = dir.multiplyScalar(regions[i].deep ? 4.4 : 4.1).add(new THREE.Vector3(dir.x * 0.4, 0.4, 0));
    focusTween = { from: camera.position.clone(), to, t: 0 };
    controls.autoRotate = false;
    clearTimeout(resumeT);
    resumeT = setTimeout(() => (controls.autoRotate = true), 6000);
  }
  function resetView() {
    focusTween = { from: camera.position.clone(), to: home.clone(), t: 0 };
  }

  // ── picking ──
  let down = null;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  el.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 400;
    down = null;
    if (moved > 6 || !quick) return;
    const r = el.getBoundingClientRect();
    const m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(m, camera);
    const hit = ray.intersectObject(cortex)[0];
    if (!hit) return onPick?.(null);
    let best = -1, bd = 1e9;
    regions.forEach((rg, i) => {
      const d = hit.point.distanceTo(new THREE.Vector3(...rg.pos)) / rg.r;
      if (d < bd) { bd = d; best = i; }
    });
    onPick?.(bd < 1.5 ? regions[best].id : null);
  });

  // ── resize + loop ──
  function resize() {
    const w = container.clientWidth || 300, h = container.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const clock = new THREE.Clock();
  let raf = 0;
  const tmp = new THREE.Vector3();
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!running) return;
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    uniforms.uTime.value = t;
    // ease activity
    const cur = uniforms.uAct.value;
    for (let i = 0; i < 6; i++) cur[i] += (target[i] - cur[i]) * Math.min(1, dt * 4);
    uniforms.uHeat.value += ((layer === 'activity' ? 1 : layer === 'connectivity' ? 0.35 : 0) - uniforms.uHeat.value) * Math.min(1, dt * 5);
    uniforms.uAnat.value += ((layer === 'anatomy' ? 1 : 0) - uniforms.uAnat.value) * Math.min(1, dt * 5);
    glows.forEach((g, i) => {
      if (!g) return;
      const s = regions[i].r * (1.6 + cur[i] * 1.2) * (1 + 0.08 * Math.sin(t * 2 + i) + (selected === i ? 0.25 : 0));
      g.scale.setScalar(s);
      g.material.opacity = (0.15 + 0.6 * cur[i]) * (layer === 'activity' || layer === 'anatomy' ? 1 : 0.55);
    });
    // tms pulse
    const ps = 1 + ((t * 0.9) % 1) * 1.4;
    pulse.scale.setScalar(ps);
    pulse.material.opacity = 0.8 * (1 - ((t * 0.9) % 1));
    // links pulses
    if (linkObjs.length && linkGroup.visible) {
      const arr = pulsePts.geometry.attributes.position.array;
      linkObjs.forEach((o, i) => {
        const u = (t * o.speed + o.off) % 1;
        o.curve.getPoint(u, tmp);
        arr[i * 3] = tmp.x; arr[i * 3 + 1] = tmp.y; arr[i * 3 + 2] = tmp.z;
      });
      pulsePts.geometry.attributes.position.needsUpdate = true;
    }
    dust.rotation.y += dt * 0.02;
    if (focusTween) {
      focusTween.t = Math.min(1, focusTween.t + dt / 1.0);
      const k = 1 - Math.pow(1 - focusTween.t, 3);
      camera.position.lerpVectors(focusTween.from, focusTween.to, k);
      if (focusTween.t >= 1) focusTween = null;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  return {
    setActivity, setLayer, setLinks, select, focus, resetView,
    setRunning: (v) => (running = v),
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      clearTimeout(resumeT);
      controls.dispose();
      scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
