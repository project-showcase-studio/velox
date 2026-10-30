// PBR materials: photographed texture sets (albedo + normal + AO/roughness) with the configurator
// colour applied in the shader, so one texture serves every paint/stain colour.
import * as THREE from 'three';

export const BASE = globalThis.HOUSE_ASSETS_BASE || 'assets/';

const SETS = {
  larch: { dir: 'larch', tile: [1.0, 1.0] }, // Poly Haven white_oak_veneer: fine straight grain, reads as larch decking
  pine: { dir: 'pine', tile: [0.9, 1.6] }, // Poly Haven kitchen_wood: planed pine — the «Штиль» cladding board
  plaster: { dir: 'plaster', tile: [0.9, 0.9] }, // Poly Haven white_stucco_02: Ceresit decorative plaster
  fibrolite: { dir: 'fibrolite', tile: [0.5, 0.5] }, // procedural wood-wool cement board (GREENBOARD)
  oak: { dir: 'oak', tile: [1.0, 1.0] }, // Poly Haven oak_veneer_01: warmer grain for interior joinery
  lining: { dir: 'lining', tile: [1.8, 1.8] }, // Poly Haven white_planks_clean: interior imitation-timber lining
  laminate: { dir: 'laminate', tile: [1.7, 1.7] }, // Poly Haven laminate_floor_03
  concrete: { dir: 'concrete', tile: [1.5, 1.5] },
  grass: { dir: 'grass', tile: [2.6, 2.6] },
  ground: { dir: 'ground', tile: [3, 3] },
  gravel: { dir: 'gravel', tile: [2.2, 2.2] },
};

const imgCache = new Map();
function loadImage(url) {
  if (!imgCache.has(url)) {
    imgCache.set(
      url,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image load failed: ' + url));
        img.src = url;
      }),
    );
  }
  return imgCache.get(url);
}

const setCache = new Map();
export function loadSet(key) {
  const set = SETS[key];
  if (!setCache.has(key)) {
    setCache.set(
      key,
      (async () => {
        const [color, normal, orm] = await Promise.all(
          ['color', 'normal', 'orm'].map((n) => loadImage(`${BASE}tex/${set.dir}/${n}.webp`)),
        );
        // albedo statistics (linear) for the tint normalisation
        const s = 64;
        const c = document.createElement('canvas');
        c.width = c.height = s;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(color, 0, 0, s, s);
        const d = ctx.getImageData(0, 0, s, s).data;
        const toLin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        let L = 0, R = 0, G = 0, B = 0;
        for (let i = 0; i < d.length; i += 4) {
          const r = toLin(d[i]), g = toLin(d[i + 1]), b = toLin(d[i + 2]);
          R += r; G += g; B += b;
          L += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }
        const n = d.length / 4;
        ctx.drawImage(orm, 0, 0, s, s);
        const o = ctx.getImageData(0, 0, s, s).data;
        let rough = 0;
        for (let i = 0; i < o.length; i += 4) rough += o[i + 1];
        const mk = (img, srgb) => {
          const t = new THREE.Texture(img);
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.anisotropy = 12;
          if (srgb) t.colorSpace = THREE.SRGBColorSpace;
          t.needsUpdate = true;
          return t;
        };
        return {
          linMeanLum: L / n,
          linMeanRGB: [R / n, G / n, B / n],
          meanRough: rough / n / 255,
          map: mk(color, true),
          normal: mk(normal, false),
          orm: mk(orm, false),
        };
      })(),
    );
  }
  return setCache.get(key);
}

export function preloadSets(keys) {
  keys.forEach((k) => loadSet(k).catch(() => {}));
}

// The photographed albedo becomes luminance (and optionally hue) detail around material.color:
//   paint   — keep = 0, low contrast: painted/lacquered wood, grain shows through the paint
//   stain   — keep ≈ 0.35: translucent stain, grain keeps some of its own colour
//   natural — the photo as is (colour = mean albedo, keep = 1)
function installTint(mat) {
  const u = (mat.userData.tintUniforms = {
    uMeanLum: { value: 0.2 },
    uMeanRGB: { value: new THREE.Vector3(0.2, 0.2, 0.2) },
    uContrast: { value: 1 },
    uKeep: { value: 0 },
  });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uMeanLum; uniform vec3 uMeanRGB; uniform float uContrast; uniform float uKeep;`,
      )
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 texC = texture2D(map, vMapUv);
          float tL = max(dot(texC.rgb, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
          float tF = min(pow(tL / uMeanLum, uContrast), 3.2);
          vec3 tChroma = (texC.rgb / max(uMeanRGB, vec3(1e-4))) / (tL / uMeanLum);
          diffuseColor.rgb *= mix(vec3(tF), tF * tChroma, uKeep);
        #endif`,
      );
  };
  mat.customProgramCacheKey = () => 'tint';
}

function applyFinish(mat) {
  const f = mat.userData.finish, S = mat.userData.S, u = mat.userData.tintUniforms;
  if (f.natural && S) mat.color.setRGB(S.linMeanRGB[0], S.linMeanRGB[1], S.linMeanRGB[2], THREE.LinearSRGBColorSpace);
  else mat.color.set(f.color);
  if (u && S) {
    u.uMeanLum.value = S.linMeanLum;
    u.uMeanRGB.value.set(...S.linMeanRGB);
    u.uContrast.value = f.natural ? 1 : f.contrast;
    u.uKeep.value = f.natural ? 1 : f.keep;
  }
  if (f.roughness != null && S) mat.roughness = Math.min(1, f.roughness / Math.max(0.15, S.meanRough));
}

/** Changes colour / tint mode of a surface() material: { color, keep, contrast, natural, roughness }. */
export function setFinish(mat, f) {
  Object.assign(mat.userData.finish, f);
  applyFinish(mat);
}

/**
 * Surface material backed by a photo texture set. Geometry UVs are expected in metres.
 * opts: { color, tint: 'none'|'paint'|'stain'|'natural', contrast, keep, roughness, normalScale, tile, metalness }
 */
export function surface(key, opts = {}) {
  const set = SETS[key];
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color ?? '#ffffff',
    roughness: opts.roughness ?? 0.8,
    metalness: opts.metalness ?? 0,
    vertexColors: !!opts.vertexColors,
    side: opts.side ?? THREE.FrontSide,
  });
  mat.name = key;
  const tint = opts.tint || 'none';
  mat.userData.finish = {
    color: opts.color ?? '#ffffff',
    natural: tint === 'natural',
    keep: opts.keep ?? (tint === 'stain' ? 0.35 : 0),
    contrast: opts.contrast ?? (tint === 'paint' ? 0.55 : 1),
    roughness: opts.roughness ?? 0.8,
  };
  if (tint !== 'none') installTint(mat);
  const tile = opts.tile || set.tile;
  loadSet(key)
    .then((S) => {
      const rep = (t) => {
        const c = t.clone();
        c.repeat.set(1 / tile[0], 1 / tile[1]);
        c.needsUpdate = true;
        return c;
      };
      mat.userData.S = S;
      if (opts.albedo !== false) mat.map = rep(S.map);
      mat.normalMap = rep(S.normal);
      const ns = opts.normalScale ?? 1;
      mat.normalScale.set(ns, ns);
      const orm = rep(S.orm);
      mat.roughnessMap = orm;
      mat.aoMap = orm;
      mat.aoMapIntensity = opts.ao ?? 1;
      if (tint === 'none' && opts.color == null) mat.userData.finish.color = '#ffffff';
      applyFinish(mat);
      mat.needsUpdate = true;
      onTextureReady.forEach((f) => f());
    })
    .catch((e) => console.warn('[tex]', key, e));
  return mat;
}

/** Callbacks fired whenever a texture set lands (used to request a re-render). */
export const onTextureReady = new Set();

// ---------------------------------------------------------------- procedural support textures
let _noiseTex;
/** Tileable value-noise texture (R) used for subtle roughness variation on painted metal. */
export function noiseTexture() {
  if (_noiseTex) return _noiseTex;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  const rnd = mulberry(7);
  const grid = (n) => Array.from({ length: n * n }, () => rnd());
  const layers = [
    [8, 0.5],
    [32, 0.3],
    [128, 0.2],
  ].map(([n, w]) => ({ n, w, g: grid(n) }));
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      let v = 0;
      for (const L of layers) {
        const fx = (x / S) * L.n, fy = (y / S) * L.n;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const tx = fx - ix, ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const g = (a, b) => L.g[((b + L.n) % L.n) * L.n + ((a + L.n) % L.n)];
        const a = g(ix, iy) + (g(ix + 1, iy) - g(ix, iy)) * sx;
        const b = g(ix, iy + 1) + (g(ix + 1, iy + 1) - g(ix, iy + 1)) * sx;
        v += (a + (b - a) * sy) * L.w;
      }
      const k = (y * S + x) * 4;
      const val = 200 + v * 55;
      img.data[k] = 255;
      img.data[k + 1] = val;
      img.data[k + 2] = 0;
      img.data[k + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  _noiseTex = new THREE.CanvasTexture(c);
  _noiseTex.wrapS = _noiseTex.wrapT = THREE.RepeatWrapping;
  _noiseTex.repeat.set(0.6, 0.6);
  return _noiseTex;
}

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Polyester-coated steel (roof, flashings, gutters). */
export function paintedMetal(color, { roughness = 0.42, metalness = 0.35 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  m.roughnessMap = noiseTexture();
  m.envMapIntensity = 1.0;
  return m;
}

/** Window glass: reflective, slightly tinted, lets the room behind read through. */
export function glass() {
  return new THREE.MeshPhysicalMaterial({
    color: '#4a565b',
    metalness: 0.05,
    roughness: 0.01,
    transparent: true,
    opacity: 0.4,
    reflectivity: 0.6,
    envMapIntensity: 1.35,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
