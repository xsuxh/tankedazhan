// 武器定义
const WEAPONS = {
  cannon: {
    name: '主炮', key: '1', fireRate: 3, damage: 25, bulletSpeed: 620, pierce: 0,
    bulletSize: 6, color: '#00e5ff', spread: 0, pellets: 1, heavy: false,
    desc: '平衡高爆弹'
  },
  shotgun: {
    name: '散射', key: '2', fireRate: 1.6, damage: 14, bulletSpeed: 560, pierce: 0,
    bulletSize: 5, color: '#ffd400', spread: 0.35, pellets: 5, heavy: false,
    desc: '扇形多发爆发'
  },
  missile: {
    name: '导弹', key: '3', fireRate: 1.0, damage: 55, bulletSpeed: 420, pierce: 0,
    bulletSize: 8, color: '#ff6b00', spread: 0, pellets: 1, heavy: true, homing: true,
    desc: '追踪高爆范围伤害'
  },
  laser: {
    name: '激光', key: '4', fireRate: 12, damage: 9, bulletSpeed: 1400, pierce: 5,
    bulletSize: 3, color: '#ff2bd6', spread: 0, pellets: 1, heavy: false,
    desc: '高穿透持续光束'
  },
};

function fireWeapon(game, tank, weaponKey) {
  const w = WEAPONS[weaponKey];
  if (!w) return;
  const angle = tank.turretAngle;
  const ox = Math.cos(angle) * (tank.size * 0.7);
  const oy = Math.sin(angle) * (tank.size * 0.7);
  for (let i = 0; i < w.pellets; i++) {
    const a = angle + (w.pellets > 1 ? (i - (w.pellets - 1) / 2) * w.spread : 0) + (Math.random() - 0.5) * w.spread * 0.3;
    const b = new Bullet({
      x: tank.x + ox, y: tank.y + oy,
      angle: a, speed: w.bulletSpeed, damage: w.damage * tank.damageMul,
      pierce: w.pierce, size: w.bulletSize, color: w.color,
      owner: tank, heavy: w.heavy, homing: w.homing
    });
    game.bullets.push(b);
  }
  if (weaponKey === 'laser') game.audio.laser();
  else if (weaponKey === 'missile') game.audio.shoot();
  else game.audio.shoot();
  // 枪口火花
  game.particles.burst(tank.x + ox, tank.y + oy, 6, { color: w.color, speed: 120, life: 0.2, size: 2.5 });
}

window.WEAPONS = WEAPONS;
window.fireWeapon = fireWeapon;
