// Web Audio 合成音效，零素材依赖
class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
  }
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.enabled = false; }
  }
  _tone({ freq = 440, type = 'square', dur = 0.1, vol = 0.3, slide = 0 }) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }
  _noise({ dur = 0.3, vol = 0.4, filterFreq = 1000 }) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = filterFreq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }
  shoot() { this._tone({ freq: 880, type: 'square', dur: 0.08, vol: 0.15, slide: -400 }); }
  laser() { this._tone({ freq: 1200, type: 'sawtooth', dur: 0.12, vol: 0.12, slide: -600 }); }
  explosion() { this._noise({ dur: 0.4, vol: 0.5, filterFreq: 600 }); this._tone({ freq: 80, type: 'sine', dur: 0.3, vol: 0.3, slide: -60 }); }
  hit() { this._tone({ freq: 200, type: 'square', dur: 0.05, vol: 0.2 }); }
  pickup() { this._tone({ freq: 660, type: 'sine', dur: 0.1, vol: 0.2, slide: 400 }); }
  levelup() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone({ freq: f, type: 'triangle', dur: 0.12, vol: 0.25 }), i * 80));
  }
  emp() { this._tone({ freq: 100, type: 'sawtooth', dur: 0.5, vol: 0.3, slide: 400 }); this._noise({ dur: 0.3, vol: 0.2, filterFreq: 2000 }); }
  shield() { this._tone({ freq: 400, type: 'sine', dur: 0.2, vol: 0.2, slide: 600 }); }
  bossWarn() { this._tone({ freq: 150, type: 'sawtooth', dur: 0.6, vol: 0.4, slide: -50 }); }
  damage() { this._tone({ freq: 120, type: 'square', dur: 0.08, vol: 0.25 }); }
  victory() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this._tone({ freq: f, type: 'triangle', dur: 0.2, vol: 0.3 }), i * 120)); }
  defeat() { [400, 350, 300, 200].forEach((f, i) => setTimeout(() => this._tone({ freq: f, type: 'sawtooth', dur: 0.3, vol: 0.25 }), i * 150)); }
}
window.AudioManager = AudioManager;
