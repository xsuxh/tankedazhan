// 实体基类与各实体
class Entity {
  constructor(x, y) { this.x = x; this.y = y; this.alive = true; }
  update(dt, game) {}
  render(ctx) {}
}

// 子弹
class Bullet extends Entity {
  constructor(opts) {
    super(opts.x, opts.y);
    this.angle = opts.angle;
    this.speed = opts.speed;
    this.vx = Math.cos(opts.angle) * opts.speed;
    this.vy = Math.sin(opts.angle) * opts.speed;
    this.damage = opts.damage;
    this.pierce = opts.pierce;
    this.hits = new Set();
    this.size = opts.size ?? 5;
    this.color = opts.color ?? '#fff';
    this.owner = opts.owner;
    this.heavy = opts.heavy ?? false;
    this.homing = opts.homing ?? false;
    this.life = 2.5;
    this.trail = [];
  }
  update(dt, game) {
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }

    // 追踪
    if (this.homing) {
      let target = null, minD = 400;
      for (const e of game.enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < minD) { minD = d; target = e; }
      }
      if (target) {
        const ta = Math.atan2(target.y - this.y, target.x - this.x);
        let diff = ta - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.angle += Math.sign(diff) * Math.min(Math.abs(diff), 4 * dt);
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 拖尾
    this.trail.push({ x: this.x, y: this.y, life: 0.15 });
    if (this.trail.length > 8) this.trail.shift();
    this.trail.forEach(t => t.life -= dt);

    // 墙体碰撞
    if (game.map.isSolid(this.x, this.y)) {
      if (game.map.tileAt(this.x, this.y) === T.BRICK) {
        const pos = game.map._destroyBrick(this.x, this.y);
        if (pos) game.particles.burst(pos.x, pos.y, 8, { color: '#c97b3c', speed: 120, life: 0.4 });
      }
      this.alive = false;
      game.particles.burst(this.x, this.y, 6, { color: this.color, speed: 100, life: 0.25 });
      return;
    }
    // 基地
    if (game.map.baseHp > 0) {
      const dx = this.x - game.map.baseX, dy = this.y - game.map.baseY;
      if (Math.hypot(dx, dy) < TILE) {
        if (this.owner !== 'base') {
          game.map.damageBase(this.damage);
          game.audio.explosion();
          game.particles.burst(this.x, this.y, 20, { color: '#ff3b3b', speed: 250, life: 0.5 });
        }
        this.alive = false;
      }
    }
  }
  render(ctx) {
    // 拖尾
    for (const t of this.trail) {
      if (t.life <= 0) continue;
      ctx.globalAlpha = t.life / 0.15 * 0.5;
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(t.x, t.y, this.size * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 10; ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// 坦克基类
class Tank extends Entity {
  constructor(x, y, opts = {}) {
    super(x, y);
    this.size = opts.size ?? 18;
    this.hp = opts.hp ?? 100; this.maxHp = opts.hp ?? 100;
    this.shield = 0; this.maxShield = 0;
    this.speed = opts.speed ?? 140;
    this.rotSpeed = opts.rotSpeed ?? 3;
    this.turretRotSpeed = opts.turretRotSpeed ?? 6;
    this.angle = 0;       // 车身角度
    this.turretAngle = 0; // 炮塔角度
    this.color = opts.color ?? '#00e5ff';
    this.isPlayer = opts.isPlayer ?? false;
    this.fireCooldown = 0;
    this.damageMul = 1;
    this.invuln = 0;
  }
  takeDamage(dmg, game) {
    if (this.invuln > 0) return;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, dmg);
      this.shield -= absorbed; dmg -= absorbed;
    }
    if (dmg > 0) {
      this.hp -= dmg;
      if (this.isPlayer) { game.audio.damage(); game.flashDamage(); }
    }
    if (this.hp <= 0) { this.alive = false; this.onDeath(game); }
  }
  onDeath(game) {
    game.particles.burst(this.x, this.y, 24, { color: '#ff8800', speed: 280, life: 0.7 });
    game.audio.explosion();
    game.shake(12);
  }
  // 移动（带墙体碰撞）
  tryMove(dx, dy, game) {
    const nx = this.x + dx, ny = this.y + dy;
    if (!game.map.collidesRect(nx - this.size, this.y - this.size, this.size * 2, this.size * 2)) this.x = nx;
    if (!game.map.collidesRect(this.x - this.size, ny - this.size, this.size * 2, this.size * 2)) this.y = ny;
  }
}

// 玩家坦克
class PlayerTank extends Tank {
  constructor(x, y) {
    super(x, y, { hp: 100, speed: 150, color: '#00e5ff', size: 18, isPlayer: true });
    this.level = 1; this.exp = 0; this.expNext = 10;
    this.weapons = ['cannon', 'shotgun', 'missile'];
    this.currentWeapon = 0;
    this.maxShield = 30; this.shield = 30;
    // 技能 CD
    this.skills = {
      dash: { cd: 0, max: 3.5, dur: 0.3, active: 0 },
      shield: { cd: 0, max: 12, dur: 3, active: 0 },
      emp: { cd: 0, max: 15, dur: 0.1, active: 0 },
    };
    this.damageMul = 1; this.fireRateMul = 1; this.bulletSpeedMul = 1;
  }
  update(dt, game) {
    // 技能 CD
    for (const k in this.skills) {
      const s = this.skills[k];
      if (s.cd > 0) s.cd = Math.max(0, s.cd - dt);
      if (s.active > 0) s.active -= dt;
    }
    if (this.invuln > 0) this.invuln -= dt;
    // 护盾回复
    if (this.shield < this.maxShield) this.shield = Math.min(this.maxShield, this.shield + 2 * dt);

    const input = game.input;
    // 移动
    let mx = 0, my = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) my -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) my += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1;
    if (mx || my) {
      const len = Math.hypot(mx, my); mx /= len; my /= len;
      const dashMul = this.skills.dash.active > 0 ? 2.8 : 1;
      this.tryMove(mx * this.speed * dashMul * dt, my * this.speed * dashMul * dt, game);
      // 车身角度朝向移动方向
      this.angle = Math.atan2(my, mx);
      if (this.skills.dash.active > 0) game.particles.trail(this.x, this.y, '#00e5ff');
    }
    // 炮塔跟随鼠标
    const tx = input.mouse.x, ty = input.mouse.y;
    const target = Math.atan2(ty - this.y, tx - this.x);
    let diff = target - this.turretAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.turretAngle += Math.sign(diff) * Math.min(Math.abs(diff), this.turretRotSpeed * dt);

    // 射击
    this.fireCooldown -= dt;
    if (input.mouse.down && this.fireCooldown <= 0) {
      const w = WEAPONS[this.weapons[this.currentWeapon]];
      this.fireCooldown = 1 / (w.fireRate * this.fireRateMul);
      fireWeapon(game, this, this.weapons[this.currentWeapon]);
    }

    // 切换武器
    if (input.consumePressed('Digit1')) this.currentWeapon = 0;
    if (input.consumePressed('Digit2')) this.currentWeapon = 1;
    if (input.consumePressed('Digit3')) this.currentWeapon = 2;

    // 技能
    if (input.consumePressed('ShiftLeft') || input.consumePressed('ShiftRight')) this._cast('dash', game);
    if (input.consumePressed('KeyQ')) this._cast('shield', game);
    if (input.consumePressed('KeyE')) this._cast('emp', game);
  }
  _cast(skill, game) {
    const s = this.skills[skill];
    if (s.cd > 0) return;
    s.cd = s.max; s.active = s.dur;
    if (skill === 'dash') { this.invuln = Math.max(this.invuln, 0.3); game.audio.shield(); }
    if (skill === 'shield') { this.shield = this.maxShield; this.invuln = Math.max(this.invuln, 0.5); game.audio.shield(); game.particles.burst(this.x, this.y, 20, { color: '#ff2bd6', speed: 150, life: 0.5 }); }
    if (skill === 'emp') {
      game.audio.emp(); game.shake(8);
      game.particles.burst(this.x, this.y, 40, { color: '#3bffe0', speed: 350, life: 0.5 });
      for (const e of game.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - this.x, e.y - this.y) < 260) {
          e.stun = 2; e.takeDamage(30, game);
        }
      }
    }
  }
  gainExp(amt, game) {
    this.exp += amt;
    while (this.exp >= this.expNext) {
      this.exp -= this.expNext;
      this.level++;
      this.expNext = Math.floor(this.expNext * 1.5 + 5);
      game.onLevelUp();
    }
  }
  render(ctx) {
    drawTank(ctx, this);
    // 护盾
    if (this.shield > 0 || this.skills.shield.active > 0) {
      ctx.strokeStyle = `rgba(255,43,214,${0.4 + 0.3 * Math.sin(performance.now() / 100)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size + 6, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.invuln > 0) {
      ctx.strokeStyle = `rgba(0,229,255,${0.6})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size + 4, 0, Math.PI * 2); ctx.stroke();
    }
  }
}

// 敌人坦克
class EnemyTank extends Tank {
  constructor(x, y, type = 'scout') {
    const defs = {
      scout:   { hp: 30, speed: 110, damage: 8, score: 10, color: '#ff2bd6', size: 16, fireRate: 1.2, bulletSpeed: 420 },
      heavy:   { hp: 130, speed: 55, damage: 18, score: 30, color: '#ff6b00', size: 22, fireRate: 0.8, bulletSpeed: 480 },
      sniper:  { hp: 60, speed: 70, damage: 28, score: 25, color: '#ff3b3b', size: 18, fireRate: 0.5, bulletSpeed: 700 },
      bomber:  { hp: 25, speed: 130, damage: 40, score: 20, color: '#ffaa00', size: 15, fireRate: 0, bulletSpeed: 0, suicide: true },
    };
    const d = defs[type] || defs.scout;
    super(x, y, { hp: d.hp, speed: d.speed, color: d.color, size: d.size });
    this.type = type; this.def = d; this.score = d.score;
    this.aiState = 'chase'; this.aiTimer = 0; this.stun = 0;
    this.bulletColor = d.color;
  }
  update(dt, game) {
    if (this.stun > 0) { this.stun -= dt; return; }
    // 卡死自救：因任何原因嵌入墙体时，立即传送到最近空位
    if (game.map.collidesRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2)) {
      const spot = game.findFreeSpot(this.x, this.y, this.size);
      if (spot) { this.x = spot.x; this.y = spot.y; }
    }
    const player = game.player;
    const dx = player.x - this.x, dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);

    // 炮塔转向玩家
    let diff = targetAngle - this.turretAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.turretAngle += Math.sign(diff) * Math.min(Math.abs(diff), 2.5 * dt);
    this.angle = this.turretAngle;

    // 自爆车
    if (this.def.suicide) {
      const nx = (dx / dist) * this.speed * dt;
      const ny = (dy / dist) * this.speed * dt;
      this.tryMove(nx, ny, game);
      if (dist < this.size + player.size + 4) {
        player.takeDamage(this.def.damage, game);
        this.alive = false;
        this.onDeath(game);
      }
      return;
    }

    // 移动：保持距离
    const desired = this.type === 'sniper' ? 380 : 220;
    if (dist > desired + 30) {
      this.tryMove((dx / dist) * this.speed * dt, (dy / dist) * this.speed * dt, game);
    } else if (dist < desired - 30) {
      this.tryMove(-(dx / dist) * this.speed * 0.6 * dt, -(dy / dist) * this.speed * 0.6 * dt, game);
    }

    // 射击
    this.fireCooldown -= dt;
    const aligned = Math.abs(diff) < 0.15;
    if (aligned && this.fireCooldown <= 0 && dist < 600) {
      this.fireCooldown = 1 / this.def.fireRate;
      const b = new Bullet({
        x: this.x + Math.cos(this.turretAngle) * this.size,
        y: this.y + Math.sin(this.turretAngle) * this.size,
        angle: this.turretAngle, speed: this.def.bulletSpeed,
        damage: this.def.damage, size: 5, color: this.bulletColor, owner: this
      });
      game.bullets.push(b);
    }
  }
  onDeath(game) {
    super.onDeath(game);
    game.kills++;
    game.score += this.score;
    game.player.gainExp(this.score, game);
    game.particles.burst(this.x, this.y, 4, { color: '#ffd400', speed: 80, life: 0.5, size: 3 });
    // 随机掉落
    if (Math.random() < 0.18) {
      const types = ['hp', 'shield', 'exp'];
      game.pickups.push(new Pickup(this.x, this.y, types[Math.floor(Math.random() * types.length)]));
    }
  }
  render(ctx) { drawTank(ctx, this); renderHpBar(ctx, this); }
}

// 掉落物
class Pickup extends Entity {
  constructor(x, y, type) {
    super(x, y);
    this.type = type; this.size = 12; this.life = 15; this.bob = 0;
    this.colors = { hp: '#39ff14', shield: '#ff2bd6', exp: '#ffd400' };
  }
  update(dt, game) {
    this.life -= dt; this.bob += dt * 4;
    if (this.life <= 0) this.alive = false;
    const p = game.player;
    if (Math.hypot(p.x - this.x, p.y - this.y) < this.size + p.size) {
      this.alive = false; game.audio.pickup();
      if (this.type === 'hp') p.hp = Math.min(p.maxHp, p.hp + 30);
      if (this.type === 'shield') p.shield = Math.min(p.maxShield, p.shield + 25);
      if (this.type === 'exp') p.gainExp(15, game);
      game.particles.burst(this.x, this.y, 8, { color: this.colors[this.type], speed: 100, life: 0.4 });
    }
  }
  render(ctx) {
    const y = this.y + Math.sin(this.bob) * 3;
    const c = this.colors[this.type];
    ctx.shadowBlur = 12; ctx.shadowColor = c;
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(this.x, y, this.size, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000'; ctx.font = 'bold 12px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const sym = { hp: '+', shield: 'S', exp: '★' }[this.type];
    ctx.fillText(sym, this.x, y + 1);
  }
}

// 通用坦克绘制
function drawTank(ctx, tank) {
  ctx.save();
  ctx.translate(tank.x, tank.y);
  // 履带
  ctx.rotate(tank.angle);
  ctx.fillStyle = '#1a2236';
  ctx.fillRect(-tank.size * 1.1, -tank.size * 0.9, tank.size * 2.2, tank.size * 0.3);
  ctx.fillRect(-tank.size * 1.1, tank.size * 0.6, tank.size * 2.2, tank.size * 0.3);
  // 车身
  ctx.rotate(-tank.angle);
  ctx.shadowBlur = 14; ctx.shadowColor = tank.color;
  ctx.fillStyle = '#0e1524';
  roundRect(ctx, -tank.size * 0.85, -tank.size * 0.7, tank.size * 1.7, tank.size * 1.4, 5);
  ctx.fill();
  ctx.strokeStyle = tank.color; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.shadowBlur = 0;
  // 炮塔
  ctx.rotate(tank.turretAngle);
  ctx.fillStyle = '#16203a';
  ctx.beginPath(); ctx.arc(0, 0, tank.size * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = tank.color; ctx.lineWidth = 1.5; ctx.stroke();
  // 炮管
  ctx.fillStyle = tank.color;
  ctx.shadowBlur = 8; ctx.shadowColor = tank.color;
  ctx.fillRect(0, -3, tank.size * 1.1, 6);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function renderHpBar(ctx, tank) {
  if (tank.hp >= tank.maxHp) return;
  const w = tank.size * 1.8, h = 4;
  const x = tank.x - w / 2, y = tank.y - tank.size - 10;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ff3b6b'; ctx.fillRect(x, y, w * (tank.hp / tank.maxHp), h);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

window.Entity = Entity;
window.Bullet = Bullet;
window.Tank = Tank;
window.PlayerTank = PlayerTank;
window.EnemyTank = EnemyTank;
window.Pickup = Pickup;
window.drawTank = drawTank;
window.renderHpBar = renderHpBar;
