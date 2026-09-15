// UI 管理：菜单、HUD 更新、升级选项
class UI {
  constructor(game) {
    this.game = game;
    this.$ = (id) => document.getElementById(id);
    this.init();
  }
  init() {
    // 主菜单按钮
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => this.game.start(btn.dataset.mode));
    });
    this.$('howtoBtn').addEventListener('click', () => { this.$('howtoModal').classList.remove('hidden'); this.$('howtoModal').classList.add('flex'); });
    this.$('closeHowto').addEventListener('click', () => { this.$('howtoModal').classList.add('hidden'); this.$('howtoModal').classList.remove('flex'); });
    this.$('resumeBtn').addEventListener('click', () => this.game.resume());
    this.$('quitBtn').addEventListener('click', () => this.game.quitToMenu());
    this.$('retryBtn').addEventListener('click', () => this.game.start(this.game.mode));
    this.$('menuBtn').addEventListener('click', () => this.game.quitToMenu());
    // 设置
    this.$('settingsBtn').addEventListener('click', () => this.openSettings());
    this.$('hudSettingsBtn').addEventListener('click', () => this.openSettings());
    this.$('resumeGameBtn').addEventListener('click', () => this.closeSettings());
    this.$('quitToMenuBtn').addEventListener('click', () => { this.closeSettings(); this.game.quitToMenu(); });

    if (window.lucide) lucide.createIcons();
  }

  openSettings() {
    // 游戏中打开则先暂停（不显示暂停菜单，避免叠加）
    if (this.game.state === 'playing') this.game.state = 'paused';
    const m = this.$('settingsMenu');
    m.classList.remove('hidden'); m.classList.add('flex');
  }
  closeSettings() {
    const m = this.$('settingsMenu');
    m.classList.add('hidden'); m.classList.remove('flex');
    // 从游戏中进入且仍在暂停态 → 恢复游戏
    if (this.game.state === 'paused') {
      this.game.state = 'playing';
      this.game._lastTs = performance.now();
    }
  }

  showMenu() {
    this.$('mainMenu').classList.remove('hidden');
    this.$('hud').classList.add('hidden');
    this.$('pauseMenu').classList.add('hidden');
    this.$('pauseMenu').classList.remove('flex');
    this.$('resultMenu').classList.add('hidden');
    this.$('resultMenu').classList.remove('flex');
    this.$('upgradeMenu').classList.add('hidden');
    this.$('upgradeMenu').classList.remove('flex');
  }
  showHud() {
    this.$('mainMenu').classList.add('hidden');
    this.$('hud').classList.remove('hidden');
    this.buildWeaponSlots();
    this.buildSkillSlots();
  }
  togglePause(paused) {
    const m = this.$('pauseMenu');
    if (paused) { m.classList.remove('hidden'); m.classList.add('flex'); }
    else { m.classList.add('hidden'); m.classList.remove('flex'); }
  }
  showResult(victory, stats) {
    const r = this.$('resultMenu');
    r.classList.remove('hidden'); r.classList.add('flex');
    const t = this.$('resultTitle');
    t.textContent = victory ? 'VICTORY' : 'DEFEAT';
    t.style.color = victory ? '#00e5ff' : '#ff2bd6';
    t.style.textShadow = `0 0 30px ${victory ? 'rgba(0,229,255,0.6)' : 'rgba(255,43,214,0.6)'}`;
    this.$('statKills').textContent = stats.kills;
    this.$('statTime').textContent = Math.floor(stats.time) + 's';
    this.$('statWave').textContent = stats.wave;
    this.$('statScore').textContent = stats.score;
  }

  showUpgrade(options, onPick) {
    const wrap = this.$('upgradeOptions');
    wrap.innerHTML = '';
    options.forEach(opt => {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <div class="uc-icon"><i data-lucide="${opt.icon}" style="width:24px;height:24px;"></i></div>
        <div class="uc-name">${opt.name}</div>
        <div class="uc-desc">${opt.desc}</div>`;
      card.addEventListener('click', () => onPick(opt));
      wrap.appendChild(card);
    });
    if (window.lucide) lucide.createIcons();
    const m = this.$('upgradeMenu');
    m.classList.remove('hidden'); m.classList.add('flex');
  }
  hideUpgrade() {
    const m = this.$('upgradeMenu');
    m.classList.add('hidden'); m.classList.remove('flex');
  }

  buildWeaponSlots() {
    const wrap = this.$('weaponSlots');
    wrap.innerHTML = '';
    this.game.player.weapons.forEach((key, i) => {
      const w = WEAPONS[key];
      const slot = document.createElement('div');
      slot.className = 'weapon-slot' + (i === this.game.player.currentWeapon ? ' active' : '');
      slot.innerHTML = `<span class="wk">${i + 1}</span><span class="wn">${w.name}</span>`;
      slot.addEventListener('click', () => { this.game.player.currentWeapon = i; this.updateWeaponSlots(); });
      wrap.appendChild(slot);
    });
  }
  updateWeaponSlots() {
    document.querySelectorAll('.weapon-slot').forEach((s, i) => {
      s.classList.toggle('active', i === this.game.player.currentWeapon);
    });
  }
  buildSkillSlots() {
    const wrap = this.$('skillSlots');
    wrap.innerHTML = '';
    const skills = [
      { key: 'shift', icon: 'wind', name: '冲刺' },
      { key: 'q', icon: 'shield', name: '护盾' },
      { key: 'e', icon: 'zap', name: 'EMP' },
    ];
    skills.forEach(s => {
      const slot = document.createElement('div');
      slot.className = 'skill-slot';
      slot.dataset.skill = s.name;
      slot.innerHTML = `<span class="sk-key">${s.key.toUpperCase()}</span><i data-lucide="${s.icon}" style="width:22px;height:22px;"></i><div class="skill-cd" style="display:none;"></div>`;
      wrap.appendChild(slot);
    });
    if (window.lucide) lucide.createIcons();
  }

  updateHud() {
    const p = this.game.player;
    this.$('hpBar').style.width = (p.hp / p.maxHp * 100) + '%';
    this.$('hpText').textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
    this.$('shieldBar').style.width = (p.maxShield > 0 ? p.shield / p.maxShield * 100 : 0) + '%';
    this.$('shieldText').textContent = `${Math.ceil(p.shield)}/${p.maxShield}`;
    this.$('expBar').style.width = (p.exp / p.expNext * 100) + '%';
    this.$('expText').textContent = `${p.exp}/${p.expNext}`;
    this.$('lvText').textContent = p.level;
    this.$('scoreText').textContent = this.game.score;
    this.$('waveText').textContent = `${this.game.wave} / ${this.game.maxWaves}`;
    this.$('enemyCount').textContent = `敌: ${this.game.enemies.filter(e => e.alive).length}`;

    // 基地血条
    if (this.game.mode === 'defense') {
      this.$('baseHpWrap').classList.remove('hidden');
      const bh = this.game.map.baseHp;
      this.$('baseHpBar').style.width = (bh / this.game.map.baseMaxHp * 100) + '%';
      this.$('baseHpText').textContent = `${Math.ceil(bh)}/${this.game.map.baseMaxHp}`;
    } else {
      this.$('baseHpWrap').classList.add('hidden');
    }

    // 技能 CD
    const skillMap = { '冲刺': 'dash', '护盾': 'shield', 'EMP': 'emp' };
    document.querySelectorAll('.skill-slot').forEach(s => {
      const k = skillMap[s.dataset.skill];
      const sk = p.skills[k];
      const cdEl = s.querySelector('.skill-cd');
      if (sk.cd > 0) {
        s.classList.remove('ready');
        cdEl.style.display = 'flex';
        cdEl.textContent = sk.cd.toFixed(1);
      } else {
        s.classList.add('ready');
        cdEl.style.display = 'none';
      }
    });
  }

  announceWave(n) {
    const a = this.$('waveAnnounce');
    this.$('waveAnnounceNum').textContent = String(n).padStart(2, '0');
    a.style.opacity = '1';
    setTimeout(() => { a.style.opacity = '0'; }, 1800);
  }
}
window.UI = UI;
