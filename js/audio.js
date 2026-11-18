// Короткие звуки синтезируются на лету, файлов со звуком нет.

export class Sfx {
  constructor(enabled) {
    this.enabled = enabled;
    this.ctx = null;
  }

  // Браузеры разрешают звук только после действия пользователя.
  unlock() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!this.ctx) this.ctx = new AudioCtx();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, { at = 0, dur = 0.14, type = 'sine', gain = 0.16, slide = 1 } = {}) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const start = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(freq * slide, start + dur);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  drop() {
    this.tone(210, { dur: 0.1, slide: 0.6, gain: 0.12 });
  }

  merge(level) {
    const base = 300 * Math.pow(2, level / 7);
    this.tone(base, { dur: 0.13, slide: 1.5 });
    this.tone(base * 1.5, { at: 0.06, dur: 0.16, type: 'triangle', gain: 0.1 });
  }

  discover() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, { at: i * 0.09, dur: 0.2, type: 'triangle', gain: 0.12 }));
  }

  over() {
    [392, 330, 262].forEach((f, i) => this.tone(f, { at: i * 0.16, dur: 0.3, type: 'triangle', gain: 0.13 }));
  }
}
