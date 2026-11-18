import { Game, WORLD_W, WORLD_H } from './game.js';
import { MUSHROOMS, spriteUrl } from './mushrooms.js';
import { Sfx } from './audio.js';

const PASSWORD_HASH = '47f6a6b76d6ec403dba54ec7fcc69178afa6b42fc0f950d01532432928de4997';
const KEYS = { best: 'grib.best', top: 'grib.top', sound: 'grib.sound', unlocked: 'grib.unlocked' };

const $ = (id) => document.getElementById(id);

const store = {
  get(area, key) {
    try { return window[area].getItem(key); } catch { return null; }
  },
  set(area, key, value) {
    try { window[area].setItem(key, value); } catch { /* приватный режим */ }
  },
};

const urls = MUSHROOMS.map((_, level) => spriteUrl(level));
let best = Number(store.get('localStorage', KEYS.best)) || 0;
let discovered = Number(store.get('localStorage', KEYS.top)) || 0;
let startedBest = best;
let state = 'locked';
let toastTimer = 0;

const sfx = new Sfx(store.get('localStorage', KEYS.sound) !== 'off');

/* ---------- Цепочка грибов ---------- */

const chainItems = MUSHROOMS.map((m, level) => {
  const li = document.createElement('li');
  li.className = 'chain__item';
  const img = new Image();
  img.src = urls[level];
  img.alt = m.name;
  img.title = m.name;
  const name = document.createElement('span');
  name.className = 'chain__name';
  name.textContent = m.name;
  li.append(img, name);
  $('chain').append(li);
  return li;
});

function paintChain() {
  chainItems.forEach((li, level) => li.classList.toggle('is-found', level <= Math.max(discovered, 4)));
}

/* ---------- Игра ---------- */

const game = new Game($('board'), {
  score(value) {
    $('score').textContent = value;
    if (value > best) {
      best = value;
      $('best').textContent = best;
      store.set('localStorage', KEYS.best, String(best));
    }
  },
  next(level) {
    $('next').src = urls[level];
    $('next').alt = MUSHROOMS[level].name;
  },
  top() {},
  drop() {
    sfx.drop();
  },
  merge(level, isNewTop) {
    sfx.merge(level);
    if (navigator.vibrate) navigator.vibrate(level >= 6 ? 30 : 12);
    if (isNewTop && level > discovered) {
      discovered = level;
      store.set('localStorage', KEYS.top, String(discovered));
      paintChain();
      sfx.discover();
      showToast(`Новый гриб: ${MUSHROOMS[level].name}!`);
    }
  },
  over({ score, topLevel }) {
    state = 'over';
    sfx.over();
    $('overScore').textContent = score;
    $('overRecord').hidden = !(score > startedBest);
    $('overTopImg').src = urls[topLevel];
    $('overTopName').textContent = MUSHROOMS[topLevel].name;
    setTimeout(() => {
      $('overOverlay').hidden = false;
      $('againBtn').focus();
    }, 450);
  },
});

function showToast(text) {
  const toast = $('toast');
  toast.textContent = text;
  toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2200);
}

function play() {
  state = 'playing';
  $('app').inert = false;
  game.start();
}

function pause() {
  if (state !== 'playing') return;
  state = 'paused';
  game.stop();
  game.keys.left = game.keys.right = false;
  $('pauseOverlay').hidden = false;
  $('resumeBtn').focus();
}

function resume() {
  $('pauseOverlay').hidden = true;
  play();
}

function restart() {
  $('pauseOverlay').hidden = true;
  $('overOverlay').hidden = true;
  game.stop();
  startedBest = best;
  game.reset();
  play();
}

/* ---------- Размер поля ---------- */

function fitBoard() {
  const stage = $('stage').getBoundingClientRect();
  const frame = 14;
  const width = Math.floor(Math.min(stage.width - frame, ((stage.height - frame) * WORLD_W) / WORLD_H));
  if (width <= 0) return;
  const height = Math.round((width * WORLD_H) / WORLD_W);
  // На высоких телефонах прижимаем счёт и цепочку к лукошку.
  const slack = Math.max(0, (stage.height - height - frame) / 2);
  document.documentElement.style.setProperty('--slack', `${slack}px`);
  game.resize(width, height);
}

new ResizeObserver(fitBoard).observe($('stage'));

/* ---------- Мышь и палец ---------- */

const stage = $('stage');
let activePointer = null;

function aimAt(event) {
  const rect = $('board').getBoundingClientRect();
  game.aim(((event.clientX - rect.left) / rect.width) * WORLD_W);
}

stage.addEventListener('pointerdown', (event) => {
  if (state !== 'playing' || activePointer !== null || event.button !== 0) return;
  event.preventDefault();
  sfx.unlock();
  activePointer = event.pointerId;
  stage.setPointerCapture(event.pointerId);
  aimAt(event);
});

stage.addEventListener('pointermove', (event) => {
  if (state !== 'playing') return;
  if (activePointer === event.pointerId || (activePointer === null && event.pointerType === 'mouse')) aimAt(event);
});

stage.addEventListener('pointerup', (event) => {
  if (event.pointerId !== activePointer) return;
  activePointer = null;
  if (state === 'playing') {
    aimAt(event);
    game.drop();
  }
});

stage.addEventListener('pointercancel', (event) => {
  if (event.pointerId === activePointer) activePointer = null;
});

document.addEventListener('contextmenu', (event) => {
  if (stage.contains(event.target)) event.preventDefault();
});

/* ---------- Клавиатура ---------- */

window.addEventListener('keydown', (event) => {
  if (state === 'paused' && event.key === 'Escape') return resume();
  if (state !== 'playing') return;
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a' || key === 'ф') game.keys.left = true;
  else if (key === 'arrowright' || key === 'd' || key === 'в') game.keys.right = true;
  else if (key === ' ' || key === 'arrowdown' || key === 's' || key === 'ы') {
    event.preventDefault();
    sfx.unlock();
    if (!event.repeat) game.drop();
  } else if (key === 'escape' || key === 'p' || key === 'з') pause();
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a' || key === 'ф') game.keys.left = false;
  if (key === 'arrowright' || key === 'd' || key === 'в') game.keys.right = false;
});

window.addEventListener('blur', () => {
  game.keys.left = game.keys.right = false;
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

/* ---------- Кнопки ---------- */

function paintSound() {
  $('soundBtn').setAttribute('aria-pressed', String(sfx.enabled));
  $('soundBtn').setAttribute('aria-label', sfx.enabled ? 'Выключить звук' : 'Включить звук');
}

$('soundBtn').addEventListener('click', (event) => {
  sfx.enabled = !sfx.enabled;
  sfx.unlock();
  store.set('localStorage', KEYS.sound, sfx.enabled ? 'on' : 'off');
  paintSound();
  event.currentTarget.blur();
});
$('pauseBtn').addEventListener('click', pause);
$('resumeBtn').addEventListener('click', resume);
$('restartBtn').addEventListener('click', restart);
$('againBtn').addEventListener('click', restart);

/* ---------- Экран с паролем ---------- */

async function sha256(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function unlock() {
  store.set('sessionStorage', KEYS.unlocked, '1');
  $('splash').hidden = true;
  play();
}

$('splashHero').src = urls[urls.length - 1];

$('togglePassword').addEventListener('click', () => {
  const input = $('password');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  $('togglePassword').setAttribute('aria-pressed', String(show));
  $('togglePassword').setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
});

$('password').addEventListener('input', () => {
  $('password').removeAttribute('aria-invalid');
  $('loginError').textContent = '';
});

$('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  sfx.unlock();
  // Телефоны любят ставить заглавную букву и пробел после автоподстановки.
  const value = $('password').value.trim().toLowerCase();
  if ((await sha256(value)) === PASSWORD_HASH) {
    unlock();
    return;
  }
  $('password').setAttribute('aria-invalid', 'true');
  $('loginError').textContent = value ? 'Неверный пароль. Попробуй ещё раз.' : 'Введи пароль.';
  const form = $('loginForm');
  form.classList.remove('shake');
  void form.offsetWidth;
  form.classList.add('shake');
  $('password').focus();
});

/* ---------- Старт ---------- */

$('best').textContent = best;
paintChain();
paintSound();
fitBoard();

if (store.get('sessionStorage', KEYS.unlocked) === '1') {
  unlock();
} else if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  $('password').focus();
}
