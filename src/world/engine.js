import * as T from 'three';
import { WorldScene } from './scene.js';
import { ship, person, house, salvageFlotsam, mat } from './assets.js';
import { sound } from './audio.js';
import {
  ISLANDS,
  FISH_SPOTS,
  FISH_TYPES,
  BUILDINGS,
  CONTRACT_TEMPLATES,
  SAVE_KEY,
  freshState,
  dockOf,
  shoreOf
} from './content.js';
import {
  loadWorld,
  dist,
  terrainAt,
  onDock,
  walkable,
  navigable,
  windFactor,
  findPath,
  marketPrice,
  buyGood,
  sellGood,
  sellFish,
  transferToWarehouse,
  transferFromWarehouse,
  maxHull,
  cargo,
  cargoLimit,
  shipName
} from './rules.js';

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export class GameWorld {
  constructor(container, onUpdate) {
    this.state = loadWorld();
    this.onUpdate = onUpdate;
    this.visual = new WorldScene(container, this.state);
    this.canvas = this.visual.renderer.domElement;
    this.keys = new Set();
    this.route = [];
    this.panel = null;
    this.fishing = null;
    this.projectiles = [];
    this.enemies = [];
    this.salvage = [];
    this.batteryTarget = null;
    this.toast = null;
    this.toastUntil = 0;
    this.cooldown = 0;
    this.clock = 0;
    this.uiClock = 0;
    this.saveClock = 0;
    this.supplyClock = 0;
    this.footstepClock = 0;
    this.lastStamp = 0;
    this.mouse = { x: this.state.x, z: this.state.z + 20 };
    this.paused = false;
    this.walking = false;
    this.held = false;
    this.menuIsland = null;
    this.buildModels = [];
    this.dodgeCooldown = 0;
    this.boardingTarget = null;

    this.createEnemies();
    this.createSalvage();
    this.createOwnedBuildings();

    this.listeners = [];
    this.listen(window, 'keydown', e => this.keyDown(e));
    this.listen(window, 'keyup', e => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this.held = false;
    });
    this.listen(window, 'blur', () => {
      this.keys.clear();
      this.held = false;
    });
    this.listen(this.canvas, 'pointermove', e => {
      this.mouse = this.visual.worldPoint(e.clientX, e.clientY, this.state.mode === 'ship');
    });
    this.listen(this.canvas, 'pointerdown', e => this.pointerDown(e));
    this.listen(this.canvas, 'contextmenu', e => e.preventDefault());
    this.listen(
      this.canvas,
      'wheel',
      e => {
        e.preventDefault();
        this.visual.setZoom(this.visual.zoom + e.deltaY * 0.025);
        this.emit();
      },
      { passive: false }
    );

    this.save();
    this.frame = this.frame.bind(this);
    this.frameId = requestAnimationFrame(this.frame);
    this.emit();
  }

  listen(target, event, callback, options) {
    target.addEventListener(event, callback, options);
    this.listeners.push(() => target.removeEventListener(event, callback, options));
  }

  keyDown(e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    this.keys.add(e.code);
    if (e.repeat) return;

    if (e.code === 'Escape') {
      this.closePanel();
      return;
    }
    if (e.code === 'KeyM') {
      this.panel = this.panel === 'chart' ? null : 'chart';
      this.emit();
      return;
    }
    if (e.code === 'KeyI') {
      this.panel = this.panel === 'inventory' ? null : 'inventory';
      this.emit();
      return;
    }
    if (e.code === 'KeyE') {
      this.interact();
      return;
    }
    if (e.code === 'KeyR') {
      this.visual.setZoom(36);
      this.visual.panOffset.set(0, 0, 0);
      return;
    }
    if (e.code === 'Space' && this.fishing) {
      if (this.fishing.phase === 'bite') this.hookFish();
      this.held = true;
      return;
    }
    if (e.code === 'Space' && this.state.mode === 'foot') {
      this.dodge();
      return;
    }
    if (e.code === 'KeyF' || (e.code === 'Space' && this.state.mode === 'ship')) {
      this.fire();
    }
  }

  pointerDown(e) {
    this.canvas.focus();
    sound.ensureContext();
    const point = this.visual.worldPoint(e.clientX, e.clientY, this.state.mode === 'ship');
    this.mouse = point;
    if (this.panel || this.fishing) return;

    if (e.button === 2) {
      this.fire(point);
      return;
    }
    if (e.button !== 0) return;

    if (this.state.mode === 'ship' && this.enemies.some(enemy => enemy.alive && dist(point, enemy) < 8)) {
      this.fire(point);
    } else {
      this.navigate(point);
    }
  }

  navigate(point) {
    if (this.fishing || this.panel === 'market' || this.panel === 'shipyard') {
      this.closePanel();
    }
    const mode = this.state.mode;
    if (mode === 'foot' && !walkable(point.x, point.z)) {
      this.notify('Walk to your skiff at the end of the pier. Press E to board.');
      return false;
    }
    if (mode === 'ship' && !navigable(point.x, point.z)) {
      this.notify('Land ahead. Approach the dock and press E to go ashore.');
      return false;
    }
    const blocked = (x, z) => mode === 'foot' && this.visual.isBlocked(x, z);
    const route = findPath(this.state, point, mode, blocked);
    if (!route.length) {
      this.notify('The path is blocked. Try a point on the road or open water.');
      return false;
    }
    this.route = route;
    this.visual.destination.visible = true;
    this.visual.destination.position.set(point.x, mode === 'foot' ? 2.19 : 0.25, point.z);
    return true;
  }

  plotCourse(island) {
    if (this.state.mode !== 'ship') {
      this.notify('Board your skiff before setting a sea course.');
      return;
    }
    this.panel = null;
    this.navigate(dockOf(island));
    this.notify(`Course set for ${island.name}. Steer with WASD or let the helm guide you.`);
    this.emit();
  }

  interactions() {
    const s = this.state;
    const result = [];
    if (s.mode === 'foot') {
      result.push({
        id: 'boat',
        name: `Board ${shipName(s).toLowerCase()}`,
        kind: 'boat',
        x: s.boat.x,
        z: s.boat.z,
        range: 11,
        waypoint: { x: s.boat.x, z: s.boat.z - 5 }
      });
      for (const island of ISLANDS) {
        if (island.type === 'home' || island.type === 'trade' || s.captured.includes(island.id)) {
          result.push({
            id: `market-${island.id}`,
            name: island.id === 'haven' ? 'Mara · Harbor market' : 'Merchant · Market',
            kind: 'market',
            island,
            x: island.x - 12,
            z: island.z + (island.type === 'wild' ? 14 : 24),
            range: 8
          });
          result.push({
            id: `yard-${island.id}`,
            name: 'Shipwright · Upgrades',
            kind: 'shipyard',
            island,
            x: island.x + (island.type === 'wild' ? 14 : 24),
            z: island.z + (island.type === 'wild' ? 14 : 25),
            range: 8
          });
        }
        if (island.type === 'hostile' || island.type === 'wild' || s.captured.includes(island.id)) {
          result.push({
            id: `flag-${island.id}`,
            name: s.captured.includes(island.id)
              ? 'Settlement & warehouse'
              : island.type === 'hostile'
              ? 'Raise your flag'
              : 'Establish a settlement',
            kind: 'settlement',
            island,
            x: island.x + 8,
            z: island.z + 12,
            range: 7
          });
        }
      }
    } else {
      // In Ship mode
      for (const island of ISLANDS) {
        result.push({
          id: `dock-${island.id}`,
          name: `Go ashore · ${island.name}`,
          kind: 'dock',
          island,
          ...dockOf(island),
          range: 18
        });
      }
      // Boarding action interaction on crippled corsairs
      for (const enemy of this.enemies) {
        if (enemy.alive && enemy.kind === 'ship' && enemy.health <= enemy.max * 0.3) {
          result.push({
            id: `board-${enemy.id}`,
            name: 'Board enemy vessel (E)',
            kind: 'board',
            enemy,
            x: enemy.x,
            z: enemy.z,
            range: 12
          });
        }
      }
    }

    for (const spot of FISH_SPOTS) {
      result.push({
        id: spot.id,
        name: spot.name,
        kind: 'fish',
        spot,
        x: spot.x,
        z: spot.z,
        range: s.mode === 'foot' ? 13 : 15,
        waypoint: s.mode === 'foot' ? { x: spot.x + 3, z: spot.z - 8 } : { x: spot.x, z: spot.z + 4 }
      });
    }

    return result;
  }

  nearest() {
    return this.interactions()
      .filter(i => dist(i, this.state) < i.range)
      .sort((a, b) => dist(a, this.state) - dist(b, this.state))[0];
  }

  approach(item) {
    if (dist(item, this.state) < item.range) {
      this.interact(item);
      return;
    }
    const point = item.waypoint || { x: item.x, z: item.z };
    this.navigate(point);
  }

  interact(item = this.nearest()) {
    if (this.fishing || this.panel) {
      this.closePanel();
      return;
    }
    if (!item) {
      this.notify('Move closer to a person, your skiff, a fishing school, or a dock.');
      return;
    }
    const s = this.state;
    this.route = [];
    this.visual.destination.visible = false;

    if (item.kind === 'boat') {
      s.mode = 'ship';
      s.x = s.boat.x;
      s.z = s.boat.z;
      s.heading = s.boat.heading;
      s.boarded = true;
      this.notify('Aboard your vessel. Catch the wind with WASD. Press E near a dock to disembark.');
    }
    if (item.kind === 'dock') {
      s.mode = 'foot';
      s.x = item.island.x + 8;
      s.z = item.island.z + item.island.rz + 7;
      s.heading = Math.PI;
      this.addVisit(item.island);
      this.notify(`Welcome to ${item.island.name}. Walk up the pier to explore.`);
    }
    if (item.kind === 'board') {
      this.boardShip(item.enemy);
      return;
    }
    if (item.kind === 'market' || item.kind === 'shipyard' || item.kind === 'settlement') {
      this.menuIsland = item.island;
      this.panel = item.kind;
    }
    if (item.kind === 'fish') {
      this.startFishing(item.spot);
    }
    this.save();
    this.emit();
  }

  boardShip(enemy) {
    sound.playCutlass();
    enemy.alive = false;
    enemy.model.visible = false;
    this.visual.addSmoke(enemy.x, 2, enemy.z, 0x444444);
    this.visual.addSplinters(enemy.x, 2, enemy.z);

    const plunderGold = 90 + Math.floor(Math.random() * 40);
    this.state.gold += plunderGold;
    this.state.timber = Math.min(cargoLimit(this.state), this.state.timber + 2);
    this.state.rum = Math.min(cargoLimit(this.state), this.state.rum + 1);
    this.state.seaKills++;
    this.state.boardingsWon = (this.state.boardingsWon || 0) + 1;

    sound.playFanfare();
    this.note(`Boarded and captured the corsair vessel! Plundered ${plunderGold} gold, 2 timber, and 1 rum.`);
    this.save();
    this.emit();
  }

  addVisit(island) {
    if (!this.state.visited.includes(island.id)) {
      this.state.visited.push(island.id);
      this.state.gold += 15;
      sound.playCoin();
      this.note(`Discovered ${island.name}. +15 gold for charting a new shore.`);
    }
  }

  notify(text) {
    this.toast = text;
    this.toastUntil = this.clock + 5;
    this.emit();
  }

  note(text) {
    this.state.notes.unshift(text);
    this.state.notes = this.state.notes.slice(0, 7);
    this.notify(text);
  }

  closePanel() {
    if (this.fishing) {
      this.note('Packed away the line. Your bait has been used.');
    }
    this.panel = null;
    this.fishing = null;
    this.held = false;
    this.keys.clear();
    this.emit();
  }

  trade(good, buy = true) {
    if (this.panel !== 'market' || !this.menuIsland) return;
    const result = buy ? buyGood(this.state, this.menuIsland, good) : { ok: sellGood(this.state, this.menuIsland, good) };
    if (!result.ok) {
      this.notify(result.message || 'You have none of that item to sell.');
    } else {
      sound.playCoin();
    }
    this.save();
    this.emit();
  }

  sellCatch() {
    if (this.panel !== 'market') return;
    const value = sellFish(this.state, this.menuIsland);
    if (value) {
      sound.playCoin();
      this.note(`Sold your fresh catch for ${value} gold. The harbor thanks you.`);
    } else {
      this.note('Your fishing basket is empty.');
    }
    this.save();
    this.emit();
  }

  // Island Warehouse Store / Take
  storeWarehouse(good, amount = 1) {
    if (!this.menuIsland) return;
    if (transferToWarehouse(this.state, this.menuIsland.id, good, amount)) {
      sound.playCoin();
      this.note(`Transferred ${amount} ${good} to ${this.menuIsland.name} warehouse.`);
      this.save();
      this.emit();
    } else {
      this.notify('Not enough of that good in your cargo.');
    }
  }

  takeWarehouse(good, amount = 1) {
    if (!this.menuIsland) return;
    if (transferFromWarehouse(this.state, this.menuIsland.id, good, amount)) {
      sound.playCoin();
      this.note(`Loaded ${amount} ${good} from warehouse into ship hold.`);
      this.save();
      this.emit();
    } else {
      this.notify('No room in hold or insufficient warehouse stock.');
    }
  }

  upgrade(id) {
    if (this.panel !== 'shipyard') return;
    const s = this.state;
    const options = {
      cannon: { gold: 80, timber: 4, iron: 0 },
      sails: { gold: 65, timber: 3, iron: 0 },
      cutter: { gold: 170, timber: 12, iron: 4 },
      repair: { gold: Math.ceil((maxHull(s) - s.hull) * 0.65), timber: 0, iron: 0 },
      crew: { gold: 40, timber: 0, iron: 0 }
    };
    const cost = options[id];
    if (!cost) return;
    if (
      (id === 'cannon' && s.cannon >= 3) ||
      (id === 'sails' && s.sails >= 2) ||
      (id === 'cutter' && s.tier) ||
      (id === 'crew' && s.crew >= 4)
    ) {
      return;
    }
    if (s.gold < cost.gold || s.timber < cost.timber || s.iron < cost.iron) {
      this.notify('You need the gold and materials shown. Trade with the local merchant.');
      return;
    }
    s.gold -= cost.gold;
    s.timber -= cost.timber;
    s.iron -= cost.iron;
    sound.playCoin();

    if (id === 'cannon') s.cannon++;
    if (id === 'sails') s.sails++;
    if (id === 'cutter') {
      s.tier = 1;
      s.hull = maxHull(s);
      sound.playFanfare();
    }
    if (id === 'repair') s.hull = maxHull(s);
    if (id === 'crew') s.crew++;

    this.visual.updateShip(s);
    this.note(
      id === 'cutter'
        ? 'Your new coastal cutter is ready at the pier. Fair winds!'
        : id === 'crew'
        ? 'A stalwart sailor joins your crew.'
        : id === 'repair'
        ? 'The shipwright patched your hull to perfection.'
        : 'Your vessel has been upgraded. Ready for open waters.'
    );
    this.save();
    this.emit();
  }

  claim() {
    const i = this.menuIsland;
    const s = this.state;
    if (!i || this.panel !== 'settlement') return;
    if (i.type === 'hostile' && s.garrisons[i.id] > 0) {
      this.notify('The coastal battery still controls this town. Defeat it before raising your flag.');
      return;
    }
    if (s.crew < 2 || s.food < 2) {
      this.notify('You need two crew members and two provisions to establish a settlement.');
      return;
    }
    if (i.type === 'wild' && (s.gold < 100 || s.timber < 10)) {
      this.notify('An empty island needs 100 gold and 10 timber for its first settlement.');
      return;
    }
    if (s.captured.includes(i.id)) return;

    if (i.type === 'wild') {
      s.gold -= 100;
      s.timber -= 10;
    }
    s.food -= 2;
    s.captured.push(i.id);
    s.buildings[i.id] = [];
    s.gold += i.reward || 0;
    sound.playFanfare();

    for (const guard of this.enemies || []) {
      if (guard.kind === 'guard' && guard.island.id === i.id) {
        guard.alive = false;
        guard.model.visible = false;
      }
    }

    this.createOwnedBuildings();
    this.note(`${i.name} is yours! Build workshops and watch your settlement thrive.`);
    this.save();
    this.emit();
  }

  build(id) {
    const s = this.state;
    const i = this.menuIsland;
    const b = BUILDINGS.find(b => b.id === id);
    if (!b || !i || !s.captured.includes(i.id)) return;
    if (s.buildings[i.id]?.includes(id)) return;
    if (s.gold < b.gold || s.timber < b.timber || s.iron < b.iron) {
      this.notify('Your settlement needs more building materials.');
      return;
    }
    s.gold -= b.gold;
    s.timber -= b.timber;
    s.iron -= b.iron;
    sound.playCoin();
    (s.buildings[i.id] ??= []).push(id);
    this.createOwnedBuildings();
    this.note(`${b.name} built on ${i.name}. Production runs every minute.`);
    this.save();
    this.emit();
  }

  createOwnedBuildings() {
    for (const model of this.buildModels) {
      this.visual.scene.remove(model);
    }
    this.buildModels = [];
    this.visual.colliders = this.visual.colliders.filter(c => !c.constructed);

    for (const [id, types] of Object.entries(this.state.buildings)) {
      const island = ISLANDS.find(i => i.id === id);
      if (!island) continue;
      const plots =
        island.type === 'wild'
          ? [[-14, -8], [17, -9], [0, -19], [-16, 5], [14, 5]]
          : [[-30, 0], [-15, -25], [5, -28], [-25, -15], [10, -15]];
      types.forEach((type, n) => {
        const [x, z] = plots[n] || [0, -20];
        let roofColor = 0x9b7850;
        if (type === 'warehouse') roofColor = 0x5a7c64;
        if (type === 'distillery') roofColor = 0xb0553d;
        if (type === 'foundry') roofColor = 0x555855;
        const model = house(roofColor, n % 3, island.theme);
        model.position.set(island.x + x, 2, island.z + z);
        this.visual.scene.add(model);
        this.buildModels.push(model);
        this.visual.colliders.push({
          x: island.x + x,
          z: island.z + z,
          r: 4.5,
          constructed: true
        });
      });
      if (island.type === 'wild') {
        this.visual.settleIsland(island);
      }
    }
  }

  startFishing(spot) {
    const s = this.state;
    if (s.bait < 1) {
      this.notify('No bait left. Buy more at a harbor market.');
      return;
    }
    if (s.stocks[spot.id] < 1) {
      this.notify('This school is depleted. Fish slowly return over time; try another spot.');
      return;
    }
    if (s.fish.length >= 8 || cargo(s) >= cargoLimit(s)) {
      this.notify('Your basket or hold is full. Sell your catch before fishing again.');
      return;
    }
    sound.playCast();
    s.bait--;
    this.fishing = {
      spot,
      phase: 'casting',
      time: 0,
      marker: 0,
      progress: 24,
      tension: 28,
      danger: 0,
      accuracy: 0
    };
    this.panel = 'fish';
    this.held = false;
    this.save();
    this.emit();
  }

  hookFish() {
    const f = this.fishing;
    if (!f || f.phase !== 'bite') return;
    const offset = Math.abs((this.visibleFishMarker ?? f.marker) - 50);
    if (offset > 16) {
      f.phase = 'missed';
      sound.playSplash();
      this.note('Missed the bite. Hook when the marker is centered in the green.');
    } else {
      f.phase = 'reeling';
      f.time = 0;
      f.accuracy = 1 - offset / 16;
      sound.playBite();
    }
    this.held = false;
    this.emit();
  }

  reel(held) {
    this.held = held;
    if (held && this.fishing?.phase === 'reeling') {
      sound.playReelClick();
    }
  }

  fishTick(dt) {
    const f = this.fishing;
    if (!f) return;
    f.time += dt;

    if (f.phase === 'casting' && f.time > 1.3) {
      f.phase = 'bite';
      f.time = 0;
      sound.playBite();
    }
    if (f.phase === 'bite') {
      f.marker = (Math.sin(f.time * 1.5 - 1.5) + 1) * 50;
      if (f.time > 7) {
        f.phase = 'missed';
        this.note('The fish slipped away. Be ready to hook next time.');
      }
    }
    if (f.phase === 'reeling') {
      const surge = Math.sin(f.time * 2.1 + f.spot.difficulty) > 0.66;
      f.progress = T.MathUtils.clamp(f.progress + (this.held ? 17 : -4) * dt, 0, 100);
      f.tension = T.MathUtils.clamp(f.tension + ((this.held ? 31 : -29) + (surge ? 17 : 0)) * dt, 0, 100);
      f.surge = surge;
      f.danger = f.tension > 93 ? f.danger + dt : 0;

      if (f.danger > 0.7 || f.progress <= 0) {
        f.phase = 'missed';
        sound.playSplash();
        this.note(
          f.danger > 0.7
            ? 'The line snapped! Release the reel when tension climbs into red.'
            : 'The fish got off the hook. Keep gentle pressure on the line.'
        );
      }
      if (f.progress >= 100) {
        const luck = Math.random() + f.accuracy * 0.2 + (f.spot.difficulty - 1) * 0.15;
        const type = FISH_TYPES[luck > 1.1 ? 3 : luck > 0.85 ? 2 : luck > 0.4 ? 1 : 0];
        this.state.fish.push({ ...type });
        this.state.stocks[f.spot.id]--;
        this.state.fishCaught++;
        f.phase = 'caught';
        f.catch = type;
        sound.playFanfare();
        this.note(`Landed a ${type.name.toLowerCase()}! ${this.state.stocks[f.spot.id]} fish remain in this school.`);
        this.save();
      }
    }
  }

  castAgain() {
    if (!this.fishing) return;
    const spot = this.fishing.spot;
    this.fishing = null;
    this.panel = null;
    this.startFishing(spot);
  }

  createEnemies() {
    for (const [n, x, z] of [
      [0, 95, -65],
      [1, -115, -65],
      [2, 230, -85],
      [3, -100, 245]
    ]) {
      const model = ship({ enemy: true, tier: 1, cannon: 1 });
      model.scale.setScalar(0.85);
      this.visual.scene.add(model);
      this.enemies.push({
        id: n,
        x,
        z,
        homeX: x,
        homeZ: z,
        heading: 0,
        health: 65 + n * 15,
        max: 65 + n * 15,
        alive: true,
        cooldown: 2,
        model,
        kind: 'ship'
      });
    }

    for (const island of ISLANDS.filter(i => i.type === 'hostile' && !this.state.captured.includes(i.id))) {
      for (let n = 0; n < 2; n++) {
        const model = person(0x6d7e73, n, 'guard');
        this.visual.scene.add(model);
        this.enemies.push({
          id: `${island.id}-guard-${n}`,
          x: island.x + 5 + n * 7,
          z: island.z + 15,
          homeX: island.x + 5 + n * 7,
          homeZ: island.z + 15,
          heading: 0,
          health: 32,
          max: 32,
          alive: true,
          cooldown: 1,
          model,
          kind: 'guard',
          island
        });
      }
    }
  }

  createSalvage() {
    // Floating flotsam caches in open sea
    const coordinates = [
      [60, 45],
      [-65, 80],
      [110, -30],
      [-80, -95],
      [210, 50],
      [20, -180]
    ];
    for (let i = 0; i < coordinates.length; i++) {
      const [x, z] = coordinates[i];
      const model = salvageFlotsam();
      model.position.set(x, 0, z);
      this.visual.scene.add(model);
      this.salvage.push({ id: i, x, z, model, collected: false });
    }
  }

  fire(target = this.mouse) {
    if (this.cooldown > 0 || this.panel || this.fishing) return;
    const s = this.state;
    if (s.mode === 'foot') {
      sound.playCutlass();
      this.cooldown = 0.55;
      this.slashUntil = this.clock + 0.25;
      for (const enemy of this.enemies.filter(e => e.kind === 'guard' && e.alive && dist(e, s) < 5.5)) {
        enemy.health -= 14;
        sound.playImpact(false);
        this.visual.addSplinters(enemy.x, 2, enemy.z);
        if (enemy.health <= 0) this.defeatEnemy(enemy);
      }
      for (const island of ISLANDS.filter(i => i.type === 'hostile' && s.garrisons[i.id] > 0)) {
        if (dist(s, { x: island.x + 8, z: island.z - 15 }) < 7) {
          s.garrisons[island.id] = Math.max(0, s.garrisons[island.id] - 10);
          sound.playImpact(true);
          if (s.garrisons[island.id] === 0) {
            sound.playFanfare();
            this.note(`The battery at ${island.name} has fallen! Go to town to raise your flag.`);
          }
        }
      }
      return;
    }

    if (s.cannon < 1) {
      this.notify('Your fishing skiff has no cannon. Visit a shipwright to install one.');
      return;
    }

    sound.playCannon();
    this.cooldown = 1.25;

    let dx = target.x - s.x;
    let dz = target.z - s.z;
    if (Math.hypot(dx, dz) < 1) {
      dx = Math.sin(s.heading);
      dz = Math.cos(s.heading);
    }
    const len = Math.hypot(dx, dz);
    const ndx = dx / len;
    const ndz = dz / len;

    // Cannon smoke puff
    this.visual.addSmoke(s.x + ndx * 2, 2, s.z + ndz * 2, 0x555555);

    // Salvo volley: fire 1 to 3 cannonballs based on cannon upgrades
    const count = Math.min(s.cannon, 3);
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.12;
      const angle = Math.atan2(ndx, ndz) + spread;
      this.launch(s.x, s.z, Math.sin(angle), Math.cos(angle), false, 14 + s.cannon * 7);
    }
    this.emit();
  }

  launch(x, z, dx, dz, enemy, damage) {
    const model = new T.Mesh(
      new T.SphereGeometry(enemy ? 0.24 : 0.32, 6, 6),
      mat(enemy ? 0xcc6038 : 0x363833)
    );
    model.position.set(x, 2, z);
    this.visual.scene.add(model);
    this.projectiles.push({ x, z, dx, dz, enemy, damage, model, age: 0 });
  }

  defeatEnemy(enemy) {
    enemy.alive = false;
    enemy.model.visible = false;
    this.visual.addSmoke(enemy.x, 2, enemy.z, 0x333333);
    this.visual.addSplinters(enemy.x, 2, enemy.z);
    sound.playImpact(true);

    if (enemy.kind === 'ship') {
      sound.playFanfare();
      this.state.gold += 55;
      this.state.seaKills++;
      this.note('Corsair ship sunk! Recovered 55 gold from floating wreckage.');
    }
    this.save();
  }

  combatTick(dt) {
    const s = this.state;
    this.cooldown = Math.max(0, this.cooldown - dt);

    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.cooldown -= dt;
      const d = dist(e, s);
      const engaged =
        e.kind === 'ship'
          ? s.mode === 'ship' && d < 75
          : s.mode === 'foot' && d < 18 && !s.captured.includes(e.island.id);

      const destination = engaged
        ? s
        : e.kind === 'guard'
        ? { x: e.homeX, z: e.homeZ }
        : { x: e.homeX + Math.sin(this.clock * 0.04 + e.id) * 22, z: e.homeZ + Math.cos(this.clock * 0.04) * 18 };

      const dx = destination.x - e.x;
      const dz = destination.z - e.z;
      const desired = Math.atan2(dx, dz);
      e.heading += wrap(desired - e.heading) * Math.min(1, dt * 1.5);

      const speed = e.kind === 'ship' ? (engaged && d < 28 ? 0 : 5) : engaged && d > 3 ? 3 : 0;
      const nx = e.x + Math.sin(e.heading) * speed * dt;
      const nz = e.z + Math.cos(e.heading) * speed * dt;
      if (e.kind === 'ship' ? navigable(nx, nz) : walkable(nx, nz)) {
        e.x = nx;
        e.z = nz;
      }
      e.model.position.set(e.x, e.kind === 'ship' ? Math.sin(this.clock * 1.6) * 0.1 : 2.13, e.z);
      e.model.rotation.y = e.heading;

      if (e.kind === 'guard') {
        e.model.userData.limbs.forEach(
          (limb, n) => (limb.rotation.x = speed ? Math.sin(this.clock * 8 + (n % 2 ? Math.PI : 0)) * 0.4 : 0)
        );
        if (engaged && d < 4 && e.cooldown <= 0) {
          s.health -= 8;
          e.cooldown = 1.4;
          sound.playCutlass();
          this.notify('A guard struck you! Space to dodge, F to counter with your cutlass.');
        }
      } else if (engaged && d < 55 && e.cooldown <= 0) {
        const length = Math.max(0.1, Math.hypot(dx, dz));
        sound.playCannon();
        this.visual.addSmoke(e.x, 2, e.z, 0x666666);
        this.launch(e.x, e.z, dx / length, dz / length, true, 9);
        e.cooldown = 3.2;
      }
    }

    // Coastal Fortress Batteries Artillery
    for (const island of ISLANDS.filter(i => i.type === 'hostile' && s.garrisons[i.id] > 0)) {
      const fort = { x: island.x + 8, z: island.z - 15 };
      if (dist(fort, s) < 85 && s.mode === 'ship') {
        island.nextShot ??= this.clock + 3;
        if (this.clock > island.nextShot) {
          const d = Math.max(0.1, dist(fort, s));
          sound.playCannon();
          this.visual.addSmoke(fort.x, 8, fort.z, 0x884433);
          this.launch(fort.x, fort.z, (s.x - fort.x) / d, (s.z - fort.z) / d, true, island.damage);
          island.nextShot = this.clock + 3.5;
        }
      }
    }

    const removed = [];
    for (const p of this.projectiles) {
      p.age += dt;
      p.x += p.dx * 45 * dt;
      p.z += p.dz * 45 * dt;
      p.model.position.set(p.x, 2 + Math.sin(p.age * Math.PI * 0.5) * 1.1, p.z);

      if (p.enemy && dist(p, s) < (s.mode === 'ship' ? 2.8 : 1)) {
        if (this.dodgeCooldown < 0.3) {
          if (s.mode === 'ship') s.hull -= p.damage;
          else s.health -= p.damage;
          sound.playImpact(s.mode === 'ship');
          this.visual.addSplinters(s.x, 2, s.z);
        }
        removed.push(p);
        this.hitUntil = this.clock + 0.2;
      }

      if (!p.enemy) {
        const enemy = this.enemies.find(e => e.alive && dist(p, e) < (e.kind === 'ship' ? 3.2 : 1.5));
        if (enemy) {
          enemy.health -= p.damage;
          sound.playImpact(enemy.kind === 'ship');
          this.visual.addSplinters(enemy.x, 2, enemy.z);
          if (enemy.health <= 0) this.defeatEnemy(enemy);
          removed.push(p);
        } else {
          for (const island of ISLANDS.filter(i => i.type === 'hostile' && s.garrisons[i.id] > 0)) {
            if (dist(p, { x: island.x + 8, z: island.z - 15 }) < 5.5) {
              s.garrisons[island.id] = Math.max(0, s.garrisons[island.id] - p.damage);
              sound.playImpact(true);
              this.visual.addSplinters(island.x + 8, 8, island.z - 15);
              removed.push(p);
              if (s.garrisons[island.id] === 0) {
                sound.playFanfare();
                this.note(`The battery at ${island.name} is defeated! Land and raise your flag.`);
              }
            }
          }
        }
      }

      if (p.age > 2.1) {
        this.visual.addSplash(p.x, p.z);
        sound.playSplash();
        removed.push(p);
      }
    }

    for (const p of new Set(removed)) {
      this.visual.scene.remove(p.model);
      p.model.geometry.dispose();
      this.projectiles.splice(this.projectiles.indexOf(p), 1);
    }

    // Floating Salvage scoops
    if (s.mode === 'ship') {
      for (const salvage of this.salvage) {
        if (!salvage.collected && dist(s, salvage) < 6.5) {
          salvage.collected = true;
          salvage.model.visible = false;
          sound.playCoin();
          this.visual.addSplash(salvage.x, salvage.z);
          const goldBonus = 18 + Math.floor(Math.random() * 15);
          s.gold += goldBonus;
          if (cargo(s) < cargoLimit(s)) s.timber++;
          s.salvageCollected = (s.salvageCollected || 0) + 1;
          this.note(`Scooped up floating salvage! +${goldBonus} gold and salvaged timber.`);
          this.save();
        }
      }
    }

    if (s.health <= 0 || s.hull <= 0) {
      this.rescue();
    }
  }

  rescue() {
    const s = this.state;
    s.gold = Math.max(0, s.gold - 25);
    s.health = 100;
    s.hull = maxHull(s);
    s.mode = 'foot';
    s.x = 8;
    s.z = 44;
    s.boat = { x: 8, z: 59, heading: 0 };
    this.route = [];
    this.panel = null;
    this.fishing = null;
    for (const p of this.projectiles) this.visual.scene.remove(p.model);
    this.projectiles = [];
    this.note('Haven’s friendly fishermen pulled you ashore. Repairs cost 25 gold; discoveries remain safe.');
    this.save();
  }

  dodge() {
    const s = this.state;
    if (this.panel || this.fishing || this.dodgeCooldown > 0 || s.stamina < 22) return;
    s.stamina -= 22;
    this.dodgeCooldown = 0.8;
    sound.playCutlass();
    const dx = Math.sin(s.heading);
    const dz = Math.cos(s.heading);
    for (let n = 0; n < 5; n++) {
      const nx = s.x + dx;
      const nz = s.z + dz;
      if (walkable(nx, nz) && !this.visual.isBlocked(nx, nz)) {
        s.x = nx;
        s.z = nz;
      }
    }
  }

  move(dt) {
    const s = this.state;
    if (this.panel || this.fishing) {
      this.walking = false;
      return;
    }

    let horizontal =
      (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
      (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    let vertical =
      (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
      (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    let dx = (horizontal - vertical) / Math.SQRT2;
    let dz = (-horizontal - vertical) / Math.SQRT2;

    if (horizontal || vertical) {
      this.route = [];
      this.visual.destination.visible = false;
    } else if (this.route.length) {
      const next = this.route[0];
      dx = next.x - s.x;
      dz = next.z - s.z;
      if (Math.hypot(dx, dz) < (s.mode === 'ship' ? 2.3 : 0.9)) {
        this.route.shift();
        if (!this.route.length) this.visual.destination.visible = false;
      }
    }

    const length = Math.hypot(dx, dz);
    this.walking = length > 0.1;
    const sprint = this.keys.has('ShiftLeft') && s.stamina > 2;
    s.stamina = T.MathUtils.clamp(s.stamina + (sprint && length > 0 ? -17 : 10) * dt, 0, 100);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);

    if (length < 0.1) return;

    // Footstep audio
    if (s.mode === 'foot' && this.walking) {
      this.footstepClock += dt;
      if (this.footstepClock > (sprint ? 0.28 : 0.42)) {
        this.footstepClock = 0;
        sound.playFootstep(onDock(s.x, s.z));
      }
    }

    dx /= length;
    dz /= length;
    const desired = Math.atan2(dx, dz);
    s.heading += wrap(desired - s.heading) * Math.min(1, dt * (s.mode === 'ship' ? 2.5 : 12));

    // Base speed modified by wind in ship mode
    let speed = s.mode === 'foot' ? (sprint ? 13 : 8) : 11 + s.sails * 3 + (s.tier ? 2 : 0);
    if (s.mode === 'ship') {
      const windMult = windFactor(s.heading, s.wind.angle);
      speed *= windMult;
    }

    const vx = s.mode === 'ship' ? Math.sin(s.heading) : dx;
    const vz = s.mode === 'ship' ? Math.cos(s.heading) : dz;
    const nx = s.x + vx * speed * dt;
    const nz = s.z + vz * speed * dt;

    const valid = (x, z) => (s.mode === 'ship' ? navigable(x, z) : walkable(x, z) && !this.visual.isBlocked(x, z));
    const previous = { x: s.x, z: s.z };

    if (valid(nx, nz)) {
      s.x = nx;
      s.z = nz;
    } else if (s.mode === 'foot') {
      if (valid(nx, s.z)) s.x = nx;
      if (valid(s.x, nz)) s.z = nz;
    } else {
      this.route = [];
      this.visual.destination.visible = false;
    }

    s.travelled += dist(s, previous);
    if (s.mode === 'ship') {
      s.boat = { x: s.x, z: s.z, heading: s.heading };
      this.supplyClock += dt;
      if (this.supplyClock >= 120) {
        this.supplyClock = 0;
        if (s.food) s.food--;
        else {
          s.hull = Math.max(1, s.hull - 3);
          this.notify('Provisions empty. Call at a harbor before your crew weakens.');
        }
      }
    }

    const visited = ISLANDS.find(i => dist(s, i) < Math.max(i.rx, i.rz) + 23);
    if (visited) this.addVisit(visited);
  }

  economy(previousMinute) {
    const minute = Math.floor(this.state.elapsed / 60);
    if (minute === previousMinute) return;
    const s = this.state;

    // Replenish town merchant stocks
    for (const island of ISLANDS) {
      if (s.marketStocks[island.id]) {
        for (const good of Object.keys(s.marketStocks[island.id])) {
          s.marketStocks[island.id][good] = Math.min(24, s.marketStocks[island.id][good] + 1);
        }
      }
    }

    // Natural fish stock replenishment
    if (minute % 3 === 0) {
      for (const spot of FISH_SPOTS) {
        s.stocks[spot.id] = Math.min(spot.stock, s.stocks[spot.id] + 1);
      }
    }

    // Dynamic wind shift
    if (minute % 2 === 0) {
      s.wind.angle = (s.wind.angle + 0.45) % (Math.PI * 2);
    }

    // Anno-style settlement production & tax revenue
    for (const id of s.captured) {
      const buildings = s.buildings[id] || [];
      const wh = (s.warehouses[id] ??= { timber: 0, iron: 0, food: 0, rum: 0 });

      // Base tax + trading post double bonus
      const taxRevenue = buildings.includes('warehouse') ? 16 : 8;
      s.gold += taxRevenue;

      // Workshops produce directly to ship hold or island warehouse
      if (buildings.includes('lumber')) {
        if (cargo(s) < cargoLimit(s)) s.timber++;
        else wh.timber = Math.min(50, (wh.timber || 0) + 1);
      }
      if (buildings.includes('fishery')) {
        s.food = Math.min(30, s.food + 1);
        wh.food = Math.min(50, (wh.food || 0) + 1);
      }
      if (buildings.includes('distillery')) {
        if (cargo(s) < cargoLimit(s)) s.rum++;
        else wh.rum = Math.min(50, (wh.rum || 0) + 1);
      }
      if (buildings.includes('foundry')) {
        if (cargo(s) < cargoLimit(s)) s.iron++;
        else wh.iron = Math.min(50, (wh.iron || 0) + 1);
      }
    }
  }

  frame(stamp) {
    if (this.disposed) return;
    const dt = this.lastStamp ? Math.min((stamp - this.lastStamp) / 1000, 0.25) : 0;
    this.lastStamp = stamp;
    this.clock += dt;
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);

    if (!this.paused && (!this.panel || this.panel === 'fish')) {
      let remaining = dt;
      while (remaining > 0) {
        const step = Math.min(remaining, 1 / 30);
        const minute = Math.floor(this.state.elapsed / 60);
        this.state.elapsed += step;
        this.move(step);
        this.fishTick(step);
        this.combatTick(step);
        this.economy(minute);
        remaining -= step;
      }
    } else {
      this.walking = false;
    }

    this.visual.render(this.state, this.clock, dt, this.walking, this.fishing);

    if (this.slashUntil > this.clock && this.state.mode === 'foot') {
      this.visual.player.userData.limbs[3].rotation.x = -1.6;
    }

    this.uiClock += dt;
    this.saveClock += dt;
    if (this.uiClock > 0.1) {
      this.uiClock = 0;
      this.emit();
    }
    if (this.saveClock > 4) {
      this.saveClock = 0;
      this.save();
    }
    this.frameId = requestAnimationFrame(this.frame);
  }

  emit() {
    this.visibleFishMarker = this.fishing?.marker;
    const s = this.state;
    const near = this.nearest();
    const island =
      terrainAt(s.x, s.z, 20) ||
      ISLANDS.reduce((best, i) => (dist(s, i) < dist(s, best) ? i : best), ISLANDS[0]);

    const labels = this.interactions()
      .filter(i => dist(i, s) < 90)
      .map(i => ({
        ...i,
        ...this.visual.screenPoint(i.x, i.kind === 'boat' ? 5 : 5, i.z),
        worldX: i.x,
        worldZ: i.z,
        near: dist(i, s) < i.range
      }))
      .filter(i => i.visible);

    const hostile = this.enemies
      .filter(e => e.alive && e.kind === 'ship' && dist(e, s) < 95)
      .map(e => ({
        ...this.visual.screenPoint(e.x, 10, e.z),
        health: e.health,
        max: e.max,
        id: e.id,
        worldX: e.x,
        worldZ: e.z
      }));

    const batteries = ISLANDS.filter(i => i.type === 'hostile' && s.garrisons[i.id] > 0 && dist(i, s) < 120).map(
      i => ({
        ...this.visual.screenPoint(i.x + 8, 14, i.z - 15),
        id: i.id,
        health: s.garrisons[i.id],
        max: i.health,
        worldX: i.x + 8,
        worldZ: i.z - 15
      })
    );

    this.onUpdate({
      state: {
        ...s,
        fish: [...s.fish],
        captured: [...s.captured],
        visited: [...s.visited],
        stocks: { ...s.stocks },
        marketStocks: { ...s.marketStocks },
        warehouses: { ...s.warehouses },
        notes: [...s.notes],
        wind: { ...s.wind }
      },
      panel: this.panel,
      island: this.menuIsland,
      location: island.name,
      near,
      labels,
      hostile,
      batteries,
      toast: this.clock < this.toastUntil ? this.toast : null,
      fishing: this.fishing ? { ...this.fishing } : null,
      cooldown: this.cooldown,
      zoom: this.visual.zoom,
      hit: this.hitUntil > this.clock,
      saveError: this.saveError
    });
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch {
      this.saveError = true;
    }
  }

  reset() {
    this.state = freshState();
    this.route = [];
    this.panel = null;
    this.fishing = null;
    this.visual.updateShip(this.state);
    this.createOwnedBuildings();
    for (const e of this.enemies) {
      e.alive = true;
      e.health = e.max;
      e.x = e.homeX;
      e.z = e.homeZ;
      e.model.visible = true;
    }
    for (const s of this.salvage) {
      s.collected = false;
      s.model.visible = true;
    }
    this.save();
    this.notify('A brand new captain embarks from Haven’s Reach.');
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.save();
    for (const remove of this.listeners) remove();
    this.visual.dispose();
  }
}
