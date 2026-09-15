// 地图：网格 + 碰撞 + 寻路辅助
const TILE = 40;
const T_EMPTY = 0, T_BRICK = 1, T_STEEL = 2, T_GRASS = 3, T_WATER = 4, T_BASE = 5;

class GameMap {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.cols = Math.ceil(w / TILE);
    this.rows = Math.ceil(h / TILE);
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) row.push(T_EMPTY);
      this.grid.push(row);
    }
    this.baseX = 0; this.baseY = 0; this.baseHp = 100; this.baseMaxHp = 100;
  }

  // 程序化生成地图
  generate(mode = 'defense') {
    // 边界钢墙
    for (let c = 0; c < this.cols; c++) { this.grid[0][c] = T_STEEL; this.grid[this.rows - 1][c] = T_STEEL; }
    for (let r = 0; r < this.rows; r++) { this.grid[r][0] = T_STEEL; this.grid[r][this.cols - 1] = T_STEEL; }

    // 随机砖墙群
    const clusters = 18;
    for (let i = 0; i < clusters; i++) {
      const cr = 2 + Math.floor(Math.random() * (this.rows - 4));
      const cc = 2 + Math.floor(Math.random() * (this.cols - 4));
      const size = 1 + Math.floor(Math.random() * 3);
      for (let dr = 0; dr < size; dr++)
        for (let dc = 0; dc < size; dc++)
          if (Math.random() < 0.7) this.grid[cr + dr][cc + dc] = T_BRICK;
    }
    // 钢墙块
    for (let i = 0; i < 6; i++) {
      const cr = 3 + Math.floor(Math.random() * (this.rows - 6));
      const cc = 3 + Math.floor(Math.random() * (this.cols - 6));
      this.grid[cr][cc] = T_STEEL;
    }
    // 草丛
    for (let i = 0; i < 10; i++) {
      const cr = 2 + Math.floor(Math.random() * (this.rows - 4));
      const cc = 2 + Math.floor(Math.random() * (this.cols - 4));
      this.grid[cr][cc] = T_GRASS;
    }
    // 水域
    for (let i = 0; i < 5; i++) {
      const cr = 2 + Math.floor(Math.random() * (this.rows - 4));
      const cc = 2 + Math.floor(Math.random() * (this.cols - 4));
      this.grid[cr][cc] = T_WATER;
    }

    // 基地（守护模式）
    if (mode === 'defense') {
      this.baseX = Math.floor(this.cols / 2) * TILE;
      this.baseY = (this.rows - 3) * TILE;
      // 基地周围留空 + 砖墙防护
      const br = Math.floor(this.baseY / TILE), bc = Math.floor(this.baseX / TILE);
      for (let dr = -1; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++) {
          const r = br + dr, c = bc + dc;
          if (r > 0 && r < this.rows - 1 && c > 0 && c < this.cols - 1) this.grid[r][c] = T_EMPTY;
        }
      this.grid[br - 1][bc - 1] = T_BRICK; this.grid[br - 1][bc] = T_BRICK; this.grid[br - 1][bc + 1] = T_BRICK;
      this.grid[br][bc - 1] = T_BRICK; this.grid[br][bc + 1] = T_BRICK;
      this.grid[br][bc] = T_BASE;
      this.baseHp = 100; this.baseMaxHp = 100;
    }
  }

  tileAt(px, py) {
    const c = Math.floor(px / TILE), r = Math.floor(py / TILE);
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return T_STEEL;
    return this.grid[r][c];
  }

  isSolid(px, py) {
    const t = this.tileAt(px, py);
    return t === T_BRICK || t === T_STEEL;
  }

  // 矩形碰撞（坦克用）：精确 AABB 覆盖瓦片检测，不留采样缝隙
  collidesRect(x, y, w, h, ignoreWater = false) {
    const EPS = 0.01;
    const c0 = Math.floor((x + EPS) / TILE), c1 = Math.floor((x + w - EPS) / TILE);
    const r0 = Math.floor((y + EPS) / TILE), r1 = Math.floor((y + h - EPS) / TILE);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return true; // 越界视作钢墙
        const t = this.grid[r][c];
        if (t === T_BRICK || t === T_STEEL) return true;
        if (!ignoreWater && t === T_WATER) return true;
      }
    }
    return false;
  }

  // 子弹是否被墙阻挡
  bulletBlocked(px, py, isHeavy = false) {
    const t = this.tileAt(px, py);
    if (t === T_BRICK) { this._destroyBrick(px, py); return true; }
    if (t === T_STEEL) return !isHeavy; // 重弹可破钢墙
    return false;
  }

  _destroyBrick(px, py) {
    const c = Math.floor(px / TILE), r = Math.floor(py / TILE);
    if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.grid[r][c] === T_BRICK) {
      this.grid[r][c] = T_EMPTY;
      return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
    }
    return null;
  }

  damageBase(dmg) {
    this.baseHp = Math.max(0, this.baseHp - dmg);
    return this.baseHp <= 0;
  }
}
window.GameMap = GameMap;
window.TILE = TILE;
window.T = { EMPTY: T_EMPTY, BRICK: T_BRICK, STEEL: T_STEEL, GRASS: T_GRASS, WATER: T_WATER, BASE: T_BASE };
