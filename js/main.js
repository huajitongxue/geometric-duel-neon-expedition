import { ACHIEVEMENTS, W, H, WORLD_W, WORLD_H, ST, RARITIES, RARITY_ORDER, ELEMENTS, CORES, WEAPONS, ENEMIES, CHAPTERS, HANGAR_NODES, UPGRADES, clamp, rand, pick } from './content.js';
import { game, saveData, loadSave, writeSave, startRun, resetBattleArrays, currentWeapon, weaponCollection, makeWeaponDrop, getUpgradeChoices, getRelicChoices, applyUpgrade, applyRelic, purchaseHangar, discoverEnemy, discoverWeapon, hangarLevel, isCoreUnlocked, unlockCore, exportSave, importSave, resetAllSave, resetStats, recordRun, recordWeaponUse, promoteWeapon, infuseWeapon, removeRandomUpgrade, unlockAchievement, achievementProgress, normalizeCoreAmount, formatCoreAmount, DEFAULT_KEY_BINDINGS, setKeyBinding } from './state.js';
import { unlockAudio, playSound, setMusicTheme, updateAudioSettings } from './audio.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const dialog = document.getElementById('saveDialog');
const transfer = document.getElementById('saveTransfer');
const transferTitle = document.getElementById('saveDialogTitle');
const keybindDialog = document.getElementById('keybindDialog');
const keybindPrompt = document.getElementById('keybindPrompt');
const keybindConfirmation = document.getElementById('keybindConfirmation');
const keybindConfirmationText = document.getElementById('keybindConfirmationText');
const keybindConfirm = document.getElementById('keybindConfirm');
const keybindCancel = document.getElementById('keybindCancel');
const keys = new Set();
const mouseButtons = new Set();
const mouse = { x: W / 2, y: H / 2, worldX: WORLD_W / 2, worldY: WORLD_H / 2, down: false };
const MAX = { particles: 900, bullets: 460, enemyBullets: 360, floating: 130 };
let last = performance.now();
let uiButtons = [];
let transferMode = 'export';
let dragSlider = null;
let dragBossRush = null;
let keybindAction = null;
let keybindCandidate = null;
let lastSliderPreview = 0;
const ESC_TO_TITLE = new Set([ST.CORE_SELECT, ST.BOSS_RUSH_LOADOUT, ST.PRACTICE_CONFIG, ST.HANGAR, ST.CODEX, ST.HELP, ST.RESULT, ST.SETTINGS, ST.ACHIEVEMENTS]);
const HELP_ACTIONS = Object.freeze([
  { id: 'moveUp', name: '上移' }, { id: 'moveDown', name: '下移' }, { id: 'moveLeft', name: '左移' }, { id: 'moveRight', name: '右移' },
  { id: 'fire', name: '手动开火' }, { id: 'dash', name: '冲刺' }, { id: 'hook', name: '鱼钩' }, { id: 'web', name: '蛛网' },
  { id: 'shield', name: '护盾' }, { id: 'autoFire', name: '自动锁敌' }, { id: 'swap', name: '切换武器' }, { id: 'build', name: '构型面板' }, { id: 'pause', name: '暂停' }
]);
const INPUT_LABELS = Object.freeze({ Mouse0: '鼠标左键', Mouse1: '鼠标中键', Mouse2: '鼠标右键', Space: '空格', Tab: 'Tab', Escape: 'Esc', ShiftLeft: '左 Shift', ShiftRight: '右 Shift', ControlLeft: '左 Ctrl', ControlRight: '右 Ctrl', AltLeft: '左 Alt', AltRight: '右 Alt', ArrowUp: '上方向键', ArrowDown: '下方向键', ArrowLeft: '左方向键', ArrowRight: '右方向键' });
const BOSS_RUSH_LIST = Object.freeze({ x: 28, y: 142, w: 888, h: 330, columns: 3, cardW: 284, cardH: 126, gapX: 18, gapY: 14 });

function resizeCanvas() { const dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = true; }
resizeCanvas(); window.addEventListener('resize', resizeCanvas); loadSave(); setMusicTheme('grid');
function setState(next) { game.previousState = game.state; game.state = next; if (next !== ST.PAUSE) { game.showUpgradeDetails = false; game.upgradeDetailsPage = 0; } }
function activeCombat() { return game.state === ST.BATTLE || game.state === ST.PRACTICE; }
function point(event) { const box = canvas.getBoundingClientRect(); return { x: (event.clientX - box.left) * W / box.width, y: (event.clientY - box.top) * H / box.height }; }
function bindingFor(action) { return saveData.settings.keyBindings?.[action] || DEFAULT_KEY_BINDINGS[action]; }
function inputLabel(input) { if (INPUT_LABELS[input]) return INPUT_LABELS[input]; if (input?.startsWith('Key')) return input.slice(3); if (input?.startsWith('Digit')) return input.slice(5); return input || '未设置'; }
function pointerInput(event) { return event.button >= 0 && event.button <= 2 ? `Mouse${event.button}` : null; }
function matchesBinding(action, input) { return bindingFor(action) === input; }
function actionPressed(action) { const input = bindingFor(action); return input?.startsWith('Mouse') ? mouseButtons.has(input) : keys.has(input); }
function bossRushContentHeight() { const rows = Math.ceil(WEAPONS.filter(item => item.rarity === '橙').length / BOSS_RUSH_LIST.columns); return rows * BOSS_RUSH_LIST.cardH + Math.max(0, rows - 1) * BOSS_RUSH_LIST.gapY; }
function bossRushScrollMax() { return Math.max(0, bossRushContentHeight() - BOSS_RUSH_LIST.h); }
function setBossRushScroll(value) { game.bossRushScroll = clamp(value, 0, bossRushScrollMax()); }
function inBossRushList(p) { return game.state === ST.BOSS_RUSH_LOADOUT && p.x >= BOSS_RUSH_LIST.x && p.x <= BOSS_RUSH_LIST.x + BOSS_RUSH_LIST.w + 32 && p.y >= BOSS_RUSH_LIST.y && p.y <= BOSS_RUSH_LIST.y + BOSS_RUSH_LIST.h; }
function updateMouseWorld() { mouse.worldX = mouse.x + game.camera.x; mouse.worldY = mouse.y + game.camera.y; }
function updateCamera(dt = 1) { const p = game.player; if (!p) return; const targetX = clamp(p.x - W / 2, 0, WORLD_W - W), targetY = clamp(p.y - H / 2, 0, WORLD_H - H), follow = Math.min(1, dt * 9); game.camera.x += (targetX - game.camera.x) * follow; game.camera.y += (targetY - game.camera.y) * follow; updateMouseWorld(); }
function limitedPush(list, item, limit) { if (list.length >= limit) list.splice(0, list.length - limit + 1); list.push(item); }
function particle(x, y, color, count = 4, speed = 90, life = .38, shape = 4) { for (let i = 0; i < count; i++) { const a = Math.random() * Math.PI * 2, s = rand(speed * .35, speed); limitedPush(game.particles, { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: rand(1.5, 4), color, life, maxLife: life, shape }, MAX.particles); } }
function ring(x, y, color, radius = 18, life = .3) { limitedPush(game.effects, { type: 'ring', x, y, color, radius, life, maxLife: life }, 140); }
function floating(value, x, y, color = '#fff') { limitedPush(game.floating, { text: value, x, y, color, life: .9, maxLife: .9 }, MAX.floating); }
function nearestEnemy(x, y, except = null) { let found = null, best = Infinity; for (const enemy of game.enemies) if (enemy !== except && enemy.hp > 0) { const d = Math.hypot(enemy.x - x, enemy.y - y); if (d < best) { best = d; found = enemy; } } return found; }
function spawnPosition(radius = 16) { const p = game.player; for (let i = 0; i < 24; i++) { const a = Math.random() * Math.PI * 2, d = rand(420, 720), x = clamp(p.x + Math.cos(a) * d, radius + 18, WORLD_W - radius - 18), y = clamp(p.y + Math.sin(a) * d, radius + 18, WORLD_H - radius - 18); if (Math.hypot(x - p.x, y - p.y) > 360) return { x, y }; } return { x: WORLD_W / 2, y: 100 }; }
function queueEnemy(id, elite = false, x, y) { const base = ENEMIES[id]; if (!base) return; const pos = Number.isFinite(x) ? { x, y } : spawnPosition(base.radius); game.spawnQueue.push({ id, elite, x: pos.x, y: pos.y, radius: base.radius, boss: !!base.boss }); }
function chapterData() { return CHAPTERS[clamp(game.chapter - 1, 0, CHAPTERS.length - 1)]; }
function endlessMultiplier() { return game.mode === 'endless' ? Math.pow(1.05, Math.max(0, game.endlessWave - 1)) : 1; }
function makeEnemy(entry) {
  const base = ENEMIES[entry.id]; if (!base) return null; const chapter = chapterData(); const cfg = game.practice ? game.practiceConfig : null, mult = cfg ? 1 : chapter.hpMul * endlessMultiplier();
  const hp = cfg ? cfg.hp : base.hp * mult * (entry.elite ? 2.1 : 1); const enemy = { ...base, id: game.nextId++, x: entry.x, y: entry.y, hp, maxHp: hp, speed: base.speed * (cfg ? cfg.speed : entry.elite ? 1.18 : 1), damage: base.damage * (cfg ? cfg.damage : (game.mode === 'endless' ? Math.pow(1.03, Math.max(0, game.endlessWave - 1)) : 1) * (entry.elite ? 1.25 : 1)), cooldown: base.cooldown * (cfg ? cfg.cooldown : 1), attackTimer: rand(.2, 1), hit: 0, elite: entry.elite, vx: 0, vy: 0, slow: 0, freeze: 0, burn: 0, burnDamage: 0, status: null, lastDamaged: -99, bossTimer: 1.5, phase: 1, lastPhase: 1, shieldHp: base.shieldHp || 0, maxShieldHp: base.shieldHp || 0, reveal: 0 };
  if (base.kind === 'boss3') enemy.parts = Array.from({ length: 4 }, (_, i) => ({ hp: 250 * mult, maxHp: 250 * mult, angle: i * Math.PI / 2, x: entry.x, y: entry.y, active: true }));
  discoverEnemy(base.name); return enemy;
}

const SHOP_THEMES = [
  { label: '基础火控', color: '#70dfff', filter: weapon => ['line', 'scatter', 'pierce'].includes(weapon.type) && ['白', '绿', '蓝'].includes(weapon.rarity) },
  { label: '雷电构筑', color: '#e7a0ff', filter: weapon => (weapon.elements || [weapon.element]).includes('lightning') },
  { label: '高阶实验', color: '#ffb865', filter: weapon => ['紫', '橙', '红'].includes(weapon.rarity) }
];
function weaponElements(weapon) { return [...new Set(weapon?.elements || [weapon?.element].filter(Boolean))]; }
function awardAchievement(id) { if (!unlockAchievement(id)) return false; const achievement = ACHIEVEMENTS.find(item => item.id === id); game.achievementNotice = { text: `成就解锁：${achievement.name} +30 核心`, life: 2.8, maxLife: 2.8 }; if (game.player) floating('成就解锁！', game.player.x, game.player.y - 80, '#ffe28a'); return true; }
function setCombatTip(message) { if (saveData.settings.combatTips) game.tip = { text: message, life: 4.2, maxLife: 4.2 }; }
function prepareWave(isBoss = false) {
  game.waveDamageTaken = 0;
  game.activeWaveDropBonus = game.nextWaveDropBonus;
  game.nextWaveDropBonus = 0;
  game.bonus.waveFirstShot = game.bonus.chargedStart;
  game.runStats.farthestWave = Math.max(game.runStats.farthestWave, game.mode === 'endless' ? game.endlessWave : game.waveIndex + 1);
  if (!isBoss && game.mode === 'expedition' && game.waveIndex === 0) {
    if (game.chapter === 1) setCombatTip('右键冲刺是无敌的，巧用它躲避弹幕');
    if (game.chapter === 2) setCombatTip('精英敌人会掉落紫武，运气好会掉红武');
    if (game.chapter === 3) setCombatTip('第 3 章有 Boss 战前的整备区，请合理利用');
  }
}
function nextEncounterLabel() {
  if (game.mode === 'endless') return `无限模式第 ${game.endlessWave + 1} 波`;
  const chapter = chapterData();
  if (game.waveIndex >= chapter.waves.length) return `Boss：${ENEMIES[chapter.boss].name}`;
  return chapter.waves[game.waveIndex].map(([id, count]) => `${count} ${ENEMIES[id].name}`).join(' + ');
}
function startBoss(id = null) { resetBattleArrays(); game.isBoss = true; game.player.x = WORLD_W / 2; game.player.y = WORLD_H * .76; game.player.invincible = 1.6; game.bossId = id || (game.mode === 'boss-rush' ? ['boss1', 'boss2', 'boss3'][game.bossRushIndex] : chapterData().boss); prepareWave(true); queueEnemy(game.bossId, false, WORLD_W / 2, 170); updateCamera(1); setState(ST.BATTLE); playSound('boss'); }
function endlessEntries(wave) { const pools = wave < 6 ? ['drone', 'charger', 'tank'] : wave < 13 ? ['shield', 'summoner', 'stealth', 'repair', 'reflector'] : Object.keys(ENEMIES).filter(id => !ENEMIES[id].boss); const entries = []; for (let i = 0; i < 2 + Math.min(5, Math.floor(wave / 3)); i++) entries.push([pick(pools), 1 + (i % 2)]); return entries; }
function startBattle() {
  resetBattleArrays(); game.player.x = WORLD_W / 2; game.player.y = WORLD_H * .62; game.player.invincible = 1.2; updateCamera(1);
  if (game.mode === 'boss-rush') return startBoss();
  if (game.mode === 'endless') { game.endlessWave++; if (game.endlessWave % 5 === 0) return startBoss(['boss1', 'boss2', 'boss3'][(game.endlessWave / 5 - 1) % 3]); prepareWave(); endlessEntries(game.endlessWave).forEach(([id, count]) => { for (let i = 0; i < count; i++) queueEnemy(id); }); setState(ST.BATTLE); return; }
  const chapter = chapterData(); if (game.waveIndex >= chapter.waves.length) return startBoss(chapter.boss); prepareWave(); chapter.waves[game.waveIndex].forEach(([id, count]) => { for (let i = 0; i < count; i++) queueEnemy(id); }); if ([2, 5, 8].includes(game.waveIndex)) queueEnemy(pick(['charger', 'sniper', 'shield', 'reflector']), true); setState(ST.BATTLE); setMusicTheme(chapter.theme);
}
function startPractice() { startRun(game.core?.id || 'square', true, 'practice'); resetBattleArrays(); queueEnemy(game.practiceConfig.enemy, false, WORLD_W * .72, WORLD_H * .42); updateCamera(1); setState(ST.PRACTICE); }
function beginBossRushLoadout(coreId) { game.bossRushCoreId = coreId; game.bossRushLoadout = []; game.bossRushScroll = 0; setState(ST.BOSS_RUSH_LOADOUT); }
function toggleBossRushWeapon(weapon) { const index = game.bossRushLoadout.indexOf(weapon); if (index >= 0) game.bossRushLoadout.splice(index, 1); else if (game.bossRushLoadout.length < 2) game.bossRushLoadout.push(weapon); }
function confirmBossRushLoadout() { if (!game.bossRushCoreId || game.bossRushLoadout.length !== 2) return false; for (const weapon of game.bossRushLoadout) discoverWeapon(weapon.name); startRun(game.bossRushCoreId, false, 'boss-rush', game.bossRushLoadout); startBattle(); return true; }
function startExpedition(coreId, mode = game.pendingMode) { if (mode === 'boss-rush') return beginBossRushLoadout(coreId); startRun(coreId, false, mode); startBattle(); }
function createBullet(x, y, angle, speed, damage, type = 'line', extra = {}) { limitedPush(game.bullets, { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, angle, speed, damage, type, radius: 5 * game.bonus.size, life: 2.2, pierce: extra.pierce || 0, bounces: extra.bounces || 0, chains: extra.chains || 0, splits: extra.splits || 0, blast: extra.blast || 0, hitIds: [], color: extra.color || '#dff8ff', element: extra.element || null, elements: extra.elements || [extra.element].filter(Boolean), crit: !!extra.crit, redWeapon: extra.redWeapon || null }, MAX.bullets); }
function shoot() {
  const p = game.player, weapon = currentWeapon(); if (!p || !weapon || p.shieldTime > 0 || p.fireCd > 0) return; const rate = Math.max(.12, 1 / (weapon.rate * game.bonus.fireRate)); p.fireCd = rate;
  const red = weapon.rarity === '红';
  const crit = Math.random() < Math.min(.8, game.bonus.crit + (red ? .15 : 0));
  game.bonus.overloadShots++;
  const overload = game.bonus.overloadEvery && game.bonus.overloadShots % game.bonus.overloadEvery === 0;
  if (game.bonus.batteryEvery) { game.bonus.batteryShots++; if (game.bonus.batteryShots % game.bonus.batteryEvery === 0) game.bonus.batteryTime = .5; }
  const missingHp = game.bonus.missingHpDamage ? Math.min(.3, Math.floor((1 - p.hp / p.maxHp) * 10) * .04) : 0;
  const charged = game.bonus.waveFirstShot;
  game.bonus.waveFirstShot = false;
  const damage = weapon.damage * game.core.damage * game.bonus.damage * (1 + missingHp) * (crit ? 2 : 1) * (overload ? 2 : 1) * (game.bonus.batteryTime > 0 ? 1.5 : 1) * (charged ? 2.5 : 1) * (game.bonus.pendingSwapBoost ? 1.8 : 1);
  game.bonus.pendingSwapBoost = false; recordWeaponUse(weapon.name);
  const elements = weaponElements(weapon);
  const extra = { color: RARITIES[weapon.rarity], pierce: (weapon.pierce || 0) + game.bonus.pierce, bounces: (weapon.bounces || 0) + game.bonus.bounce, chains: (weapon.chains || 0) + game.bonus.chains, splits: (weapon.splits || 0) + game.bonus.splits, blast: (weapon.radius || 0) * game.bonus.explosion, element: elements[0] || null, elements, crit, redWeapon: red ? weapon.name : null };
  const x = p.x + Math.cos(p.facing) * 20, y = p.y + Math.sin(p.facing) * 20;
  if (weapon.type === 'scatter') for (let i = 0; i < (weapon.pellets || 5); i++) createBullet(x, y, p.facing - .34 + .68 * i / Math.max(1, (weapon.pellets || 5) - 1), weapon.speed * game.bonus.projectileSpeed, damage, weapon.type, extra);
  else if (weapon.type === 'laser') limitedPush(game.effects, { type: 'beam', x: p.x, y: p.y, angle: p.facing, range: weapon.beam, damage, color: extra.color, elements, crit, redWeapon: extra.redWeapon, life: .14, maxLife: .14 }, 40);
  else if (weapon.type === 'turret') { if (game.turrets.length >= 3) game.turrets.shift(); game.turrets.push({ x, y, life: weapon.turretLife, maxLife: weapon.turretLife, fire: .1, damage, color: extra.color, elements, crit, redWeapon: extra.redWeapon }); }
  else if (weapon.type === 'orbit') limitedPush(game.effects, { type: 'orbit', x: p.x, y: p.y, count: weapon.orbitCount, damage, color: extra.color, elements, crit, redWeapon: extra.redWeapon, life: .5, maxLife: .5, hit: {} }, 8);
  else createBullet(x, y, p.facing, weapon.speed * game.bonus.projectileSpeed, damage, weapon.type, extra);
  particle(x, y, extra.color, red ? 7 : 3, red ? 175 : 130, red ? .3 : .22); if (red && saveData.settings.redWeaponGlow) ring(x, y, '#ffd46b', 30, .3); if (crit || overload || charged) { floating(crit ? (red ? 'RED CRIT!' : '暴击') : charged ? '蓄能' : '过载', x, y - 10, '#fff18a'); game.flash = .08; if (crit) game.critPulse = .1; playSound('crit'); } else playSound('shot');
}
function useDash() { const p = game.player; if (!p || p.dashCd > 0 || p.shieldTime > 0) return; let x = (actionPressed('moveRight') ? 1 : 0) - (actionPressed('moveLeft') ? 1 : 0), y = (actionPressed('moveDown') ? 1 : 0) - (actionPressed('moveUp') ? 1 : 0); if (!x && !y) { x = Math.cos(p.facing); y = Math.sin(p.facing); } const d = Math.hypot(x, y) || 1; p.vx = x / d * 620 * game.bonus.dashDistance; p.vy = y / d * 620 * game.bonus.dashDistance; p.dashTime = .21; p.dashCd = 3.1 * game.bonus.dashCd; p.invincible = .24; if (game.bonus.phaseTrail) game.effects.push({ type: 'phase-trail', x: p.x, y: p.y, radius: 30, damage: (currentWeapon()?.damage || 20) * .3, life: .5, maxLife: .5, hit: {} }); particle(p.x, p.y, game.core.color, 12, 210, .45, game.core.shape || 8); ring(p.x, p.y, game.core.color, 32, .35); game.screenShake = Math.max(game.screenShake, 3); playSound('dash'); }
function useHook() { const p = game.player; if (!p || p.hookCd > 0 || p.shieldTime > 0) return; const target = nearestEnemy(p.x, p.y); p.hookCd = 4.2 * game.bonus.skillCooldown; if (!target) return; game.effects.push({ type: 'hook', from: p, target, life: .52, maxLife: .52, color: '#67f2ff' }); const dx = p.x - target.x, dy = p.y - target.y, d = Math.hypot(dx, dy) || 1; target.x += dx / d * 74; target.y += dy / d * 74; damageEnemy(target, 10 + game.bonus.hookDamage, { fromPlayer: true, element: 'lightning' }); playSound('skill'); }
function useWeb() { const p = game.player; if (!p || p.webCd > 0 || p.shieldTime > 0) return; p.webCd = 5 * game.bonus.skillCooldown; const radius = 66 * game.bonus.webRadius; game.zones.push({ x: p.x, y: p.y, radius, life: 5, maxLife: 5, color: '#ed73ff' }); ring(p.x, p.y, '#ed73ff', radius, .45); playSound('skill'); }
function toggleShield() { const p = game.player; if (!p || p.shieldCd > 0 || p.dashTime > 0) return; p.shieldTime = p.shieldTime > 0 ? 0 : 3; p.shieldCd = p.shieldTime > 0 ? 3.6 * game.bonus.skillCooldown : 0; ring(p.x, p.y, '#77aaff', 28, .35); playSound('skill'); }
function reaction(enemy, element, damage) { const prior = enemy.status; if (!element || !prior || prior === element) return damage; const pair = [prior, element].sort().join('+'); enemy.status = null; enemy.burn = 0; if (pair === 'fire+ice') { explode(enemy.x, enemy.y, 52, damage * .8, '#fff3a5', true); floating('蒸发！', enemy.x, enemy.y - 34, '#fff3a5'); return damage; } if (pair === 'fire+lightning') { floating('超载！', enemy.x, enemy.y - 34, '#ffd28f'); return damage * 1.5; } if (pair === 'ice+lightning') { enemy.freeze = 1; floating('冻结！', enemy.x, enemy.y - 34, '#8ff4ff'); return damage; } return damage; }
function applyElement(enemy, element, damage, noChain) { if (!element) return damage; const dealt = reaction(enemy, element, damage); if (!enemy.freeze) enemy.status = element; if (element === 'fire') { enemy.burn = 3; enemy.burnDamage = Math.max(enemy.burnDamage, dealt * .18); } if (element === 'ice') enemy.slow = Math.max(enemy.slow, 2); if (element === 'lightning' && !noChain) arcFrom(enemy, 2, dealt * .48, ELEMENTS.lightning, true); return dealt; }
function damageEnemy(enemy, amount, meta = {}) {
  if (!enemy || enemy.hp <= 0) return false;
  let dealt = amount;
  const elements = meta.elements || [meta.element].filter(Boolean);
  for (const element of elements) dealt = applyElement(enemy, element, dealt, meta.noChain);
  if (meta.fromPlayer && elements.length && game.bonus.elementProc > 1 && Math.random() < .25 * (game.bonus.elementProc - 1)) applyElement(enemy, pick(elements), dealt * .28, true);
  if (meta.redWeapon) {
    if (enemy.redMark?.weapon === meta.redWeapon && enemy.redMark.until > game.elapsed) { dealt *= 1.2; enemy.redMark = null; floating('红印爆发', enemy.x, enemy.y - 34, '#ff7087'); }
    else enemy.redMark = { weapon: meta.redWeapon, until: game.elapsed + .5 };
    if (enemy.kind === 'shield' || enemy.kind === 'reflect') dealt *= 1.3;
    if (saveData.settings.redWeaponGlow) ring(enemy.x, enemy.y, '#ff5f76', enemy.radius + 18, .2);
  }
  if (meta.fromPlayer && game.bonus.waveform) {
    enemy.waveHit = enemy.waveHit && game.elapsed - enemy.waveHit.at <= .5 ? { at: game.elapsed, stacks: Math.min(6, enemy.waveHit.stacks + 1) } : { at: game.elapsed, stacks: 1 };
    dealt *= 1 + (enemy.waveHit.stacks - 1) * .05;
  }
  if (meta.crit && meta.fromPlayer && game.bonus.destroyCrit) dealt += enemy.maxHp * .04;
  if (enemy.kind === 'shield' && enemy.shieldHp > 0 && meta.fromPlayer) {
    enemy.shieldHp -= dealt;
    floating(`盾 -${Math.ceil(dealt)}`, enemy.x, enemy.y - enemy.radius - 8, meta.redWeapon ? '#ff9b7d' : '#7ee8ff');
    if (meta.redWeapon && game.player) game.player.hp = Math.min(game.player.maxHp, game.player.hp + 2);
    if (enemy.shieldHp <= 0) floating('破甲', enemy.x, enemy.y - 32, '#fff19c');
    return false;
  }
  if (enemy.kind === 'boss3' && enemy.parts?.some(part => part.active)) dealt *= .35;
  dealt = Math.max(1, Math.round(dealt)); enemy.hp -= dealt; enemy.hit = .12; enemy.lastDamaged = game.elapsed;
  if (meta.fromPlayer) {
    game.runStats.playerHits++; game.chapterStats.playerHits++;
    if (meta.crit) { game.runStats.critHits++; game.chapterStats.critHits++; }
  }
  const label = meta.crit ? `暴击 -${dealt}` : `-${dealt}`;
  floating(label, enemy.x, enemy.y - enemy.radius - 6, meta.crit ? '#fff19c' : meta.redWeapon ? '#ff9ba9' : '#f5fbff');
  particle(enemy.x, enemy.y, enemy.color, 4, 110, .28, enemy.sides || 4);
  if (meta.fromPlayer && game.bonus.leech && game.player) game.player.hp = Math.min(game.player.maxHp, game.player.hp + dealt * game.bonus.leech);
  if (meta.redWeapon && game.player) game.player.hp = Math.min(game.player.maxHp, game.player.hp + 2);
  playSound('hit'); if (enemy.hp <= 0) killEnemy(enemy, meta.fromPlayer); return true;
}
function damagePart(enemy, part, bullet) { part.hp -= bullet.damage; bullet.life = 0; floating(`炮塔 -${Math.ceil(bullet.damage)}`, part.x, part.y - 17, '#ffd28f'); particle(part.x, part.y, '#ffcc7e', 7, 130, .35, 4); if (part.hp <= 0) { part.active = false; ring(part.x, part.y, '#fff19c', 34, .4); floating('炮塔摧毁', part.x, part.y - 30, '#fff19c'); } }
function killEnemy(enemy, fromPlayer = false) { if (enemy.hp <= 0 && enemy.dead) return; enemy.hp = 0; enemy.dead = true; particle(enemy.x, enemy.y, enemy.color, enemy.boss ? 34 : 14, enemy.boss ? 330 : 190, .65, enemy.sides || 4); ring(enemy.x, enemy.y, enemy.color, enemy.boss ? 90 : 30, .52); game.screenShake = Math.max(game.screenShake, enemy.boss ? 7 : 2.5); if (fromPlayer) { game.combo++; game.maxCombo = Math.max(game.maxCombo, game.combo); game.runStats.kills++; game.chapterStats.kills++; if (game.combo % 10 === 0) floating(`${game.combo} 连击`, game.player.x, game.player.y - 70, '#fff19c'); }
  if (!game.practice) {
    saveData.stats.kills = (saveData.stats.kills || 0) + 1;
    game.drops.push({ x: enemy.x, y: enemy.y, type: 'coin', value: Math.max(1, Math.round(enemy.score * (enemy.elite ? 2 : 1))), life: 10 });
    const dropChance = Math.min(.62, .16 + game.activeWaveDropBonus + game.bonus.dropBonus);
    if (enemy.elite || enemy.boss || Math.random() < dropChance) game.drops.push({ x: enemy.x + 10, y: enemy.y - 8, type: 'weapon', weapon: makeWeaponDrop(enemy.boss ? 'boss' : enemy.elite ? 'elite' : 'normal'), life: 10 });
  }
  if (fromPlayer && game.bonus.killHeal && game.player) game.player.hp = Math.min(game.player.maxHp, game.player.hp + game.player.maxHp * game.bonus.killHeal);
  if (fromPlayer && game.bonus.killVacuum) for (const other of game.enemies) if (other !== enemy && other.hp > 0) { const dx = enemy.x - other.x, dy = enemy.y - other.y, distance = Math.hypot(dx, dy) || 1; if (distance <= 100) { other.x += dx / distance * Math.min(36, distance); other.y += dy / distance * Math.min(36, distance); } }
  if (enemy.elite && fromPlayer) { game.nextWaveDropBonus = Math.min(.3, game.nextWaveDropBonus + .1); game.achievementNotice = { text: `精英击杀！下一波掉率 +${Math.round(game.nextWaveDropBonus * 100)}%`, life: 2.2, maxLife: 2.2 }; }
  if (enemy.kind === 'split' && !game.practice) for (let i = 0; i < 2; i++) game.enemies.push({ ...makeEnemy({ id: 'drone', x: enemy.x + rand(-20, 20), y: enemy.y + rand(-20, 20), elite: false }), hp: 19, maxHp: 19, radius: 8 });
  if (enemy.boss) playSound('bossWin');
}
function explode(x, y, radius, damage, color, fromPlayer = true) { ring(x, y, color, radius, .43); particle(x, y, color, 18, radius * 3, .55); game.screenShake = Math.max(game.screenShake, 4.5); for (const enemy of game.enemies) if (enemy.hp > 0 && Math.hypot(enemy.x - x, enemy.y - y) < radius + enemy.radius) damageEnemy(enemy, damage * .72, { fromPlayer }); }
function arcFrom(enemy, chains, damage, color, noElement = false) { let source = enemy; for (let i = 0; i < chains; i++) { const target = nearestEnemy(source.x, source.y, source); if (!target) break; game.effects.push({ type: 'arc', x1: source.x, y1: source.y, x2: target.x, y2: target.y, color, life: .18, maxLife: .18 }); damageEnemy(target, damage * Math.pow(.72, i), { fromPlayer: true, noChain: noElement }); source = target; } }
function damagePlayer(amount, source) {
  const p = game.player;
  if (!p || p.invincible > 0 || p.dashTime > 0) return;
  if (game.practice) { floating('训练无敌', p.x, p.y - 34, '#77eaff'); return; }
  let actual = amount * (1 - game.bonus.reduction);
  if (p.shieldTime > 0) {
    const absorb = game.core.id === 'square' ? .7 + hangarLevel('square') * .05 : .58;
    actual *= 1 - absorb;
    if (game.bonus.reflect && source) damageEnemy(source, amount * .2);
  }
  game.runStats.damageTaken++;
  game.chapterStats.damageTaken++;
  game.waveDamageTaken++;
  const lethal = p.hp - actual <= 0;
  p.hp = lethal && saveData.settings.cheatMode ? 1 : p.hp - actual;
  p.hitFlash = .22;
  p.invincible = .26;
  game.combo = 0;
  floating(`-${Math.ceil(actual)}`, p.x, p.y - 28, '#ff7b98');
  particle(p.x, p.y, '#ff6385', 9, 150, .35);
  game.screenShake = Math.max(game.screenShake, 5);
  game.flash = .1;
  playSound('hurt');
  if (lethal && saveData.settings.cheatMode) { floating('赖皮模式 · 生命锁定', p.x, p.y - 50, '#ff5c70'); return; }
  if (p.hp <= 0) {
    if (game.bonus.revives > 0) { game.bonus.revives--; p.hp = p.maxHp * .5; p.invincible = 2; floating('重构启动', p.x, p.y - 50, '#fff19c'); }
    else if (game.bonus.mirrorRevive && !game.bonus.mirrorUsed) { game.bonus.mirrorUsed = true; p.hp = p.maxHp * .3; p.invincible = 2; explode(p.x, p.y, 160, 120, '#e6f6ff'); floating('镜面重构', p.x, p.y - 50, '#dff8ff'); }
    else finishRun(false);
  }
}
function updatePlayer(dt) { const p = game.player; if (!p) return; for (const key of ['fireCd','dashCd','hookCd','webCd','shieldCd','shieldTime','invincible','hitFlash']) p[key] = Math.max(0, p[key] - dt); const target = game.autoFire ? nearestEnemy(p.x, p.y) : null; p.facing = target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.atan2(mouse.worldY - p.y, mouse.worldX - p.x); let dx = (actionPressed('moveRight') ? 1 : 0) - (actionPressed('moveLeft') ? 1 : 0), dy = (actionPressed('moveDown') ? 1 : 0) - (actionPressed('moveUp') ? 1 : 0); p.moving = !!(dx || dy); if (p.dashTime > 0) { p.dashTime -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (game.bonus.dashTrail) game.effects.push({ type: 'trail', x: p.x, y: p.y, radius: 23, damage: 16 * game.bonus.damage, life: .18, maxLife: .18, color: game.core.color }); } else if (dx || dy) { const d = Math.hypot(dx, dy); p.x += dx / d * p.speed * game.bonus.speed * dt; p.y += dy / d * p.speed * game.bonus.speed * dt; } if (!p.moving && game.bonus.regen) p.hp = Math.min(p.maxHp, p.hp + game.bonus.regen * dt); p.x = clamp(p.x, p.radius, WORLD_W - p.radius); p.y = clamp(p.y, p.radius, WORLD_H - p.radius); if (actionPressed('fire') || target) shoot(); }
function fireEnemy(enemy, angle, count = 1, spread = 0) { for (let i = 0; i < count; i++) { const a = angle - spread / 2 + (count === 1 ? 0 : spread * i / (count - 1)); limitedPush(game.enemyBullets, { x: enemy.x, y: enemy.y, vx: Math.cos(a) * (enemy.kind === 'sniper' ? 410 : 290), vy: Math.sin(a) * (enemy.kind === 'sniper' ? 410 : 290), radius: enemy.boss ? 7 : 4, damage: enemy.damage, life: 3, color: enemy.color, source: enemy }, MAX.enemyBullets); } }
function updateEnemy(enemy, dt) { const p = game.player; if (enemy.hp <= 0 || !p) return; enemy.attackTimer -= dt; enemy.hit = Math.max(0, enemy.hit - dt); enemy.slow = Math.max(0, enemy.slow - dt); enemy.freeze = Math.max(0, enemy.freeze - dt); enemy.reveal = Math.max(0, enemy.reveal - dt); if (enemy.burn > 0) { enemy.burn -= dt; damageEnemy(enemy, enemy.burnDamage * dt, { fromPlayer: true, noChain: true }); } const dx = p.x - enemy.x, dy = p.y - enemy.y, d = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx), slow = enemy.freeze > 0 ? 0 : enemy.slow > 0 ? .6 : 1; enemy.facing = a; if (enemy.boss) return updateBoss(enemy, dt, a, d); const enabled = game.practice ? game.practiceConfig : null; if (enemy.kind === 'ranged' || enemy.kind === 'sniper' || enemy.kind === 'summon') { const wanted = enemy.kind === 'sniper' ? 300 : 210; if (d > wanted) { enemy.x += Math.cos(a) * enemy.speed * slow * dt; enemy.y += Math.sin(a) * enemy.speed * slow * dt; } if (enemy.kind === 'summon' && enemy.attackTimer <= 0 && (!enabled || enabled.summon)) { enemy.attackTimer = enemy.cooldown; queueEnemy('drone', false, enemy.x + rand(-28, 28), enemy.y + rand(-28, 28)); ring(enemy.x, enemy.y, enemy.color, 32, .35); } else if (enemy.kind !== 'summon' && enemy.attackTimer <= 0 && (!enabled || enabled.ranged)) { enemy.attackTimer = enemy.cooldown; fireEnemy(enemy, a, enemy.kind === 'sniper' ? 1 : 2, enemy.kind === 'sniper' ? 0 : .16); } } else if (enemy.kind === 'charge') { if (enemy.attackTimer <= 0 && d < 270 && (!enabled || enabled.charge)) { enemy.vx = Math.cos(a) * 420; enemy.vy = Math.sin(a) * 420; enemy.attackTimer = enemy.cooldown; } enemy.x += (enemy.vx || Math.cos(a) * enemy.speed) * slow * dt; enemy.y += (enemy.vy || Math.sin(a) * enemy.speed) * slow * dt; enemy.vx *= .91; enemy.vy *= .91; } else { enemy.x += Math.cos(a) * enemy.speed * slow * dt; enemy.y += Math.sin(a) * enemy.speed * slow * dt; } if (enemy.kind === 'repair' && game.elapsed - enemy.lastDamaged > 3) enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * .06 * dt); if (enemy.kind === 'stealth' && d < 170) enemy.reveal = 1; if (d < enemy.radius + p.radius + 3) { if (enemy.kind === 'explode' && (!enabled || enabled.explode)) { damagePlayer(enemy.damage, enemy); killEnemy(enemy); } else if (enemy.attackTimer <= 0) { enemy.attackTimer = enemy.cooldown; damagePlayer(enemy.damage, enemy); } } enemy.x = clamp(enemy.x, enemy.radius, WORLD_W - enemy.radius); enemy.y = clamp(enemy.y, enemy.radius, WORLD_H - enemy.radius); }
function updateBoss(enemy, dt, angle, distance) { const p = game.player, ratio = enemy.hp / enemy.maxHp; enemy.phase = ratio > .66 ? 1 : ratio > .33 ? 2 : 3; enemy.bossTimer -= dt; enemy.attackTimer -= dt; if (enemy.lastPhase !== enemy.phase) { enemy.lastPhase = enemy.phase; for (let i = 0; i < 18; i++) fireEnemy(enemy, i * Math.PI * 2 / 18, 1); game.flash = .18; ring(enemy.x, enemy.y, '#fff2c8', 180, .5); }
  if (distance > 210) { enemy.x += Math.cos(angle) * enemy.speed * dt; enemy.y += Math.sin(angle) * enemy.speed * dt; } if (enemy.attackTimer <= 0) { enemy.attackTimer = Math.max(.42, enemy.cooldown - enemy.phase * .1); fireEnemy(enemy, angle, enemy.phase === 1 ? 4 : 8, enemy.phase === 1 ? .55 : 1.55); } if (enemy.bossTimer <= 0) { enemy.bossTimer = enemy.kind === 'boss3' ? 3.7 : 5; for (let i = 0; i < enemy.phase + (enemy.kind === 'boss3' ? 1 : 0); i++) queueEnemy(pick(enemy.kind === 'boss3' ? ['shield','stealth','mine'] : ['drone','charger','splitter'])); }
  if (enemy.kind === 'boss2' && !enemy.laser && enemy.phase >= 2 && enemy.bossTimer < 3) enemy.laser = { state: 'charge', timer: .8, angle }; if (enemy.laser) { enemy.laser.timer -= dt; if (enemy.laser.state === 'charge') { enemy.laser.angle = angle; if (enemy.laser.timer <= 0) { enemy.laser.state = 'fire'; enemy.laser.timer = 1.8; } } else { enemy.laser.angle += dt * .6; const vx = Math.cos(enemy.laser.angle), vy = Math.sin(enemy.laser.angle), px = p.x - enemy.x, py = p.y - enemy.y, pd = Math.hypot(px, py) || 1; if ((px * vx + py * vy) / pd > .1 && Math.abs(px * vy - py * vx) / pd < .12) damagePlayer(enemy.damage * .34, enemy); if (enemy.laser.timer <= 0) enemy.laser = null; } }
  if (enemy.parts) enemy.parts.forEach((part, index) => { part.angle += dt * (.7 + index * .06); part.x = enemy.x + Math.cos(part.angle) * 112; part.y = enemy.y + Math.sin(part.angle) * 112; }); enemy.x = clamp(enemy.x, enemy.radius, WORLD_W - enemy.radius); enemy.y = clamp(enemy.y, enemy.radius, WORLD_H - enemy.radius); }
function updateProjectiles(dt) {
  for (const bullet of game.bullets) {
    bullet.life -= dt;
    if (bullet.type === 'homing') {
      const target = nearestEnemy(bullet.x, bullet.y);
      if (target) {
        const desired = Math.atan2(target.y - bullet.y, target.x - bullet.x);
        const turn = Math.atan2(Math.sin(desired - bullet.angle), Math.cos(desired - bullet.angle));
        bullet.angle += clamp(turn, -3.2 * game.bonus.homing * dt, 3.2 * game.bonus.homing * dt);
        bullet.vx = Math.cos(bullet.angle) * bullet.speed;
        bullet.vy = Math.sin(bullet.angle) * bullet.speed;
      }
    }
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (bullet.redWeapon && saveData.settings.redWeaponGlow && Math.random() < .42) particle(bullet.x, bullet.y, '#ffd46b', 1, 38, .3, 4);
    if (bullet.x < 0 || bullet.x > WORLD_W || bullet.y < 0 || bullet.y > WORLD_H) {
      if (bullet.bounces > 0) {
        if (bullet.x < 0 || bullet.x > WORLD_W) bullet.vx *= -1;
        if (bullet.y < 0 || bullet.y > WORLD_H) bullet.vy *= -1;
        bullet.x = clamp(bullet.x, 2, WORLD_W - 2);
        bullet.y = clamp(bullet.y, 2, WORLD_H - 2);
        bullet.bounces--;
      } else bullet.life = 0;
    }
    for (const enemy of game.enemies) if (enemy.hp > 0 && !bullet.hitIds.includes(enemy.id)) {
      const part = enemy.parts?.find(item => item.active && Math.hypot(item.x - bullet.x, item.y - bullet.y) < 14 + bullet.radius);
      if (part) { damagePart(enemy, part, bullet); break; }
      if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.radius + bullet.radius) {
        if (enemy.kind === 'reflect' && Math.random() < .3) {
          limitedPush(game.enemyBullets, { x: bullet.x, y: bullet.y, vx: -bullet.vx, vy: -bullet.vy, radius: bullet.radius, damage: bullet.damage * .65, life: 2, color: enemy.color, source: enemy }, MAX.enemyBullets);
          floating('反射', enemy.x, enemy.y - 25, '#ffb4d5'); bullet.life = 0; break;
        }
        bullet.hitIds.push(enemy.id);
        damageEnemy(enemy, bullet.damage, { fromPlayer: true, element: bullet.element, elements: bullet.elements, crit: bullet.crit, redWeapon: bullet.redWeapon });
        if (bullet.type === 'explosion') { explode(bullet.x, bullet.y, bullet.blast || 40, bullet.damage, bullet.color); bullet.life = 0; }
        if (bullet.type === 'arc') { arcFrom(enemy, bullet.chains || 2, bullet.damage, bullet.color); bullet.life = 0; }
        if (bullet.type === 'split') { splitBullet(bullet); bullet.life = 0; }
        if (game.bonus.bounceChance && Math.random() < game.bonus.bounceChance && !bullet.ricocheted) {
          const target = nearestEnemy(enemy.x, enemy.y, enemy);
          if (target) { bullet.ricocheted = true; bullet.angle = Math.atan2(target.y - enemy.y, target.x - enemy.x); bullet.vx = Math.cos(bullet.angle) * bullet.speed; bullet.vy = Math.sin(bullet.angle) * bullet.speed; bullet.life = 1; continue; }
        }
        if (game.bonus.recycleChance && Math.random() < game.bonus.recycleChance) { bullet.pierce = Math.max(1, bullet.pierce + 1); floating('碎弹回收', enemy.x, enemy.y - 20, '#8df2d5'); }
        else if (bullet.pierce-- <= 0) bullet.life = 0;
        break;
      }
    }
    if (bullet.life <= 0) splitBullet(bullet);
  }
  game.bullets = game.bullets.filter(item => item.life > 0);
  for (const bullet of game.enemyBullets) {
    bullet.life -= dt;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (Math.hypot(bullet.x - game.player.x, bullet.y - game.player.y) < bullet.radius + game.player.radius) {
      if (game.player.shieldTime > 0 && game.core.id === 'oct') {
        createBullet(bullet.x, bullet.y, Math.atan2(-bullet.vy, -bullet.vx), Math.hypot(bullet.vx, bullet.vy) * 1.1, bullet.damage * 1.2, 'line', { color: '#ffdc7a', element: 'lightning' });
        ring(bullet.x, bullet.y, '#ffdc7a', 18, .2);
      } else damagePlayer(bullet.damage, bullet.source);
      bullet.life = 0;
    }
  }
  game.enemyBullets = game.enemyBullets.filter(item => item.life > 0 && item.x > -30 && item.x < WORLD_W + 30 && item.y > -30 && item.y < WORLD_H + 30);
}
function splitBullet(bullet) { if (!bullet.splits || bullet.didSplit) return; bullet.didSplit = true; game.runStats.splitTriggers++; if (game.runStats.splitTriggers >= 30) awardAchievement('splitter-spreader'); for (let i = 0; i < Math.min(12, bullet.splits); i++) createBullet(bullet.x, bullet.y, bullet.angle + i * Math.PI * 2 / bullet.splits, bullet.speed * .76, bullet.damage * .48, 'line', { color: bullet.color, element: bullet.element, elements: bullet.elements, redWeapon: bullet.redWeapon }); }
function updateEffects(dt) { for (const zone of game.zones) { zone.life -= dt; for (const enemy of game.enemies) if (enemy.hp > 0 && Math.hypot(enemy.x - zone.x, enemy.y - zone.y) < zone.radius + enemy.radius) { enemy.slow = .22; if (game.bonus.webSlow) damageEnemy(enemy, 4 * dt, { fromPlayer: true, element: 'ice' }); } } game.zones = game.zones.filter(item => item.life > 0); for (const effect of game.effects) { effect.life -= dt; if (effect.type === 'trail') for (const enemy of game.enemies) if (enemy.hp > 0 && Math.hypot(enemy.x - effect.x, enemy.y - effect.y) < enemy.radius + effect.radius) damageEnemy(enemy, effect.damage * dt * 4, { fromPlayer: true }); if (effect.type === 'phase-trail') for (const enemy of game.enemies) if (enemy.hp > 0 && Math.hypot(enemy.x - effect.x, enemy.y - effect.y) < enemy.radius + effect.radius && !effect.hit[enemy.id]) { effect.hit[enemy.id] = true; damageEnemy(enemy, effect.damage, { fromPlayer: true }); } if (effect.type === 'beam') for (const enemy of game.enemies) { const dx = enemy.x - effect.x, dy = enemy.y - effect.y, along = dx * Math.cos(effect.angle) + dy * Math.sin(effect.angle), side = Math.abs(dx * Math.sin(effect.angle) - dy * Math.cos(effect.angle)); if (along > 0 && along < effect.range && side < enemy.radius + 8) damageEnemy(enemy, effect.damage * dt * 8, { fromPlayer: true, elements: effect.elements, crit: effect.crit, redWeapon: effect.redWeapon }); } if (effect.type === 'orbit') { effect.x = game.player.x; effect.y = game.player.y; for (let i = 0; i < effect.count; i++) { const a = game.elapsed * 7 + i * Math.PI * 2 / effect.count, x = effect.x + Math.cos(a) * 50, y = effect.y + Math.sin(a) * 50; for (const enemy of game.enemies) if (enemy.hp > 0 && Math.hypot(enemy.x - x, enemy.y - y) < enemy.radius + 10 && !effect.hit[enemy.id]) { effect.hit[enemy.id] = true; damageEnemy(enemy, effect.damage, { fromPlayer: true, elements: effect.elements, crit: effect.crit, redWeapon: effect.redWeapon }); } } } } game.effects = game.effects.filter(item => item.life > 0); for (const turret of game.turrets) { turret.life -= dt; turret.fire -= dt; if (turret.fire <= 0) { const target = nearestEnemy(turret.x, turret.y); if (target) { turret.fire = .42; createBullet(turret.x, turret.y, Math.atan2(target.y - turret.y, target.x - turret.x), 500, turret.damage, 'homing', { color: turret.color, elements: turret.elements, element: turret.elements?.[0], crit: turret.crit, redWeapon: turret.redWeapon }); } } } game.turrets = game.turrets.filter(item => item.life > 0); for (const p of game.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; } game.particles = game.particles.filter(item => item.life > 0); for (const f of game.floating) { f.life -= dt; f.y -= 24 * dt; } game.floating = game.floating.filter(item => item.life > 0); }
function updateDrops(dt) { if (game.practice) return; for (const drop of game.drops) { drop.life -= dt; const p = game.player, dx = p.x - drop.x, dy = p.y - drop.y, d = Math.hypot(dx, dy) || 1, collect = game.lootSettling || d < 86 * game.bonus.magnet; if (collect) { const speed = game.lootSettling ? 1750 : Math.min(620, 110 + 120 / Math.max(.2, d)), step = Math.min(d, speed * dt); drop.x += dx / d * step; drop.y += dy / d * step; } if (d < 18) { drop.life = 0; if (drop.type === 'coin') { const value = Math.ceil(drop.value * (1 + game.bonus.coinBonus)); game.coins += value; floating(`+${value} 碎片`, p.x, p.y - 45, '#ffe27a'); } else { game.inventory.push(drop.weapon); discoverWeapon(drop.weapon.name); floating(`获得 ${drop.weapon.name}`, p.x, p.y - 65, RARITIES[drop.weapon.rarity]); } playSound('pickup'); } } game.drops = game.drops.filter(item => item.life > 0); }
function finishReward() { const after = game.afterChoice; game.afterChoice = null; game.choiceKind = null; game.specialReward = null; after?.(); }
function replaceActiveWeapon(next) { const index = game.equipped[game.activeSlot] ? game.activeSlot : game.equipped.findIndex(Boolean); if (index < 0 || !next) return false; game.equipped[index] = next; return true; }
function specialRewardPool() {
  const weapon = currentWeapon();
  const choices = [
    { id: 'instant-coins', name: '即时碎片', desc: '立刻获得 18 碎片', color: '#ffe27a', apply: () => { game.coins += 18; } },
    { id: 'full-repair', name: '全修复', desc: '立即回复至满生命', color: '#72e6b4', apply: () => { game.player.hp = game.player.maxHp; } }
  ];
  if (game.relics.length < game.relicCapacity && getRelicChoices(1).length) choices.push({ id: 'relic-trial', name: '遗物试炼', desc: '从 6 枚遗物中选择 1 枚', color: '#ffca68', relicTrial: true });
  if (weapon && weapon.rarity !== '红') choices.push({ id: 'weapon-promotion', name: '重构机会', desc: `将 ${weapon.name} 进阶一档品质`, color: '#d997ff', apply: () => replaceActiveWeapon(promoteWeapon(weapon)) });
  if (weapon && weaponElements(weapon).length < 3) choices.push({ id: 'element-infusion', name: '元素淬炼', desc: `为 ${weapon.name} 附加一种新元素`, color: '#8de8ff', apply: () => replaceActiveWeapon(infuseWeapon(weapon)) });
  if (game.appliedUpgrades.length) choices.push({ id: 'upgrade-dismantle', name: '武器拆解', desc: '随机移除 1 项升级，获得 12 碎片', color: '#ff9c7a', apply: () => { const removed = removeRandomUpgrade(); game.coins += 12; if (removed) floating(`拆解：${removed.name}`, game.player.x, game.player.y - 60, '#ffbd8b'); } });
  return choices;
}
function rollSpecialReward() {
  const chance = Math.min(.5, .25 + Math.max(0, game.waveIndex + (game.chapter - 1) * 3) * .03);
  if (Math.random() >= chance) return null;
  const pool = specialRewardPool().filter(item => !game.shownSpecialIds.includes(item.id));
  if (!pool.length) return null;
  const choice = pick(pool);
  game.shownSpecialIds.push(choice.id);
  return choice;
}
function chooseReward(item) {
  if (game.choiceKind === 'relic' || game.choiceKind === 'special-relic') applyRelic(item);
  else if (game.choiceKind === 'special') {
    if (item.relicTrial) { game.choiceKind = 'special-relic'; game.relicChoices = getRelicChoices(6); return; }
    item.apply?.();
  } else applyUpgrade(item);
  playSound('upgrade');
  finishReward();
}
function rerollUpgradeChoices() {
  if (game.choiceKind !== 'upgrade' || game.upgradeRerolls >= 3 || game.coins < 8) return false;
  game.coins -= 8;
  game.upgradeRerolls++;
  const count = game.chapter === 1 ? 3 : 4;
  game.upgradeChoices = getUpgradeChoices(count, game.shownUpgradeIds);
  game.shownUpgradeIds.push(...game.upgradeChoices.map(item => item.id));
  game.specialReward = rollSpecialReward();
  playSound('purchase');
  return true;
}
function skipUpgradeReward() { if (game.choiceKind !== 'upgrade' || !saveData.settings.allowUpgradeSkip) return false; finishReward(); return true; }
function presentUpgrade(after) {
  game.choiceKind = 'upgrade';
  game.upgradeRerolls = 0;
  game.shownUpgradeIds = [];
  game.shownSpecialIds = [];
  game.upgradeChoices = getUpgradeChoices(game.chapter === 1 ? 3 : 4);
  game.shownUpgradeIds.push(...game.upgradeChoices.map(item => item.id));
  game.specialReward = rollSpecialReward();
  game.afterChoice = after;
  setState(ST.UPGRADE);
}
function presentRelic(after) { if (game.relics.length >= game.relicCapacity) return after(); game.choiceKind = 'relic'; game.relicChoices = getRelicChoices(); game.specialReward = null; game.afterChoice = after; setState(ST.UPGRADE); }
function restOrBattle() { const firstRest = !game.restRelicGranted[game.chapter]; if (firstRest) { game.restRelicGranted[game.chapter] = true; game.shop = createShop(); presentRelic(() => setState(ST.REST)); } else { game.shop = createShop(); setState(ST.REST); } }
function finishWave() {
  if (game.practice) { queueEnemy(game.practiceConfig.enemy, false, WORLD_W * .72, WORLD_H * .42); game.spawnTimer = 1; return; }
  if (!game.isBoss && game.chapter === 1 && game.waveDamageTaken === 0) awardAchievement('untouched-wave');
  if (game.isBoss) {
    if (game.chapter === 1 && game.equipped.every(weapon => weapon?.rarity === '红')) awardAchievement('red-fervor');
    if (game.mode === 'boss-rush') return presentRelic(() => presentUpgrade(() => { game.bossRushIndex++; if (game.bossRushIndex >= 3) finishRun(true); else { game.chapter = game.bossRushIndex + 1; startBattle(); } }));
    if (game.mode === 'endless') { saveData.stats.endlessBestWave = Math.max(saveData.stats.endlessBestWave || 0, game.endlessWave); writeSave(); return presentRelic(() => restOrBattle()); }
    return presentRelic(() => {
      if (game.chapter < 3) {
        game.lastChapterStats = { ...game.chapterStats, chapter: game.chapter };
        game.chapter++;
        game.waveIndex = 0;
        game.chapterStats = { kills: 0, damageTaken: 0, critHits: 0, playerHits: 0 };
        game.coins += 12;
        restOrBattle();
      } else { saveData.stats.clears = (saveData.stats.clears || 0) + 1; finishRun(true); }
    });
  }
  if (game.mode === 'endless') return presentUpgrade(() => { if (game.endlessWave % 3 === 0) restOrBattle(); else startBattle(); });
  game.waveIndex++;
  presentUpgrade(() => { if (game.waveIndex === 3 || game.waveIndex === 6) restOrBattle(); else startBattle(); });
}
function randomShopWeapon(pool, filter = null) {
  const candidates = pool.filter(item => !filter || filter(item));
  const lucky = candidates.filter(item => ['紫', '橙', '红'].includes(item.rarity));
  return pick(game.bonus.shopLucky && lucky.length && Math.random() < game.bonus.shopLucky ? lucky : (candidates.length ? candidates : pool));
}
function createShop() {
  const chapter = game.chapter;
  const theme = SHOP_THEMES[clamp(chapter - 1, 0, SHOP_THEMES.length - 1)];
  if (!game.chapterShopLocks[chapter]) {
    const pool = [...WEAPONS], locks = [];
    const themed = randomShopWeapon(pool, theme.filter); locks.push(themed); pool.splice(pool.indexOf(themed), 1);
    while (locks.length < 3) { const item = randomShopWeapon(pool); locks.push(item); pool.splice(pool.indexOf(item), 1); }
    game.chapterShopLocks[chapter] = locks;
    game.chapterShopSold[chapter] = {};
  }
  const locks = game.chapterShopLocks[chapter];
  const pool = WEAPONS.filter(item => !locks.includes(item));
  const opportunity = randomShopWeapon(pool);
  return [...locks.map(weapon => ({ ...weapon, shopLocked: true, shopSold: Boolean(game.chapterShopSold[chapter][weapon.name]), shopTheme: theme })), { ...opportunity, shopLocked: false, shopSold: false, shopTheme: theme }];
}
function finishRun(win) {
  if (!game.practice) {
    const mult = 1 + hangarLevel('salvage') * .1, comboReward = Math.floor(game.maxCombo / 10), reward = normalizeCoreAmount(Math.max(1, Math.round((win ? 24 : 4) + saveData.stats.kills * .02 + comboReward) * mult));
    saveData.cores = normalizeCoreAmount(saveData.cores + reward);
    if (game.mode === 'boss-rush' && win) { const best = saveData.stats.bossRushBestMs; if (!best || game.runElapsed * 1000 < best) saveData.stats.bossRushBestMs = Math.round(game.runElapsed * 1000); if (game.runElapsed < 90) awardAchievement('boss-rush-fast'); }
    if (win && game.mode === 'expedition' && game.chapter === 3) {
      awardAchievement('prism-master');
      if (['fire', 'ice', 'lightning'].every(element => weaponCollection().some(weapon => weaponElements(weapon).includes(element)))) awardAchievement('elementalist');
    }
    if (win && saveData.settings.cheatMode) awardAchievement('cheat-clear');
    recordRun(win, { farthestWave: game.runStats.farthestWave });
    writeSave();
    const buildCode = `GD4|${game.mode}|${game.core.id}|${game.equipped.filter(Boolean).map(item => item.baseName || item.name).join(',')}|${game.appliedUpgrades.join(',')}|${game.relics.map(item => item.id).join(',')}`;
    game.result = { win, reward, combo: game.maxCombo, mode: game.mode, stats: { ...game.runStats }, weapons: [...game.equipped], upgrades: [...game.appliedUpgrades], relics: [...game.relics], buildCode };
  } else game.result = { win: true, reward: 0, practice: true };
  mouse.down = false;
  setState(ST.RESULT);
}
function update(dt) { if (game.state === ST.PAUSE) return; game.elapsed += dt; game.flash = Math.max(0, game.flash - dt); game.critPulse = Math.max(0, game.critPulse - dt); game.redCritCooldown = Math.max(0, game.redCritCooldown - dt); if (game.tip) { game.tip.life -= dt; if (game.tip.life <= 0) game.tip = null; } if (game.achievementNotice) { game.achievementNotice.life -= dt; if (game.achievementNotice.life <= 0) game.achievementNotice = null; } if (!activeCombat()) return; game.runElapsed += dt; game.bonus.batteryTime = Math.max(0, game.bonus.batteryTime - dt); updatePlayer(dt); updateCamera(dt); game.spawnTimer -= dt; if (game.spawnTimer <= 0 && game.spawnQueue.length) { for (const entry of game.spawnQueue) { const enemy = makeEnemy(entry); if (enemy) game.enemies.push(enemy); } game.spawnQueue = []; } for (const enemy of game.enemies) updateEnemy(enemy, dt); game.enemies = game.enemies.filter(enemy => enemy.hp > 0); updateProjectiles(dt); updateEffects(dt); updateDrops(dt); if (!game.spawnQueue.length && !game.enemies.length) { if (!game.lootSettling) { game.lootSettling = true; game.lootSettleTimer = .22; for (const drop of game.drops) drop.life = Math.max(drop.life, 2); } if (!game.drops.length) { game.lootSettleTimer -= dt; if (game.lootSettleTimer <= 0) { game.lootSettling = false; finishWave(); } } } game.screenShake = Math.max(0, game.screenShake - dt * 18); }

function font(size, weight = 600) { ctx.font = `${weight} ${size}px "Segoe UI", "Microsoft YaHei", sans-serif`; }
function text(value, x, y, size = 16, color = '#fff', align = 'center') { ctx.save(); font(size); ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(value, x, y); ctx.restore(); }
function wrappedText(value, x, y, maxWidth, size = 12, color = '#fff', maxLines = 3, lineHeight = 16, align = 'center') {
  ctx.save(); font(size); ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
  const lines = [], chars = [...String(value || '')]; let lineValue = '';
  for (const char of chars) {
    const candidate = lineValue + char;
    if (lineValue && ctx.measureText(candidate).width > maxWidth) { lines.push(lineValue); lineValue = char; } else lineValue = candidate;
  }
  if (lineValue) lines.push(lineValue);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) visible[maxLines - 1] = `${visible[maxLines - 1].slice(0, Math.max(0, visible[maxLines - 1].length - 1))}…`;
  const first = y - (visible.length - 1) * lineHeight / 2;
  visible.forEach((lineValue, index) => ctx.fillText(lineValue, x, first + index * lineHeight));
  ctx.restore();
}
function line(x1, y1, x2, y2, color, width = 1, alpha = 1) { ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
function panel(x, y, w, h, stroke = '#2b5c85', fill = 'rgba(5,12,30,.88)') { ctx.save(); ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); ctx.strokeStyle = stroke; ctx.lineWidth = 1.25; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1); const cut = Math.min(10, Math.min(w, h) / 3); line(x, y + cut, x + cut, y, stroke, 2.5, .9); line(x + w - cut, y, x + w, y + cut, stroke, 2.5, .9); line(x, y + h - cut, x + cut, y + h, stroke, 2.5, .9); line(x + w - cut, y + h, x + w, y + h - cut, stroke, 2.5, .9); ctx.restore(); }
function button(label, x, y, w, h, action, color = '#63d6ff', enabled = true) { const hover = mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h; panel(x, y, w, h, enabled ? (hover ? color : `${color}99`) : '#354054', hover && enabled ? 'rgba(30,76,112,.86)' : 'rgba(8,15,33,.84)'); text(label, x + w / 2, y + h / 2, 14, enabled ? '#f1fbff' : '#667188'); if (enabled) uiButtons.push({ x, y, w, h, action }); }
function applyAudioSlider(key, value) { updateAudioSettings({ [key]: value }); if (performance.now() - lastSliderPreview > 110) { lastSliderPreview = performance.now(); playSound('purchase'); } }
function slider(label, x, y, value, color, apply) { const width = 260, knobX = x + width * value; text(`${label} ${Math.round(value * 100)}%`, x, y - 10, 13, '#dbeaff', 'left'); panel(x, y, width, 14, color, '#10192b'); ctx.fillStyle = color; ctx.fillRect(x + 2, y + 2, Math.max(0, width * value - 2), 10); ctx.save(); ctx.fillStyle = '#effbff'; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(knobX, y + 7, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); uiButtons.push({ type: 'slider', x, y: y - 10, w: width, h: 34, action: px => apply(clamp((px - x) / width, 0, 1)) }); }
function polygon(x, y, radius, sides, color, rotation = 0, fill = true) { ctx.save(); if (!sides) { ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); } else { ctx.translate(x, y); ctx.rotate(rotation); ctx.beginPath(); for (let i = 0; i < sides; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / sides, px = Math.cos(a) * radius, py = Math.sin(a) * radius; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); } ctx.fillStyle = color; ctx.strokeStyle = '#e7faff'; ctx.lineWidth = 1.5; ctx.shadowColor = color; ctx.shadowBlur = 12; if (fill) { ctx.globalAlpha = .84; ctx.fill(); } ctx.globalAlpha = 1; ctx.stroke(); ctx.restore(); }
function drawBackground() { const theme = game.mode === 'boss-rush' && game.isBoss ? 'boss' : chapterData().theme; const cyan = theme === 'data' ? '#ff7eb9' : theme === 'crystal' ? '#d38aff' : '#60e7ff', accent = theme === 'crystal' ? '#ffc15a' : '#f47dca'; ctx.fillStyle = theme === 'crystal' ? '#180717' : theme === 'data' ? '#130615' : '#030918'; ctx.fillRect(0, 0, W, H); for (let i = 0; i < 42; i++) { const x = (i * 137 + 71) % W, y = (i * 83 + 37) % H; ctx.globalAlpha = .2; ctx.fillStyle = i % 5 ? cyan : accent; ctx.fillRect(x, y, 2 + i % 3, 2 + i % 3); } ctx.globalAlpha = 1; if (theme !== 'boss') { const horizon = H * .62; for (let i = 0; i <= 14; i++) { const t = i / 14; line(0, horizon + t * t * (H - horizon), W, horizon + t * t * (H - horizon), cyan, 1, .14 + t * .16); } for (let i = -10; i <= 10; i++) line(W / 2, horizon, W / 2 + i * 118, H, accent, 1, .16); } if (theme === 'crystal') for (let i = 0; i < 12; i++) polygon(80 + i * 78, 90 + (i % 3) * 50, 10 + i % 4 * 4, 4, i % 2 ? accent : cyan, game.elapsed * .3, true); const sweep = (game.elapsed * 104) % (W + 180) - 90; line(sweep, 18, sweep + 150, H - 18, accent, 1.5, .22); ctx.strokeStyle = cyan; ctx.strokeRect(8, 8, W - 16, H - 16); ctx.strokeStyle = accent; ctx.strokeRect(17, 17, W - 34, H - 34); }
function drawHp(entity, boss = false) { const w = boss ? 150 : 42, x = entity.x - w / 2, y = entity.y - entity.radius - 14; ctx.fillStyle = '#111827'; ctx.fillRect(x, y, w, 5); ctx.fillStyle = entity.elite ? '#f5bd68' : entity.color; ctx.fillRect(x, y, w * Math.max(0, entity.hp / entity.maxHp), 5); if (boss) { for (let i = 1; i < 3; i++) line(x + w * i / 3, y, x + w * i / 3, y + 5, '#120614', 1); } }
function drawWorld() {
  ctx.save();
  if (game.critPulse > 0) { const scale = 1 + .05 * (game.critPulse / .1); ctx.translate(W / 2, H / 2); ctx.scale(scale, scale); ctx.translate(-W / 2, -H / 2); }
  if (game.screenShake) ctx.translate(rand(-game.screenShake, game.screenShake), rand(-game.screenShake, game.screenShake));
  ctx.translate(-game.camera.x, -game.camera.y);
  ctx.strokeStyle = 'rgba(111, 220, 255, .45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, WORLD_W - 2, WORLD_H - 2);
  for (const zone of game.zones) { ctx.globalAlpha = zone.life / zone.maxLife; ctx.strokeStyle = zone.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2); ctx.stroke(); }
  for (const e of game.effects) {
    ctx.globalAlpha = e.life / e.maxLife;
    if (e.type === 'ring' || e.type === 'trail' || e.type === 'phase-trail') { ctx.strokeStyle = e.color || '#b98cff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.stroke(); }
    if (e.type === 'hook' && e.target.hp > 0) line(e.from.x, e.from.y, e.target.x, e.target.y, e.color, 2, e.life / e.maxLife);
    if (e.type === 'arc') line(e.x1, e.y1, e.x2, e.y2, e.color, 3, e.life / e.maxLife);
    if (e.type === 'beam') line(e.x, e.y, e.x + Math.cos(e.angle) * e.range, e.y + Math.sin(e.angle) * e.range, e.color, 7, e.life / e.maxLife);
    if (e.type === 'orbit') for (let i = 0; i < e.count; i++) { const a = game.elapsed * 7 + i * Math.PI * 2 / e.count; polygon(e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 50, 8, 4, e.color, a); }
  }
  ctx.globalAlpha = 1;
  for (const turret of game.turrets) polygon(turret.x, turret.y, 13, 6, turret.color, game.elapsed, false);
  for (const d of game.drops) polygon(d.x, d.y, d.type === 'coin' ? 6 : 9, d.type === 'coin' ? 6 : 4, d.type === 'coin' ? '#ffe27a' : RARITIES[d.weapon.rarity], game.elapsed * 2);
  for (const b of game.bullets) line(b.x - b.vx * .025, b.y - b.vy * .025, b.x, b.y, b.color, b.radius * .9);
  for (const b of game.enemyBullets) { ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); }
  for (const enemy of game.enemies) {
    ctx.save(); if (enemy.kind === 'stealth' && enemy.reveal <= 0) ctx.globalAlpha = .28;
    polygon(enemy.x, enemy.y, enemy.radius, enemy.sides || 4, enemy.hit > 0 ? '#fff' : enemy.color, game.elapsed * (enemy.boss ? .6 : .25)); ctx.restore();
    drawHp(enemy, enemy.boss);
    if (enemy.elite) { ctx.strokeStyle = '#f5bd68'; ctx.strokeRect(enemy.x - enemy.radius - 4, enemy.y - enemy.radius - 4, (enemy.radius + 4) * 2, (enemy.radius + 4) * 2); text('精英', enemy.x, enemy.y - enemy.radius - 27, 10, '#ffe19c'); }
    if (enemy.maxShieldHp && enemy.shieldHp > 0) line(enemy.x, enemy.y, enemy.x + Math.cos(enemy.facing) * (enemy.radius + 12), enemy.y + Math.sin(enemy.facing) * (enemy.radius + 12), '#7ee8ff', 7, .8);
    if (enemy.status) text(enemy.status === 'fire' ? '火' : enemy.status === 'ice' ? '冰' : '雷', enemy.x, enemy.y - enemy.radius - 25, 11, ELEMENTS[enemy.status]);
    if (enemy.redMark?.until > game.elapsed) { line(enemy.x - 7, enemy.y - 7, enemy.x + 7, enemy.y + 7, '#ff5876', 2, .9); line(enemy.x - 7, enemy.y + 7, enemy.x + 7, enemy.y - 7, '#ff5876', 2, .9); }
    if (enemy.freeze > 0) text('冻', enemy.x, enemy.y - enemy.radius - 25, 11, '#a8f5ff');
    if (enemy.parts) for (const part of enemy.parts) if (part.active) { polygon(part.x, part.y, 10, 4, '#ffca71', game.elapsed); drawHp({ ...part, radius: 10 }, false); }
    if (enemy.laser) line(enemy.x, enemy.y, enemy.x + Math.cos(enemy.laser.angle) * 1300, enemy.y + Math.sin(enemy.laser.angle) * 1300, enemy.laser.state === 'fire' ? '#ff3b7a' : '#ffb4d5', enemy.laser.state === 'fire' ? 10 : 3, .7);
  }
  const p = game.player;
  if (p) {
    if (p.shieldTime > 0) { ctx.strokeStyle = game.core.id === 'oct' ? '#ffcf74' : '#76aaff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, Math.PI * 2); ctx.stroke(); }
    polygon(p.x, p.y, p.radius, game.core.shape, p.hitFlash > 0 ? '#fff' : p.color, p.facing + Math.PI / 4);
    line(p.x, p.y, p.x + Math.cos(p.facing) * 19, p.y + Math.sin(p.facing) * 19, '#fff', 2);
  }
  for (const q of game.spawnQueue) { ctx.strokeStyle = q.boss ? '#ff74b6' : q.elite ? '#f5bd68' : '#6fdcff'; ctx.globalAlpha = .6; ctx.beginPath(); ctx.arc(q.x, q.y, q.radius + 12, 0, Math.PI * 2); ctx.stroke(); }
  for (const p of game.particles) { ctx.globalAlpha = p.life / p.maxLife; polygon(p.x, p.y, p.size, p.shape, p.color, game.elapsed, true); }
  ctx.restore();
}
function drawMinimap() {
  const x = W - 184, y = 18, w = 166, h = 104, pad = 7, mapX = x + pad, mapY = y + 15, mapW = w - pad * 2, mapH = h - 22;
  panel(x, y, w, h, '#5d96bb', 'rgba(4, 14, 31, .9)');
  text('小地图', x + 10, y + 9, 10, '#d9f7ff', 'left');
  ctx.save();
  ctx.beginPath(); ctx.rect(mapX, mapY, mapW, mapH); ctx.clip();
  ctx.fillStyle = '#09152a'; ctx.fillRect(mapX, mapY, mapW, mapH);
  const toX = value => mapX + value / WORLD_W * mapW;
  const toY = value => mapY + value / WORLD_H * mapH;
  ctx.strokeStyle = '#6ea8c7'; ctx.lineWidth = 1; ctx.strokeRect(mapX + .5, mapY + .5, mapW - 1, mapH - 1);
  ctx.strokeStyle = '#f0e29c'; ctx.strokeRect(toX(game.camera.x), toY(game.camera.y), W / WORLD_W * mapW, H / WORLD_H * mapH);
  for (const enemy of game.enemies) if (enemy.hp > 0) { ctx.fillStyle = enemy.boss ? '#ff5d88' : '#ffbd6b'; ctx.beginPath(); ctx.arc(toX(enemy.x), toY(enemy.y), enemy.boss ? 3.2 : 1.5, 0, Math.PI * 2); ctx.fill(); }
  if (game.player) { ctx.fillStyle = game.player.color; ctx.beginPath(); ctx.arc(toX(game.player.x), toY(game.player.y), 2.8, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function drawHud() {
  const p = game.player, weapon = currentWeapon();
  if (!p) return;
  panel(18, 18, 270, saveData.settings.cheatMode ? 82 : 62);
  text(game.practice ? '练习场 · 玩家生命 ∞' : `${game.core.name} ${Math.ceil(p.hp)}/${p.maxHp}`, 31, 35, 14, game.core.color, 'left');
  ctx.fillStyle = '#172137'; ctx.fillRect(31, 49, 240, 12);
  ctx.fillStyle = game.core.color; ctx.fillRect(31, 49, 240 * clamp(p.hp / p.maxHp, 0, 1), 12);
  text(`碎片 ${game.coins}  连击 ${game.combo}  x${(1 + Math.min(10, Math.floor(game.combo / 10)) * .05).toFixed(2)}`, 31, 70, 12, '#ffe27a', 'left');
  if (saveData.settings.cheatMode) text('赖皮模式', 31, 90, 13, '#ff5b70', 'left');
  const label = game.mode === 'endless' ? `无限波次 ${game.endlessWave}` : game.mode === 'boss-rush' ? `BOSS RUSH ${game.bossRushIndex + 1}/3` : `第 ${game.chapter} 章 · ${game.isBoss ? 'BOSS' : `${game.waveIndex + 1}/9`}`;
  text(game.lootSettling ? '战利品回收中' : label, W / 2, 31, 18, game.lootSettling ? '#ffe28a' : '#e9f8ff');
  drawMinimap();
  panel(W - 275, 132, 257, 62);
  text(weapon ? `${weapon.name}  [${weapon.tags.join('/')}]` : '未装备武器', W - 260, 149, 13, weapon ? RARITIES[weapon.rarity] : '#8895a7', 'left');
  text(`${inputLabel(bindingFor('swap'))} 换武器 · ${inputLabel(bindingFor('autoFire'))} 自动 ${game.autoFire ? '开' : '关'} · ${inputLabel(bindingFor('build'))} Build`, W - 260, 175, 11, game.autoFire ? '#73f2b5' : '#a6b3c8', 'left');
  const skills = [['右键 冲刺', p.dashCd], ['Q 鱼钩', p.hookCd], ['E 蛛网', p.webCd], ['F 护盾', p.shieldCd]];
  skills.forEach((entry, i) => { const x = W / 2 - 142 + i % 2 * 146, y = H - 64 + Math.floor(i / 2) * 26; panel(x, y, 138, 22, entry[1] > 0 ? '#3d4f68' : '#447e9a'); text(entry[1] > 0 ? `${entry[0]} ${entry[1].toFixed(1)}s` : entry[0], x + 69, y + 11, 11, entry[1] > 0 ? '#7f8aa0' : '#dff8ff'); });
  if (game.tip) { ctx.globalAlpha = game.tip.life / game.tip.maxLife; panel(W / 2 - 240, H - 106, 480, 24, '#78dfff', 'rgba(4,14,31,.9)'); text(game.tip.text, W / 2, H - 94, 12, '#dff8ff'); ctx.globalAlpha = 1; }
  if (game.achievementNotice) { ctx.globalAlpha = game.achievementNotice.life / game.achievementNotice.maxLife; panel(W / 2 - 190, 48, 380, 28, '#ffe27a', 'rgba(33,20,8,.92)'); text(game.achievementNotice.text, W / 2, 62, 13, '#fff0b0'); ctx.globalAlpha = 1; }
  for (const f of game.floating) { ctx.globalAlpha = f.life / f.maxLife; text(f.text, f.x - game.camera.x, f.y - game.camera.y, 14, f.color); }
  ctx.globalAlpha = 1;
}
function drawBuildPanel(compact = false) { const x = compact ? W / 2 - 190 : W / 2 - 260, y = compact ? H / 2 - 42 : 90, w = compact ? 380 : 520, h = compact ? 120 : 330; panel(x, y, w, h, '#7fe2ff', 'rgba(3,9,23,.94)'); text('当前构型', x + w / 2, y + 24, 20, '#effaff'); const weapons = game.equipped.map((item, i) => `槽${i + 1}：${item ? item.name : '空'}`).join('   '); text(weapons, x + 18, y + 55, 13, '#dbeaff', 'left'); text(`升级：${(game.appliedUpgrades || []).join('、') || '无'}`, x + 18, y + 82, 12, '#a9c3e1', 'left'); text(`遗物：${game.relics.map(item => item.name).join('、') || '无'}  (${game.relics.length}/${game.relicCapacity})`, x + 18, y + 108, 12, '#ffe39a', 'left'); if (!compact) { text(`标签：${weaponCollection().flatMap(item => item.tags).join(' / ') || '无'}`, x + 18, y + 138, 12, '#8df2d5', 'left'); text(`最高连击 ${game.maxCombo} · 复活 ${game.bonus.revives}`, x + 18, y + 165, 12, '#c8b4ff', 'left'); text('按住 Tab 查看，Esc 暂停后完全冻结', x + w / 2, y + h - 22, 12, '#8fa4bc'); } }
function drawTitle() {
  const cx = W / 2, last = saveData.lastRun;
  polygon(cx, 108, 72, 6, '#60e7ff', game.elapsed * .22, false); polygon(cx, 108, 48, 3, '#f47dca', -game.elapsed * .36, false); polygon(cx, 108, 26, 4, '#ffc65a', game.elapsed * .58, true);
  text('几何决斗', cx, 194, 48, '#f3fbff'); text('PRISM  //  EXPEDITION', cx, 228, 13, '#ffc65a');
  button('开始远征', cx - 135, 252, 270, 34, () => { game.pendingMode = 'expedition'; setState(ST.CORE_SELECT); }, '#60e7ff');
  button('Boss Rush', cx - 135, 298, 128, 30, () => { game.pendingMode = 'boss-rush'; setState(ST.CORE_SELECT); }, '#f47dca');
  button(saveData.stats.clears > 0 ? '无限模式' : '无限模式 · 通关第3章解锁', cx + 7, 298, 128, 30, () => { game.pendingMode = 'endless'; setState(ST.CORE_SELECT); }, '#ffca68', saveData.stats.clears > 0);
  button('无敌练习场', cx - 135, 340, 128, 30, () => { game.core = CORES[0]; setState(ST.PRACTICE_CONFIG); }, '#65e8af'); button('几何机库', cx + 7, 340, 128, 30, () => setState(ST.HANGAR), '#c48bff');
  button('图鉴', cx - 135, 382, 62, 28, () => setState(ST.CODEX), '#ffc65a'); button('成就', cx - 67, 382, 62, 28, () => setState(ST.ACHIEVEMENTS), '#ffe27a'); button('设置', cx + 1, 382, 62, 28, () => setState(ST.SETTINGS), '#7fe2ff'); button('操作', cx + 69, 382, 66, 28, () => setState(ST.HELP), '#65e8af');
  button(`赖皮模式：${saveData.settings.cheatMode ? '开' : '关'}`, cx - 135, 420, 270, 28, () => { saveData.settings.cheatMode = !saveData.settings.cheatMode; writeSave(); }, saveData.settings.cheatMode ? '#ff5c70' : '#71839e');
  text(`核心 ${formatCoreAmount(saveData.cores)} · 无限最高 ${saveData.stats.endlessBestWave || 0} 波 · 成就 ${achievementProgress()}/${ACHIEVEMENTS.length}`, cx, 466, 13, '#ffe28a');
  if (last) text(`上次游戏：${last.mode} · ${last.core || last.coreId} · 最远 ${last.farthestWave || 1} 波`, cx, 488, 12, last.win ? '#79efb4' : '#c2ccda');
  if (saveData.stats.bossRushBestMs) text(`Boss Rush 最佳 ${(saveData.stats.bossRushBestMs / 1000).toFixed(1)} 秒`, cx, 510, 12, '#e2c5ff');
}
function drawCoreSelect() { text(`选择几何核心 · ${game.pendingMode === 'boss-rush' ? 'Boss Rush' : game.pendingMode === 'endless' ? '无限模式' : '远征'}`, W / 2, 45, 27, '#eff9ff'); CORES.forEach((core, i) => { const row = i < 3 ? 0 : 1, col = row ? i - 3 : i, x = row ? 255 + col * 230 : 135 + col * 230, y = row ? 300 : 92, unlocked = isCoreUnlocked(core.id); panel(x, y, 200, 175, unlocked ? core.color : '#4a556b'); polygon(x + 100, y + 42, 23, core.shape, unlocked ? core.color : '#566176', .2); text(core.name, x + 100, y + 77, 16, unlocked ? core.color : '#718096'); text(`生命 ${core.maxHp} · 速度 ${core.speed}`, x + 100, y + 103, 11, '#d7e2f5'); text(core.passive, x + 100, y + 125, 10, '#b0bed2'); button(unlocked ? '以此出战' : `机库解锁 ${core.unlockCost}`, x + 20, y + 143, 160, 24, () => { if (unlocked) startExpedition(core.id); else unlockCore(core.id); }, unlocked ? core.color : '#ffca68'); }); button('返回', 28, 492, 100, 26, () => setState(ST.TITLE), '#71839e'); }
function drawReward() {
  const relic = game.choiceKind === 'relic' || game.choiceKind === 'special-relic';
  const specialRelic = game.choiceKind === 'special-relic';
  const baseChoices = relic ? game.relicChoices : game.choiceKind === 'special' ? [game.specialReward] : game.upgradeChoices;
  const choices = game.choiceKind === 'upgrade' && game.specialReward ? [...baseChoices, game.specialReward] : baseChoices.filter(Boolean);
  const heading = specialRelic ? '遗物试炼' : game.choiceKind === 'special' ? '选择一项特殊奖励' : relic ? '选择一枚遗物' : '选择一项构型升级';
  text(heading, W / 2, 52, 29, '#f6fbff');
  text(specialRelic ? '从随机的 6 枚遗物中选择 1 枚' : relic ? `遗物 ${game.relics.length}/${game.relicCapacity}` : `下一波：${nextEncounterLabel()}`, W / 2, 82, 13, '#a8bad0');
  const columns = specialRelic ? 3 : choices.length > 4 ? 5 : choices.length;
  const cardW = specialRelic ? 240 : choices.length > 4 ? 172 : choices.length === 4 ? 190 : 218;
  const cardH = specialRelic ? 150 : 194;
  const gap = specialRelic ? 18 : 14;
  const rows = specialRelic ? 2 : 1;
  const total = columns * cardW + (columns - 1) * gap;
  const left = (W - total) / 2;
  choices.forEach((item, i) => {
    const col = i % columns, row = Math.floor(i / columns), x = left + col * (cardW + gap), y = specialRelic ? 118 + row * 168 : 130;
    const isSpecial = item.id && !UPGRADES.some(upgrade => upgrade.id === item.id) && !game.relicChoices.includes(item);
    const color = isSpecial ? item.color || '#ffca68' : relic ? '#ffc65a' : '#70d7ff';
    panel(x, y, cardW, cardH, color);
    text(item.name, x + cardW / 2, y + 37, specialRelic ? 17 : 18, isSpecial ? color : relic ? '#ffe3a0' : '#e8faff');
    wrappedText(item.desc, x + cardW / 2, y + 88, cardW - 26, 12, '#b9c9dc', specialRelic ? 2 : 3, 15);
    button('选择', x + 18, y + cardH - 46, cardW - 36, 30, () => chooseReward(item), color);
  });
  if (game.choiceKind === 'upgrade') {
    const rerollEnabled = game.coins >= 8 && game.upgradeRerolls < 3;
    button(`重抽 8 碎片 (${game.upgradeRerolls}/3)`, W / 2 - 185, 404, 180, 30, rerollUpgradeChoices, '#70d7ff', rerollEnabled);
    button('跳过本轮升级', W / 2 + 5, 404, 180, 30, skipUpgradeReward, '#71839e', saveData.settings.allowUpgradeSkip);
    text(`本局升级 ${game.appliedUpgrades.length} · 遗物 ${game.relics.length}/${game.relicCapacity} · 暴击 ${Math.round((game.bonus.crit + (currentWeapon()?.rarity === '红' ? .15 : 0)) * 100)}%`, W / 2, 456, 12, '#c8d9ed');
  }
}
function adjustedPrice(weapon) { return Math.max(1, Math.ceil(weapon.price * (1 - game.bonus.shopDiscount - hangarLevel('shop-discount') * .1))); }
function drawRest() { text(game.chapter > 1 && game.waveIndex === 0 ? '章节整备区' : '休息区', W / 2, 34, 27, '#f5fbff'); text(`碎片 ${game.coins} · 当前生命 ${Math.ceil(game.player.hp)}/${game.player.maxHp}`, W / 2, 59, 13, '#ffe27a'); button('修复 30% · 8', 36, 78, 170, 30, () => { if (game.coins >= 8) { game.coins -= 8; game.player.hp = Math.min(game.player.maxHp, game.player.hp + game.player.maxHp * .3); playSound('purchase'); } }, '#64e6ae', game.coins >= 8); button('刷新 · 6', 220, 78, 130, 30, () => { if (game.coins >= 6) { game.coins -= 6; game.shop = createShop(); } }, '#70caff', game.coins >= 6); panel(365, 78, 285, 30, '#a8cdf2'); text(`装备1 ${game.equipped[0]?.name || '空'}   装备2 ${game.equipped[1]?.name || '空'}`, 508, 93, 12, '#dff5ff'); button('继续战斗', 704, 78, 220, 30, () => startBattle(), '#ff9cc8'); text('商店武器', 42, 132, 16, '#dfefff', 'left'); game.shop.forEach((weapon, i) => { const x = 38 + i * 230, cost = adjustedPrice(weapon); panel(x, 148, 210, 102, RARITIES[weapon.rarity]); text(weapon.name, x + 105, 173, 15, RARITIES[weapon.rarity]); text(weapon.desc, x + 105, 198, 11, '#b6c5d8'); button(`购买 ${cost}`, x + 25, 216, 160, 24, () => { if (game.coins >= cost) { game.coins -= cost; game.inventory.push(weapon); discoverWeapon(weapon.name); game.shop.splice(i, 1); playSound('purchase'); } }, RARITIES[weapon.rarity], game.coins >= cost); }); text('背包 · 所有武器均可装备或出售', 42, 278, 16, '#dfefff', 'left'); const pageSize = 4, pages = Math.max(1, Math.ceil(game.inventory.length / pageSize)), page = clamp(game.inventoryPage, 0, pages - 1); game.inventoryPage = page; game.inventory.slice(page * pageSize, page * pageSize + pageSize).forEach((weapon, i) => { const y = 300 + i * 38; text(`${weapon.name}  ${weapon.damage}伤害  ${weapon.tags.join('/')}`, 44, y + 13, 12, RARITIES[weapon.rarity], 'left'); button('槽1', 566, y, 58, 25, () => game.equipped[0] = weapon, '#69cfff'); button('槽2', 634, y, 58, 25, () => game.equipped[1] = weapon, '#b78dff'); button(`出售 +${Math.ceil(weapon.price / 2)}`, 704, y, 104, 25, () => { game.coins += Math.ceil(weapon.price / 2); game.equipped = game.equipped.map(item => item === weapon ? null : item); game.inventory.splice(game.inventory.indexOf(weapon), 1); }, '#ffad6f'); }); button('◀', 836, 310, 36, 24, () => game.inventoryPage = Math.max(0, page - 1), '#71839e', page > 0); button('▶', 878, 310, 36, 24, () => game.inventoryPage = Math.min(pages - 1, page + 1), '#71839e', page < pages - 1); text(`${page + 1}/${pages}`, 875, 350, 12, '#b6c6da'); text(`遗物：${game.relics.map(item => item.name).join('、') || '无'}`, 42, 480, 12, '#ffe39a', 'left'); }
function drawPracticeConfig() { const cfg = game.practiceConfig, kinds = Object.keys(ENEMIES).filter(id => !ENEMIES[id].boss); text('无敌练习场', W / 2, 42, 29, '#78e9ff'); text('调整敌人参数与技能开关；玩家生命无限', W / 2, 69, 13, '#a5b6cf'); text(`训练核心：${game.core?.name || CORES[0].name}`, 90, 112, 15, game.core?.color || '#fff', 'left'); button('切换核心', 300, 96, 120, 28, () => { const index = (CORES.indexOf(game.core) + 1) % CORES.length; game.core = CORES[index]; }, '#68d5ff'); text(`敌人：${ENEMIES[cfg.enemy].name}`, 90, 150, 15, ENEMIES[cfg.enemy].color, 'left'); button('切换敌人', 300, 134, 120, 28, () => cfg.enemy = kinds[(kinds.indexOf(cfg.enemy) + 1) % kinds.length], '#fb9dbf'); [['生命','hp',60,1000,20],['速度','speed',.4,2.4,.1],['攻击','damage',0,3,.1],['攻击间隔','cooldown',.35,2.5,.1]].forEach((row, i) => { const y = 198 + i * 40; text(`${row[0]}：${cfg[row[1]].toFixed(row[1] === 'hp' ? 0 : 1)}`, 110, y + 12, 14, '#dbe8f9', 'left'); button('−', 330, y, 30, 24, () => cfg[row[1]] = clamp(cfg[row[1]] - row[4], row[2], row[3]), '#7797bd'); button('+', 366, y, 30, 24, () => cfg[row[1]] = clamp(cfg[row[1]] + row[4], row[2], row[3]), '#7797bd'); }); [['远程','ranged'],['冲锋','charge'],['分裂','split'],['自爆','explode'],['召唤','summon'],['护盾','shield']].forEach((item, i) => button(`${item[0]}：${cfg[item[1]] ? '开' : '关'}`, 510 + i % 2 * 155, 195 + Math.floor(i / 2) * 42, 140, 27, () => cfg[item[1]] = !cfg[item[1]], cfg[item[1]] ? '#64e6ae' : '#7d8494')); button('开始练习', W / 2 - 120, 432, 240, 38, () => startPractice(), '#58e4b0'); button('返回标题', 42, 488, 100, 26, () => setState(ST.TITLE), '#74859c'); }
function drawHangar() { const pageSize = 6, pages = Math.ceil(HANGAR_NODES.length / pageSize), page = clamp(game.hangarPage, 0, pages - 1); game.hangarPage = page; text('几何机库', W / 2, 36, 29, '#eaf8ff'); text(`核心储备：${formatCoreAmount(saveData.cores)}  ·  核心解锁与永久构架`, W / 2, 63, 14, '#ffe27a'); HANGAR_NODES.slice(page * pageSize, page * pageSize + pageSize).forEach((node, i) => { const x = 68 + i % 3 * 302, y = 95 + Math.floor(i / 3) * 178, level = hangarLevel(node.id), cost = node.cost * (level + 1); panel(x, y, 270, 142, '#496f9d'); text(node.name, x + 135, y + 28, 17, '#dff3ff'); text(node.desc, x + 135, y + 58, 12, '#b6c6da'); text(`等级 ${level}/${node.max}`, x + 135, y + 84, 13, '#f8dc85'); button(level >= node.max ? '已满级' : `升级 ${cost}`, x + 42, y + 103, 186, 27, () => purchaseHangar(node.id), '#77dfff', level < node.max && saveData.cores >= cost); }); button('◀', 760, 470, 48, 28, () => game.hangarPage = Math.max(0, page - 1), '#71839e', page > 0); button('▶', 816, 470, 48, 28, () => game.hangarPage = Math.min(pages - 1, page + 1), '#71839e', page < pages - 1); text(`${page + 1}/${pages}`, 888, 484, 12, '#b6c6da'); button('返回', 35, 488, 100, 26, () => setState(ST.TITLE), '#74859c'); }
function drawCodex() { text('几何图鉴', W / 2, 40, 29, '#eefaff'); text(`武器 ${saveData.seenWeapons.length}/${WEAPONS.length} · 敌人 ${saveData.seenEnemies.length}/${Object.keys(ENEMIES).length}`, W / 2, 68, 13, '#9eb2ca'); WEAPONS.slice(0, 13).forEach((weapon, i) => text(`${saveData.seenWeapons.includes(weapon.name) ? weapon.name : '？？？'} · ${weapon.type} · ${weapon.element || '无'}`, 58, 110 + i * 28, 13, saveData.seenWeapons.includes(weapon.name) ? RARITIES[weapon.rarity] : '#59677c', 'left')); Object.values(ENEMIES).slice(0, 13).forEach((enemy, i) => text(saveData.seenEnemies.includes(enemy.name) ? enemy.name : '？？？', 540, 110 + i * 28, 13, saveData.seenEnemies.includes(enemy.name) ? enemy.color : '#59677c', 'left')); button('返回', 35, 488, 100, 26, () => setState(ST.TITLE), '#74859c'); }
function drawHelp() {
  text('操作说明', W / 2, 38, 29, '#effaff');
  text('每个动作可独立改键；允许多个动作使用同一个按键', W / 2, 62, 12, '#a9c3e1');
  HELP_ACTIONS.forEach((item, index) => {
    const col = index % 2, row = Math.floor(index / 2), x = 54 + col * 426, y = 80 + row * 48;
    panel(x, y, 402, 38, '#3d638c');
    text(item.name, x + 16, y + 19, 13, '#d5e3f4', 'left');
    text(inputLabel(bindingFor(item.id)), x + 144, y + 19, 12, '#7ee4ff', 'left');
    button('更改按键', x + 286, y + 7, 102, 24, () => openKeybindDialog(item.id), '#70d6ff');
  });
  button('返回标题', W / 2 - 80, 482, 160, 28, () => setState(ST.TITLE), '#70d6ff');
}
function openTransfer(mode) { transferMode = mode; transferTitle.textContent = mode === 'export' ? '导出存档' : '导入存档'; transfer.value = mode === 'export' ? exportSave() : ''; transfer.readOnly = mode === 'export'; dialog.hidden = false; transfer.focus(); if (mode === 'export') transfer.select(); }
function drawSettings() {
  text('设置与存档管理', W / 2, 38, 29, '#effaff');
  slider('总音量', 120, 82, saveData.settings.master, '#70e6ff', value => applyAudioSlider('master', value));
  slider('音效', 120, 132, saveData.settings.sfx, '#ff9bc7', value => applyAudioSlider('sfx', value));
  slider('音乐', 120, 182, saveData.settings.music, '#ffd278', value => applyAudioSlider('music', value));
  const toggle = (label, key, x, y, color) => button(`${label}：${saveData.settings[key] ? '开' : '关'}`, x, y, 185, 27, () => { saveData.settings[key] = !saveData.settings[key]; writeSave(); }, saveData.settings[key] ? color : '#71839e');
  toggle('红武发光', 'redWeaponGlow', 120, 222, '#ff768d'); toggle('允许跳过升级', 'allowUpgradeSkip', 320, 222, '#9ca8bb'); toggle('战斗提示', 'combatTips', 120, 258, '#78e5c1');
  button('导出存档', 120, 304, 180, 32, () => openTransfer('export'), '#70e6ff'); button('导入存档', 320, 304, 180, 32, () => openTransfer('import'), '#c58fff');
  button(game.settingsConfirm === 'all' ? '确认重置全部进度' : '重置存档', 120, 348, 180, 32, () => { if (game.settingsConfirm === 'all') { resetAllSave(); game.settingsConfirm = null; } else game.settingsConfirm = 'all'; }, '#ff879e');
  button(game.settingsConfirm === 'stats' ? '确认重置统计' : '重置统计', 320, 348, 180, 32, () => { if (game.settingsConfirm === 'stats') { resetStats(); game.settingsConfirm = null; } else game.settingsConfirm = 'stats'; }, '#ffca68');
  if (game.settingsConfirm) text('再次点击对应按钮确认；返回设置页会取消确认。', W / 2, 402, 13, '#ffbd8b');
  button('返回', W / 2 - 80, 450, 160, 32, () => { game.settingsConfirm = null; setState(ST.TITLE); }, '#70d6ff');
}
function drawAchievements() {
  const unlocked = achievementProgress();
  text('成就', W / 2, 38, 29, '#effaff');
  text(`已解锁 ${unlocked}/${ACHIEVEMENTS.length} · 每项奖励 30 核心`, W / 2, 66, 13, '#ffe28a');
  ACHIEVEMENTS.forEach((achievement, index) => {
    const col = index % 2, row = Math.floor(index / 2), x = 70 + col * 420, y = 94 + row * 91, done = Boolean(saveData.achievements[achievement.id]);
    panel(x, y, 380, 72, done ? '#70e6b4' : '#596f8b', done ? 'rgba(8,43,37,.82)' : 'rgba(5,13,30,.88)');
    text(done ? '已完成' : '挑战', x + 28, y + 24, 11, done ? '#8cf0c1' : '#9eacbf');
    text(achievement.name, x + 64, y + 24, 16, done ? '#e1fff0' : '#e5effd', 'left');
    text(achievement.desc, x + 64, y + 49, 12, '#bdcce0', 'left');
  });
  button('返回标题', W / 2 - 80, 482, 160, 30, () => setState(ST.TITLE), '#70d6ff');
}
const WEAPON_TYPES = Object.freeze({ line: '直线', scatter: '散射', homing: '追踪', pierce: '穿透', explosion: '爆破', bounce: '反弹', arc: '电弧', split: '分裂', laser: '激光', turret: '哨塔', orbit: '回旋' });
const ENEMY_KINDS = Object.freeze({ ranged: '远程', charge: '冲锋', melee: '近战', sniper: '狙击', explode: '自爆', split: '分裂', shield: '护盾', summon: '召唤', stealth: '隐形', repair: '修复', reflect: '反射', boss1: 'Boss', boss2: 'Boss', boss3: 'Boss' });

function upgradeEntries() { return (game.appliedUpgrades || []).map(id => UPGRADES.find(item => item.id === id) || { id, name: id, desc: '' }); }
function summaryNames(items, count = 2) { if (!items.length) return '无'; return items.slice(0, count).map(item => item.name).join(' · '); }
function drawWeaponGlyph(weapon, x, y, color, scale = 1) {
  const size = 18 * scale;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.2 * scale; ctx.shadowColor = color; ctx.shadowBlur = 8;
  if (weapon.type === 'scatter') { for (let i = -1; i <= 1; i++) line(x - size, y, x + size, y + i * size * .52, color, 2 * scale); }
  else if (weapon.type === 'homing') { ctx.beginPath(); ctx.arc(x, y, size * .66, -.7, Math.PI * 1.45); ctx.stroke(); polygon(x + size * .7, y + size * .45, 4 * scale, 3, color, .6); }
  else if (weapon.type === 'explosion') { polygon(x, y, size * .52, 6, color, 0); for (let i = 0; i < 6; i++) line(x + Math.cos(i) * size * .62, y + Math.sin(i) * size * .62, x + Math.cos(i) * size, y + Math.sin(i) * size, color, 1.5 * scale); }
  else if (weapon.type === 'bounce') { line(x - size, y - size * .6, x + size, y - size * .6, color, 2 * scale); line(x - size, y + size * .6, x + size, y + size * .6, color, 2 * scale); polygon(x, y, 5 * scale, 4, color, .2); }
  else if (weapon.type === 'arc') { line(x - size, y - size * .5, x - size * .24, y + size * .3, color, 2.5 * scale); line(x - size * .24, y + size * .3, x + size * .12, y - size * .1, color, 2.5 * scale); line(x + size * .12, y - size * .1, x + size, y + size * .55, color, 2.5 * scale); }
  else if (weapon.type === 'split') { polygon(x - size * .35, y, 4 * scale, 4, color); polygon(x + size * .45, y - size * .45, 3.2 * scale, 4, color); polygon(x + size * .45, y + size * .45, 3.2 * scale, 4, color); line(x - size * .15, y, x + size * .2, y - size * .28, color, 1.5 * scale); line(x - size * .15, y, x + size * .2, y + size * .28, color, 1.5 * scale); }
  else if (weapon.type === 'laser') line(x - size, y, x + size, y, color, 5 * scale);
  else if (weapon.type === 'turret') { polygon(x, y, size * .65, 6, color, 0, false); line(x, y, x + size, y, color, 3 * scale); }
  else if (weapon.type === 'orbit') { ctx.beginPath(); ctx.arc(x, y, size * .65, 0, Math.PI * 2); ctx.stroke(); polygon(x + size * .65, y, 3.5 * scale, 4, color); }
  else { line(x - size, y, x + size, y, color, 3 * scale); polygon(x + size, y, 4 * scale, 3, color, Math.PI / 2); }
  ctx.restore();
}

function drawBossRushLoadout() {
  const core = CORES.find(item => item.id === game.bossRushCoreId) || CORES[0];
  const orangeWeapons = WEAPONS.filter(item => item.rarity === '橙');
  text('Boss Rush 出战配置', W / 2, 35, 28, '#ffb1da');
  text(`核心：${core.name}  ·  选择两把不同的橙色武器`, W / 2, 62, 14, core.color);
  const slots = game.bossRushLoadout;
  panel(240, 78, 480, 46, '#ffb05b');
  text(`槽 1：${slots[0]?.name || '待选择'}`, 258, 93, 13, slots[0] ? RARITIES[slots[0].rarity] : '#8fa4bc', 'left');
  text(`槽 2：${slots[1]?.name || '待选择'}`, 258, 111, 13, slots[1] ? RARITIES[slots[1].rarity] : '#8fa4bc', 'left');
  const maxScroll = bossRushScrollMax();
  setBossRushScroll(game.bossRushScroll || 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(BOSS_RUSH_LIST.x, BOSS_RUSH_LIST.y, BOSS_RUSH_LIST.w, BOSS_RUSH_LIST.h);
  ctx.clip();
  orangeWeapons.forEach((weapon, index) => {
    const row = Math.floor(index / BOSS_RUSH_LIST.columns), col = index % BOSS_RUSH_LIST.columns, x = BOSS_RUSH_LIST.x + col * (BOSS_RUSH_LIST.cardW + BOSS_RUSH_LIST.gapX), y = BOSS_RUSH_LIST.y + row * (BOSS_RUSH_LIST.cardH + BOSS_RUSH_LIST.gapY) - game.bossRushScroll, selected = slots.includes(weapon);
    panel(x, y, BOSS_RUSH_LIST.cardW, BOSS_RUSH_LIST.cardH, selected ? '#ffb05b' : `${RARITIES[weapon.rarity]}99`, selected ? 'rgba(102,59,22,.8)' : 'rgba(6,15,33,.86)');
    drawWeaponGlyph(weapon, x + 35, y + 39, RARITIES[weapon.rarity]);
    text(weapon.name, x + 68, y + 25, 15, RARITIES[weapon.rarity], 'left');
    text(`${WEAPON_TYPES[weapon.type]} · 伤害 ${weapon.damage} · 射速 ${weapon.rate}`, x + 68, y + 49, 11, '#dcecff', 'left');
    text(weapon.desc, x + 18, y + 75, 11, '#adc1d6', 'left');
    if (y + 94 >= BOSS_RUSH_LIST.y && y + 116 <= BOSS_RUSH_LIST.y + BOSS_RUSH_LIST.h) button(selected ? '取消选择' : '选择', x + 90, y + 94, 104, 22, () => toggleBossRushWeapon(weapon), RARITIES[weapon.rarity], selected || slots.length < 2);
  });
  ctx.restore();
  if (maxScroll > 0) {
    const trackX = BOSS_RUSH_LIST.x + BOSS_RUSH_LIST.w + 12, thumbH = Math.max(46, BOSS_RUSH_LIST.h * BOSS_RUSH_LIST.h / bossRushContentHeight()), thumbY = BOSS_RUSH_LIST.y + (BOSS_RUSH_LIST.h - thumbH) * (game.bossRushScroll / maxScroll);
    panel(trackX, BOSS_RUSH_LIST.y, 10, BOSS_RUSH_LIST.h, '#4a6383', 'rgba(4,12,29,.8)');
    panel(trackX - 2, thumbY, 14, thumbH, '#ffb05b', 'rgba(160,88,28,.85)');
  }
  button('返回核心选择', 44, 488, 150, 28, () => setState(ST.CORE_SELECT), '#71839e');
  button('开始挑战', W / 2 - 105, 488, 210, 28, () => confirmBossRushLoadout(), '#ff779d', slots.length === 2);
}

function drawCodexView() {
  const isWeapons = game.codexTab === 'weapons';
  const items = isWeapons ? WEAPONS : Object.values(ENEMIES);
  const pageSize = 6, pages = Math.max(1, Math.ceil(items.length / pageSize)), page = clamp(game.codexPage, 0, pages - 1);
  game.codexPage = page;
  text('几何图鉴', W / 2, 35, 29, '#eefaff');
  button(`武器 ${WEAPONS.length}`, W / 2 - 170, 57, 160, 28, () => { game.codexTab = 'weapons'; game.codexPage = 0; }, isWeapons ? '#70e6ff' : '#71839e');
  button(`敌人 ${Object.keys(ENEMIES).length}`, W / 2 + 10, 57, 160, 28, () => { game.codexTab = 'enemies'; game.codexPage = 0; }, !isWeapons ? '#ff9bc7' : '#71839e');
  const typeLabel = isWeapons && items[page * pageSize] ? ` · ${WEAPON_TYPES[items[page * pageSize].type]}` : '';
  text(isWeapons ? `全部武器的参数与弹道类型${typeLabel}` : '全部敌人的几何预览与作战参数', W / 2, 98, 12, '#a9c3e1');
  items.slice(page * pageSize, page * pageSize + pageSize).forEach((item, index) => {
    const col = index % 3, row = Math.floor(index / 3), x = 28 + col * 306, y = 118 + row * 164, color = isWeapons ? RARITIES[item.rarity] : item.color, border = isWeapons && item.rarity === '红' ? '#ffd46b' : color;
    panel(x, y, 286, 146, border, 'rgba(5,13,30,.88)');
    if (isWeapons) {
      if (item.rarity === '红') { ctx.save(); ctx.shadowColor = '#ffd46b'; ctx.shadowBlur = 16; ctx.strokeStyle = '#ffd46b'; ctx.strokeRect(x + 3, y + 3, 280, 140); ctx.restore(); }
      drawWeaponGlyph(item, x + 40, y + 42, color, 1.08);
      text(item.name, x + 74, y + 24, 15, color, 'left');
      text(`${WEAPON_TYPES[item.type]} · ${weaponElements(item).map(element => element === 'fire' ? '火' : element === 'ice' ? '冰' : '雷').join('/') || '无元素'}`, x + 74, y + 47, 11, '#dcecff', 'left');
      text(`伤害 ${item.damage}  射速 ${item.rate}  速度 ${item.speed || '持续'}`, x + 18, y + 75, 11, '#b8c9df', 'left');
      text(`标签：${item.tags.join(' / ') || '无'}`, x + 18, y + 97, 11, '#9ce8de', 'left');
      text(item.desc, x + 18, y + 121, 11, '#b8c9df', 'left');
    } else {
      polygon(x + 42, y + 48, Math.min(26, item.radius * 1.45), item.sides || 4, item.color, .15);
      text(item.name, x + 78, y + 24, 15, item.color, 'left');
      text(`${ENEMY_KINDS[item.kind] || item.kind}${item.boss ? ' · Boss' : ''}`, x + 78, y + 47, 11, '#dcecff', 'left');
      text(`生命 ${item.hp}  速度 ${item.speed}`, x + 18, y + 77, 12, '#b8c9df', 'left');
      text(`伤害 ${item.damage}  冷却 ${item.cooldown.toFixed(2)}s`, x + 18, y + 100, 12, '#ffcf9b', 'left');
      text(item.boss ? '大型首领，拥有阶段攻击' : `几何体：${item.sides || '圆'} 边 · 半径 ${item.radius}`, x + 18, y + 123, 11, '#b8c9df', 'left');
    }
  });
  button('◀', 744, 470, 42, 26, () => game.codexPage = Math.max(0, page - 1), '#71839e', page > 0);
  button('▶', 794, 470, 42, 26, () => game.codexPage = Math.min(pages - 1, page + 1), '#71839e', page < pages - 1);
  text(`${page + 1}/${pages}`, 866, 483, 12, '#b6c6da');
  button('返回', 35, 488, 100, 26, () => setState(ST.TITLE), '#74859c');
}

function drawBuildPanelView() {
  const x = W / 2 - 260, y = 90, w = 520, h = 330, upgrades = upgradeEntries();
  panel(x, y, w, h, '#7fe2ff', 'rgba(3,9,23,.94)');
  text('当前构型', x + w / 2, y + 24, 20, '#effaff');
  text(`槽 1：${game.equipped[0]?.name || '空'}    槽 2：${game.equipped[1]?.name || '空'}`, x + 18, y + 55, 13, '#dbeaff', 'left');
  text(`升级：${summaryNames(upgrades, 5)}${upgrades.length > 5 ? ` · 已选 ${upgrades.length} 项` : ''}`, x + 18, y + 87, 12, '#a9c3e1', 'left');
  text(`遗物：${summaryNames(game.relics, 4)}${game.relics.length > 4 ? ` · ${game.relics.length}/${game.relicCapacity}` : ''}`, x + 18, y + 118, 12, '#ffe39a', 'left');
  text(`标签：${weaponCollection().flatMap(item => item.tags).join(' / ') || '无'}`, x + 18, y + 150, 12, '#8df2d5', 'left');
  text(`最高连击 ${game.maxCombo} · 复活 ${game.bonus.revives}`, x + 18, y + 178, 12, '#c8b4ff', 'left');
  text(`按住 ${inputLabel(bindingFor('build'))} 查看，${inputLabel(bindingFor('pause'))} 暂停后完全冻结`, x + w / 2, y + h - 22, 12, '#8fa4bc');
}

function drawUpgradeDetailsModal() {
  const upgrades = upgradeEntries(), perPage = 7, pages = Math.max(1, Math.ceil(upgrades.length / perPage)), page = clamp(game.upgradeDetailsPage, 0, pages - 1), x = 130, y = 48, w = 700, h = 444;
  game.upgradeDetailsPage = page;
  panel(x, y, w, h, '#89ddff', 'rgba(3,10,25,.97)');
  text(`已选择升级 · ${upgrades.length} 项`, x + w / 2, y + 29, 22, '#effaff');
  upgrades.slice(page * perPage, page * perPage + perPage).forEach((upgrade, index) => {
    const rowY = y + 70 + index * 43;
    text(`${page * perPage + index + 1}. ${upgrade.name}`, x + 30, rowY, 14, '#8fe8ff', 'left');
    text(upgrade.desc, x + 52, rowY + 18, 11, '#c3d2e6', 'left');
  });
  button('◀', x + 190, y + h - 48, 42, 26, () => game.upgradeDetailsPage = Math.max(0, page - 1), '#71839e', page > 0);
  text(`${page + 1}/${pages}`, x + w / 2, y + h - 35, 12, '#b6c6da');
  button('▶', x + w - 232, y + h - 48, 42, 26, () => game.upgradeDetailsPage = Math.min(pages - 1, page + 1), '#71839e', page < pages - 1);
  button('关闭', x + w / 2 - 60, y + h - 48, 120, 26, () => { game.showUpgradeDetails = false; game.upgradeDetailsPage = 0; }, '#70d6ff');
}

function drawPause() {
  const x = 230, y = 44, w = 500, h = 452, upgrades = upgradeEntries();
  panel(x, y, w, h, '#76d9ff', 'rgba(4,10,26,.95)');
  text('暂停', x + w / 2, y + 29, 26, '#effaff');
  const labelX = x + 28, valueX = x + 112;
  line(x + 22, y + 52, x + w - 22, y + 52, '#355e82', 1);
  text('当前构型', labelX, y + 78, 14, '#7fe2ff', 'left');
  text(`${game.core?.name || '未选择'} · ${game.core?.passive || ''}`, valueX, y + 78, 12, '#dcecff', 'left');
  line(x + 22, y + 102, x + w - 22, y + 102, '#355e82', 1);
  text('槽 1', labelX, y + 126, 14, '#70d6ff', 'left');
  text(game.equipped[0]?.name || '空', valueX, y + 126, 13, game.equipped[0] ? RARITIES[game.equipped[0].rarity] : '#8390a2', 'left');
  text('槽 2', labelX, y + 151, 14, '#c58fff', 'left');
  text(game.equipped[1]?.name || '空', valueX, y + 151, 13, game.equipped[1] ? RARITIES[game.equipped[1].rarity] : '#8390a2', 'left');
  line(x + 22, y + 170, x + w - 22, y + 170, '#355e82', 1);
  text(`升级 · ${upgrades.length} 项`, labelX, y + 196, 14, '#a9c3e1', 'left');
  text(summaryNames(upgrades, 2), valueX, y + 196, 12, '#dcecff', 'left');
  if (upgrades.length > 2) button('显示全部', x + w - 118, y + 181, 92, 24, () => { game.showUpgradeDetails = true; game.upgradeDetailsPage = 0; }, '#7fe2ff');
  line(x + 22, y + 220, x + w - 22, y + 220, '#355e82', 1);
  text(`遗物 · ${game.relics.length}/${game.relicCapacity}`, labelX, y + 246, 14, '#ffe39a', 'left');
  text(summaryNames(game.relics, 2), valueX, y + 246, 12, '#ffe8bc', 'left');
  line(x + 22, y + 270, x + w - 22, y + 270, '#355e82', 1);
  if (!game.isBoss && nextEncounterLabel().startsWith('Boss')) { panel(x + 28, y + 292, w - 56, 38, '#ff6b83', 'rgba(56,10,24,.82)'); text('下一波 Boss 战，请做好准备', x + w / 2, y + 311, 14, '#ffd4dd'); }
  button('继续', x + 38, y + h - 52, 196, 30, () => setState(game.previousState), '#6de4b4');
  button('放弃远征', x + 266, y + h - 52, 196, 30, () => finishRun(false), '#ff879e');
  if (game.showUpgradeDetails) drawUpgradeDetailsModal();
}

function normalizeInventory() {
  const equipped = new Set(game.equipped.filter(Boolean));
  game.inventory = game.inventory.filter((weapon, index, list) => !equipped.has(weapon) && list.indexOf(weapon) === index);
}
function promotionCost(weapon) { return weapon ? Math.ceil(weapon.price / 2) : 0; }
function promoteEquippedWeapon(slot) {
  const weapon = game.equipped[slot];
  const cost = promotionCost(weapon);
  if (!weapon || weapon.rarity === RARITY_ORDER[RARITY_ORDER.length - 1] || game.coins < cost) return false;
  const promoted = promoteWeapon(weapon);
  if (!promoted) return false;
  game.coins -= cost;
  game.equipped[slot] = promoted;
  playSound('purchase');
  return true;
}
function equipInventoryWeapon(weapon, slot) {
  const index = game.inventory.indexOf(weapon);
  if (index < 0) return false;
  const previous = game.equipped[slot];
  game.inventory.splice(index, 1);
  if (previous && !game.inventory.includes(previous)) game.inventory.push(previous);
  game.equipped[slot] = weapon;
  game.activeSlot = slot;
  normalizeInventory();
  playSound('purchase');
  return true;
}
function sellInventoryWeapon(weapon) {
  const index = game.inventory.indexOf(weapon);
  if (index < 0) return false;
  game.coins += Math.ceil(weapon.price / 2);
  game.inventory.splice(index, 1);
  playSound('purchase');
  return true;
}
function drawRestView() {
  normalizeInventory();
  text(game.chapter > 1 && game.waveIndex === 0 ? '章节整备区' : '休息区', W / 2, 30, 27, '#f5fbff');
  text(`碎片 ${game.coins} · 当前生命 ${Math.ceil(game.player.hp)}/${game.player.maxHp}`, W / 2, 55, 13, '#ffe27a');
  button('修复 30% · 8', 36, 72, 170, 28, () => { if (game.coins >= 8) { game.coins -= 8; game.player.hp = Math.min(game.player.maxHp, game.player.hp + game.player.maxHp * .3); playSound('purchase'); } }, '#64e6ae', game.coins >= 8);
  button('刷新 · 6', 220, 72, 130, 28, () => { if (game.coins >= 6) { game.coins -= 6; game.shop = createShop(); playSound('purchase'); } }, '#70caff', game.coins >= 6);
  button('继续战斗', 704, 72, 220, 28, () => startBattle(), '#ff9cc8');
  const shopTheme = game.shop[0]?.shopTheme;
  text(`商店武器${shopTheme ? ` · 主题：${shopTheme.label}` : ''}`, 42, 118, 15, shopTheme?.color || '#dfefff', 'left');
  if (game.lastChapterStats) text(`第 ${game.lastChapterStats.chapter} 章战绩：击杀 ${game.lastChapterStats.kills} · 受伤 ${game.lastChapterStats.damageTaken} · 暴击 ${game.lastChapterStats.critHits}`, 500, 118, 11, '#c8d9ed', 'left');
  game.shop.forEach((weapon, index) => { const x = 38 + index * 230, cost = adjustedPrice(weapon), sold = weapon.shopSold, color = weapon.rarity === '红' ? '#ffd46b' : RARITIES[weapon.rarity]; panel(x, 130, 210, 76, color); text(`${weapon.name}${weapon.rarity === '红' ? ' (稀有)' : ''}`, x + 105, 150, 14, RARITIES[weapon.rarity]); text(sold ? '主题商品已售出' : weapon.desc, x + 105, 170, 10, sold ? '#71839e' : '#b6c5d8'); button(sold ? '已售出' : `购买 ${cost}`, x + 48, 182, 114, 20, () => { if (game.coins < cost || sold) return; game.coins -= cost; game.inventory.push(weapon); discoverWeapon(weapon.name); if (weapon.shopLocked) { game.chapterShopSold[game.chapter][weapon.name] = true; weapon.shopSold = true; } else game.shop.splice(index, 1); playSound('purchase'); }, color, !sold && game.coins >= cost); });
  text('已装备', 42, 226, 15, '#dfefff', 'left');
  game.equipped.forEach((weapon, slot) => { const x = 38 + slot * 445, color = weapon ? RARITIES[weapon.rarity] : '#60738b', cost = promotionCost(weapon), maxed = weapon?.rarity === RARITY_ORDER[RARITY_ORDER.length - 1], canPromote = Boolean(weapon) && !maxed && game.coins >= cost; panel(x, 238, 420, 54, color); button(!weapon ? '品质进阶' : maxed ? '品质进阶 · 满级' : `品质进阶 ${cost}`, x + 14, 253, 126, 24, () => promoteEquippedWeapon(slot), '#f2c66b', canPromote); text(`槽 ${slot + 1}`, x + 154, 255, 12, slot === game.activeSlot ? '#fff1a6' : '#9fb5cc', 'left'); text(weapon?.name || '空槽', x + 204, 255, 15, weapon ? color : '#8390a2', 'left'); text(weapon ? `${WEAPON_TYPES[weapon.type]} · ${weapon.tags.join(' / ') || '无标签'}` : '从下方背包装入武器', x + 154, 276, 11, '#b9c9dc', 'left'); });
  const bag = game.inventory, pageSize = 4, pages = Math.max(1, Math.ceil(bag.length / pageSize)), page = clamp(game.inventoryPage, 0, pages - 1);
  game.inventoryPage = page;
  text(`背包 · 未装备武器 ${bag.length}`, 42, 321, 15, '#dfefff', 'left');
  bag.slice(page * pageSize, page * pageSize + pageSize).forEach((weapon, index) => { const y = 338 + index * 34; text(`${weapon.name} · ${weapon.damage}伤害 · ${weapon.tags.join('/') || '无标签'}`, 44, y + 13, 12, RARITIES[weapon.rarity], 'left'); button('槽1', 596, y, 54, 24, () => equipInventoryWeapon(weapon, 0), '#69cfff'); button('槽2', 658, y, 54, 24, () => equipInventoryWeapon(weapon, 1), '#b78dff'); button(`出售 +${Math.ceil(weapon.price / 2)}`, 750, y, 100, 24, () => { if (bag.length >= 6) awardAchievement('full-bag-sale'); sellInventoryWeapon(weapon); }, '#ffad6f'); });
  button('◀', 864, 340, 26, 24, () => game.inventoryPage = Math.max(0, page - 1), '#71839e', page > 0);
  button('▶', 896, 340, 26, 24, () => game.inventoryPage = Math.min(pages - 1, page + 1), '#71839e', page < pages - 1);
  text(`${page + 1}/${pages}`, 892, 374, 12, '#b6c6da');
  text(`遗物：${summaryNames(game.relics, 5)}`, 42, 500, 12, '#ffe39a', 'left');
}

function copyBuildCode(code) {
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).catch(() => { transferMode = 'export'; transferTitle.textContent = 'Build 代码'; transfer.value = code; transfer.readOnly = true; dialog.hidden = false; transfer.select(); });
  else { transferMode = 'export'; transferTitle.textContent = 'Build 代码'; transfer.value = code; transfer.readOnly = true; dialog.hidden = false; transfer.select(); }
  game.achievementNotice = { text: 'Build 代码已复制', life: 1.6, maxLife: 1.6 };
}
function drawResult() {
  const r = game.result || { win: false, reward: 0 }, stats = r.stats || { kills: 0, damageTaken: 0, critHits: 0, playerHits: 0, farthestWave: 1 };
  text(r.practice ? '练习结束' : r.win ? '远征完成' : '构型崩解', W / 2, 48, 34, r.win ? '#6df1b4' : '#ff7397');
  text(r.practice ? '练习场不会写入局外进度' : `获得 ${formatCoreAmount(r.reward)} 核心 · 最高连击 ${r.combo || 0}`, W / 2, 82, 15, '#ffe27a');
  if (r.mode === 'boss-rush' && r.win) text(`通关时间 ${game.runElapsed.toFixed(1)} 秒`, W / 2, 106, 13, '#e2c5ff');
  const metrics = [['击杀', stats.kills], ['受伤', stats.damageTaken], ['暴击', stats.critHits], ['暴击率', `${stats.playerHits ? Math.round(stats.critHits / stats.playerHits * 100) : 0}%`], ['最远波次', stats.farthestWave]];
  metrics.forEach((entry, index) => { const x = 72 + index * 166; panel(x, 126, 142, 50, '#4e84aa'); text(entry[0], x + 71, 142, 11, '#a9c3e1'); text(String(entry[1]), x + 71, 160, 16, '#effaff'); });
  panel(96, 196, 768, 128, '#5b86ab', 'rgba(4,12,28,.92)');
  text('本局构型', 120, 218, 15, '#8fe8ff', 'left');
  text(`武器：${r.weapons?.map(item => item ? `${item.name}${item.promotion ? ` +${item.promotion}` : ''}` : '空').join(' · ') || '无'}`, 120, 244, 12, '#dcecff', 'left');
  text(`升级：${summaryNames((r.upgrades || []).map(id => UPGRADES.find(item => item.id === id) || { name: id }), 7)}`, 120, 270, 12, '#c8d9ed', 'left');
  text(`遗物：${summaryNames(r.relics || [], 7)}`, 120, 296, 12, '#ffe8bc', 'left');
  button('复制 Build 代码', W / 2 - 105, 342, 210, 30, () => copyBuildCode(r.buildCode || ''), '#ffe27a', Boolean(r.buildCode));
  button('再来一局', W / 2 - 112, 392, 224, 32, () => setState(ST.CORE_SELECT), '#66e6b0');
  button('返回标题', W / 2 - 112, 434, 224, 32, () => setState(ST.TITLE), '#79cfff');
}
function drawPauseView() {
  const x = 230, y = 44, w = 500, h = 452, upgrades = upgradeEntries();
  panel(x, y, w, h, '#76d9ff', 'rgba(4,10,26,.95)');
  text('暂停', x + w / 2, y + 29, 26, '#effaff');
  const labelX = x + 28, valueX = x + 112;
  line(x + 22, y + 52, x + w - 22, y + 52, '#355e82', 1);
  text('当前构型', labelX, y + 78, 14, '#7fe2ff', 'left');
  text(`${game.core?.name || '未选择'} · ${game.core?.passive || ''}`, valueX, y + 78, 12, '#dcecff', 'left');
  line(x + 22, y + 102, x + w - 22, y + 102, '#355e82', 1);
  text('槽 1', labelX, y + 126, 14, '#70d6ff', 'left');
  text(game.equipped[0]?.name || '空', valueX, y + 126, 13, game.equipped[0] ? RARITIES[game.equipped[0].rarity] : '#8390a2', 'left');
  text('槽 2', labelX, y + 151, 14, '#c58fff', 'left');
  text(game.equipped[1]?.name || '空', valueX, y + 151, 13, game.equipped[1] ? RARITIES[game.equipped[1].rarity] : '#8390a2', 'left');
  line(x + 22, y + 170, x + w - 22, y + 170, '#355e82', 1);
  text(`升级 · ${upgrades.length} 项`, labelX, y + 196, 14, '#a9c3e1', 'left');
  text(summaryNames(upgrades, 2), valueX, y + 196, 12, '#dcecff', 'left');
  if (upgrades.length > 2) button('显示全部', x + w - 118, y + 181, 92, 24, () => { game.showUpgradeDetails = true; game.upgradeDetailsPage = 0; }, '#7fe2ff');
  line(x + 22, y + 220, x + w - 22, y + 220, '#355e82', 1);
  text(`遗物 · ${game.relics.length}/${game.relicCapacity}`, labelX, y + 246, 14, '#ffe39a', 'left');
  text(summaryNames(game.relics, 2), valueX, y + 246, 12, '#ffe8bc', 'left');
  line(x + 22, y + 270, x + w - 22, y + 270, '#355e82', 1);
  button('继续', x + 38, y + h - 52, 196, 30, () => setState(game.previousState), '#6de4b4');
  button('放弃远征', x + 266, y + h - 52, 196, 30, () => finishRun(false), '#ff879e');
  if (game.showUpgradeDetails) drawUpgradeDetailsModal();
}
function render() { uiButtons = []; drawBackground(); if (activeCombat() || game.state === ST.PAUSE) { drawWorld(); drawHud(); if (game.showBuild && activeCombat()) drawBuildPanelView(); if (game.state === ST.PAUSE) drawPauseView(); if (game.flash) { ctx.fillStyle = '#fff'; ctx.globalAlpha = game.flash * 2; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; } return; } panel(0, 0, W, H, 'transparent', 'rgba(3,7,19,.38)'); if (game.state === ST.TITLE) drawTitle(); else if (game.state === ST.CORE_SELECT) drawCoreSelect(); else if (game.state === ST.BOSS_RUSH_LOADOUT) drawBossRushLoadout(); else if (game.state === ST.UPGRADE) drawReward(); else if (game.state === ST.REST) drawRestView(); else if (game.state === ST.PRACTICE_CONFIG) drawPracticeConfig(); else if (game.state === ST.HANGAR) drawHangar(); else if (game.state === ST.CODEX) drawCodexView(); else if (game.state === ST.HELP) drawHelp(); else if (game.state === ST.SETTINGS) drawSettings(); else if (game.state === ST.ACHIEVEMENTS) drawAchievements(); else if (game.state === ST.RESULT) drawResult(); }
function hitButton(x, y) { for (let i = uiButtons.length - 1; i >= 0; i--) { const item = uiButtons[i]; if (x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h) return item; } return null; }
function activateButton(control, x, y) { if (!control) return null; control.action(x, y); return control; }
function closeKeybindDialog() { keybindAction = null; keybindCandidate = null; keybindDialog.hidden = true; keybindPrompt.hidden = false; keybindConfirmation.hidden = true; }
function beginKeybindConfirmation(input) {
  if (!keybindAction || !input) return;
  keybindCandidate = input;
  keybindPrompt.hidden = true;
  keybindConfirmation.hidden = false;
  keybindConfirmationText.textContent = `原按键为（${inputLabel(bindingFor(keybindAction))}）键，确定要切换为（${inputLabel(input)}）键吗？`;
}
function openKeybindDialog(action) {
  if (!DEFAULT_KEY_BINDINGS[action]) return;
  keybindAction = action;
  keybindCandidate = null;
  keybindPrompt.hidden = false;
  keybindConfirmation.hidden = true;
  keybindDialog.hidden = false;
}
function triggerMappedCombatActions(input) {
  if (matchesBinding('dash', input)) useDash();
  if (matchesBinding('hook', input)) useHook();
  if (matchesBinding('web', input)) useWeb();
  if (matchesBinding('shield', input)) toggleShield();
  if (matchesBinding('autoFire', input)) { game.autoFire = !game.autoFire; floating(game.autoFire ? '自动锁敌：开启' : '自动锁敌：关闭', game.player.x, game.player.y - 55, game.autoFire ? '#73f2b5' : '#b8c5d8'); }
  if (matchesBinding('swap', input) && game.equipped[1]) { game.activeSlot = game.activeSlot ? 0 : 1; if (game.bonus.swapBoost) game.bonus.pendingSwapBoost = true; floating(`切换：${currentWeapon().name}`, game.player.x, game.player.y - 55, RARITIES[currentWeapon().rarity]); }
  if (matchesBinding('build', input)) game.showBuild = true;
}
function handlePauseBinding(input) {
  if (!matchesBinding('pause', input)) return false;
  if (activeCombat()) setState(ST.PAUSE);
  else if (game.state === ST.PAUSE) setState(game.previousState);
  else if (game.state === ST.UPGRADE) skipUpgradeReward();
  else if (ESC_TO_TITLE.has(game.state)) setState(ST.TITLE);
  return true;
}
canvas.addEventListener('pointermove', event => {
  const p = point(event); mouse.x = p.x; mouse.y = p.y; updateMouseWorld();
  if (dragBossRush) { const delta = p.y - dragBossRush.startY; if (Math.abs(delta) > 5) dragBossRush.dragged = true; if (dragBossRush.dragged) setBossRushScroll(dragBossRush.startScroll - delta); return; }
  if (dragSlider) dragSlider.action(p.x);
});
canvas.addEventListener('pointerdown', event => {
  unlockAudio(); const p = point(event); mouse.x = p.x; mouse.y = p.y; updateMouseWorld();
  const control = hitButton(p.x, p.y);
  if (event.button === 0 && inBossRushList(p)) { dragBossRush = { startY: p.y, startScroll: game.bossRushScroll, control, dragged: false }; canvas.setPointerCapture?.(event.pointerId); return; }
  if (control) { activateButton(control, p.x, p.y); if (control.type === 'slider') { dragSlider = control; canvas.setPointerCapture?.(event.pointerId); } return; }
  const input = pointerInput(event);
  if (event.button === 2) event.preventDefault();
  if (!input) return;
  const wasCombat = activeCombat();
  if (wasCombat) { mouseButtons.add(input); mouse.down = actionPressed('fire'); }
  handlePauseBinding(input);
  if (wasCombat) triggerMappedCombatActions(input);
});
canvas.addEventListener('wheel', event => { if (!inBossRushList(point(event))) return; setBossRushScroll(game.bossRushScroll + event.deltaY); event.preventDefault(); }, { passive: false });
window.addEventListener('pointerup', event => {
  const input = pointerInput(event); if (input) mouseButtons.delete(input);
  mouse.down = actionPressed('fire');
  if (dragBossRush) { const drag = dragBossRush; dragBossRush = null; if (!drag.dragged) activateButton(drag.control, mouse.x, mouse.y); }
  dragSlider = null;
});
canvas.addEventListener('contextmenu', event => event.preventDefault());
window.addEventListener('keydown', event => {
  if (!keybindDialog.hidden) { event.preventDefault(); event.stopImmediatePropagation(); if (!keybindCandidate) beginKeybindConfirmation(event.code); return; }
  unlockAudio();
  const input = event.code, wasCombat = activeCombat();
  if (game.showUpgradeDetails && matchesBinding('pause', input)) { event.preventDefault(); event.stopImmediatePropagation(); game.showUpgradeDetails = false; game.upgradeDetailsPage = 0; return; }
  if (HELP_ACTIONS.some(action => matchesBinding(action.id, input))) event.preventDefault();
  keys.add(input);
  handlePauseBinding(input);
  if (!event.repeat && wasCombat) triggerMappedCombatActions(input);
}, true);
window.addEventListener('keyup', event => { keys.delete(event.code); if (!actionPressed('build')) game.showBuild = false; });
window.addEventListener('blur', () => { keys.clear(); mouseButtons.clear(); mouse.down = false; dragSlider = null; dragBossRush = null; game.showBuild = false; });
keybindDialog.addEventListener('pointerdown', event => { if (!keybindCandidate && event.button >= 0 && event.button <= 2) { event.preventDefault(); event.stopPropagation(); beginKeybindConfirmation(pointerInput(event)); } });
keybindDialog.addEventListener('contextmenu', event => event.preventDefault());
keybindDialog.addEventListener('click', event => { if (event.target === keybindDialog && !keybindCandidate) closeKeybindDialog(); });
keybindConfirm.addEventListener('click', () => { if (keybindAction && keybindCandidate) setKeyBinding(keybindAction, keybindCandidate); closeKeybindDialog(); });
keybindCancel.addEventListener('click', closeKeybindDialog);
window.addEventListener('keydown', event => { if (event.code === 'Escape' && game.showUpgradeDetails) { event.preventDefault(); event.stopImmediatePropagation(); game.showUpgradeDetails = false; game.upgradeDetailsPage = 0; } }, true);
document.getElementById('saveDialogClose').addEventListener('click', () => dialog.hidden = true); document.getElementById('saveDialogApply').addEventListener('click', () => { if (transferMode === 'import') { if (importSave(transfer.value)) { dialog.hidden = true; setMusicTheme('grid'); } else alert('存档格式无效。'); } else transfer.select(); });
function loop(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; update(dt); render(); requestAnimationFrame(loop); }
window.__geometryDuel = { game, saveData, startExpedition, startPractice, startBattle, finishWave, finishRun, exportSave, importSave, damagePlayer, beginBossRushLoadout, toggleBossRushWeapon, confirmBossRushLoadout, equipInventoryWeapon, sellInventoryWeapon, promoteEquippedWeapon, rerollUpgradeChoices, skipUpgradeReward, chooseReward, createShop, awardAchievement, world: { width: WORLD_W, height: WORLD_H } }; requestAnimationFrame(loop);
