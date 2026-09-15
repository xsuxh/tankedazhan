// 渲染器：背景网格、地图、实体、HUD（Canvas 层）
class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.bgCache = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.ceil(window.innerWidth * dpr);
    this.canvas.height = Math.ceil(window.innerHeight * dpr);
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.game.W = window.innerWidth;
    this.game.H = window.innerHeight;
    this.bgCache = null;
  }
  _buildBg(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    // 星空夜色渐变（上暗下蓝）
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#010208');
    g.addColorStop(0.55, '#061027');
    g.addColorStop(0.85, '#0b2350');
    g.addColorStop(1, '#123569');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // 地平线蓝光（参考图底部亮蓝）
    const hg = x.createRadialGradient(w / 2, h * 1.06, 40, w / 2, h * 1.06, w * 0.55);
    hg.addColorStop(0, 'rgba(95,165,255,0.32)');
    hg.addColorStop(1, 'rgba(95,165,255,0)');
    x.fillStyle = hg; x.fillRect(0, 0, w, h);
    // 网格
    x.strokeStyle = 'rgba(0,229,255,0.05)'; x.lineWidth = 1;
    const s = 40;
    for (let i = 0; i <= w; i += s) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
    for (let j = 0; j <= h; j += s) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); }
    // 背景水印「逍遥子」：大号细体、低透明度，可辨认但不抢画面
    x.save();
    const fs = Math.round(Math.min(w, h) * 0.26);
    x.font = `300 ${fs}px "Microsoft YaHei Light", "Microsoft YaHei", "PingFang SC", sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    try { x.letterSpacing = `${Math.round(fs * 0.12)}px`; } catch (e) { }
    x.shadowColor = 'rgba(120,180,255,0.3)';
    x.shadowBlur = 24;
    x.fillStyle = 'rgba(165,205,255,0.16)';
    x.fillText('逍遥子', w / 2, h * 0.44);
    x.restore();
    return c;
  }
  render() {
    const ctx = this.ctx;
    const w = this.game.W, h = this.game.H;
    // 背景
    if (!this.bgCache || this.bgCache.width !== w || this.bgCache.height !== h) {
      this.bgCache = this._buildBg(w, h);
    }
    ctx.drawImage(this.bgCache, 0, 0);

    // 动态星空（菜单与游戏中均渲染）
    if (this.game.starfield) this.game.starfield.render(ctx, w, h);

    // 扫描线
    ctx.globalAlpha = 0.04;
    for (let y = 0; y < h; y += 3) ctx.fillStyle = '#000', ctx.fillRect(0, y, w, 1);
    ctx.globalAlpha = 1;

    // 主菜单阶段：仅背景星空
    if (!this.game.map) return;

    // 地图
    this._drawMap(ctx);

    // 实体（按 y 排序，简易深度）
    const ents = [
      ...this.game.enemies,
      this.game.boss,
      this.game.player,
      ...this.game.pickups,
    ].filter(Boolean);
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) if (e.alive) e.render(ctx);

    // 子弹（在最上层）
    for (const b of this.game.bullets) b.render(ctx);

    // 粒子
    this.game.particles.render(ctx);

    // 草丛覆盖层（隐身感）
    this._drawGrassOverlay(ctx);

    // 准星由 DOM 处理
  }

  _drawMap(ctx) {
    const map = this.game.map;
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const t = map.grid[r][c];
        const x = c * TILE, y = r * TILE;
        if (t === T.BRICK) {
          ctx.fillStyle = '#7a3a1a';
          ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
          ctx.strokeStyle = '#4a2010'; ctx.lineWidth = 1;
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 1, y + 1 + i * (TILE - 2) / 3); ctx.lineTo(x + TILE - 1, y + 1 + i * (TILE - 2) / 3); ctx.stroke(); }
        } else if (t === T.STEEL) {
          ctx.fillStyle = '#3a4a66';
          ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
          ctx.strokeStyle = '#6a7a96'; ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        } else if (t === T.WATER) {
          ctx.fillStyle = `rgba(0,120,200,${0.3 + 0.1 * Math.sin(performance.now() / 400 + r)})`;
          ctx.fillRect(x, y, TILE, TILE);
        } else if (t === T.BASE) {
          ctx.fillStyle = '#0a0a14';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = '#39ff14'; ctx.lineWidth = 2;
          ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.fillStyle = '#39ff14'; ctx.font = 'bold 10px Orbitron'; ctx.textAlign = 'center';
          ctx.fillText('CORE', x + TILE / 2, y + TILE / 2 + 3);
        }
      }
    }
  }
  _drawGrassOverlay(ctx) {
    const map = this.game.map;
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        if (map.grid[r][c] === T.GRASS) {
          const x = c * TILE, y = r * TILE;
          ctx.fillStyle = 'rgba(40,120,40,0.55)';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = 'rgba(80,200,80,0.4)'; ctx.lineWidth = 1;
          for (let i = 0; i < 5; i++) {
            ctx.beginPath(); ctx.moveTo(x + i * 8, y + TILE); ctx.lineTo(x + i * 8 + 4, y + 6); ctx.stroke();
          }
        }
      }
    }
  }
}
window.Renderer = Renderer;
