// Geometry builders: board profiles, profiled sheet and standing seam, polygon offsets, tubes, merging helpers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mulberry } from './materials.js';

// ---------------------------------------------------------------- batching
/**
 * Collects geometries per material key, merges them on build(). Every geometry gets the same set of
 * attributes (position, normal, uv, color) so they can be merged.
 */
export class Batch {
  constructor() {
    this.parts = new Map();
  }
  add(key, geo, matrix, tint = 1) {
    const g = normaliseAttrs(geo);
    if (matrix) g.applyMatrix4(matrix);
    if (tint !== 1) {
      const c = g.attributes.color;
      for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * tint, c.getY(i) * tint, c.getZ(i) * tint);
    }
    const k = key + (g.index ? '|i' : '|n');
    if (!this.parts.has(k)) this.parts.set(k, []);
    this.parts.get(k).push(g);
    return g;
  }
  build(materials, { castShadow = true, receiveShadow = true } = {}) {
    const group = new THREE.Group();
    for (const [k, geos] of this.parts) {
      const key = k.slice(0, -2);
      const mat = materials[key];
      if (!mat) {
        console.warn('no material', key);
        continue;
      }
      const g = mergeGeometries(geos, false);
      geos.forEach((x) => x.dispose());
      const m = new THREE.Mesh(g, mat);
      m.name = key;
      m.castShadow = castShadow && !mat.userData.noShadow;
      m.receiveShadow = receiveShadow;
      group.add(m);
    }
    this.parts.clear();
    return group;
  }
}

function normaliseAttrs(geo) {
  const g = geo;
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.attributes.color) {
    const a = new Float32Array(g.attributes.position.count * 3).fill(1);
    g.setAttribute('color', new THREE.Float32BufferAttribute(a, 3));
  }
  g.morphAttributes = {};
  g.groups = [];
  return g;
}

// ---------------------------------------------------------------- transforms
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
export function M(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(s, s, s));
}

/** Box with metre UVs on every face (u along the longest in-plane axis). */
export function box(w, h, d, { round = 0, seg = 2 } = {}) {
  const g = round > 0 ? new RoundedBoxGeometry(w, h, d, seg, Math.min(round, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)) : new THREE.BoxGeometry(w, h, d);
  metreUV(g);
  return g;
}

/** Planar-projected UVs in metres, projection picked per triangle from the normal. Grain follows the longest axis. */
export function metreUV(g, { grainAxis } = {}) {
  const p = g.attributes.position, n = g.attributes.normal;
  g.computeBoundingBox();
  const s = g.boundingBox.getSize(new THREE.Vector3());
  const ax = grainAxis || (s.x >= s.y && s.x >= s.z ? 'x' : s.y >= s.z ? 'y' : 'z');
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let u, v;
    // texture grain runs along image V; map the grain axis to V
    if (nx >= ny && nx >= nz) [u, v] = ax === 'y' ? [z, y] : [y, z];
    else if (ny >= nz) [u, v] = ax === 'x' ? [z, x] : [x, z];
    else [u, v] = ax === 'x' ? [y, x] : [x, y];
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// ---------------------------------------------------------------- timber
/**
 * Cross-section profiles in the (z = outward, y = up) plane. Each edge: [p0, p1, n0, n1].
 * kind: 'planed' (строганный, rounded arrises), 'profiled' (профилированный, chamfered outer face),
 * 'board' (thin board, small round)
 */
function profileEdges(w, h, kind) {
  const E = [];
  const arc = (cx, cy, r, a0, a1, n = 4) => {
    for (let i = 0; i < n; i++) {
      const t0 = a0 + ((a1 - a0) * i) / n, t1 = a0 + ((a1 - a0) * (i + 1)) / n;
      const p0 = [cx + Math.cos(t0) * r, cy + Math.sin(t0) * r], p1 = [cx + Math.cos(t1) * r, cy + Math.sin(t1) * r];
      E.push([p0, p1, [Math.cos(t0), Math.sin(t0)], [Math.cos(t1), Math.sin(t1)]]);
    }
  };
  const flat = (p0, p1) => {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    const l = Math.hypot(dx, dy);
    const n = [dy / l, -dx / l];
    E.push([p0, p1, n, n]);
  };
  const z0 = -w / 2, z1 = w / 2;
  if (kind === 'profiled') {
    // outer face with 45° chamfers top & bottom (V-groove between courses), small rounds inside
    const c = Math.min(0.018, h * 0.12), r = 0.004;
    flat([z1 - c, 0], [z1, c]);
    flat([z1, c], [z1, h - c]);
    flat([z1, h - c], [z1 - c, h]);
    flat([z1 - c, h], [z0 + r, h]);
    arc(z0 + r, h - r, r, Math.PI / 2, Math.PI, 3);
    flat([z0, h - r], [z0, r]);
    arc(z0 + r, r, r, Math.PI, Math.PI * 1.5, 3);
    flat([z0 + r, 0], [z1 - c, 0]);
  } else {
    const r = kind === 'board' ? Math.min(0.003, h / 4, w / 4) : Math.min(0.007, h / 5, w / 5);
    const segs = kind === 'board' ? 2 : 4;
    // counter-clockwise when looking from +x: bottom → outer → top → inner
    flat([z0 + r, 0], [z1 - r, 0]);
    arc(z1 - r, r, r, -Math.PI / 2, 0, segs);
    flat([z1, r], [z1, h - r]);
    arc(z1 - r, h - r, r, 0, Math.PI / 2, segs);
    flat([z1 - r, h], [z0 + r, h]);
    arc(z0 + r, h - r, r, Math.PI / 2, Math.PI, segs);
    flat([z0, h - r], [z0, r]);
    arc(z0 + r, r, r, Math.PI, Math.PI * 1.5, segs);
  }
  // fix bottom edge normals: computed normal of [p0->p1] is (dy, -dx) → for bottom going +z: (0,-1)? ensure outward
  return E;
}

/**
 * A beam along +X from x=0 to x=len, section w (z) × h (y), bottom at y=0, centred in z.
 * opts: kind, rnd (random fn) for UV offset & colour variation, endShade, capStart, capEnd,
 * cutStart / cutEnd: slope of an angled end cut (dx per metre of y), used for gable ends.
 */
export function beam(len, w, h, opts = {}) {
  const kind = opts.kind || 'planed';
  const rnd = opts.rnd || Math.random;
  const E = profileEdges(w, h, kind);
  const pos = [], nor = [], uv = [], col = [];
  const ou = rnd() * 4, ov = rnd() * 4;
  const shade = opts.shade ?? 0.9 + rnd() * 0.18;
  const cs = opts.cutStart || 0, ce = opts.cutEnd || 0;
  const xs = (y) => cs * y, xe = (y) => len - ce * y;
  let per = 0;
  for (const [p0, p1, n0, n1] of E) {
    const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const v0 = per, v1 = per + l;
    per += l;
    const a = [xs(p0[1]), p0[1], p0[0]], b = [xe(p0[1]), p0[1], p0[0]];
    const c = [xe(p1[1]), p1[1], p1[0]], d = [xs(p1[1]), p1[1], p1[0]];
    const na = [0, n0[1], n0[0]], nb = [0, n1[1], n1[0]];
    // two triangles a b c, a c d — winding so the face points along the normal
    const quad = [
      [a, na, a[0], v0], [c, nb, c[0], v1], [b, na, b[0], v0],
      [a, na, a[0], v0], [d, nb, d[0], v1], [c, nb, c[0], v1],
    ];
    for (const [p, n, u, v] of quad) {
      pos.push(...p);
      nor.push(...n);
      // grain (image V) along the beam
      uv.push(v + ou, u + ov);
      col.push(shade, shade, shade);
    }
  }
  // end caps (end grain, darker)
  const capShade = shade * (opts.endShade ?? 0.72);
  const ring = E.map((e) => e[0]);
  const tris = THREE.ShapeUtils.triangulateShape(ring.map((p) => new THREE.Vector2(p[0], p[1])), []);
  const cap = (atEnd) => {
    const nx = atEnd ? 1 : -1;
    for (const t of tris) {
      const idx = atEnd ? t : [t[0], t[2], t[1]];
      for (const k of idx) {
        const p = ring[k];
        const x = atEnd ? xe(p[1]) : xs(p[1]);
        pos.push(x, p[1], p[0]);
        // angled cut (x = len - ce*y at the end, x = cs*y at the start)
        const n = new THREE.Vector3(nx, atEnd ? ce : cs, 0).normalize();
        nor.push(n.x, n.y, n.z);
        uv.push(p[0] * 3 + ou, p[1] * 3 + ov);
        col.push(capShade, capShade * 0.97, capShade * 0.93);
      }
    }
  };
  if (opts.capStart !== false) cap(false);
  if (opts.capEnd !== false) cap(true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return fixWinding(g);
}

/** Makes every triangle's winding agree with its vertex normals (robust against profile orientation). */
export function fixWinding(g) {
  const p = g.attributes.position.array, n = g.attributes.normal.array;
  const uvA = g.attributes.uv.array, cA = g.attributes.color.array;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3(), vn = new THREE.Vector3();
  for (let t = 0; t < p.length / 9; t++) {
    const i = t * 9;
    a.fromArray(p, i);
    b.fromArray(p, i + 3);
    c.fromArray(p, i + 6);
    fn.subVectors(b, a).cross(c.clone().sub(a));
    vn.fromArray(n, i).add(new THREE.Vector3().fromArray(n, i + 3)).add(new THREE.Vector3().fromArray(n, i + 6));
    if (fn.dot(vn) < 0) {
      // swap vertex 1 and 2
      const sw = (arr, stride, base) => {
        for (let k = 0; k < stride; k++) {
          const t1 = arr[base + stride + k];
          arr[base + stride + k] = arr[base + 2 * stride + k];
          arr[base + 2 * stride + k] = t1;
        }
      };
      sw(p, 3, i);
      sw(n, 3, i);
      sw(uvA, 2, t * 6);
      sw(cA, 3, i);
    }
  }
  return g;
}

/** Thin board (trim, casing, fascia): beam with tiny round arrises. Along +X, centred in y and z. */
export function board(len, wid, thk, rnd, opts = {}) {
  const g = beam(len, thk, wid, { kind: 'board', rnd, shade: opts.shade ?? 1, endShade: opts.endShade ?? 0.9, ...opts });
  g.translate(0, -wid / 2, 0);
  return g;
}

// ---------------------------------------------------------------- roofing and wall sheets
/**
 * Standing-seam (фальцевая) sheet: x along the eave, z down the slope,
 * y out of the roof. Click-seam panels `module` wide: 25 mm seam with a rounded lock, two shallow stiffening
 * ribs in each pan. Indexed geometry, analytic normals, metre UVs.
 */
export function seamSheet(width, length, { module = 0.47, seamH = 0.025, seamW = 0.012, phase = 0.1 } = {}) {
  // one module of the cross-section (x, y), starting in the pan
  const prof = [];
  const s = seamW, h = seamH;
  const pan = module - s - 0.012;
  prof.push([0, 0], [0.004, 0]);
  for (const r of [0.33, 0.66]) {
    const c = pan * r;
    prof.push([c - 0.006, 0], [c - 0.003, 0.0012], [c + 0.003, 0.0012], [c + 0.006, 0]);
  }
  prof.push([pan, 0], [pan + 0.004, 0.003], [pan + 0.005, h * 0.75], [pan + 0.006, h - 0.003], [pan + 0.006 + s / 2, h],
    [pan + 0.006 + s, h - 0.003], [pan + 0.008 + s, h * 0.75], [pan + 0.009 + s, 0.003], [pan + 0.012 + s, 0]);
  const xs = [], ys = [];
  const n = Math.ceil((width + module) / module) + 1;
  for (let k = -1; k < n; k++)
    for (const [px, py] of prof) {
      const x = k * module + px - phase;
      if (x < 0 || x > width) continue;
      if (xs.length && x <= xs[xs.length - 1] + 1e-5) continue;
      xs.push(x);
      ys.push(py);
    }
  if (xs[0] > 0) { xs.unshift(0); ys.unshift(0); }
  if (xs[xs.length - 1] < width) { xs.push(width); ys.push(0); }
  const zs = [0, length];
  const nx = xs.length;
  const pos = new Float32Array(nx * 2 * 3), nor = new Float32Array(nx * 2 * 3), uv = new Float32Array(nx * 2 * 2);
  for (let j = 0; j < 2; j++)
    for (let k = 0; k < nx; k++) {
      const i = j * nx + k;
      pos.set([xs[k], ys[k], zs[j]], i * 3);
      const k0 = Math.max(0, k - 1), k1 = Math.min(nx - 1, k + 1);
      const dx = xs[k1] - xs[k0], dy = ys[k1] - ys[k0];
      const L = Math.hypot(dx, dy) || 1;
      nor.set([-dy / L, dx / L, 0], i * 3);
      uv.set([xs[k], zs[j]], i * 2);
    }
  const idx = [];
  for (let k = 0; k < nx - 1; k++) {
    const a = k, b = k + 1, c = nx + k, d = nx + k + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/**
 * Profiled sheet (профнастил GrandLine), same local frame as seamSheet(): x across the ribs, z along the ribs,
 * y out of the sheet. Trapezoidal ribs `ribH` high every `pitch`, two shallow stiffening grooves in each pan,
 * rounded bends. Indexed geometry, analytic normals, metre UVs.
 */
export function ribSheet(width, length, { pitch = 0.5, ribH = 0.021, ribTop = 0.022, ribBase = 0.058, phase = 0.12 } = {}) {
  const prof = [];
  const pan = pitch - ribBase;
  const bend = (x0, y0, x1, y1, n = 3) => {
    for (let i = 1; i <= n; i++) {
      const t = i / n, s = t * t * (3 - 2 * t);
      prof.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * s]);
    }
  };
  prof.push([0, 0]);
  for (const r of [0.34, 0.66]) {
    const c = pan * r;
    prof.push([c - 0.012, 0]);
    bend(c - 0.012, 0, c - 0.004, -0.0016, 2);
    prof.push([c + 0.004, -0.0016]);
    bend(c + 0.004, -0.0016, c + 0.012, 0, 2);
  }
  const sl = (ribBase - ribTop) / 2;
  prof.push([pan, 0]);
  bend(pan, 0, pan + sl, ribH, 4);
  bend(pan + sl, ribH, pan + sl + ribTop, ribH, 2);
  bend(pan + sl + ribTop, ribH, pan + ribBase, 0, 4);
  const xs = [], ys = [];
  phase = ((phase % pitch) + pitch) % pitch; // pieces far along a wall pass their offset as the phase
  const n = Math.ceil((width + pitch) / pitch) + 1;
  for (let k = -1; k < n; k++)
    for (const [px, py] of prof) {
      const x = k * pitch + px - phase;
      if (x < 0 || x > width) continue;
      if (xs.length && x <= xs[xs.length - 1] + 1e-5) continue;
      xs.push(x);
      ys.push(py);
    }
  if (xs[0] > 0) { xs.unshift(0); ys.unshift(0); }
  if (xs[xs.length - 1] < width) { xs.push(width); ys.push(0); }
  const nx = xs.length;
  const pos = new Float32Array(nx * 2 * 3), nor = new Float32Array(nx * 2 * 3), uv = new Float32Array(nx * 2 * 2);
  for (let j = 0; j < 2; j++)
    for (let k = 0; k < nx; k++) {
      const i = j * nx + k;
      pos.set([xs[k], ys[k], j * length], i * 3);
      const k0 = Math.max(0, k - 1), k1 = Math.min(nx - 1, k + 1);
      const dx = xs[k1] - xs[k0], dy = ys[k1] - ys[k0];
      const L = Math.hypot(dx, dy) || 1;
      nor.set([-dy / L, dx / L, 0], i * 3);
      uv.set([xs[k], j * length], i * 2);
    }
  const idx = [];
  for (let k = 0; k < nx - 1; k++) {
    const a = k, b = k + 1, c = nx + k, d = nx + k + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Inward offset of a convex polygon (counter-clockwise [x, y] points) by d. */
export function insetPoly(pts, d) {
  const n = pts.length;
  const lines = pts.map((p, i) => {
    const q = pts[(i + 1) % n];
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
    const nx = -dy / L, ny = dx / L; // left normal = inward for CCW
    return [p[0] + nx * d, p[1] + ny * d, dx, dy];
  });
  return lines.map((l, i) => intersect(lines[(i - 1 + n) % n], l));
}

/** Intersection of two lines given as [px, py, dx, dy]. */
export function intersect(a, b) {
  const den = a[2] * b[3] - a[3] * b[2];
  if (Math.abs(den) < 1e-9) return [b[0], b[1]];
  const t = ((b[0] - a[0]) * b[3] - (b[1] - a[1]) * b[2]) / den;
  return [a[0] + a[2] * t, a[1] + a[3] * t];
}

// ---------------------------------------------------------------- tubes
/** Polyline path with rounded corners, as a TubeGeometry. */
export function pipe(points, radius, { bend = 0.08, radial = 20 } = {}) {
  const P = points.map((p) => new THREE.Vector3(...p));
  const path = new THREE.CurvePath();
  let prev = P[0].clone();
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1];
    if (!c) {
      path.add(new THREE.LineCurve3(prev, b.clone()));
      break;
    }
    const d1 = b.clone().sub(a), d2 = c.clone().sub(b);
    const r = Math.min(bend, d1.length() / 2, d2.length() / 2);
    const p1 = b.clone().sub(d1.normalize().multiplyScalar(r));
    const p2 = b.clone().add(d2.normalize().multiplyScalar(r));
    if (prev.distanceTo(p1) > 1e-4) path.add(new THREE.LineCurve3(prev, p1));
    path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2));
    prev = p2;
  }
  const len = path.getLength();
  const g = new THREE.TubeGeometry(path, Math.max(16, Math.ceil(len * 30)), radius, radial, false);
  return g;
}

export function rng(seed) {
  return mulberry(seed);
}

export { mergeGeometries, RoundedBoxGeometry };
