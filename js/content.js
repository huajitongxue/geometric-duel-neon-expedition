export const W = 960;
export const H = 540;
export const WORLD_W = W * 2;
export const WORLD_H = H * 2;

export const ST = Object.freeze({
  TITLE: 'title', CORE_SELECT: 'core-select', BATTLE: 'battle', UPGRADE: 'upgrade',
  REST: 'rest', PRACTICE_CONFIG: 'practice-config', PRACTICE: 'practice',
  HANGAR: 'hangar', CODEX: 'codex', HELP: 'help', PAUSE: 'pause', RESULT: 'result', SETTINGS: 'settings', ACHIEVEMENTS: 'achievements',
  BOSS_RUSH_LOADOUT: 'boss-rush-loadout'
});

export const RARITIES = Object.freeze({
  '白': '#e7f2ff', '绿': '#54f79a', '蓝': '#53b6ff', '紫': '#c778ff', '橙': '#ffab4d', '红': '#ff5f76'
});
export const RARITY_ORDER = Object.freeze(['白', '绿', '蓝', '紫', '橙', '红']);

export const ELEMENTS = Object.freeze({ fire: '#ff7a54', ice: '#7ee8ff', lightning: '#eaa5ff' });

export const CORES = [
  { id: 'square', name: '守序方块', short: '方块', shape: 4, color: '#58d7ff', maxHp: 150, speed: 210, damage: 1, passive: '护盾减伤更高，蛛网范围 +20%', startWeapon: '矢量针' },
  { id: 'triangle', name: '迅影三角', short: '三角', shape: 3, color: '#ff6f9f', maxHp: 108, speed: 258, damage: 1.08, passive: '暴击率 +12%，冲刺留下伤害残影', startWeapon: '碎片扇' },
  { id: 'hex', name: '棱爆六边形', short: '六边形', shape: 6, color: '#b98cff', maxHp: 126, speed: 225, damage: 1.04, passive: '爆炸范围 +25%，范围伤害 +10%', startWeapon: '六角迫击炮' },
  { id: 'orbit', name: '流光圆环', short: '圆环', shape: 0, color: '#70f2d0', maxHp: 112, speed: 242, damage: .9, passive: '命中后有 15% 概率弹射至另一目标', startWeapon: '月相刃环', unlockCost: 60 },
  { id: 'oct', name: '绝境堡垒', short: '八角', shape: 8, color: '#ffca68', maxHp: 196, speed: 166, damage: 1, passive: '护盾期间反射全部敌方子弹', startWeapon: '棱镜切线', unlockCost: 100 }
];

const weapon = (name, rarity, type, damage, rate, speed, price, desc, extra = {}) => ({ name, rarity, type, damage, rate, speed, price, desc, tags: [], element: null, ...extra });

export const WEAPONS = [
  weapon('矢量针', '白', 'line', 15, 5.8, 560, 8, '稳定的高速直线弹', { tags: ['精准'], element: 'ice' }),
  weapon('校准光束', '绿', 'line', 22, 4.6, 640, 12, '稳定的中阶直线射线', { tags: ['精准'], element: 'lightning' }),
  weapon('棱镜长枪', '蓝', 'line', 31, 3.8, 720, 18, '穿过网格的聚焦光束', { tags: ['精准', '穿透'], pierce: 1, element: 'fire' }),
  weapon('极光连线', '紫', 'line', 36, 3.4, 760, 28, '贯通战线的紫色射线', { tags: ['精准', '穿透'], pierce: 2, element: 'ice' }),
  weapon('阳极光矛', '橙', 'line', 44, 3.1, 800, 38, '极速贯穿的阳极光束', { tags: ['精准', '穿透'], pierce: 4, element: 'lightning' }),
  weapon('相消射线', '红', 'line', 58, 2.6, 850, 56, '相位射线穿过一切阻碍，对护盾同样致命', { tags: ['精准', '穿透'], pierce: 8, element: 'fire' }),
  weapon('碎片扇', '白', 'scatter', 7, 2.9, 480, 8, '近距离碎片散射', { tags: ['范围'], pellets: 5 }),
  weapon('棱片喷涂', '绿', 'scatter', 9, 3.0, 500, 12, '稳定的多弹扇面', { tags: ['范围'], pellets: 6, element: 'ice' }),
  weapon('晶簇风暴', '蓝', 'scatter', 11, 2.7, 530, 19, '密集晶簇横扫近处', { tags: ['范围'], pellets: 7, element: 'lightning' }),
  weapon('旋涡霰流', '紫', 'scatter', 13, 3.2, 530, 27, '密集旋转弹幕', { tags: ['范围'], pellets: 8, element: 'lightning' }),
  weapon('向心冲击', '橙', 'scatter', 15, 2.4, 580, 37, '向心收束的广域弹幕', { tags: ['范围'], pellets: 9, element: 'fire' }),
  weapon('湮灭花蕾', '红', 'scatter', 21, 2.1, 620, 55, '绽放成红色的毁灭扇面', { tags: ['范围'], pellets: 11, element: 'fire' }),
  weapon('折光弹', '白', 'homing', 11, 4.6, 380, 8, '入门级折射追踪弹', { tags: ['追踪'], homing: 3.2, element: 'ice' }),
  weapon('轨道脉冲', '绿', 'homing', 13, 4.3, 390, 12, '自动修正轨迹', { tags: ['追踪'], homing: 3.8, element: 'ice' }),
  weapon('导引棱矢', '蓝', 'homing', 19, 4.0, 445, 19, '中阶折射追踪弹', { tags: ['追踪', '精准'], homing: 4.8, element: 'lightning' }),
  weapon('幻轨星群', '紫', 'homing', 25, 3.7, 470, 28, '多重捕捉目标', { tags: ['追踪', '范围'], homing: 5.8, element: 'fire' }),
  weapon('蜂群彗星', '橙', 'homing', 31, 3.4, 500, 34, '高速追踪弹群', { tags: ['追踪', '范围'], homing: 6.5, element: 'fire' }),
  weapon('量子锁定', '红', 'homing', 38, 3.1, 510, 55, '满追踪的量子锁定弹', { tags: ['追踪', '精准'], homing: 7.4, element: 'lightning' }),
  weapon('鱼骨钉', '白', 'pierce', 17, 4.4, 600, 8, '入门级穿透钉刺', { tags: ['穿透'], pierce: 1, element: 'ice' }),
  weapon('六棱阵线', '绿', 'pierce', 20, 4.0, 650, 13, '稳定穿行的六棱阵线', { tags: ['穿透'], pierce: 2, element: 'lightning' }),
  weapon('轨道切割器', '蓝', 'pierce', 24, 3.7, 630, 19, '贯穿排列中的目标', { tags: ['穿透'], pierce: 3, element: 'ice' }),
  weapon('霜线穿刺', '紫', 'pierce', 33, 3.2, 675, 29, '冻结成列的敌人', { tags: ['穿透', '精准'], pierce: 5, element: 'ice' }),
  weapon('维度长矛', '橙', 'pierce', 39, 3.0, 710, 38, '折跃后的重型贯穿', { tags: ['穿透', '精准'], pierce: 7, element: 'lightning' }),
  weapon('相位分界线', '红', 'pierce', 52, 2.8, 700, 52, '相位射线穿过一切阻碍，对护盾与反射敌人同样致命', { tags: ['穿透'], pierce: 99, element: 'fire' }),
  weapon('榴霰弹头', '白', 'explosion', 24, 2.4, 320, 9, '入门范围爆破', { tags: ['范围'], radius: 38, element: 'fire' }),
  weapon('共振力场', '绿', 'explosion', 28, 2.0, 310, 14, '扩张的几何爆破场', { tags: ['范围'], radius: 48, element: 'ice' }),
  weapon('六角迫击炮', '蓝', 'explosion', 34, 2.2, 330, 21, '命中后扩散爆裂', { tags: ['范围'], radius: 52, element: 'fire' }),
  weapon('双向坍缩', '紫', 'explosion', 42, 1.9, 300, 29, '双向扩散的坍缩爆破', { tags: ['范围'], radius: 64, element: 'lightning' }),
  weapon('奇点坍缩器', '橙', 'explosion', 48, 1.7, 300, 37, '巨型几何冲击波', { tags: ['范围'], radius: 70, element: 'lightning' }),
  weapon('星图自毁', '红', 'explosion', 62, 1.6, 290, 58, '红色爆破之王，撕开整片星图', { tags: ['范围'], radius: 95, element: 'fire' }),
  weapon('棱镜薄片', '白', 'bounce', 13, 4.5, 470, 8, '入门边界反弹', { tags: ['反弹'], bounces: 1, element: 'ice' }),
  weapon('镜面圆盘', '绿', 'bounce', 16, 4.1, 490, 13, '在边界间反射', { tags: ['反弹'], bounces: 2, element: 'ice' }),
  weapon('折角轮盘', '蓝', 'bounce', 22, 3.8, 510, 20, '三次折射的几何轮盘', { tags: ['反弹'], bounces: 3, element: 'lightning' }),
  weapon('逆相棱镜', '紫', 'bounce', 28, 3.5, 540, 28, '高次数折射圆盘', { tags: ['反弹', '范围'], bounces: 5, element: 'fire' }),
  weapon('回廊回声', '橙', 'bounce', 33, 3.1, 560, 38, '在回廊中反复折返', { tags: ['反弹', '范围'], bounces: 5, element: 'lightning' }),
  weapon('∞回响晶', '红', 'bounce', 42, 2.6, 610, 56, '九次回响的红色晶体', { tags: ['反弹', '范围'], bounces: 9, element: 'fire' }),
  weapon('静电探针', '白', 'arc', 14, 4.0, 480, 8, '入门级链式电弧', { tags: ['电系'], chains: 1, element: 'lightning' }),
  weapon('伏特晶格', '绿', 'arc', 17, 3.5, 500, 14, '命中后跳跃导电', { tags: ['电系'], chains: 2, element: 'lightning' }),
  weapon('电感网络', '蓝', 'arc', 22, 3.6, 520, 20, '三段传导的电感网络', { tags: ['电系'], chains: 3, element: 'lightning' }),
  weapon('环流彗尾', '紫', 'arc', 28, 3.2, 560, 29, '环流延展的彗星电弧', { tags: ['电系', '范围'], chains: 4, element: 'fire' }),
  weapon('雷暴多边体', '橙', 'arc', 31, 3.0, 540, 35, '延展的电弧链路', { tags: ['电系', '范围'], chains: 5, element: 'lightning' }),
  weapon('球状闪电', '红', 'arc', 38, 2.7, 600, 56, '跳跃七次的球状闪电', { tags: ['电系', '范围'], chains: 7, element: 'lightning' }),
  weapon('迷你分形', '白', 'split', 14, 3.8, 440, 8, '入门递归分裂弹', { tags: ['范围'], splits: 2, element: 'ice' }),
  weapon('二阶递归', '绿', 'split', 17, 3.5, 460, 13, '更深一层的递归裂变', { tags: ['范围'], splits: 3, element: 'lightning' }),
  weapon('雪崩风暴', '蓝', 'split', 22, 3.2, 480, 20, '多重碎片的雪崩扩散', { tags: ['范围'], splits: 4, element: 'ice' }),
  weapon('分形种子', '紫', 'split', 19, 3.4, 460, 29, '消失时递归分裂', { tags: ['范围'], splits: 3, element: 'ice' }),
  weapon('彩窗四溅', '橙', 'split', 28, 2.9, 510, 38, '五向彩窗碎裂', { tags: ['范围'], splits: 5, element: 'fire' }),
  weapon('递归绽放', '红', 'split', 44, 2.8, 500, 54, '递归分裂覆盖战场，暴击与吸血让核心屹立', { tags: ['范围'], splits: 7, element: 'fire' }),
  weapon('聚焦细线', '白', 'laser', 12, 9.0, 0, 9, '入门持续激光', { tags: ['激光', '精准'], beam: 240, element: 'ice' }),
  weapon('光谱回廊', '绿', 'laser', 17, 8.6, 0, 14, '稳定延展的光谱光束', { tags: ['激光', '精准'], beam: 290, element: 'lightning' }),
  weapon('棱镜切线', '蓝', 'laser', 15, 8.2, 0, 23, '持续聚焦的冰晶切线', { tags: ['激光', '精准'], beam: 310, element: 'ice' }),
  weapon('弧光棱柱', '紫', 'laser', 22, 7.8, 0, 29, '弧光折射的长程棱柱', { tags: ['激光', '范围'], beam: 340, element: 'fire' }),
  weapon('双螺旋光刃', '橙', 'laser', 26, 7.4, 0, 38, '双螺旋切割轨迹', { tags: ['激光', '范围'], beam: 365, element: 'lightning' }),
  weapon('日冕裁决', '红', 'laser', 36, 6.4, 0, 56, '灼烧整条轨迹，红色光束的极致输出', { tags: ['激光', '范围'], beam: 420, element: 'fire' }),
  weapon('自动节点', '白', 'turret', 14, 1.6, 0, 9, '入门自动追踪炮台', { tags: ['哨塔', '追踪'], turretLife: 6, element: 'ice' }),
  weapon('浮游节点', '绿', 'turret', 17, 1.8, 0, 16, '部署自动追踪炮台', { tags: ['哨塔', '追踪'], turretLife: 8, element: 'lightning' }),
  weapon('哨戒支柱', '蓝', 'turret', 22, 2.0, 0, 22, '九秒驻场的哨戒火力', { tags: ['哨塔'], turretLife: 9, element: 'ice' }),
  weapon('要塞阵列', '紫', 'turret', 28, 2.2, 0, 30, '延展驻场的要塞阵列', { tags: ['哨塔', '范围'], turretLife: 10, element: 'lightning' }),
  weapon('战争棱塔', '橙', 'turret', 31, 2.4, 0, 39, '重型驻场火力', { tags: ['哨塔', '范围'], turretLife: 11, element: 'fire' }),
  weapon('终末棱堡', '红', 'turret', 38, 2.6, 0, 57, '十四秒终末驻场火力', { tags: ['哨塔', '范围'], turretLife: 14, element: 'fire' }),
  weapon('月牙薄片', '白', 'orbit', 13, 3.5, 0, 8, '入门近身回旋刃', { tags: ['回旋'], orbitCount: 2, element: 'ice' }),
  weapon('锋利环带', '绿', 'orbit', 21, 3.2, 0, 14, '四叶锋利环带', { tags: ['回旋'], orbitCount: 4, element: 'lightning' }),
  weapon('月相刃环', '蓝', 'orbit', 18, 3.2, 0, 22, '环绕核心的冰晶利刃', { tags: ['回旋', '反弹'], orbitCount: 3, element: 'ice' }),
  weapon('万花回旋', '紫', 'orbit', 27, 3.0, 0, 33, '持续切割近身目标', { tags: ['回旋', '范围'], orbitCount: 5, element: 'lightning' }),
  weapon('八叶风车', '橙', 'orbit', 30, 2.7, 0, 39, '六叶风车围绕核心斩击', { tags: ['回旋', '范围'], orbitCount: 6, element: 'fire' }),
  weapon('因果齿轮', '红', 'orbit', 36, 2.4, 0, 58, '八叶因果齿轮持续碾压近身敌人', { tags: ['回旋', '范围'], orbitCount: 8, element: 'lightning' })
];

export const ENEMIES = {
  drone: { id: 'drone', name: '菱形侦察机', color: '#57e89a', hp: 44, speed: 92, damage: 9, radius: 9, kind: 'ranged', cooldown: 1.6, score: 2, sides: 4 },
  charger: { id: 'charger', name: '尖锥冲锋体', color: '#57c9ff', hp: 54, speed: 138, damage: 14, radius: 11, kind: 'charge', cooldown: 2.5, score: 3, sides: 3 },
  tank: { id: 'tank', name: '重构方阵', color: '#ffad62', hp: 145, speed: 54, damage: 19, radius: 15, kind: 'melee', cooldown: 1.1, score: 4, sides: 4 },
  sniper: { id: 'sniper', name: '八角狙击阵', color: '#b785ff', hp: 76, speed: 64, damage: 25, radius: 11, kind: 'sniper', cooldown: 2.3, score: 5, sides: 8 },
  mine: { id: 'mine', name: '星芒自爆体', color: '#ff6380', hp: 30, speed: 126, damage: 36, radius: 8, kind: 'explode', cooldown: .4, score: 3, sides: 10 },
  splitter: { id: 'splitter', name: '裂片母体', color: '#c5f77a', hp: 98, speed: 82, damage: 13, radius: 13, kind: 'split', cooldown: 1, score: 5, sides: 6 },
  shield: { id: 'shield', name: '棱盾卫兵', color: '#61baff', hp: 115, shieldHp: 95, speed: 76, damage: 17, radius: 13, kind: 'shield', cooldown: 1.25, score: 6, sides: 4 },
  summoner: { id: 'summoner', name: '孳生召唤师', color: '#e37cff', hp: 108, speed: 67, damage: 12, radius: 13, kind: 'summon', cooldown: 4.5, score: 7, sides: 5 },
  stealth: { id: 'stealth', name: '相位隐形兵', color: '#9ff7e8', hp: 70, speed: 118, damage: 18, radius: 10, kind: 'stealth', cooldown: 1.35, score: 6, sides: 3 },
  repair: { id: 'repair', name: '自修复兵', color: '#ffdf75', hp: 132, speed: 58, damage: 16, radius: 14, kind: 'repair', cooldown: 1.25, score: 7, sides: 6 },
  reflector: { id: 'reflector', name: '镜反折射体', color: '#ff8fba', hp: 92, speed: 96, damage: 20, radius: 12, kind: 'reflect', cooldown: 1.3, score: 7, sides: 8 },
  boss1: { id: 'boss1', name: '棱镜监察者', color: '#ff73d7', hp: 1050, speed: 72, damage: 22, radius: 27, kind: 'boss1', cooldown: 1.2, score: 30, boss: true, sides: 9 },
  boss2: { id: 'boss2', name: '零点多面体', color: '#ff5e84', hp: 1700, speed: 78, damage: 29, radius: 32, kind: 'boss2', cooldown: .9, score: 50, boss: true, sides: 9 },
  boss3: { id: 'boss3', name: '几何巨像', color: '#f38ae0', hp: 2600, speed: 65, damage: 36, radius: 38, kind: 'boss3', cooldown: .75, score: 78, boss: true, sides: 8 }
};

const chapterOne = [
  [['drone', 4]], [['drone', 3], ['charger', 2]], [['charger', 3], ['tank', 1]],
  [['tank', 2], ['sniper', 1], ['drone', 2]], [['mine', 3], ['splitter', 1], ['drone', 2]],
  [['sniper', 2], ['charger', 3], ['tank', 1]], [['splitter', 2], ['mine', 3], ['drone', 2]],
  [['sniper', 2], ['splitter', 2], ['tank', 2]], [['charger', 4], ['mine', 4], ['splitter', 2]]
];
const chapterTwo = [
  [['shield', 2], ['drone', 3]], [['summoner', 1], ['charger', 3]], [['stealth', 3], ['tank', 2]],
  [['repair', 2], ['sniper', 2]], [['reflector', 2], ['mine', 3], ['shield', 1]],
  [['summoner', 2], ['splitter', 2]], [['stealth', 3], ['charger', 3], ['tank', 1]],
  [['repair', 2], ['reflector', 2], ['sniper', 2]], [['shield', 3], ['summoner', 2], ['mine', 4]]
];
const chapterThree = [
  [['stealth', 4], ['reflector', 2]], [['shield', 3], ['repair', 2]], [['summoner', 2], ['charger', 4]],
  [['tank', 3], ['sniper', 3], ['stealth', 2]], [['reflector', 3], ['mine', 4], ['splitter', 2]],
  [['repair', 3], ['shield', 3], ['summoner', 1]], [['sniper', 3], ['charger', 4], ['stealth', 3]],
  [['reflector', 3], ['splitter', 3], ['tank', 2]], [['shield', 4], ['summoner', 2], ['repair', 2], ['mine', 4]]
];

export const CHAPTERS = [
  { id: 1, name: '网格平原', theme: 'grid', hpMul: 1, waves: chapterOne, boss: 'boss1' },
  { id: 2, name: '零界数据流', theme: 'data', hpMul: 1.38, waves: chapterTwo, boss: 'boss2' },
  { id: 3, name: '晶核深处', theme: 'crystal', hpMul: 1.7, waves: chapterThree, boss: 'boss3' }
];

export const RELICS = [
  { id: 'magnet-core', name: '磁化核心', desc: '拾取范围 +50%', apply: g => g.bonus.magnet *= 1.5 },
  { id: 'overload-capacitor', name: '过载电容', desc: '每第 5 发伤害翻倍', apply: g => { g.bonus.overloadEvery = 5; } },
  { id: 'mirror-shard', name: '镜面碎片', desc: '本局首次致命伤触发反击重构', apply: g => { g.bonus.mirrorRevive = true; } },
  { id: 'time-hourglass', name: '时间沙漏', desc: '冲刺冷却 -30%', apply: g => { g.bonus.dashCd *= .7; } },
  { id: 'greed-prism', name: '贪婪棱镜', desc: '商店价格 -20%', apply: g => { g.bonus.shopDiscount += .2; } },
  { id: 'symbiosis-lattice', name: '共生晶格', desc: '每拥有 1 把武器，伤害 +5%', apply: g => { g.bonus.symbiosis = true; } }
];

export const UPGRADES = [
  { id: 'damage', name: '聚焦折线', desc: '所有伤害 +18%', apply: g => g.bonus.damage *= 1.18 },
  { id: 'rate', name: '高频回路', desc: '射速 +20%', apply: g => g.bonus.fireRate *= 1.2 },
  { id: 'hp', name: '结构扩容', desc: '最大生命 +28，并立即修复', apply: g => { g.player.maxHp += 28; g.player.hp += 28; } },
  { id: 'speed', name: '惯性折返', desc: '移动速度 +10%', apply: g => g.bonus.speed *= 1.1 },
  { id: 'crit', name: '锐角判定', desc: '暴击率 +12%', apply: g => g.bonus.crit = Math.min(.65, g.bonus.crit + .12) },
  { id: 'armor', name: '密铺护甲', desc: '承受伤害 -10%', apply: g => g.bonus.reduction = Math.min(.5, g.bonus.reduction + .1) },
  { id: 'leech', name: '回路汲取', desc: '造成伤害回复 4% 生命', apply: g => g.bonus.leech += .04 },
  { id: 'magnet', name: '向量磁极', desc: '拾取范围 +70%', apply: g => g.bonus.magnet *= 1.7 },
  { id: 'pierce', name: '锐化顶点', desc: '射弹额外穿透 +1', apply: g => g.bonus.pierce++ },
  { id: 'size', name: '放大矩阵', desc: '射弹半径 +25%', apply: g => g.bonus.size *= 1.25 },
  { id: 'velocity', name: '超前导向', desc: '射弹速度 +25%', apply: g => g.bonus.projectileSpeed *= 1.25 },
  { id: 'bounce', name: '镜面增幅', desc: '反弹次数 +1', requires: 'bounce', apply: g => g.bonus.bounce++ },
  { id: 'arc', name: '导电节点', desc: '电弧额外跳跃 +1', requires: 'arc', apply: g => g.bonus.chains++ },
  { id: 'split', name: '分形迭代', desc: '分裂射弹 +2', requires: 'split', apply: g => g.bonus.splits += 2 },
  { id: 'blast', name: '外接圆', desc: '爆炸半径 +35%', requires: 'explosion', apply: g => g.bonus.explosion *= 1.35 },
  { id: 'dash', name: '余辉冲刺', desc: '冲刺冷却 -25%，产生残影伤害', apply: g => { g.bonus.dashCd *= .75; g.bonus.dashTrail = true; } },
  { id: 'hook', name: '牵引定理', desc: '鱼钩拉力 +50%，命中造成伤害', apply: g => g.bonus.hookDamage += 22 },
  { id: 'web', name: '蛛网电容', desc: '蛛网范围 +30%，附带减速', apply: g => { g.bonus.webRadius *= 1.3; g.bonus.webSlow = true; } },
  { id: 'shield', name: '镜面护盾', desc: '护盾反射 20% 伤害', unique: true, apply: g => g.bonus.reflect = true },
  { id: 'regen', name: '静态修复', desc: '静止时每秒恢复 2 点生命', apply: g => g.bonus.regen += 2 },
  { id: 'revive', name: '重构芯片', desc: '获得一次复活', apply: g => g.bonus.revives++ },
  { id: 'coin', name: '碎片套利', desc: '获得碎片 +25%', apply: g => g.bonus.coinBonus += .25 },
  { id: 'overload-battery', name: '过载电池', desc: '每第 8 发子弹获得 0.5 秒 1.5 倍伤害', chapter: 3, weight: 2, apply: g => g.bonus.batteryEvery = 8 },
  { id: 'rapid-cooling', name: '极速冷却', desc: '护盾、鱼钩与蛛网冷却 -20%', chapter: 2, weight: 3, apply: g => g.bonus.skillCooldown *= .8 },
  { id: 'element-affinity', name: '元素亲和', desc: '元素副作用触发概率 +50%', chapter: 2, weight: 3, apply: g => g.bonus.elementProc *= 1.5 },
  { id: 'vacuum-pull', name: '真空吸力', desc: '击杀时拉近 100 像素内的敌人', chapter: 3, weight: 3, apply: g => g.bonus.killVacuum = true },
  { id: 'blood-instinct', name: '嗜血本能', desc: '击杀回复 8% 最大生命', chapter: 2, weight: 2, apply: g => g.bonus.killHeal += .08 },
  { id: 'backtrack-mark', name: '回溯刻痕', desc: '每损失 10% 生命，伤害 +4%（最多 +30%）', chapter: 2, weight: 3, apply: g => g.bonus.missingHpDamage = true },
  { id: 'waveform-stack', name: '波形叠加', desc: '0.5 秒内连续命中同一目标，伤害递增 5%', chapter: 3, weight: 2, apply: g => g.bonus.waveform = true },
  { id: 'shard-recovery', name: '碎弹回收', desc: '命中 15% 概率额外穿透 1 次', chapter: 3, weight: 3, apply: g => g.bonus.recycleChance += .15 },
  { id: 'lucky-prism', name: '幸运棱镜', desc: '碎片 +30%，武器掉率与商店幸运提高', chapter: 3, weight: 2, apply: g => { g.bonus.coinBonus += .3; g.bonus.dropBonus += .1; g.bonus.shopLucky += .15; } },
  { id: 'phase-step', name: '相位步', desc: '冲刺距离 +20%，留下伤害残影', chapter: 3, weight: 2, apply: g => { g.bonus.dashDistance *= 1.2; g.bonus.phaseTrail = true; } },
  { id: 'destruction-strike', name: '毁灭打击', desc: '暴击额外造成目标最大生命 4% 的伤害', chapter: 3, weight: 1, apply: g => g.bonus.destroyCrit = true },
  { id: 'charged-start', name: '蓄能启动', desc: '每波第 1 发子弹伤害 ×2.5', chapter: 3, weight: 2, apply: g => g.bonus.chargedStart = true },
  { id: 'swap', name: '切换超载', desc: '切换武器后的首发伤害 +80%', unique: true, apply: g => g.bonus.swapBoost = true },
  { id: 'pierce-pair', name: '贯穿共鸣', desc: '双穿透：额外穿透 +2', synergy: 'pierce', apply: g => g.bonus.pierce += 2 },
  { id: 'homing-pair', name: '锁定共鸣', desc: '双追踪：转向强度翻倍', synergy: 'homing', apply: g => g.bonus.homing *= 2 },
  { id: 'rarity-pair', name: '同频共振', desc: '双同品质：伤害 +20%', synergy: 'rarity', apply: g => g.bonus.damage *= 1.2 }
];

export const ACHIEVEMENTS = [
  { id: 'prism-master', name: '棱镜大师', desc: '通关第 3 章' },
  { id: 'red-fervor', name: '红色狂热', desc: '装备两把红武通关第 1 章' },
  { id: 'untouched-wave', name: '无伤通关', desc: '第 1 章任意一波不受伤' },
  { id: 'splitter-spreader', name: '散播者', desc: '单局触发 30 次分裂子弹' },
  { id: 'elementalist', name: '元素使', desc: '携带火、冰、雷武器通关' },
  { id: 'boss-rush-fast', name: 'Boss Rush', desc: 'Boss Rush 用时少于 90 秒' },
  { id: 'cheat-clear', name: '赖皮玩家', desc: '开启赖皮模式完成一次对局' },
  { id: 'full-bag-sale', name: '满仓而出', desc: '背包至少 6 把武器时出售一把' }
];

export const HANGAR_NODES = [
  { id: 'hull', name: '通用构架', desc: '所有核心最大生命 +5 / 级', cost: 18, max: 5 },
  { id: 'salvage', name: '碎片回收', desc: '结算核心 +10% / 级', cost: 22, max: 5 },
  { id: 'cache', name: '起始缓存', desc: '开局碎片 +3 / 级', cost: 20, max: 5 },
  { id: 'square', name: '方块屏障', desc: '方块护盾减伤 +5% / 级', cost: 25, max: 5 },
  { id: 'triangle', name: '三角推进', desc: '三角冲刺冷却 -6% / 级', cost: 25, max: 5 },
  { id: 'hex', name: '六边形扩散', desc: '六边形范围伤害 +6% / 级', cost: 25, max: 5 },
  { id: 'starter-weapon', name: '初始武器缓存', desc: '开局额外获得 1 把绿武器', cost: 42, max: 1 },
  { id: 'relic-capacity', name: '遗物仓扩容', desc: '遗物容量 +1 / 级', cost: 34, max: 3 },
  { id: 'revive-charge', name: '重构储备', desc: '每局额外复活 +1 / 级', cost: 48, max: 3 },
  { id: 'shop-discount', name: '采购协议', desc: '商店价格 -10% / 级', cost: 36, max: 3 },
  { id: 'codex-dividend', name: '图鉴补给', desc: '每发现 10 项，开局 +5 碎片', cost: 55, max: 1 }
];

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const rand = (min, max) => min + Math.random() * (max - min);
export const pick = list => list[Math.floor(Math.random() * list.length)];
export const byName = name => WEAPONS.find(item => item.name === name);
