// PDF specification of a configuration (pdfmake, loaded on demand; Noto Sans carries Cyrillic, Kazakh and ₸).
import { COMPANY, PROJECT, pickOf, price, tg, signed } from './catalog.js';
import { planPNG } from './plan.js';

let lib;
function loadLib() {
  if (lib) return lib;
  const base = new URL('../vendor/pdfmake/', import.meta.url).href;
  lib = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = base + 'pdfmake.min.js';
    s.onload = () => {
      const pm = globalThis.pdfMake;
      pm.fonts = { Noto: { normal: base + 'fonts/NotoSans-Regular.ttf', bold: base + 'fonts/NotoSans-Bold.ttf', italics: base + 'fonts/NotoSans-Regular.ttf', bolditalics: base + 'fonts/NotoSans-Bold.ttf' } };
      resolve(pm);
    };
    s.onerror = () => reject(new Error('pdfmake load failed'));
    document.head.appendChild(s);
  });
  return lib;
}
export const preloadPdf = () => loadLib().catch(() => {});

const GROUP_LABEL = { facade: 'Фасад', color: 'Рамы, ворота, отливы', garage: 'Гараж / кабинет', kitchen: 'Планировка кухни', offgrid: 'Off-Grid пакет' };
const INK = '#1d1e20', MUTED = '#77736b', LINE = '#e3dfd7', ACCENT = '#a8652f';

/**
 * Builds the PDF and triggers the download. shots: { hero, street, garden } JPEG data URLs; client: { name, phone, comment }.
 * Returns { number, blob }.
 */
export async function makeSpec({ cfg, shots, client, link }) {
  const pm = await loadLib();
  const p = price(cfg);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const number = `TUTO-${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const date = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
  const [plan1, plan2] = await Promise.all([planPNG(cfg, 1), planPNG(cfg, 2)]);
  const og = pickOf(cfg, 'offgrid');

  const rows = [
    [th('Параметр'), th('Выбор'), th('Стоимость', 'right')],
    [td('Базовая комплектация', true), td(`${PROJECT.name}, ${fmtA(PROJECT.area)} м², монолит VELOX, инженерия Off-Grid`), td(tg(p.base), false, 'right')],
    ...p.lines.map(([g, it]) => [td(GROUP_LABEL[g], true), td(it.label + (it.note ? `\n${it.note}` : ''), false, 'left', true), td(signed(it.price), false, 'right')]),
  ];

  const doc = {
    pageSize: 'A4',
    pageMargins: [40, 64, 40, 54],
    defaultStyle: { font: 'Noto', fontSize: 9, color: INK, lineHeight: 1.18 },
    info: { title: `Спецификация ${number}`, author: COMPANY.name, subject: PROJECT.name },
    header: () => ({
      margin: [40, 24, 40, 0],
      columns: [
        { text: [{ text: 'VELOX', bold: true, fontSize: 13, characterSpacing: 2 }, { text: '  ·  TUTO Off-Grid', color: MUTED, fontSize: 9 }] },
        { text: `Спецификация № ${number}  ·  ${date}`, alignment: 'right', color: MUTED, fontSize: 8.5, margin: [0, 3, 0, 0] },
      ],
    }),
    footer: (page, pages) => ({
      margin: [40, 18, 40, 0],
      columns: [
        { text: `${COMPANY.name} · ${COMPANY.address} · ${COMPANY.phone} · ${COMPANY.email}`, color: MUTED, fontSize: 7.5 },
        { text: `${page} / ${pages}`, alignment: 'right', color: MUTED, fontSize: 7.5, width: 40 },
      ],
    }),
    content: [
      { text: `${PROJECT.name} — ваша конфигурация`, fontSize: 19, bold: true, margin: [0, 0, 0, 2] },
      { text: PROJECT.series, color: MUTED, margin: [0, 0, 0, 10] },
      { image: shots.hero, width: 515, margin: [0, 0, 0, 6] },
      {
        columns: [
          { image: shots.street, width: 254 },
          { image: shots.garden, width: 254 },
        ],
        columnGap: 7,
        margin: [0, 0, 0, 14],
      },
      {
        columns: [
          {
            width: '*',
            stack: [
              h2('Проект'),
              kv(PROJECT.specs),
            ],
          },
          {
            width: 220,
            stack: [
              h2('Заявка'),
              kv([
                ['Клиент', client.name || '—'],
                ['Телефон', client.phone || '—'],
                ...(client.place ? [['Участок', client.place]] : []),
                ...(client.comment ? [['Комментарий', client.comment]] : []),
              ]),
            ],
          },
        ],
        columnGap: 18,
      },
      { text: '', pageBreak: 'before' },
      h2('Конфигурация и стоимость'),
      {
        table: { widths: [110, '*', 92], body: rows },
        layout: { hLineWidth: (i, n) => (i === 0 || i === n.table.body.length ? 0 : 0.6), vLineWidth: () => 0, hLineColor: () => LINE, paddingTop: () => 5, paddingBottom: () => 5 },
      },
      {
        margin: [0, 10, 0, 0],
        table: {
          widths: ['*', 'auto'],
          body: [[
            { text: [{ text: 'Предварительная стоимость\n', bold: true, fontSize: 11 }, { text: `${tg(p.perM2)} за м² · цены в тенге, включая монтаж`, color: MUTED, fontSize: 8 }], margin: [10, 8, 0, 8] },
            { text: tg(p.total), bold: true, fontSize: 17, color: ACCENT, alignment: 'right', margin: [0, 10, 10, 8] },
          ]],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#f5f1ea' },
      },
      h2(`${og.label}: ${og.panels} солнечных модулей, ${fmtA(og.kw)} кВт, накопитель ${og.battery} кВт·ч`),
      { ul: og.items, margin: [0, 0, 0, 6], color: INK },
      h2('Что входит в базовую стоимость'),
      kv(PROJECT.included, 92),
      { text: '', pageBreak: 'before' },
      h2('Планировка'),
      {
        columns: [
          { stack: [{ text: '1-й этаж · 113,0 м²', bold: true, margin: [0, 0, 0, 4] }, { image: plan1.url, fit: [252, 250] }] },
          { stack: [{ text: '2-й этаж · 96,1 м²', bold: true, margin: [0, 0, 0, 4] }, { image: plan2.url, fit: [252, 250] }] },
        ],
        columnGap: 10,
        margin: [0, 0, 0, 10],
      },
      {
        columns: [rooms(1, cfg), rooms(2, cfg)],
        columnGap: 18,
        fontSize: 8,
      },
      h2('Условия'),
      {
        text:
          'Расчёт предварительный и не является публичной офертой. Окончательная стоимость фиксируется в договоре после выезда на участок, ' +
          'геологии и привязки проекта. Не включены: участок, подъездные пути, внутренняя чистовая отделка и мебель; ограждение участка ' +
          'на визуализации показано для примера. ' +
          'Монолитная коробка возводится до 45 рабочих дней; каждый дом рассчитан на сейсмику 9 баллов.',
        color: MUTED, fontSize: 8.5,
      },
      {
        margin: [0, 14, 0, 0],
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: 'Связаться с VELOX KZ', bold: true, fontSize: 10.5, margin: [0, 0, 0, 3] },
              { text: `${COMPANY.phone} (звонок, WhatsApp) · ${COMPANY.email}` },
              { text: COMPANY.address, color: MUTED },
              ...(link ? [{ text: 'Открыть эту конфигурацию в 3D', link, color: ACCENT, decoration: 'underline', margin: [0, 4, 0, 0] }] : []),
            ],
            margin: [10, 8, 10, 8],
          }]],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#f5f1ea' },
      },
    ],
  };

  const pdf = pm.createPdf(doc);
  const blob = await new Promise((res) => pdf.getBlob(res));
  return { number, blob, filename: `VELOX-${number}.pdf` };
}

const fmtA = (n) => (Number.isInteger(n) ? n.toFixed(1) : String(n)).replace('.', ',');
const th = (t, a = 'left') => ({ text: t, bold: true, color: MUTED, fontSize: 8, alignment: a });
const td = (t, b = false, a = 'left') => ({ text: t, bold: b, alignment: a });
const h2 = (t) => ({ text: t, bold: true, fontSize: 11.5, margin: [0, 14, 0, 6] });
const kv = (pairs, w = 104, pad = 3) => ({
  table: { widths: [w, '*'], body: pairs.map(([k, v]) => [typeof k === 'object' ? k : { text: k, color: MUTED }, typeof v === 'object' ? v : { text: v }]) },
  layout: { hLineWidth: (i, n) => (i === 0 || i === n.table.body.length ? 0 : 0.5), vLineWidth: () => 0, hLineColor: () => LINE, paddingTop: () => pad, paddingBottom: () => pad, paddingLeft: () => 0 },
});
function rooms(floor, cfg) {
  let list = PROJECT.rooms[floor].map(([n, a]) => [n, a]);
  if (floor === 1 && cfg.kitchen === 'open') list = [['Кухня-гостиная', 51.06], ...list.filter(([n]) => !n.startsWith('Кухня'))];
  if (floor === 1 && cfg.garage === 'office') list = list.map(([n, a]) => [n === 'Гараж' ? 'Кабинет' : n, a]);
  const sum = PROJECT.floors[floor - 1];
  return kv([...list.map(([n, a]) => [n, `${fmtA(a)} м²`]), [{ text: 'Итого', bold: true }, { text: `${fmtA(sum)} м²`, bold: true }]], 110, 1.5);
}
