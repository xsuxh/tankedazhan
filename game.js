// 游戏主类
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.input = new Input(this.canvas);
    this.audio = new AudioManager();
    this.particles = new ParticleSystem(600);
    this.starfield = new Starfield();
    this.renderer = new Renderer(this.canvas, this);
    this.ui = new UI(this);

    this.state = 'menu'; // menu | playing | paused | upgrade | gameover
    this.mode = 'defense';
    this.W = window.innerWidth; this.H = window.innerHeight;

    this.player = null;
    this.bullets = [];
    this.enemies = [];
    this.pickups = [];
    this.boss = null;
    this.map = null;

    this.score = 0;
    this.wave = 0;
    this.maxWaves = 10;
    this.waveTimer = 0;
    this.waveActive = false;
    this.enemiesToSpawn = [];
    this.spawnTimer = 0;
    this.gameTime = 0;
    this.kills = 0;
    this._killBonus = 0;

    this.shakeAmt = 0;
    this._lastTs = 0;
    this._bindGlobal();
    // 渲染循环常驻（主菜单也渲染星空背景）
    this._lastTs = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  _bindGlobal() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        // 设置面板打开时，ESC 先关闭设置
        const sm = document.getElementById('settingsMenu');
        if (sm && !sm.classList.contains('hidden')) { this.ui.closeSettings(); return; }
        if (this.state === 'playing' || this.state === 'paused') {
          if (this.state === 'playing') this.pause(); else this.resume();
        }
      }
    });
    // 准星跟随鼠标
    this.canvas.addEventListener('mousemove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      const ch = document.getElementById('crosshair');
      ch.style.left = (e.clientX - r.left) + 'px';
      ch.style.top = (e.clientY - r.top) + 'px';
    });
  }

  start(mode) {
    this.audio.init();
    this.mode = mode;
    this.state = 'playing';
    this.bullets = []; this.enemies = []; this.pickups = []; this.boss = null;
    this.score = 0; this.wave = 0; this.waveTimer = 0; this.waveActive = false;
    this.enemiesToSpawn = []; this.spawnTimer = 0; this.gameTime = 0; this.kills = 0;
    this.shakeAmt = 0;

    this.map = new GameMap(this.W, this.H);
    this.map.generate(mode);

    // 玩家出生（校验落点）
    const px = mode === 'defense' ? this.map.baseX : this.W / 2;
    const py = mode === 'defense' ? this.map.baseY - 120 : this.H / 2;
    this.player = new PlayerTank(px, py);
    const ps = this.findFreeSpot(px, py, this.player.size);
    if (ps) { this.player.x = ps.x; this.player.y = ps.y; }

    // 波次配置
    if (mode === 'boss') {
      this.maxWaves = 1;
      this.waveTimer = 1; // BOSS 快速登场
    } else {
      this.maxWaves = mode === 'surge' ? 999 : 10;
      this.waveTimer = 2;
    }

    this.ui.showHud();
    this._lastTs = performance.now();
  }

  pause() { this.state = 'paused'; this.ui.togglePause(true); }
  resume() { this.state = 'playing'; this.ui.togglePause(false); this._lastTs = performance.now(); }
  quitToMenu() {
    this.state = 'menu';
    this.ui.showMenu();
  }

  shake(amt) { this.shakeAmt = Math.max(this.shakeAmt, amt); }
  flashDamage() {
    const v = document.getElementById('damageVignette');
    v.style.opacity = '1';
    setTimeout(() => { v.style.opacity = '0'; }, 150);
  }

  // 波次系统
  _startNextWave() {
    this.wave++;
    if (this.mode === 'boss' && this.wave === 1) {
      // BOSS 战（校验出生点，避免嵌入墙体）
      this.boss = new Boss(this.W / 2, 120);
      const bs = this.findFreeSpot(this.boss.x, this.boss.y, this.boss.size);
      if (bs) { this.boss.x = bs.x; this.boss.y = bs.y; }
      this.audio.bossWarn();
      this.ui.announceWave('BOSS');
      this.waveActive = true;
      return;
    }
    if (this.mode !== 'surge' && this.wave > this.maxWaves) { this._victory(); return; }
    this.ui.announceWave(this.wave);
    const composition = this._waveComposition(this.wave);
    this.enemiesToSpawn = composition;
    this.spawnTimer = 0;
    this.waveActive = true;
  }

  _waveComposition(w) {
    const list = [];
    const count = 4 + w * 2;
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      let type = 'scout';
      if (w >= 3 && r < 0.25) type = 'heavy';
      else if (w >= 2 && r < 0.45) type = 'sniper';
      else if (w >= 4 && r < 0.6) type = 'bomber';
      list.push(type);
    }
    return list;
  }

  // 在 (x,y) 附近寻找一块不与墙体重叠的空位（用于出生与卡死自救）
  findFreeSpot(x, y, size) {
    if (!this.map.collidesRect(x - size, y - size, size * 2, size * 2)) return { x, y };
    for (let ring = 1; ring <= 20; ring++) {
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2 + ring * 0.5;
        const nx = x + Math.cos(ang) * ring * TILE * 0.8;
        const ny = y + Math.sin(ang) * ring * TILE * 0.8;
        if (nx < TILE * 2 || ny < TILE * 2 || nx > this.W - TILE * 2 || ny > this.H - TILE * 2) continue;
        if (!this.map.collidesRect(nx - size, ny - size, size * 2, size * 2)) return { x: nx, y: ny };
      }
    }
    return null;
  }

  _spawnEnemy(type) {
    const e = new EnemyTank(0, 0, type);
    const m = TILE + 30; // 边距足够避开边界钢墙（墙占 0~40px）
    // 从地图边缘随机找合法出生点（先校验再落地，绝不嵌墙）
    for (let i = 0; i < 40; i++) {
      const side = Math.floor(Math.random() * 4);
      let x, y;
      if (side === 0) { x = 60 + Math.random() * (this.W - 120); y = m; }
      else if (side === 1) { x = this.W - m; y = 60 + Math.random() * (this.H - 120); }
      else if (side === 2) { x = 60 + Math.random() * (this.W - 120); y = this.H - m; }
      else { x = m; y = 60 + Math.random() * (this.H - 120); }
      if (!this.map.collidesRect(x - e.size, y - e.size, e.size * 2, e.size * 2)) {
        e.x = x; e.y = y;
        this.enemies.push(e);
        return;
      }
    }
    // 兜底：向地图中心方向搜索空位；找不到则放弃本次生成（绝不生成卡墙的敌人）
    const spot = this.findFreeSpot(this.W / 2, this.H / 2, e.size);
    if (spot) { e.x = spot.x; e.y = spot.y; this.enemies.push(e); }
  }

  onLevelUp() {
    this.audio.levelup();
    this.state = 'upgrade';
    const options = this._rollUpgrades();
    this.ui.showUpgrade(options, (opt) => {
      opt.apply(this.player);
      this.ui.hideUpgrade();
      this.state = 'playing';
      this._lastTs = performance.now();
    });
  }

  _rollUpgrades() {
    const pool = [
      { id: 'dmg', name: '伤害强化', icon: 'swords', desc: '所有武器伤害 +20%', apply: p => p.damageMul *= 1.2 },
      { id: 'rof', name: '射速强化', icon: 'zap', desc: '射速 +15%', apply: p => p.fireRateMul *= 1.15 },
      { id: 'hp', name: '装甲强化', icon: 'heart', desc: '生命上限 +40 并回满', apply: p => { p.maxHp += 40; p.hp = p.maxHp; } },
      { id: 'shield', name: '护盾矩阵', icon: 'shield', desc: '护盾上限 +20', apply: p => { p.maxShield += 20; p.shield = p.maxShield; } },
      { id: 'speed', name: '推进系统', icon: 'wind', desc: '移动速度 +15%', apply: p => p.speed *= 1.15 },
      { id: 'turret', name: '火控系统', icon: 'crosshair', desc: '炮塔转速 +30%', apply: p => p.turretRotSpeed *= 1.3 },
      { id: 'crit', name: '能量过载', icon: 'flame', desc: '伤害 +10%、射速 +10%', apply: p => { p.damageMul *= 1.1; p.fireRateMul *= 1.1; } },
    ];
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  onBossDefeated() {
    this.boss = null;
    setTimeout(() => this._victory(), 1500);
  }

  _victory() {
    this.state = 'gameover';
    this.audio.victory();
    this.ui.showResult(true, { kills: this.kills, time: this.gameTime, wave: this.wave, score: this.score });
  }
  _defeat() {
    this.state = 'gameover';
    this.audio.defeat();
    this.ui.showResult(false, { kills: this.kills, time: this.gameTime, wave: this.wave, score: this.score });
  }

  update(dt) {
    if (this.state !== 'playing') return;
    this.gameTime += dt;
    if (this.shakeAmt > 0) this.shakeAmt = Math.max(0, this.shakeAmt - dt * 40);

    // 波次
    if (this.waveActive) {
      if (this.enemiesToSpawn.length > 0) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          this._spawnEnemy(this.enemiesToSpawn.shift());
          this.spawnTimer = 0.6;
        }
      } else if (this.enemies.every(e => !e.alive) && !this.boss) {
        // 波次结束
        this.waveActive = false;
        this.waveTimer = this.mode === 'surge' ? 4 : 3;
      }
    } else {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) this._startNextWave();
    }

    // 实体更新
    this.player.update(dt, this);
    for (const e of this.enemies) if (e.alive) e.update(dt, this);
    if (this.boss && this.boss.alive) this.boss.update(dt, this);
    for (const b of this.bullets) if (b.alive) b.update(dt, this);
    for (const p of this.pickups) if (p.alive) p.update(dt, this);
    this.particles.update(dt);

    // 碰撞：子弹 vs 敌人/玩家
    this._resolveCollisions();

    // 清理
    this.bullets = this.bullets.filter(b => b.alive);
    this.enemies = this.enemies.filter(e => e.alive);
    this.pickups = this.pickups.filter(p => p.alive);
    if (this.boss && !this.boss.alive) this.boss = null;

    // 胜负判定
    if (!this.player.alive) { this._defeat(); return; }
    if (this.mode === 'defense' && this.map.baseHp <= 0) { this._defeat(); return; }

    this.ui.updateHud();
  }

  _resolveCollisions() {
    for (const b of this.bullets) {
      if (!b.alive) continue;
      // 玩家子弹打敌人
      if (b.owner === this.player || (b.owner && b.owner.isPlayer)) {
        for (const e of this.enemies) {
          if (!e.alive || b.hits.has(e)) continue;
          if (Math.hypot(e.x - b.x, e.y - b.y) < e.size + b.size) {
            e.takeDamage(b.damage, this);
            this.audio.hit();
            this.particles.burst(b.x, b.y, 5, { color: b.color, speed: 100, life: 0.2 });
            b.hits.add(e);
            if (b.pierce > 0) b.pierce--; else { b.alive = false; break; }
          }
        }
        if (b.alive && this.boss && this.boss.alive) {
          if (Math.hypot(this.boss.x - b.x, this.boss.y - b.y) < this.boss.size + b.size) {
            this.boss.takeDamage(b.damage, this);
            this.particles.burst(b.x, b.y, 5, { color: b.color, speed: 100, life: 0.2 });
            if (b.pierce > 0) b.pierce--; else b.alive = false;
          }
        }
      } else {
        // 敌人子弹打玩家
        if (Math.hypot(this.player.x - b.x, this.player.y - b.y) < this.player.size + b.size) {
          this.player.takeDamage(b.damage, this);
          this.particles.burst(b.x, b.y, 6, { color: '#ff3b6b', speed: 120, life: 0.25 });
          b.alive = false;
        }
      }
    }
    // 敌人撞击玩家（自爆车已在 update 处理，普通敌人轻微伤害）
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < e.size + this.player.size) {
        this.player.takeDamage(0.5, this);
      }
    }
    // 击杀计数由 enemy.onDeath 累计
  }
  _killBonus = 0;

  loop(ts) {
    const dt = Math.min((ts - this._lastTs) / 1000, 0.05);
    this._lastTs = ts;
    if (this.starfield) this.starfield.update(dt);
    if (this.state === 'playing') this.update(dt);
    // 屏幕震动
    const ctx = this.renderer.ctx;
    ctx.save();
    if (this.shakeAmt > 0) {
      ctx.translate((Math.random() - 0.5) * this.shakeAmt, (Math.random() - 0.5) * this.shakeAmt);
    }
    this.renderer.render();
    ctx.restore();
    requestAnimationFrame((t) => this.loop(t));
  }
}
window.Game = Game;
