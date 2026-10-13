import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshState,ISLANDS,FISH_SPOTS,dockOf} from '../src/world/content.js';
import {buyGood,sellGood,sellFish,marketPrice,findPath,navigable,walkable,maxHull,cargo,cargoLimit,windFactor,transferToWarehouse,transferFromWarehouse} from '../src/world/rules.js';
import {GameWorld} from '../src/world/engine.js';

function world(){const w=Object.create(GameWorld.prototype);w.state=freshState();w.clock=0;w.fishing=null;w.panel=null;w.held=false;w.save=()=>{};w.emit=()=>{};w.notify=message=>w.message=message;w.note=w.notify;w.visual={updateShip:()=>{},addSmoke:()=>{},addSplinters:()=>{},addSplash:()=>{}};w.createOwnedBuildings=()=>{};return w;}
test('a new captain starts on foot with a small, unarmed and limited skiff',()=>{const s=freshState();assert.equal(s.mode,'foot');assert.equal(s.cannon,0);assert.equal(s.tier,0);assert.equal(maxHull(s),60);assert.equal(cargoLimit(s),18);assert.equal(s.bait,6);assert.ok(walkable(s.x,s.z));});
test('market stock and gold limit purchases, while same-port flipping loses gold',()=>{const s=freshState(),i=ISLANDS[0],before=s.gold;assert.equal(buyGood(s,i,'timber').ok,true);assert.equal(s.timber,3);assert.equal(s.marketStocks.haven.timber,13);assert.ok(sellGood(s,i,'timber'));assert.ok(s.gold<before);s.marketStocks.haven.timber=0;assert.equal(buyGood(s,i,'timber').ok,false);s.gold=0;assert.equal(buyGood(s,i,'bait').ok,false);});
test('different islands reward genuine trade routes',()=>{const source=ISLANDS.find(i=>i.id==='crescent'),destination=ISLANDS.find(i=>i.id==='copper');assert.ok(marketPrice(destination,'timber',true)>marketPrice(source,'timber'));assert.ok(marketPrice(ISLANDS[0],'iron',true)>marketPrice(destination,'iron'));});
test('fish schools deplete, bait is consumed, and empty schools cannot be farmed',()=>{const w=world(),spot=FISH_SPOTS[0];for(let catchNumber=0;catchNumber<4;catchNumber++){w.fishing=null;w.startFishing(spot);assert.equal(w.state.bait,5-catchNumber);w.fishing.phase='bite';w.fishing.marker=50;w.hookFish();let holding=true;for(let n=0;n<1000&&w.fishing.phase==='reeling';n++){if(w.fishing.tension>72)holding=false;else if(w.fishing.tension<40)holding=true;w.held=holding;w.fishTick(.025);}assert.equal(w.fishing.phase,'caught');}assert.equal(w.state.stocks[spot.id],0);assert.equal(w.state.fish.length,4);w.fishing=null;const bait=w.state.bait;w.startFishing(spot);assert.equal(w.fishing,null);assert.equal(w.state.bait,bait);assert.match(w.message,/depleted/);});
test('holding the reel continuously snaps the line instead of awarding free fish',()=>{const w=world();w.startFishing(FISH_SPOTS[0]);w.fishing.phase='bite';w.fishing.marker=50;w.hookFish();w.held=true;for(let n=0;n<400&&w.fishing.phase==='reeling';n++)w.fishTick(.025);assert.equal(w.fishing.phase,'missed');assert.equal(w.state.fish.length,0);assert.equal(w.state.bait,5);assert.equal(w.state.stocks[FISH_SPOTS[0].id],4);});
test('hooking outside the target fails and does not add fish',()=>{const w=world();w.startFishing(FISH_SPOTS[0]);w.fishing.phase='bite';w.fishing.marker=10;w.hookFish();assert.equal(w.fishing.phase,'missed');assert.equal(w.state.fishCaught,0);});
test('walkable piers and sea routes lead to every island without crossing land',()=>{const start={x:8,z:59};for(const i of ISLANDS){const dock=dockOf(i);assert.ok(navigable(dock.x,dock.z),i.id);assert.ok(walkable(i.x+8,i.z+i.rz+7),i.id);const path=findPath(start,dock,'ship');assert.ok(path.length,i.id);assert.ok(path.every(p=>navigable(p.x,p.z)),i.id);}assert.deepEqual(findPath(start,{x:0,z:0},'ship'),[]);});
test('a cannon needs its price and materials; an upgrade changes real ship state',()=>{const w=world();w.panel='shipyard';w.upgrade('cannon');assert.equal(w.state.cannon,0);w.state.gold=100;w.state.timber=4;w.upgrade('cannon');assert.equal(w.state.cannon,1);assert.equal(w.state.gold,20);assert.equal(w.state.timber,0);});
test('settlements require a defeated garrison, crew, and provisions',()=>{const w=world();w.menuIsland=ISLANDS.find(i=>i.id==='tide');w.panel='settlement';w.state.crew=2;w.claim();assert.equal(w.state.captured.length,0);w.state.garrisons.tide=0;w.state.crew=1;w.claim();assert.equal(w.state.captured.length,0);w.state.crew=2;w.claim();assert.deepEqual(w.state.captured,['tide']);assert.equal(w.state.food,3);assert.equal(w.state.gold,190);w.claim();assert.equal(w.state.gold,190);});
test('constructed production buildings consume resources and produce at minute boundaries',()=>{const w=world();w.menuIsland=ISLANDS.find(i=>i.id==='tide');w.state.captured=['tide'];w.state.buildings.tide=[];w.state.gold=100;w.state.timber=10;w.build('lumber');assert.equal(w.state.gold,65);assert.equal(w.state.timber,2);assert.deepEqual(w.state.buildings.tide,['lumber']);w.state.elapsed=60;w.economy(0);assert.equal(w.state.timber,3);assert.equal(w.state.gold,73);});

test('wind factor provides tailwind boost when aligned and slows when tacking',()=>{
  const windAngle = 0; // Wind blowing north
  const tailwind = windFactor(0, windAngle); // Heading north
  const headwind = windFactor(Math.PI, windAngle); // Heading south
  assert.ok(tailwind > 1.2, 'tailwind should boost speed');
  assert.ok(headwind < 0.9, 'headwind should slow down speed');
  assert.ok(tailwind > headwind, 'tailwind must be faster than headwind');
});

test('island warehouses store goods locally and allow loading and unloading',()=>{
  const s = freshState();
  s.timber = 5;
  assert.ok(transferToWarehouse(s, 'haven', 'timber', 3));
  assert.equal(s.timber, 2);
  assert.equal(s.warehouses.haven.timber, 3);
  assert.ok(transferFromWarehouse(s, 'haven', 'timber', 2));
  assert.equal(s.timber, 4);
  assert.equal(s.warehouses.haven.timber, 1);
});

test('boarding a crippled corsair ship claims bonus plunder, cargo and increments victories',()=>{
  const w = world();
  const enemy = { id: 0, x: 50, z: 50, health: 15, max: 80, alive: true, kind: 'ship', model: { visible: true } };
  const beforeGold = w.state.gold;
  w.boardShip(enemy);
  assert.equal(enemy.alive, false);
  assert.ok(w.state.gold >= beforeGold + 90);
  assert.equal(w.state.seaKills, 1);
  assert.equal(w.state.boardingsWon, 1);
});

test('rum can be purchased and traded with high market value across islands',()=>{
  const s = freshState();
  const haven = ISLANDS.find(i => i.id === 'haven');
  const crescent = ISLANDS.find(i => i.id === 'crescent');
  assert.ok(marketPrice(crescent, 'rum') > marketPrice(haven, 'rum'));
  s.gold = 100;
  assert.ok(buyGood(s, haven, 'rum').ok);
  assert.equal(s.rum, 1);
});

