// The plot: anti-tiling photo lawn, white gravel bed with slab border, slab path, garden globes, trees (ez-tree) and shrubs.
import * as THREE from 'three';
import { loadSet, surface, mulberry } from './materials.js';
import { box, M, Batch, metreUV } from './geom.js';

// ---------------------------------------------------------------- lawn
export function makeGround() {
  const mat = new THREE.MeshStandardMaterial({ color: '#7d9a5a', roughness: 1 });
  const u = { uDirt: { value: null }, uOn: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) } };
  Promise.all([loadSet('grass'), loadSet('ground')]).then(([G, dirt]) => {
    const rep = (t, s) => {
      const c = t.clone();
      c.repeat.set(1 / s, 1 / s);
      c.needsUpdate = true;
      return c;
    };
    mat.map = rep(G.map, 2.6);
    mat.normalMap = rep(G.normal, 2.6);
    mat.normalScale.set(0.9, 0.9);
    const orm = rep(G.orm, 2.6);
    mat.roughnessMap = orm;
    mat.aoMap = orm;
    mat.color.set('#ffffff');
    u.uDirt.value = dirt.map;
    u.uOn.value = 1;
    mat.needsUpdate = true;
  });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uDirt; uniform float uOn; uniform vec3 uTint;
        float gH(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float gN(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(gH(i),gH(i+vec2(1,0)),f.x), mix(gH(i+vec2(0,1)),gH(i+vec2(1,1)),f.x), f.y); }
        float gF(vec2 p){ return 0.55*gN(p)+0.3*gN(p*2.13+3.1)+0.15*gN(p*4.7+7.7); }`,
      )
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec2 gUv = vMapUv;
          vec4 gA = texture2D(map, gUv);
          vec4 gB = texture2D(map, gUv * 0.37 + vec2(0.31, 0.77));
          vec4 gc = mix(gA, gB, smoothstep(0.35, 0.65, gF(gUv * 0.35)));
          float big = gF(gUv * 0.05 + 11.0);
          gc.rgb *= mix(vec3(0.78, 0.82, 0.7), vec3(1.02, 1.0, 0.86), big);
          float gl = dot(gc.rgb, vec3(0.2126, 0.7152, 0.0722));
          gc.rgb = mix(vec3(gl), gc.rgb, 0.68) * vec3(1.3, 1.26, 0.84) * uTint;
          float dm = smoothstep(0.72, 0.88, gF(gUv * 0.16 + 5.0)) * uOn * 0.3;
          diffuseColor *= mix(gc, texture2D(uDirt, gUv * 0.7), dm);
        #endif`,
      );
  };
  mat.customProgramCacheKey = () => 'lawn';
  ditherFade(mat);
  const g = new THREE.CircleGeometry(FADE.r1 + 1, 128);
  g.translate(FADE.x, -FADE.z, 0);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i));
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  mesh.name = 'ground';
  // lawn colour per panorama: fresh green by day, olive to sit in the autumn hills of the evening panorama
  mesh.userData.setTint = (r, g, b) => u.uTint.value.set(r, g, b);
  return mesh;
}

// ---------------------------------------------------------------- edge of the modelled plot
// Beyond FADE.r0 the plot blends into the ground of the ground-projected HDRI: the shader samples the same panorama
// pixel the dome would show there, so by FADE.r1 the lawn, street and pavement are exactly the photo. The engine keeps
// SKY in step with the panorama, its rotation and intensity.
export const FADE = { x: 0.5, z: 4, r0: 26, r1: 48 };
export const SKY = { uSky: { value: null }, uSkyRot: { value: 0 }, uSkyK: { value: 1 }, uSkyH: { value: 14 } };
export function ditherFade(mat, f = FADE) {
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, SKY);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFadeW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFadeW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vFadeW;
        uniform sampler2D uSky; uniform float uSkyRot; uniform float uSkyK; uniform float uSkyH;
        vec3 skyGround(vec3 w) {
          vec3 d = normalize(w - vec3(0.0, uSkyH, 0.0));
          float c = cos(uSkyRot), s = sin(uSkyRot);
          d = vec3(c * d.x - s * d.z, d.y, s * d.x + c * d.z); // into the dome's frame (rotation.y = uSkyRot)
          float u = atan(-d.z, -d.x) / (2.0 * PI);
          vec2 uv = vec2(fract(u), 1.0 - acos(clamp(d.y, -1.0, 1.0)) / PI);
          return texture2D(uSky, uv).rgb * uSkyK;
        }`,
      )
      .replace(
        '#include <fog_fragment>',
        `#include <fog_fragment>
        {
          float fk = smoothstep(${f.r0.toFixed(1)}, ${f.r1.toFixed(1)}, length(vFadeW.xz - vec2(${f.x.toFixed(2)}, ${f.z.toFixed(2)})));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, skyGround(vFadeW), fk);
        }`,
      );
  };
  mat.customProgramCacheKey = () => (prevKey ? prevKey.call(mat) : '') + '|fade';
  return mat;
}

// ---------------------------------------------------------------- hardscape around a house
/**
 * As on the DOMINNO renders: a bed of white marble chips around the house, optionally bordered by a ring of
 * 0.5 m concrete slabs, and a path of large-format slabs from the entrance outwards.
 * footprint: house rectangle incl. terraces; path: [[x, z]...]; apron: width of the gravel bed.
 */
export function makeHardscape({ footprint, path, apron = 0.6, border = false, landings = [] }) {
  const B = new Batch();
  const gravel = surface('gravel', { roughness: 1, tint: 'paint', color: '#d9d6cf', contrast: 1.25 });
  // fine-grain stucco tinted to concrete grey: the concrete photo carries panel seams that read as joints inside each slab
  const pavers = surface('plaster', { roughness: 0.85, tint: 'paint', color: '#7b7c7e', contrast: 0.9, normalScale: 0.6 });
  const edge = new THREE.MeshStandardMaterial({ color: '#5d5f61', roughness: 0.6, metalness: 0.4 });
  const bedding = new THREE.MeshStandardMaterial({ color: '#3f3d3a', roughness: 1 });
  const { x0, x1, z0, z1 } = footprint;
  const wd = apron;
  const strip = (cx, cz, w, d) => B.add('gravel', box(w, 0.04, d), M(cx, 0.014, cz));
  strip((x0 + x1) / 2, z0 - wd / 2, x1 - x0 + 2 * wd, wd);
  strip((x0 + x1) / 2, z1 + wd / 2, x1 - x0 + 2 * wd, wd);
  strip(x0 - wd / 2, (z0 + z1) / 2, wd, z1 - z0);
  strip(x1 + wd / 2, (z0 + z1) / 2, wd, z1 - z0);
  // gravel under the house (seen between the piles)
  strip((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0);
  const slab = (cx, cz, w, d, ang = 0) => {
    const g = box(w, 0.05, d, { round: 0.006 });
    // vary each slab's UV so the pattern doesn't repeat
    const uv = g.attributes.uv;
    const ou = Math.random() * 3, ov = Math.random() * 3;
    for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) + ou, uv.getY(j) + ov);
    B.add('pavers', g, M(cx, 0.022, cz, 0, ang, 0));
  };
  // paved landings at the foot of the steps: from the last tread out to the edge of the bed, 600 mm slabs on a
  // grid with 8 mm joints; the border ring stops at them
  const s = 0.5, gap = 0.06;
  const outer = border ? wd + 0.03 + s : wd; // edge of the bed beyond the footprint
  const pads = landings.map(({ x0: lx0, x1: lx1, z, dir }) => {
    const za = z + dir * 0.02, zb = dir > 0 ? z1 + outer : z0 - outer;
    return { x0: lx0, x1: lx1, z0: Math.min(za, zb), z1: Math.max(za, zb) };
  });
  for (const P of pads) {
    const j = 0.008;
    // sand bedding: the joints read dark, not as white gravel
    B.add('bedding', box(P.x1 - P.x0, 0.03, P.z1 - P.z0), M((P.x0 + P.x1) / 2, 0.022, (P.z0 + P.z1) / 2));
    const nx = Math.max(1, Math.round((P.x1 - P.x0 + j) / 0.6)), nz = Math.max(1, Math.round((P.z1 - P.z0 + j) / 0.6));
    const w = (P.x1 - P.x0 + j) / nx - j, d = (P.z1 - P.z0 + j) / nz - j;
    for (let i = 0; i < nx; i++)
      for (let k = 0; k < nz; k++) slab(P.x0 + w / 2 + i * (w + j), P.z0 + d / 2 + k * (d + j), w, d);
  }
  const onPad = (x, z, r) => pads.some((P) => x + r > P.x0 - gap && x - r < P.x1 + gap && z + r > P.z0 - gap && z - r < P.z1 + gap);
  if (border) {
    // ring of square slabs with lawn joints
    const ring = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / (s + gap)));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        if (!onPad(x, z, s / 2)) slab(x, z, s, s);
      }
    };
    // a slab exactly on each corner, the sides between them divided into even joints
    const e = wd + s / 2 + 0.03;
    const cx0 = x0 - e, cx1 = x1 + e, cz0 = z0 - e, cz1 = z1 + e;
    const side = (ax, az, bx, bz) => {
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / (s + gap)));
      for (let i = 1; i < n; i++) put(ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n);
    };
    const put = (x, z) => !onPad(x, z, s / 2) && slab(x, z, s, s);
    for (const [x, z] of [[cx0, cz0], [cx1, cz0], [cx0, cz1], [cx1, cz1]]) put(x, z);
    side(cx0, cz0, cx1, cz0);
    side(cx0, cz1, cx1, cz1);
    side(cx0, cz0, cx0, cz1);
    side(cx1, cz0, cx1, cz1);
  } else {
    // steel edging of the gravel strip
    for (const [cx, cz, w, d] of [
      [(x0 + x1) / 2, z0 - wd, x1 - x0 + 2 * wd + 0.01, 0.006],
      [(x0 + x1) / 2, z1 + wd, x1 - x0 + 2 * wd + 0.01, 0.006],
      [x0 - wd, (z0 + z1) / 2, 0.006, z1 - z0 + 2 * wd],
      [x1 + wd, (z0 + z1) / 2, 0.006, z1 - z0 + 2 * wd],
    ])
      B.add('edge', box(w, 0.05, d), M(cx, 0.02, cz));
  }
  // stepping stones (0.6 × 1.2, laid across the walking line) at an even 0.8 m pitch along a smooth curve,
  // starting just clear of the bed so none overlaps the border or the gravel
  if (path) {
    const pts = path.filter((p, i) => !i || Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]) > 0.05);
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    const len = curve.getLength();
    const bx0 = x0 - outer - 0.1, bx1 = x1 + outer + 0.1, bz0 = z0 - outer - 0.1, bz1 = z1 + outer + 0.1;
    const stone = (d) => {
      const p = curve.getPointAt(d / len), t = curve.getTangentAt(d / len);
      const ang = Math.atan2(-t.z, t.x);
      // corners of the stone: 0.3 along the tangent, 0.6 across
      const clear = [[-0.3, -0.6], [0.3, -0.6], [0.3, 0.6], [-0.3, 0.6]].every(([a, c]) => {
        const x = p.x + t.x * a - t.z * c, z = p.z + t.z * a + t.x * c;
        return !(x > bx0 && x < bx1 && z > bz0 && z < bz1);
      });
      return { p, ang, clear };
    };
    let d = 0;
    while (d < len && !stone(d).clear) d += 0.02;
    for (; d < len - 0.3; d += 0.8) {
      const S = stone(d);
      if (S.clear) slab(S.p.x, S.p.z, 0.6, 1.2, S.ang);
    }
  }
  const g = B.build({ gravel, pavers, edge, bedding }, { castShadow: false });
  g.name = 'hardscape';
  return g;
}

// ---------------------------------------------------------------- garden globes (as on the renders)
let globeMat;
/** White polyethylene light globes on the gravel: [[x, z, diameter]...]; glow in the evening. */
export function makeGlobes(list) {
  globeMat ||= Object.assign(new THREE.MeshPhysicalMaterial({ color: '#f3f1ec', roughness: 0.32, clearcoat: 0.4, clearcoatRoughness: 0.3, emissive: '#ffe7c4', emissiveIntensity: 0 }), {});
  globeMat.userData.glow = 4.5;
  const g = new THREE.Group();
  g.name = 'globes';
  for (const [x, z, d] of list) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(d / 2, 48, 32), globeMat);
    m.position.set(x, d / 2 - 0.02, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

// ---------------------------------------------------------------- planting beds
let mulchMat;
/** Bark-mulch bed under a shrub: a low irregular mound that grounds the plant on the lawn. */
export function mulchBed(x, z, r, seed = 1) {
  mulchMat ||= surface('ground', { tint: 'stain', color: '#4b3a2b', keep: 0.4, contrast: 1.3, roughness: 1 });
  const rnd = mulberry(seed * 977 + 13);
  const seg = 40;
  const g = new THREE.CircleGeometry(r, seg, 0, Math.PI * 2);
  const p = g.attributes.position;
  const ph = rnd() * 6.28;
  for (let i = 1; i < p.count; i++) {
    const a = Math.atan2(p.getY(i), p.getX(i));
    const k = 1 + 0.12 * Math.sin(a * 3 + ph) + 0.06 * Math.sin(a * 7 + ph * 2);
    p.setXY(i, p.getX(i) * k, p.getY(i) * k);
  }
  g.rotateX(-Math.PI / 2);
  // soft dome: 4 cm at the centre, feathered into the lawn
  for (let i = 0; i < p.count; i++) {
    const d = Math.hypot(p.getX(i), p.getZ(i)) / (r * 1.15);
    p.setY(i, 0.012 + 0.03 * Math.max(0, 1 - d * d));
  }
  g.computeVertexNormals();
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) + x, p.getZ(i) + z);
  const m = new THREE.Mesh(g, mulchMat);
  m.position.set(x, 0, z);
  m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- trees (ez-tree)
const TREES = {
  spruce: { preset: 'Pine Medium', height: 13, tint: 0x9fb197, count: 1.7, size: 1.25 },
  birch: { preset: 'Aspen Medium', height: 11, tint: 0xc9d6b4, leaf: 'ash', count: 1.8, size: 1.1 },
  // Lombardy poplar of the Almaty foothills: the aspen crown squeezed into a column
  poplar: { preset: 'Aspen Medium', height: 17, tint: 0xb0c08c, leaf: 'ash', count: 4.2, size: 1.35, narrow: 0.42 },
  aspen: { preset: 'Aspen Medium', height: 9, tint: 0xc3cf9d, leaf: 'ash', count: 2.0, size: 1.05 },
  // garden shrubs (height 1 m, scaled per planting): dense, leafy crowns
  bush1: { preset: 'Bush 1', height: 1, tint: 0x9fb48a, count: 2.2, size: 0.9 },
  bush2: { preset: 'Bush 1', height: 1, tint: 0xb2c294, count: 2.6, size: 1.0 },
  bush3: { preset: 'Bush 3', height: 1, tint: 0x8faa86, count: 2.0, size: 0.95 },
};
const protoCache = new Map();
async function treeProto(kind, seed) {
  const key = kind + seed;
  if (protoCache.has(key)) return protoCache.get(key);
  const p = (async () => {
    const { Tree } = await import('ez-tree');
    const K = TREES[kind];
    const tree = new Tree();
    tree.loadPreset(K.preset);
    tree.options.seed = seed;
    tree.options.leaves.tint = K.tint;
    if (K.leaf) tree.options.leaves.type = K.leaf;
    if (K.count) tree.options.leaves.count = Math.round(tree.options.leaves.count * K.count);
    if (K.size) tree.options.leaves.size *= K.size;
    tree.generate();
    const br = tree.branchesMesh, lv = tree.leavesMesh;
    const std = (ph, extra = {}) =>
      new THREE.MeshStandardMaterial({
        color: ph.color, map: ph.map || null, normalMap: ph.normalMap || null, aoMap: ph.aoMap || null, roughnessMap: ph.roughnessMap || null,
        roughness: 1, side: ph.side, alphaTest: ph.alphaTest, ...extra,
      });
    br.material = std(br.material);
    const lm = std(lv.material, { side: THREE.DoubleSide });
    // bend foliage normals outwards from the crown centre: soft, volumetric shading
    const lg = lv.geometry;
    lg.computeBoundingBox();
    const ctr = lg.boundingBox.getCenter(new THREE.Vector3());
    const pos = lg.attributes.position, nor = lg.attributes.normal;
    const v = new THREE.Vector3(), nn = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).sub(ctr).normalize();
      nn.fromBufferAttribute(nor, i);
      if (nn.dot(v) < 0) nn.negate();
      nn.lerp(v, 0.75).normalize();
      nor.setXYZ(i, nn.x, nn.y, nn.z);
    }
    lv.material = lm;
    const g = new THREE.Group();
    g.add(br, lv);
    [br, lv].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
    });
    const b = new THREE.Box3().setFromObject(g);
    const s = K.height / (b.max.y - b.min.y);
    g.scale.setScalar(s);
    g.position.y = -b.min.y * s;
    const w = new THREE.Group();
    w.add(g);
    // wait for textures
    const texs = [];
    w.traverse((o) => o.isMesh && ['map', 'normalMap', 'roughnessMap', 'aoMap'].forEach((k) => o.material[k] && texs.push(o.material[k])));
    await Promise.all(
      texs.map(
        (t) =>
          new Promise((res) => {
            const t0 = performance.now();
            const tick = () => (t.image && (t.image.naturalWidth || t.image.width) ? res() : performance.now() - t0 > 30000 ? res() : setTimeout(tick, 100));
            tick();
          }),
      ),
    );
    return w;
  })();
  protoCache.set(key, p);
  return p;
}

export async function makeTrees(spots, onEach) {
  const group = new THREE.Group();
  group.name = 'trees';
  for (const s of spots) {
    const proto = await treeProto(s.kind, s.seed);
    const t = proto.clone(true);
    t.position.set(s.x, 0, s.z);
    t.rotation.y = s.rot || 0;
    const sc = s.scale || 1, nw = TREES[s.kind].narrow || 1;
    t.scale.set(sc * nw, sc, sc * nw);
    if (s.far) t.traverse((o) => o.isMesh && (o.castShadow = false));
    group.add(t);
    onEach && onEach();
    await new Promise((r) => setTimeout(r, 0));
  }
  return group;
}

export { metreUV };
