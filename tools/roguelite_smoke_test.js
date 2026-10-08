const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const URL = 'http://127.0.0.1:8081/index.html';
const W = 960;
const H = 540;
const V2_KEY = 'geometry_duel_tactics_roguelite_v2';
const V3_KEY = 'geometry_duel_tactics_roguelite_v3';
const V4_KEY = 'geometry_duel_tactics_roguelite_v4';

async function dragSlider(page, canvasBox, y, value) {
  const scale = canvasBox.width / W;
  await page.mouse.move(canvasBox.x + (120 + 8) * scale, canvasBox.y + (y + 7) * scale);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + (120 + 260 * value) * scale, canvasBox.y + (y + 7) * scale, { steps: 8 });
  await page.mouse.up();
}

async function main() {
  if (fs.readFileSync(path.join(__dirname, '..', 'js', 'main.js'), 'utf8').includes(['hit', 'stop'].join(''))) throw new Error('frame-freeze marker remains in main.js');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__geometryDuel));

  await page.evaluate(({ key, value }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: V2_KEY, value: { version: 2, cores: 7, settings: { master: .2, sfx: .3, music: .4 } } });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__geometryDuel));
  const migrated = await page.evaluate(key => ({ data: window.__geometryDuel.saveData, stored: JSON.parse(localStorage.getItem(key)) }), V4_KEY);
  if (migrated.data.version !== 4 || migrated.data.settings.cheatMode !== false || migrated.data.settings.redWeaponGlow !== true || migrated.data.settings.keyBindings?.moveUp !== 'KeyW' || migrated.data.settings.keyBindings?.fire !== 'Mouse0' || migrated.stored.version !== 4) throw new Error(`v4 migration failed: ${JSON.stringify(migrated)}`);

  const content = await page.evaluate(async () => {
    const module = await import('./js/content.js');
    const types = {};
    for (const weapon of module.WEAPONS) { types[weapon.type] = types[weapon.type] || new Set(); types[weapon.type].add(weapon.rarity); }
    return { cores: module.CORES.length, weapons: module.WEAPONS.length, chapters: module.CHAPTERS.length, relics: module.RELICS.length, worldW: module.WORLD_W, worldH: module.WORLD_H, types: Object.fromEntries(Object.entries(types).map(([type, rarities]) => [type, rarities.size])), red: module.WEAPONS.filter(item => item.rarity === '红').length };
  });
  if (content.cores !== 5 || content.weapons !== 66 || content.red !== 11 || Object.values(content.types).some(count => count !== 6) || content.chapters !== 3 || content.relics !== 6 || content.worldW !== W * 2 || content.worldH !== H * 2) throw new Error(`content mismatch: ${JSON.stringify(content)}`);

  const backing = await page.locator('#gameCanvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
  if (backing.width < W * 2 || backing.height < H * 2) throw new Error(`high-DPI backing store missing: ${JSON.stringify(backing)}`);

  await page.evaluate(() => window.__geometryDuel.startExpedition('square', 'expedition'));
  await page.waitForFunction(() => window.__geometryDuel.game.state === 'battle');
  await page.waitForTimeout(1400);
  await page.evaluate(() => {
    const g = window.__geometryDuel.game;
    const p = g.player;
    g.spawnQueue = [];
    g.enemies = [{ id: 999, x: p.x + 250, y: p.y, hp: 999999, maxHp: 999999, speed: 0, damage: 0, radius: 15, kind: 'melee', cooldown: 99, attackTimer: 99, hit: 0, slow: 0, freeze: 0, burn: 0, burnDamage: 0, reveal: 0, status: null, sides: 4, color: '#ffbd6b', facing: 0 }];
    p.invincible = 999;
    p.fireCd = 0;
  });
  await page.keyboard.press('KeyK');
  const usesBefore = await page.evaluate(() => {
    const g = window.__geometryDuel.game;
    return window.__geometryDuel.saveData.stats.weapons[g.equipped[g.activeSlot].name] || 0;
  });
  await page.waitForTimeout(600);
  await page.mouse.click(1500, 420);
  await page.waitForTimeout(700);
  const autoState = await page.evaluate(() => {
    const g = window.__geometryDuel.game;
    const weapon = g.equipped[g.activeSlot].name;
    return { auto: g.autoFire, uses: window.__geometryDuel.saveData.stats.weapons[weapon] || 0, bullets: g.bullets.length, elapsed: g.elapsed, camera: g.camera };
  });
  if (!autoState.auto || autoState.uses <= usesBefore || !autoState.bullets) throw new Error(`continuous auto-fire failed: ${JSON.stringify({ usesBefore, autoState })}`);

  await page.mouse.click(1500, 420, { button: 'right' });
  await page.keyboard.press('KeyQ');
  await page.keyboard.press('KeyE');
  const controls = await page.evaluate(() => {
    const g = window.__geometryDuel.game;
    return { dash: g.player.dashCd, web: g.zones.length };
  });
  if (controls.dash <= 0 || !controls.web) throw new Error(`combat controls failed: ${JSON.stringify(controls)}`);

  const cheat = await page.evaluate(() => {
    const api = window.__geometryDuel;
    const p = api.game.player;
    api.saveData.settings.cheatMode = true;
    p.hp = 5;
    p.invincible = 0;
    p.dashTime = 0;
    api.damagePlayer(9999);
    return { hp: p.hp, state: api.game.state };
  });
  if (cheat.hp !== 1 || cheat.state !== 'battle') throw new Error(`cheat mode did not preserve life: ${JSON.stringify(cheat)}`);
  const normalDeath = await page.evaluate(() => {
    const api = window.__geometryDuel;
    api.saveData.settings.cheatMode = false;
    api.game.player.hp = 5;
    api.game.player.invincible = 0;
    api.game.player.dashTime = 0;
    api.damagePlayer(9999);
    return api.game.state;
  });
  if (normalDeath !== 'result') throw new Error(`normal death did not resolve: ${normalDeath}`);

  await page.evaluate(() => window.__geometryDuel.startExpedition('square', 'expedition'));
  await page.waitForFunction(() => window.__geometryDuel.game.state === 'battle');
  await page.evaluate(() => {
    const g = window.__geometryDuel.game;
    g.player.x = g.world?.width || 1908;
    g.player.x = 1908;
    g.player.y = 1068;
    g.player.invincible = 999;
  });
  await page.waitForTimeout(450);
  const camera = await page.evaluate(() => ({ camera: window.__geometryDuel.game.camera, world: window.__geometryDuel.world }));
  if (camera.camera.x <= 0 || camera.camera.y <= 0 || camera.camera.x > camera.world.width - W || camera.camera.y > camera.world.height - H) throw new Error(`camera bounds failed: ${JSON.stringify(camera)}`);
  const minimapBorder = await page.locator('#gameCanvas').evaluate((canvas, logicalW) => {
    const dpr = canvas.width / logicalW;
    const data = canvas.getContext('2d').getImageData(Math.round((logicalW - 184) * dpr), Math.round(18 * dpr), 1, 1).data;
    return data[0] + data[1] + data[2];
  }, W);
  if (minimapBorder < 150) throw new Error(`minimap did not render: ${minimapBorder}`);

  await page.evaluate(() => { const g = window.__geometryDuel.game; g.state = 'codex'; g.codexTab = 'weapons'; g.codexPage = 0; });
  await page.waitForTimeout(80);
  const codexBox = await page.locator('#gameCanvas').boundingBox();
  const codexScale = codexBox.width / W;
  await page.mouse.click(codexBox.x + 570 * codexScale, codexBox.y + 71 * codexScale);
  if (!await page.evaluate(() => window.__geometryDuel.game.codexTab === 'enemies')) throw new Error('codex enemy tab did not open');
  await page.evaluate(() => { window.__geometryDuel.game.state = 'battle'; window.__geometryDuel.game.appliedUpgrades = ['damage', 'rate', 'hp', 'speed']; });

  await page.keyboard.down('Tab');
  await page.waitForTimeout(80);
  if (!await page.evaluate(() => window.__geometryDuel.game.showBuild)) throw new Error('build panel did not open');
  await page.keyboard.up('Tab');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__geometryDuel.game.state === 'pause');
  await page.waitForTimeout(80);
  await page.mouse.click(codexBox.x + 658 * codexScale, codexBox.y + 237 * codexScale);
  if (!await page.evaluate(() => window.__geometryDuel.game.showUpgradeDetails)) throw new Error('pause upgrade details did not open');
  await page.keyboard.press('Escape');
  if (await page.evaluate(() => window.__geometryDuel.game.showUpgradeDetails)) throw new Error('pause upgrade details did not close');
  const paused = await page.evaluate(() => window.__geometryDuel.game.elapsed);
  await page.waitForTimeout(120);
  const pausedAgain = await page.evaluate(() => window.__geometryDuel.game.elapsed);
  if (paused !== pausedAgain) throw new Error('pause did not freeze elapsed time');

  const restInventory = await page.evaluate(async () => {
    const api = window.__geometryDuel;
    const module = await import('./js/content.js');
    const [first, second, replacement] = module.WEAPONS.slice(0, 3);
    api.game.equipped = [first, second];
    api.game.inventory = [first, second, replacement];
    api.game.state = 'rest';
    return { first: first.name, second: second.name, replacement: replacement.name };
  });
  await page.waitForTimeout(80);
  const restResult = await page.evaluate(({ first, replacement }) => {
    const api = window.__geometryDuel;
    const before = api.game.inventory.map(item => item.name);
    api.equipInventoryWeapon(api.game.inventory[0], 0);
    const afterEquip = { slot1: api.game.equipped[0].name, bag: api.game.inventory.map(item => item.name) };
    api.sellInventoryWeapon(api.game.inventory[0]);
    return { before, afterEquip, afterSell: api.game.inventory.map(item => item.name), first, replacement };
  }, restInventory);
  if (restResult.before.length !== 1 || restResult.before[0] !== restResult.replacement || restResult.afterEquip.slot1 !== restResult.replacement || !restResult.afterEquip.bag.includes(restResult.first) || restResult.afterSell.length) throw new Error(`rest inventory separation failed: ${JSON.stringify(restResult)}`);

  const restPromotion = await page.evaluate(async () => {
    const api = window.__geometryDuel;
    const content = await import('./js/content.js');
    const state = await import('./js/state.js');
    const white = content.WEAPONS.find(item => item.rarity === '白' && item.price % 2 === 1);
    const red = content.WEAPONS.find(item => item.rarity === '红');
    const cost = Math.ceil(white.price / 2);
    api.game.equipped = [white, red];
    api.game.coins = cost - 1;
    const insufficient = api.promoteEquippedWeapon(0);
    api.game.coins = cost;
    const promoted = api.promoteEquippedWeapon(0);
    const redAttempt = api.promoteEquippedWeapon(1);
    api.game.mode = 'endless';
    api.game.maxCombo = 290;
    api.game.runStats = { farthestWave: 1 };
    api.saveData.cores = 0;
    api.saveData.stats.kills = 0;
    api.saveData.upgrades.salvage = 1;
    api.finishRun(true);
    return { cost, insufficient, promoted, redAttempt, coins: api.game.coins, rarity: api.game.equipped[0].rarity, expectedRarity: state.promoteWeapon(white).rarity, reward: api.game.result.reward, storedCores: api.saveData.cores, formattedDecimal: state.formatCoreAmount(58.300000000000004), formattedWhole: state.formatCoreAmount(58) };
  });
  if (restPromotion.cost !== 5 || restPromotion.insufficient || !restPromotion.promoted || restPromotion.redAttempt || restPromotion.coins !== 0 || restPromotion.rarity !== restPromotion.expectedRarity || restPromotion.reward !== 58.3 || restPromotion.storedCores !== 58.3 || restPromotion.formattedDecimal !== '58.3' || restPromotion.formattedWhole !== '58') throw new Error(`rest promotion or core formatting failed: ${JSON.stringify(restPromotion)}`);

  const planFourSystems = await page.evaluate(async () => {
    const api = window.__geometryDuel;
    const content = await import('./js/content.js');
    const state = await import('./js/state.js');
    const red = Object.fromEntries(['相位分界线', '递归绽放', '日冕裁决'].map(name => { const weapon = content.WEAPONS.find(item => item.name === name); return [name, { damage: weapon.damage, splits: weapon.splits, beam: weapon.beam, rate: weapon.rate }]; }));
    const bossDrops = Array.from({ length: 8 }, () => state.makeWeaponDrop('boss').rarity);
    const eliteDrops = Array.from({ length: 16 }, () => state.makeWeaponDrop('elite').rarity);
    api.startExpedition('square', 'expedition');
    api.game.chapter = 1;
    const chapterOne = state.getUpgradeChoices(30).map(item => item.id);
    api.game.chapter = 3;
    api.game.coins = 40;
    api.game.choiceKind = 'upgrade';
    api.game.upgradeRerolls = 0;
    api.game.shownUpgradeIds = [];
    api.game.upgradeChoices = state.getUpgradeChoices(3);
    api.game.shownUpgradeIds.push(...api.game.upgradeChoices.map(item => item.id));
    const initial = [...api.game.upgradeChoices.map(item => item.id)];
    const rerolled = api.rerollUpgradeChoices();
    const afterReroll = api.game.upgradeChoices.map(item => item.id);
    api.game.choiceKind = 'special';
    api.game.specialReward = { id: 'instant-coins', apply: () => { api.game.coins += 18; } };
    const beforeSpecial = api.game.coins;
    api.chooseReward(api.game.specialReward);
    const promoted = state.promoteWeapon(content.WEAPONS.find(item => item.name === '矢量针'));
    const infused = state.infuseWeapon(content.WEAPONS.find(item => item.name === '矢量针'));
    api.game.chapter = 2;
    const shopOne = api.createShop();
    const shopTwo = api.createShop();
    const achievementCores = api.saveData.cores;
    const achievementFirst = api.awardAchievement('full-bag-sale');
    const achievementSecond = api.awardAchievement('full-bag-sale');
    return { red, bossDrops, eliteDrops, chapterOne, rerolled, initial, afterReroll, coinsAfterSpecial: api.game.coins, beforeSpecial, promoted, infused, shopOne: shopOne.map(item => ({ name: item.name, locked: item.shopLocked, theme: item.shopTheme?.label })), shopTwo: shopTwo.map(item => item.name), achievementFirst, achievementSecond, achievementCores, coresAfterAchievement: api.saveData.cores };
  });
  if (planFourSystems.red['相位分界线'].damage !== 52 || planFourSystems.red['递归绽放'].splits !== 7 || planFourSystems.red['日冕裁决'].beam !== 420 || planFourSystems.red['日冕裁决'].rate !== 6.4) throw new Error(`red balance mismatch: ${JSON.stringify(planFourSystems.red)}`);
  if (planFourSystems.bossDrops.some(rarity => rarity !== '红') || planFourSystems.eliteDrops.some(rarity => rarity !== '紫' && rarity !== '红')) throw new Error(`special drops failed: ${JSON.stringify(planFourSystems)}`);
  if (planFourSystems.chapterOne.some(id => ['rapid-cooling', 'charged-start', 'destruction-strike'].includes(id)) || !planFourSystems.rerolled || planFourSystems.initial.some(id => planFourSystems.afterReroll.includes(id)) || planFourSystems.coinsAfterSpecial !== planFourSystems.beforeSpecial + 18) throw new Error(`upgrade reroll or gating failed: ${JSON.stringify(planFourSystems)}`);
  if (planFourSystems.promoted.rarity !== '绿' || !planFourSystems.infused.elements?.length || planFourSystems.shopOne.slice(0, 3).some(item => !item.locked) || planFourSystems.shopOne.slice(0, 3).map(item => item.name).join('|') !== planFourSystems.shopTwo.slice(0, 3).join('|') || !planFourSystems.achievementFirst || planFourSystems.achievementSecond || planFourSystems.coresAfterAchievement !== planFourSystems.achievementCores + 30) throw new Error(`plan-4 systems failed: ${JSON.stringify(planFourSystems)}`);

  await page.evaluate(() => { window.__geometryDuel.game.state = 'settings'; });
  await page.waitForTimeout(100);
  const canvasBox = await page.locator('#gameCanvas').boundingBox();
  await dragSlider(page, canvasBox, 82, .75);
  await dragSlider(page, canvasBox, 132, .65);
  await dragSlider(page, canvasBox, 182, .55);
  await page.waitForTimeout(80);
  const audio = await page.evaluate(key => ({ settings: window.__geometryDuel.saveData.settings, stored: JSON.parse(localStorage.getItem(key)).settings }), V4_KEY);
  for (const [key, expected] of Object.entries({ master: .75, sfx: .65, music: .55 })) {
    if (Math.abs(audio.settings[key] - expected) > .03 || Math.abs(audio.stored[key] - expected) > .03) throw new Error(`slider failed for ${key}: ${JSON.stringify(audio)}`);
  }

  await page.evaluate(() => { window.__geometryDuel.game.state = 'title'; window.__geometryDuel.saveData.stats.clears = 1; });
  await page.evaluate(() => window.__geometryDuel.startExpedition('square', 'endless'));
  await page.waitForFunction(() => window.__geometryDuel.game.mode === 'endless' && window.__geometryDuel.game.endlessWave === 1);
  await page.evaluate(() => window.__geometryDuel.startExpedition('triangle', 'boss-rush'));
  await page.waitForFunction(() => window.__geometryDuel.game.state === 'boss-rush-loadout');
  const bossCanvasBox = await page.locator('#gameCanvas').boundingBox();
  const bossScale = bossCanvasBox.width / W;
  await page.mouse.move(bossCanvasBox.x + 470 * bossScale, bossCanvasBox.y + 440 * bossScale);
  await page.mouse.down();
  await page.mouse.move(bossCanvasBox.x + 470 * bossScale, bossCanvasBox.y + 160 * bossScale, { steps: 10 });
  await page.mouse.up();
  const bossScroll = await page.evaluate(() => window.__geometryDuel.game.bossRushScroll);
  if (bossScroll < 150) throw new Error(`boss-rush drag scroll failed: ${bossScroll}`);
  const bossShot = path.join(os.tmpdir(), 'geometry-v5-boss-rush-scroll.png');
  await page.screenshot({ path: bossShot });
  await page.mouse.click(bossCanvasBox.x + 472 * bossScale, bossCanvasBox.y + 451 * bossScale);
  await page.mouse.click(bossCanvasBox.x + 170 * bossScale, bossCanvasBox.y + 311 * bossScale);
  const bossLoadout = await page.evaluate(() => ({ selected: window.__geometryDuel.game.bossRushLoadout.map(item => item.name) }));
  if (new Set(bossLoadout.selected).size !== 2) throw new Error(`boss-rush loadout selection failed: ${JSON.stringify(bossLoadout)}`);
  await page.waitForTimeout(80);
  await page.mouse.click(bossCanvasBox.x + 480 * bossScale, bossCanvasBox.y + 502 * bossScale);
  await page.waitForFunction(() => window.__geometryDuel.game.mode === 'boss-rush' && window.__geometryDuel.game.isBoss);
  const equippedBossWeapons = await page.evaluate(() => window.__geometryDuel.game.equipped.map(item => ({ name: item?.name, rarity: item?.rarity })));
  if (equippedBossWeapons.some(item => item.rarity !== '橙') || new Set(equippedBossWeapons.map(item => item.name)).size !== 2) throw new Error(`boss-rush weapons incorrect: ${JSON.stringify(equippedBossWeapons)}`);

  await page.evaluate(() => { window.__geometryDuel.game.state = 'help'; });
  await page.waitForTimeout(80);
  const helpCanvasBox = await page.locator('#gameCanvas').boundingBox();
  const helpScale = helpCanvasBox.width / W;
  await page.mouse.click(helpCanvasBox.x + 391 * helpScale, helpCanvasBox.y + 243 * helpScale);
  await page.waitForFunction(() => !document.getElementById('keybindDialog').hidden && !document.getElementById('keybindPrompt').hidden);
  await page.keyboard.press('KeyZ');
  await page.waitForFunction(() => !document.getElementById('keybindConfirmation').hidden);
  const keybindConfirmation = await page.locator('#keybindConfirmationText').textContent();
  if (!keybindConfirmation.includes('原按键为（Q）键') || !keybindConfirmation.includes('切换为（Z）键')) throw new Error(`keybind confirmation text failed: ${keybindConfirmation}`);
  const keybindShot = path.join(os.tmpdir(), 'geometry-v5-keybind-confirm.png');
  await page.screenshot({ path: keybindShot });
  await page.locator('#keybindConfirm').click();
  await page.waitForFunction(() => document.getElementById('keybindDialog').hidden);
  await page.mouse.click(helpCanvasBox.x + 817 * helpScale, helpCanvasBox.y + 243 * helpScale);
  await page.keyboard.press('KeyX');
  await page.locator('#keybindCancel').click();
  if (await page.evaluate(() => window.__geometryDuel.saveData.settings.keyBindings.web) !== 'KeyE') throw new Error('keybind cancel changed the binding');
  await page.mouse.click(helpCanvasBox.x + 817 * helpScale, helpCanvasBox.y + 243 * helpScale);
  await page.keyboard.press('KeyZ');
  await page.locator('#keybindConfirm').click();
  await page.mouse.click(helpCanvasBox.x + 817 * helpScale, helpCanvasBox.y + 195 * helpScale);
  await page.locator('#keybindPrompt').click();
  await page.locator('#keybindConfirm').click();
  const bindings = await page.evaluate(key => ({ bindings: window.__geometryDuel.saveData.settings.keyBindings, stored: JSON.parse(localStorage.getItem(key)).settings.keyBindings }), V4_KEY);
  if (bindings.bindings.hook !== 'KeyZ' || bindings.bindings.web !== 'KeyZ' || bindings.bindings.dash !== 'Mouse0' || bindings.stored.hook !== 'KeyZ' || bindings.stored.web !== 'KeyZ' || bindings.stored.dash !== 'Mouse0') throw new Error(`keybind persistence or duplicate binding failed: ${JSON.stringify(bindings)}`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__geometryDuel));
  const reloadedBindings = await page.evaluate(() => window.__geometryDuel.saveData.settings.keyBindings);
  if (reloadedBindings.hook !== 'KeyZ' || reloadedBindings.web !== 'KeyZ' || reloadedBindings.dash !== 'Mouse0') throw new Error(`keybind reload persistence failed: ${JSON.stringify(reloadedBindings)}`);
  await page.evaluate(() => { const api = window.__geometryDuel; api.startExpedition('square', 'expedition'); api.game.player.hookCd = 0; api.game.player.webCd = 0; });
  await page.waitForFunction(() => window.__geometryDuel.game.state === 'battle');
  await page.keyboard.press('KeyZ');
  const duplicateActions = await page.evaluate(() => ({ hookCd: window.__geometryDuel.game.player.hookCd, webCd: window.__geometryDuel.game.player.webCd }));
  if (duplicateActions.hookCd <= 0 || duplicateActions.webCd <= 0) throw new Error(`duplicate key actions failed: ${JSON.stringify(duplicateActions)}`);

  await page.evaluate(() => { window.__geometryDuel.game.state = 'settings'; });
  await page.waitForTimeout(80);
  const desktopShot = path.join(os.tmpdir(), 'geometry-v4-desktop.png');
  const mobileShot = path.join(os.tmpdir(), 'geometry-v4-mobile.png');
  await page.screenshot({ path: desktopShot });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: mobileShot });
  const pixels = await page.locator('#gameCanvas').evaluate(canvas => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let visible = 0;
    for (let i = 0; i < data.length; i += 64) if (data[i] + data[i + 1] + data[i + 2] > 40) visible++;
    return visible;
  });
  if (pixels < 100) throw new Error('canvas appears blank');
  if (errors.length) throw new Error(errors.join('\n'));
  await browser.close();
  console.log(`OK: v4 migration, 66 weapons, combat, boss-rush drag loadout, key rebinding, codex, pause details, rest inventory and promotion, core formatting, world camera, minimap, sliders (${pixels} samples)`);
  console.log(`Screenshots: ${desktopShot} | ${mobileShot} | ${bossShot} | ${keybindShot}`);
}

main().catch(error => { console.error(error.stack || error); process.exit(1); });
