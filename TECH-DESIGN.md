# 科幻坦克大战 · 技术设计文档（Tech Design Doc）

> 目标读者：Solo Builder（单工程师全栈实现）。本文档给出可直接落地的架构、模块拆分、数据结构与伪代码，避免模糊描述。
> 项目代号：**TANK:NEXUS**
> 文档版本：v0.1（待你优化后交给 Builder 生成代码）

---

## 0. 一句话定位

一款 **科幻风格、多玩法融合、带 BOSS 战** 的俯视角坦克大战网页小游戏，融合《坦克大战》(Battle City) 的防线守护 + 《Brawl Stars/坦克世界》式的技能武器系统 + 《吸血鬼幸存者》式的波次升级 + 大型 BOSS 战。

---

## 1. 核心玩法循环（Core Loop）

```
选关/开局 → 驾驶坦克 → 击杀敌人→ 拾取掉落 → 升级武器/技能
   ↑                                          ↓
   └──── 守家/推进 ──── 波次推进/BOSS 出现 ────┘
            ↓
       胜利/失败 → 结算 → 再来一局
```

**单局时长**：5–12 分钟（普通关 5–7 分钟，BOSS 关 8–12 分钟）。

---

## 2. 技术栈（Builder 友好，单文件可跑）

| 层 | 选型 | 理由 |
|----|------|------|
| 渲染 | **HTML5 Canvas 2D** | 无需 3D 引擎，俯视角 2D 性能足够，Solo Builder 零学习成本 |
| 语言 | 原生 **JavaScript (ES2020+)** | 不引入 TS/框架，减少构建链路 |
| 样式 | Tailwind CSS (CDN) | UI 快速美化，科技风 |
| 音效 | Web Audio API（可选 Howler.js CDN） | 合成音 + 少量 mp3，避免外部素材依赖 |
| 字体 | Google Fonts: `Orbitron`（科技标题）+ `Rajdhani`（正文） | 免费 CDN |
| 图标 | Lucide Icons (CDN) | UI 图标 |
| 构建 | 无构建，`index.html` 直接打开或 `python -m http.server` | 极速交付 |

> 若 Builder 偏好工程化，可改为 Vite + 原生 TS，但**优先零构建版本**以降低出错率。

---

## 3. 游戏模式（多玩法融合）

### 3.1 模式一：防线守护（Defense）—— 致敬 Battle City
- 地图中心/底部有 **基地核心**（NEXUS Core），血量条
- 敌人从地图边缘多路涌入，目标是摧毁核心
- 玩家消灭敌人、保护核心，撑过 N 波即胜利
- 地图含 **可破坏砖墙**、**不可破坏钢墙**、**草丛（隐身）**、**水域（减速）**

### 3.2 模式二：波次生存（Surge）—— 致敬 Vampire Survivors
- 无基地，无限波次，敌人强度递增
- 击杀掉落 **经验晶体**，升级后三选一强化（武器/被动/属性）
- 目标是活得越久分数越高

### 3.3 模式三：BOSS 猎杀（Boss Hunt）
- 大型 BOSS 战，分阶段（Phase 1/2/3）
- BOSS 有多种攻击模式：追踪导弹、激光扫射、召唤小怪、护盾阶段
- 地图有掩体，需打 BOSS 弱点（核心暴露时才能造成伤害）

### 3.4 模式四：竞速突破（Rush）—— 可选
- 限时内摧毁指定数量目标点，类似占点/竞速

> Builder 首版只实现 **模式一（防线守护）+ 模式三（BOSS）**，其他作为后续扩展。

---

## 4. 操控（Controls）

| 操作 | 键盘 | 手柄（可选） |
|------|------|-------------|
| 移动 | `WASD` / 方向键 | 左摇杆 |
| 瞄准/炮塔旋转 | 鼠标移动 | 右摇杆 |
| 主炮射击 | 鼠标左键 / `空格` | RT |
| 技能 1（冲刺） | `Shift` / 右键 | LB |
| 技能 2（大招） | `Q` / `E` | LT |
| 切换武器 | `1` `2` `3` | X/Y/B |
| 暂停 | `ESC` / `P` | Start |

**移动与炮塔分离**：履带移动方向 = WASD；炮塔跟随鼠标独立旋转（坦克世界式），增加操作深度。

---

## 5. 玩家坦克系统

### 5.1 坦克属性
```
hp, maxHp          生命
shield, maxShield  护盾（优先扣护盾）
speed              移动速度
rotSpeed           车身转向速度
turretRotSpeed     炮塔转向速度
fireRate           射速（发/秒）
damage             炮弹伤害
bulletSpeed        弹速
pierce             穿透次数
critChance, critDmg  暴击
```

### 5.2 武器系统（3 槽位，可切换）
| 武器 | 描述 | 特性 |
|------|------|------|
| **主炮 Cannon** | 标准高爆弹 | 平衡，可升级分裂弹 |
| **激光 Laser** | 持续光束 | 高 DPS，需预热，可穿透 |
| **导弹 Missile** | 追踪导弹 | 低射速高伤，范围爆炸 |
| **散射 Shotgun** | 扇形多发 | 近距离爆发 |
| **电弧 Tesla** | 链式闪电 | 自动链附近敌人 |

### 5.3 技能（主动技能，有 CD）
- **冲刺 Boost**：短距离位移 + 短暂无敌
- **能量护盾 Shield**：3 秒无敌护盾
- **电磁脉冲 EMP**：范围麻痹敌人 2 秒
- **空袭 Airstrike**：指定区域召唤轰炸

### 5.4 被动升级（三选一，类似 Vampire Survivors）
- 伤害 +20% / 射速 +15% / 弹速 +25%
- 穿透 +1 / 弹体 +2（多发）
- 血量上限 +50 / 护盾上限 +30
- 移速 +10% / 炮塔转速 +20%
- 暴击率 +10% / 暴击伤害 +50%

---

## 6. 敌人与 BOSS

### 6.1 普通敌人类型
| 敌人 | 行为 | 威胁 |
|------|------|------|
| **侦察坦克 Scout** | 高速低血，撞击玩家 | 低 |
| **主战坦克 Heavy** | 慢速高血，直射炮弹 | 中 |
| **狙击坦克 Sniper** | 远距离高伤激光瞄准 | 中高 |
| **护盾坦克 Shield** | 正面护盾，需绕后 | 高 |
| **自爆车 Bomber** | 冲向玩家自爆 AOE | 高 |
| **无人机 Drone** | 空中，需对空武器 | 中 |

### 6.2 BOSS 设计（以「钢铁巨像 IRON COLOSSUS」为例）

**三阶段**：

**Phase 1（血量 100%–66%）**：
- 双管主炮轮流射击（扇形弹幕）
- 召唤 2 波侦察坦克

**Phase 2（血量 66%–33%）**：
- 展开护盾，**只有核心暴露窗口（每 8 秒暴露 2 秒）才能造成伤害**
- 发射追踪导弹群
- 激光扫射（屏幕扇形红区预警 → 实弹）

**Phase 3（血量 33%–0%）**：
- 狂暴，移速+50%，攻击频率翻倍
- 全屏弹幕（子弹地狱）
- 召唤自爆车群

**BOSS 弱点**：胸口核心，暴露时发光，攻击弱点造成 3 倍伤害。

---

## 7. 地图与关卡

### 7.1 地图元素（Tile 网格，每格 32px）
| Tile | 类型 | 交互 |
|------|------|------|
| 空地 | 0 | 可通行 |
| 砖墙 | 1 | 可破坏，阻挡炮弹 |
| 钢墙 | 2 | 不可破坏（升级炮弹可破） |
| 草丛 | 3 | 玩家隐身，炮弹可穿 |
| 水域 | 4 | 坦克减速 50%，炮弹可穿 |
| 基地 | 5 | 守护目标，摧毁则失败 |
| 传送门 | 6 | BOSS 关出现 |

### 7.2 关卡结构
- 普通关：10–15 波敌人，波次间 3 秒准备
- BOSS 关：清完小怪后 BOSS 登场

### 7.3 掉落物
- 经验晶体（升级用）
- 血包（回复 HP）
- 护盾电池（回复护盾）
- 武器升级卡（临时强化）
- 金币（结算分数）

---

## 8. 科幻视觉风格（美术规范）

### 8.1 配色
```
背景深空：  #05070d
网格地面：  #0d1320 / #101a2e 交错
霓虹青：    #00e5ff  （玩家、UI 主色）
霓虹品红：  #ff2bd6  （敌人、警告）
霓虹黄：    #ffd400  （拾取物）
霓虹绿：    #39ff14  （友军/血条）
钢蓝灰：    #2a3a52  （墙体）
```

### 8.2 视觉特效（Canvas 绘制，非图片）
- **粒子系统**：爆炸、拖尾、命中火花
- **屏幕震动**：受击/爆炸
- **辉光（Glow）**：用 `shadowBlur` 实现霓虹发光
- **扫描线**：全屏半透明横线（CRT 感）
- **故障（Glitch）**：BOSS 登场/受击时画面 RGB 错位
- **子弹拖尾**：激光/导弹拖尾

### 8.3 坦克绘制（程序化，无图片素材）
- 车身：圆角矩形 + 履带纹理（用线条绘制）
- 炮塔：圆形/六边形 + 炮管
- 玩家：霓虹青描边 + 发光
- 敌人：霓虹品红/红描边
- 所有坦克用 Canvas path 绘制，Builder 无需图片素材

### 8.4 UI 风格
- 全透明毛玻璃面板（`backdrop-filter: blur`）
- 等宽字体数据（HP/弹药/分数）
- 角标装饰（科幻 HUD 四角线框）
- 血条分段 + 数字

---

## 9. 技术架构（模块拆分）

### 9.1 目录结构（单 HTML 内嵌版本，推荐）
```
index.html              ← 入口，含所有 <script> 标签
css/
  style.css             ← Tailwind + 自定义 HUD 样式
js/
  main.js               ← 启动、资源加载、游戏循环
  game.js               ← Game 主类（状态机、循环）
  input.js              ← 键盘/鼠标输入管理
  renderer.js           ← Canvas 渲染器（背景/实体/HUD）
  entities.js           ← 实体基类 + 坦克/子弹/敌人/掉落物
  weapons.js            ← 武器定义与发射逻辑
  boss.js               ← BOSS 行为与阶段
  map.js                ← 地图网格、碰撞、寻路
  particles.js          ← 粒子系统
  audio.js              ← Web Audio 合成音效
  ui.js                 ← 菜单/HUD/结算 DOM 操作
  data/
    levels.json         ← 关卡数据
    weapons.json        ← 武器数值
    enemies.json        ← 敌人数值
```

> Solo Builder 可全部内联到一个 `index.html` 中（用 `<script type="module">` 或多个 `<script>`），减少文件数量。

### 9.2 核心类图（伪代码）

```js
class Game {
  state: 'menu' | 'playing' | 'paused' | 'gameover' | 'victory'
  entities: Entity[]
  player: PlayerTank
  map: GameMap
  wave: number
  score: number
  loop()  // requestAnimationFrame，dt 驱动
  spawnEnemy(type)
  addEntity(e)
  removeEntity(e)
}

class Entity {
  x, y, w, h, angle, hp, alive
  update(dt, game)
  render(ctx)
  onCollide(other)
}

class Tank extends Entity {
  turretAngle
  weapons: Weapon[]
  fire()
  move(dir, dt)
}

class Bullet extends Entity {
  vx, vy, damage, pierce, owner
}

class EnemyTank extends Tank {
  ai: AIState   // patrol / chase / attack
  updateAI(dt, player, map)
}

class Boss extends EnemyTank {
  phase: 1|2|3
  phaseTimer
  updateBossPattern(dt)
}

class Weapon {
  cooldown, fireRate, damage, bulletSpeed
  fire(tank, targetAngle)
}

class Particle { x, y, vx, vy, life, color, size }
```

### 9.3 游戏循环
```js
function loop(ts) {
  const dt = Math.min((ts - lastTs) / 1000, 0.05)  // 上限防卡顿跳变
  lastTs = ts
  if (game.state === 'playing') {
    input.update()
    game.update(dt)
    collisions.resolve(game.entities)
    game.cleanup()
  }
  renderer.render(game)
  requestAnimationFrame(loop)
}
```

### 9.4 碰撞系统
- **AABB 碰撞**：坦克、墙体（网格对齐，O(1) 空间哈希）
- **圆形碰撞**：子弹与坦克（距离判定）
- **空间分区**：将地图划分为 64px 网格，只检测相邻格，避免 O(n²)

### 9.5 敌人 AI（状态机）
```
PATROL → 发现玩家 → CHASE → 进入射程 → ATTACK
  ↑                                        ↓
  └──────── 失去视野/玩家死亡 ←────────────┘
```
- 寻路：简单 A* 或「朝玩家方向 + 避障」（Solo Builder 推荐后者，足够）
- 射击：进入射程且炮塔对准玩家时开火

---

## 10. UI / 屏幕流程

```
[主菜单] → [模式选择] → [关卡/难度选择] → [游戏中] → [结算]
   ↑                                              ↓
   └──────────────── [再来一局/返回菜单] ──────────┘
```

### 10.1 主菜单
- 大标题 TANK:NEXUS（霓虹发光 + 故障动画）
- 开始游戏 / 模式选择 / 操作说明 / 设置（音量）
- 背景：动态星空 + 旋转的坦克剪影

### 10.2 游戏中 HUD
- 左上：HP 条 + 护盾条 + 等级 + 经验条
- 右上：分数 + 波次 + 剩余敌人数
- 底部：武器槽（1/2/3）+ 技能 CD 图标
- 中心：准星（跟随鼠标）
- 基地血量（守护模式）：屏幕顶部中央

### 10.3 结算
- 胜利/失败大字
- 击杀数、存活时间、得分、最高波次
- 再来一局 / 返回菜单

---

## 11. 数据结构示例

### 11.1 武器数据
```json
{
  "cannon": {
    "name": "主炮",
    "fireRate": 3,
    "damage": 25,
    "bulletSpeed": 600,
    "pierce": 0,
    "bulletSize": 6,
    "color": "#00e5ff"
  },
  "laser": {
    "name": "激光",
    "fireRate": 10,
    "damage": 8,
    "bulletSpeed": 1200,
    "pierce": 99,
    "continuous": true,
    "color": "#ff2bd6"
  }
}
```

### 11.2 敌人数据
```json
{
  "scout": { "hp": 30, "speed": 120, "damage": 10, "score": 10, "color": "#ff2bd6" },
  "heavy": { "hp": 120, "speed": 50, "damage": 20, "score": 30, "color": "#ff6b00" }
}
```

### 11.3 关卡数据
```json
{
  "level1": {
    "mode": "defense",
    "waves": [
      { "delay": 0, "enemies": [["scout", 5]] },
      { "delay": 15, "enemies": [["scout", 4], ["heavy", 2]] }
    ],
    "map": "level1.tmx"
  }
}
```

---

## 12. 音效（Web Audio 合成，无素材）

用 OscillatorNode + GainNode 合成：
- 射击：方波短促下降
- 爆炸：白噪声 + 低通滤波衰减
- 升级：正弦波上升琶音
- 受击：锯齿波短促
- BOSS 登场：低频 drone + 上升扫频

> Builder 也可用免费音效包（如 freesound.org），但合成版零依赖。

---

## 13. 性能与兼容

- **目标 60 FPS**：实体数控制在 200 以内，粒子数控制在 500 以内
- **Canvas 优化**：离屏 canvas 缓存地图背景，只重绘动态层
- **粒子池化**：Particle 对象复用，避免 GC
- **DPR 适配**：`canvas.width = clientWidth * dpr`，上限 2
- **移动端**：触控摇杆 + 自动射击（可选适配，首版可不做）

---

## 14. 实现路线图（分阶段交付）

### Phase 1 — 核心可玩（1–2 天）
- [ ] 项目骨架 + 游戏循环 + 输入
- [ ] 玩家坦克（移动、炮塔跟随鼠标、射击）
- [ ] 地图网格 + 碰撞
- [ ] 1 种敌人（Scout）+ AI
- [ ] 子弹 + 爆炸粒子
- [ ] HUD（血条、分数）

### Phase 2 — 玩法丰富（2–3 天）
- [ ] 波次系统 + 基地守护
- [ ] 3 种武器切换
- [ ] 掉落物 + 升级系统
- [ ] 3 种敌人类型
- [ ] 菜单 + 结算 + 暂停

### Phase 3 — BOSS 与特效（2–3 天）
- [ ] BOSS 三阶段 + 弱点机制
- [ ] 技能系统（冲刺/护盾/EMP）
- [ ] 高级特效（屏幕震动、故障、辉光）
- [ ] 音效合成

### Phase 4 — 打磨（1–2 天）
- [ ] 科幻 UI 美化
- [ ] 难度曲线调参
- [ ] 性能优化
- [ ] 移动端适配（可选）

---

## 15. Builder 交付检查清单

- [ ] `index.html` 双击可直接运行（或 http-server）
- [ ] 主菜单 → 游戏 → 结算 流程完整
- [ ] WASD 移动、鼠标瞄准、左键射击正常
- [ ] 至少 3 种敌人 + 1 个 BOSS
- [ ] 至少 3 种武器可切换
- [ ] 升级三选一系统
- [ ] 基地守护模式可通关/失败
- [ ] BOSS 战有阶段变化与弱点
- [ ] 科幻视觉风格（霓虹、辉光、粒子）
- [ ] 无外部素材依赖（程序化绘制 + 合成音效）
- [ ] 60 FPS（中端机器）

---

## 16. 风险与简化方案

| 风险 | 简化方案 |
|------|---------|
| A* 寻路复杂 | 用「朝玩家方向 + 简单避障」即可 |
| BOSS 弹幕地狱难做 | 先做直线弹幕 + 追踪弹，环形弹幕留后期 |
| 武器平衡难调 | 数值给范围，Builder 自行微调 |
| 移动端适配 | 首版只做 PC，移动端后续 |
| 音效素材缺失 | 全部 Web Audio 合成 |

---

## 附录 A：参考游戏机制来源

- 《Battle City》(FC) — 防线守护、可破坏墙
- 《坦克世界》— 车身/炮塔分离、弱点机制
- 《Vampire Survivors》— 三选一升级、波次生存
- 《Brawl Stars》— 技能系统、掩体作战
- 《Enter the Gungeon》— 弹幕躲避、翻滚无敌
- 《DOOM Eternal》— BOSS 阶段、弱点暴露窗口

---

*文档结束。请在此基础上优化后交给 Builder。*
