import * as THREE from 'three';
import { Engine } from './engine.js';
import { COMPANY, PROJECT, FACADES, COLORS, GARAGE, KITCHEN, OFFGRID, GROUPS, DEFAULTS, pickOf, price, tg, signed } from './catalog.js';
import { preloadSets, onTextureReady, setFinish } from './materials.js';
import { setEvening } from './houses/kit.js';
import { makeGround, makeTrees, mulchBed } from './site.js';
import { TUTO } from './houses/tuto.js';
import { planSVG } from './plan.js';
import { makeSpec, preloadPdf } from './pdf.js';

const $ = (s) => document.querySelector(s);
const engine = new Engine($('#viewport'));
onTextureReady.add(() => engine.invalidate(3));
preloadSets(['plaster', 'concrete', 'larch', 'oak', 'gravel', 'grass', 'ground']);

// ---------------------------------------------------------------- state (shareable through the URL)
const params = new URLSearchParams(location.search);
const qcam = (params.get('cam') || '').split(',').map(Number);
if (params.has('clean')) document.body.classList.add('clean');
const state = { tod: params.get('tod') === 'evening' ? 'evening' : 'day', cfg: { ...DEFAULTS }, floor: 1 };
for (const g of Object.keys(GROUPS)) if (GROUPS[g].some((x) => x.id === params.get(g))) state.cfg[g] = params.get(g);
const shareURL = () => {
  const u = new URL(location.href);
  u.search = '';
  for (const [g, v] of Object.entries(state.cfg)) if (v !== DEFAULTS[g]) u.searchParams.set(g, v);
  return u.href;
};

// ---------------------------------------------------------------- scene
const scene = engine.scene;
const ground = makeGround();
scene.add(ground);
const world = new THREE.Group();
scene.add(world);
const def = TUTO;
const mats = def.materials();
let current = null; // { built, key, extras }

// a view pulled back on portrait screens so the whole house stays in frame
function view(name) {
  const [p, t] = def.views[name];
  const a = engine.camera.aspect;
  if (a >= 1.2) return [p, t];
  const k = Math.min(1.9, (1.2 / a) ** 0.62);
  return [p.map((v, i) => t[i] + (v - t[i]) * k), t];
}

const modelCfg = (c) => ({ garage: c.garage, panels: pickOf(c, 'offgrid').panels });
const structuralKey = (c) => JSON.stringify(modelCfg(c));

let building = Promise.resolve();
const rebuild = () => (building = building.then(doBuild));
async function doBuild() {
  const key = structuralKey(state.cfg);
  if (current && current.key === key) return;
  const built = def.build(modelCfg(state.cfg), mats);
  if (current) {
    world.remove(current.built.group, current.extras);
    current.built.group.traverse((m) => m.isMesh && m.geometry.dispose());
  }
  world.add(built.group);
  const extras = siteFor(built);
  world.add(extras);
  current = { built, key, extras };
  applyLooks();
  await applyTod();
  if (!state.started) {
    const [p, t] = qcam.length === 6 && qcam.every(Number.isFinite) ? [qcam.slice(0, 3), qcam.slice(3)] : view('main');
    engine.camera.position.set(...p);
    engine.controls.target.set(...t);
    state.started = true;
  }
  engine.invalidate(3);
}

// plot per garage variant (drive to the garage or to the carport); planting and trees are shared
const siteCache = {};
const shared = { trees: null, shrubs: null };
function siteFor(built) {
  const g = new THREE.Group();
  const v = state.cfg.garage;
  siteCache[v] ||= def.site(built, state.cfg, mats);
  g.add(siteCache[v]);
  const lights = new THREE.Group();
  for (const L of built.lights) lights.add(L.type === 'wash' ? wash(L) : pool(L));
  g.add(lights);
  if (!shared.trees) {
    shared.trees = new THREE.Group();
    shared.shrubs = new THREE.Group();
    scene.add(shared.trees, shared.shrubs);
    setTimeout(plant, 250);
  }
  return g;
}

// Planting as on the TUTO village renders: Lombardy poplar windbreaks, aspens and spruces, shrubs along the house.
async function plant() {
  const R = mulberry(5);
  const shrubs = [
    ['bush1', -4.6, 5.9, 0.9], ['bush3', -3.6, 6.15, 0.6], ['bush2', -2.6, 5.85, 0.8],
    ['bush3', -6.2, 2.0, 0.7], ['bush1', -6.3, -1.0, 1.0], ['bush2', -6.25, -4.4, 0.9],
    ['bush1', 6.4, -3.2, 1.0], ['bush3', 6.3, -6.5, 0.7], ['bush2', -3.6, 9.6, 0.75],
    ['bush3', -5.8, -7.6, 0.65], ['bush1', 2.3, -9.1, 0.9],
  ];
  shrubs.forEach(([, x, z, h], i) => shared.shrubs.add(mulchBed(x, z, h * 0.62 + 0.15, i + 1)));
  makeTrees(shrubs.map(([kind, x, z, h], i) => ({ kind, x, z, seed: 3 + i, rot: R() * 6.28, scale: h })), () => engine.invalidate()).then((t) => {
    shared.shrubs.add(t);
    engine.invalidate(3);
  });
  const spots = [
    { kind: 'aspen', x: -9.2, z: 4.2, seed: 21, scale: 1.0 }, { kind: 'aspen', x: -16.0, z: -4.5, seed: 22, scale: 1.15 },
    { kind: 'aspen', x: 13.5, z: -9.5, seed: 21, scale: 1.05 }, { kind: 'spruce', x: -13.5, z: -4.0, seed: 10, scale: 0.75 },
    { kind: 'aspen', x: -8.0, z: 12.0, seed: 22, scale: 0.85 },
  ].map((s) => ({ ...s, rot: R() * 6.28 }));
  // windbreak rows of poplars behind the plot and along its sides
  for (let x = -40; x <= 40; x += 4.2 + R() * 1.2) spots.push({ kind: 'poplar', x, z: -30 - R() * 3, seed: 30 + Math.floor(R() * 3), rot: R() * 6.28, scale: 0.85 + R() * 0.25 });
  for (let z = -24; z <= 4; z += 4.8 + R()) {
    spots.push({ kind: 'poplar', x: -25 - R() * 2, z, seed: 30 + Math.floor(R() * 3), rot: R() * 6.28, scale: 0.8 + R() * 0.25 });
    spots.push({ kind: 'poplar', x: 27 + R() * 2, z, seed: 30 + Math.floor(R() * 3), rot: R() * 6.28, scale: 0.8 + R() * 0.25 });
  }
  // neighbours' gardens across the street and the far edge
  for (let x = -34; x <= 34; x += 7 + R() * 3) spots.push({ kind: R() < 0.5 ? 'aspen' : 'birch', x, z: 29 + R() * 4, seed: 21 + Math.floor(R() * 2), rot: R() * 6.28, scale: 0.9 + R() * 0.3 });
  for (let i = 0; i < 22; i++) {
    const a = -Math.PI * 0.98 + (i / 22) * Math.PI * 1.96 + (R() - 0.5) * 0.12;
    const r = 58 + R() * 30;
    spots.push({ kind: R() < 0.6 ? 'aspen' : 'birch', x: Math.cos(a) * r, z: Math.sin(a) * r, seed: 21 + (i % 2), rot: R() * 6.28, scale: 0.9 + R() * 0.35, far: true });
  }
  const t = await makeTrees(spots, () => engine.invalidate());
  shared.trees.add(t);
  engine.invalidate(3);
}
function mulberry(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// light wash of a wall sconce and light pools of the canopy downlights (evening only)
const glowTex = {};
function glow(kind) {
  if (glowTex[kind]) return glowTex[kind];
  const W = kind === 'wash' ? 128 : 128, H = kind === 'wash' ? 256 : 128;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  const img = x.createImageData(W, H);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      let a;
      if (kind === 'wash') {
        const v = Math.abs(j - H / 2) / (H / 2), u = (i - W / 2) / (W / 2);
        const spread = 0.1 + v * 0.6;
        a = Math.max(0, 1 - Math.abs(u) / spread) ** 1.6 * Math.max(0, 1 - v) ** 1.2 * (v < 0.06 ? v / 0.06 : 1);
      } else {
        const r = Math.hypot(i - W / 2, j - H / 2) / (W / 2);
        a = Math.max(0, 1 - r) ** 2;
      }
      const k = (j * W + i) * 4;
      img.data[k] = 255;
      img.data[k + 1] = 196;
      img.data[k + 2] = 120;
      img.data[k + 3] = Math.min(255, a * 255);
    }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return (glowTex[kind] = t);
}
function glowMat(kind, strength) {
  const m = new THREE.MeshBasicMaterial({ map: glow(kind), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
  m.userData.evening = strength;
  return m;
}
function wash(L) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.3), glowMat('wash', 1.5));
  mesh.position.copy(L.pos).addScaledVector(L.out, -0.04);
  mesh.lookAt(mesh.position.clone().add(L.out));
  mesh.renderOrder = 2;
  return mesh;
}
function pool(L) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), glowMat('pool', 0.55));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(L.pos).add(new THREE.Vector3(0, 0.004, 0));
  mesh.renderOrder = 2;
  return mesh;
}

// ---------------------------------------------------------------- looks (material-only options)
function applyLooks() {
  if (!current) return;
  const f = pickOf(state.cfg, 'facade');
  const wallMat = f.wall.tex === 'concrete' ? mats.stuccoConc : mats.stucco;
  setFinish(wallMat, { color: f.wall.color });
  current.built.group.traverse((o) => o.isMesh && o.name === 'stucco' && (o.material = wallMat));
  setFinish(mats.slat, { natural: false, color: f.wood.color, keep: f.wood.keep, contrast: f.wood.contrast });
  const c = pickOf(state.cfg, 'color').color;
  for (const k of ['flashing', 'coping', 'frame', 'doorLeaf', 'gate']) mats[k].color.set(c);
  engine.invalidate(3);
}

async function applyTod() {
  await engine.setEnvironment(state.tod, def.sun);
  const ev = state.tod === 'evening';
  setEvening(mats, ev);
  ground.userData.setTint(...(ev ? [1.22, 1.08, 0.72] : [1, 1, 1]));
  current?.extras.traverse((o) => {
    if (o.isMesh && o.material.userData?.evening) o.material.opacity = ev ? o.material.userData.evening : 0;
  });
  engine.invalidate(3);
}

// ---------------------------------------------------------------- UI
const VIEWS = [
  ['main', 'Общий вид'],
  ['street', 'С улицы'],
  ['entrance', 'Вход'],
  ['garden', 'Сад'],
  ['top', 'Кровля'],
];
function renderHeader() {
  $('#views').innerHTML = VIEWS.map(([k, l]) => `<button data-v="${k}">${l}</button>`).join('');
  $('#tod').innerHTML = [['day', 'День'], ['evening', 'Вечер']].map(([k, l]) => `<button data-t="${k}" class="${state.tod === k ? 'on' : ''}">${l}</button>`).join('');
}
$('#views').onclick = (e) => {
  const b = e.target.closest('button');
  if (b) engine.flyTo(...view(b.dataset.v));
};
$('#tod').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b || b.dataset.t === state.tod) return;
  state.tod = b.dataset.t;
  renderHeader();
  applyTod();
};

function renderProject() {
  const P = PROJECT;
  $('#project').innerHTML = `
    <div class="eyebrow">${P.series.split(' · ').map((t) => `<span>${t}</span>`).join(' · ')}</div>
    <h1>${P.name}</h1>
    <p class="tag">${P.tagline}</p>
    <dl class="specs">${P.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <details class="incl"><summary>Что входит в базовую стоимость</summary>
      <dl>${P.included.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    </details>`;
}

const delta = (n) => `<em class="${n < 0 ? 'neg' : ''}">${signed(n)}</em>`;
function cards(group, items, extra = () => '') {
  const v = state.cfg[group];
  const three = items.length === 3 ? ' three' : '';
  return `<div class="cards${three}">${items
    .map((it) => `<button data-g="${group}" data-v="${it.id}" class="card ${v === it.id ? 'on' : ''}" aria-pressed="${v === it.id}">
      ${it.swatch ? `<i class="duo" style="--a:${it.swatch[0]};--b:${it.swatch[1]}"></i>` : ''}
      <span class="ct"><b>${it.label}</b><small>${it.note || ''}</small>${extra(it)}</span>${delta(it.price)}</button>`)
    .join('')}</div>`;
}
function renderOptions() {
  const c = state.cfg;
  const sec = (num, title, body, sub = '') => `<section class="opt"><h2><em>${num}</em>${title}${sub ? `<span>${sub}</span>` : ''}</h2>${body}</section>`;
  let html = '';
  html += sec('01', 'Фасад', cards('facade', FACADES), 'штукатурка и рейка');
  html += sec(
    '02',
    'Цвет рам и ворот',
    `<div class="sws">${COLORS.map(
      (it) => `<button class="sw ${c.color === it.id ? 'on' : ''}" data-g="color" data-v="${it.id}" aria-pressed="${c.color === it.id}">
        <i style="background:${it.color}"></i><span>${it.label}<small>${it.note}</small></span>${delta(it.price)}</button>`,
    ).join('')}</div><p class="note">Окна, обрамления, отливы парапета, входная дверь, гаражные ворота и навес — в одном цвете.</p>`,
    'порошковая окраска',
  );
  html += sec('03', 'Гараж или кабинет', cards('garage', GARAGE));
  html += sec(
    '04',
    'Планировка',
    cards('kitchen', KITCHEN) +
      `<div class="plan">
        <div class="seg plan-tabs">${[1, 2].map((f) => `<button data-floor="${f}" class="${state.floor === f ? 'on' : ''}">${f}-й этаж · ${f === 1 ? '113,0' : '96,1'} м²</button>`).join('')}</div>
        <div class="plan-svg">${planSVG(c, state.floor)}</div>
      </div>`,
  );
  html += sec(
    '05',
    'Off-Grid пакет',
    cards('offgrid', OFFGRID, (it) => `<ul>${it.items.map((x) => `<li>${x}</li>`).join('')}</ul>`) +
      `<p class="note">Модули стоят рядами под 12° на балластных опорах за парапетом — посмотрите вид «Кровля».</p>`,
    `${pickOf(c, 'offgrid').panels} модулей · ${String(pickOf(c, 'offgrid').kw).replace('.', ',')} кВт`,
  );
  $('#options').innerHTML = html;
}

function renderSummary() {
  const p = price(state.cfg);
  const extras = p.lines.filter(([, it]) => it.price !== 0);
  $('#summary').innerHTML = `
    <div class="sum-lines">
      <div><span>${PROJECT.name}, ${String(PROJECT.area).replace('.', ',')} м², базовая комплектация</span><b>${tg(p.base)}</b></div>
      ${extras.map(([, it]) => `<div><span>${it.label}</span><b>${signed(it.price)}</b></div>`).join('')}
    </div>
    <div class="sum-total"><span>Стоимость дома</span><strong id="total">${tg(p.total)}</strong><small>${tg(p.perM2)} за м² · монолитный дом с инженерией Off-Grid</small></div>
    <button class="btn primary" id="send">Отправить заявку</button>`;
  $('#send').onclick = openRequest;
}

function renderAll() {
  renderHeader();
  renderProject();
  renderOptions();
  renderSummary();
}

$('#options').addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.floor) {
    state.floor = +t.dataset.floor;
    renderOptions();
    return;
  }
  const g = t.dataset.g;
  if (!g || state.cfg[g] === t.dataset.v) return;
  state.cfg[g] = t.dataset.v;
  history.replaceState(null, '', shareURL());
  if (g === 'garage' || g === 'offgrid') {
    rebuild();
    // show the changed part: the carport / the roof
    engine.flyTo(...view(g === 'garage' ? 'main' : 'top'));
  } else if (g === 'facade' || g === 'color') applyLooks();
  else if (g === 'kitchen') state.floor = 1;
  const y = $('.panel-scroll').scrollTop;
  renderOptions();
  renderSummary();
  $('.panel-scroll').scrollTop = y;
});

// ---------------------------------------------------------------- request → PDF specification
function openRequest() {
  const p = price(state.cfg);
  preloadPdf();
  $('#req-body').innerHTML = `<ul>
      <li><span>Проект</span>${PROJECT.name}, ${String(PROJECT.area).replace('.', ',')} м²</li>
      ${p.lines.map(([g, it]) => `<li><span>${{ facade: 'Фасад', color: 'Цвет', garage: 'Гараж', kitchen: 'Кухня', offgrid: 'Off-Grid' }[g]}</span>${it.label}</li>`).join('')}
      <li class="tot"><span>Итого</span>${tg(p.total)}</li></ul>`;
  $('#req-form').hidden = false;
  $('#req-done').hidden = true;
  $('#request').showModal();
}
$('#req-form').onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  const client = { name: f.name.value.trim(), phone: f.phone.value.trim(), place: f.place.value.trim(), comment: f.comment.value.trim() };
  const btn = $('#req-submit');
  btn.disabled = true;
  btn.textContent = 'Формируем PDF…';
  try {
    const shots = await captureShots();
    const link = shareURL();
    const spec = await makeSpec({ cfg: state.cfg, shots, client, link });
    lastSpec = spec;
    download(spec);
    const p = price(state.cfg);
    const text = [
      `Здравствуйте! Заявка ${spec.number} на дом ${PROJECT.name}.`,
      ...p.lines.map(([, it]) => `• ${it.label}`),
      `Итого: ${tg(p.total).replace(/ /g, ' ')}`,
      `${client.name}, ${client.phone}`,
      link,
    ].join('\n');
    $('#req-wa').href = `${COMPANY.whatsapp}?text=${encodeURIComponent(text)}`;
    $('#req-mail').href = `mailto:${COMPANY.email}?subject=${encodeURIComponent('Заявка ' + spec.number + ' — ' + PROJECT.name)}&body=${encodeURIComponent(text + '\n\nPDF-спецификация приложена.')}`;
    $('#req-num').textContent = spec.number;
    $('#req-form').hidden = true;
    $('#req-done').hidden = false;
  } catch (err) {
    console.error(err);
    btn.textContent = 'Не удалось — попробуйте ещё раз';
  } finally {
    btn.disabled = false;
    if (btn.textContent.startsWith('Формируем')) btn.textContent = 'Отправить заявку';
  }
};
let lastSpec;
const download = (spec) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(spec.blob);
  a.download = spec.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
};
$('#req-again').onclick = (e) => {
  e.preventDefault();
  if (lastSpec) download(lastSpec);
};

/** Renders the hero and two side views of the current configuration for the PDF. */
async function captureShots() {
  await building;
  const cam = engine.camera, ctl = engine.controls;
  const p0 = cam.position.clone(), t0 = ctl.target.clone();
  const shot = (view, w, h) => {
    const [p, t] = def.views[view];
    cam.position.set(...p);
    cam.lookAt(...t);
    cam.updateMatrixWorld();
    return engine.capture(w, h, 'image/jpeg', 0.88);
  };
  const out = { hero: shot('main', 1800, 940), street: shot('street', 1100, 700), garden: shot('garden', 1100, 700) };
  cam.position.copy(p0);
  ctl.target.copy(t0);
  cam.lookAt(t0);
  engine.invalidate(3);
  return out;
}

$('#shot').onclick = () => {
  const a = document.createElement('a');
  a.href = engine.capture(2560, 1440);
  a.download = `VELOX-TUTO-${state.cfg.facade}.png`;
  a.click();
};
$('#share').onclick = async () => {
  try {
    await navigator.clipboard.writeText(shareURL());
    $('#share span').textContent = 'Скопировано';
  } catch {
    $('#share span').textContent = 'Ссылка в адресной строке';
  }
  setTimeout(() => ($('#share span').textContent = 'Ссылка'), 1800);
};

// ---------------------------------------------------------------- start
renderAll();
(async () => {
  const bar = $('#loader i');
  bar.style.width = '30%';
  await engine.setEnvironment(state.tod, def.sun);
  bar.style.width = '70%';
  await rebuild();
  bar.style.width = '100%';
  setTimeout(() => $('#loader').classList.add('done'), 250);
  setTimeout(() => document.body.setAttribute('data-ready', ''), 4000);
  setTimeout(() => $('#hint').classList.add('done'), 6000);
})();

globalThis.__app = { engine, state, mats, get current() { return current; }, rebuild, applyLooks, applyTod, captureShots };
