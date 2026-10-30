// Floor-plan schematic of TUTO (after the architect's plans): rooms with areas, outer walls, windows and doors.
// Plan coordinates in metres: x from the west wall, y from the north wall (street side at the bottom). The schematic
// follows the configuration: separate kitchen / kitchen-living, garage / home office with the carport.

const OUT = 0.44; // outer wall
// openings on the outer walls: [x0, y0, x1, y1] (a segment along a wall)
const WIN = {
  1: [
    [0.45, 0, 3.25, 0], [4.0, 0, 6.75, 0], // living-room glazing
    [0.55, 11.4, 3.05, 11.4], [5.86, 11.4, 6.62, 11.4], // kitchen, sidelight
    [0, 5.94, 0, 6.64], // west
    [10.8, 8.36, 10.8, 11.76], [10.8, 6.56, 10.8, 7.16], [10.8, 4.01, 10.8, 4.81], // garage strip, WC, stair
  ],
  2: [
    [4.1, 0, 6.7, 0], [0.55, 0, 3.15, 0],
    [0.8, 11.4, 3.4, 11.4], [5.55, 11.4, 6.65, 11.4],
    [0, 5.94, 0, 6.64],
    [7.8, 13.4, 10.3, 13.4],
    [10.8, 10.06, 10.8, 11.76], [10.8, 5.56, 10.8, 6.36], [10.8, 4.01, 10.8, 4.81],
  ],
};

const fmt = (a) => (Number.isInteger(a) ? a.toFixed(1) : String(a)).replace('.', ',');

export function planSVG(cfg, floor = 1, { width = '100%', labels = true } = {}) {
  const office = cfg.garage === 'office';
  const open = cfg.kitchen === 'open';
  const showCP = office && floor === 1;
  const vb = [-1.3, -2.45, (showCP ? 15.4 : 12.0) + 1.3, 17.65];
  const s = [];
  const rect = (x0, y0, x1, y1, cls) => s.push(`<rect class="${cls}" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"/>`);
  const label = (x, y, name, area, small) =>
    labels && s.push(`<text class="rn${small ? ' sm' : ''}" x="${x}" y="${y - 0.12}">${name}</text>` + (area ? `<text class="ra" x="${x}" y="${y + 0.42}">${fmt(area)} м²</text>` : ''));
  const poly = (pts, cls) => s.push(`<polygon class="${cls}" points="${pts.map((p) => p.join(',')).join(' ')}"/>`);

  if (floor === 1) {
    // porch, plant room, carport (outside the heated outline)
    rect(3.75, 11.4, 7.3, 13.4, 'porch');
    label(5.5, 12.55, 'Крыльцо');
    if (showCP) {
      rect(11.15, 7.3, 14.45, 13.65, 'cp');
      label(12.8, 10.4, 'Навес', null);
      s.push(`<text class="ra" x="12.8" y="11.0">3,3 × 6,4 м</text>`);
    }
    poly([[0, 0], [7.3, 0], [7.3, -1.2], [10.8, -1.2], [10.8, 13.4], [7.3, 13.4], [7.3, 11.4], [0, 11.4]], 'wall');
    rect(7.6, -0.9, 10.5, 1.0, 'room tech');
    label(9.05, 0.2, 'Котельная', 7.0);
    if (open) {
      rect(0.44, 0.44, 7.15, 5.4, 'room hi');
      rect(0.44, 5.3, 3.6, 10.96, 'room hi');
      label(2.0, 8.3, 'Кухня-гостиная', 51.06);
    } else {
      rect(0.44, 0.44, 7.15, 5.4, 'room');
      rect(0.44, 5.55, 3.6, 10.96, 'room');
      label(3.8, 2.9, 'Гостиная', 34.24);
      label(2.0, 8.3, 'Кухня', 16.82);
    }
    rect(3.75, 5.55, 7.15, 9.45, 'room');
    label(5.45, 7.6, 'Холл', 15.77);
    rect(3.75, 9.6, 7.15, 10.96, 'room');
    label(5.45, 10.35, 'Тамбур', 4.0);
    rect(7.45, 1.3, 10.36, 5.2, 'room');
    for (let i = 0; i < 9; i++) s.push(`<line class="st" x1="${7.45}" y1="${1.6 + i * 0.4}" x2="${8.85}" y2="${1.6 + i * 0.4}"/>`);
    for (let i = 0; i < 9; i++) s.push(`<line class="st" x1="${8.95}" y1="${1.6 + i * 0.4}" x2="${10.36}" y2="${1.6 + i * 0.4}"/>`);
    s.push(`<line class="st" x1="8.9" y1="1.3" x2="8.9" y2="5.0"/>`);
    rect(7.45, 5.35, 8.45, 7.0, 'room');
    rect(8.6, 5.35, 10.36, 7.0, 'room wet');
    label(9.48, 6.25, 'С/у', 4.32);
    rect(7.45, 7.15, 10.36, 12.96, office ? 'room hi' : 'room');
    label(8.9, 10.0, office ? 'Кабинет' : 'Гараж', 20.54);
    if (!open) s.push(`<rect class="part" x="0.44" y="5.4" width="3.16" height="0.15"/>`);
  } else {
    rect(3.75, 11.4, 7.3, 13.4, 'below');
    s.push(`<text class="ra" x="5.5" y="12.55">козырёк</text>`);
    rect(7.3, -1.2, 10.8, 1.15, 'below');
    s.push(`<text class="ra" x="9.05" y="0.1">кровля котельной</text>`);
    poly([[0, 0], [7.3, 0], [7.3, 1.15], [10.8, 1.15], [10.8, 13.4], [7.3, 13.4], [7.3, 11.4], [0, 11.4]], 'wall');
    rect(0.44, 0.44, 4.0, 5.0, 'room');
    label(2.22, 2.75, 'Спальня', 16.7);
    rect(4.15, 0.44, 7.15, 5.0, 'room');
    label(5.65, 2.75, 'Спальня', 14.54);
    rect(3.75, 5.15, 8.6, 7.3, 'room');
    rect(7.45, 5.15, 8.6, 8.0, 'room');
    label(5.6, 6.35, 'Холл', 14.95);
    rect(0.44, 5.15, 3.6, 10.96, 'room');
    label(2.02, 8.2, 'Спальня', 16.82);
    rect(3.75, 7.45, 5.3, 10.96, 'room');
    label(4.52, 9.2, 'Гардероб', 4.86, true);
    rect(5.45, 7.45, 7.15, 10.96, 'room wet');
    label(6.3, 9.2, 'С/у', 6.12);
    rect(7.45, 1.3, 10.36, 5.0, 'room void');
    s.push(`<text class="ra" x="8.9" y="3.2">лестница</text>`);
    rect(8.75, 5.15, 10.36, 6.6, 'room wet');
    label(9.55, 5.95, 'Ванная', 3.15);
    rect(8.75, 6.75, 10.36, 8.0, 'room wet');
    label(9.55, 7.45, 'С/у', 2.6);
    rect(7.45, 8.15, 10.36, 12.96, 'room');
    label(8.9, 10.6, 'Спальня', 16.36);
  }
  for (const [x0, y0, x1, y1] of WIN[floor]) {
    // window in the wall thickness: a light band with the glass line
    const v = x0 === x1;
    const [a, b] = v ? [y0, y1] : [x0, x1];
    const inward = v ? (x0 === 0 ? 1 : -1) : y0 === 0 ? 1 : -1;
    const c = v ? x0 : y0;
    const p0 = c, p1 = c + inward * OUT;
    if (v) s.push(`<rect class="win" x="${Math.min(p0, p1)}" y="${a}" width="${OUT}" height="${b - a}"/><line class="gl" x1="${c + inward * OUT * 0.5}" y1="${a}" x2="${c + inward * OUT * 0.5}" y2="${b}"/>`);
    else s.push(`<rect class="win" x="${a}" y="${Math.min(p0, p1)}" width="${b - a}" height="${OUT}"/><line class="gl" x1="${a}" y1="${c + inward * OUT * 0.5}" x2="${b}" y2="${c + inward * OUT * 0.5}"/>`);
  }
  if (floor === 1) {
    // entrance door and the garage door / office glazing
    s.push(`<rect class="door" x="4.62" y="10.96" width="1.1" height="0.44"/>`);
    s.push(`<path class="swing" d="M4.62 10.96 A1.1 1.1 0 0 1 5.72 9.86 L4.62 9.86 Z"/>`);
    if (office) s.push(`<rect class="win" x="7.72" y="12.96" width="2.66" height="0.44"/><line class="gl" x1="7.72" y1="13.18" x2="10.38" y2="13.18"/>`);
    else s.push(`<rect class="door" x="7.75" y="12.96" width="2.6" height="0.44"/><line class="gd" x1="7.75" y1="13.1" x2="10.35" y2="13.1"/>`);
  }
  // dimensions
  const dimY = floor === 1 ? -1.75 : -0.85;
  s.push(`<line class="dim" x1="0" y1="${dimY}" x2="10.8" y2="${dimY}"/><line class="dim" x1="0" y1="${dimY - 0.2}" x2="0" y2="${dimY + 0.2}"/><line class="dim" x1="10.8" y1="${dimY - 0.2}" x2="10.8" y2="${dimY + 0.2}"/>`);
  s.push(`<text class="dt" x="5.4" y="${dimY - 0.18}">10 800</text>`);
  s.push(`<line class="dim" x1="-0.55" y1="0" x2="-0.55" y2="13.4"/><line class="dim" x1="-0.75" y1="0" x2="-0.35" y2="0"/><line class="dim" x1="-0.75" y1="13.4" x2="-0.35" y2="13.4"/>`);
  s.push(`<text class="dt" transform="translate(-0.7 6.7) rotate(-90)" x="0" y="0">13 400</text>`);
  s.push(`<text class="street" x="5.4" y="14.75">улица</text>`);

  const css = `
    .wall{fill:#2c2d2f}.room{fill:#f6f3ee}.room.hi{fill:#f3e6d3}.room.wet{fill:#e6eef1}.room.tech{fill:#ebe9e4}.room.void{fill:#f6f3ee;stroke:#c9c5bd;stroke-width:.03;stroke-dasharray:.15 .1}
    .porch{fill:#e4e1db}.below{fill:none;stroke:#9a968e;stroke-width:.04;stroke-dasharray:.2 .12}.cp{fill:#eceae5;stroke:#6f6c66;stroke-width:.05;stroke-dasharray:.25 .15}
    .part{fill:#2c2d2f}.win{fill:#fff}.gl{stroke:#6aa4c0;stroke-width:.05}.door{fill:#fff}.gd{stroke:#6f6c66;stroke-width:.06;stroke-dasharray:.3 .08}.swing{fill:none;stroke:#9a968e;stroke-width:.03}
    .st{stroke:#c9c5bd;stroke-width:.03}.dim{stroke:#8a877f;stroke-width:.03}
    text{font-family:Manrope,'Noto Sans','Segoe UI',Arial,sans-serif;text-anchor:middle;fill:#2c2d2f}
    .rn{font-size:.42px;font-weight:600}.rn.sm{font-size:.3px}.ra{font-size:.36px;fill:#6c6a64}.dt{font-size:.36px;fill:#6c6a64}.street{font-size:.36px;fill:#9a968e;letter-spacing:.08px}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${width}" preserveAspectRatio="xMidYMid meet"><style>${css}</style>${s.join('')}</svg>`;
}

/** Rasterises the plan to a PNG data URL (for the PDF). */
export function planPNG(cfg, floor, px = 1400) {
  const svg = planSVG(cfg, floor, { width: px });
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || px;
      c.height = img.naturalHeight || px;
      const x = c.getContext('2d');
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      resolve({ url: c.toDataURL('image/png'), w: c.width, h: c.height });
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
