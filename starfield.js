// 动态星空背景：深蓝渐变夜空 + 闪烁星星 + 流星 + 底部发光水晶（参考图风格）
class Starfield {
  constructor() {
    this.stars = [];
    this.shooters = [];
    this.shooterTimer = 2;
    this.t = 0;
    this._initStars();
  }
  _initStars() {
    for (let i = 0; i < 170; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.9,               // 集中在上部
        r: Math.random() < 0.85 ? 0.4 + Math.random() * 0.9 : 1.2 + Math.random() * 0.9,
        tw: 0.5 + Math.random() * 2.2,        // 闪烁速度
        ph: Math.random() * Math.PI * 2,
        drift: 0.002 + Math.random() * 0.005, // 缓慢漂移
        hue: Math.random() < 0.75 ? '255,255,255' : (Math.random() < 0.5 ? '170,205,255' : '255,232,190'),
      });
    }
  }
  update(dt) {
    this.t += dt;
    for (const s of this.stars) {
      s.x += s.drift * dt;
      if (s.x > 1.02) s.x = -0.02;
    }
    // 定时生成流星
    this.shooterTimer -= dt;
    if (this.shooterTimer <= 0) {
      this.shooterTimer = 3 + Math.random() * 5;
      this.shooters.push({
        x: 0.1 + Math.random() * 0.8, y: Math.random() * 0.35,
        vx: (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.25),
        vy: 0.12 + Math.random() * 0.1,
        life: 1,
      });
    }
    for (const s of this.shooters) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 0.9;
    }
    this.shooters = this.shooters.filter(s => s.life > 0);
  }
  render(ctx, w, h) {
    // 星星
    for (const st of this.stars) {
      const a = 0.25 + 0.75 * Math.abs(Math.sin(this.t * st.tw + st.ph));
      const x = st.x * w, y = st.y * h;
      ctx.fillStyle = `rgba(${st.hue},${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, st.r, 0, Math.PI * 2); ctx.fill();
      if (st.r > 1.5) { // 亮星十字光芒
        ctx.strokeStyle = `rgba(${st.hue},${(a * 0.35).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - st.r * 4, y); ctx.lineTo(x + st.r * 4, y);
        ctx.moveTo(x, y - st.r * 4); ctx.lineTo(x, y + st.r * 4);
        ctx.stroke();
      }
    }
    // 流星
    for (const s of this.shooters) {
      const x = s.x * w, y = s.y * h, len = 90 * s.life;
      const g = ctx.createLinearGradient(x, y, x - s.vx * len * 2.2, y - s.vy * len * 2.2);
      g.addColorStop(0, `rgba(255,255,255,${(0.85 * s.life).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x - s.vx * len * 2.2, y - s.vy * len * 2.2);
      ctx.stroke();
    }
    // 底部发光水晶
    this._cube(ctx, w, h);
  }
  _cube(ctx, w, h) {
    const t = this.t;
    const cx = w / 2;
    const size = Math.min(w, h) * 0.13;
    const bob = Math.sin(t * 0.8) * 6;          // 缓慢浮动
    const top = h * 0.88 + bob;                 // 立于底部地平线
    const ch = h - top + 30;                    // 前面延伸出画面底
    const depth = size * 0.45;
    const pulse = 0.55 + 0.25 * Math.sin(t * 1.6);

    ctx.save();
    // 光晕
    const g = ctx.createRadialGradient(cx, top + size * 0.4, 10, cx, top + size * 0.4, size * 3);
    g.addColorStop(0, `rgba(130,195,255,${(0.32 * pulse).toFixed(3)})`);
    g.addColorStop(1, 'rgba(130,195,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - size * 3.2, top - size * 2.5, size * 6.4, size * 6.4);
    // 顶面
    ctx.strokeStyle = `rgba(225,242,255,0.8)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - size / 2, top);
    ctx.lineTo(cx - size / 2 + depth, top - depth * 0.8);
    ctx.lineTo(cx + size / 2 + depth, top - depth * 0.8);
    ctx.lineTo(cx + size / 2, top);
    ctx.closePath();
    ctx.fillStyle = `rgba(232,246,255,${(0.30 + 0.10 * pulse).toFixed(3)})`;
    ctx.fill(); ctx.stroke();
    // 右侧面
    ctx.beginPath();
    ctx.moveTo(cx + size / 2, top);
    ctx.lineTo(cx + size / 2 + depth, top - depth * 0.8);
    ctx.lineTo(cx + size / 2 + depth, top - depth * 0.8 + ch * 0.85);
    ctx.lineTo(cx + size / 2, top + ch * 0.85);
    ctx.closePath();
    ctx.fillStyle = `rgba(150,200,255,${(0.18 + 0.08 * pulse).toFixed(3)})`;
    ctx.fill(); ctx.stroke();
    // 前面
    ctx.beginPath();
    ctx.rect(cx - size / 2, top, size, ch);
    ctx.fillStyle = `rgba(185,222,255,${(0.15 + 0.06 * pulse).toFixed(3)})`;
    ctx.fill(); ctx.stroke();
    // 内部折射纹
    ctx.strokeStyle = `rgba(255,255,255,${(0.28 * pulse).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - size / 2 + 6, top + 12); ctx.lineTo(cx + size / 2 - 10, top + 30);
    ctx.moveTo(cx - size / 2 + 16, top + 52); ctx.lineTo(cx + 4, top + 22);
    ctx.moveTo(cx + size / 2 - 4, top + 66); ctx.lineTo(cx + size / 2 - 20, top + 40);
    ctx.stroke();
    // 顶部亮斑
    ctx.fillStyle = `rgba(255,255,255,${(0.5 * pulse).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(cx + size * 0.1, top + 8, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
window.Starfield = Starfield;
