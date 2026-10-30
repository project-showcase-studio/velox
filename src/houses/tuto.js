// TUTO (VELOX KZ) — two-storey monolithic house 10.8 × 13.4 m, 209.1 m² (113.0 + 96.1), clear ceiling height 3.2 m.
// Massing follows the floor plans: a 7.3 × 11.4 m living block (west) and a 3.5 × 12.2 m service block (east) with the
// stair, bathrooms and the garage under the fourth bedroom; the service block runs 2 m further south and shelters the
// entrance porch under a cantilevered concrete canopy. A single-storey plant room (котельная) sits behind the stair.
// Walls are VELOX permanent formwork (wood-cement board) + 150 mm concrete + insulation, 440 mm, rendered; flat roof
// with a 0.55 m parapet carrying ballasted PV rows. Finishes follow the TUTO village visualisations: rendered walls,
// vertical larch battens around the entrance and garage, dark powder-coated window boxes and copings.
import * as THREE from 'three';
import { Batch, box, M, metreUV, rng } from '../geom.js';
import { surface, paintedMetal, glass, mulberry } from '../materials.js';
import { ditherFade } from '../site.js';
import { addWindow, addDoor, addSconce } from '../parts.js';

// ---------------------------------------------------------------- dimensions (m); plan: x east, z south (street side)
const THK = 0.44; // outer wall
const FL1 = 0.5; // ground floor finished level
const CLR = 3.2; // clear ceiling height
const FL2 = FL1 + CLR + 0.3; // 4.0
const ROOF = FL2 + CLR + 0.35; // 7.55 — top of the roof build-up
const TOP = ROOF + 0.55; // 8.10 — parapet
const PL = 0.45; // plinth band
// living block A and service block B (outer faces)
const A = { x0: -5.4, x1: 1.9, z0: -6.7, z1: 4.7 };
const SV = { x0: 1.9, x1: 5.4, z0: -5.55, z1: 6.7 };
// plant room (single storey)
const P = { x0: 1.9, x1: 5.4, z0: -7.9, z1: -5.55, top: 3.45, roof: 3.05, thk: 0.3 };
// entrance porch between A and B under the canopy
const PORCH = { x0: -1.65, x1: SV.x0, z0: A.z1, z1: 6.3 };
// carport of the home-office variant
const CP = { x0: 5.75, x1: 9.05, z0: 0.6, z1: 6.95, y: 2.75 };

export const TUTO = {
  id: 'tuto',
  views: {
    main: [[17.5, 8.8, 21.5], [0.2, 3.6, 0.6]],
    street: [[6.5, 2.3, 24.5], [0.4, 4.0, 2.0]],
    entrance: [[-2.6, 1.65, 13.2], [0.6, 2.6, 4.6]],
    garden: [[-17.5, 4.8, -18.5], [-1.2, 3.5, -3.2]],
    top: [[12.5, 24, 15.5], [0.2, 6.5, 0.0]],
  },
  sun: [-0.42, 0.91],
  materials,
  build,
  site,
};

// ---------------------------------------------------------------- materials
function materials() {
  const plain = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
  const m = {
    // facade render (Ceresit-type mineral plaster) and the architectural-concrete variant
    stucco: surface('plaster', { tint: 'paint', color: '#d8c8ab', contrast: 0.5, normalScale: 0.4, roughness: 0.95 }),
    stuccoConc: surface('concrete', { tint: 'stain', color: '#b4b1aa', keep: 0.25, contrast: 0.95, normalScale: 0.45, roughness: 0.92 }),
    plinth: surface('concrete', { tint: 'paint', color: '#7e7d79', contrast: 0.9, normalScale: 0.8, roughness: 0.92 }),
    // vertical larch battens on a black batten membrane
    slat: surface('larch', { tint: 'stain', color: '#b27b47', keep: 0.55, contrast: 1.1, roughness: 0.82, normalScale: 0.6, vertexColors: true }),
    slatBack: plain('#2a2119', { roughness: 0.95 }),
    // powder-coated aluminium: window boxes, sills, coping, frames, doors, garage door, carport
    flashing: paintedMetal('#383e42', { roughness: 0.48, metalness: 0.3 }),
    coping: paintedMetal('#383e42', { roughness: 0.5, metalness: 0.3 }),
    frame: new THREE.MeshStandardMaterial({ color: '#383e42', roughness: 0.38, metalness: 0.35 }),
    frameDark: plain('#151617', { roughness: 0.6 }),
    doorLeaf: new THREE.MeshStandardMaterial({ color: '#383e42', roughness: 0.42, metalness: 0.3 }),
    gate: paintedMetal('#383e42', { roughness: 0.4, metalness: 0.35 }),
    gateGroove: plain('#0f1011', { roughness: 0.7 }),
    glass: glass(),
    hwSteel: new THREE.MeshStandardMaterial({ color: '#c9ccce', metalness: 1, roughness: 0.25 }),
    hwBlack: new THREE.MeshStandardMaterial({ color: '#1c1d1f', metalness: 0.6, roughness: 0.4 }),
    hwBrass: new THREE.MeshStandardMaterial({ color: '#b58f4c', metalness: 1, roughness: 0.3 }),
    // roof: ballast gravel on the membrane, PV
    roofTop: surface('gravel', { tint: 'paint', color: '#8f8e8a', contrast: 1.1, roughness: 1 }),
    pv: pvMaterial(),
    pvFrame: new THREE.MeshStandardMaterial({ color: '#1a1b1d', roughness: 0.35, metalness: 0.7 }),
    pvBack: plain('#d9dadb', { roughness: 0.7 }),
    rail: new THREE.MeshStandardMaterial({ color: '#a9adb0', roughness: 0.35, metalness: 0.9 }),
    ballast: surface('concrete', { tint: 'paint', color: '#a6a49f', contrast: 0.8, roughness: 0.95 }),
    // porch, canopy soffit, steps
    porch: surface('concrete', { tint: 'paint', color: '#9c9a95', contrast: 0.85, normalScale: 0.5, roughness: 0.85 }),
    cavity: plain('#0d0d0c', { roughness: 1 }),
    garageIn: plain('#2a2a29', { roughness: 0.95 }),
    // interior seen through the glazing: white walls and ceilings, oak floor, warm light in the evening
    roomWall: surface('plaster', { tint: 'paint', color: '#eeebe5', contrast: 0.35, normalScale: 0.2, roughness: 0.9 }),
    roomCeil: plain('#f3f1ed', { roughness: 0.95 }),
    roomFloor: surface('oak', { tint: 'stain', color: '#b38d62', keep: 0.6, contrast: 1.05, roughness: 0.5 }),
    roomFurniture: surface('oak', { tint: 'stain', color: '#a07c55', keep: 0.6, roughness: 0.6 }),
    sofa: plain('#8d877d'),
    curtain: plain('#d9d3c7', { roughness: 1, side: THREE.DoubleSide }),
    sheer: plain('#f2efe9', { roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.3, depthWrite: false }),
    downlight: new THREE.MeshStandardMaterial({ color: '#f4f2ee', emissive: '#fff1dc', emissiveIntensity: 0 }),
    sconce: new THREE.MeshStandardMaterial({ color: '#1e1f21', roughness: 0.4, metalness: 0.5 }),
    sconceGlow: new THREE.MeshStandardMaterial({ color: '#333', emissive: '#ffcf8a', emissiveIntensity: 0 }),
  };
  m.slat.envMapIntensity = 0.55;
  m.glass.userData.noShadow = true;
  m.sheer.userData.noShadow = true;
  for (const k of ['roomWall', 'roomCeil', 'roomFloor', 'roomFurniture', 'sofa', 'curtain', 'downlight']) m[k].userData.noShadow = true;
  return m;
}

// Monocrystalline all-black module, 108 half-cut cells (6 × 18 pairs), drawn on a canvas: cells with a faint
// pyramid texture, busbars, the black backsheet between cells and the split line in the middle.
let pvTex;
function pvMaterial() {
  if (!pvTex) {
    const W = 512, H = 1024;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#07090c';
    x.fillRect(0, 0, W, H);
    const cols = 6, rows = 18, m = 10, g = 3, mid = 10;
    const cw = (W - 2 * m - (cols - 1) * g) / cols;
    const ch = (H - 2 * m - mid - (rows - 2) * g) / rows;
    const R = mulberry(11);
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const cx = m + i * (cw + g), cy = m + j * (ch + g) + (j >= rows / 2 ? mid - g : 0);
        const v = 18 + R() * 7;
        const grd = x.createLinearGradient(cx, cy, cx + cw, cy + ch);
        grd.addColorStop(0, `rgb(${v - 4},${v + 1},${v + 12})`);
        grd.addColorStop(1, `rgb(${v - 7},${v - 3},${v + 6})`);
        x.fillStyle = grd;
        x.fillRect(cx, cy, cw, ch);
        // busbars (multi-busbar, very thin)
        x.fillStyle = 'rgba(120,128,140,0.55)';
        for (let b = 1; b <= 9; b++) x.fillRect(cx + (cw * b) / 10 - 0.5, cy, 1, ch);
      }
    pvTex = new THREE.CanvasTexture(c);
    pvTex.colorSpace = THREE.SRGBColorSpace;
    pvTex.anisotropy = 8;
  }
  const mat = new THREE.MeshPhysicalMaterial({
    map: pvTex, color: '#ffffff', roughness: 0.32, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.2,
  });
  return mat;
}

// ---------------------------------------------------------------- helpers
const mul = (a, b) => new THREE.Matrix4().multiplyMatrices(a, b);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** Wall frame from p0 to p1 (left → right seen from outside), origin on the outer face at ground level. */
function face(p0, p1) {
  const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const a = [(p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L];
  const o = [-a[1], a[0]];
  const m = new THREE.Matrix4().makeBasis(V3(a[0], 0, a[1]), V3(0, 1, 0), V3(o[0], 0, o[1])).setPosition(p0[0], 0, p0[1]);
  return { m, L };
}

/** Rectangle [x0,x1]×[y0,y1] minus rectangular holes, as a list of solid rectangles (bands × free intervals). */
function rects(x0, x1, y0, y1, holes) {
  const hs = holes.filter((h) => h.x1 > x0 && h.x0 < x1 && h.y1 > y0 && h.y0 < y1);
  const ys = [...new Set([y0, y1, ...hs.flatMap((h) => [h.y0, h.y1]).filter((y) => y > y0 && y < y1)])].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const ya = ys[i], yb = ys[i + 1], ym = (ya + yb) / 2;
    const cut = hs.filter((h) => h.y0 <= ym && h.y1 >= ym).map((h) => [Math.max(x0, h.x0), Math.min(x1, h.x1)]).sort((a, b) => a[0] - b[0]);
    let x = x0;
    for (const [a, b] of cut) {
      if (a > x + 1e-4) out.push([x, a, ya, yb]);
      x = Math.max(x, b);
    }
    if (x < x1 - 1e-4) out.push([x, x1, ya, yb]);
  }
  return out;
}

/** Box placed in wall-local space with UVs in wall metres (continuous texture across pieces). */
function blk(w, h, d, cx, cy, cz, grainAxis) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(cx, cy, cz);
  metreUV(g, grainAxis ? { grainAxis } : {});
  return g;
}

/**
 * A wall: render above the plinth, recessed concrete plinth band below, holes for the openings, metal coping on top.
 * spec: { x0, x1, top, thk, holes:[{x0,x1,y0,y1}], coping: bool }
 */
function wall(K, F, { x0 = 0, x1, top, thk = THK, holes = [], coping = true, bottom = -0.15, ext = F.ext || 0 }) {
  const B = K.batch;
  // a metal window box lines the opening: widen the hole so the render reveal sits inside the box, not on its faces
  holes = holes.map((h) => {
    const p = h.box ? [BOXIN, BOXIN, (h.boxOpts?.sides ?? 'all') === 'all' ? BOXIN : 0, BOXIN] : h.pad;
    return p ? { x0: h.x0 - p[0], x1: h.x1 + p[1], y0: h.y0 - p[2], y1: h.y1 + p[3] } : h;
  });
  for (const [a, b, ya, yb] of rects(x0, x1, PL, top, holes)) B.add('stucco', blk(b - a, yb - ya, thk, (a + b) / 2, (ya + yb) / 2, -thk / 2), F.m);
  // plinth: 30 mm shadow recess
  for (const [a, b, ya, yb] of rects(x0, x1, bottom, PL, holes)) B.add('plinth', blk(b - a, yb - ya, thk - 0.03, (a + b) / 2, (ya + yb) / 2, -thk / 2 - 0.015), F.m);
  if (coping) {
    // folded coping: cap with a 60 mm drip on both faces. Full-length walls run the cap 35 mm past their ends; walls
    // between them (ext = their thickness) stop the cap at the neighbours' caps and run only the outer drip over the
    // corner. Each wall sits a millimetre apart in height so touching caps never share a plane (no z-fighting).
    const e = ((K.copings = (K.copings || 0) + 1) % 4) * 0.0012;
    const yc = top + e;
    const cap = ext ? [x0 + 0.035, x1 - 0.035] : [x0 - 0.035, x1 + 0.035];
    B.add('coping', blk(cap[1] - cap[0], 0.012, thk + 0.07, (cap[0] + cap[1]) / 2, yc + 0.006, -thk / 2), F.m);
    const dr = ext ? [x0 - ext - 0.035, x1 + ext + 0.035] : [x0 - 0.035, x1 + 0.035];
    B.add('coping', blk(dr[1] - dr[0], 0.064, 0.012, (dr[0] + dr[1]) / 2, yc - 0.032, 0.029), F.m);
    B.add('coping', blk(x1 - x0 - (ext ? 0.07 : 0), 0.064, 0.012, (x0 + x1) / 2, yc - 0.032, -thk - 0.029), F.m);
  }
}

/** Vertical larch battens 42 × 45 mm at 70 mm centres over a black membrane, cut around holes. */
function slats(K, F, { x0, x1, y0, y1, holes = [], w = 0.042, d = 0.045, pitch = 0.07 }) {
  const B = K.batch, R = K.rnd;
  for (const [a, b, ya, yb] of rects(x0, x1, y0, y1, holes)) B.add('slatBack', blk(b - a, yb - ya, 0.008, (a + b) / 2, (ya + yb) / 2, 0.004), F.m);
  const n = Math.floor((x1 - x0 + pitch - w) / pitch);
  const off = (x1 - x0 - (n - 1) * pitch - w) / 2;
  for (let i = 0; i < n; i++) {
    const sx = x0 + off + i * pitch;
    const tone = 0.86 + R() * 0.2;
    for (const [a, b, ya, yb] of rects(sx, sx + w, y0, y1, holes)) {
      if (b - a < w - 1e-3) continue; // partially cut batten: leave it out
      const g = blk(w, yb - ya, d, (a + b) / 2, (ya + yb) / 2, 0.008 + d / 2, 'y');
      // vary the grain origin per batten
      const uv = g.attributes.uv, du = R() * 4, dv = R() * 4;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) + du, uv.getY(k) + dv);
      B.add('slat', g, F.m, tone);
    }
  }
}

const BOXIN = 0.024; // how far the wall hole is widened under a window box (box sheet 30 mm)

/** Projecting window box (обрамление) in powder-coated aluminium around an opening. */
function windowBox(K, F, { x0, x1, y0, y1 }, { proud = 0.09, t = 0.03, back = 0.16, sides = 'all' } = {}) {
  const B = K.batch, d = proud + back, zc = (proud - back) / 2;
  const w = x1 - x0, h = y1 - y0;
  B.add('flashing', blk(w + 2 * t, t, d, (x0 + x1) / 2, y1 + t / 2, zc), F.m);
  B.add('flashing', blk(t, h, d, x0 - t / 2, (y0 + y1) / 2, zc), F.m);
  B.add('flashing', blk(t, h, d, x1 + t / 2, (y0 + y1) / 2, zc), F.m);
  if (sides === 'all') B.add('flashing', blk(w + 2 * t, t, d, (x0 + x1) / 2, y0 - t / 2, zc), F.m);
}

/** Glazed opening with the frame set back in the wall; room behind. */
function win(K, F, o, cfgRoom) {
  const w = o.x1 - o.x0, h = o.y1 - o.y0;
  addWindow(K, F.m, {
    x: (o.x0 + o.x1) / 2, y: o.y0, w, h, cols: o.cols || [1], opens: o.opens || [false], style: 'modern',
    door: !!o.door, wallThk: THK, setBack: o.setBack ?? 0.16, sillOut: 0.05, curtains: !!o.curtains, noTrim: !!o.box,
    room: o.room === false ? false : { depth: 3.6, ext: 0.6, ...cfgRoom, ...(o.room || {}) },
  });
  // the box runs 25 mm behind the frame face so no seam opens between them
  if (o.box) windowBox(K, F, o, { back: (o.setBack ?? 0.16) + 0.025, ...(o.boxOpts || {}) });
}

// ---------------------------------------------------------------- build
function build(cfg, mats = materials()) {
  const K = { batch: new Batch(), mats, rnd: rng(209) };
  const B = K.batch;
  const lights = [];
  const office = cfg.garage === 'office';
  K.interior = { x0: A.x0 + THK + 0.02, x1: SV.x1 - THK - 0.02, z0: A.z0 + THK + 0.02, z1: SV.z1 - THK - 0.02 };
  const room1 = (y) => ({ floor: FL1 - y, ceil: FL1 + CLR - y });
  const room2 = (y) => ({ floor: FL2 - y, ceil: FL2 + CLR - y });
  const R1 = (o, extra = {}) => ({ ...o, room: { ...room1(o.y0), ...extra } });
  const R2 = (o, extra = {}) => ({ ...o, room: { ...room2(o.y0), ...extra } });

  // ---------------------------------------------------------------- living block A
  // south (street) wall, local x = X + 5.4
  {
    const F = face([A.x0, A.z1], [A.x1, A.z1]);
    const kitchen = { x0: 0.55, x1: 3.05, y0: FL1 + 1.0, y1: FL1 + 2.85, box: true };
    const door = { x0: 4.62, x1: 5.72, y0: FL1, y1: FL1 + 2.75, pad: [BOXIN, 0, 0, BOXIN] };
    const side = { x0: 5.86, x1: 6.62, y0: FL1, y1: FL1 + 2.75, pad: [0, BOXIN, 0, BOXIN] };
    const bed = { x0: 0.8, x1: 3.4, y0: FL2 + 0.45, y1: FL2 + 2.95, box: true, curtains: true, opens: [false, true], cols: [0.5, 0.5] };
    const bath = { x0: 5.55, x1: 6.65, y0: FL2 + 1.55, y1: FL2 + 2.55, box: true };
    wall(K, F, { x1: F.L, top: TOP, holes: [kitchen, door, side, bed, bath] });
    win(K, F, R1(kitchen, { furniture: false, depth: 3.2 }));
    win(K, F, R1({ ...side, door: true, setBack: 0.2 }, { furniture: false }));
    windowBox(K, F, { ...door, x1: side.x1 }, { back: 0.225, proud: 0.07, sides: 'top' });
    // entrance: insulated aluminium door with a flush leaf and long bar handle, set 200 mm into the wall
    addDoor(K, mul(F.m, M(0, 0, -0.13)), { x: (door.x0 + door.x1) / 2, y: FL1 - 0.02, w: door.x1 - door.x0, h: door.y1 - door.y0 + 0.02, style: 'panel', grooves: 0, handleSide: -1, room: false });
    B.add('cavity', blk(door.x1 - door.x0, door.y1 - door.y0, 0.02, (door.x0 + door.x1) / 2, (door.y0 + door.y1) / 2, -THK + 0.01), F.m);
    win(K, F, R2(bed, { furniture: 'bed' }));
    win(K, F, R2(bath, { furniture: false, depth: 2.2 }));
    // larch battens across the porch wall (ground floor, under the canopy) and the band above it
    slats(K, F, { x0: 3.75, x1: F.L, y0: PL, y1: FL2 - 0.22, holes: [pad(door, 0.0), pad(side, 0.0)] });
    slats(K, F, { x0: 3.75, x1: F.L, y0: FL2 + 0.02, y1: TOP - 0.1, holes: [pad(bath, 0.03)] });
    lights.push(sconce(K, F, 4.3, FL1 + 2.3, 0.053));
  }
  // north (garden) wall, local x = 1.9 − X
  {
    const F = face([A.x1, A.z0], [A.x0, A.z0]);
    const g1 = { x0: 0.55, x1: 3.3, y0: FL1, y1: FL1 + 2.95, door: true, cols: [0.5, 0.5], opens: [true, false], box: true, curtains: true };
    const g2 = { x0: 4.05, x1: 6.85, y0: FL1, y1: FL1 + 2.95, door: true, cols: [0.5, 0.5], opens: [false, true], box: true, curtains: true };
    const u1 = { x0: 0.6, x1: 3.2, y0: FL2 + 0.45, y1: FL2 + 2.95, box: true, curtains: true, cols: [0.5, 0.5], opens: [true, false] };
    const u2 = { x0: 4.15, x1: 6.75, y0: FL2 + 0.45, y1: FL2 + 2.95, box: true, curtains: true, cols: [0.5, 0.5], opens: [false, true] };
    wall(K, F, { x1: F.L, top: TOP, holes: [g1, g2, u1, u2] });
    win(K, F, R1(g1, { furniture: 'sofa', depth: 4.5 }));
    win(K, F, R1(g2, { furniture: 'sofa', depth: 4.5 }));
    win(K, F, R2(u1, { furniture: 'bed' }));
    win(K, F, R2(u2, { furniture: 'bed' }));
    // battens on the pier between the living-room glazings, full height
    slats(K, F, { x0: 3.42, x1: 3.93, y0: PL, y1: TOP - 0.1 });
  }
  // west wall, local x = Z + 6.26
  {
    const F = face([A.x0, A.z0 + THK], [A.x0, A.z1 - THK]);
    F.ext = THK;
    const s1 = { x0: 5.5, x1: 6.2, y0: FL1 + 0.3, y1: FL1 + 2.95, box: true };
    const s2 = { x0: 5.5, x1: 6.2, y0: FL2 + 0.3, y1: FL2 + 2.95, box: true };
    wall(K, F, { x1: F.L, top: TOP, holes: [s1, s2] });
    win(K, F, R1(s1, { furniture: false }));
    win(K, F, R2(s2, { furniture: false }));
    slats(K, F, { x0: 3.9, x1: 7.8, y0: PL, y1: TOP - 0.1, holes: [pad(s1, 0.03), pad(s2, 0.03)] });
  }
  // east wall above the plant room, local x from z = −5.55 northwards
  {
    const F = face([A.x1, SV.z0], [A.x1, A.z0 + THK]);
    wall(K, F, { x1: F.L, top: TOP });
  }

  // ---------------------------------------------------------------- service block B
  // south: garage door / office glazing under the fourth bedroom, local x = X − 1.9
  {
    const F = face([SV.x0, SV.z1], [SV.x1, SV.z1]);
    const gate = office ? { x0: 0.42, x1: 3.08, y0: FL1, y1: FL1 + 2.95, box: true } : { x0: 0.45, x1: 3.05, y0: 0.06, y1: 2.56, pad: [BOXIN, BOXIN, 0, BOXIN] };
    const bed = { x0: 0.5, x1: 3.0, y0: FL2 + 0.3, y1: FL2 + 2.95, box: true, boxOpts: { proud: 0.22 }, curtains: true, cols: [0.5, 0.5], opens: [false, true] };
    wall(K, F, { x1: F.L, top: TOP, holes: [gate, bed] });
    if (office) win(K, F, R1({ ...gate, door: true, cols: [0.36, 0.64], opens: [true, false], box: true, setBack: 0.2 }, { furniture: 'sofa', depth: 5.2, ext: 0.3 }));
    else garageDoor(K, F, gate);
    win(K, F, R2(bed, { furniture: 'bed', ext: 0.4 }));
    slats(K, F, { x0: 0, x1: F.L, y0: PL, y1: FL2 - 0.22, holes: [pad(gate, 0.0)] });
    lights.push(sconce(K, F, 0.22, FL1 + 2.3, 0.053));
  }
  // east, local x = 6.26 − Z (from the street end northwards)
  {
    const F = face([SV.x1, SV.z1 - THK], [SV.x1, SV.z0 + THK]);
    F.ext = THK;
    const strip = { x0: 1.2, x1: 4.6, y0: FL1 + 2.25, y1: FL1 + 2.85, box: true };
    const wc = { x0: 5.8, x1: 6.4, y0: FL1 + 1.8, y1: FL1 + 2.7, box: true };
    const stair = { x0: 8.15, x1: 8.95, y0: FL1 + 0.6, y1: FL2 + 2.95, box: true };
    const bed = { x0: 1.2, x1: 2.9, y0: FL2 + 0.45, y1: FL2 + 2.95, box: true, curtains: true };
    const bath = { x0: 6.6, x1: 7.4, y0: FL2 + 1.6, y1: FL2 + 2.5, box: true };
    wall(K, F, { x1: F.L, top: TOP, holes: [strip, wc, stair, bed, bath] });
    win(K, F, office ? R1(strip, { furniture: false, depth: 2.9 }) : { ...strip, room: false });
    if (!office) B.add('garageIn', blk(strip.x1 - strip.x0, strip.y1 - strip.y0, 0.02, (strip.x0 + strip.x1) / 2, (strip.y0 + strip.y1) / 2, -THK + 0.05), F.m);
    win(K, F, R1(wc, { furniture: false, depth: 1.6 }));
    win(K, F, { ...stair, room: { floor: FL1 - stair.y0, ceil: FL2 + CLR - stair.y0, depth: 2.6, furniture: false } });
    win(K, F, R2(bed, { furniture: 'bed', depth: 2.9 }));
    win(K, F, R2(bath, { furniture: false, depth: 1.8 }));
    slats(K, F, { x0: 7.55, x1: 9.55, y0: PL, y1: TOP - 0.1, holes: [pad(stair, 0.03)] });
  }
  // west, facing the porch, local x = Z − 4.7
  {
    const F = face([SV.x0, A.z1], [SV.x0, SV.z1 - THK]);
    wall(K, F, { x1: F.L, top: TOP });
    slats(K, F, { x0: 0, x1: F.L + THK + 0.053, y0: PL, y1: FL2 - 0.22 });
  }
  // north (above the plant room)
  {
    const F = face([SV.x1, SV.z0], [SV.x0, SV.z0]);
    wall(K, F, { x1: F.L, top: TOP });
  }

  // ---------------------------------------------------------------- plant room (котельная) with the PV inverters
  {
    const t = P.thk;
    const N = face([P.x1, P.z0], [P.x0, P.z0]);
    wall(K, N, { x1: N.L, top: P.top, thk: t });
    const E = face([P.x1, SV.z0], [P.x1, P.z0 + t]);
    const pd = { x0: 0.55, x1: 1.5, y0: 0.32, y1: 2.42 };
    wall(K, E, { x1: E.L, top: P.top, thk: t, holes: [pd] });
    addDoor(K, mul(E.m, M(0, 0, -0.05)), { x: (pd.x0 + pd.x1) / 2, y: pd.y0, w: pd.x1 - pd.x0, h: pd.y1 - pd.y0, style: 'panel', grooves: 6, handleSide: 1, room: false });
    B.add('cavity', blk(pd.x1 - pd.x0, pd.y1 - pd.y0, 0.02, (pd.x0 + pd.x1) / 2, (pd.y0 + pd.y1) / 2, -t + 0.01), E.m);
    const W = face([P.x0, P.z0 + t], [P.x0, A.z0]);
    wall(K, W, { x1: W.L, top: P.top, thk: t });
    B.add('roofTop', blk(P.x1 - P.x0 - 2 * t, 0.06, SV.z0 - P.z0 - t, (P.x0 + P.x1) / 2, P.roof, (P.z0 + t + SV.z0) / 2), null);
    // ventilation louvre
    B.add('flashing', blk(0.6, 0.4, 0.04, 2.2, 2.2, 0.02), N.m);
    for (let i = 0; i < 7; i++) B.add('frameDark', blk(0.56, 0.012, 0.03, 2.2, 2.03 + i * 0.055, 0.035), N.m);
  }

  // ---------------------------------------------------------------- roof (inside the parapets) and PV
  B.add('roofTop', blk(A.x1 - A.x0 - THK, 0.06, A.z1 - A.z0 - 2 * THK, (A.x0 + THK + A.x1) / 2, ROOF, (A.z0 + A.z1) / 2), null);
  B.add('roofTop', blk(SV.x1 - SV.x0 - THK, 0.06, SV.z1 - SV.z0 - 2 * THK, (SV.x0 + SV.x1 - THK) / 2, ROOF, (SV.z0 + SV.z1) / 2), null);
  // parapet inner faces need no extra geometry: the walls run up to TOP
  const pv = solar(K, cfg.panels ?? 12);

  // roof hatch / skylight over the stair, ventilation outlets
  B.add('flashing', blk(1.1, 0.35, 1.1, 0, 0, 0), M(3.65, ROOF + 0.17, -4.35));
  B.add('glass', blk(1.0, 0.02, 1.0, 0, 0, 0), M(3.65, ROOF + 0.36, -4.35));
  for (const [x, z] of [[-4.45, 3.9], [-4.45, -1.2]]) {
    B.add('flashing', new THREE.CylinderGeometry(0.08, 0.08, 0.6, 24), M(x, ROOF + 0.3, z));
    B.add('flashing', new THREE.CylinderGeometry(0.12, 0.09, 0.1, 24), M(x, ROOF + 0.63, z));
  }

  // ---------------------------------------------------------------- entrance porch: canopy, landing, steps
  {
    const { x0, x1, z0 } = PORCH;
    const z1 = SV.z1; // canopy flush with the garage front
    const cy0 = FL2 - 0.3, cy1 = FL2 - 0.05;
    B.add('stucco', blk(x1 - x0 + 0.02, cy1 - cy0, z1 - z0, (x0 + x1) / 2 - 0.01, (cy0 + cy1) / 2, (z0 + z1) / 2), null);
    B.add('coping', blk(x1 - x0 + 0.02, 0.012, z1 - z0 + 0.04, (x0 + x1) / 2 - 0.01, cy1 + 0.006, (z0 + z1) / 2 + 0.02), null);
    B.add('coping', blk(0.012, 0.06, z1 - z0 + 0.04, x0 - 0.014, cy1 - 0.03, (z0 + z1) / 2 + 0.02), null);
    B.add('coping', blk(x1 - x0 + 0.008, 0.06, 0.012, (x0 + x1) / 2 - 0.004, cy1 - 0.03, z1 + 0.034), null);
    // recessed downlights in the canopy soffit
    for (const [x, z] of [[-0.95, 5.35], [0.55, 5.35], [-0.95, 6.25], [0.55, 6.25]]) {
      const c = new THREE.CircleGeometry(0.05, 24);
      c.rotateX(Math.PI / 2);
      B.add('downlight', c, M(x, cy0 - 0.002, z));
    }
    // landing and three risers of 167 mm
    const yl = FL1 - 0.02;
    B.add('porch', blk(x1 - x0, yl + 0.2, PORCH.z1 - z0, (x0 + x1) / 2, (yl - 0.2) / 2, (z0 + PORCH.z1) / 2), null);
    const n = 3, rise = yl / n, run = 0.32;
    for (let i = 1; i < n; i++) {
      const top = yl - i * rise;
      B.add('porch', blk(x1 - x0 - 0.3, top + 0.2, run, (x0 + x1) / 2 - 0.15, (top - 0.2) / 2, PORCH.z1 + (i - 0.5) * run), null);
    }
    PORCH.stepsEnd = PORCH.z1 + (n - 1) * run;
    lights.push(...[[-0.95, 5.35], [0.55, 5.35], [-0.95, 6.25], [0.55, 6.25]].map(([x, z]) => ({ type: 'pool', pos: V3(x, yl, z) })));
  }
  // garage apron, or a landing with a step in front of the office glazing
  if (office) {
    B.add('porch', blk(3.0, FL1 + 0.18, 0.9, (SV.x0 + SV.x1) / 2, (FL1 - 0.2) / 2 - 0.01, SV.z1 + 0.45), null);
    B.add('porch', blk(3.0, FL1 / 2 + 0.2, 0.34, (SV.x0 + SV.x1) / 2, (FL1 / 2 - 0.2) / 2, SV.z1 + 1.07), null);
  } else B.add('porch', blk(SV.x1 - SV.x0 - 0.1, 0.2, 0.5, (SV.x0 + SV.x1) / 2, -0.05, SV.z1 + 0.25), null);

  // ---------------------------------------------------------------- carport for the home-office variant
  if (office) carport(K);

  const group = B.build(mats);
  group.name = 'tuto';
  // the roof gravel and canopy cast shadows but the big flat roof slab should not self-shadow the PV through AO
  return {
    group, mats, lights, pv,
    bounds: { x0: A.x0, x1: SV.x1, z0: P.z0, z1: SV.z1 },
    meta: { FL1, FL2, ROOF, TOP },
  };
}

const pad = (o, p) => ({ x0: o.x0 - p - 0.035, x1: o.x1 + p + 0.035, y0: o.y0 - p - 0.035, y1: o.y1 + p + 0.035 });

function sconce(K, F, x, y, dz = 0) {
  addSconce(K, mul(F.m, M(0, 0, dz)), x, y);
  return { type: 'wash', pos: V3(x, y, 0.065 + dz).applyMatrix4(F.m), out: V3(0, 0, 1).transformDirection(F.m) };
}

/** Insulated sectional garage door: 4 panels with micro-ribs, set 150 mm into the opening. */
function garageDoor(K, F, o) {
  const B = K.batch;
  const w = o.x1 - o.x0, h = o.y1 - o.y0, z = -0.15;
  const n = 4, ph = h / n;
  for (let i = 0; i < n; i++) {
    const y = o.y0 + i * ph;
    B.add('gate', blk(w, ph - 0.006, 0.04, (o.x0 + o.x1) / 2, y + ph / 2, z - 0.02), F.m);
    B.add('gateGroove', blk(w, 0.008, 0.035, (o.x0 + o.x1) / 2, y + ph - 0.002, z - 0.02), F.m);
    for (let k = 1; k < 5; k++) B.add('gateGroove', blk(w - 0.01, 0.003, 0.002, (o.x0 + o.x1) / 2, y + (ph * k) / 5, z + 0.001), F.m);
  }
  windowBox(K, F, { ...o, y0: o.y0 }, { back: 0.15, proud: 0.09, sides: 'top' });
  B.add('garageIn', blk(w, h, 0.02, (o.x0 + o.x1) / 2, o.y0 + h / 2, -THK + 0.01), F.m);
}

/** Steel carport: four SHS posts, flat roof with a powder-coated fascia and a larch soffit. */
function carport(K) {
  const B = K.batch;
  const { x0, x1, z0, z1, y } = CP;
  const T = 0.26;
  for (const [x, z] of [[x0 + 0.15, z0 + 0.15], [x1 - 0.15, z0 + 0.15], [x0 + 0.15, z1 - 0.15], [x1 - 0.15, z1 - 0.15], [x1 - 0.15, (z0 + z1) / 2]])
    B.add('gate', blk(0.1, y, 0.1, x, y / 2, z), null);
  B.add('gate', blk(x1 - x0, T, 0.05, (x0 + x1) / 2, y + T / 2, z1 - 0.025), null);
  B.add('gate', blk(x1 - x0, T, 0.05, (x0 + x1) / 2, y + T / 2, z0 + 0.025), null);
  B.add('gate', blk(0.05, T, z1 - z0, x1 - 0.025, y + T / 2, (z0 + z1) / 2), null);
  B.add('gate', blk(0.05, T, z1 - z0, x0 + 0.025, y + T / 2, (z0 + z1) / 2), null);
  B.add('gate', blk(x1 - x0, 0.02, z1 - z0, (x0 + x1) / 2, y + T - 0.03, (z0 + z1) / 2), null);
  // larch soffit boards along z
  const R = K.rnd;
  for (let x = x0 + 0.06; x < x1 - 0.1; x += 0.1) {
    const g = blk(0.085, 0.02, z1 - z0 - 0.1, x + 0.0425, y + 0.012, (z0 + z1) / 2, 'z');
    B.add('slat', g, null, 0.86 + R() * 0.2);
  }
  B.add('slatBack', blk(x1 - x0 - 0.1, 0.01, z1 - z0 - 0.1, (x0 + x1) / 2, y + 0.04, (z0 + z1) / 2), null);
}

// ---------------------------------------------------------------- PV array
/**
 * Ballasted rows of 1134 × 2278 mm modules (portrait, 12° to the south) on the flat roofs. The candidate slots are
 * ordered so that the Standard package fills the middle of the living block and Maximum adds the rest.
 */
function solar(K, count) {
  const B = K.batch;
  const W = 1.134, L = 2.278, tilt = (12 * Math.PI) / 180, gap = 0.02;
  const inA = (x, z) => x > A.x0 + THK + 0.25 && x < A.x1 + 0.2 && z > A.z0 + THK + 0.3 && z < A.z1 - THK - 0.15;
  const inB = (x, z) => x > SV.x0 - 0.2 && x < SV.x1 - THK - 0.25 && z > SV.z0 + THK + 0.3 && z < SV.z1 - THK - 0.3;
  const inRoof = (x, z) => inA(x, z) || inB(x, z);
  const dz = L * Math.cos(tilt);
  const slots = [];
  const rowsZ = [-5.95, -3.35, -0.75, 1.85]; // 2.6 m pitch
  rowsZ.forEach((z0, r) => {
    for (let c = 0; c < 9; c++) {
      const xc = -4.3 + c * (W + gap);
      const ok = [[xc - W / 2, z0], [xc + W / 2, z0], [xc - W / 2, z0 + dz], [xc + W / 2, z0 + dz]].every(([x, z]) => inRoof(x, z));
      if (ok) slots.push({ x: xc, z: z0 + dz / 2, r, c });
    }
  });
  // Standard: a 4 × 3 block over the living block; Maximum fills the remaining slots row by row
  const std = (s) => s.r <= 2 && s.c >= 1 && s.c <= 4;
  slots.sort((a, b) => std(b) - std(a) || a.r - b.r || a.c - b.c);
  const used = slots.slice(0, count);
  const yb = ROOF + 0.03;
  for (const s of used) {
    const lift = 0.12; // ballast trays and rails
    const yc = yb + lift + (L / 2) * Math.sin(tilt);
    const m = M(s.x, yc, s.z, tilt, 0, 0);
    // module: frame, laminate with the cell texture, white backsheet underneath
    B.add('pvFrame', box(W, 0.035, L), m);
    const top = new THREE.PlaneGeometry(W - 0.03, L - 0.03);
    top.rotateX(-Math.PI / 2);
    top.translate(0, 0.0185, 0);
    B.add('pv', top, m);
    // mounting: two aluminium A-frames on concrete ballast blocks
    for (const sx of [-W / 2 + 0.2, W / 2 - 0.2]) {
      const zf = s.z + dz / 2 - 0.15, zr = s.z - dz / 2 + 0.15;
      const hf = yb + lift - 0.05 + 0.15 * Math.sin(tilt), hr = yb + lift - 0.05 + (L - 0.15) * Math.sin(tilt);
      B.add('rail', box(0.04, 0.04, dz - 0.1), M(s.x + sx, yb + 0.07, s.z));
      B.add('rail', box(0.035, hf - yb - 0.07, 0.035), M(s.x + sx, (hf + yb + 0.07) / 2, zf));
      B.add('rail', box(0.035, hr - yb - 0.07, 0.035), M(s.x + sx, (hr + yb + 0.07) / 2, zr));
      B.add('ballast', box(0.2, 0.05, 0.4, { round: 0.006 }), M(s.x + sx, yb + 0.025, zf));
      B.add('ballast', box(0.2, 0.05, 0.4, { round: 0.006 }), M(s.x + sx, yb + 0.025, zr));
    }
  }
  return { count: used.length, slots: slots.length };
}

// ---------------------------------------------------------------- plot
/**
 * Plot as on the TUTO village renders: lawn, a concrete-slab drive to the garage (or the carport), a slab path to the
 * porch, a gravel drip strip around the house, a garden terrace on the north side, kerbed asphalt street in front.
 */
function site(built, cfg, houseMats) {
  const Bt = new Batch();
  const R = mulberry(31);
  const office = cfg.garage === 'office';
  const slab = (cx, cz, w, d, key = 'pavers', y = 0.022) => {
    const g = box(w, 0.05, d, { round: 0.005 });
    const uv = g.attributes.uv, ou = R() * 3, ov = R() * 3;
    for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) + ou, uv.getY(j) + ov);
    Bt.add(key, g, M(cx, y, cz), 0.92 + R() * 0.12);
  };
  const field = (x0, x1, z0, z1, sw, sd, key, stagger = false, skip) => {
    Bt.add('bedding', box(x1 - x0, 0.03, z1 - z0), M((x0 + x1) / 2, 0.012, (z0 + z1) / 2));
    const j = 0.008;
    const nz = Math.max(1, Math.round((z1 - z0) / (sd + j)));
    const d = (z1 - z0 + j) / nz - j;
    for (let k = 0; k < nz; k++) {
      const off = stagger && k % 2 ? sw / 2 : 0;
      for (let x = x0 - off; x < x1 - 0.02; x += sw + j) {
        const a = Math.max(x0, x), b = Math.min(x1, x + sw);
        if (b - a < 0.05) continue;
        const cz = z0 + d / 2 + k * (d + j);
        if (skip && skip((a + b) / 2, cz)) continue;
        slab((a + b) / 2, cz, b - a, d, key);
      }
    }
  };
  const ROADZ = 15.0;
  // drive: to the garage door, or to the carport (with a walkway to the office door)
  const drive = office ? [CP.x0 + 0.05, CP.x1 - 0.05] : [SV.x0 + 0.05, SV.x1 - 0.05];
  field(drive[0], drive[1], office ? CP.z0 + 0.2 : SV.z1 + 0.5, ROADZ, 0.6, 1.2, 'pavers', true);
  if (office) field(SV.x0 + 0.3, CP.x0 + 0.05, SV.z1 + 0.5, SV.z1 + 1.7, 0.6, 1.2, 'pavers', true);
  // porch path
  field(PORCH.x0 + 0.35, PORCH.x1 - 0.15, PORCH.stepsEnd + 0.02, ROADZ, 1.2, 0.6, 'path');
  // garden terrace on the north side
  field(A.x0 + 0.4, A.x1 - 0.6, A.z0 - 4.2, A.z0 - 0.45, 1.2, 0.6, 'path');
  // gravel drip strip (0.45 m) around the house, steel edging
  const g = (x0, x1, z0, z1) => Bt.add('gravel', box(x1 - x0, 0.04, z1 - z0), M((x0 + x1) / 2, 0.012, (z0 + z1) / 2));
  const e = 0.45;
  g(A.x0 - e, A.x1, A.z0 - e, A.z0); // north A (under the terrace edge)
  g(P.x0, P.x1 + e, P.z0 - e, P.z0); // north plant room
  g(A.x0 - e, A.x0, A.z0, A.z1 + e); // west
  g(A.x0, PORCH.x0, A.z1, A.z1 + e); // south A, west of the porch
  g(SV.x1, SV.x1 + e, P.z0 - e, SV.z1 + (office ? 0 : 0)); // east
  // street: asphalt with granite kerbs and a pavement on the far side
  Bt.add('asphalt', box(120, 0.05, 6.5), M(0, 0.01, ROADZ + 3.4));
  for (const z of [ROADZ + 0.08, ROADZ + 6.72]) Bt.add('kerb', box(120, 0.18, 0.16, { round: 0.01 }), M(0, 0.06, z));
  field(-40, 40, ROADZ + 6.8, ROADZ + 8.6, 0.6, 0.6, 'path');
  const group = new THREE.Group();
  group.add(Bt.build(siteMaterials(), { castShadow: false }));
  group.add(fence(cfg, houseMats));
  group.name = 'site';
  return group;
}

/**
 * Plot fence 1.6 m: steel posts and horizontal louvres in the frame colour (gate colour option), a sliding gate across
 * the drive and a wicket at the path on the street side.
 */
function fence(cfg, mats) {
  const F = new Batch();
  const H = 1.6, ZF = 14.4, X0 = -9.6, X1 = 10.6, ZB = -14.5;
  const office = cfg.garage === 'office';
  const gate = office ? [CP.x0 - 0.25, CP.x1 + 0.25] : [SV.x0 - 0.25, SV.x1 + 0.25];
  const wicket = [0.35, 1.35];
  const post = (x, z, h) => F.add('gate', box(0.06, h + 0.05, 0.06), M(x, (h + 0.05) / 2, z));
  // a run of bays between a and b (plan points), louvres 90 mm with 35 mm gaps
  const run = (a, b, { frame = false, h = H, pitch = 0.125 } = {}) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ang = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
    const n = Math.max(1, Math.round(L / 2.5));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (!frame || i === 0 || i === n) post(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, h);
    }
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    for (let y = 0.12; y < h - 0.05; y += pitch) F.add('gate', box(L - 0.06, 0.09, 0.018), M(cx, y + 0.045, cz, 0, ang, 0));
    if (frame) {
      F.add('gate', box(L - 0.06, 0.05, 0.04), M(cx, h - 0.02, cz, 0, ang, 0));
      F.add('gate', box(L - 0.06, 0.05, 0.04), M(cx, 0.1, cz, 0, ang, 0));
    }
  };
  // street side: fence | wicket | fence | sliding gate | fence
  const xs = [X0, wicket[0], wicket[1], gate[0], gate[1], X1].sort((p, q) => p - q);
  const segs = [];
  for (let i = 0; i < xs.length - 1; i++) segs.push([xs[i], xs[i + 1]]);
  for (const [a, b] of segs) {
    const isGate = Math.abs(a - gate[0]) < 1e-6, isWicket = Math.abs(a - wicket[0]) < 1e-6;
    if (b - a < 0.05) continue;
    // street side lower and more open (1.3 m, 60 mm gaps) so the house reads from the road
    run([a + (isGate || isWicket ? 0.05 : 0), ZF], [b - (isGate || isWicket ? 0.05 : 0), ZF], { frame: isGate || isWicket, h: 1.3, pitch: 0.15 });
  }
  // gate track and wicket handle
  F.add('gate', box(gate[1] - gate[0] + 3.5, 0.03, 0.06), M((gate[0] + gate[1]) / 2 + 1.75, 0.015, ZF + 0.05));
  F.add('hwSteel', box(0.02, 0.18, 0.03), M(wicket[0] + 0.12, 1.0, ZF + 0.03));
  // sides and back
  run([X0, ZB], [X0, ZF]);
  run([X1, ZF], [X1, ZB]);
  run([X1, ZB], [X0, ZB]);
  const g = F.build(mats);
  g.name = 'fence';
  return g;
}

let _siteMats;
function siteMaterials() {
  if (_siteMats) return _siteMats;
  _siteMats = {
    pavers: surface('concrete', { tint: 'paint', color: '#8c8a85', contrast: 0.75, normalScale: 0.5, roughness: 0.88, vertexColors: true }),
    path: surface('plaster', { tint: 'paint', color: '#b9b5ac', contrast: 0.8, normalScale: 0.5, roughness: 0.85, vertexColors: true }),
    bedding: new THREE.MeshStandardMaterial({ color: '#3f3d3a', roughness: 1 }),
    gravel: surface('gravel', { roughness: 1, tint: 'paint', color: '#d6d2ca', contrast: 1.25 }),
    asphalt: surface('gravel', { roughness: 0.95, tint: 'paint', color: '#4a4b4d', contrast: 0.55, normalScale: 0.6, tile: [0.9, 0.9] }),
    kerb: surface('concrete', { tint: 'paint', color: '#a8a7a3', contrast: 0.7, roughness: 0.85 }),
  };
  // the street and the far pavement run out into the projected panorama together with the lawn
  for (const k of ['asphalt', 'kerb', 'path', 'bedding']) ditherFade(_siteMats[k]);
  return _siteMats;
}

export { CP, A, SV, P, PORCH };
