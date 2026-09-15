// 粒子系统（对象池）
class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.life = 0; this.maxLife = 0; this.size = 2; this.color = '#fff';
    this.alive = false; this.glow = false; this.shrink = true;
  }
  init(x, y, vx, vy, life, color, size, glow = false) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life; this.color = color; this.size = size;
    this.glow = glow; this.alive = true;
  }
  update(dt) {
    if (!this.alive) return;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= 0.92; this.vy *= 0.92;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }
  render(ctx) {
    if (!this.alive) return;
    const a = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = a;
    if (this.glow) { ctx.shadowBlur = 12; ctx.shadowColor = this.color; }
    ctx.fillStyle = this.color;
    const s = this.shrink ? this.size * a : this.size;
    ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(0.1, s), 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

class ParticleSystem {
  constructor(max = 600) {
    this.pool = [];
    for (let i = 0; i < max; i++) this.pool.push(new Particle());
  }
  spawn(x, y, opts = {}) {
    const p = this.pool.find(p => !p.alive);
    if (!p) return;
    const angle = opts.angle ?? Math.random() * Math.PI * 2;
    const speed = opts.speed ?? (Math.random() * 200 + 50);
    p.init(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
      opts.life ?? 0.5, opts.color ?? '#fff', opts.size ?? 3, opts.glow ?? false);
  }
  burst(x, y, count, opts = {}) {
    for (let i = 0; i < count; i++) {
      const angle = opts.angle !== undefined ? opts.angle + (Math.random() - 0.5) * (opts.spread ?? Math.PI * 2) : Math.random() * Math.PI * 2;
      this.spawn(x, y, { angle, speed: opts.speed ?? (Math.random() * 250 + 80), life: opts.life ?? 0.6, color: opts.color ?? '#ffaa00', size: opts.size ?? 3, glow: opts.glow ?? true });
    }
  }
  trail(x, y, color) {
    this.spawn(x, y, { angle: Math.random() * Math.PI * 2, speed: 20 + Math.random() * 30, life: 0.3, color, size: 2.5, glow: true });
  }
  update(dt) { this.pool.forEach(p => p.update(dt)); }
  render(ctx) { this.pool.forEach(p => p.render(ctx)); }
}
window.ParticleSystem = ParticleSystem;
