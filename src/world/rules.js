import { ISLANDS, FISH_SPOTS, GOODS, SAVE_KEY, freshState, WORLD_LIMIT } from './content.js';

export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const maxHull = s => (s.tier ? 105 : 60);
export const cargo = s => s.fish.length + s.timber + s.iron + s.rum;
export const cargoLimit = s => (s.tier ? 40 : 18);
export const shipName = s => (s.tier ? 'Coastal cutter' : 'Fishing skiff');

export function terrainAt(x, z, padding = 0) {
  return ISLANDS.find(i => {
    const nx = (x - i.x) / (i.rx + padding);
    const nz = (z - i.z) / (i.rz + padding);
    const angle = Math.atan2(nz, nx);
    const edge = 1 + 0.045 * Math.sin(angle * 5 + i.seed) + 0.035 * Math.cos(angle * 3 + i.seed * 0.7);
    return Math.hypot(nx, nz) < edge;
  });
}

export function onDock(x, z) {
  return ISLANDS.find(i => {
    const dx = Math.abs(x - i.x - 8);
    const dz = z - (i.z + i.rz);
    if (dz >= -7 && dz <= 44 && dx < 4.4) return true;
    if (dz > 44 && dz <= 52.5 && dx < 6.4) return true;
    return false;
  });
}

export const walkable = (x, z) => !!terrainAt(x, z, -1.1) || !!onDock(x, z);
export const navigable = (x, z) => Math.abs(x) < WORLD_LIMIT && Math.abs(z) < WORLD_LIMIT && !terrainAt(x, z, 3);

// Nautical Wind Factor (Sailing angle relative to wind)
export function windFactor(shipHeading, windAngle) {
  const diff = Math.abs(Math.atan2(Math.sin(shipHeading - windAngle), Math.cos(shipHeading - windAngle)));
  // diff == 0: running with the wind (boost)
  // diff == PI: head to wind (in irons / slower)
  const t = diff / Math.PI; // 0..1
  return 1.28 - 0.48 * t; // 1.28x down to 0.80x speed
}

export function marketPrice(island, good, selling = false) {
  if (!GOODS[good]) return 0;
  let base = GOODS[good].base;
  if (island.id === 'crescent' && good === 'timber') base = 5;
  if (island.id === 'copper' && good === 'iron') base = 10;
  if (island.id === 'crescent' && good === 'rum') base = 29;
  if (island.id === 'copper' && good === 'timber') base = 14;
  return Math.max(1, Math.round(base * (selling ? 0.8 : 1)));
}

export function buyGood(s, island, good) {
  const price = marketPrice(island, good);
  if (!GOODS[good]) return { ok: false, message: 'That item is not traded here.' };
  if (s.gold < price) return { ok: false, message: 'You need more gold for that purchase.' };
  if (!s.marketStocks[island.id] || s.marketStocks[island.id][good] <= 0) {
    return { ok: false, message: 'The merchant has sold out. Stock replenishes over time.' };
  }
  if (['timber', 'iron', 'rum'].includes(good) && cargo(s) >= cargoLimit(s)) {
    return { ok: false, message: 'Your cargo hold is full. Sell or use some cargo first.' };
  }
  if (['bait', 'food'].includes(good) && s[good] >= 30) {
    return { ok: false, message: 'You have enough provisions aboard.' };
  }
  s.gold -= price;
  s[good]++;
  s.marketStocks[island.id][good]--;
  return { ok: true };
}

export function sellGood(s, island, good) {
  if (!GOODS[good] || s[good] < 1) return false;
  s[good]--;
  s.gold += marketPrice(island, good, true);
  if (s.marketStocks[island.id]) {
    s.marketStocks[island.id][good]++;
  }
  return true;
}

export function sellFish(s, island) {
  const multiplier = island.id === 'copper' ? 1.2 : 1;
  const value = s.fish.reduce((sum, f) => sum + Math.round(f.value * multiplier), 0);
  s.gold += value;
  s.fishSold += s.fish.length;
  s.fish = [];
  return value;
}

// Island Warehouse Transfer (Anno-style town logistics)
export function transferToWarehouse(s, islandId, good, amount = 1) {
  if (!s.warehouses[islandId]) s.warehouses[islandId] = { timber: 0, iron: 0, food: 0, rum: 0 };
  const current = s[good] || 0;
  if (current < amount) return false;
  s[good] -= amount;
  s.warehouses[islandId][good] = (s.warehouses[islandId][good] || 0) + amount;
  return true;
}

export function transferFromWarehouse(s, islandId, good, amount = 1) {
  if (!s.warehouses[islandId] || (s.warehouses[islandId][good] || 0) < amount) return false;
  if (['timber', 'iron', 'rum'].includes(good) && cargo(s) + amount > cargoLimit(s)) return false;
  s.warehouses[islandId][good] -= amount;
  s[good] = (s[good] || 0) + amount;
  return true;
}

export function loadWorld() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved?.version !== 2) return freshState();
    const s = { ...freshState(), ...saved };
    for (const k of [
      'gold', 'bait', 'food', 'timber', 'iron', 'rum', 'elapsed',
      'fishCaught', 'fishSold', 'seaKills', 'travelled'
    ]) {
      if (!Number.isFinite(s[k]) || s[k] < 0) return freshState();
    }
    if (!['foot', 'ship'].includes(s.mode) || !Number.isFinite(s.x) || !Number.isFinite(s.z)) {
      return freshState();
    }
    if ((s.mode === 'foot' && !walkable(s.x, s.z)) || (s.mode === 'ship' && !navigable(s.x, s.z))) {
      return freshState();
    }
    s.tier = s.tier ? 1 : 0;
    s.cannon = Math.min(3, Math.max(0, s.cannon | 0));
    s.sails = Math.min(2, Math.max(0, s.sails | 0));
    s.hull = Math.min(maxHull(s), Math.max(1, s.hull));
    s.health = Math.max(1, Math.min(100, s.health));
    s.stamina = 100;
    s.captured = s.captured.filter(id => ISLANDS.some(i => i.id === id));
    s.stocks = { ...freshState().stocks, ...s.stocks };
    s.garrisons = { ...freshState().garrisons, ...s.garrisons };
    s.warehouses = { ...freshState().warehouses, ...s.warehouses };
    s.population = { ...freshState().population, ...s.population };
    s.wind = s.wind || { angle: 0.75, speed: 12 };

    for (const spot of FISH_SPOTS) {
      s.stocks[spot.id] = Math.max(0, Math.min(spot.stock, s.stocks[spot.id] || 0));
    }
    return s;
  } catch {
    return freshState();
  }
}

export function findPath(from, to, mode, blocked = () => false) {
  const valid = mode === 'ship' ? navigable : walkable;
  const step = mode === 'ship' ? 9 : 2;
  if (!valid(to.x, to.z) || blocked(to.x, to.z)) return [];
  const point = p => ({ x: Math.round(p.x / step) * step, z: Math.round(p.z / step) * step });
  const key = p => `${p.x},${p.z}`;
  const start = point(from);
  const goal = point(to);
  const open = [{ ...start, g: 0, f: dist(start, goal) }];
  const best = new Map([[key(start), 0]]);
  const parents = new Map();
  const closed = new Set();
  let end;
  let count = 0;

  while (open.length && count++ < 12000) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    const k = key(current);
    if (closed.has(k)) continue;
    if (dist(current, goal) < step * 1.5) {
      end = current;
      break;
    }
    closed.add(k);

    for (const [dx, dz] of [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1]
    ]) {
      const next = { x: current.x + dx * step, z: current.z + dz * step };
      if (
        Math.abs(next.x) > WORLD_LIMIT ||
        Math.abs(next.z) > WORLD_LIMIT ||
        !valid(next.x, next.z) ||
        blocked(next.x, next.z) ||
        !valid((next.x + current.x) / 2, (next.z + current.z) / 2)
      ) {
        continue;
      }
      const nk = key(next);
      const g = current.g + Math.hypot(dx, dz) * step;
      if (closed.has(nk) || g >= (best.get(nk) ?? Infinity)) continue;
      best.set(nk, g);
      parents.set(nk, current);
      open.push({ ...next, g, f: g + dist(next, goal) });
    }
  }

  if (!end) return [];
  const result = [];
  while (parents.has(key(end))) {
    result.unshift({ x: end.x, z: end.z });
    end = parents.get(key(end));
  }
  result.push(to);
  return result;
}
