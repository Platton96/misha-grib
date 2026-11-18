// Все грибы рисуются кодом: один спрайт на уровень, координаты в долях радиуса.

export const MUSHROOMS = [
  { name: 'Опёнок', r: 16, points: 1, bg: ['#a9d48a', '#6b9f58'], rim: '#4d7a40', cap: ['#e5b56c', '#b67c37'], shape: 'bell', face: 'dot' },
  { name: 'Лисичка', r: 22, points: 3, bg: ['#fff0b8', '#f2cf6a'], rim: '#c99a2e', cap: ['#ffb02e', '#e47f12'], shape: 'funnel', stem: ['#ffc65a', '#e8922a'], face: 'happy' },
  { name: 'Маслёнок', r: 29, points: 6, bg: ['#d9c3ea', '#a585bf'], rim: '#755490', cap: ['#8f5a34', '#4f2d18'], shape: 'dome', gloss: 1.5, face: 'dot' },
  { name: 'Сыроежка', r: 36, points: 10, bg: ['#ffe0dc', '#f4aaa8'], rim: '#c96f73', cap: ['#f0536f', '#b9213f'], shape: 'flat', face: 'wink' },
  { name: 'Подберёзовик', r: 44, points: 15, bg: ['#c9eaf2', '#79bdd0'], rim: '#458da3', cap: ['#a9713f', '#6a3f1e'], shape: 'dome', speckles: true, stemW: 0.32, face: 'happy' },
  { name: 'Подосиновик', r: 53, points: 21, bg: ['#ffe6c7', '#f6bd85'], rim: '#c98243', cap: ['#f4662a', '#b93208'], shape: 'dome', speckles: true, stemW: 0.38, face: 'wow' },
  { name: 'Шампиньон', r: 62, points: 28, bg: ['#c5d0f2', '#8294d3'], rim: '#55669f', cap: ['#ffffff', '#d6d2c8'], shape: 'fat', stemW: 0.3, face: 'sleepy' },
  { name: 'Рыжик', r: 72, points: 36, bg: ['#4fae95', '#21695a'], rim: '#154b3f', cap: ['#ff9f43', '#d4620f'], shape: 'flat', rings: true, face: 'dot' },
  { name: 'Боровик', r: 83, points: 45, bg: ['#f1dfbd', '#cfa871'], rim: '#94703f', cap: ['#8a5228', '#512b10'], shape: 'fat', stemW: 0.46, face: 'happy' },
  { name: 'Мухомор', r: 95, points: 55, bg: ['#5b8fdc', '#234b93'], rim: '#16336b', cap: ['#ff3f34', '#b70f18'], shape: 'dome', face: 'wink',
    spots: [[-0.52, -0.2, 0.13], [-0.16, -0.56, 0.15], [0.3, -0.34, 0.14], [0.62, -0.06, 0.1], [-0.2, -0.08, 0.09], [0.12, 0.03, 0.08], [-0.66, 0.02, 0.07]] },
  { name: 'Царь-гриб', r: 108, points: 66, bg: ['#9a55e0', '#4b1b8a'], rim: '#f4c542', cap: ['#ffe27a', '#e09a12'], shape: 'dome', crown: true, face: 'star' },
];

export const MAX_LEVEL = MUSHROOMS.length - 1;

const SPRITE_SIZE = 320;
const sprites = new Map();

export function getSprite(level) {
  if (!sprites.has(level)) sprites.set(level, renderSprite(MUSHROOMS[level]));
  return sprites.get(level);
}

export function spriteUrl(level) {
  return getSprite(level).toDataURL('image/png');
}

function renderSprite(m) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.translate(SPRITE_SIZE / 2, SPRITE_SIZE / 2);
  ctx.scale(SPRITE_SIZE / 2, SPRITE_SIZE / 2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const bg = ctx.createRadialGradient(-0.3, -0.4, 0.1, 0, 0, 1);
  bg.addColorStop(0, m.bg[0]);
  bg.addColorStop(1, m.bg[1]);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(0, 0, 0.99, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 0.94, 0, Math.PI * 2);
  ctx.clip();
  drawStem(ctx, m);
  drawCap(ctx, m);
  ctx.restore();

  drawFace(ctx, m.face);

  ctx.strokeStyle = m.rim;
  ctx.lineWidth = m.crown ? 0.09 : 0.07;
  ctx.beginPath();
  ctx.arc(0, 0, 0.95, 0, Math.PI * 2);
  ctx.stroke();

  if (m.crown) drawCrown(ctx);
  return canvas;
}

function drawStem(ctx, m) {
  const w = m.stemW ?? 0.36;
  const colors = m.stem ?? ['#fff6e2', '#e2cfa8'];
  const grad = ctx.createLinearGradient(-w - 0.1, 0, w + 0.1, 0);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[1]);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-w, -0.05);
  ctx.bezierCurveTo(-w - 0.02, 0.35, -w - 0.16, 0.62, -w - 0.06, 0.76);
  ctx.quadraticCurveTo(0, 0.96, w + 0.06, 0.76);
  ctx.bezierCurveTo(w + 0.16, 0.62, w + 0.02, 0.35, w, -0.05);
  ctx.closePath();
  ctx.fill();

  // Тень от шляпки
  const shade = ctx.createLinearGradient(0, 0.2, 0, 0.42);
  shade.addColorStop(0, 'rgba(70,40,10,.42)');
  shade.addColorStop(1, 'rgba(70,40,10,0)');
  ctx.save();
  ctx.clip();
  ctx.fillStyle = shade;
  ctx.fillRect(-1, 0.1, 2, 0.34);
  if (m.speckles) {
    ctx.strokeStyle = 'rgba(50,32,18,.72)';
    ctx.lineWidth = 0.028;
    for (const [x, y] of [[-0.3, 0.42], [0.3, 0.46], [-0.33, 0.6], [0.34, 0.62], [-0.24, 0.76], [-0.06, 0.82], [0.14, 0.8], [0.3, 0.74]]) {
      ctx.beginPath();
      ctx.moveTo(x - 0.03, y);
      ctx.lineTo(x + 0.03, y + 0.015);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function capPath(ctx, shape) {
  ctx.beginPath();
  switch (shape) {
    case 'bell':
      ctx.moveTo(-0.72, 0.14);
      ctx.bezierCurveTo(-0.78, -0.35, -0.34, -0.62, -0.13, -0.74);
      ctx.quadraticCurveTo(0, -0.92, 0.13, -0.74);
      ctx.bezierCurveTo(0.34, -0.62, 0.78, -0.35, 0.72, 0.14);
      ctx.quadraticCurveTo(0, 0.34, -0.72, 0.14);
      break;
    case 'flat':
      ctx.moveTo(-0.93, 0.04);
      ctx.bezierCurveTo(-0.9, -0.42, -0.5, -0.62, -0.2, -0.58);
      ctx.quadraticCurveTo(0, -0.5, 0.2, -0.58);
      ctx.bezierCurveTo(0.5, -0.62, 0.9, -0.42, 0.93, 0.04);
      ctx.quadraticCurveTo(0, 0.42, -0.93, 0.04);
      break;
    case 'funnel':
      ctx.moveTo(-0.9, -0.46);
      ctx.quadraticCurveTo(-0.7, -0.64, -0.5, -0.5);
      ctx.quadraticCurveTo(-0.3, -0.68, -0.1, -0.52);
      ctx.quadraticCurveTo(0.1, -0.68, 0.3, -0.52);
      ctx.quadraticCurveTo(0.5, -0.66, 0.7, -0.5);
      ctx.quadraticCurveTo(0.82, -0.58, 0.9, -0.46);
      ctx.bezierCurveTo(0.82, -0.02, 0.46, 0.14, 0.34, 0.36);
      ctx.lineTo(-0.34, 0.36);
      ctx.bezierCurveTo(-0.46, 0.14, -0.82, -0.02, -0.9, -0.46);
      break;
    case 'fat':
      ctx.moveTo(-0.95, 0.08);
      ctx.bezierCurveTo(-1, -0.72, -0.5, -0.94, 0, -0.94);
      ctx.bezierCurveTo(0.5, -0.94, 1, -0.72, 0.95, 0.08);
      ctx.quadraticCurveTo(0, 0.42, -0.95, 0.08);
      break;
    default:
      ctx.moveTo(-0.88, 0.14);
      ctx.bezierCurveTo(-0.92, -0.55, -0.45, -0.84, 0, -0.84);
      ctx.bezierCurveTo(0.45, -0.84, 0.92, -0.55, 0.88, 0.14);
      ctx.quadraticCurveTo(0, 0.38, -0.88, 0.14);
  }
  ctx.closePath();
}

function drawCap(ctx, m) {
  ctx.save();
  if (m.crown) {
    ctx.translate(0, 0.14);
    ctx.scale(0.94, 0.8);
  }
  capPath(ctx, m.shape);
  const grad = ctx.createRadialGradient(-0.3, -0.55, 0.05, 0, -0.2, 1.1);
  grad.addColorStop(0, m.cap[0]);
  grad.addColorStop(1, m.cap[1]);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.clip();

  if (m.rings) {
    ctx.strokeStyle = 'rgba(150,50,0,.55)';
    ctx.lineWidth = 0.055;
    for (const r of [0.3, 0.55, 0.8]) {
      ctx.beginPath();
      ctx.ellipse(0, -0.16, r, r * 0.52, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (m.shape === 'funnel') {
    ctx.strokeStyle = 'rgba(160,80,0,.55)';
    ctx.lineWidth = 0.035;
    for (const x of [-0.56, -0.28, 0, 0.28, 0.56]) {
      ctx.beginPath();
      ctx.moveTo(x, -0.46);
      ctx.quadraticCurveTo(x * 0.9, -0.1, x * 0.45, 0.3);
      ctx.stroke();
    }
  }
  if (m.spots) {
    ctx.fillStyle = '#fff8ea';
    for (const [x, y, r] of m.spots) {
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.86, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Блик
  const gloss = m.gloss ?? 1;
  ctx.fillStyle = `rgba(255,255,255,${0.3 * gloss})`;
  ctx.beginPath();
  ctx.ellipse(-0.38, -0.42, 0.26, 0.11, -0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFace(ctx, kind) {
  const y = 0.5;
  const dx = 0.16;
  ctx.fillStyle = 'rgba(255,120,120,.55)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 0.27, y + 0.1, 0.065, 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = ctx.fillStyle = '#35200f';
  ctx.lineWidth = 0.045;

  const dot = (x) => {
    ctx.fillStyle = '#35200f';
    ctx.beginPath();
    ctx.arc(x, y, 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 0.02, y - 0.025, 0.023, 0, Math.PI * 2);
    ctx.fill();
  };
  const arch = (x) => {
    ctx.beginPath();
    ctx.arc(x, y + 0.03, 0.065, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  };
  const closed = (x) => {
    ctx.beginPath();
    ctx.moveTo(x - 0.07, y);
    ctx.quadraticCurveTo(x, y + 0.05, x + 0.07, y);
    ctx.stroke();
  };
  const star = (x) => {
    ctx.fillStyle = '#7a3a00';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.04 : 0.1;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  };

  const eyes = { dot: [dot, dot], happy: [arch, arch], wink: [dot, arch], wow: [dot, dot], sleepy: [closed, closed], star: [star, star] }[kind];
  eyes[0](-dx);
  eyes[1](dx);

  ctx.strokeStyle = '#35200f';
  ctx.fillStyle = '#7a2a22';
  ctx.beginPath();
  if (kind === 'wow') {
    ctx.ellipse(0, y + 0.16, 0.05, 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.arc(0, y + 0.09, 0.075, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
}

function drawCrown(ctx) {
  ctx.save();
  ctx.translate(0, -0.66);
  ctx.beginPath();
  ctx.moveTo(-0.3, 0.16);
  ctx.lineTo(-0.34, -0.14);
  ctx.lineTo(-0.15, 0.01);
  ctx.lineTo(0, -0.24);
  ctx.lineTo(0.15, 0.01);
  ctx.lineTo(0.34, -0.14);
  ctx.lineTo(0.3, 0.16);
  ctx.closePath();
  ctx.fillStyle = '#ffd23e';
  ctx.strokeStyle = '#a0610a';
  ctx.lineWidth = 0.035;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8304f';
  ctx.beginPath();
  ctx.arc(0, 0.06, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
