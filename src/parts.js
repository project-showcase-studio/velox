// Detailed building parts: windows (incl. trapezoid lights), doors, gutters, lights, chimney. All built in a local frame
// (x along the wall, y up, z out of the wall, z = 0 on the outer wall face) and placed with a wall frame.
import * as THREE from 'three';
import { box, board, pipe, M, RoundedBoxGeometry, metreUV, insetPoly } from './geom.js';

const mul = (a, b) => new THREE.Matrix4().multiplyMatrices(a, b);

// ---------------------------------------------------------------- windows
/**
 * spec: { x, y, w, h, cols: [fractions], opens: [bool per col], split: [y fraction per col | null],
 *   grid: [nx, ny] muntins per light | null, style: 'classic' | 'modern', wallThk,
 *   room: { floor, ceil } (local y of interior floor/ceiling), curtains: bool, door: false }
 */
export function addWindow(K, W, spec) {
  const { x, y, w, h } = spec;
  const base = mul(W, M(x, y, 0));
  const B = K.batch;
  const rnd = K.rnd;
  if (spec.bare) {
    // opening of the wall panel as delivered: fibrolite reveals, no frame (glazing is an option)
    const thk = spec.wallThk ?? 0.2, t = 0.012;
    const add = (key, geo, m) => B.add(key, geo, mul(base, m));
    add('greenboard', box(w + 2 * t, t, thk), M(0, h + t / 2, -thk / 2));
    add('greenboard', box(w + 2 * t, t, thk), M(0, -t / 2, -thk / 2));
    add('greenboard', box(t, h, thk), M(-w / 2 - t / 2, h / 2, -thk / 2));
    add('greenboard', box(t, h, thk), M(w / 2 + t / 2, h / 2, -thk / 2));
    if (spec.room !== false) addRoom(K, base, { ...spec, curtains: false, room: { ...(spec.room || {}), furniture: false } }, thk);
    return;
  }
  const modern = spec.style === 'modern';
  const fk = 'frame';
  const fw = modern ? 0.07 : 0.062; // frame face width
  const fd = 0.07; // frame depth
  const zf = -(spec.setBack ?? 0.035) - fd / 2; // frame centre
  const add = (key, geo, m) => B.add(key, geo, mul(base, m));
  const rb = (bw, bh, bd, r = 0.004) => {
    const g = new RoundedBoxGeometry(bw, bh, bd, 2, r);
    metreUV(g);
    return g;
  };
  // outer frame
  add(fk, rb(w, fw, fd), M(0, h - fw / 2, zf));
  if (!spec.door) add(fk, rb(w, fw, fd), M(0, fw / 2, zf));
  add(fk, rb(fw, h - (spec.door ? fw : 2 * fw), fd), M(-w / 2 + fw / 2, spec.door ? (h - fw) / 2 : h / 2, zf));
  add(fk, rb(fw, h - (spec.door ? fw : 2 * fw), fd), M(w / 2 - fw / 2, spec.door ? (h - fw) / 2 : h / 2, zf));
  if (spec.door) add('frameDark', rb(w, 0.02, fd + 0.02), M(0, 0.01, zf)); // threshold
  // lights
  const cols = spec.cols || [1];
  const innerW = w - 2 * fw, mw = modern ? 0.08 : 0.075;
  const y0 = spec.door ? 0.01 : fw, y1 = h - fw;
  const totalW = innerW - mw * (cols.length - 1);
  let cx = -w / 2 + fw;
  cols.forEach((frac, i) => {
    const lw = totalW * frac;
    const lightX = cx + lw / 2;
    if (i < cols.length - 1) add(fk, rb(mw, y1 - y0, fd), M(cx + lw + mw / 2, (y0 + y1) / 2, zf));
    const split = spec.split?.[i];
    const rows = split ? [[y0, y0 + (y1 - y0) * split], [y0 + (y1 - y0) * split + mw, y1]] : [[y0, y1]];
    if (split) add(fk, rb(lw, mw, fd), M(lightX, y0 + (y1 - y0) * split + mw / 2, zf));
    rows.forEach(([ly0, ly1], ri) => {
      const lh = ly1 - ly0;
      const opens = !!spec.opens?.[i] && ri === rows.length - 1;
      let gx = lightX, gw = lw, gy = (ly0 + ly1) / 2, gh = lh;
      if (opens) {
        // sash: profiled frame slightly proud of the outer frame
        const sw = modern ? 0.075 : 0.068, sd = 0.068, zs = zf + 0.006;
        add(fk, rb(lw, sw, sd), M(lightX, ly1 - sw / 2, zs));
        add(fk, rb(lw, sw, sd), M(lightX, ly0 + sw / 2, zs));
        add(fk, rb(sw, lh - 2 * sw, sd), M(lightX - lw / 2 + sw / 2, gy, zs));
        add(fk, rb(sw, lh - 2 * sw, sd), M(lightX + lw / 2 - sw / 2, gy, zs));
        gw = lw - 2 * sw;
        gh = lh - 2 * sw;
        // gasket shadow line
        add('frameDark', box(lw + 0.004, 0.004, 0.004), M(lightX, ly1 + 0.001, zf + fd / 2 - 0.002));
      }
      // glazing beads
      const bd = 0.02;
      add(fk, rb(gw, bd, 0.022, 0.003), M(gx, gy + gh / 2 - bd / 2, zf + fd / 2 - 0.012 - (opens ? -0.006 : 0)));
      add(fk, rb(gw, bd, 0.022, 0.003), M(gx, gy - gh / 2 + bd / 2, zf + fd / 2 - 0.012 - (opens ? -0.006 : 0)));
      add(fk, rb(bd, gh - 2 * bd, 0.022, 0.003), M(gx - gw / 2 + bd / 2, gy, zf + fd / 2 - 0.012 - (opens ? -0.006 : 0)));
      add(fk, rb(bd, gh - 2 * bd, 0.022, 0.003), M(gx + gw / 2 - bd / 2, gy, zf + fd / 2 - 0.012 - (opens ? -0.006 : 0)));
      // glass (double pane: two sheets give a subtle double reflection)
      const pg = new THREE.PlaneGeometry(gw - 0.02, gh - 0.02);
      const pg2 = pg.clone();
      add('glass', pg, M(gx, gy, zf + 0.01));
      add('glass', pg2, M(gx, gy, zf - 0.016));
      // muntins (glued-on bars both sides)
      if (spec.grid) {
        const [nx, ny] = spec.grid;
        for (let k = 1; k < nx; k++) {
          const mx = gx - gw / 2 + (gw * k) / nx;
          add(fk, rb(0.024, gh - 0.02, 0.01, 0.003), M(mx, gy, zf + 0.018));
        }
        for (let k = 1; k < ny; k++) {
          const my = gy - gh / 2 + (gh * k) / ny;
          add(fk, rb(gw - 0.02, 0.024, 0.01, 0.003), M(gx, my, zf + 0.019));
        }
      }
    });
    cx += lw + mw;
  });

  const thk = spec.wallThk ?? 0.15;
  // reveals (откосы) from the frame to the wall face
  const revDepth = Math.max(0.005, -(zf + fd / 2));
  if (revDepth > 0.006 && !spec.noTrim) {
    const rk = modern ? 'flashing' : 'trim';
    const t = 0.012;
    add(rk, box(w + 2 * t, t, revDepth), M(0, h + t / 2, -revDepth / 2));
    add(rk, box(t, h, revDepth), M(-w / 2 - t / 2, h / 2, -revDepth / 2));
    add(rk, box(t, h, revDepth), M(w / 2 + t / 2, h / 2, -revDepth / 2));
    if (!spec.door) add(rk, box(w, t, revDepth), M(0, -t / 2, -revDepth / 2));
  }

  // casing / sill
  if (spec.casing) {
    const cw = spec.casing.width ?? 0.11, ct = 0.024;
    const ck = 'trim';
    // sides
    const sideH = h + cw + (spec.door ? 0 : 0.03);
    add(ck, board(sideH, cw, ct, rnd), M(-w / 2 - cw / 2 + 0.012, spec.door ? 0 : -0.03, ct / 2, 0, 0, Math.PI / 2));
    add(ck, board(sideH, cw, ct, rnd), M(w / 2 + cw / 2 - 0.012, spec.door ? 0 : -0.03, ct / 2, 0, 0, Math.PI / 2));
    // head with cornice
    const hw = w + 2 * cw + 0.03;
    add(ck, board(hw, cw + 0.03, ct + 0.006, rnd), M(-hw / 2, h + (cw + 0.03) / 2 - 0.012, (ct + 0.006) / 2));
    add(ck, board(hw + 0.06, 0.03, 0.065, rnd), M(-hw / 2 - 0.03, h + cw + 0.03 + 0.015 - 0.012, 0.0325));
    if (!spec.door) {
      // sill board with drip, sloping out
      const sw = w + 2 * cw + 0.04;
      add(ck, board(sw, 0.075, 0.03, rnd), M(-sw / 2, -0.03, 0.0375, Math.PI / 2 + 0.12, 0, 0));
      add(ck, board(w + 2 * cw - 0.02, 0.06, ct, rnd), M(-(w + 2 * cw - 0.02) / 2, -0.03 - 0.045 - 0.03, ct / 2));
    }
  } else if (!spec.door && !spec.noTrim) {
    // metal sill (отлив) for modern facades
    const sd = 0.075 + (spec.sillOut ?? 0.05);
    const g = new THREE.BoxGeometry(w + 0.04, 0.0015, sd);
    metreUV(g);
    add('flashing', g, M(0, -0.012, sd / 2 - 0.075, 0.12));
    add('flashing', box(w + 0.04, 0.03, 0.0015), M(0, -0.03, sd - 0.075 + 0.006));
    add('flashing', box(0.0015, 0.025, sd), M(-w / 2 - 0.02, -0.004, sd / 2 - 0.075));
    add('flashing', box(0.0015, 0.025, sd), M(w / 2 + 0.02, -0.004, sd / 2 - 0.075));
  }

  // interior behind the glass
  if (spec.room !== false) addRoom(K, base, spec, thk);
}

function addRoom(K, base, spec, thk) {
  const { w } = spec;
  const room = spec.room || {};
  // ceiling: flat at `ceil`, or sloped from `ceil` (left window edge) to `ceilR` (right edge), extrapolated
  // neighbouring rooms overlap: a few mm per room keeps their floors, ceilings and back walls off one plane
  const eps = ((K.rooms = (K.rooms || 0) + 1) % 6) * 0.003;
  const ceil = room.ceil ?? spec.h + 0.35;
  const fl = (room.floor ?? -0.85) + eps, c0 = ceil - eps, c1 = (room.ceilR ?? ceil) - eps;
  const cAt = (x) => c0 + ((c1 - c0) * (x + w / 2)) / w;
  let D = room.depth ?? 2.4;
  const ext = room.ext ?? 0.9;
  const z0 = -thk - 0.002;
  let xl = -w / 2 - ext, xr = w / 2 + ext;
  // keep the interior box inside the house: clamp to the inner faces of the outer walls (K.interior)
  if (K.interior) {
    const I = K.interior, m = 0.02;
    const o = new THREE.Vector3().setFromMatrixPosition(base);
    const ax = new THREE.Vector3().setFromMatrixColumn(base, 0);
    const az = new THREE.Vector3().setFromMatrixColumn(base, 2);
    const lim = { x: [I.x0 + m, I.x1 - m], z: [I.z0 + m, I.z1 - m] };
    const comp = (v) => (Math.abs(v.x) > 0.5 ? 'x' : 'z');
    // along the wall
    const ca = comp(ax), sa = Math.sign(ax[ca]);
    const [a0, a1] = lim[ca].map((v) => (v - o[ca]) * sa).sort((p, q) => p - q);
    xl = Math.max(xl, Math.min(a0, -w / 2));
    xr = Math.min(xr, Math.max(a1, w / 2));
    // depth (inwards = -out)
    const cz = comp(az), sz = Math.sign(az[cz]);
    const far = sz > 0 ? lim[cz][0] : lim[cz][1];
    D = Math.min(D, Math.abs(o[cz] - far) - thk - 0.01);
  }
  const z1 = z0 - D + eps;
  const cx = (xl + xr) / 2, RW = xr - xl;
  const cl = cAt(xl), cr = cAt(xr), cm = Math.min(cl, cr);
  const B = K.batch;
  const add = (key, geo, m) => B.add(key, geo, mul(base, m));
  const pl = (pw, ph) => metreUV(new THREE.PlaneGeometry(pw, ph));
  // quad facing direction n (room surfaces face inwards)
  const quad = (key, P, n) => {
    const g = new THREE.BufferGeometry();
    const [a, b, c, d] = P;
    const e1 = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), e2 = new THREE.Vector3(...c).sub(new THREE.Vector3(...a));
    const flip = e1.cross(e2).dot(new THREE.Vector3(...n)) < 0;
    const tri = flip ? [a, c, b, a, d, c] : [a, b, c, a, c, d];
    g.setAttribute('position', new THREE.Float32BufferAttribute(tri.flat(), 3));
    g.computeVertexNormals();
    add(key, metreUV(g), M());
  };
  // back wall, side walls, ceiling, floor, inner face of the window wall
  quad('roomWall', [[xl, fl, z1], [xr, fl, z1], [xr, cr, z1], [xl, cl, z1]], [0, 0, 1]);
  quad('roomWall', [[xl, fl, z0], [xl, fl, z1], [xl, cl, z1], [xl, cl, z0]], [1, 0, 0]);
  quad('roomWall', [[xr, fl, z1], [xr, fl, z0], [xr, cr, z0], [xr, cr, z1]], [-1, 0, 0]);
  quad('roomCeil', [[xl, cl, z0], [xr, cr, z0], [xr, cr, z1], [xl, cl, z1]], [0, -1, 0]);
  add('roomFloor', pl(RW, D), M(cx, fl, (z0 + z1) / 2, -Math.PI / 2, 0, 0));
  quad('roomWall', [[xl, fl, z0 + 0.001], [xr, fl, z0 + 0.001], [xr, cr, z0 + 0.001], [xl, cl, z0 + 0.001]], [0, 0, -1]);
  // furniture silhouettes give the room depth: a sofa or a bed with an oak sideboard / headboard
  if (!spec.door && room.furniture !== false && D > 1.1) {
    const fw = Math.min(2.0, RW - 0.2, w + 0.6);
    const zc = z1 + Math.min(0.55, D / 2 - 0.1);
    if (room.furniture === 'bed') {
      const bed = new RoundedBoxGeometry(Math.min(1.6, fw), 0.42, Math.min(2.0, D - 0.4), 3, 0.05);
      metreUV(bed);
      add('sofa', bed, M(cx, fl + 0.21, z1 + Math.min(1.0, D / 2)));
      add('roomFurniture', box(Math.min(1.8, fw + 0.2), 0.9, 0.06, { round: 0.01 }), M(cx, fl + 0.45, z1 + 0.04));
    } else {
      const sofa = new RoundedBoxGeometry(fw, 0.42, 0.85, 3, 0.07);
      metreUV(sofa);
      add('sofa', sofa, M(cx, fl + 0.21, zc));
      add('sofa', new RoundedBoxGeometry(fw, 0.38, 0.2, 3, 0.07), M(cx, fl + 0.6, zc - 0.33));
      add('roomFurniture', box(Math.min(1.6, RW - 0.2), 0.5, 0.4, { round: 0.008 }), M(cx, fl + 0.25, z1 + 0.21));
    }
  }
  // recessed downlights in the ceiling
  for (let gx = xl + 0.6; gx < xr - 0.3; gx += 1.2)
    for (let gz = z0 - 0.7; gz > z1 + 0.3; gz -= 1.3) {
      const c = new THREE.CircleGeometry(0.055, 24);
      c.rotateX(Math.PI / 2);
      add('downlight', c, M(gx, cAt(gx) - 0.003, gz));
    }
  if (spec.curtains) {
    const cH = cm - fl - 0.12;
    [-1, 1].forEach((s) => {
      const cw = Math.min(0.5, w * 0.28);
      const g = new THREE.PlaneGeometry(cw, cH, 24, 1);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) / cw + 0.5;
        p.setZ(i, Math.sin(u * Math.PI * 7) * 0.025);
      }
      g.computeVertexNormals();
      metreUV(g);
      add('curtain', g, M(s * (w / 2 - cw / 2 + 0.08), cm - 0.1 - cH / 2, z0 - 0.12));
    });
    // sheer
    const g = new THREE.PlaneGeometry(w + 0.2, cH, 40, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / (w + 0.2)) * Math.PI * 22) * 0.012);
    g.computeVertexNormals();
    metreUV(g);
    add('sheer', g, M(0, cm - 0.1 - cH / 2, z0 - 0.06));
  }
}

// ---------------------------------------------------------------- fixed windows of any convex shape
/**
 * Fixed (глухое) window following a convex polygon in the wall frame — the trapezoid lights under the roof slope.
 * spec: { pts: [[x, y]...], wallThk, setBack, room, bare }
 */
export function addPolyWindow(K, W, spec) {
  let pts = spec.pts.map((p) => [...p]);
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    area += x0 * y1 - x1 * y0;
  }
  if (area < 0) pts.reverse();
  const B = K.batch;
  const add = (key, geo, m = M()) => B.add(key, geo, mul(W, m));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, y0 = Math.min(...ys);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - y0;
  const thk = spec.wallThk ?? 0.2;
  const shape = (outer, hole) => {
    const s = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)));
    if (hole) s.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y)).reverse()));
    return s;
  };
  const ring = (outer, inner, depth, key, z) => {
    const g = new THREE.ExtrudeGeometry(shape(outer, inner), { depth, bevelEnabled: false, curveSegments: 1 });
    metreUV(g);
    add(key, g, M(0, 0, z));
  };
  const reveal = (key, depth, z) => {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const nx = (q[1] - p[1]) / L, ny = -(q[0] - p[0]) / L; // outward for CCW
      add(key, box(L + 0.024, 0.012, depth), M((p[0] + q[0]) / 2 + nx * 0.006, (p[1] + q[1]) / 2 + ny * 0.006, z - depth / 2, 0, 0, ang));
    }
  };
  if (spec.bare) {
    reveal('greenboard', thk, 0);
  } else {
    const fw = 0.07, fd = 0.07, zf = -(spec.setBack ?? 0.05) - fd / 2;
    const in1 = insetPoly(pts, fw), in2 = insetPoly(pts, fw + 0.02);
    ring(pts, in1, fd, 'frame', zf - fd / 2);
    ring(in1, in2, 0.022, 'frame', zf + fd / 2 - 0.024);
    const gl = insetPoly(pts, fw + 0.008);
    for (const z of [zf + 0.01, zf - 0.016]) {
      const g = new THREE.ShapeGeometry(shape(gl));
      metreUV(g);
      add('glass', g, M(0, 0, z));
    }
    reveal('flashing', Math.max(0.006, -(zf + fd / 2)), 0);
  }
  if (spec.room !== false) addRoom(K, mul(W, M(cx, y0, 0)), { w, h, room: { ...(spec.room || {}), furniture: false } }, thk);
}

// ---------------------------------------------------------------- doors
/** Entrance door: glazed PVC door (VEKA, style 'glass') or an insulated steel door with pressed panels. */
export function addDoor(K, W, spec) {
  const { x, w, h } = spec;
  const y = spec.y ?? 0;
  const base = mul(W, M(x, y, 0));
  const add = (key, geo, m) => K.batch.add(key, geo, mul(base, m));
  if (spec.style === 'glass') {
    addWindow(K, W, { ...spec, door: true, cols: [1], opens: [true], style: 'modern', room: spec.room });
    // PVC door lever handle on an escutcheon plate
    const hs = spec.handleSide ?? 1;
    const hx = hs * (w / 2 - 0.11), hy = 1.0, hz = -(spec.setBack ?? 0.035) + 0.004;
    const rb = (bw, bh, bd, r = 0.003) => metreUV(new RoundedBoxGeometry(bw, bh, bd, 2, r));
    add(spec.handleKey || 'hwBlack', rb(0.03, 0.2, 0.01), M(hx, hy - 0.04, hz + 0.005));
    add(spec.handleKey || 'hwBlack', new THREE.CylinderGeometry(0.009, 0.01, 0.045, 18), M(hx, hy, hz + 0.03, Math.PI / 2, 0, 0));
    add(spec.handleKey || 'hwBlack', rb(0.13, 0.018, 0.018, 0.006), M(hx - hs * 0.06, hy, hz + 0.052));
    return;
  }
  // frame (steel box profile)
  const fw = 0.05, fd = 0.08, zf = -0.03 - fd / 2;
  const rb = (bw, bh, bd, r = 0.004) => metreUV(new RoundedBoxGeometry(bw, bh, bd, 2, r));
  add('doorLeaf', rb(w, fw, fd), M(0, h - fw / 2, zf));
  add('doorLeaf', rb(fw, h - fw, fd), M(-w / 2 + fw / 2, (h - fw) / 2, zf));
  add('doorLeaf', rb(fw, h - fw, fd), M(w / 2 - fw / 2, (h - fw) / 2, zf));
  // aluminium threshold over the deck boards
  add('hwSteel', rb(w + 0.02, 0.02, 0.12, 0.003), M(0, 0.01, zf + 0.02));
  // leaf
  const lw = w - 2 * fw - 0.006, lh = h - fw - 0.012, lt = 0.06;
  const lz = zf + fd / 2 - lt / 2 + 0.004;
  add('doorLeaf', rb(lw, lh, lt, 0.006), M(0, 0.006 + lh / 2, lz));
  // flush leaf; optional horizontal pressed grooves
  const n = spec.grooves ?? 0;
  for (let i = 1; i < n; i++) {
    const gy = 0.006 + (lh * i) / n;
    add('frameDark', box(lw - 0.16, 0.006, 0.004), M(0, gy, lz + lt / 2 + 0.0005));
  }
  // lever handle + cylinder
  const hs = spec.handleSide ?? 1;
  const hx = hs * (lw / 2 - 0.075), hy = 1.0, hz = lz + lt / 2;
  add('hwSteel', rb(0.04, 0.26, 0.008, 0.003), M(hx, hy - 0.05, hz + 0.004));
  const neck = new THREE.CylinderGeometry(0.011, 0.012, 0.05, 20);
  add('hwSteel', neck, M(hx, hy, hz + 0.03, Math.PI / 2, 0, 0));
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(hx, hy, hz + 0.05),
    new THREE.Vector3(hx - hs * 0.02, hy, hz + 0.058),
    new THREE.Vector3(hx - hs * 0.07, hy, hz + 0.06),
    new THREE.Vector3(hx - hs * 0.125, hy - 0.004, hz + 0.054),
  ]);
  add('hwSteel', new THREE.TubeGeometry(curve, 24, 0.0095, 14, false), M());
  add('hwSteel', new THREE.SphereGeometry(0.0095, 14, 10), M(hx - hs * 0.125, hy - 0.004, hz + 0.054));
  add('hwSteel', new THREE.CylinderGeometry(0.014, 0.014, 0.006, 20), M(hx, hy - 0.14, hz + 0.004, Math.PI / 2, 0, 0));
  add('hwBrass', new THREE.CylinderGeometry(0.0085, 0.0085, 0.004, 20), M(hx, hy - 0.14, hz + 0.008, Math.PI / 2, 0, 0));
  // reveal + casing
  if (spec.casing) addWindowCasingOnly(K, base, w, h);
  if (spec.room !== false) addRoom(K, base, { ...spec, door: true, h }, spec.wallThk ?? 0.15);
}

function addWindowCasingOnly(K, base, w, h) {
  const add = (key, geo, m) => K.batch.add(key, geo, mul(base, m));
  const cw = 0.11, ct = 0.024, rnd = K.rnd;
  add('trim', board(h + cw, cw, ct, rnd), M(-w / 2 - cw / 2 + 0.012, 0, ct / 2, 0, 0, Math.PI / 2));
  add('trim', board(h + cw, cw, ct, rnd), M(w / 2 + cw / 2 - 0.012, 0, ct / 2, 0, 0, Math.PI / 2));
  const hw = w + 2 * cw + 0.03;
  add('trim', board(hw, cw + 0.03, ct + 0.006, rnd), M(-hw / 2, h + (cw + 0.03) / 2 - 0.012, (ct + 0.006) / 2));
  add('trim', board(hw + 0.06, 0.03, 0.065, rnd), M(-hw / 2 - 0.03, h + cw + 0.033, 0.0325));
  const t = 0.012, d = 0.035;
  add('trim', box(w, t, d), M(0, h + t / 2, -d / 2));
  add('trim', box(t, h, d), M(-w / 2 - t / 2, h / 2, -d / 2));
  add('trim', box(t, h, d), M(w / 2 + t / 2, h / 2, -d / 2));
}

// ---------------------------------------------------------------- gutters
/**
 * Half-round gutter along an eave from a to b (world), with hooks, end caps and downpipes.
 * downs: [{ t (0..1 along), wallPoint:[x,z] wall face below, ground }]
 */
export function addGutter(K, a, b, { r = 0.0625, key = 'gutter', downs = [], wallOut } = {}) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b);
  const L = A.distanceTo(Bv);
  const dir = Bv.clone().sub(A).normalize();
  const out = new THREE.Vector3(...wallOut);
  const up = new THREE.Vector3(0, 1, 0);
  const m = new THREE.Matrix4().makeBasis(dir, up, out).setPosition(A);
  // half pipe: cylinder segment open at the top, axis along local x
  const g = new THREE.CylinderGeometry(r, r, L, 28, 1, true, Math.PI, Math.PI);
  g.rotateZ(Math.PI / 2);
  metreUV(g);
  const gi = g.clone();
  K.batch.add(key, g, mul(m, M(L / 2, 0, 0)));
  gi.scale(1, 0.97, 0.97);
  // inner face (flip)
  const idx = gi.index.array;
  for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  const nn = gi.attributes.normal;
  for (let i = 0; i < nn.count; i++) nn.setXYZ(i, -nn.getX(i), -nn.getY(i), -nn.getZ(i));
  K.batch.add(key, gi, mul(m, M(L / 2, 0, 0)));
  // rolled bead on the outer lip
  const bead = new THREE.CylinderGeometry(0.008, 0.008, L, 12);
  bead.rotateZ(Math.PI / 2);
  K.batch.add(key, bead, mul(m, M(L / 2, 0.0, r)));
  // end caps
  [0, L].forEach((x) => {
    const c = new THREE.CircleGeometry(r, 28, Math.PI, Math.PI);
    c.rotateY(Math.PI / 2);
    const c2 = c.clone();
    c2.rotateY(Math.PI);
    K.batch.add(key, c, mul(m, M(x, 0, 0)));
    K.batch.add(key, c2, mul(m, M(x, 0, 0)));
  });
  // hooks
  const nh = Math.ceil(L / 0.6);
  for (let i = 0; i <= nh; i++) {
    const x = 0.1 + ((L - 0.2) * i) / nh;
    const hook = new THREE.TorusGeometry(r + 0.004, 0.004, 6, 20, Math.PI);
    hook.rotateY(Math.PI / 2);
    hook.rotateX(Math.PI);
    K.batch.add(key, hook, mul(m, M(x, 0, 0)));
    K.batch.add(key, box(0.025, 0.004, 0.09), mul(m, M(x, r + 0.002, -r - 0.03)));
  }
  // downpipes
  for (const d of downs) {
    const P = A.clone().lerp(Bv, d.t);
    const wallP = new THREE.Vector3(d.wall[0], 0, d.wall[1]);
    const pr = 0.045;
    const offset = 0.07; // pipe distance from wall
    const top = P.clone().add(new THREE.Vector3(0, -r - 0.02, 0));
    const atWall = new THREE.Vector3(wallP.x, 0, wallP.z).add(out.clone().multiplyScalar(offset));
    const pts = [
      [top.x, top.y + 0.02, top.z],
      [top.x, top.y - 0.12, top.z],
      [atWall.x, top.y - 0.4, atWall.z],
      [atWall.x, d.ground + 0.28, atWall.z],
      [atWall.x + out.x * 0.22, d.ground + 0.12, atWall.z + out.z * 0.22],
    ];
    K.batch.add(key, pipe(pts, pr, { bend: 0.1, radial: 20 }));
    // outlet funnel
    const fun = new THREE.CylinderGeometry(pr + 0.012, pr, 0.08, 20, 1, true);
    K.batch.add(key, fun, M(top.x, top.y - 0.0, top.z));
    // clamps
    const span = top.y - 0.4 - (d.ground + 0.28);
    const nc = Math.max(2, Math.ceil(span / 1.2));
    for (let i = 0; i <= nc; i++) {
      const cy = d.ground + 0.4 + ((span - 0.3) * i) / nc;
      const t = new THREE.TorusGeometry(pr + 0.004, 0.006, 6, 20);
      t.rotateX(Math.PI / 2);
      K.batch.add(key, t, M(atWall.x, cy, atWall.z));
      K.batch.add(key, box(0.02, 0.02, offset), M(atWall.x - out.x * (offset / 2 + pr), cy, atWall.z - out.z * (offset / 2 + pr)).multiply(new THREE.Matrix4().makeRotationY(Math.atan2(out.x, out.z))));
    }
  }
}

// ---------------------------------------------------------------- facade light (up/down cylinder sconce)
export function addSconce(K, W, x, y) {
  const base = mul(W, M(x, y, 0));
  const add = (k, g, m) => K.batch.add(k, g, mul(base, m));
  add('sconce', box(0.07, 0.11, 0.012, { round: 0.003 }), M(0, 0, 0.006));
  add('sconce', new THREE.CylinderGeometry(0.045, 0.045, 0.17, 32), M(0, 0, 0.062));
  for (const s of [1, -1]) {
    const ring = new THREE.CylinderGeometry(0.038, 0.038, 0.004, 32);
    add('sconceGlow', ring, M(0, s * 0.084, 0.062));
  }
}

// ---------------------------------------------------------------- chimney & vent outlets
/** Insulated steel flue (sandwich chimney) through a roof at plan point (x, z), from roof height yRoof to yTop. */
export function addChimney(K, { x, z, yRoof, yTop, r = 0.1, slope = 0 }) {
  const B = K.batch;
  const h = yTop - yRoof + 0.3;
  B.add('chimney', new THREE.CylinderGeometry(r, r, h, 40), M(x, yRoof - 0.3 + h / 2, z));
  // roof penetration collar (master flash) on the slope
  const collar = new THREE.CylinderGeometry(r + 0.09, r + 0.14, 0.12, 40);
  B.add('flashing', collar, M(x, yRoof + 0.04, z, 0, 0, slope));
  // cone cap with spark guard
  B.add('chimney', new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.03, 40), M(x, yTop + 0.015, z));
  B.add('chimney', new THREE.ConeGeometry(r + 0.07, 0.12, 40), M(x, yTop + 0.16, z));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    B.add('chimney', box(0.012, 0.1, 0.012), M(x + Math.cos(a) * (r - 0.01), yTop + 0.07, z + Math.sin(a) * (r - 0.01)));
  }
  // bands
  for (let y = yRoof + 0.35; y < yTop - 0.1; y += 0.5) B.add('chimney', new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.02, 40), M(x, y, z));
}

/** Vilpe-type vent outlet: insulated pipe with a hood. */
export function addVent(K, { x, z, yRoof, h = 0.75, r = 0.08, slope = 0 }) {
  const B = K.batch;
  B.add('flashing', new THREE.CylinderGeometry(r + 0.12, r + 0.12, 0.05, 32), M(x, yRoof + 0.02, z, 0, 0, slope));
  B.add('flashing', new THREE.CylinderGeometry(r, r, h, 32), M(x, yRoof + h / 2, z));
  B.add('flashing', new THREE.CylinderGeometry(r + 0.03, r + 0.01, 0.12, 32), M(x, yRoof + h + 0.05, z));
  B.add('flashing', new THREE.CylinderGeometry(r + 0.04, r + 0.04, 0.012, 32), M(x, yRoof + h + 0.11, z));
}
