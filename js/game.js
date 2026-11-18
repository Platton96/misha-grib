import { MUSHROOMS, MAX_LEVEL, getSprite } from './mushrooms.js';

const { Engine, Bodies, Body, Composite, Events } = window.Matter;

export const WORLD_W = 420;
export const WORLD_H = 640;

const FLOOR_Y = WORLD_H - 12;
const LINE_Y = 104;
const HOLD_Y = 52;
const STEP_MS = 1000 / 120;
const DROP_COOLDOWN = 420;
const SETTLE_GRACE = 1300;
const OVER_AFTER = 2000;
const SPAWN_LEVELS = 5;
const QUEUE_SIZE = 3;
const KING_BONUS = 500;
const AIM_SPEED = 430;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Game {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.on = callbacks;
    this.scale = 1;
    this.dpr = 1;
    this.backdrop = null;
    this.running = false;
    this.lastFrame = 0;
    this.keys = { left: false, right: false };
    this.fireflies = Array.from({ length: 7 }, (_, i) => ({
      x: 40 + (i * 340) / 6,
      y: 170 + ((i * 137) % 360),
      phase: i * 1.7,
    }));

    this.engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
    this.engine.gravity.y = 1.5;
    this.addWalls();
    Events.on(this.engine, 'collisionStart', (e) => this.collectMerges(e.pairs));
    Events.on(this.engine, 'collisionActive', (e) => this.collectMerges(e.pairs));

    this.loop = this.loop.bind(this);
    this.reset();
  }

  addWalls() {
    const t = 120;
    const opts = { isStatic: true, friction: 0.6, restitution: 0.05, label: 'wall' };
    Composite.add(this.engine.world, [
      Bodies.rectangle(WORLD_W / 2, FLOOR_Y + t / 2, WORLD_W + t * 2, t, opts),
      Bodies.rectangle(-t / 2, 0, t, WORLD_H * 4, opts),
      Bodies.rectangle(WORLD_W + t / 2, 0, t, WORLD_H * 4, opts),
    ]);
  }

  reset() {
    for (const body of this.pieces()) Composite.remove(this.engine.world, body);
    this.time = 0;
    this.accumulator = 0;
    this.score = 0;
    this.topLevel = 0;
    this.dangerTime = 0;
    this.shake = 0;
    this.particles = [];
    this.floaters = [];
    this.pendingMerges = [];
    this.aimX = WORLD_W / 2;
    this.wantDrop = false;
    this.nextDropAt = 0;
    this.over = false;
    this.held = this.randomLevel();
    this.queue = Array.from({ length: QUEUE_SIZE }, () => this.randomLevel());
    this.on.score(0);
    this.on.next(this.queue);
    this.on.top(0);
  }

  randomLevel() {
    return Math.floor(Math.random() * SPAWN_LEVELS);
  }

  pieces() {
    return Composite.allBodies(this.engine.world).filter((b) => b.label === 'piece');
  }

  /* ---------- Управление ---------- */

  aim(worldX) {
    this.aimX = worldX;
  }

  drop() {
    if (this.over || !this.running) return;
    if (this.held === null) {
      this.wantDrop = true;
      return;
    }
    const level = this.held;
    const x = this.clampAim(level);
    const body = this.spawn(level, x, HOLD_Y);
    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.04);
    this.held = null;
    this.wantDrop = false;
    this.nextDropAt = this.time + DROP_COOLDOWN;
    this.on.drop();
  }

  clampAim(level) {
    const r = MUSHROOMS[level].r;
    return Math.min(WORLD_W - r - 1, Math.max(r + 1, this.aimX));
  }

  spawn(level, x, y, popped = false) {
    const body = Bodies.circle(x, y, MUSHROOMS[level].r, {
      label: 'piece',
      restitution: 0.12,
      friction: 0.45,
      frictionStatic: 0.6,
      frictionAir: 0.006,
      density: 0.0012,
      slop: 0.02,
    });
    body.plugin = { level, born: this.time, popped, merging: false };
    Composite.add(this.engine.world, body);
    return body;
  }

  /* ---------- Слияние ---------- */

  collectMerges(pairs) {
    for (const { bodyA: a, bodyB: b } of pairs) {
      if (a.label !== 'piece' || b.label !== 'piece') continue;
      if (a.plugin.merging || b.plugin.merging) continue;
      if (a.plugin.level !== b.plugin.level) continue;
      a.plugin.merging = b.plugin.merging = true;
      this.pendingMerges.push([a, b]);
    }
  }

  applyMerges() {
    for (const [a, b] of this.pendingMerges) {
      const level = a.plugin.level;
      const x = (a.position.x + b.position.x) / 2;
      const y = (a.position.y + b.position.y) / 2;
      Composite.remove(this.engine.world, a);
      Composite.remove(this.engine.world, b);

      if (level === MAX_LEVEL) {
        this.addScore(KING_BONUS, x, y);
        this.burst(x, y, MUSHROOMS[level], 46);
        this.shake = 14;
        this.on.merge(level, false);
        continue;
      }

      const newLevel = level + 1;
      const r = MUSHROOMS[newLevel].r;
      const safeX = Math.min(WORLD_W - r - 1, Math.max(r + 1, x));
      const safeY = Math.min(FLOOR_Y - r - 1, y);
      const merged = this.spawn(newLevel, safeX, safeY, true);
      Body.setVelocity(merged, {
        x: (a.velocity.x + b.velocity.x) / 2,
        y: Math.min(-1, (a.velocity.y + b.velocity.y) / 2),
      });

      this.addScore(MUSHROOMS[newLevel].points, safeX, safeY);
      this.burst(safeX, safeY, MUSHROOMS[newLevel], 10 + newLevel * 3);
      if (newLevel >= 6) this.shake = Math.max(this.shake, newLevel);

      const isNewTop = newLevel > this.topLevel;
      if (isNewTop) {
        this.topLevel = newLevel;
        this.on.top(newLevel);
      }
      this.on.merge(newLevel, isNewTop);
    }
    this.pendingMerges = [];
  }

  addScore(points, x, y) {
    this.score += points;
    this.on.score(this.score);
    this.floaters.push({ text: `+${points}`, x, y, life: 800, age: 0 });
  }

  burst(x, y, m, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * (90 + m.r * 2);
      this.particles.push({
        x: x + Math.cos(angle) * m.r * 0.6,
        y: y + Math.sin(angle) * m.r * 0.6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        size: 1.8 + Math.random() * 3.4,
        color: i % 3 === 0 ? '#fff4c9' : m.cap[0],
        age: 0,
        life: 380 + Math.random() * 320,
      });
    }
  }

  /* ---------- Цикл ---------- */

  start() {
    if (this.running || this.over) return;
    this.running = true;
    this.lastFrame = performance.now();
    this.frameId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(50, now - this.lastFrame);
    this.lastFrame = now;
    this.update(dt);
    this.render();
    if (this.running) this.frameId = requestAnimationFrame(this.loop);
  }

  update(dt) {
    if (this.keys.left) this.aimX -= (AIM_SPEED * dt) / 1000;
    if (this.keys.right) this.aimX += (AIM_SPEED * dt) / 1000;
    this.aimX = Math.min(WORLD_W, Math.max(0, this.aimX));

    this.accumulator += dt;
    while (this.accumulator >= STEP_MS) {
      Engine.update(this.engine, STEP_MS);
      this.applyMerges();
      this.accumulator -= STEP_MS;
      this.time += STEP_MS;
    }

    if (this.held === null && this.time >= this.nextDropAt) {
      this.held = this.queue.shift();
      this.queue.push(this.randomLevel());
      this.on.next(this.queue);
      if (this.wantDrop) this.drop();
    }

    this.checkOverflow(dt);

    for (const p of this.particles) {
      p.age += dt;
      p.vy += 0.34 * dt;
      p.x += (p.vx * dt) / 1000;
      p.y += (p.vy * dt) / 1000;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
    for (const f of this.floaters) f.age += dt;
    this.floaters = this.floaters.filter((f) => f.age < f.life);
    this.shake = Math.max(0, this.shake - dt * 0.04);
  }

  checkOverflow(dt) {
    const overflowing = this.pieces().some(
      (b) => this.time - b.plugin.born > SETTLE_GRACE && b.position.y - MUSHROOMS[b.plugin.level].r < LINE_Y,
    );
    this.dangerTime = overflowing ? this.dangerTime + dt : 0;
    if (this.dangerTime >= OVER_AFTER) {
      this.over = true;
      this.render();
      this.stop();
      this.on.over({ score: this.score, topLevel: this.topLevel });
    }
  }

  /* ---------- Отрисовка ---------- */

  resize(cssWidth, cssHeight) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.scale = cssWidth / WORLD_W;
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.canvas.width = Math.round(cssWidth * this.dpr);
    this.canvas.height = Math.round(cssHeight * this.dpr);
    this.backdrop = this.renderBackdrop();
    this.render();
  }

  renderBackdrop() {
    const c = document.createElement('canvas');
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    const g = c.getContext('2d');
    g.scale(c.width / WORLD_W, c.height / WORLD_H);

    const sky = g.createLinearGradient(0, 0, 0, WORLD_H);
    sky.addColorStop(0, '#2c5b45');
    sky.addColorStop(0.55, '#1b3d2e');
    sky.addColorStop(1, '#10281e');
    g.fillStyle = sky;
    g.fillRect(0, 0, WORLD_W, WORLD_H);

    // Папоротники на заднем плане
    g.strokeStyle = 'rgba(120,180,130,.1)';
    g.lineCap = 'round';
    g.lineWidth = 4;
    for (const [x, h, lean] of [[46, 300, 0.28], [120, 190, -0.2], [300, 230, 0.2], [382, 330, -0.3]]) {
      for (let i = 1; i <= 9; i++) {
        const t = i / 10;
        const px = x + lean * h * t * t;
        const py = FLOOR_Y - h * t;
        const len = 44 * (1 - t) + 10;
        g.beginPath();
        g.moveTo(px, py);
        g.quadraticCurveTo(px - len * 0.6, py - 14, px - len, py + 6);
        g.moveTo(px, py);
        g.quadraticCurveTo(px + len * 0.6, py - 14, px + len, py + 6);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(x, FLOOR_Y);
      g.quadraticCurveTo(x, FLOOR_Y - h * 0.5, x + lean * h, FLOOR_Y - h);
      g.stroke();
    }

    // Мох на дне
    g.fillStyle = '#4e8a4a';
    g.fillRect(0, FLOOR_Y, WORLD_W, WORLD_H - FLOOR_Y);
    g.fillStyle = '#6aa85a';
    for (let x = -6; x < WORLD_W + 10; x += 15) {
      g.beginPath();
      g.arc(x, FLOOR_Y + 3, 9 + ((x * 7) % 4), Math.PI, 0);
      g.fill();
    }
    return c;
  }

  render() {
    const g = this.ctx;
    const k = this.canvas.width / WORLD_W;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (this.backdrop) g.drawImage(this.backdrop, 0, 0);
    g.setTransform(k, 0, 0, k, 0, 0);

    if (this.shake > 0.3 && !reducedMotion) {
      g.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    this.drawFireflies(g);
    this.drawLine(g);
    this.drawGuide(g);

    for (const body of this.pieces()) {
      const { level, born, popped } = body.plugin;
      let scale = 1;
      if (popped) {
        const t = Math.min(1, (this.time - born) / 200);
        scale = 0.72 + 0.28 * easeOutBack(t);
      }
      this.drawPiece(g, level, body.position.x, body.position.y, body.angle, scale);
    }

    if (this.held !== null && !this.over) {
      this.drawPiece(g, this.held, this.clampAim(this.held), HOLD_Y, 0, 1);
    }

    for (const p of this.particles) {
      g.globalAlpha = 1 - p.age / p.life;
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '800 22px ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(30,20,5,.8)';
    g.fillStyle = '#ffe28a';
    for (const f of this.floaters) {
      const t = f.age / f.life;
      g.globalAlpha = 1 - t * t;
      g.strokeText(f.text, f.x, f.y - t * 46);
      g.fillText(f.text, f.x, f.y - t * 46);
    }
    g.globalAlpha = 1;
  }

  drawPiece(g, level, x, y, angle, scale) {
    const r = MUSHROOMS[level].r * scale;
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    g.drawImage(getSprite(level), -r, -r, r * 2, r * 2);
    g.restore();
  }

  drawFireflies(g) {
    for (const f of this.fireflies) {
      const t = this.time / 1000 + f.phase;
      const x = f.x + Math.sin(t * 0.7) * 18;
      const y = f.y + Math.cos(t * 0.5) * 14;
      g.globalAlpha = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.8));
      g.fillStyle = '#e8f59a';
      g.beginPath();
      g.arc(x, y, 2.2, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  drawLine(g) {
    const danger = this.dangerTime > 0;
    const pulse = danger ? 0.6 + 0.4 * Math.sin(this.time / 70) : 0.42;
    g.strokeStyle = danger ? `rgba(255,110,90,${pulse})` : `rgba(255,244,210,${pulse})`;
    g.lineWidth = danger ? 3 : 2;
    g.setLineDash([12, 10]);
    g.beginPath();
    g.moveTo(0, LINE_Y);
    g.lineTo(WORLD_W, LINE_Y);
    g.stroke();
    g.setLineDash([]);
  }

  drawGuide(g) {
    if (this.held === null || this.over) return;
    const x = this.clampAim(this.held);
    g.strokeStyle = 'rgba(255,255,255,.24)';
    g.lineWidth = 2;
    g.setLineDash([3, 9]);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, HOLD_Y + MUSHROOMS[this.held].r);
    g.lineTo(x, FLOOR_Y);
    g.stroke();
    g.setLineDash([]);
  }
}

function easeOutBack(t) {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}
