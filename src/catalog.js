// VELOX KZ — TUTO house: project data, configurator options and prices in tenge.
// Base price and the open-plan kitchen discount are from the brief; the other option prices are working figures for
// the pilot and are kept here, in one place, so the sales team can correct them without touching the 3D code.

export const COMPANY = {
  name: 'VELOX KZ',
  brand: 'TUTO',
  slogan: 'монолитные дома в несъёмной опалубке',
  city: 'Алматы',
  address: 'Алматы, мкр. Акжар, ул. Байсултанова, 3',
  phone: '+7 701 697 00 24',
  phoneHref: 'tel:+77016970024',
  whatsapp: 'https://wa.me/77016970024',
  email: 'sergey@tutooffgrid.com',
  site: 'https://velox.kz',
  objects: 'https://velox.kz/#vx-objects',
};

export const PROJECT = {
  id: 'tuto',
  name: 'TUTO 209',
  series: 'Монолит VELOX · 2 этажа · плоская кровля',
  tagline:
    'Минималистичный двухэтажный дом с плоской кровлей за парапетом и солнечной электростанцией: кухня-гостиная 34 м², четыре спальни, гардероб, три санузла, гараж на одну машину.',
  price: 105000000,
  area: 209.1,
  floors: [113.0, 96.1],
  specs: [
    ['Площадь', '209,1 м²'],
    ['1-й / 2-й этаж', '113,0 + 96,1 м²'],
    ['Габариты', '10 800 × 13 400 мм'],
    ['Высота потолков', '3,2 м в чистоте'],
    ['Спальни', '4 + гардероб'],
    ['Сейсмика', 'расчёт на 9 баллов'],
  ],
  included: [
    ['Стены', 'Монолитный железобетон в несъёмной опалубке VELOX из щепоцементных плит, утеплитель 220 мм, 440 мм'],
    ['Перекрытия', 'Монолитные ж/б плиты, высота помещений 3,2 м в чистоте'],
    ['Кровля', 'Плоская эксплуатируемая, утеплитель 350 мм, парапет 550 мм с металлическим отливом'],
    ['Фасад', 'Минеральная штукатурка, вертикальная рейка, обрамления окон из окрашенного алюминия'],
    ['Окна', 'Тёплый алюминий, двухкамерные стеклопакеты, панорамное остекление гостиной'],
    ['Инженерия', 'Тепловой насос, тёплый пол, скважина, биоочистка стоков, солнечная станция'],
    ['Срок', 'Монолитная коробка — до 45 рабочих дней'],
  ],
  rooms: {
    1: [
      ['Кухня-гостиная', 34.24], ['Кухня', 16.82], ['Холл', 15.77], ['Лестница', 10.3],
      ['Санузел', 4.32], ['Гараж', 20.54], ['Тамбур', 4.0], ['Котельная', 7.0],
    ],
    2: [
      ['Спальня', 16.7], ['Спальня', 14.54], ['Спальня', 16.82], ['Спальня', 16.36], ['Холл', 14.95],
      ['Гардероб', 4.86], ['Санузел', 6.12], ['Ванная', 3.15], ['Санузел', 2.6],
    ],
  },
};

// Facade variations: render colour (or architectural concrete) + batten timber. Changes materials only.
export const FACADES = [
  {
    id: 'sand', label: 'Песок и лиственница', note: 'как на визуализациях TUTO', price: 0,
    wall: { tex: 'plaster', color: '#d6cbb8' }, wood: { color: '#a8784c', keep: 0.55, contrast: 1.1 },
    swatch: ['#d6cbb8', '#a8784c'],
  },
  {
    id: 'white', label: 'Белый и термоясень', note: 'светлая штукатурка, тёмная рейка', price: 1450000,
    wall: { tex: 'plaster', color: '#ecebe6' }, wood: { color: '#6a4630', keep: 0.45, contrast: 1.15 },
    swatch: ['#ecebe6', '#6a4630'],
  },
  {
    id: 'concrete', label: 'Архбетон и дуб', note: 'фактура монолита, светлая рейка', price: 2200000,
    wall: { tex: 'concrete', color: '#b4b1aa' }, wood: { color: '#c9a77c', keep: 0.6, contrast: 1.0 },
    swatch: ['#b4b1aa', '#c9a77c'],
  },
];

// Window frames, window boxes, copings, entrance door, garage door and carport steel — one powder-coat colour.
export const COLORS = [
  { id: 'anthracite', label: 'Антрацит', note: 'RAL 7016', color: '#383e42', price: 0 },
  { id: 'black', label: 'Чёрный матовый', note: 'RAL 9005', color: '#1d1e20', price: 380000 },
  { id: 'bronze', label: 'Бронза', note: 'анодированный алюминий', color: '#5c4a38', price: 690000 },
];

export const GARAGE = [
  { id: 'garage', label: 'Гараж', note: 'Тёплый гараж 20,5 м², секционные ворота с электроприводом', price: 0 },
  { id: 'office', label: 'Кабинет и навес', note: 'Домашний офис 20,5 м² с панорамным окном, навес для машины 3,3 × 6,4 м', price: 2900000 },
];

export const KITCHEN = [
  { id: 'separate', label: 'Отдельная кухня', note: 'Кухня 16,8 м² за перегородкой, гостиная 34,2 м²', price: 0 },
  { id: 'open', label: 'Кухня-гостиная', note: 'Единое пространство 51 м² без перегородки', price: -350000 },
];

// Off-Grid packages: the roof PV array changes on the model (number of modules).
export const OFFGRID = [
  {
    id: 'standard', label: 'Off-Grid Стандарт', panels: 12, kw: 5.4, battery: 15, price: 0,
    items: ['12 модулей 450 Вт — 5,4 кВт', 'Гибридный инвертор 6 кВт', 'Накопитель LiFePO4 15 кВт·ч', 'Тепловой насос воздух–вода', 'Скважина и водоподготовка', 'Станция биоочистки'],
  },
  {
    id: 'max', label: 'Off-Grid Максимум', panels: 26, kw: 11.7, battery: 30, price: 6800000,
    items: ['26 модулей 450 Вт — 11,7 кВт', 'Гибридный инвертор 12 кВт', 'Накопитель LiFePO4 30 кВт·ч', 'Резервный генератор 8 кВт', 'Тепловой насос воздух–вода', 'Скважина, бак запаса воды 5 м³', 'Станция биоочистки, полив очищенной водой'],
  },
];

export const GROUPS = { facade: FACADES, color: COLORS, garage: GARAGE, kitchen: KITCHEN, offgrid: OFFGRID };
export const DEFAULTS = { facade: 'sand', color: 'anthracite', garage: 'garage', kitchen: 'separate', offgrid: 'standard' };

export const pickOf = (cfg, g) => GROUPS[g].find((x) => x.id === cfg[g]) || GROUPS[g][0];

export function price(cfg) {
  const lines = Object.keys(GROUPS).map((g) => [g, pickOf(cfg, g)]);
  const total = PROJECT.price + lines.reduce((s, [, it]) => s + it.price, 0);
  return { base: PROJECT.price, lines, total, perM2: Math.round(total / PROJECT.area) };
}

export const tg = (n) => (n < 0 ? '−' : '') + Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + '\u00a0₸';
export const signed = (n) => (n === 0 ? 'включено' : (n > 0 ? '+' : '') + tg(n));
