// Shared building blocks of the DOMINNO prefab frame houses. A barn is a "shell": wall and roof panels that run
// as one profile (полоса стена-кровля-стена) and stand proud of the glazed gables, so each end reads as a deep frame.
// The shell is clad in GrandLine profiled sheet, the gables in vertical «Штиль» boards (or planken), the frame face in
// metal flashing or Ceresit plaster. Every visible layer exists in two states: finished (with the options) and
// domokomplekt only (GREENBOARD fibrolite panels, roof membrane with battens, bare deck joists, empty openings).
import * as THREE from 'three';
import { Batch, beam, box, ribSheet, seamSheet, M, metreUV, rng, intersect } from '../geom.js';
import { surface, paintedMetal, glass, setFinish } from '../materials.js';
import { addWindow, addDoor, addPolyWindow, addGutter, addSconce } from '../parts.js';

export function makeKit(mats, seed = 1) {
  return { batch: new Batch(), mats, rnd: rng(seed) };
}

export const mul = (a, b) => new THREE.Matrix4().multiplyMatrices(a, b);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// GrandLine Drap RAL 7024 — the graphite of the renders (roof, profiled walls, trims, gutters)
export const RAL7024 = '#45484d';

// ---------------------------------------------------------------- materials
export function baseMaterials() {
  const interior = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
  // «Штиль» planed pine board, Teknos Talatu coating (tinted by the configurator)
  const pine = (o = {}) => surface('pine', { tint: 'stain', color: '#b3763c', keep: 0.5, contrast: 1.05, vertexColors: true, roughness: 0.72, ...o });
  const m = {
    clad: pine(),
    soffit: pine({ roughness: 0.75 }),
    accent: pine({ roughness: 0.72 }), // horizontal board bands between the window tiers
    deck: surface('larch', { tint: 'stain', color: '#8a7864', keep: 0.5, contrast: 1.1, vertexColors: true, roughness: 0.7 }),
    lumber: surface('pine', { tint: 'stain', color: '#c9b08a', keep: 0.7, contrast: 0.9, vertexColors: true, roughness: 0.85 }),
    sill: surface('pine', { tint: 'stain', color: '#7f7a55', keep: 0.4, contrast: 0.9, vertexColors: true, roughness: 0.9 }), // antiseptic-treated sill beam
    backing: new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.95 }),
    // GrandLine profiled sheet with the matte Drap coating
    wallMetal: paintedMetal(RAL7024, { roughness: 0.74, metalness: 0.18 }),
    roof: paintedMetal(RAL7024, { roughness: 0.76, metalness: 0.18 }),
    flash: paintedMetal(RAL7024, { roughness: 0.7, metalness: 0.2 }),
    flashing: paintedMetal(RAL7024, { roughness: 0.5, metalness: 0.3 }),
    gutter: paintedMetal(RAL7024, { roughness: 0.45, metalness: 0.3 }),
    // frame face of the shell ends: metal (dominno130) or Ceresit plaster (dominno240), recoloured per project
    surround: surface('plaster', { tint: 'paint', color: '#f1efea', contrast: 0.5, normalScale: 0.55, roughness: 0.9 }),
    // domokomplekt layers
    greenboard: surface('fibrolite', { tint: 'stain', color: '#9d9a90', keep: 0.6, contrast: 1.0, normalScale: 0.8, roughness: 0.95 }),
    membrane: surface('concrete', { tint: 'paint', color: '#3a3d40', contrast: 0.25, normalScale: 0.15, roughness: 0.55 }),
    // windows & doors: Deceuninck Bautec Urban, anthracite laminate
    frame: new THREE.MeshStandardMaterial({ color: '#3b3f44', roughness: 0.4, metalness: 0.05 }),
    frameDark: new THREE.MeshStandardMaterial({ color: '#17181a', roughness: 0.6 }),
    glass: glass(),
    steel: new THREE.MeshStandardMaterial({ color: '#2a2c2f', roughness: 0.55, metalness: 0.55 }),
    galv: new THREE.MeshStandardMaterial({ color: '#9ea3a6', roughness: 0.45, metalness: 0.9 }),
    concrete: surface('concrete', { roughness: 0.9 }),
    hwSteel: new THREE.MeshStandardMaterial({ color: '#c9ccce', metalness: 1, roughness: 0.25 }),
    hwBlack: new THREE.MeshStandardMaterial({ color: '#1c1d1f', metalness: 0.6, roughness: 0.4 }),
    hwBrass: new THREE.MeshStandardMaterial({ color: '#b58f4c', metalness: 1, roughness: 0.3 }),
    doorLeaf: new THREE.MeshStandardMaterial({ color: '#3b3f44', roughness: 0.45, metalness: 0.2 }),
    chimney: new THREE.MeshStandardMaterial({ color: '#2b2d30', roughness: 0.45, metalness: 0.6 }),
    // interior seen through the glazing (as on the renders: light walls, oak floor, warm lighting)
    roomWall: surface('lining', { tint: 'paint', color: '#efece6', contrast: 0.6, roughness: 0.85 }),
    roomCeil: surface('pine', { tint: 'stain', color: '#d2b48c', keep: 0.6, contrast: 0.8, roughness: 0.7 }),
    roomFloor: surface('laminate', { tint: 'stain', color: '#a8865f', keep: 0.5, contrast: 1.1, roughness: 0.45 }),
    roomFurniture: surface('oak', { tint: 'stain', color: '#b39065', keep: 0.6, roughness: 0.6 }),
    sofa: interior('#8a857c'),
    cavity: new THREE.MeshStandardMaterial({ color: '#0d0d0c', roughness: 1 }),
    curtain: new THREE.MeshStandardMaterial({ color: '#d8d2c6', roughness: 1, side: THREE.DoubleSide }),
    sheer: new THREE.MeshStandardMaterial({ color: '#f1eee8', roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.32, depthWrite: false }),
    downlight: new THREE.MeshStandardMaterial({ color: '#f4f2ee', emissive: '#fff1dc', emissiveIntensity: 0 }),
    sconce: new THREE.MeshStandardMaterial({ color: '#1e1f21', roughness: 0.4, metalness: 0.5 }),
    sconceGlow: new THREE.MeshStandardMaterial({ color: '#333', emissive: '#ffcf8a', emissiveIntensity: 0 }),
  };
  m.roof.side = THREE.DoubleSide;
  m.wallMetal.side = THREE.DoubleSide;
  m.backing.side = THREE.DoubleSide;
  m.membrane.side = THREE.DoubleSide;
  m.glass.userData.noShadow = true;
  m.sheer.userData.noShadow = true;
  for (const k of ['roomWall', 'roomCeil', 'roomFloor', 'roomFurniture', 'sofa', 'curtain', 'downlight']) m[k].userData.noShadow = true;
  return m;
}

/** Day / evening state of interior and facade lights. */
export function setEvening(mats, on) {
  const warm = new THREE.Color('#ffb066');
  const k = on ? 1 : 0;
  mats.roomWall.emissive.copy(warm).multiplyScalar(0.85 * k);
  mats.roomCeil.emissive.copy(warm).multiplyScalar(0.75 * k);
  mats.roomFloor.emissive.copy(warm).multiplyScalar(0.3 * k);
  mats.roomFurniture.emissive.copy(warm).multiplyScalar(0.12 * k);
  mats.sofa.emissive.copy(warm).multiplyScalar(0.08 * k);
  mats.curtain.emissive.copy(warm).multiplyScalar(0.8 * k);
  mats.sheer.emissive.copy(warm).multiplyScalar(1.3 * k);
  mats.downlight.emissiveIntensity = on ? 6 : 0;
  mats.sconceGlow.emissiveIntensity = on ? 9 : 0;
  mats.glass.opacity = on ? 0.3 : 0.4;
}

/** Facade wood finish (Teknos), shared by cladding, soffits, accent bands and the deck. */
export function setWood(mats, f) {
  for (const k of ['clad', 'soffit', 'accent']) setFinish(mats[k], f);
  setFinish(mats.deck, { ...f, color: f.natural ? f.color : shade(f.color, 0.92) });
}
function shade(hex, k) {
  return '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
}

// ---------------------------------------------------------------- wall frames
/**
 * Wall basis: local x along the wall (left → right seen from outside), y up, z out of the wall, origin on the
 * outer face at ground level. origin / along / out are [x, z] pairs in plan.
 */
export function wallFrame(origin, along, out) {
  return new THREE.Matrix4().makeBasis(V3(along[0], 0, along[1]), V3(0, 1, 0), V3(out[0], 0, out[1])).setPosition(origin[0], 0, origin[1]);
}

// ---------------------------------------------------------------- vertical cladding
/**
 * Vertical boards on a wall area, cut tight around openings, over a black wind membrane. top: number or fn(x)
 * (a gable). openings: [{x0, x1, y0, y1, top?: fn(x)}] — `top` gives a sloped head (trapezoid windows).
 * «Штиль» shiplap: 140 mm boards with a tight joint (the rounded arrises read as the groove); planken: 20 × 140 with 9 mm gaps.
 * tone(x) → shade multiplier for alternating board tones.
 */
export function planken(K, Wm, { x0, x1, y0, top, openings = [], key = 'clad', bw = 0.138, gap = 0.0015, th = 0.02, tone, kind = 'board' }) {
  const topFn = typeof top === 'function' ? top : () => top;
  const B = K.batch, rnd = K.rnd;
  const pitch = bw + gap;
  const n = Math.max(1, Math.round((x1 - x0 + gap) / pitch));
  const w = (x1 - x0 + gap) / n - gap; // boards fitted to the run
  const oTop = (o, x) => (o.top ? o.top(Math.min(o.x1, Math.max(o.x0, x))) : o.y1);
  // board from xa..xb: bottom line ba (at xa) → bb (at xb), top line ta → tb
  const piece = (xa, xb, ba, bb, ta, tb, k) => {
    const sw = xb - xa;
    if (sw < 0.012) return;
    if (Math.min(ta - ba, tb - bb) < 0.02) return;
    const cs = (ba - bb) / sw, ce = (tb - ta) / sw;
    const g = beam(tb - bb, th, sw, {
      kind, rnd, cutStart: Math.abs(cs) > 1e-3 ? cs : 0, cutEnd: Math.abs(ce) > 1e-3 ? ce : 0,
      shade: (0.86 + rnd() * 0.22) * k, endShade: 0.8,
    });
    B.add(key, g, mul(Wm, M((xa + xb) / 2, bb, -th / 2, 0, 0, Math.PI / 2).multiply(M(0, -sw / 2, 0))));
  };
  for (let i = 0; i < n; i++) {
    const xa = x0 + i * pitch, xb = xa + w;
    const k = tone ? tone((xa + xb) / 2) : 1;
    const ta = topFn(xa), tb = topFn(xb);
    const cuts = openings.filter((o) => o.x0 < xb - 0.002 && o.x1 > xa + 0.002).sort((p, q) => p.y0 - q.y0);
    let ba = y0, bb = y0;
    for (const o of cuts) {
      if (o.y0 > Math.max(ba, bb) + 0.02) piece(xa, xb, ba, bb, Math.min(o.y0, ta), Math.min(o.y0, tb), k);
      // partial overlap: a narrowed board beside the opening, over its height
      if (o.x0 > xa + 0.012) piece(xa, o.x0, o.y0, o.y0, Math.min(oTop(o, o.x0), ta), Math.min(oTop(o, o.x0), topFn(o.x0)), k);
      if (o.x1 < xb - 0.012) piece(o.x1, xb, o.y0, o.y0, Math.min(oTop(o, o.x1), topFn(o.x1)), Math.min(oTop(o, o.x1), tb), k);
      ba = Math.max(ba, oTop(o, xa));
      bb = Math.max(bb, oTop(o, xb));
    }
    piece(xa, xb, ba, bb, ta, tb, k);
  }
  // wind membrane behind the joints: vertical strips split at opening edges (no polygon holes)
  const xs = new Set([x0, x1]);
  for (let x = x0; x < x1; x += 0.5) xs.add(x);
  for (const o of openings) {
    for (const x of [o.x0, o.x1]) if (x > x0 && x < x1) xs.add(x);
    if (o.top) for (let x = o.x0 + 0.1; x < o.x1; x += 0.1) xs.add(x);
  }
  const sx = [...xs].sort((p, q) => p - q);
  const pos = [];
  const quad = (a, b, ya0, yb0, ya1, yb1) => pos.push(a, ya0, 0, b, yb0, 0, b, yb1, 0, a, ya0, 0, b, yb1, 0, a, ya1, 0);
  for (let i = 0; i < sx.length - 1; i++) {
    const a = sx[i], b = sx[i + 1];
    if (b - a < 1e-4) continue;
    const ta = topFn(a) - 0.005, tb = topFn(b) - 0.005;
    const blocks = openings.filter((o) => o.x0 <= a + 1e-4 && o.x1 >= b - 1e-4).sort((p, q) => p.y0 - q.y0);
    let y = y0;
    for (const o of blocks) {
      if (o.y0 > y + 1e-3) quad(a, b, y, y, Math.min(o.y0, ta), Math.min(o.y0, tb));
      y = Math.max(y, oTop(o, a), oTop(o, b));
    }
    if (Math.min(ta, tb) > y + 1e-3) quad(a, b, y, y, ta, tb);
  }
  if (pos.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    B.add('backing', g, mul(Wm, M(0, 0, -th - 0.012)));
  }
}

/** Horizontal board band (between the lower and upper window tiers), boards along the wall. */
export function boardBand(K, Wm, { x0, x1, y0, y1, key = 'accent', bw = 0.095, gap = 0.0015, th = 0.02 }) {
  const n = Math.max(1, Math.round((y1 - y0 + gap) / (bw + gap)));
  const h = (y1 - y0 + gap) / n - gap;
  for (let i = 0; i < n; i++) {
    const g = beam(x1 - x0, th, h, { kind: 'board', rnd: K.rnd, shade: 0.88 + K.rnd() * 0.2 });
    K.batch.add(key, g, mul(Wm, M(x0, y0 + i * (h + gap), -th / 2)));
  }
  K.batch.add('backing', new THREE.PlaneGeometry(x1 - x0, y1 - y0), mul(Wm, M((x0 + x1) / 2, (y0 + y1) / 2, -th - 0.01)));
}

// ---------------------------------------------------------------- openings
/**
 * Windows and doors on a wall frame. ops: { x0, x1, y, h, cols, opens, door, entrance, room, poly: [[x, y]...] }.
 * Without the glazing option the openings stay empty: fibrolite reveals and the raw interior behind.
 */
export function placeOpenings(K, Fr, ops, { thk, glazed = true, roomFor = () => ({}) }) {
  for (const o of ops) {
    const c = (o.x0 + o.x1) / 2, w = o.x1 - o.x0;
    const room = o.room === false ? false : { ...roomFor(o), ...(o.room || {}) };
    if (o.poly) {
      addPolyWindow(K, Fr, { pts: o.poly, wallThk: thk, setBack: 0.07, room, bare: !glazed });
    } else if (o.entrance && glazed) {
      addDoor(K, Fr, { x: c, y: o.y, w, h: o.h, style: o.style || 'panel', handleSide: o.handleSide ?? -1, wallThk: thk, setBack: 0.07, room: room && { ...room, furniture: false } });
    } else {
      addWindow(K, Fr, {
        x: c, y: o.y, w, h: o.h, cols: o.cols, opens: o.opens, style: 'modern', door: o.door || o.entrance, wallThk: thk, setBack: 0.07,
        room, curtains: o.curtains, sillOut: 0.04, bare: !glazed,
      });
    }
  }
}

/** Openings as cut rectangles / trapezoids for planken(). */
export const cutsOf = (ops) =>
  ops.map((o) => {
    if (!o.poly) return { x0: o.x0, x1: o.x1, y0: o.y, y1: o.y + o.h };
    const xs = o.poly.map((p) => p[0]), ys = o.poly.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys);
    // head of the polygon: upper envelope of its edges
    const top = (x) => {
      let y = y0;
      for (let i = 0; i < o.poly.length; i++) {
        const p = o.poly[i], q = o.poly[(i + 1) % o.poly.length];
        if (Math.abs(q[0] - p[0]) < 1e-6) continue;
        const t = (x - p[0]) / (q[0] - p[0]);
        if (t >= -1e-6 && t <= 1 + 1e-6) y = Math.max(y, p[1] + (q[1] - p[1]) * t);
      }
      return y;
    };
    return { x0, x1, y0, y1: Math.max(...ys), top };
  });

/** Up/down facade sconces; returns the light-wash records for the evening scene. */
export function sconces(K, Fr, list) {
  return list.map(([x, y]) => {
    addSconce(K, Fr, x, y);
    return { type: 'wash', pos: V3(x, y, 0.065).applyMatrix4(Fr), out: V3(0, 0, 1).transformDirection(Fr) };
  });
}

// ---------------------------------------------------------------- the shell (wall-roof-wall profile)
/**
 * spec: {
 *   pts: outer profile [[x, y]...] in the XY plane, ordered so the inside is on the right (clockwise),
 *   t: thickness per segment, z0 / z1: extent of the shell (frame ends), clipX: last inner point is clipped to x,
 *   finish (profiled walls), roof (profiled roof), roofType: 'prof' | 'seam', recesses: [[za, zb]] boarded soffits,
 *   ring: material of the frame face, pitch: rib pitch of the profiled sheet,
 *   ends: [bool, bool] — frame face at z0 / z1 }
 * Returns { inner, topAt(x) } for the gable walls.
 */
export function shell(K, S) {
  const B = K.batch;
  const { pts, z0, z1, finish = true, roof = true } = S;
  const W = z1 - z0;
  const ribH = 0.021;
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
    const dir = [dx / L, dy / L], out = [-dir[1], dir[0]];
    segs.push({ p, q, L, dir, out, t: S.t[i], wall: Math.abs(dir[0]) < 0.15 });
  }
  // inner polyline
  const lines = segs.map((s) => [s.p[0] - s.out[0] * s.t, s.p[1] - s.out[1] * s.t, s.dir[0], s.dir[1]]);
  const inner = [[lines[0][0], lines[0][1]]];
  for (let i = 1; i < segs.length; i++) inner.push(intersect(lines[i - 1], lines[i]));
  const last = segs[segs.length - 1];
  inner.push(S.clipX != null ? intersect(lines[lines.length - 1], [S.clipX, 0, 0, 1]) : [last.q[0] - last.out[0] * last.t, last.q[1] - last.out[1] * last.t]);

  // frame of a segment: x along ±Z, y = outward normal, z = along the segment from p
  const segFrame = (s, inward = false) => {
    const o = inward ? V3(-s.out[0], -s.out[1], 0) : V3(s.out[0], s.out[1], 0);
    const d = V3(s.dir[0], s.dir[1], 0);
    const a = new THREE.Vector3().crossVectors(o, d);
    return { a, o, d, z: a.z > 0 ? z0 : z1 };
  };

  const frameOf = (s) => {
    const F = segFrame(s);
    return new THREE.Matrix4().makeBasis(F.a, F.o, F.d).setPosition(s.p[0], s.p[1], F.z);
  };
  segs.forEach((s, i) => {
    const base = frameOf(s);
    if (s.wall) {
      // window openings in the panel: world {seg, z0, z1, y0, y1} → sheet coordinates
      const F = segFrame(s);
      const holes = (S.holes || []).filter((h) => h.seg === i).map((h) => {
        const u = [h.z0, h.z1].map((z) => (z - F.z) * Math.sign(F.a.z)).sort((a, b) => a - b);
        const v = [h.y0, h.y1].map((y) => Math.abs(y - s.p[1])).sort((a, b) => a - b);
        return { u0: u[0], u1: u[1], v0: v[0], v1: v[1] };
      });
      for (const [ua, ub, va, vb] of sheetPieces(W, s.L, holes)) {
        if (finish) B.add('wallMetal', ribSheet(ub - ua, vb - va, { pitch: S.pitch ?? 0.5, ribH, phase: 0.09 + ua }), mul(base, M(ua, 0, va)));
        else B.add('greenboard', box(ub - ua - 0.003, 0.012, vb - va - 0.003), mul(base, M((ua + ub) / 2, 0.006, (va + vb) / 2)));
      }
      if (!finish) {
        // sheet joints of the fibrolite panels
        for (let u = 1.2; u < W - 0.1; u += 1.2) B.add('backing', box(0.004, 0.004, s.L), mul(base, M(u, 0.0, s.L / 2)));
      }
      // reveals of the openings, through the panel thickness
      const dep = s.t - 0.06, rk = finish ? 'flashing' : 'greenboard', top = finish ? ribH : 0.012;
      for (const h of holes) {
        const hgt = top + dep, yc = (top - dep) / 2;
        B.add(rk, box(0.012, hgt, h.v1 - h.v0), mul(base, M(h.u0 - 0.006, yc, (h.v0 + h.v1) / 2)));
        B.add(rk, box(0.012, hgt, h.v1 - h.v0), mul(base, M(h.u1 + 0.006, yc, (h.v0 + h.v1) / 2)));
        B.add(rk, box(h.u1 - h.u0 + 0.024, hgt, 0.012), mul(base, M((h.u0 + h.u1) / 2, yc, h.v0 - 0.006)));
        B.add(rk, box(h.u1 - h.u0 + 0.024, hgt, 0.012), mul(base, M((h.u0 + h.u1) / 2, yc, h.v1 + 0.006)));
      }
    } else if (roof) {
      const sheet = S.roofType === 'seam' ? seamSheet(W, s.L + 0.04, { module: 0.47 }) : ribSheet(W, s.L + 0.04, { pitch: S.pitch ?? 0.5, ribH: 0.03, ribTop: 0.03, ribBase: 0.075, phase: 0.09 });
      B.add('roof', sheet, mul(base, M(0, 0, -0.02)));
    } else battens(K, base, W, s.L);
  });
  // angle trims at the eaves / ridge / corners, lapped over the ribs
  if (finish || roof)
    for (let i = 1; i < segs.length; i++) {
      const a = segs[i - 1], b = segs[i];
      if (!(a.wall ? finish : roof) && !(b.wall ? finish : roof)) continue;
      for (const s of [a, b]) {
        const lift = (s.wall ? ribH : 0.03) + 0.003;
        const at = s === a ? s.L - 0.05 : 0.05; // strip ends at the corner
        B.add('flash', box(W + 0.02, 0.0015, 0.1 + lift), mul(frameOf(s), M(W / 2, lift, at + (s === a ? lift / 2 : -lift / 2))));
      }
    }
  // frame faces at the shell ends: ring between the outer (over the ribs) and inner profile
  const ringOuter = offsetOpen(pts, 0.034);
  const ringPts = [...ringOuter, ...inner.slice().reverse()];
  const ringShape = new THREE.Shape(ringPts.map(([x, y]) => new THREE.Vector2(x, y)));
  const ringKey = finish ? S.ring || 'flash' : 'greenboard';
  const ends = S.ends || [true, true];
  for (const [zEnd, sgn, on] of [[z1, 1, ends[1]], [z0, -1, ends[0]]]) {
    if (!on) continue;
    const g = new THREE.ExtrudeGeometry(ringShape, { depth: 0.024, bevelEnabled: false, curveSegments: 1 });
    metreUV(g);
    B.add(ringKey, g, M(0, 0, sgn > 0 ? zEnd - 0.012 : zEnd - 0.012));
  }
  // boarded inner faces of the recesses (soffit and frame sides)
  for (const [za, zb] of S.recesses || []) {
    for (let i = 0; i < inner.length - 1; i++) {
      const p = inner[i], q = inner[i + 1];
      const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
      if (L < 0.02) continue;
      const s = { dir: [dx / L, dy / L], out: segs[i].out };
      const F = segFrame(s, true);
      const ax = new THREE.Vector3().crossVectors(V3(s.dir[0], s.dir[1], 0), F.o); // board length direction
      const zStart = ax.z > 0 ? za : zb;
      const base = new THREE.Matrix4().makeBasis(ax, V3(s.dir[0], s.dir[1], 0), F.o).setPosition(p[0], p[1], zStart);
      if (!finish) {
        const g = box(zb - za, L, 0.012);
        B.add('greenboard', g, mul(base, M((zb - za) / 2, L / 2, 0.006)));
        continue;
      }
      if (segs[i].wall) {
        // frame sides: vertical boards like the gables
        const up = V3(0, 1, 0), along = new THREE.Vector3().crossVectors(up, F.o);
        const Wm = new THREE.Matrix4().makeBasis(along, up, F.o).setPosition(p[0] + F.o.x * 0.02, 0, along.z > 0 ? za : zb);
        planken(K, Wm, { x0: 0, x1: zb - za, y0: Math.min(p[1], q[1]), top: Math.max(p[1], q[1]) - 0.004, key: 'soffit', ...(S.boards || {}) });
        continue;
      }
      const bw = 0.118, n = Math.max(1, Math.round(L / bw));
      for (let k = 0; k < n; k++) {
        const g = beam(zb - za, 0.016, L / n - 0.0015, { kind: 'board', rnd: K.rnd, shade: 0.86 + K.rnd() * 0.2 });
        B.add('soffit', g, mul(base, M(0, (L * k) / n + 0.00075, 0.008)));
      }
    }
  }
  // upper envelope of the inner profile (gable wall tops)
  const topAt = (x) => {
    let y = -Infinity;
    for (let i = 0; i < inner.length - 1; i++) {
      const p = inner[i], q = inner[i + 1];
      if (Math.abs(q[0] - p[0]) < 1e-6) continue;
      const t = (x - p[0]) / (q[0] - p[0]);
      if (t >= -1e-4 && t <= 1 + 1e-4) y = Math.max(y, p[1] + (q[1] - p[1]) * t);
    }
    return y;
  };
  return { inner, topAt, segs };
}

/** Outward offset of an open polyline (inside on the right), keeping the end points on their segment lines. */
function offsetOpen(pts, d) {
  const lines = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
    lines.push([p[0] - (dy / L) * d, p[1] + (dx / L) * d, dx / L, dy / L]);
  }
  const out = [[lines[0][0], lines[0][1]]];
  for (let i = 1; i < lines.length; i++) out.push(intersect(lines[i - 1], lines[i]));
  // last point: q shifted along the normal of the last segment
  const q = pts[pts.length - 1], s = pts[pts.length - 2];
  const dx = q[0] - s[0], dy = q[1] - s[1], L = Math.hypot(dx, dy);
  out.push([q[0] - (dy / L) * d, q[1] + (dx / L) * d]);
  return out;
}

/** Splits a W × L sheet area into rectangles [ua, ub, va, vb] around rectangular holes {u0, u1, v0, v1}. */
function sheetPieces(W, L, holes) {
  const us = [...new Set([0, W, ...holes.flatMap((h) => [h.u0, h.u1])])].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < us.length - 1; i++) {
    const ua = us[i], ub = us[i + 1];
    if (ub - ua < 1e-3) continue;
    const hs = holes.filter((h) => h.u0 <= ua + 1e-4 && h.u1 >= ub - 1e-4).sort((a, b) => a.v0 - b.v0);
    let v = 0;
    for (const h of hs) {
      if (h.v0 > v + 1e-3) out.push([ua, ub, v, h.v0]);
      v = Math.max(v, h.v1);
    }
    if (L > v + 1e-3) out.push([ua, ub, v, L]);
  }
  return out;
}

/** Roof panel without roofing: wind/water membrane, counter-battens down the slope, battens across. */
function battens(K, base, W, L) {
  const B = K.batch;
  B.add('membrane', box(W, 0.002, L + 0.03), mul(base, M(W / 2, 0.001, L / 2 - 0.015)));
  const nc = Math.round(W / 0.6);
  for (let i = 0; i <= nc; i++) {
    const x = Math.min(W - 0.03, Math.max(0.03, (W * i) / nc));
    B.add('lumber', beam(L, 0.05, 0.05, { kind: 'planed', rnd: K.rnd, shade: 0.92 + K.rnd() * 0.1 }), mul(base, M(x, 0.002, 0, 0, -Math.PI / 2, 0)));
  }
  for (let z = 0.06; z < L - 0.02; z += 0.35) {
    const g = beam(W, 0.1, 0.025, { kind: 'board', rnd: K.rnd, shade: 0.9 + K.rnd() * 0.15 });
    B.add('lumber', g, mul(base, M(0, 0.052, z)));
  }
}

// ---------------------------------------------------------------- foundation
/**
 * Driven reinforced-concrete piles 300 × 300 (СТРОЙМАТИК С30.15) with steel cap plates and the antiseptic-treated
 * sill beam (обвязочный брус 150 × 150) along the rows. yTop: top of the sill (= underside of the floor panel).
 */
export function piles(K, { x0, x1, z0, z1, yTop, nx, nz, sill = true, size = 0.3, inset = 0.15 }) {
  const B = K.batch;
  const yPlate = sill ? yTop - 0.15 : yTop;
  const row = (a, b, n) => (n ? Array.from({ length: n + 1 }, (_, i) => a + inset + ((b - a - 2 * inset) * i) / n) : [(a + b) / 2]);
  const xs = row(x0, x1, nx), zs = row(z0, z1, nz);
  for (const x of xs)
    for (const z of zs) {
      const h = yPlate - 0.01 + 0.35;
      B.add('concrete', box(size, h, size, { round: 0.008 }), M(x, yPlate - 0.01 - h / 2, z));
      B.add('steel', box(size + 0.02, 0.01, size + 0.02), M(x, yPlate - 0.005, z));
    }
  if (!sill) return { xs, zs };
  for (const x of xs) B.add('sill', beam(z1 - z0, 0.15, 0.15, { kind: 'planed', rnd: K.rnd }), M(x, yPlate, z1, 0, Math.PI / 2, 0));
  for (const z of [zs[0], zs[zs.length - 1]]) B.add('sill', beam(x1 - x0, 0.15, 0.15, { kind: 'planed', rnd: K.rnd }), M(x0, yPlate, z));
  return { xs, zs };
}

// ---------------------------------------------------------------- terraces
/**
 * Larch decking (28 × 140), tight joints and staggered butt joints over 50 × 150 joists, boards along `dir`.
 * boards: false shows the joists only (terrace decking is part of the exterior finish option).
 */
export function deck(K, { x0, x1, z0, z1, y, dir = 'x', key = 'deck', bw = 0.14, gap = 0.0015, th = 0.028, boards = true, rim = ['+z', '-z', '+x', '-x'] }) {
  const along = dir === 'x' ? x1 - x0 : z1 - z0;
  const across = dir === 'x' ? z1 - z0 : x1 - x0;
  const B = K.batch;
  // joists across the boards
  const nj = Math.max(1, Math.round(along / 0.6));
  for (let i = 0; i <= nj; i++) {
    const u = Math.min(along - 0.03, Math.max(0.03, (along * i) / nj));
    const g = beam(across, 0.05, 0.15, { kind: 'planed', rnd: K.rnd, shade: 0.9 + K.rnd() * 0.1 });
    B.add('lumber', g, dir === 'x' ? M(x0 + u, y - th - 0.15, z1, 0, Math.PI / 2, 0) : M(x0, y - th - 0.15, z0 + u));
  }
  if (!boards) return;
  // boards fitted to the run: no open strip left at the edges
  const n = Math.max(1, Math.round((across + gap) / (bw + gap)));
  bw = (across + gap) / n - gap;
  // dark underlay between the joists and the boards: the joints read as shadow, not as gravel below
  const ul = dir === 'x' ? [along, across] : [across, along];
  B.add('backing', box(ul[0] - 0.01, 0.004, ul[1] - 0.01), M((x0 + x1) / 2, y - th - 0.003, (z0 + z1) / 2));
  for (let i = 0; i < n; i++) {
    const c = (dir === 'x' ? z0 : x0) + bw / 2 + i * (bw + gap);
    const off = (i % 3) * 1.3;
    const cuts = [];
    for (let s = off ? off : 4; s < along - 0.3; s += 4) cuts.push(s);
    const bounds = [0, ...cuts, along];
    for (let k = 0; k < bounds.length - 1; k++) {
      const a = bounds[k] + (k ? 0.001 : 0), b = bounds[k + 1] - 0.001;
      const g = beam(b - a, bw, th, { kind: 'board', rnd: K.rnd, shade: 0.86 + K.rnd() * 0.24 });
      B.add(key, g, dir === 'x' ? M(x0 + a, y - th, c) : M(c, y - th, z0 + a, 0, -Math.PI / 2, 0));
    }
  }
  // fascia board around the open edges
  const h = 0.17, t = 0.025, yy = y - th - h;
  if (rim.includes('+z')) B.add(key, beam(x1 - x0, t, h, { kind: 'board', rnd: K.rnd }), M(x0, yy, z1 + t / 2));
  if (rim.includes('-z')) B.add(key, beam(x1 - x0, t, h, { kind: 'board', rnd: K.rnd }), M(x0, yy, z0 - t / 2));
  if (rim.includes('+x')) B.add(key, beam(z1 - z0, t, h, { kind: 'board', rnd: K.rnd }), M(x1 + t / 2, yy, z1, 0, Math.PI / 2, 0));
  if (rim.includes('-x')) B.add(key, beam(z1 - z0, t, h, { kind: 'board', rnd: K.rnd }), M(x0 - t / 2, yy, z1, 0, Math.PI / 2, 0));
}

/**
 * Platform steps (as on the renders): boxed steps wrapping a deck edge. Starts at plan point (x, z) on the edge
 * centre, runs in direction dir ([dx, dz]), width w, n steps down from yTop.
 */
export function blockSteps(K, { x, z, dir, w, yTop, n, run = 0.42, key = 'deck', boards = true }) {
  const B = K.batch, rnd = K.rnd;
  const rise = yTop / (n + 1);
  const ang = Math.atan2(-dir[1], dir[0]);
  const base = M(x, 0, z, 0, ang, 0); // local +x = away from the deck, z across
  const add = (k, g, m) => B.add(k, g, mul(base, m));
  for (let i = 1; i <= n; i++) {
    const yt = yTop - i * rise;
    const u0 = (i - 1) * run, u1 = i * run;
    // carcass under each tread down to the ground
    add(boards ? 'backing' : 'lumber', box(run - 0.04, yt - 0.03, w - 0.06), M((u0 + u1) / 2, (yt - 0.03) / 2, 0));
    if (!boards) continue;
    const nb = Math.max(2, Math.round(run / 0.146));
    const jg = 0.0015, bw = run / nb - jg;
    for (let k = 0; k < nb; k++) {
      const g = beam(w, bw, 0.028, { kind: 'board', rnd, shade: 0.86 + rnd() * 0.24 });
      add(key, g, M(u0 + jg / 2 + k * (bw + jg) + bw / 2, yt - 0.028, w / 2, 0, Math.PI / 2, 0));
    }
    // riser board and closed ends
    add(key, beam(w, 0.025, yt - 0.03, { kind: 'board', rnd }), M(u1 - 0.012, 0, w / 2, 0, Math.PI / 2, 0));
    for (const s of [-1, 1]) add(key, beam(run, 0.025, yt - 0.03, { kind: 'board', rnd }), M(u0, 0, s * (w / 2 - 0.0125)));
  }
  return { length: n * run };
}

// ---------------------------------------------------------------- roof accessories
/** Tubular snow guard (two Ø25 tubes on brackets) along a roof line from a to b (world), roof normal nrm. */
export function snowGuard(K, a, b, nrm, down) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b);
  const L = A.distanceTo(Bv);
  const along = Bv.clone().sub(A).normalize();
  const n = new THREE.Vector3(...nrm).normalize(), d = new THREE.Vector3(...down).normalize();
  const m = new THREE.Matrix4().makeBasis(along, n, new THREE.Vector3().crossVectors(along, n)).setPosition(A);
  for (const [h, back] of [[0.07, 0.0], [0.14, -0.04]]) {
    const tube = new THREE.CylinderGeometry(0.0125, 0.0125, L, 14);
    tube.rotateZ(Math.PI / 2);
    K.batch.add('flashing', tube, mul(m, M(L / 2, h, back * Math.sign(d.dot(new THREE.Vector3().crossVectors(along, n))))));
  }
  const nb = Math.max(2, Math.ceil(L / 0.9));
  for (let i = 0; i <= nb; i++) K.batch.add('flashing', box(0.006, 0.17, 0.05), mul(m, M(0.1 + ((L - 0.2) * i) / nb, 0.085, 0)));
}

/** Eave gutter with downpipes to the ground at the ends. */
export function eaveGutter(K, { a, b, out, downs }) {
  addGutter(K, a, b, { wallOut: out, downs });
}

export { M, box, beam, metreUV, setFinish };
