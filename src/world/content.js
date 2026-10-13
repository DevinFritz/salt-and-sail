export const SAVE_KEY = 'salt-and-sail:world:v2';
export const WORLD_LIMIT = 340;

export const ISLANDS = [
  {
    id: 'haven',
    name: 'Haven’s Reach',
    x: 0,
    z: 0,
    rx: 53,
    rz: 43,
    seed: 2,
    type: 'home',
    theme: 'fishing',
    color: 0x829e52,
    roof: 0xbb7250,
    population: 38,
    specialty: 'Fish market & shipyard',
    description: 'A sheltered lagoon harbor known for seasoned shipwrights, bustling fish wharves, and gentle tides.',
    demands: ['timber', 'iron'],
    supplies: ['food', 'bait']
  },
  {
    id: 'crescent',
    name: 'Crescent Cay',
    x: 165,
    z: 105,
    rx: 43,
    rz: 36,
    seed: 8,
    type: 'trade',
    theme: 'merchant',
    color: 0x96aa59,
    roof: 0xc98d5f,
    population: 24,
    specialty: 'Timber & sugar trade',
    description: 'Sun-bleached sandy bluffs with lush mahogany groves and a breezy trade square overlooking turquoise waters.',
    demands: ['iron', 'food'],
    supplies: ['timber', 'rum']
  },
  {
    id: 'copper',
    name: 'Copperlight',
    x: -170,
    z: 135,
    rx: 47,
    rz: 39,
    seed: 5,
    type: 'trade',
    theme: 'foundry',
    color: 0x819b57,
    roof: 0x89968a,
    population: 31,
    specialty: 'Iron foundry & provisions',
    description: 'Rugged basalt cliffs where coal kilns and foundry hammers ring out night and day.',
    demands: ['timber', 'rum'],
    supplies: ['iron', 'food']
  },
  {
    id: 'tide',
    name: 'Tidewatch',
    x: -170,
    z: -145,
    rx: 46,
    rz: 39,
    seed: 11,
    type: 'hostile',
    theme: 'pirate',
    color: 0x82994e,
    roof: 0x9a654b,
    population: 26,
    health: 85,
    damage: 9,
    reward: 130,
    specialty: 'Corsair outpost',
    description: 'A perilous corsair stronghold bristling with cannon parapets, black flags, and pirate hideouts.',
    demands: ['food', 'rum'],
    supplies: ['iron', 'timber']
  },
  {
    id: 'fort',
    name: 'Fort Saint Elmo',
    x: 190,
    z: -150,
    rx: 49,
    rz: 43,
    seed: 16,
    type: 'hostile',
    theme: 'fortress',
    color: 0x7b954e,
    roof: 0x846b59,
    population: 44,
    health: 150,
    damage: 14,
    reward: 220,
    specialty: 'Fortified trading port',
    description: 'An imposing sea citadel built of cut stone, protected by heavy coastal batteries and veteran marine garrisons.',
    demands: ['timber', 'food'],
    supplies: ['iron', 'rum']
  },
  {
    id: 'wild',
    name: 'Whispering Key',
    x: 15,
    z: -265,
    rx: 34,
    rz: 30,
    seed: 23,
    type: 'wild',
    theme: 'ruins',
    color: 0x91a756,
    roof: 0xb88052,
    population: 0,
    specialty: 'An unclaimed shore',
    description: 'An ancient, overgrown islet dotted with mossy carved pillars, mysterious sea shrines, and buried pirate caches.',
    demands: [],
    supplies: ['timber']
  },
  {
    id: 'orchid',
    name: 'Orchid Atoll',
    x: 275,
    z: 245,
    rx: 31,
    rz: 28,
    seed: 30,
    type: 'wild',
    theme: 'coral',
    color: 0x93af66,
    roof: 0xbc8963,
    population: 0,
    specialty: 'Rare fishing grounds',
    description: 'A remote crystalline coral atoll surrounded by azure shallows where mythic Pearlfin and bioluminescent fish gather.',
    demands: [],
    supplies: ['food']
  },
];

export const dockOf = i => ({ x: i.x + 14, z: i.z + i.rz + 24 });
export const shoreOf = i => ({ x: i.x + 8, z: i.z + i.rz - 2 });

export const FISH_SPOTS = ISLANDS.flatMap((island, index) => [
  {
    id: `${island.id}-shore`,
    island: island.id,
    name: index === 0 ? 'Harbor shallows' : 'Coastal shoal',
    x: index === 0 ? 2.5 : island.x - 26,
    z: index === 0 ? island.z + island.rz + 46.5 : island.z + island.rz * 0.97,
    stock: 4,
    difficulty: 1,
    depth: 'Shallow waters'
  },
  {
    id: `${island.id}-deep`,
    island: island.id,
    name: index > 4 ? 'Pearlfin waters' : 'Deepwater school',
    x: island.x - island.rx - 20,
    z: island.z + 12,
    stock: 3,
    difficulty: index > 4 ? 3 : 2,
    depth: 'Open deep ocean'
  },
]);

export const FISH_TYPES = [
  { id: 'sardine', name: 'Silver sardine', value: 14, rarity: 'Common', desc: 'A gleaming schooling fish common in harbor waters.' },
  { id: 'snapper', name: 'Red snapper', value: 24, rarity: 'Uncommon', desc: 'A feisty coral reef dweller prized by coastal taverns.' },
  { id: 'tuna', name: 'Bluefin tuna', value: 38, rarity: 'Rare', desc: 'A powerful pelagic predator requiring steady line control.' },
  { id: 'pearlfin', name: 'Pearlfin', value: 64, rarity: 'Legendary', desc: 'An elusive iridescent fish found only in deep crystalline atolls.' },
];

export const GOODS = {
  bait: { name: 'Bait', base: 4, desc: 'Fresh lugworms and squid chunks for line fishing.' },
  food: { name: 'Provisions', base: 7, desc: 'Hardtack, smoked meat and dried fruit for the crew.' },
  timber: { name: 'Timber', base: 9, desc: 'Seasoned cedar and oak planks for hulls and workshops.' },
  iron: { name: 'Iron', base: 17, desc: 'Forged ingots for cannon barrels, fittings and tools.' },
  rum: { name: 'Rum', base: 19, desc: 'Aged sugar-cane spirits that lift sailor morale and sell high.' },
};

export const BUILDINGS = [
  {
    id: 'lumber',
    name: 'Lumber camp',
    description: 'Harvests island timber every minute to fill your warehouse and ship.',
    timber: 8,
    iron: 0,
    gold: 35,
    produces: 'timber',
    upkeep: 0
  },
  {
    id: 'fishery',
    name: 'Fishery',
    description: 'Employs local boats to cure provisions and feed island pioneers.',
    timber: 7,
    iron: 2,
    gold: 45,
    produces: 'food',
    upkeep: 0
  },
  {
    id: 'warehouse',
    name: 'Trading post & warehouse',
    description: 'Expands island storage to 50 goods and doubles regular harbor trade revenue.',
    timber: 12,
    iron: 4,
    gold: 70,
    produces: 'gold',
    upkeep: 0
  },
  {
    id: 'distillery',
    name: 'Rum distillery',
    description: 'Turns island crops into fine rum, generating high-value cargo and settler contentment.',
    timber: 14,
    iron: 6,
    gold: 95,
    produces: 'rum',
    upkeep: 1
  },
  {
    id: 'foundry',
    name: 'Smelting forge',
    description: 'Refines mined ore into forged iron bars for weaponry and shipyard commissions.',
    timber: 10,
    iron: 8,
    gold: 110,
    produces: 'iron',
    upkeep: 1
  }
];

export const CONTRACT_TEMPLATES = [
  {
    id: 'trade-timber',
    title: 'Crescent Timber Delivery',
    giver: 'Copperlight Merchant Guild',
    type: 'trade',
    target: 'copper',
    good: 'timber',
    amount: 5,
    rewardGold: 85,
    desc: 'Deliver 5 timber from Crescent Cay to Copperlight to support foundry repairs.'
  },
  {
    id: 'trade-iron',
    title: 'Foundry Iron Commission',
    giver: 'Haven Shipwrights',
    type: 'trade',
    target: 'haven',
    good: 'iron',
    amount: 4,
    rewardGold: 110,
    desc: 'Deliver 4 iron ingots to Haven’s Reach to forge replacement deck cannons.'
  },
  {
    id: 'bounty-corsair',
    title: 'Bounty: Scourge of the West',
    giver: 'Admiralty Board',
    type: 'bounty',
    target: 'corsair',
    amount: 1,
    rewardGold: 120,
    desc: 'Hunt down and sink an armed corsair raider patrolling the outer shipping lanes.'
  },
  {
    id: 'fish-feast',
    title: 'Fisherman’s Challenge',
    giver: 'Mara the Harbor Master',
    type: 'fish',
    target: 'tuna',
    amount: 2,
    rewardGold: 95,
    desc: 'Catch 2 Bluefin Tuna from the deep offshore fishing schools.'
  }
];

export function freshState() {
  return {
    version: 2,
    gold: 60,
    bait: 6,
    food: 5,
    timber: 2,
    iron: 0,
    rum: 0,
    fish: [],
    health: 100,
    stamina: 100,
    hull: 60,
    crew: 1,
    cannon: 0,
    sails: 0,
    tier: 0,
    mode: 'foot',
    x: 8,
    z: 90.5,
    heading: -Math.PI * 0.65,
    boat: { x: 13.8, z: 65.0, heading: 0.05 },
    captured: [],
    buildings: {},
    garrisons: Object.fromEntries(ISLANDS.filter(i => i.type === 'hostile').map(i => [i.id, i.health])),
    stocks: Object.fromEntries(FISH_SPOTS.map(s => [s.id, s.stock])),
    marketStocks: Object.fromEntries(ISLANDS.map(i => [i.id, { bait: 20, food: 15, timber: 14, iron: 10, rum: 8 }])),
    warehouses: Object.fromEntries(ISLANDS.map(i => [i.id, { timber: 0, iron: 0, food: 0, rum: 0 }])),
    population: Object.fromEntries(ISLANDS.map(i => [i.id, i.population])),
    elapsed: 0,
    lastFish: 0,
    fishCaught: 0,
    fishSold: 0,
    boarded: false,
    travelled: 0,
    seaKills: 0,
    boardingsWon: 0,
    visited: ['haven'],
    wind: { angle: 0.75, speed: 12 },
    contracts: [...CONTRACT_TEMPLATES],
    activeContracts: [],
    relics: [],
    salvageCollected: 0,
    notes: ['Your skiff waits at the harbor. The sea is yours to discover.']
  };
}
