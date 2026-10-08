import { ACHIEVEMENTS, CORES, HANGAR_NODES, RELICS, RARITY_ORDER, UPGRADES, WEAPONS, WORLD_W, WORLD_H, byName, pick } from './content.js';

const SAVE_KEY = 'geometry_duel_tactics_roguelite_v4';
const LEGACY_SAVE_KEYS = ['geometry_duel_tactics_roguelite_v3', 'geometry_duel_tactics_roguelite_v2', 'geometry_duel_tactics_roguelite_v1'];

const baseBonus = () => ({
  damage: 1, fireRate: 1, speed: 1, crit: 0, reduction: 0, leech: 0, magnet: 1,
  pierce: 0, size: 1, projectileSpeed: 1, bounce: 0, bounceChance: 0, chains: 0,
  splits: 0, explosion: 1, dashCd: 1, dashTrail: false, hookDamage: 0,
  webRadius: 1, webSlow: false, reflect: false, regen: 0, revives: 0,
  coinBonus: 0, swapBoost: false, pendingSwapBoost: false, homing: 1,
  overloadEvery: 0, overloadShots: 0, mirrorRevive: false, mirrorUsed: false,
  shopDiscount: 0, symbiosis: false, batteryEvery: 0, batteryShots: 0, batteryTime: 0,
  skillCooldown: 1, elementProc: 1, killVacuum: false, killHeal: 0, missingHpDamage: false,
  waveform: false, recycleChance: 0, dropBonus: 0, shopLucky: 0, dashDistance: 1,
  phaseTrail: false, destroyCrit: false, chargedStart: false, waveFirstShot: false
});

const defaultStats = () => ({
  kills: 0, clears: 0, deaths: 0, totalPlayTime: 0, endlessBestWave: 0,
  bossRushBestMs: null, core: {}, weapons: {}
});

export const DEFAULT_KEY_BINDINGS = Object.freeze({
  moveUp: 'KeyW', moveDown: 'KeyS', moveLeft: 'KeyA', moveRight: 'KeyD',
  fire: 'Mouse0', dash: 'Mouse2', hook: 'KeyQ', web: 'KeyE', shield: 'KeyF',
  autoFire: 'KeyK', swap: 'ShiftLeft', build: 'Tab', pause: 'Escape'
});

function normalizeKeyBindings(value) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(Object.entries(DEFAULT_KEY_BINDINGS).map(([action, fallback]) => {
    const input = source[action];
    return [action, typeof input === 'string' && input.length > 0 && input.length <= 40 ? input : fallback];
  }));
}

const defaultSettings = () => ({ master: .8, sfx: .8, music: .45, cheatMode: false, redWeaponGlow: true, allowUpgradeSkip: false, combatTips: true, keyBindings: { ...DEFAULT_KEY_BINDINGS } });

export function normalizeCoreAmount(value) {
  return Math.round(Math.max(0, Number(value) || 0) * 10) / 10;
}

export function formatCoreAmount(value) {
  const amount = normalizeCoreAmount(value);
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
}

const defaultSave = () => ({
  version: 4, cores: 0, upgrades: {}, unlockedCores: ['square', 'triangle', 'hex'],
  seenWeapons: [], seenEnemies: [], stats: defaultStats(), settings: defaultSettings(), achievements: {},
  lastRun: null
});

export const saveData = defaultSave();

export const game = {
  state: 'title', previousState: 'title', core: null, player: null,
  mode: 'expedition', pendingMode: 'expedition', chapter: 1, waveIndex: 0, endlessWave: 0, bossRushIndex: 0,
  enemies: [], bullets: [], enemyBullets: [], drops: [], particles: [], floating: [], zones: [], effects: [], turrets: [],
  inventory: [], equipped: [null, null], activeSlot: 0, shop: [], upgradeChoices: [], relicChoices: [], relics: [], relicCapacity: 6,
  restRelicGranted: {}, inventoryPage: 0, hangarPage: 0, coins: 0, bonus: baseBonus(),
  spawnQueue: [], spawnTimer: 0, resolveTimer: 0, isBoss: false, bossId: null,
  autoFire: false, lootSettling: false, lootSettleTimer: 0, combo: 0, maxCombo: 0,
  bossRushCoreId: null, bossRushLoadout: [], bossRushScroll: 0, codexTab: 'weapons', codexPage: 0,
  showUpgradeDetails: false, upgradeDetailsPage: 0,
  upgradeRerolls: 0, shownUpgradeIds: [], shownSpecialIds: [], specialReward: null, chapterShopLocks: {}, chapterShopSold: {},
  runStats: null, chapterStats: null, waveDamageTaken: 0, nextWaveDropBonus: 0, activeWaveDropBonus: 0,
  lastChapterStats: null,
  tip: null, critPulse: 0, redCritCooldown: 0, achievementNotice: null,
  practice: false, practiceConfig: { enemy: 'charger', hp: 240, speed: 1, damage: 1, cooldown: 1, ranged: true, charge: true, split: true, explode: true, summon: true, shield: true },
  result: null, elapsed: 0, runElapsed: 0, screenShake: 0, flash: 0, nextId: 1, showBuild: false,
  camera: { x: 0, y: 0 }
};

function copyIntoSave(next) {
  const base = defaultSave();
  Object.assign(saveData, base, next);
  saveData.version = 4;
  saveData.cores = normalizeCoreAmount(saveData.cores);
  saveData.upgrades = saveData.upgrades && typeof saveData.upgrades === 'object' ? saveData.upgrades : {};
  saveData.unlockedCores = Array.isArray(saveData.unlockedCores) ? [...new Set(saveData.unlockedCores.filter(id => CORES.some(core => core.id === id)))] : base.unlockedCores;
  for (const id of base.unlockedCores) if (!saveData.unlockedCores.includes(id)) saveData.unlockedCores.push(id);
  saveData.seenWeapons = Array.isArray(saveData.seenWeapons) ? [...new Set(saveData.seenWeapons)] : [];
  saveData.seenEnemies = Array.isArray(saveData.seenEnemies) ? [...new Set(saveData.seenEnemies)] : [];
  saveData.stats = { ...defaultStats(), ...(saveData.stats && typeof saveData.stats === 'object' ? saveData.stats : {}) };
  saveData.stats.core = saveData.stats.core && typeof saveData.stats.core === 'object' ? saveData.stats.core : {};
  saveData.stats.weapons = saveData.stats.weapons && typeof saveData.stats.weapons === 'object' ? saveData.stats.weapons : {};
  saveData.settings = { ...defaultSettings(), ...(saveData.settings && typeof saveData.settings === 'object' ? saveData.settings : {}) };
  for (const key of ['master', 'sfx', 'music']) saveData.settings[key] = Math.max(0, Math.min(1, Number(saveData.settings[key]) || 0));
  saveData.settings.cheatMode = Boolean(saveData.settings.cheatMode);
  saveData.settings.redWeaponGlow = saveData.settings.redWeaponGlow !== false;
  saveData.settings.allowUpgradeSkip = Boolean(saveData.settings.allowUpgradeSkip);
  saveData.settings.combatTips = saveData.settings.combatTips !== false;
  saveData.settings.keyBindings = normalizeKeyBindings(saveData.settings.keyBindings);
  saveData.achievements = saveData.achievements && typeof saveData.achievements === 'object' ? saveData.achievements : {};
  for (const achievement of ACHIEVEMENTS) saveData.achievements[achievement.id] = Boolean(saveData.achievements[achievement.id]);
  saveData.lastRun = saveData.lastRun && typeof saveData.lastRun === 'object' ? saveData.lastRun : null;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || LEGACY_SAVE_KEYS.map(key => localStorage.getItem(key)).find(Boolean);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    copyIntoSave(parsed);
    writeSave();
  } catch (_) { copyIntoSave(defaultSave()); }
}

export function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveData)); } catch (_) { }
}

export function setKeyBinding(action, input) {
  if (!Object.hasOwn(DEFAULT_KEY_BINDINGS, action) || typeof input !== 'string' || !input) return false;
  saveData.settings.keyBindings[action] = input;
  writeSave();
  return true;
}

export function exportSave() { return JSON.stringify(saveData, null, 2); }

export function importSave(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return false;
    copyIntoSave(parsed);
    writeSave();
    return true;
  } catch (_) { return false; }
}

export function resetAllSave() { copyIntoSave(defaultSave()); writeSave(); }
export function resetStats() { saveData.stats = defaultStats(); writeSave(); }
export function coreById(id) { return CORES.find(core => core.id === id) || CORES[0]; }
export function hangarLevel(id) { return Number(saveData.upgrades[id]) || 0; }
export function isCoreUnlocked(id) { return saveData.unlockedCores.includes(id); }

export function unlockCore(id) {
  const core = coreById(id);
  if (!core.unlockCost || isCoreUnlocked(id) || saveData.cores < core.unlockCost) return false;
  saveData.cores = normalizeCoreAmount(saveData.cores - core.unlockCost);
  saveData.unlockedCores.push(id);
  writeSave();
  return true;
}

function codexStartBonus() {
  if (!hangarLevel('codex-dividend')) return 0;
  return Math.floor((saveData.seenWeapons.length + saveData.seenEnemies.length) / 10) * 5;
}

export function startRun(coreId, practice = false, mode = 'expedition', startingWeapons = null) {
  const core = coreById(coreId);
  const hull = hangarLevel('hull') * 5;
  game.core = core;
  game.practice = practice;
  game.mode = practice ? 'practice' : mode;
  game.chapter = 1;
  game.waveIndex = 0;
  game.endlessWave = 0;
  game.bossRushIndex = 0;
  game.coins = practice ? 0 : hangarLevel('cache') * 3 + codexStartBonus();
  game.inventory = [];
  game.equipped = Array.isArray(startingWeapons) && startingWeapons.length === 2 ? [...startingWeapons] : [byName(core.startWeapon), null];
  if (!practice && mode !== 'boss-rush' && hangarLevel('starter-weapon')) game.inventory.push(pick(WEAPONS.filter(item => item.rarity === '绿')));
  game.activeSlot = 0;
  game.appliedUpgrades = [];
  game.relics = [];
  game.relicChoices = [];
  game.relicCapacity = 6 + hangarLevel('relic-capacity');
  game.restRelicGranted = {};
  game.inventoryPage = 0;
  game.autoFire = false;
  game.lootSettling = false;
  game.lootSettleTimer = 0;
  game.combo = 0;
  game.maxCombo = 0;
  game.bossRushCoreId = null;
  game.bossRushLoadout = [];
  game.bossRushScroll = 0;
  game.showUpgradeDetails = false;
  game.upgradeDetailsPage = 0;
  game.upgradeRerolls = 0;
  game.shownUpgradeIds = [];
  game.shownSpecialIds = [];
  game.specialReward = null;
  game.chapterShopLocks = {};
  game.chapterShopSold = {};
  game.runStats = { kills: 0, damageTaken: 0, critHits: 0, playerHits: 0, splitTriggers: 0, farthestWave: 1 };
  game.chapterStats = { kills: 0, damageTaken: 0, critHits: 0, playerHits: 0 };
  game.lastChapterStats = null;
  game.waveDamageTaken = 0;
  game.nextWaveDropBonus = 0;
  game.activeWaveDropBonus = 0;
  game.tip = null;
  game.critPulse = 0;
  game.redCritCooldown = 0;
  game.achievementNotice = null;
  game.enemies = []; game.bullets = []; game.enemyBullets = []; game.drops = []; game.particles = []; game.floating = []; game.zones = []; game.effects = []; game.turrets = [];
  game.bonus = baseBonus();
  applyRunBaseBonus();
  const hp = practice ? 999999 : core.maxHp + hull;
  game.player = { x: WORLD_W / 2, y: WORLD_H * .6, hp, maxHp: hp, speed: core.speed, color: core.color, facing: 0, radius: 12, fireCd: 0, dashCd: 0, dashTime: 0, shieldTime: 0, shieldCd: 0, hookCd: 0, webCd: 0, invincible: 1, hitFlash: 0, moving: false };
  game.result = null;
  game.elapsed = 0;
  game.runElapsed = 0;
  game.flash = 0;
  game.camera.x = Math.max(0, Math.min(WORLD_W - 960, game.player.x - 480));
  game.camera.y = Math.max(0, Math.min(WORLD_H - 540, game.player.y - 270));
  game.nextId = 1;
}

export function resetBattleArrays() {
  game.enemies = []; game.bullets = []; game.enemyBullets = []; game.drops = []; game.zones = []; game.effects = []; game.turrets = [];
  game.spawnQueue = []; game.spawnTimer = 1.25; game.resolveTimer = 0; game.isBoss = false; game.bossId = null;
  game.lootSettling = false; game.lootSettleTimer = 0;
}

export function currentWeapon() { return game.equipped[game.activeSlot] || game.equipped.find(Boolean) || null; }
export function weaponCollection() { return [...new Set([...game.equipped.filter(Boolean), ...game.inventory])]; }
export function makeWeaponDrop(source = 'normal') {
  const red = WEAPONS.filter(item => item.rarity === '红');
  if (source === 'boss') return pick(red);
  if (source === 'elite') return pick(Math.random() < .5 ? WEAPONS.filter(item => item.rarity === '紫') : red);
  return pick(WEAPONS.filter(item => item.rarity !== '红' || Math.random() < .16));
}

export function getUpgradeChoices(count, excluded = []) {
  const equipped = game.equipped.filter(Boolean);
  const types = new Set(equipped.map(item => item.type));
  const tags = new Set(equipped.flatMap(item => item.tags));
  const used = game.appliedUpgrades || [];
  const excludedIds = new Set(excluded);
  const sameRarity = equipped.length === 2 && equipped[0].rarity === equipped[1].rarity;
  const pool = UPGRADES.filter(item => {
    const times = used.filter(id => id === item.id).length;
    if (excludedIds.has(item.id) || times >= 2) return false;
    if (item.chapter && game.chapter < item.chapter) return false;
    if (item.requires && !types.has(item.requires)) return false;
    if (item.unique && times) return false;
    if (item.synergy === 'pierce' && !equipped.every(weapon => weapon.tags.includes('穿透'))) return false;
    if (item.synergy === 'homing' && !equipped.every(weapon => weapon.tags.includes('追踪'))) return false;
    if (item.synergy === 'rarity' && !sameRarity) return false;
    return !item.synergy || tags.size > 0;
  });
  const choices = [];
  while (pool.length && choices.length < count) {
    const total = pool.reduce((sum, item) => sum + (item.weight || (item.unique || item.synergy ? 1 : 5)), 0);
    let roll = Math.random() * total;
    let index = 0;
    for (; index < pool.length - 1; index++) { roll -= pool[index].weight || (pool[index].unique || pool[index].synergy ? 1 : 5); if (roll <= 0) break; }
    choices.push(pool.splice(index, 1)[0]);
  }
  return choices;
}

export function getRelicChoices(count = 3) {
  const owned = new Set(game.relics.map(item => item.id));
  const pool = RELICS.filter(item => !owned.has(item.id));
  const choices = [];
  while (pool.length && choices.length < count) choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return choices;
}

export function applyUpgrade(upgrade) { upgrade.apply(game); game.appliedUpgrades.push(upgrade.id); }
export function applyRelic(relic) { if (game.relics.length >= game.relicCapacity || game.relics.some(item => item.id === relic.id)) return false; relic.apply(game); game.relics.push(relic); return true; }

function applyRunBaseBonus() {
  if (!game.core) return;
  game.bonus.revives = hangarLevel('revive-charge');
  if (game.core.id === 'triangle') { game.bonus.crit = .12; game.bonus.dashTrail = true; game.bonus.dashCd *= Math.max(.65, 1 - hangarLevel('triangle') * .06); }
  if (game.core.id === 'hex') game.bonus.explosion = 1.25 + hangarLevel('hex') * .06;
  if (game.core.id === 'square') game.bonus.webRadius = 1.2;
  if (game.core.id === 'orbit') game.bonus.bounceChance = .15;
}

export function rebuildRunBonuses() {
  const mirrorUsed = game.bonus.mirrorUsed;
  const relics = [...game.relics];
  const upgrades = [...(game.appliedUpgrades || [])];
  game.bonus = baseBonus();
  applyRunBaseBonus();
  for (const relic of relics) relic.apply(game);
  for (const id of upgrades) UPGRADES.find(item => item.id === id)?.apply(game);
  game.bonus.mirrorUsed = mirrorUsed;
}

export function removeRandomUpgrade() {
  if (!game.appliedUpgrades?.length) return null;
  const index = Math.floor(Math.random() * game.appliedUpgrades.length);
  const id = game.appliedUpgrades.splice(index, 1)[0];
  rebuildRunBonuses();
  return UPGRADES.find(item => item.id === id) || null;
}

export function promoteWeapon(weapon) {
  if (!weapon) return null;
  const rarityIndex = RARITY_ORDER.indexOf(weapon.rarity);
  if (rarityIndex < 0 || rarityIndex >= RARITY_ORDER.length - 1) return null;
  const promotion = (weapon.promotion || 0) + 1;
  return { ...weapon, rarity: RARITY_ORDER[rarityIndex + 1], damage: Math.round(weapon.damage * 1.18), rate: Number((weapon.rate * 1.1).toFixed(2)), speed: Math.round(weapon.speed * 1.08), price: Math.ceil(weapon.price * 1.2), promotion, baseName: weapon.baseName || weapon.name };
}

export function infuseWeapon(weapon) {
  if (!weapon) return null;
  const elements = [...new Set(weapon.elements || [weapon.element].filter(Boolean))];
  const candidates = ['fire', 'ice', 'lightning'].filter(element => !elements.includes(element));
  if (!candidates.length) return null;
  return { ...weapon, elements: [...elements, pick(candidates)] };
}

export function unlockAchievement(id) {
  if (!ACHIEVEMENTS.some(item => item.id === id) || saveData.achievements[id]) return false;
  saveData.achievements[id] = true;
  saveData.cores = normalizeCoreAmount(saveData.cores + 30);
  writeSave();
  return true;
}

export function achievementProgress() { return ACHIEVEMENTS.filter(item => saveData.achievements[item.id]).length; }

export function purchaseHangar(id) {
  const node = HANGAR_NODES.find(item => item.id === id);
  if (!node) return false;
  const level = hangarLevel(id);
  const cost = node.cost * (level + 1);
  if (level >= node.max || saveData.cores < cost) return false;
  saveData.cores = normalizeCoreAmount(saveData.cores - cost);
  saveData.upgrades[id] = level + 1;
  writeSave();
  return true;
}

export function discoverWeapon(name) { if (!saveData.seenWeapons.includes(name)) { saveData.seenWeapons.push(name); writeSave(); } }
export function discoverEnemy(name) { if (!saveData.seenEnemies.includes(name)) { saveData.seenEnemies.push(name); writeSave(); } }

export function recordWeaponUse(name) { saveData.stats.weapons[name] = (saveData.stats.weapons[name] || 0) + 1; }
export function recordRun(win, summary = {}) {
  if (!game.practice) {
    saveData.stats.totalPlayTime += Math.round(game.runElapsed);
    saveData.stats.core[game.core.id] = saveData.stats.core[game.core.id] || { runs: 0, wins: 0 };
    saveData.stats.core[game.core.id].runs++;
    if (win) saveData.stats.core[game.core.id].wins++;
    if (!win) saveData.stats.deaths++;
    saveData.lastRun = { mode: game.mode, coreId: game.core.id, core: game.core.short, win, farthestWave: summary.farthestWave || game.runStats?.farthestWave || 1, at: Date.now() };
    writeSave();
  }
}
