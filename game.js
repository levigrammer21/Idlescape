(() => {
  'use strict';

  const VERSION = '0.6.0';
  const SAVE_KEY = 'idle-wanderer-save-v6';
  const LEGACY_KEYS = ['idle-wanderer-save-v5', 'idle-wanderer-save-v4', 'idle-wanderer-save-v3', 'idle-wanderer-save-v2'];
  const TICK_SECONDS = 0.6;
  const WORLD = { width: 3800, height: 4300 };
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const ui = {
    status: document.getElementById('statusText'), actionName: document.getElementById('actionName'),
    actionProgress: document.getElementById('actionProgress'), inventory: document.getElementById('inventory'),
    skills: document.getElementById('skills'), equipment: document.getElementById('equipment'),
    map: document.getElementById('map'), toast: document.getElementById('toast'), region: document.getElementById('regionText'),
    dialog: document.getElementById('itemDialog'), itemType: document.getElementById('itemType'), itemName: document.getElementById('itemName'),
    itemDescription: document.getElementById('itemDescription'), itemStats: document.getElementById('itemStats'), itemAction: document.getElementById('itemActionButton'),
    townDialog: document.getElementById('townDialog'), townName: document.getElementById('townName'), townDescription: document.getElementById('townDescription'), townServices: document.getElementById('townServices')
  };

  const TREE_TYPES = {
    cedar: { name: 'Cedar', level: 1, ticks: 3, xp: 8, log: 'cedarLog', trunk: '#6f4a2e', leaves: '#3f8051', respawn: 16, capacity: [5, 8] },
    oak: { name: 'Oak', level: 10, ticks: 5, xp: 18, log: 'oakLog', trunk: '#694528', leaves: '#477944', respawn: 22, capacity: [5, 7] },
    willow: { name: 'Willow', level: 20, ticks: 7, xp: 32, log: 'willowLog', trunk: '#806044', leaves: '#67915b', respawn: 28, capacity: [4, 7] },
    beech: { name: 'Beech', level: 30, ticks: 9, xp: 55, log: 'beechLog', trunk: '#76513c', leaves: '#8b9851', respawn: 34, capacity: [4, 6] },
    cherry: { name: 'Cherry', level: 40, ticks: 12, xp: 90, log: 'cherryLog', trunk: '#6e3e37', leaves: '#b86f77', respawn: 42, capacity: [4, 6] },
    arcticPine: { name: 'Arctic Pine', level: 50, ticks: 16, xp: 140, log: 'arcticPineLog', trunk: '#765a40', leaves: '#6f9c8a', respawn: 50, capacity: [4, 5] },
    mahogany: { name: 'Mahogany', level: 60, ticks: 18, xp: 175, log: 'mahoganyLog', trunk: '#733c2c', leaves: '#38714c', respawn: 58, capacity: [3, 5] },
    redwood: { name: 'Redwood', level: 70, ticks: 20, xp: 220, log: 'redwoodLog', trunk: '#713b2a', leaves: '#2f6542', respawn: 68, capacity: [3, 4] }
  };

  const FISH_TYPES = {
    minnow: { name: 'Minnow', level: 1, ticks: 3, xp: 8, item: 'rawMinnow', color: '#b8d7de' },
    crappie: { name: 'Crappie', level: 10, ticks: 5, xp: 18, item: 'rawCrappie', color: '#a6c2b3' },
    bass: { name: 'Bass', level: 20, ticks: 7, xp: 32, item: 'rawBass', color: '#87a899' },
    catfish: { name: 'Catfish', level: 30, ticks: 9, xp: 55, item: 'rawCatfish', color: '#9a8c72' },
    tuna: { name: 'Tuna', level: 40, ticks: 12, xp: 90, item: 'rawTuna', color: '#6f91ae' },
    grouper: { name: 'Grouper', level: 50, ticks: 16, xp: 140, item: 'rawGrouper', color: '#a0715b' },
    shark: { name: 'Shark', level: 70, ticks: 20, xp: 220, item: 'rawShark', color: '#8295a5' }
  };

  const ROCK_TYPES = {
    stone: { name: 'Stone', level: 1, ticks: 3, xp: 8, item: 'stone', color: '#8c9299', respawn: 16, hp: 4 },
    copper: { name: 'Copper', level: 10, ticks: 5, xp: 18, item: 'copperOre', color: '#b9784f', respawn: 22, hp: 5 },
    iron: { name: 'Iron', level: 20, ticks: 7, xp: 32, item: 'ironOre', color: '#6f7782', respawn: 28, hp: 6 },
    coal: { name: 'Coal', level: 30, ticks: 9, xp: 55, item: 'coal', color: '#34383e', respawn: 34, hp: 7 },
    silver: { name: 'Silver', level: 40, ticks: 12, xp: 90, item: 'silverOre', color: '#c4ccd2', respawn: 42, hp: 8 },
    pyrite: { name: 'Pyrite', level: 50, ticks: 16, xp: 140, item: 'pyriteOre', color: '#c59d39', respawn: 50, hp: 9 },
    gold: { name: 'Gold', level: 60, ticks: 18, xp: 175, item: 'goldOre', color: '#d4b33f', respawn: 58, hp: 10 },
    crystal: { name: 'Crystal', level: 70, ticks: 20, xp: 220, item: 'crystal', color: '#8ed7e8', respawn: 68, hp: 11 }
  };

  const TOOL_TYPES = {
    axe: { name: 'axe', skill: 'Woodcutting' },
    pickaxe: { name: 'pickaxe', skill: 'Mining' },
    fishingRod: { name: 'fishing rod', skill: 'Fishing' }
  };

  const ITEM_DEFS = {
    stoneAxe: { name: 'Stone Axe', type: 'Woodcutting tool', description: 'A simple starter axe. Owning it allows you to cut trees; it does not need to be equipped.', tool: 'axe', toolTier: 1, stats: { 'Skill': 'Woodcutting', 'Required level': '1', 'Chopping speed': 'Base speed' } },
    stonePickaxe: { name: 'Stone Pickaxe', type: 'Mining tool', description: 'A simple starter pickaxe. Owning it will allow you to mine rocks; it does not need to be equipped.', tool: 'pickaxe', toolTier: 1, stats: { 'Skill': 'Mining', 'Required level': '1', 'Mining speed': 'Base speed' } },
    basicFishingRod: { name: 'Basic Fishing Rod', type: 'Fishing tool', description: 'A basic starter fishing rod. Owning it will allow you to fish; it does not need to be equipped.', tool: 'fishingRod', toolTier: 1, stats: { 'Skill': 'Fishing', 'Required level': '1', 'Fishing speed': 'Base speed' } },
    rawMinnow: { name: 'Raw Minnow', type: 'Raw fish', description: 'A tiny freshwater fish caught in calm ponds.', uses: 'Future Cooking · Bait' },
    rawCrappie: { name: 'Raw Crappie', type: 'Raw fish', description: 'A speckled pond fish with mild meat.', uses: 'Future Cooking · Food' },
    rawBass: { name: 'Raw Bass', type: 'Raw fish', description: 'A sturdy freshwater fish found in deeper lakes.', uses: 'Future Cooking · Food' },
    rawCatfish: { name: 'Raw Catfish', type: 'Raw fish', description: 'A whiskered fish that prefers murky swamp water.', uses: 'Future Cooking · Food' },
    rawTuna: { name: 'Raw Tuna', type: 'Raw fish', description: 'A strong ocean fish caught from coastal waters.', uses: 'Future Cooking · Food' },
    rawGrouper: { name: 'Raw Grouper', type: 'Raw fish', description: 'A heavy reef fish caught along the warm coast.', uses: 'Future Cooking · Food' },
    rawShark: { name: 'Raw Shark', type: 'Raw fish', description: 'A dangerous deep-water catch requiring great Fishing skill.', uses: 'Future Cooking · High-level food' },
    stone: { name: 'Stone', type: 'Mining material', description: 'A common chunk of stone useful for construction and basic crafting.', uses: 'Future Construction · Crafting' },
    copperOre: { name: 'Copper Ore', type: 'Mining material', description: 'A warm-coloured ore ready to be refined into copper.', uses: 'Future Smelting · Smithing' },
    ironOre: { name: 'Iron Ore', type: 'Mining material', description: 'A sturdy metal ore used for dependable tools and armour.', uses: 'Future Smelting · Smithing' },
    coal: { name: 'Coal', type: 'Mining material', description: 'Dense black fuel used by furnaces and higher-level recipes.', uses: 'Future Smelting · Fuel' },
    silverOre: { name: 'Silver Ore', type: 'Mining material', description: 'A pale valuable ore suited to jewellery and refined gear.', uses: 'Future Smelting · Crafting' },
    pyriteOre: { name: 'Pyrite Ore', type: 'Mining material', description: 'A bright metallic ore sometimes called fool’s gold.', uses: 'Future Smelting · Smithing · Jewellery' },
    goldOre: { name: 'Gold Ore', type: 'Mining material', description: 'A valuable heavy ore used for precious bars and ornaments.', uses: 'Future Smelting · Jewellery' },
    crystal: { name: 'Crystal', type: 'Mining material', description: 'A rare luminous crystal mined from the deepest deposits.', uses: 'Future High-level Crafting · Equipment' },
    cedarLog: { name: 'Cedar Log', type: 'Woodcutting material', description: 'A light, fragrant log from a cedar tree.', uses: 'Future Firemaking · Fletching · Construction' },
    oakLog: { name: 'Oak Log', type: 'Woodcutting material', description: 'A dependable hardwood log with a sturdy grain.', uses: 'Future Firemaking · Fletching · Construction' },
    willowLog: { name: 'Willow Log', type: 'Woodcutting material', description: 'A flexible pale log cut near wet ground.', uses: 'Future Firemaking · Fletching · Crafting' },
    beechLog: { name: 'Beech Log', type: 'Woodcutting material', description: 'A smooth, dense log suited to careful woodworking.', uses: 'Future Firemaking · Construction · Crafting' },
    cherryLog: { name: 'Cherry Log', type: 'Woodcutting material', description: 'A warm-toned log with a faint sweet scent.', uses: 'Future Construction · Crafting · Fletching' },
    arcticPineLog: { name: 'Arctic Pine Log', type: 'Woodcutting material', description: 'A resinous pine log grown in the cold northern reaches.', uses: 'Future Firemaking · Construction' },
    mahoganyLog: { name: 'Mahogany Log', type: 'Woodcutting material', description: 'A rich, heavy tropical hardwood log.', uses: 'Future Construction · Crafting' },
    redwoodLog: { name: 'Redwood Log', type: 'Woodcutting material', description: 'A massive, valuable log cut from an ancient redwood.', uses: 'Future Master Construction · Crafting' },
    club: { name: 'Crude Club', type: 'Weapon', description: 'A rough club carried over from the earlier test build.', slot: 'weapon', stats: { 'Attack speed': '4 ticks · 2.4 seconds', 'Maximum hit': '3', 'Strength': '+2' } },
    clothShirt: { name: 'Cloth Shirt', type: 'Body armour', description: 'Basic cloth armour carried over from the earlier test build.', slot: 'body', stats: { 'Defence': '+1', 'Weight': 'Light' } }
  };

  const SKILL_DEFS = {
    woodcutting: { name: 'Woodcutting', description: 'Cuts trees. Higher levels unlock better trees and axes will reduce chopping time.' },
    fishing: { name: 'Fishing', description: 'Catches fish. Higher levels unlock better fish and bait that reduces catch time.' },
    mining: { name: 'Mining', description: 'Mines rocks and ores. Higher levels unlock better deposits and pickaxes that reduce mining time.' },
    cooking: { name: 'Cooking', description: 'Cooks raw meat and fish into food that restores health.' },
    crafting: { name: 'Crafting', description: 'Combines materials at crafting stations to create increasingly powerful items.' },
    smithing: { name: 'Smithing', description: 'Uses metal bars to create tools, armour, and weapons.' },
    melee: { name: 'Melee', description: 'Close-range combat trained with fists, swords, axes, picks, and similar weapons.' },
    range: { name: 'Ranged', description: 'Long-range combat trained with bows, slingshots, rifles, and other ranged weapons.' },
    fortitude: { name: 'Fortitude', description: 'Your health skill. It gains part of the XP earned by your active combat style and increases maximum health.' },
    summoning: { name: 'Summoning', description: 'Summons animal companions. Pets fight with you and some provide gathering or skill benefits.' },
    merching: { name: 'Merching', description: 'Gains XP by buying and selling. Higher levels unlock stock and improve selling prices.' },
    farming: { name: 'Farming', description: 'Grow crops in your player-owned home and return later to harvest them.' },
    ranching: { name: 'Ranching', description: 'Raise animals by providing food, then collect products or sell livestock.' }
  };

  // One continuous continent. Biomes overlap the base land so there are no black seams.
  const continent = [[680,210],[1450,100],[2250,180],[2920,430],[3240,900],[3160,1420],[3520,1880],[3430,2550],[3090,2920],[3020,3500],[2630,4070],[1840,4210],[1080,4060],[650,3610],[520,3020],[190,2470],[260,1700],[470,1250],[390,740]];

  const regions = [
    { id: 'swamp', name: 'Swamp', color: '#587b61', points: [[650,180],[1500,90],[2260,170],[2860,380],[3000,790],[2760,1120],[2180,1050],[1760,880],[1120,980],[620,730]] },
    { id: 'northDead', name: 'Northern Dead Grass', color: '#9b9066', points: [[470,760],[1110,900],[1760,820],[2220,1030],[2850,970],[3200,1300],[3000,1700],[2340,1660],[1940,1480],[1280,1570],[760,1390],[430,1120]] },
    { id: 'desert', name: 'Desert', color: '#cba963', points: [[250,1250],[760,1310],[1120,1590],[1050,2130],[850,2620],[470,2860],[170,2460],[210,1790]] },
    { id: 'central', name: 'Central Grass', color: '#72ae61', points: [[950,1450],[1530,1370],[2050,1470],[2390,1740],[2450,2340],[2120,2640],[1450,2740],[970,2480],[820,2020]] },
    { id: 'eastGrass', name: 'Eastern Grass', color: '#69a95f', points: [[2260,1510],[3090,1450],[3500,1880],[3400,2550],[3040,2860],[2430,2550],[2380,2070]] },
    { id: 'southDead', name: 'Southern Dead Grass', color: '#91865f', points: [[820,2520],[1460,2650],[2140,2530],[2640,2860],[2640,3370],[2130,3590],[1350,3510],[750,3220],[520,2860]] },
    { id: 'jungle', name: 'Jungle', color: '#438158', points: [[730,3170],[1380,3430],[2180,3490],[2760,3300],[3020,3590],[2640,4070],[1840,4200],[1060,4050],[650,3600]] }
  ];

  const waters = [
    { name: 'Cedar Pond', kind: 'lake', x: 1540, y: 1900, rx: 250, ry: 165, color: '#4d95b5' },
    { name: 'Willow Mere', kind: 'lake', x: 2870, y: 2160, rx: 310, ry: 195, color: '#4d91ad' },
    { name: 'Swamp Pool', kind: 'lake', x: 2250, y: 610, rx: 340, ry: 180, color: '#4f8b82' },
    { name: 'Jungle Lagoon', kind: 'lake', x: 1900, y: 3800, rx: 300, ry: 170, color: '#3e8fa0' }
  ];

  const fishingSeeds = [
    ['minnow', 1470, 1880, 1335, 1830, 'Cedar Pond'],
    ['minnow', 1660, 1940, 1760, 2070, 'Cedar Pond'],
    ['crappie', 2850, 2100, 2690, 2050, 'Willow Mere'],
    ['crappie', 2980, 2210, 3125, 2290, 'Willow Mere'],
    ['bass', 1960, 3765, 1810, 3650, 'Jungle Lagoon'],
    ['bass', 1780, 3820, 1660, 3925, 'Jungle Lagoon'],
    ['catfish', 2180, 620, 2050, 770, 'Swamp Pool'],
    ['catfish', 2370, 560, 2470, 720, 'Swamp Pool'],
    ['tuna', 3480, 1750, 3310, 1760, 'Eastern Ocean'],
    ['tuna', 3060, 3620, 2920, 3520, 'Southern Ocean'],
    ['grouper', 2450, 4190, 2450, 4010, 'Southern Ocean'],
    ['grouper', 510, 3370, 690, 3370, 'Western Ocean'],
    ['shark', 1720, 4260, 1720, 4080, 'Deep Southern Ocean'],
    ['shark', 3300, 2870, 3150, 2790, 'Deep Eastern Ocean']
  ];

  function makeFishingSpots(saved = {}) {
    return fishingSeeds.map(([type,x,y,standX,standY,location], index) => {
      const id = `fish-${type}-${index}`; const prior=saved[id]||{};
      return { id,type,x,y,standX,standY,location,phase:index*0.83,remaining:prior.remaining ?? randomInt(5,9),respawnAt:prior.respawnAt||0 };
    });
  }

  const towns = [
    { name: 'Swamp Town', x: 1250, y: 520, description: 'A quiet settlement raised above the wet northern marsh.' }, { name: 'North Town', x: 2600, y: 1270, description: 'A hardy northern stop serving travellers headed toward the cold pines.' },
    { name: 'Desert Town', x: 520, y: 1980, description: 'A sun-baked trading post near the western sands.' }, { name: 'Starting Town', x: 1770, y: 2190, description: 'The central home town and starting point for your family adventure.' },
    { name: 'East Town', x: 3050, y: 1880, description: 'A green eastern settlement beside open grassland and water.' }, { name: 'South Town', x: 1350, y: 3100, description: 'A weathered town between the central fields and southern jungle.' },
    { name: 'Jungle Town', x: 2470, y: 3720, description: 'A warm jungle settlement surrounded by valuable hardwoods.' }
  ];

  const treeSeeds = [
    ['cedar',1450,1690],['cedar',1740,1580],['cedar',2060,1810],['cedar',1320,2240],
    ['oak',1120,1800],['oak',2150,2280],['oak',2500,1760],
    ['willow',2670,2040],['willow',3030,2300],['willow',1450,2050],
    ['beech',920,2450],['beech',2500,2700],['beech',1120,2850],
    ['cherry',750,3060],['cherry',1480,3330],['cherry',2240,3230],
    ['arcticPine',980,620],['arcticPine',1590,440],['arcticPine',2700,700],
    ['mahogany',1120,3710],['mahogany',2450,3890],['mahogany',2720,3450],
    ['redwood',1620,3950],['redwood',2200,4020]
  ];

  function makeTrees(saved = {}) {
    return treeSeeds.map(([type,x,y], index) => {
      const id = `${type}-${index}`; const prior = saved[id] || {};
      const def = TREE_TYPES[type];
      return { id, type, x, y, remaining: prior.remaining ?? randomInt(def.capacity[0], def.capacity[1]), respawnAt: prior.respawnAt || 0, max: prior.max || randomInt(def.capacity[0], def.capacity[1]) };
    });
  }

  const rockSeeds = [
    ['stone',1650,2440],['stone',1930,2490],['stone',2200,2360],
    ['copper',2380,1580],['copper',2740,1710],
    ['iron',2700,2520],['iron',3060,2400],
    ['coal',1080,1360],['coal',1420,1280],
    ['silver',760,2350],['silver',520,2200],
    ['pyrite',1080,3130],['pyrite',1520,3020],
    ['gold',2320,3440],['gold',2650,3600],
    ['crystal',1200,520],['crystal',1920,420]
  ];

  function makeRocks(saved = {}) {
    return rockSeeds.map(([type,x,y], index) => {
      const id = `rock-${type}-${index}`, prior = saved[id] || {}, def = ROCK_TYPES[type];
      return { id, type, x, y, hp: prior.hp ?? def.hp, maxHp: def.hp, respawnAt: prior.respawnAt || 0 };
    });
  }

  const defaultInventory = () => Object.fromEntries(Object.keys(ITEM_DEFS).map(k => [k, 0]));
  const defaultState = () => ({
    version: VERSION,
    player: { x: 1780, y: 2340, targetX: 1780, targetY: 2340 },
    inventory: { ...defaultInventory(), stoneAxe: 1, stonePickaxe: 1, basicFishingRod: 1 },
    skills: Object.fromEntries(Object.keys(SKILL_DEFS).map(k => [k, { xp: 0 }])),
    equipment: { head: null, body: null, legs: null, boots: null, weapon: null, shield: null, cape: null, ring: null },
    treeState: {}, fishingState: {}, rockState: {}, lastSavedAt: Date.now()
  });

  const camera = { x: 0, y: 0 };
  let state = loadState();
  let trees = makeTrees(state.treeState);
  let fishingSpots = makeFishingSpots(state.fishingState);
  let rocks = makeRocks(state.rockState);
  let lastFrame = performance.now(), toastTimer = null, selectedItemKey = null;
  let activeTree = null, queuedTree = null, activeFishingSpot = null, queuedFishingSpot = null, activeRock = null, queuedRock = null, queuedTown = null, actionElapsed = 0;
  let animationClock = 0;
  const floaters = [];

  function randomInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
  function xpForLevel(level){ return Math.floor(32 * Math.pow(Math.max(0, level - 1), 2)); }
  function levelFromXp(xp){ let level=1; while(level<100 && xp>=xpForLevel(level+1)) level++; return level; }
  function currentLevelProgress(xp){ const level=levelFromXp(xp); if(level>=100)return 1; return (xp-xpForLevel(level))/(xpForLevel(level+1)-xpForLevel(level)); }

  function pointInPolygon(x,y,points){ let inside=false; for(let i=0,j=points.length-1;i<points.length;j=i++) { const [xi,yi]=points[i],[xj,yj]=points[j]; const hit=((yi>y)!==(yj>y)) && x<(xj-xi)*(y-yi)/((yj-yi)||.00001)+xi; if(hit)inside=!inside; } return inside; }
  function pointInWater(x,y){ return waters.some(w => ((x-w.x)/w.rx)**2 + ((y-w.y)/w.ry)**2 <= 1); }
  function isWalkable(x,y){ return pointInPolygon(x,y,continent) && !pointInWater(x,y); }
  function regionAt(x,y){ return regions.slice().reverse().find(r=>pointInPolygon(x,y,r.points)) || { name:'Grasslands', color:'#72ae61' }; }
  function ownedTools(toolType){
    return Object.entries(state.inventory)
      .filter(([key, quantity]) => quantity > 0 && ITEM_DEFS[key]?.tool === toolType)
      .sort((a,b) => (ITEM_DEFS[b[0]].toolTier || 0) - (ITEM_DEFS[a[0]].toolTier || 0));
  }
  function bestOwnedTool(toolType){ return ownedTools(toolType)[0]?.[0] || null; }

  function loadState(){
    try {
      let raw=localStorage.getItem(SAVE_KEY); if(!raw) for(const key of LEGACY_KEYS){raw=localStorage.getItem(key);if(raw)break;}
      if(!raw)return defaultState(); const old=JSON.parse(raw), fresh=defaultState();
      fresh.inventory={...fresh.inventory,...(old.inventory||{})};
      // Tool ownership, not equipment, controls gathering access. Existing saves receive the starter set once.
      for (const starter of ['stoneAxe','stonePickaxe','basicFishingRod']) {
        if (!fresh.inventory[starter] || fresh.inventory[starter] < 1) fresh.inventory[starter] = 1;
      }
      for(const key of Object.keys(SKILL_DEFS)) if(old.skills?.[key]) fresh.skills[key]=old.skills[key];
      fresh.equipment={...fresh.equipment,...(old.equipment||{})}; fresh.treeState=old.treeState||{}; fresh.fishingState=old.fishingState||{}; fresh.rockState=old.rockState||{};
      if(old.player && isWalkable(old.player.x,old.player.y)) fresh.player={...fresh.player,x:old.player.x,y:old.player.y,targetX:old.player.x,targetY:old.player.y};
      return fresh;
    } catch(e){ console.error(e); return defaultState(); }
  }

  function saveGame(show=false){
    state.treeState=Object.fromEntries(trees.map(t=>[t.id,{remaining:t.remaining,respawnAt:t.respawnAt,max:t.max}]));
    state.fishingState=Object.fromEntries(fishingSpots.map(f=>[f.id,{remaining:f.remaining,respawnAt:f.respawnAt}]));
    state.rockState=Object.fromEntries(rocks.map(r=>[r.id,{hp:r.hp,respawnAt:r.respawnAt}]));
    state.lastSavedAt=Date.now(); state.version=VERSION; localStorage.setItem(SAVE_KEY,JSON.stringify(state)); if(show)showToast('Game saved');
  }
  function showToast(message){ ui.toast.textContent=message;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1800); }
  function worldToScreen(x,y){ return {x:x-camera.x,y:y-camera.y}; }
  function screenToWorld(x,y){ return {x:x+camera.x,y:y+camera.y}; }

  function townAt(x,y){ let best=null,bestD=72; for(const t of towns){const d=Math.hypot(x-t.x,y-t.y);if(d<bestD){best=t;bestD=d;}} return best; }
  function treeAt(x,y){ let best=null,bestD=44; for(const t of trees){if(t.remaining<=0)continue;const d=Math.hypot(x-t.x,y-t.y);if(d<bestD){best=t;bestD=d;}} return best; }
  function rockAt(x,y){ let best=null,bestD=48; for(const r of rocks){if(r.hp<=0)continue;const d=Math.hypot(x-r.x,y-r.y);if(d<bestD){best=r;bestD=d;}} return best; }
  function fishingSpotAt(x,y){ let best=null,bestD=52; for(const r of rocks){if(r.hp<=0&&r.respawnAt&&now>=r.respawnAt){r.hp=r.maxHp;r.respawnAt=0;}}
    for(const f of fishingSpots){if(f.remaining<=0)continue;const d=Math.hypot(x-f.x,y-f.y);if(d<bestD){best=f;bestD=d;}} return best; }
  function handlePointer(event){
    event.preventDefault(); const rect=canvas.getBoundingClientRect(); const sx=(event.clientX-rect.left)*canvas.width/rect.width, sy=(event.clientY-rect.top)*canvas.height/rect.height; const p=screenToWorld(sx,sy);
    const town=townAt(p.x,p.y), tree=treeAt(p.x,p.y), rock=rockAt(p.x,p.y), fishingSpot=fishingSpotAt(p.x,p.y); stopAction(false);
    if(town){
      queuedTown=town; queuedTree=null; queuedFishingSpot=null; queuedRock=null; const dx=state.player.x-town.x,dy=state.player.y-town.y,d=Math.hypot(dx,dy)||1;
      state.player.targetX=town.x+dx/d*82;state.player.targetY=town.y+dy/d*82;ui.status.textContent=`Walking to ${town.name}...`;ui.actionName.textContent='Walking';showToast(town.name);return;
    }
    if(fishingSpot){
      const def=FISH_TYPES[fishingSpot.type], level=levelFromXp(state.skills.fishing.xp);
      if(level<def.level){showToast(`${def.name} Fishing Spot · Fishing level ${def.level} required`);return;}
      if(!bestOwnedTool('fishingRod')){showToast(`${def.name} Fishing Spot · A fishing rod is required`);return;}
      queuedFishingSpot=fishingSpot; queuedTree=null; queuedTown=null;
      state.player.targetX=fishingSpot.standX; state.player.targetY=fishingSpot.standY;
      ui.status.textContent=`Walking to ${def.name} fishing spot...`;ui.actionName.textContent='Walking';showToast(`${def.name} Fishing Spot`);return;
    }
    if(rock){
      const def=ROCK_TYPES[rock.type], level=levelFromXp(state.skills.mining.xp);
      if(level<def.level){showToast(`${def.name} Rock · Mining level ${def.level} required`);return;}
      if(!bestOwnedTool('pickaxe')){showToast(`${def.name} Rock · A pickaxe is required`);return;}
      queuedRock=rock; queuedTree=null; queuedFishingSpot=null; queuedTown=null;
      const dx=state.player.x-rock.x,dy=state.player.y-rock.y,d=Math.hypot(dx,dy)||1;
      state.player.targetX=rock.x+dx/d*62;state.player.targetY=rock.y+dy/d*62;
      ui.status.textContent=`Walking to ${def.name} rock...`;ui.actionName.textContent='Walking';showToast(`${def.name} Rock`);return;
    }
    if(tree){
      const def=TREE_TYPES[tree.type], level=levelFromXp(state.skills.woodcutting.xp);
      if(level<def.level){showToast(`${def.name} Tree · Woodcutting level ${def.level} required`);return;}
      if(!bestOwnedTool('axe')){showToast(`${def.name} Tree · An axe is required`);return;}
      queuedTree=tree; queuedFishingSpot=null; const dx=state.player.x-tree.x,dy=state.player.y-tree.y,d=Math.hypot(dx,dy)||1; const stand=58;
      state.player.targetX=tree.x+dx/d*stand;state.player.targetY=tree.y+dy/d*stand;ui.status.textContent=`Walking to ${def.name} tree...`;ui.actionName.textContent='Walking';return;
    }
    if(!isWalkable(p.x,p.y)){showToast(pointInWater(p.x,p.y)?'You cannot walk into the water':'You cannot leave the continent');return;}
    queuedTree=null;queuedFishingSpot=null;queuedRock=null;queuedTown=null;state.player.targetX=p.x;state.player.targetY=p.y;ui.status.textContent='Walking...';ui.actionName.textContent='Exploring';
  }

  function stopAction(stopMovement=true){ activeTree=null;queuedTree=null;activeFishingSpot=null;queuedFishingSpot=null;activeRock=null;queuedRock=null;queuedTown=null;actionElapsed=0;ui.actionProgress.style.width='0%';if(stopMovement){state.player.targetX=state.player.x;state.player.targetY=state.player.y;}ui.actionName.textContent='Exploring'; }
  function beginChopping(tree){ activeTree=tree;queuedTree=null;actionElapsed=0;const def=TREE_TYPES[tree.type], tool=ITEM_DEFS[bestOwnedTool('axe')];ui.actionName.textContent=`Chopping ${def.name}`;ui.status.textContent=`Chopping ${def.name} tree with ${tool?.name || 'an axe'}...`; }
  function beginMining(rock){ activeRock=rock;queuedRock=null;actionElapsed=0;const def=ROCK_TYPES[rock.type],tool=ITEM_DEFS[bestOwnedTool('pickaxe')];ui.actionName.textContent=`Mining ${def.name}`;ui.status.textContent=`Mining ${def.name} with ${tool?.name || 'a pickaxe'}...`; }
  function beginFishing(spot){ activeFishingSpot=spot;queuedFishingSpot=null;actionElapsed=0;const def=FISH_TYPES[spot.type],tool=ITEM_DEFS[bestOwnedTool('fishingRod')];ui.actionName.textContent=`Fishing ${def.name}`;ui.status.textContent=`Fishing for ${def.name} with ${tool?.name || 'a fishing rod'}...`; }
  function awardFish(spot){
    const def=FISH_TYPES[spot.type];state.inventory[def.item]=(state.inventory[def.item]||0)+1;state.skills.fishing.xp+=def.xp;spot.remaining--;
    floaters.push({x:spot.standX,y:spot.standY-65,text:`+1 ${ITEM_DEFS[def.item].name}  +${def.xp} XP`,life:1.4});renderInventory();renderSkills();
    if(spot.remaining<=0){spot.respawnAt=Date.now()+randomInt(20,36)*1000;showToast(`${def.name} fishing spot moved`);stopAction(true);}else actionElapsed=0;
  }

  function awardOre(rock){
    const def=ROCK_TYPES[rock.type];state.inventory[def.item]=(state.inventory[def.item]||0)+1;state.skills.mining.xp+=def.xp;rock.hp--;
    floaters.push({x:rock.x,y:rock.y-48,text:`+1 ${ITEM_DEFS[def.item].name}  +${def.xp} XP`,life:1.4});renderInventory();renderSkills();
    if(rock.hp<=0){rock.respawnAt=Date.now()+def.respawn*1000;showToast(`${def.name} rock depleted`);stopAction(true);}else actionElapsed=0;
  }

  function awardLog(tree){
    const def=TREE_TYPES[tree.type]; state.inventory[def.log]=(state.inventory[def.log]||0)+1;state.skills.woodcutting.xp+=def.xp;tree.remaining--;
    floaters.push({x:tree.x,y:tree.y-55,text:`+1 ${ITEM_DEFS[def.log].name}  +${def.xp} XP`,life:1.4}); renderInventory();renderSkills();
    if(tree.remaining<=0){tree.respawnAt=Date.now()+def.respawn*1000;showToast(`${def.name} tree depleted`);stopAction(true);} else actionElapsed=0;
  }

  function update(dt){
    animationClock+=dt; const now=Date.now(); for(const t of trees){if(t.remaining<=0&&t.respawnAt&&now>=t.respawnAt){const def=TREE_TYPES[t.type];t.max=randomInt(def.capacity[0],def.capacity[1]);t.remaining=t.max;t.respawnAt=0;}}
    for(const r of rocks){if(r.hp<=0&&r.respawnAt&&now>=r.respawnAt){r.hp=r.maxHp;r.respawnAt=0;}}
    for(const f of fishingSpots){if(f.remaining<=0&&f.respawnAt&&now>=f.respawnAt){f.remaining=randomInt(5,9);f.respawnAt=0;}}
    const p=state.player,dx=p.targetX-p.x,dy=p.targetY-p.y,dist=Math.hypot(dx,dy);
    if(dist>2){const move=Math.min(dist,190*dt),nx=p.x+dx/dist*move,ny=p.y+dy/dist*move;if(isWalkable(nx,ny)){p.x=nx;p.y=ny;}else{p.targetX=p.x;p.targetY=p.y;queuedTree=null;queuedFishingSpot=null;queuedRock=null;queuedTown=null;showToast('That route is blocked');}}
    else {p.x=p.targetX;p.y=p.targetY;if(queuedTown && Math.hypot(p.x-queuedTown.x,p.y-queuedTown.y)<105){const town=queuedTown;queuedTown=null;openTown(town);}else if(queuedRock && queuedRock.hp>0 && Math.hypot(p.x-queuedRock.x,p.y-queuedRock.y)<90)beginMining(queuedRock);else if(queuedFishingSpot && queuedFishingSpot.remaining>0 && Math.hypot(p.x-queuedFishingSpot.standX,p.y-queuedFishingSpot.standY)<20)beginFishing(queuedFishingSpot);else if(queuedTree && queuedTree.remaining>0 && Math.hypot(p.x-queuedTree.x,p.y-queuedTree.y)<78)beginChopping(queuedTree);else if(!activeTree&&!activeFishingSpot&&!activeRock){ui.status.textContent='Tap the ground, a tree, a rock, a fishing spot, or a town.';ui.actionName.textContent='Exploring';}}
    if(activeTree){
      if(activeTree.remaining<=0 || Math.hypot(p.x-activeTree.x,p.y-activeTree.y)>85)stopAction(false);
      else {const def=TREE_TYPES[activeTree.type],duration=def.ticks*TICK_SECONDS;actionElapsed+=dt;ui.actionProgress.style.width=`${Math.min(100,actionElapsed/duration*100)}%`;if(actionElapsed>=duration)awardLog(activeTree);}
    } else if(activeRock){
      if(activeRock.hp<=0 || Math.hypot(p.x-activeRock.x,p.y-activeRock.y)>92)stopAction(false);
      else {const def=ROCK_TYPES[activeRock.type],duration=def.ticks*TICK_SECONDS;actionElapsed+=dt;ui.actionProgress.style.width=`${Math.min(100,actionElapsed/duration*100)}%`;if(actionElapsed>=duration)awardOre(activeRock);}
    } else if(activeFishingSpot){
      if(activeFishingSpot.remaining<=0 || Math.hypot(p.x-activeFishingSpot.standX,p.y-activeFishingSpot.standY)>30)stopAction(false);
      else {const def=FISH_TYPES[activeFishingSpot.type],duration=def.ticks*TICK_SECONDS;actionElapsed+=dt;ui.actionProgress.style.width=`${Math.min(100,actionElapsed/duration*100)}%`;if(actionElapsed>=duration)awardFish(activeFishingSpot);}
    } else ui.actionProgress.style.width='0%';
    const region=regionAt(p.x,p.y);ui.region.textContent=region.name;if(document.getElementById('map')?.classList.contains('active'))drawMiniMap();
    const tx=clamp(p.x-canvas.width/2,0,WORLD.width-canvas.width),ty=clamp(p.y-canvas.height/2,0,WORLD.height-canvas.height),follow=1-Math.pow(.018,dt);camera.x+=(tx-camera.x)*follow;camera.y+=(ty-camera.y)*follow;
    for(let i=floaters.length-1;i>=0;i--){floaters[i].life-=dt;floaters[i].y-=24*dt;if(floaters[i].life<=0)floaters.splice(i,1);}
  }

  function smoothPath(points){
    const s=points.map(([x,y])=>worldToScreen(x,y));ctx.beginPath();ctx.moveTo(s[0].x,s[0].y);
    for(let i=0;i<s.length;i++){const p0=s[(i-1+s.length)%s.length],p1=s[i],p2=s[(i+1)%s.length],p3=s[(i+2)%s.length];const c1={x:p1.x+(p2.x-p0.x)/6,y:p1.y+(p2.y-p0.y)/6},c2={x:p2.x-(p3.x-p1.x)/6,y:p2.y-(p3.y-p1.y)/6};ctx.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,p2.x,p2.y);}ctx.closePath();
  }
  function fillSmooth(points,color,stroke=null,width=1){smoothPath(points);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function drawTileTexture(points){ctx.save();smoothPath(points);ctx.clip();const tile=54,minX=Math.floor(camera.x/tile)*tile,minY=Math.floor(camera.y/tile)*tile;for(let y=minY;y<camera.y+canvas.height+tile;y+=tile)for(let x=minX;x<camera.x+canvas.width+tile;x+=tile){const s=worldToScreen(x,y);ctx.fillStyle=((x/tile+y/tile)%2)?'rgba(255,255,255,.025)':'rgba(0,0,0,.025)';ctx.fillRect(s.x,s.y,tile,tile);}ctx.restore();}
  function drawWater(w){const s=worldToScreen(w.x,w.y);ctx.beginPath();ctx.ellipse(s.x,s.y,w.rx,w.ry,0,0,Math.PI*2);ctx.fillStyle=w.color;ctx.fill();ctx.strokeStyle='rgba(176,220,231,.48)';ctx.lineWidth=5;ctx.stroke();ctx.save();ctx.beginPath();ctx.ellipse(s.x,s.y,w.rx-8,w.ry-8,0,0,Math.PI*2);ctx.clip();ctx.strokeStyle='rgba(220,245,250,.34)';ctx.lineWidth=3;const drift=(animationClock*18)%54;for(let yy=-w.ry-54;yy<w.ry+54;yy+=42){const wave=Math.sin(animationClock*1.8+yy*.03)*10;ctx.beginPath();ctx.moveTo(s.x-w.rx*.64+drift,s.y+yy+wave);ctx.lineTo(s.x-w.rx*.18+drift,s.y+yy+wave);ctx.stroke();ctx.beginPath();ctx.moveTo(s.x+w.rx*.02-drift,s.y+yy+18-wave);ctx.lineTo(s.x+w.rx*.5-drift,s.y+yy+18-wave);ctx.stroke();}ctx.restore();} 
  function drawFishingSpot(f){if(f.remaining<=0)return;const bob=Math.sin(animationClock*3+f.phase)*4,s=worldToScreen(f.x,f.y+bob);if(s.x<-70||s.y<-70||s.x>canvas.width+70||s.y>canvas.height+70)return;const d=FISH_TYPES[f.type];ctx.strokeStyle='rgba(233,249,255,.72)';ctx.lineWidth=3;for(let i=0;i<2;i++){ctx.beginPath();ctx.arc(s.x,s.y,12+i*11+Math.sin(animationClock*2+f.phase)*2,0,Math.PI*2);ctx.stroke();}ctx.fillStyle=d.color;ctx.beginPath();ctx.ellipse(s.x,s.y,8,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#223640';ctx.beginPath();ctx.moveTo(s.x+7,s.y);ctx.lineTo(s.x+14,s.y-6);ctx.lineTo(s.x+14,s.y+6);ctx.closePath();ctx.fill();if(activeFishingSpot===f){ctx.strokeStyle='#f0cc64';ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x,s.y,34,0,Math.PI*2);ctx.stroke();}}
  function drawTown(t){const s=worldToScreen(t.x,t.y);if(s.x<-100||s.y<-100||s.x>canvas.width+100||s.y>canvas.height+100)return;ctx.fillStyle='rgba(35,31,27,.2)';ctx.fillRect(s.x-54,s.y-38,108,76);ctx.strokeStyle='#e0d0a5';ctx.lineWidth=3;ctx.strokeRect(s.x-50,s.y-34,100,68);ctx.fillStyle='#b8895b';ctx.fillRect(s.x-25,s.y-17,50,34);ctx.fillStyle='#6b4c34';ctx.fillRect(s.x-6,s.y+1,12,16);ctx.fillStyle='#f0e9d2';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText(t.name,s.x,s.y-45);ctx.textAlign='start';}
  function drawTree(t){if(t.remaining<=0)return;const sway=Math.sin(animationClock*1.6+t.x*.01)*1.8+(activeTree===t?Math.sin(animationClock*12)*3:0);const s=worldToScreen(t.x+sway,t.y);if(s.x<-60||s.y<-90||s.x>canvas.width+60||s.y>canvas.height+60)return;const d=TREE_TYPES[t.type],scale=t.type==='redwood'?1.28:t.type==='mahogany'?1.12:1;ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(s.x-24*scale,s.y+22,48*scale,9);ctx.fillStyle=d.trunk;ctx.fillRect(s.x-7*scale,s.y-1,14*scale,34*scale);ctx.fillStyle=d.leaves;if(t.type==='arcticPine'){for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(s.x,s.y-55+i*17);ctx.lineTo(s.x-27*scale+i*2,s.y-10+i*14);ctx.lineTo(s.x+27*scale-i*2,s.y-10+i*14);ctx.closePath();ctx.fill();}}else{ctx.fillRect(s.x-25*scale,s.y-44,50*scale,35*scale);ctx.fillRect(s.x-17*scale,s.y-56,34*scale,20*scale);if(t.type==='cherry'){ctx.fillStyle='#e6a1a9';ctx.fillRect(s.x-18,s.y-49,7,7);ctx.fillRect(s.x+11,s.y-39,6,6);}}if(activeTree===t){ctx.strokeStyle='#f0cc64';ctx.lineWidth=3;ctx.strokeRect(s.x-31*scale,s.y-61,62*scale,96);}}
  function drawRock(r){if(r.hp<=0)return;const s=worldToScreen(r.x,r.y);if(s.x<-60||s.y<-60||s.x>canvas.width+60||s.y>canvas.height+60)return;const d=ROCK_TYPES[r.type],ratio=r.hp/r.maxHp,shake=activeRock===r?Math.sin(animationClock*15)*2:0;ctx.save();ctx.translate(s.x+shake,s.y);ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(-25,18,50,8);ctx.fillStyle=d.color;ctx.beginPath();ctx.moveTo(-24,15);ctx.lineTo(-18,-18);ctx.lineTo(2,-30);ctx.lineTo(24,-12);ctx.lineTo(28,15);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(30,35,40,.6)';ctx.lineWidth=2;if(ratio<.8){ctx.beginPath();ctx.moveTo(-4,-26);ctx.lineTo(2,-8);ctx.lineTo(-8,7);ctx.stroke();}if(ratio<.5){ctx.beginPath();ctx.moveTo(17,-13);ctx.lineTo(5,-1);ctx.lineTo(15,12);ctx.stroke();}if(activeRock===r){ctx.strokeStyle='#f0cc64';ctx.lineWidth=3;ctx.strokeRect(-32,-36,64,58);ctx.fillStyle='#1a2028';ctx.fillRect(-28,-44,56,6);ctx.fillStyle='#68c77e';ctx.fillRect(-28,-44,56*ratio,6);}ctx.restore();}
  function drawPlayer(){const working=activeTree||activeFishingSpot||activeRock;const bounce=working?Math.sin(animationClock*8)*2:0;const s=worldToScreen(state.player.x,state.player.y+bounce);ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(s.x-13,s.y+18,26,7);ctx.fillStyle='#20242a';ctx.fillRect(s.x-11,s.y-18,22,10);ctx.fillStyle='#d4a16e';ctx.fillRect(s.x-10,s.y-8,20,16);ctx.fillStyle='#537fc4';ctx.fillRect(s.x-13,s.y+8,26,25);const walking=Math.hypot(state.player.targetX-state.player.x,state.player.targetY-state.player.y)>3,step=walking&&Math.sin(animationClock*11)>0?3:0;ctx.fillStyle='#20262b';ctx.fillRect(s.x-11,s.y+33+step,8,18);ctx.fillRect(s.x+3,s.y+33-step,8,18);if(activeTree||activeRock){const swing=Math.sin(animationClock*8)*.65;ctx.save();ctx.translate(s.x+11,s.y+8);ctx.rotate(-.8+swing);ctx.strokeStyle=activeRock?'#7b8590':'#8a6540';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(21,-15);ctx.stroke();ctx.restore();}if(activeFishingSpot){const fs=worldToScreen(activeFishingSpot.x,activeFishingSpot.y);ctx.strokeStyle='#dbc68b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(s.x+12,s.y+8);ctx.quadraticCurveTo((s.x+fs.x)/2,s.y-28,fs.x,fs.y);ctx.stroke();ctx.fillStyle='#f1d267';ctx.fillRect(fs.x-2,fs.y-2,4,4);}}
  function drawAmbient(){
    const cycle=animationClock%18;
    if(cycle<7){const x=(animationClock*70)% (canvas.width+120)-60,y=70+Math.sin(animationClock*2)*18;ctx.fillStyle='rgba(245,245,235,.75)';ctx.fillRect(x,y,8,3);ctx.fillRect(x+8,y-3,7,3);}
    for(let i=0;i<3;i++){const x=(i*173+animationClock*17)%canvas.width,y=(i*97+animationClock*9)%canvas.height;ctx.fillStyle='rgba(240,210,90,.45)';ctx.fillRect(x,y,3,3);}
  }
  function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#397f9f';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='rgba(210,240,248,.22)';ctx.lineWidth=3;for(let y=-30+(animationClock*12)%46;y<canvas.height+40;y+=46){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y+10);ctx.stroke();}fillSmooth(continent,'#72ae61','#d5c68b',8);drawTileTexture(continent);for(const r of regions){fillSmooth(r.points,r.color);drawTileTexture(r.points);}for(const w of waters)drawWater(w);for(const f of fishingSpots)drawFishingSpot(f);for(const t of towns)drawTown(t);for(const t of trees)drawTree(t);for(const r of rocks)drawRock(r);drawAmbient();drawPlayer();for(const f of floaters){const s=worldToScreen(f.x,f.y);ctx.globalAlpha=Math.min(1,f.life*1.4);ctx.fillStyle='#fff4b8';ctx.strokeStyle='rgba(20,20,20,.8)';ctx.lineWidth=4;ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.strokeText(f.text,s.x,s.y);ctx.fillText(f.text,s.x,s.y);ctx.textAlign='start';ctx.globalAlpha=1;}}

  function openPanel(name){document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.panel===name));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===name));}
  function renderInventory(){const owned=Object.entries(state.inventory).filter(([k,q])=>q>0&&ITEM_DEFS[k]);ui.inventory.innerHTML=owned.length?`<div class="item-grid">${owned.map(([k,q])=>`<button class="item" data-item="${k}"><strong>${ITEM_DEFS[k].name}</strong><span>×${q}</span><small>${ITEM_DEFS[k].type}</small></button>`).join('')}</div>`:`<div class="empty-state"><strong>Your inventory is empty</strong><span>Gather logs, fish, or ore to fill it.</span></div>`;ui.inventory.querySelectorAll('[data-item]').forEach(b=>b.addEventListener('click',()=>showItem(b.dataset.item)));}
  function renderSkills(){
    ui.skills.innerHTML=`<div class="skill-grid">${Object.entries(SKILL_DEFS).map(([key,def])=>{const xp=state.skills[key]?.xp||0,level=levelFromXp(xp),progress=currentLevelProgress(xp);return `<button class="skill-card ${key==='woodcutting'?'active-skill':''}" data-skill="${key}"><strong>${def.name}</strong><span>Level ${level} · ${xp.toLocaleString()} XP</span><div class="progress-track"><div class="progress-fill" style="width:${progress*100}%"></div></div></button>`}).join('')}</div>`;
    ui.skills.querySelectorAll('[data-skill]').forEach(b=>b.addEventListener('click',()=>showSkill(b.dataset.skill)));
  }
  function showSkill(key){const def=SKILL_DEFS[key],xp=state.skills[key]?.xp||0,level=levelFromXp(xp),next=level>=100?xpForLevel(100):xpForLevel(level+1);selectedItemKey=null;ui.itemType.textContent='Skill';ui.itemName.textContent=def.name;ui.itemDescription.textContent=def.description;ui.itemStats.innerHTML=`<div><span>Level</span><strong>${level}${level>=100?' · MAX':''}</strong></div><div><span>Experience</span><strong>${xp.toLocaleString()} XP</strong></div>${level<100?`<div><span>Next level</span><strong>${Math.max(0,next-xp).toLocaleString()} XP</strong></div>`:''}`;ui.itemAction.hidden=true;ui.dialog.showModal();}
  function openTown(town){ui.townName.textContent=town.name;ui.townDescription.textContent=town.description;const services=[['NPCs','Talk to residents and receive quests.'],['Crafting Table','Create items from gathered materials.'],['Cooking Fire','Cook fish and meat into food.'],['Player-Owned Home','Enter and improve your family home.'],['Shop','Buy supplies and sell gathered items.'],['Bank','Store items outside your carried inventory.'],['Notice Board','View town work, requests, and local quests.'],['Inn','Rest, meet travellers, and hear local information.']];ui.townServices.innerHTML=services.map(([name,description])=>`<button class="town-service" data-service="${name}"><strong>${name}</strong><span>${description}</span></button>`).join('');ui.townServices.querySelectorAll('[data-service]').forEach(b=>b.addEventListener('click',()=>showToast(`${b.dataset.service} · coming in a future system update`)));ui.townDialog.showModal();ui.status.textContent=`Visiting ${town.name}`;ui.actionName.textContent='In town';}
  function renderEquipment(){const slots=[['head','Head'],['cape','Cape'],['body','Body'],['weapon','Weapon'],['shield','Shield'],['legs','Legs'],['boots','Boots'],['ring','Ring']];ui.equipment.innerHTML=`<div class="equipment-slots">${slots.map(([k,l])=>{const item=state.equipment[k]&&ITEM_DEFS[state.equipment[k]];return `<button class="slot ${item?'filled':''}" data-slot="${k}" ${item?'':'disabled'}><span>${l}</span><strong>${item?item.name:'Empty'}</strong></button>`}).join('')}</div>`;ui.equipment.querySelectorAll('.slot.filled').forEach(b=>b.addEventListener('click',()=>showItem(state.equipment[b.dataset.slot])));}
  function renderMapPanel(){
    ui.map.innerHTML='<canvas id="miniMapCanvas" width="360" height="360" aria-label="World minimap"></canvas>';
    drawMiniMap();
  }
  function drawMiniMap(){const mini=document.getElementById('miniMapCanvas');if(!mini)return;const m=mini.getContext('2d'),sx=mini.width/WORLD.width,sy=mini.height/WORLD.height;m.clearRect(0,0,mini.width,mini.height);m.fillStyle='#397f9f';m.fillRect(0,0,mini.width,mini.height);const poly=(pts,color)=>{m.beginPath();m.moveTo(pts[0][0]*sx,pts[0][1]*sy);for(const [x,y] of pts.slice(1))m.lineTo(x*sx,y*sy);m.closePath();m.fillStyle=color;m.fill();};poly(continent,'#72ae61');for(const r of regions)poly(r.points,r.color);for(const w of waters){m.beginPath();m.ellipse(w.x*sx,w.y*sy,w.rx*sx,w.ry*sy,0,0,Math.PI*2);m.fillStyle=w.color;m.fill();}for(const t of towns){m.fillStyle='#f0e9d2';m.fillRect(t.x*sx-2,t.y*sy-2,5,5);}m.fillStyle='#ffdf65';m.beginPath();m.arc(state.player.x*sx,state.player.y*sy,5,0,Math.PI*2);m.fill();m.strokeStyle='#1d232b';m.lineWidth=2;m.stroke();}

  function showItem(key){const item=ITEM_DEFS[key];if(!item)return;selectedItemKey=key;ui.itemType.textContent=item.type;ui.itemName.textContent=item.name;ui.itemDescription.textContent=item.description;const rows=[];if(item.uses)rows.push(['Used for',item.uses]);for(const [k,v] of Object.entries(item.stats||{}))rows.push([k,v]);ui.itemStats.innerHTML=rows.map(([k,v])=>`<div><span>${k}</span><strong>${v}</strong></div>`).join('');const equipped=Object.keys(state.equipment).find(s=>state.equipment[s]===key);if(item.slot&&state.inventory[key]>0){ui.itemAction.hidden=false;ui.itemAction.textContent=equipped?'Unequip':'Equip';}else ui.itemAction.hidden=true;ui.dialog.showModal();}
  function toggleSelectedEquipment(){const key=selectedItemKey,item=ITEM_DEFS[key];if(!item?.slot)return;const existing=Object.keys(state.equipment).find(s=>state.equipment[s]===key);if(existing)state.equipment[existing]=null;else state.equipment[item.slot]=key;ui.dialog.close();renderEquipment();saveGame(false);}
  function renderAll(){renderInventory();renderSkills();renderEquipment();renderMapPanel();}
  function frame(now){const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;update(dt);draw();requestAnimationFrame(frame);}

  canvas.addEventListener('pointerdown',handlePointer,{passive:false});document.getElementById('saveButton').addEventListener('click',()=>saveGame(true));document.getElementById('stopButton').addEventListener('click',()=>stopAction(true));document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>openPanel(t.dataset.panel)));document.getElementById('closeItemButton').addEventListener('click',()=>ui.dialog.close());document.getElementById('closeTownButton').addEventListener('click',()=>ui.townDialog.close());ui.itemAction.addEventListener('click',toggleSelectedEquipment);ui.dialog.addEventListener('click',e=>{if(e.target===ui.dialog)ui.dialog.close();});ui.townDialog.addEventListener('click',e=>{if(e.target===ui.townDialog)ui.townDialog.close();});document.getElementById('exportButton').addEventListener('click',()=>{saveGame(false);const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`idle-wanderer-save-${Date.now()}.json`;a.click();URL.revokeObjectURL(a.href);});document.getElementById('importInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(JSON.parse(await file.text())));location.reload();}catch{showToast('Invalid save file');}});document.getElementById('resetButton').addEventListener('click',()=>{if(confirm('Reset all progress on this device?')){localStorage.removeItem(SAVE_KEY);location.reload();}});window.addEventListener('pagehide',()=>saveGame(false));setInterval(()=>saveGame(false),15000);if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(console.error);
  camera.x=clamp(state.player.x-canvas.width/2,0,WORLD.width-canvas.width);camera.y=clamp(state.player.y-canvas.height/2,0,WORLD.height-canvas.height);renderAll();requestAnimationFrame(frame);
})();
