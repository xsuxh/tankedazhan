// BOSS：钢铁巨像 IRON COLOSSUS — 三阶段
class Boss extends Tank {
  constructor(x, y) {
    super(x, y, { hp: 1200, speed: 35, color: '#ff2bd6', size: 46 });
    this.maxHp = 1200;
    this.phase = 1;
    this.patternTimer = 0;
    this.coreExposed = false;
    this.coreTimer = 0;
    this.enraged = false;
    this.attackTimer = 0;
    this.score = 500;
    this.isBoss = true;
  }

  update(dt, game) {
    const player = game.player;
    const dx = player.x - this.x, dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);

    // 炮塔
    let diff = targetAngle - this.turretAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.turretAngle += Math.sign(diff) * Math.min(Math.abs(diff), 1.5 * dt);

    // 阶段切换
    const hpRatio = this.hp / this.maxHp;
    if (hpRatio < 0.66 && this.phase === 1) { this.phase = 2; game.audio.bossWarn(); game.shake(10); }
    if (hpRatio < 0.33 && this.phase === 2) { this.phase = 3; this.enraged = true; game.audio.bossWarn(); game.shake(15); }

    const speedMul = this.enraged ? 1.5 : 1;

    // 缓慢追击
    if (dist > 260) {
      this.tryMove((dx / dist) * this.speed * speedMul * dt, (dy / dist) * this.speed * speedMul * dt, game);
    }
    this.angle = this.turretAngle;

    // 核心暴露循环（Phase 2）
    if (this.phase >= 2) {
      this.coreTimer -= dt;
      if (this.coreTimer <= 0) {
        this.coreExposed = !this.coreExposed;
        this.coreTimer = this.coreExposed ? 2 : 6;
      }
    } else {
      this.coreExposed = false;
    }

    // 攻击模式
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this._attack(game, dist);
      this.attackTimer = this.enraged ? 1.2 : (this.phase === 1 ? 2.2 : 1.8);
    }
  }

  _attack(game, dist) {
    const p = game.player;
    if (this.phase === 1) {
      // 扇形弹幕
      for (let i = -2; i <= 2; i++) {
        const a = this.turretAngle + i * 0.18;
        game.bullets.push(new Bullet({
          x: this.x + Math.cos(a) * this.size, y: this.y + Math.sin(a) * this.size,
          angle: a, speed: 380, damage: 12, size: 6, color: '#ff2bd6', owner: this
        }));
      }
      game.audio.shoot();
      // 召唤侦察兵
      if (Math.random() < 0.3) {
        game.enemies.push(new EnemyTank(this.x + (Math.random() - 0.5) * 80, this.y + 100, 'scout'));
      }
    } else if (this.phase === 2) {
      // 追踪导弹群
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2;
        game.bullets.push(new Bullet({
          x: this.x + Math.cos(a) * this.size, y: this.y + Math.sin(a) * this.size,
          angle: a, speed: 280, damage: 15, size: 7, color: '#ff6b00', owner: this, homing: true
        }));
      }
      game.audio.shoot();
      // 激光扫射（每 3 次攻击一次）
      if (Math.random() < 0.4) {
        const a = this.turretAngle;
        for (let i = -6; i <= 6; i++) {
          game.bullets.push(new Bullet({
            x: this.x, y: this.y,
            angle: a + i * 0.06, speed: 700, damage: 10, size: 4, color: '#ff0040', owner: this, pierce: 2
          }));
        }
      }
    } else {
      // Phase 3：全屏弹幕 + 自爆车
      const n = this.enraged ? 16 : 12;
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = base + (i / n) * Math.PI * 2;
        game.bullets.push(new Bullet({
          x: this.x, y: this.y,
          angle: a, speed: 320, damage: 10, size: 5, color: '#ff2bd6', owner: this
        }));
      }
      game.audio.shoot();
      if (Math.random() < 0.5) {
        game.enemies.push(new EnemyTank(this.x + (Math.random() - 0.5) * 120, this.y + 120, 'bomber'));
      }
    }
  }

  takeDamage(dmg, game) {
    // Phase 2+ 非核心暴露时减伤 80%
    if (this.phase >= 2 && !this.coreExposed) dmg *= 0.2;
    super.takeDamage(dmg, game);
  }

  onDeath(game) {
    game.kills++;
    game.particles.burst(this.x, this.y, 60, { color: '#ff2bd6', speed: 400, life: 1.2 });
    game.particles.burst(this.x, this.y, 40, { color: '#ffd400', speed: 300, life: 1.0 });
    game.audio.explosion();
    game.shake(20);
    game.score += this.score;
    game.player.gainExp(100, game);
    game.onBossDefeated();
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    // 外圈光环
    ctx.strokeStyle = `rgba(255,43,214,${0.3 + 0.2 * Math.sin(performance.now() / 200)})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, this.size + 14, 0, Math.PI * 2); ctx.stroke();
    // 车身
    ctx.rotate(this.angle);
    ctx.fillStyle = '#1a0a1a';
    roundRect(ctx, -this.size, -this.size * 0.8, this.size * 2, this.size * 1.6, 8);
    ctx.fill();
    ctx.strokeStyle = this.color; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.rotate(-this.angle);
    // 炮塔
    ctx.rotate(this.turretAngle);
    ctx.fillStyle = '#2a0a2a';
    ctx.beginPath(); ctx.arc(0, 0, this.size * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.stroke();
    // 双炮管
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10; ctx.shadowColor = this.color;
    ctx.fillRect(0, -this.size * 0.5, this.size * 1.3, 6);
    ctx.fillRect(0, this.size * 0.5 - 6, this.size * 1.3, 6);
    ctx.shadowBlur = 0;
    ctx.restore();

    // 核心（弱点）
    if (this.coreExposed) {
      ctx.fillStyle = `rgba(255,212,0,${0.7 + 0.3 * Math.sin(performance.now() / 80)})`;
      ctx.shadowBlur = 24; ctx.shadowColor = '#ffd400';
      ctx.beginPath(); ctx.arc(this.x, this.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.phase >= 2) {
      // 护盾核心
      ctx.strokeStyle = 'rgba(0,229,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, 10, 0, Math.PI * 2); ctx.stroke();
    }

    // 血条
    const w = 120, h = 6;
    const x = this.x - w / 2, y = this.y - this.size - 24;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#ff2bd6'; ctx.fillRect(x, y, w * (this.hp / this.maxHp), h);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Orbitron'; ctx.textAlign = 'center';
    ctx.fillText(`IRON COLOSSUS  P${this.phase}`, this.x, y - 6);
  }
}
window.Boss = Boss;
