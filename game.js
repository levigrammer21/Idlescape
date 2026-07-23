(() => {
  'use strict';

  const VERSION = '0.24.0';
  const XP_RATE = 1.5;
  const SAVE_KEY = window.IdleCloud?.localSaveKey;
  if (!SAVE_KEY) throw new Error('No authenticated account save key is available.');
  const TICK_SECONDS = 0.6;
  const BASE_WORLD = { width: 3800, height: 4300 };
  const WORLD = { width: 6000, height: 6000 };
  const MAP_SCALE_X = WORLD.width / BASE_WORLD.width;
  const MAP_SCALE_Y = WORLD.height / BASE_WORLD.height;
  const mapX = value => Math.round(value * MAP_SCALE_X);
  const mapY = value => Math.round(value * MAP_SCALE_Y);
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const ui = {
    status: document.getElementById('statusText'), actionName: document.getElementById('actionName'),
    actionProgress: document.getElementById('actionProgress'), inventory: document.getElementById('inventory'),
    skills: document.getElementById('skills'), equipment: document.getElementById('equipment'), bestiary: document.getElementById('bestiary'),
    map: document.getElementById('map'), toast: document.getElementById('toast'), region: document.getElementById('regionText'),
    dialog: document.getElementById('itemDialog'), itemType: document.getElementById('itemType'), itemName: document.getElementById('itemName'),
    itemDescription: document.getElementById('itemDescription'), itemStats: document.getElementById('itemStats'), itemAction: document.getElementById('itemActionButton'),
    townDialog: document.getElementById('townDialog'), townName: document.getElementById('townName'), townDescription: document.getElementById('townDescription'), townServices: document.getElementById('townServices'),
    craftingDialog: document.getElementById('craftingDialog'), craftingTownName: document.getElementById('craftingTownName'), craftingLevel: document.getElementById('craftingLevel'), craftingRecipes: document.getElementById('craftingRecipes'),
    combatHp: document.getElementById('combatHp'), combatHpFill: document.getElementById('combatHpFill'), eatButton: document.getElementById('eatButton'), eatCount: document.getElementById('eatCount'),
    coinCount: document.getElementById('coinCount'), autoMode: document.getElementById('autoMode'), autoBadge: document.getElementById('autoBadge'),
    offlineDialog: document.getElementById('offlineDialog'), offlineTime: document.getElementById('offlineTime'), offlineResults: document.getElementById('offlineResults'),
    defeatDialog: document.getElementById('defeatDialog'), defeatMessage: document.getElementById('defeatMessage'), defeatCount: document.getElementById('defeatCount'),
    leaderboards: document.getElementById('leaderboards'), leaderboardProfileDialog: document.getElementById('leaderboardProfileDialog'), leaderboardProfileName: document.getElementById('leaderboardProfileName'), leaderboardProfileContent: document.getElementById('leaderboardProfileContent'),
    familyWorldHud: document.getElementById('familyWorldHud'), onlineCount: document.getElementById('onlineCount'), onlinePlayers: document.getElementById('onlinePlayers'), familyWorldToggle: document.getElementById('familyWorldToggle'),
    serviceDialog: document.getElementById('serviceDialog'), serviceType: document.getElementById('serviceType'), serviceTitle: document.getElementById('serviceTitle'), serviceDescription: document.getElementById('serviceDescription'), serviceContent: document.getElementById('serviceContent')
  };

  const TREE_TYPES = {
    cedar: { name: 'Cedar', level: 1, ticks: 3, xp: 8, log: 'cedarLog', trunk: '#6f4a2e', leaves: '#3f8051', respawn: 16, capacity: [12, 18] },
    oak: { name: 'Oak', level: 10, ticks: 5, xp: 18, log: 'oakLog', trunk: '#694528', leaves: '#477944', respawn: 22, capacity: [11, 16] },
    willow: { name: 'Willow', level: 20, ticks: 7, xp: 32, log: 'willowLog', trunk: '#806044', leaves: '#67915b', respawn: 28, capacity: [10, 15] },
    beech: { name: 'Beech', level: 30, ticks: 9, xp: 55, log: 'beechLog', trunk: '#76513c', leaves: '#8b9851', respawn: 34, capacity: [9, 14] },
    cherry: { name: 'Cherry', level: 40, ticks: 12, xp: 90, log: 'cherryLog', trunk: '#6e3e37', leaves: '#b86f77', respawn: 42, capacity: [9, 14] },
    arcticPine: { name: 'Arctic Pine', level: 50, ticks: 16, xp: 140, log: 'arcticPineLog', trunk: '#765a40', leaves: '#6f9c8a', respawn: 50, capacity: [8, 12] },
    mahogany: { name: 'Mahogany', level: 60, ticks: 18, xp: 175, log: 'mahoganyLog', trunk: '#733c2c', leaves: '#38714c', respawn: 58, capacity: [8, 11] },
    redwood: { name: 'Redwood', level: 70, ticks: 20, xp: 220, log: 'redwoodLog', trunk: '#713b2a', leaves: '#2f6542', respawn: 68, capacity: [7, 10] }
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
    stone: { name: 'Stone', level: 1, ticks: 3, xp: 8, item: 'stone', color: '#8c9299', respawn: 16, hp: 22 },
    copper: { name: 'Copper', level: 10, ticks: 5, xp: 18, item: 'copperOre', color: '#b9784f', respawn: 22, hp: 12 },
    iron: { name: 'Iron', level: 20, ticks: 7, xp: 32, item: 'ironOre', color: '#6f7782', respawn: 28, hp: 14 },
    coal: { name: 'Coal', level: 30, ticks: 9, xp: 55, item: 'coal', color: '#34383e', respawn: 34, hp: 16 },
    silver: { name: 'Silver', level: 40, ticks: 12, xp: 90, item: 'silverOre', color: '#c4ccd2', respawn: 42, hp: 18 },
    pyrite: { name: 'Pyrite', level: 50, ticks: 16, xp: 140, item: 'pyriteOre', color: '#c59d39', respawn: 50, hp: 20 },
    gold: { name: 'Gold', level: 60, ticks: 18, xp: 175, item: 'goldOre', color: '#d4b33f', respawn: 58, hp: 10 },
    crystal: { name: 'Crystal', level: 70, ticks: 20, xp: 220, item: 'crystal', color: '#8ed7e8', respawn: 68, hp: 24 }
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
    club: { name: 'Crude Club', type: 'Weapon', description: 'A rough club carried over from the earlier test build.', slot: 'weapon', stats: { 'Attack speed': '4 ticks · 2.4 seconds', 'Accuracy': '+3', 'Strength': '+2' } },
    clothShirt: { name: 'Cloth Shirt', type: 'Body armour', description: 'Basic cloth armour carried over from the earlier test build.', slot: 'body', stats: { 'Defence': '+1', 'Weight': 'Light' } }
  };


  const CRAFTING_TIERS = [
    { key: 'stone', name: 'Stone', level: 1, material: 'stone', bar: null, log: 'cedarLog', toolTier: 1, speed: 0, accuracy: 2, strength: 1, defence: 1 },
    { key: 'copper', name: 'Copper', level: 10, material: 'copperBar', ore: 'copperOre', bar: 'copperBar', log: 'oakLog', toolTier: 2, speed: 5, accuracy: 4, strength: 2, defence: 2 },
    { key: 'iron', name: 'Iron', level: 20, material: 'ironBar', ore: 'ironOre', bar: 'ironBar', log: 'willowLog', toolTier: 3, speed: 10, accuracy: 7, strength: 4, defence: 4 },
    { key: 'silver', name: 'Silver', level: 40, material: 'silverBar', ore: 'silverOre', bar: 'silverBar', log: 'cherryLog', toolTier: 4, speed: 15, accuracy: 10, strength: 6, defence: 6 },
    { key: 'pyrite', name: 'Pyrite', level: 50, material: 'pyriteBar', ore: 'pyriteOre', bar: 'pyriteBar', log: 'arcticPineLog', toolTier: 5, speed: 20, accuracy: 13, strength: 8, defence: 8 },
    { key: 'gold', name: 'Gold', level: 60, material: 'goldBar', ore: 'goldOre', bar: 'goldBar', log: 'mahoganyLog', toolTier: 6, speed: 25, accuracy: 16, strength: 10, defence: 10 },
    { key: 'crystal', name: 'Crystal', level: 70, material: 'crystalBar', ore: 'crystal', bar: 'crystalBar', log: 'redwoodLog', toolTier: 7, speed: 30, accuracy: 20, strength: 13, defence: 13 }
  ];

  const BOW_TIERS = [
    ['cedar', 'Cedar', 1, 'cedarLog', 4, 1], ['oak', 'Oak', 10, 'oakLog', 5, 2],
    ['willow', 'Willow', 20, 'willowLog', 6, 4], ['beech', 'Beech', 30, 'beechLog', 6, 6],
    ['cherry', 'Cherry', 40, 'cherryLog', 7, 8], ['arcticPine', 'Arctic Pine', 50, 'arcticPineLog', 7, 10],
    ['mahogany', 'Mahogany', 60, 'mahoganyLog', 8, 12], ['redwood', 'Redwood', 70, 'redwoodLog', 8, 15]
  ];

  const RECIPES = [];
  function addRecipe(recipe){ RECIPES.push(recipe); }
  function defineItem(key, definition){ if(!ITEM_DEFS[key]) ITEM_DEFS[key]=definition; }

  defineItem('stoneBlock', { name:'Stone Block', type:'Crafting material', description:'A squared block made from common stone.', uses:'Future Construction · Stone equipment' });
  addRecipe({ id:'stoneBlock', category:'Materials', level:1, output:'stoneBlock', amount:1, xp:6, materials:{stone:2} });

  for(const tier of CRAFTING_TIERS){
    if(tier.bar){
      defineItem(tier.bar, { name:`${tier.name} Bar`, type:'Refined material', description:`A refined ${tier.name.toLowerCase()} bar ready for tools, weapons, and armour.`, uses:'Crafting · Equipment' });
      addRecipe({ id:tier.bar, category:'Materials', level:tier.level, output:tier.bar, amount:1, xp:Math.max(12,tier.level*2), materials:{[tier.ore]:1} });
    }
    const mat=tier.material;
    const axeKey=tier.key==='stone'?'stoneAxe':`${tier.key}Axe`;
    const pickKey=tier.key==='stone'?'stonePickaxe':`${tier.key}Pickaxe`;
    defineItem(axeKey, { name:`${tier.name} Axe`, type:'Woodcutting tool', description:`A ${tier.name.toLowerCase()} axe. The best usable axe in your inventory is used automatically.`, tool:'axe', toolTier:tier.toolTier, requiredSkillLevel:tier.level, speedBonus:tier.speed, stats:{Skill:'Woodcutting','Required level':String(tier.level),'Speed bonus':`+${tier.speed}%`} });
    defineItem(pickKey, { name:`${tier.name} Pickaxe`, type:'Mining tool', description:`A ${tier.name.toLowerCase()} pickaxe. The best usable pickaxe in your inventory is used automatically.`, tool:'pickaxe', toolTier:tier.toolTier, requiredSkillLevel:tier.level, speedBonus:tier.speed, stats:{Skill:'Mining','Required level':String(tier.level),'Speed bonus':`+${tier.speed}%`} });
    const toolMaterials=tier.key==='stone'?{stone:2,cedarLog:1}:{[mat]:2,[tier.log]:1};
    addRecipe({id:axeKey,category:'Tools',level:tier.level,output:axeKey,amount:1,xp:Math.max(10,tier.level*3),materials:toolMaterials});
    addRecipe({id:pickKey,category:'Tools',level:tier.level,output:pickKey,amount:1,xp:Math.max(10,tier.level*3),materials:toolMaterials});

    const weaponFamilies=[
      ['Dagger',2,0,0,1],
      ['Sword',4,2,2,2],
      ['Spear',5,4,4,2],
      ['Warhammer',6,1,7,3]
    ];
    for(const [label,ticks,accuracyBonus,strengthBonus,materialCount] of weaponFamilies){
      const key=`${tier.key}${label}`;
      const weaponClass=label.toLowerCase();
      defineItem(key,{name:`${tier.name} ${label}`,type:'Weapon',description:`A ${ticks<=2?'very fast':ticks>=6?'slow, crushing':'balanced'} ${tier.name.toLowerCase()} ${weaponClass}. Faster weapons strike often; slower weapons deliver heavier hits.`,slot:'weapon',weaponClass,stats:{'Attack speed':`${ticks} ticks · ${(ticks*TICK_SECONDS).toFixed(1)} seconds`,'Accuracy':`+${tier.accuracy+accuracyBonus}`,'Strength':`+${tier.strength+strengthBonus}`}});
      const materials=tier.key==='stone'?{stone:materialCount+1,cedarLog:1}:{[mat]:materialCount,[tier.log]:1};
      addRecipe({id:key,category:'Weapons',level:tier.level,output:key,amount:1,xp:Math.max(8,tier.level*(materialCount+1)),materials});
    }

    const armor=[['Helmet','head',2],['Body','body',5],['Legs','legs',4],['Boots','boots',2],['Shield','shield',3]];
    for(const [label,slot,count] of armor){
      const key=`${tier.key}${label}`;
      defineItem(key,{name:`${tier.name} ${label}`,type:`${label} armour`,description:`Protective ${tier.name.toLowerCase()} ${label.toLowerCase()}.`,slot,stats:{Defence:`+${tier.defence + Math.max(0,count-2)}`,Weight:tier.key==='stone'?'Heavy':'Medium'}});
      const materials=tier.key==='stone'?{stone:count}:{[mat]:count};
      if(label==='Shield') materials[tier.log]=1;
      addRecipe({id:key,category:'Armour',level:tier.level,output:key,amount:1,xp:Math.max(10,tier.level*count),materials});
    }
  }

  defineItem('basicFishingRod', ITEM_DEFS.basicFishingRod);
  addRecipe({id:'basicFishingRod',category:'Tools',level:1,output:'basicFishingRod',amount:1,xp:10,materials:{cedarLog:2}});

  for(const [key,name,level,log,_ticks,strength] of BOW_TIERS){
    const shortKey=`${key}Shortbow`, longKey=`${key}Longbow`, slingKey=`${key}Sling`;
    defineItem(shortKey,{name:`${name} Shortbow`,type:'Ranged weapon',description:`A quick ${name.toLowerCase()} shortbow with a compact firing arc.`,slot:'weapon',weaponClass:'shortbow',projectile:'arrow',stats:{'Attack speed':'3 ticks · 1.8 seconds','Ranged accuracy':`+${strength+3}`,'Ranged strength':`+${strength}`,'Range':'3 tiles'}});
    defineItem(longKey,{name:`${name} Longbow`,type:'Ranged weapon',description:`A deliberate ${name.toLowerCase()} longbow that trades speed for range and heavier arrows.`,slot:'weapon',weaponClass:'longbow',projectile:'heavyArrow',stats:{'Attack speed':'5 ticks · 3.0 seconds','Ranged accuracy':`+${strength+6}`,'Ranged strength':`+${strength+4}`,'Range':'4 tiles'}});
    defineItem(slingKey,{name:`${name} Sling`,type:'Ranged weapon',description:`A very fast sling that launches small stones along a curved path.`,slot:'weapon',weaponClass:'sling',projectile:'stone',stats:{'Attack speed':'2 ticks · 1.2 seconds','Ranged accuracy':`+${strength+1}`,'Ranged strength':`+${Math.max(1,strength-1)}`,'Range':'2.5 tiles'}});
    addRecipe({id:shortKey,category:'Weapons',level,output:shortKey,amount:1,xp:Math.max(10,level*3),materials:{[log]:2}});
    addRecipe({id:longKey,category:'Weapons',level,output:longKey,amount:1,xp:Math.max(14,level*4),materials:{[log]:3}});
    addRecipe({id:slingKey,category:'Weapons',level,output:slingKey,amount:1,xp:Math.max(8,level*2),materials:{[log]:1,stone:1}});
    // Preserve existing bow IDs and convert them into balanced recurve bows.
    const oldKey=`${key}Bow`;
    defineItem(oldKey,{name:`${name} Recurve Bow`,type:'Ranged weapon',description:`A balanced ${name.toLowerCase()} recurve bow.`,slot:'weapon',weaponClass:'recurve',projectile:'arrow',stats:{'Attack speed':'4 ticks · 2.4 seconds','Ranged accuracy':`+${strength+4}`,'Ranged strength':`+${strength+2}`,'Range':'3.5 tiles'}});
  }

  defineItem('temperingShard',{name:'Tempering Shard',type:'Upgrade material',description:'A dense creature-forged shard used for the final stage of town equipment upgrades.',uses:'Town Forge · +3 equipment'});

  // Light armour families use creature materials and favour mobility and ranged accuracy.
  const LIGHT_ARMOUR_SETS=[
    ['hide','Hide',5,'animalHide',1],['scaled','Scaled',30,'crocodileHide',3],['jaguar','Jaguar',45,'jaguarHide',5],['frozen','Frozen Hide',55,'frozenHide',7]
  ];
  for(const [prefix,name,level,material,defence] of LIGHT_ARMOUR_SETS){
    for(const [label,slot,count] of [['Hood','head',2],['Vest','body',4],['Chaps','legs',3],['Boots','boots',2]]){
      const key=`${prefix}${label}`;
      defineItem(key,{name:`${name} ${label}`,type:'Light armour',description:`Light ${name.toLowerCase()} armour offering modest protection and improved ranged handling.`,slot,stats:{Defence:`+${defence+Math.max(0,count-2)}`,'Ranged accuracy':`+${Math.max(1,Math.floor(defence/2))}`,Weight:'Light'}});
      addRecipe({id:key,category:'Armour',level,output:key,amount:1,xp:Math.max(12,level*count),materials:{[material]:count}});
    }
  }


  defineItem('coins',{name:'Coins',type:'Currency',description:'Used in shops and to improve your player-owned home.',stats:{Currency:'Family world coins'}});
  const COOKING_DATA = {
    rawMinnow:{cooked:'cookedMinnow',name:'Cooked Minnow',level:1,xp:8,ticks:1.5,heal:2},
    ratMeat:{cooked:'cookedRat',name:'Cooked Rat',level:5,xp:12,ticks:2,heal:5},
    rawRabbit:{cooked:'cookedRabbit',name:'Cooked Rabbit',level:1,xp:10,ticks:2,heal:4},
    rawCrappie:{cooked:'cookedCrappie',name:'Cooked Crappie',level:10,xp:18,ticks:2.5,heal:4},
    rawVenison:{cooked:'cookedVenison',name:'Cooked Venison',level:10,xp:20,ticks:3,heal:7},
    rawPork:{cooked:'cookedPork',name:'Cooked Pork',level:15,xp:26,ticks:3.5,heal:9},
    rawBass:{cooked:'cookedBass',name:'Cooked Bass',level:20,xp:32,ticks:3.5,heal:7},
    wolfMeat:{cooked:'cookedWolfMeat',name:'Cooked Wolf Meat',level:20,xp:35,ticks:4,heal:11},
    scorpionMeat:{cooked:'cookedScorpion',name:'Cooked Scorpion',level:25,xp:44,ticks:4.5,heal:12},
    rawCatfish:{cooked:'cookedCatfish',name:'Cooked Catfish',level:30,xp:55,ticks:4.5,heal:10},
    crocodileMeat:{cooked:'cookedCrocodile',name:'Cooked Crocodile',level:30,xp:58,ticks:5,heal:15},
    serpentMeat:{cooked:'cookedSerpent',name:'Cooked Serpent',level:35,xp:70,ticks:5.5,heal:16},
    snakeMeat:{cooked:'cookedSnake',name:'Cooked Snake',level:35,xp:72,ticks:5.5,heal:17},
    rawTuna:{cooked:'cookedTuna',name:'Cooked Tuna',level:40,xp:90,ticks:6,heal:14},
    jaguarMeat:{cooked:'cookedJaguar',name:'Cooked Jaguar',level:40,xp:95,ticks:6.5,heal:20},
    rawGrouper:{cooked:'cookedGrouper',name:'Cooked Grouper',level:50,xp:140,ticks:8,heal:18},
    gorillaMeat:{cooked:'cookedGorilla',name:'Cooked Gorilla',level:50,xp:145,ticks:8,heal:25},
    frozenMeat:{cooked:'cookedFrozenMeat',name:'Cooked Frozen Meat',level:55,xp:175,ticks:9,heal:28},
    rawShark:{cooked:'cookedShark',name:'Cooked Shark',level:70,xp:220,ticks:10,heal:25},
    dragonMeat:{cooked:'cookedDragonMeat',name:'Cooked Dragon Meat',level:70,xp:260,ticks:12,heal:40}
  };
  const COMBAT_ITEM_DEFS = {
    rawRabbit:['Raw Rabbit','Raw meat','Fresh rabbit meat. Cook it at a town fire.'], rabbitFoot:['Rabbit Foot','Rare combat drop','A lucky foot dropped very rarely by rabbits. It can be crafted into equipment.'],
    ratMeat:['Rat Meat','Raw meat','Questionable meat from a giant rat. It can still be cooked.'], ratTail:['Rat Tail','Rare combat drop','A long tail prized by unusual collectors.'],
    rawVenison:['Raw Venison','Raw meat','Lean meat from a deer.'], animalHide:['Animal Hide','Combat material','A basic hide useful for future leather crafting.'], antler:['Antler','Rare combat drop','A well-shaped deer antler.'],
    rawPork:['Raw Pork','Raw meat','A thick cut from a wild boar.'], boarTusk:['Boar Tusk','Rare combat drop','A heavy curved tusk.'],
    wolfMeat:['Wolf Meat','Raw meat','Tough meat from a wolf.'], wolfFang:['Wolf Fang','Rare combat drop','A sharp wolf fang.'],
    clothScrap:['Cloth Scrap','Combat material','Rough cloth taken from a bandit.'], banditDagger:['Bandit Dagger','Weapon','A quick dagger taken from a bandit.',{slot:'weapon',stats:{'Attack speed':'3 ticks · 1.8 seconds','Accuracy':'+9','Strength':'+5'}}],
    bones:['Bones','Combat material','Ordinary bones.'], ancientBone:['Ancient Bone','Rare combat drop','A bone darkened by age and strange energy. It can be crafted into equipment.'],
    spiritResidue:['Spirit Residue','Combat material','Cold residue left behind by a wraith.'], wraithCloth:['Wraith Cloth','Rare combat drop','A nearly weightless strip of spectral cloth. It can be crafted into equipment.'],
    scorpionMeat:['Scorpion Meat','Raw meat','Edible once carefully cooked.'], venomGland:['Venom Gland','Rare combat drop','A gland containing potent venom.'],
    serpentMeat:['Serpent Meat','Raw meat','A long cut of desert serpent meat.'], serpentScale:['Serpent Scale','Combat material','A durable scale from a large serpent.'], sandFang:['Sand Fang','Rare combat drop','A fang polished by desert sand.'],
    golemCore:['Golem Core','Rare combat drop','The compact core that animated a sand golem. It can be crafted into equipment.'], slimeGel:['Slime Gel','Combat material','Sticky gel from a bog slime.'], clearGel:['Clear Gel','Rare combat drop','An unusually pure glob of slime gel.'],
    crocodileMeat:['Crocodile Meat','Raw meat','Dense meat from a swamp crocodile.'], crocodileHide:['Crocodile Hide','Combat material','Thick scaled hide.'], crocodileTooth:['Crocodile Tooth','Rare combat drop','A large crocodile tooth.'],
    murkyHide:['Murky Hide','Combat material','Dark hide from a marsh lurker.'], lurkerEye:['Lurker Eye','Rare combat drop','The unsettling eye of a marsh lurker.'],
    spiderSilk:['Spider Silk','Combat material','Strong silk from a jungle spider.'], venomSac:['Venom Sac','Rare combat drop','A full venom sac.'],
    snakeMeat:['Snake Meat','Raw meat','Fresh jungle snake meat.'], venomFang:['Venom Fang','Rare combat drop','A venom-coated jungle fang.'],
    jaguarMeat:['Jaguar Meat','Raw meat','Rich meat from a jungle jaguar.'], jaguarHide:['Jaguar Hide','Combat material','A patterned hide.'], jaguarClaw:['Jaguar Claw','Rare combat drop','A razor-sharp claw. It can be crafted into equipment.'],
    gorillaMeat:['Gorilla Meat','Raw meat','A large heavy cut of meat.'], gorillaKnuckle:['Gorilla Knuckle','Rare combat drop','A massive knuckle bone.'],
    frozenMeat:['Frozen Meat','Raw meat','Meat preserved by the northern cold.'], frozenHide:['Frozen Hide','Combat material','A hide hardened by ice.'], iceFang:['Ice Fang','Rare combat drop','A fang that remains freezing cold. It can be crafted into equipment.'],
    trollClub:['Troll Club','Weapon','A huge crude club dropped by a frost troll.',{slot:'weapon',stats:{'Attack speed':'6 ticks · 3.6 seconds','Accuracy':'+18','Strength':'+20'}}],
    dragonMeat:['Dragon Meat','Raw meat','Extremely valuable meat from a frost dragon.'], frostScale:['Frost Scale','Rare combat drop','A pale scale carrying deep frost magic. It can be crafted into equipment.'], frozenHeart:['Frozen Heart','Rare combat drop','The impossibly cold heart of a frost dragon. It can be crafted into equipment.']
  };
  for(const [key,data] of Object.entries(COMBAT_ITEM_DEFS)){
    const [name,type,description,extra={}] = data; defineItem(key,{name,type,description,...extra});
  }


  // Rare creature drops are crafting materials, not equipment by themselves.
  const UNIQUE_EQUIPMENT_RECIPES = [
    {id:'luckyFootRing',level:5,xp:25,materials:{rabbitFoot:1,copperBar:1},definition:{name:'Lucky Foot Ring',type:'Unique ring',description:'A copper ring carrying a lucky rabbit-foot charm. While equipped it grants 5% bonus Woodcutting XP.',slot:'ring',bonuses:{woodcuttingXp:0.05},stats:{Defence:'+1','Woodcutting XP':'+5%',Rarity:'Unique'}}},
    {id:'antlerSpear',level:15,xp:55,materials:{antler:1,copperBar:2,oakLog:1},definition:{name:'Antler Spear',type:'Unique weapon',description:'A quick hunting spear tipped and reinforced with a deer antler.',slot:'weapon',stats:{'Attack speed':'3 ticks · 1.8 seconds','Accuracy':'+9','Strength':'+6',Rarity:'Unique'}}},
    {id:'wolfFangDagger',level:22,xp:75,materials:{wolfFang:1,ironBar:1,willowLog:1},definition:{name:'Wolf Fang Dagger',type:'Unique weapon',description:'A precise dagger built around a sharpened wolf fang.',slot:'weapon',stats:{'Attack speed':'3 ticks · 1.8 seconds','Accuracy':'+15','Strength':'+8',Rarity:'Unique'}}},
    {id:'ancientBoneBlade',level:25,xp:85,materials:{ancientBone:1,ironBar:1,willowLog:1},definition:{name:'Ancient Bone Blade',type:'Unique weapon',description:'A darkened ancient bone shaped into a heavy ritual blade.',slot:'weapon',stats:{'Attack speed':'5 ticks · 3.0 seconds','Accuracy':'+12','Strength':'+12',Rarity:'Unique'}}},
    {id:'venomDagger',level:30,xp:100,materials:{venomGland:1,silverBar:1,beechLog:1},definition:{name:'Venom Dagger',type:'Unique weapon',description:'A fast dagger fitted with a sealed venom gland. Its poison effect will activate when status effects are introduced.',slot:'weapon',stats:{'Attack speed':'3 ticks · 1.8 seconds','Accuracy':'+17','Strength':'+10',Rarity:'Unique'}}},
    {id:'wraithCloak',level:35,xp:120,materials:{wraithCloth:1,clothScrap:3,silverBar:1},definition:{name:'Wraith Cloak',type:'Unique cape',description:'A nearly weightless cloak woven from spectral cloth.',slot:'cape',stats:{Defence:'+7',Weight:'Weightless',Rarity:'Unique'}}},
    {id:'crocodileShield',level:38,xp:135,materials:{crocodileTooth:1,crocodileHide:2,silverBar:2},definition:{name:'Crocodile Shield',type:'Unique shield',description:'A broad shield faced with dense crocodile hide and a reinforced tooth boss.',slot:'shield',stats:{Defence:'+10',Weight:'Heavy',Rarity:'Unique'}}},
    {id:'golemCoreShield',level:42,xp:155,materials:{golemCore:1,stoneBlock:4,goldBar:1},definition:{name:'Golem Core Shield',type:'Unique shield',description:'A reinforced shield powered by the core of a sand golem.',slot:'shield',stats:{Defence:'+12',Weight:'Heavy',Rarity:'Unique'}}},
    {id:'jaguarBoots',level:45,xp:180,materials:{jaguarClaw:1,jaguarHide:2,pyriteBar:1},definition:{name:'Jaguar Boots',type:'Unique boots',description:'Light boots made from jaguar hide. While equipped they increase movement speed by 8%.',slot:'boots',bonuses:{moveSpeed:0.08},stats:{Defence:'+6','Movement speed':'+8%',Weight:'Light',Rarity:'Unique'}}},
    {id:'jaguarClawDagger',level:48,xp:195,materials:{jaguarClaw:1,pyriteBar:1,mahoganyLog:1},definition:{name:'Jaguar Claw Dagger',type:'Unique weapon',description:'A swift dagger built around a razor-sharp jaguar claw.',slot:'weapon',stats:{'Attack speed':'3 ticks · 1.8 seconds','Accuracy':'+22','Strength':'+14',Rarity:'Unique'}}},
    {id:'iceFangSword',level:55,xp:240,materials:{iceFang:1,goldBar:2,arcticPineLog:1},definition:{name:'Ice Fang Sword',type:'Unique weapon',description:'A cold-edged sword built around a fang that never thaws.',slot:'weapon',stats:{'Attack speed':'4 ticks · 2.4 seconds','Accuracy':'+25','Strength':'+20',Rarity:'Unique'}}},
    {id:'frostscaleBody',level:70,xp:360,materials:{frostScale:2,crystalBar:4,redwoodLog:2},definition:{name:'Frostscale Body',type:'Unique body armour',description:'Masterwork armour plated with frost-dragon scales.',slot:'body',stats:{Defence:'+24',Weight:'Medium',Rarity:'Unique'}}},
    {id:'frostscaleShield',level:70,xp:350,materials:{frostScale:1,crystalBar:2,redwoodLog:1},definition:{name:'Frostscale Shield',type:'Unique shield',description:'A crystal-backed shield faced with a deep-frozen dragon scale.',slot:'shield',stats:{Defence:'+19',Weight:'Medium',Rarity:'Unique'}}},
    {id:'frozenHeartRing',level:75,xp:430,materials:{frozenHeart:1,crystalBar:2,goldBar:2},definition:{name:'Frozen Heart Ring',type:'Unique ring',description:'A masterwork ring containing a fragment of an impossibly cold heart.',slot:'ring',stats:{Defence:'+13',Rarity:'Unique'}}}
  ];
  for(const recipe of UNIQUE_EQUIPMENT_RECIPES){
    defineItem(recipe.id,recipe.definition);
    addRecipe({id:recipe.id,category:'Unique Equipment',level:recipe.level,output:recipe.id,amount:1,xp:recipe.xp,materials:recipe.materials});
  }
  for(const [raw,d] of Object.entries(COOKING_DATA)) defineItem(d.cooked,{name:d.name,type:'Cooked food',description:`A properly cooked ${d.name.replace('Cooked ','').toLowerCase()}.`,slot:'food',heal:d.heal,stats:{'Cooking level':String(d.level),'Healing':`${d.heal} HP`}});


  // Companion provisions give otherwise-overlooked creature materials a lasting purpose.
  defineItem('spiritFeast',{name:'Spirit Feast',type:'Companion provision',description:'A hearty ritual meal prepared from cooked food and creature materials. It is stored directly in the Companion Food Box.',foodEnergy:30,uses:'Companion Food Box · 30 food energy',stats:{'Food energy':'30 minutes'}});
  const COMPANION_PROVISION_MATERIALS=[
    ['ratTail',5],['boarTusk',12],['bones',15],['spiritResidue',35],['serpentScale',35],['sandFang',40],
    ['slimeGel',25],['clearGel',35],['murkyHide',45],['lurkerEye',50],['spiderSilk',40],['venomSac',45],
    ['venomFang',50],['gorillaKnuckle',60]
  ];
  for(const [material,level] of COMPANION_PROVISION_MATERIALS){
    if(!ITEM_DEFS[material])continue;
    addRecipe({id:`spiritFeast_${material}`,category:'Companion Provisions',level,output:'spiritFeast',amount:1,xp:Math.max(15,level*2),materials:{[material]:1,cookedMinnow:1}});
  }

  function appendItemUse(item,text){
    const parts=String(item.uses||'').split(' · ').map(x=>x.trim()).filter(x=>x&&!/^Future/i.test(x));
    if(text&&!parts.includes(text))parts.push(text);
    item.uses=parts.join(' · ');
  }
  function finalizeItemUses(){
    const ingredientRecipes=new Map();
    for(const recipe of RECIPES){
      for(const key of Object.keys(recipe.materials||{})){
        if(!ingredientRecipes.has(key))ingredientRecipes.set(key,[]);
        ingredientRecipes.get(key).push(ITEM_DEFS[recipe.output]?.name||recipe.output);
      }
    }
    for(const [key,item] of Object.entries(ITEM_DEFS)){
      if(item.heal){item.foodEnergy=item.heal;appendItemUse(item,`Heal player · Companion Food Box (${item.heal} energy)`);}
      if(item.foodEnergy&&!item.heal)appendItemUse(item,`Companion Food Box (${item.foodEnergy} energy)`);
      if(item.summonType)appendItemUse(item,'Unlock and summon companion');
      if(item.slot&&item.slot!=='food')appendItemUse(item,'Equip · Forge upgrades');
      if(item.tool)appendItemUse(item,'Automatic gathering tool');
      const outputs=ingredientRecipes.get(key)||[];
      if(outputs.length)appendItemUse(item,`Crafting: ${[...new Set(outputs)].slice(0,3).join(', ')}${outputs.length>3?'…':''}`);
      if(!item.uses&&key!=='coins')item.uses='Trade · Town requests';
    }
  }
  finalizeItemUses();

  const UPGRADE_SUFFIX='__u';
  function equipmentUpgradeLevel(key){const match=String(key||'').match(/__u([1-3])$/);return match?Number(match[1]):0;}
  function equipmentBaseKey(key){return String(key||'').replace(/__u[1-3]$/,'');}
  function numericStat(value){return parseInt(String(value||'0').replace(/[^-\d]/g,''))||0;}
  function registerEquipmentUpgrades(){
    const baseEntries=Object.entries(ITEM_DEFS).filter(([,item])=>item?.slot&&item.slot!=='food'&&!item.summonType);
    for(const [baseKey,base] of baseEntries){
      for(let level=1;level<=3;level++){
        const key=`${baseKey}${UPGRADE_SUFFIX}${level}`,stats={...(base.stats||{})};
        if('Accuracy' in stats)stats.Accuracy=`+${numericStat(stats.Accuracy)+level*2}`;
        if('Strength' in stats)stats.Strength=`+${numericStat(stats.Strength)+level*2}`;
        if('Ranged accuracy' in stats)stats['Ranged accuracy']=`+${numericStat(stats['Ranged accuracy'])+level*2}`;
        if('Ranged strength' in stats)stats['Ranged strength']=`+${numericStat(stats['Ranged strength'])+level*2}`;
        if('Defence' in stats)stats.Defence=`+${numericStat(stats.Defence)+level*2}`;
        stats.Upgrade=`+${level}`;
        ITEM_DEFS[key]={...base,name:`${base.name} +${level}`,description:`${base.description} Improved at a town forge.`,stats,upgradeLevel:level,baseItemKey:baseKey};
      }
    }
  }
  registerEquipmentUpgrades();

  const TOWN_NPCS = {
    'Starting Town':[
      {name:'Mira',role:'Wanderer Guide',color:'#d99162',offsetX:-86,offsetY:62,intro:'Welcome to Idle Wanderer. Start close to town: cedar trees, stone rocks, minnows, rabbits, and rats are all meant for new wanderers.',dialog:'Tap a resource to walk to it and begin gathering. Your starter axe, pickaxe, and fishing rod work from your inventory, so you do not need to equip them. Skills unlock stronger resources as they level. The notice board and each resident can offer a daily request.'},
      {name:'Elias',role:'Spirit Caller',color:'#7a70b8',offsetX:88,offsetY:58,intro:'Creatures sometimes leave behind summoning essence—a rare spirit bond rather than ordinary loot.',dialog:'Every summonable creature has a small chance to leave its Spirit Essence when defeated. Once you find one, open it in your inventory and press Summon. The companion stays unlocked permanently, fights beside you, and may improve gathering, combat, movement, or experience. Keep cooked food in the Companion Food Box. Food energy matches healing, so a 4 HP meal lasts twice as long as a 2 HP meal. A hungry summon stops attacking, granting bonuses, and gaining XP. While fed and active, ordinary actions also train Summoning.'},
      {name:'Bram',role:'Combat Trainer',color:'#5f83a5',offsetX:-92,offsetY:-48,intro:'A steady weapon and food in your pack will carry you farther than charging blindly.',dialog:'Tap a creature to approach and fight it. Melee weapons attack nearby; bows and other ranged weapons let you fight from farther away. Damage trains Melee or Ranged, while Fortitude raises your maximum health. Cook fish or meat in town, equip food, and use the Eat button when hurt. Aggressive creatures may attack first outside the safe starting area.'},
      {name:'Old Fen',role:'Master Gatherer',color:'#72865c',offsetX:92,offsetY:-50,intro:'Woodcutting, Mining, and Fishing are simple to begin, but the world rewards specialists.',dialog:'Higher skill levels unlock new trees, rocks, and fish. Better tools reduce action time, and crafted materials lead to weapons, armour, and town upgrades. Try cedar, stone, and minnows first. When those feel easy, explore the dead-grass ring for oak, copper, and crappie.'}
    ],
    'Swamp Town':[
      {name:'Bogdan',role:'Marsh Fisher',color:'#668d7c',offsetX:-78,offsetY:55,intro:'The swamp pool is rich with catfish, but the marsh does not forgive careless feet.',dialog:'Catfish require stronger Fishing than starter pond fish. Bring food and watch for crocodiles. Willow grows well in wet ground, and coal can be found deeper in the marsh.'},
      {name:'Reed',role:'Relic Collector',color:'#85705d',offsetX:82,offsetY:-45,intro:'The marsh hides useful materials beneath all that mud.',dialog:'Swamp creatures can drop hides, teeth, eyes, and other rare crafting pieces. Keep unusual drops; unique equipment recipes often need materials that look unimportant at first.'}
    ],
    'North Town':[
      {name:'Sera Pine',role:'Tundra Forester',color:'#789b9c',offsetX:-82,offsetY:52,intro:'Arctic pine survives where ordinary trees cannot.',dialog:'The tundra contains high-level wood, silver, crystal, and dangerous frozen creatures. Upgrade your gear and bring cooked food before travelling far north.'},
      {name:'Kell',role:'Crystal Prospector',color:'#8da7bc',offsetX:84,offsetY:-48,intro:'Crystal seams shine brightest beyond the frozen lake.',dialog:'Crystal is a late Mining resource used in powerful equipment. Frost creatures hit hard, so train Fortitude and improve armour before chasing it.'}
    ],
    'Desert Town':[
      {name:'Asha',role:'Sand Trader',color:'#c28a55',offsetX:-80,offsetY:52,intro:'The oasis keeps this post alive, and trade keeps everyone supplied.',dialog:'Pyrite and gold are found in the desert. Merching improves as you complete requests and trade, reducing buy prices and improving sale prices over time.'},
      {name:'Flint',role:'Stoneworker',color:'#9d7c58',offsetX:82,offsetY:-46,intro:'Even plain stone becomes valuable in practiced hands.',dialog:'Mine ore, refine materials at crafting tables, and combine duplicate equipment at the forge. Two matching pieces become a stronger upgraded version.'}
    ],
    'Jungle Town':[
      {name:'Tala',role:'Jungle Warden',color:'#4f855e',offsetX:-82,offsetY:52,intro:'The jungle grows valuable hardwood—and creatures that know how to guard it.',dialog:'Mahogany and redwood are high-level trees. Jungle spiders, snakes, jaguars, and gorillas can provide rare materials, but bring strong gear and food.'},
      {name:'Red',role:'Redwood Keeper',color:'#8f5847',offsetX:84,offsetY:-46,intro:'A redwood is older than most towns. Harvest it with respect.',dialog:'High-level gathering takes longer but rewards much more experience and valuable materials. Summons with gathering bonuses are especially useful here.'}
    ]
  };
  const POH_UPGRADES = [
    {id:'workroom',name:'Workroom',total:25,coins:100,items:{stoneBlock:4,cedarLog:8},description:'A private room for future crafting and storage features.'},
    {id:'kitchen',name:'Kitchen',total:45,coins:250,items:{stoneBlock:8,oakLog:8},description:'A home cooking area for future recipes and bonuses.'},
    {id:'garden',name:'Garden Plot',total:80,coins:500,items:{stoneBlock:10,willowLog:12},description:'Unlocks the future Farming area.'},
    {id:'pasture',name:'Small Pasture',total:85,coins:650,items:{stoneBlock:12,beechLog:12},description:'Unlocks the future Ranching area.'},
    {id:'greatHall',name:'Great Hall',total:140,coins:1500,items:{goldBar:5,mahoganyLog:15},description:'A shared family gathering room for later multiplayer features.'}
  ];
  const SKILL_DEFS = {
    woodcutting: { name: 'Woodcutting', description: 'Cuts trees. Higher levels unlock better trees and axes will reduce chopping time.' },
    fishing: { name: 'Fishing', description: 'Catches fish. Higher levels unlock better fish and bait that reduces catch time.' },
    mining: { name: 'Mining', description: 'Mines rocks and ores. Higher levels unlock better deposits and pickaxes that reduce mining time.' },
    cooking: { name: 'Cooking', description: 'Cooks raw meat and fish into food that restores health.' },
    crafting: { name: 'Crafting', description: 'Combines materials at crafting stations to create increasingly powerful items.' },
    melee: { name: 'Melee', description: 'Close-range combat trained with fists, swords, axes, picks, and similar weapons.' },
    range: { name: 'Ranged', description: 'Long-range combat trained with bows, slingshots, rifles, and other ranged weapons.' },
    fortitude: { name: 'Fortitude', description: 'Your health skill. It gains part of the XP earned by your active combat style and increases maximum health.' },
    summoning: { name: 'Summoning', description: 'Summons animal companions. Pets fight with you and some provide gathering or skill benefits.' },
    merching: { name: 'Merching', description: 'Gains XP by buying and selling. Higher levels unlock stock and improve selling prices.' },
    farming: { name: 'Farming', description: 'Grow crops in your player-owned home and return later to harvest them.' },
    ranching: { name: 'Ranching', description: 'Raise animals by providing food, then collect products or sell livestock.' }
  };


  const SUMMON_DEFS = {
    rabbit:{name:'Rabbit',baseDamage:1,ticks:5,passive:'woodcuttingXp',passiveValue:.05,passiveText:'+5% Woodcutting XP'},
    giantRat:{name:'Giant Rat',baseDamage:2,ticks:4,passive:'cookingXp',passiveValue:.05,passiveText:'+5% Cooking XP'},
    deer:{name:'Deer',baseDamage:3,ticks:5,passive:'moveSpeed',passiveValue:.05,passiveText:'+5% movement speed'},
    wildBoar:{name:'Wild Boar',baseDamage:4,ticks:4,passive:'fortitudeXp',passiveValue:.05,passiveText:'+5% Fortitude XP'},
    wolf:{name:'Wolf',baseDamage:6,ticks:3,passive:'meleeDamage',passiveValue:.08,passiveText:'+8% melee damage'},
    scorpion:{name:'Scorpion',baseDamage:5,ticks:3,passive:'miningXp',passiveValue:.06,passiveText:'+6% Mining XP'},
    sandSerpent:{name:'Sand Serpent',baseDamage:8,ticks:4,passive:'fishingXp',passiveValue:.06,passiveText:'+6% Fishing XP'},
    sandGolem:{name:'Sand Golem',baseDamage:12,ticks:6,passive:'miningSpeed',passiveValue:.08,passiveText:'Mining intervals 8% shorter'},
    bogSlime:{name:'Bog Slime',baseDamage:4,ticks:5,passive:'cookingXp',passiveValue:.08,passiveText:'+8% Cooking XP'},
    crocodile:{name:'Crocodile',baseDamage:10,ticks:4,passive:'fishingSpeed',passiveValue:.08,passiveText:'Fishing intervals 8% shorter'},
    marshLurker:{name:'Marsh Lurker',baseDamage:15,ticks:5,passive:'craftingXp',passiveValue:.08,passiveText:'+8% Crafting XP'},
    jungleSpider:{name:'Jungle Spider',baseDamage:7,ticks:3,passive:'woodcuttingSpeed',passiveValue:.08,passiveText:'Woodcutting intervals 8% shorter'},
    venomSnake:{name:'Venom Snake',baseDamage:9,ticks:3,passive:'rangeDamage',passiveValue:.08,passiveText:'+8% ranged damage'},
    jaguar:{name:'Jaguar',baseDamage:14,ticks:3,passive:'moveSpeed',passiveValue:.10,passiveText:'+10% movement speed'},
    gorilla:{name:'Gorilla',baseDamage:18,ticks:5,passive:'woodcuttingXp',passiveValue:.10,passiveText:'+10% Woodcutting XP'},
    iceWolf:{name:'Ice Wolf',baseDamage:16,ticks:3,passive:'combatXp',passiveValue:.08,passiveText:'+8% combat XP'},
    frostTroll:{name:'Frost Troll',baseDamage:23,ticks:6,passive:'fortitudeXp',passiveValue:.10,passiveText:'+10% Fortitude XP'},
    frostDragon:{name:'Frost Dragon',baseDamage:35,ticks:5,passive:'allXp',passiveValue:.05,passiveText:'+5% XP from all actions'}
  };
  for(const [type,d] of Object.entries(SUMMON_DEFS)){
    const key=`${type}Essence`;
    defineItem(key,{name:`${d.name} Spirit Essence`,type:'Summoning essence',description:`A permanent bond with the spirit of a ${d.name.toLowerCase()}. Use it from your inventory to summon this companion.`,summonType:type,stats:{'Drop chance':'1 in 50','Combat damage':`${d.baseDamage} base + Summoning level scaling`,'Special ability':d.passiveText}});
  }


  const ENEMY_TYPES = {
    rabbit:{name:'Rabbit',behaviour:'passive',shape:'rabbit',hp:5,defence:1,accuracy:3,maxHit:1,ticks:5,color:'#d9cfb8',respawn:20,drops:[['coins',1,5,1],['rawRabbit',1,1,1],['cedarLog',1,2,.25],['rabbitFoot',1,1,.0125]]},
    giantRat:{name:'Giant Rat',behaviour:'passive',shape:'rat',hp:10,defence:3,accuracy:6,maxHit:2,ticks:4,color:'#746d68',respawn:24,drops:[['coins',1,6,1],['ratMeat',1,1,1],['stone',1,2,.25],['ratTail',1,1,.025]]},
    deer:{name:'Deer',behaviour:'passive',shape:'deer',hp:15,defence:7,accuracy:9,maxHit:3,ticks:5,color:'#a6774e',respawn:32,drops:[['coins',1,8,1],['rawVenison',1,3,1],['cedarLog',1,3,.4],['animalHide',1,1,.55],['antler',1,1,.0167]]},
    wildBoar:{name:'Wild Boar',behaviour:'passive',shape:'boar',hp:30,defence:9,accuracy:12,maxHit:4,ticks:4,color:'#74523c',aggro:190,respawn:38,drops:[['coins',2,7,1],['rawPork',1,2,1],['oakLog',1,3,.35],['animalHide',1,1,.45],['boarTusk',1,1,.02]]},
    wolf:{name:'Wolf',behaviour:'aggressive',shape:'wolf',hp:45,defence:12,accuracy:15,maxHit:5,ticks:3,color:'#66717b',aggro:230,respawn:45,drops:[['coins',3,7,1],['wolfMeat',1,2,1],['copperOre',1,3,.35],['animalHide',1,1,.5],['wolfFang',1,1,.0154]]},
    bandit:{name:'Bandit',behaviour:'aggressive',shape:'humanoid',hp:45,defence:14,accuracy:18,maxHit:5,ticks:4,color:'#8d6548',aggro:220,respawn:55,drops:[['coins',4,10,1],['clothScrap',1,2,.7],['copperOre',1,3,.3],['banditDagger',1,1,.01]]},
    skeleton:{name:'Skeleton',behaviour:'passive',shape:'skeleton',hp:50,defence:17,accuracy:20,maxHit:3,ticks:4,color:'#ded9c8',aggro:220,respawn:60,drops:[['coins',4,10,1],['bones',1,2,1],['stone',1,3,.4],['ancientBone',1,1,.0133]]},
    wraith:{name:'Wraith',behaviour:'aggressive',shape:'wraith',hp:135,defence:25,accuracy:29,maxHit:10,ticks:5,color:'#8c85ad',aggro:250,respawn:150,drops:[['coins',10,30,1],['spiritResidue',1,2,1],['silverOre',1,4,.35],['wraithCloth',1,1,.01]]},
    scorpion:{name:'Scorpion',behaviour:'passive',shape:'scorpion',hp:50,defence:10,accuracy:16,maxHit:5,ticks:3,color:'#b4773f',aggro:190,respawn:42,drops:[['coins',2,12,1],['scorpionMeat',1,1,1],['copperOre',1,3,.3],['venomGland',1,1,.0167]]},
    sandSerpent:{name:'Sand Serpent',behaviour:'aggressive',shape:'serpent',hp:85,defence:19,accuracy:24,maxHit:7,ticks:4,color:'#b89b58',aggro:230,respawn:70,drops:[['coins',5,20,1],['serpentMeat',1,2,1],['pyriteOre',1,3,.35],['serpentScale',1,2,.5],['sandFang',1,1,.0118]]},
    sandGolem:{name:'Sand Golem',behaviour:'passive',shape:'golem',hp:125,defence:34,accuracy:30,maxHit:6,ticks:6,color:'#c4a66d',aggro:200,respawn:180,drops:[['coins',10,35,1],['stone',3,10,1],['pyriteOre',1,5,.45],['golemCore',1,1,.01]]},
    bogSlime:{name:'Bog Slime',behaviour:'passive',shape:'slime',hp:65,defence:8,accuracy:10,maxHit:4,ticks:5,color:'#739d75',respawn:38,drops:[['coins',10,20,1],['slimeGel',1,3,1],['willowLog',1,3,.3],['clearGel',1,1,.02]]},
    crocodile:{name:'Crocodile',behaviour:'aggressive',shape:'crocodile',hp:90,defence:24,accuracy:28,maxHit:10,ticks:4,color:'#526f47',aggro:240,respawn:85,drops:[['coins',5,40,1],['crocodileMeat',1,2,1],['willowLog',1,3,.35],['crocodileHide',1,1,.65],['crocodileTooth',1,1,.0143]]},
    marshLurker:{name:'Marsh Lurker',behaviour:'passive',shape:'lurker',hp:190,defence:37,accuracy:38,maxHit:17,ticks:5,color:'#47675c',aggro:260,respawn:210,drops:[['coins',20,50,1],['murkyHide',1,2,1],['coal',2,6,.45],['lurkerEye',1,1,.01]]},
    jungleSpider:{name:'Jungle Spider',behaviour:'aggressive',shape:'spider',hp:65,defence:15,accuracy:23,maxHit:10,ticks:3,color:'#563d4a',aggro:210,respawn:55,drops:[['coins',10,40,1],['spiderSilk',1,2,1],['mahoganyLog',1,3,.35],['venomSac',1,1,.0182]]},
    venomSnake:{name:'Venom Snake',behaviour:'passive',shape:'serpent',hp:80,defence:21,accuracy:29,maxHit:15,ticks:3,color:'#4e8b52',aggro:230,respawn:75,drops:[['coins',10,40,1],['snakeMeat',1,2,1],['goldOre',1,3,.3],['serpentScale',1,1,.55],['venomFang',1,1,.0133]]},
    jaguar:{name:'Jaguar',behaviour:'aggressive',shape:'cat',hp:135,defence:31,accuracy:39,maxHit:18,ticks:3,color:'#c39a45',aggro:270,respawn:130,drops:[['coins',20,50,1],['jaguarMeat',1,2,1],['mahoganyLog',1,4,.4],['jaguarHide',1,1,.7],['jaguarClaw',1,1,.0111]]},
    gorilla:{name:'Gorilla',behaviour:'passive',shape:'gorilla',hp:250,defence:43,accuracy:42,maxHit:20,ticks:5,color:'#4e4b47',aggro:240,respawn:240,drops:[['coins',40,100,1],['gorillaMeat',1,2,1],['mahoganyLog',2,10,.55],['gorillaKnuckle',1,1,.01]]},
    iceWolf:{name:'Ice Wolf',behaviour:'aggressive',shape:'wolf',hp:165,defence:36,accuracy:43,maxHit:20,ticks:3,color:'#a8c4cc',aggro:280,respawn:145,drops:[['coins',25,100,1],['frozenMeat',1,2,1],['arcticPineLog',1,4,.4],['frozenHide',1,1,.65],['iceFang',1,1,.0125]]},
    frostTroll:{name:'Frost Troll',behaviour:'passive',shape:'troll',hp:320,defence:55,accuracy:50,maxHit:18,ticks:6,color:'#78939b',aggro:250,respawn:300,drops:[['coins',50,145,1],['frozenMeat',2,3,1],['silverOre',2,8,.5],['trollClub',1,1,.01]]},
    frostDragon:{name:'Frost Dragon',behaviour:'passive',shape:'dragon',hp:650,defence:105,accuracy:85,maxHit:50,ticks:5,color:'#8fc5d4',aggro:340,respawn:600,drops:[['coins',250,1000,1],['dragonMeat',2,4,1],['crystal',2,10,.6],['arcticPineLog',2,10,.45],['frostScale',1,1,.025],['frozenHeart',1,1,.01]]}
  };
  for(const [type,chance] of Object.entries({wolf:.025,crocodile:.03,jaguar:.04,iceWolf:.05,frostTroll:.08,frostDragon:.15})){
    ENEMY_TYPES[type]?.drops?.push(['temperingShard',1,1,chance]);
  }
  const enemySeeds=[
    // Starting Area: beginner creatures only, including exactly one deer.
    ['rabbit',1540,2240],['rabbit',1890,2050],['rabbit',2240,2390],
    ['giantRat',1600,2520],['giantRat',2220,1980],['deer',2130,2540],

    // Dead Grass ring: early-to-mid world threats, including exactly one wolf.
    ['wildBoar',1180,1910],['wolf',2700,2040],['bandit',1880,1320],
    ['skeleton',1190,2860],['skeleton',2680,2820],['wraith',1960,3040],

    // Desert.
    ['scorpion',1320,3540],['scorpion',2350,3740],['sandSerpent',1780,3950],['sandGolem',2680,3460],

    // Swamp.
    ['bogSlime',3160,1480],['bogSlime',3370,2500],['crocodile',3080,2150],['crocodile',3440,2920],['marshLurker',3290,1160],

    // Jungle.
    ['jungleSpider',520,1510],['jungleSpider',820,2670],['venomSnake',430,2240],['jaguar',770,3100],['gorilla',550,1160],

    // Tundra.
    ['iceWolf',1240,620],['iceWolf',2440,760],['frostTroll',1840,410],['frostDragon',2740,430]
  ].map(([type,x,y])=>[type,mapX(x),mapY(y)]);
  function makeEnemies(saved={}){
    return enemySeeds.map(([type,x,y],index)=>{const id=`enemy-${type}-${index}`,d=ENEMY_TYPES[type],old=saved[id]||{};return {id,type,x:old.x??x,y:old.y??y,homeX:x,homeY:y,hp:Math.min(old.hp??d.hp,d.hp),maxHp:d.hp,respawnAt:old.respawnAt||0,target:null,returning:false,attackElapsed:0,wanderElapsed:Math.random()*3,wanderX:x,wanderY:y};});
  }

  // A broad, continuous continent with squared biome boundaries.
  const continent = [[260,180],[3540,180],[3660,320],[3660,3980],[3500,4140],[300,4140],[140,3980],[140,320]].map(([x,y])=>[mapX(x),mapY(y)]);

  const rect = (x1,y1,x2,y2) => [[mapX(x1),mapY(y1)],[mapX(x2),mapY(y1)],[mapX(x2),mapY(y2)],[mapX(x1),mapY(y2)]];
  const regions = [
    // Cardinal biomes.
    { id: 'tundra', name: 'Tundra', color: '#a9c4cb', points: rect(900,180,2900,1120) },
    { id: 'jungle', name: 'Jungle', color: '#438158', points: rect(140,1050,1120,3250) },
    { id: 'swamp', name: 'Swamp', color: '#587b61', points: rect(2880,1050,3660,3250) },
    { id: 'desert', name: 'Desert', color: '#cba963', points: rect(900,3230,2900,4140) },

    // Dead-grass ring around the protected starting square.
    { id: 'deadGrass', name: 'Dead Grass', color: '#988b61', points: rect(900,1050,2900,1540) },
    { id: 'deadGrass', name: 'Dead Grass', color: '#988b61', points: rect(900,2740,2900,3250) },
    { id: 'deadGrass', name: 'Dead Grass', color: '#988b61', points: rect(900,1540,1320,2740) },
    { id: 'deadGrass', name: 'Dead Grass', color: '#988b61', points: rect(2480,1540,2900,2740) },

    // Central protected starting area is intentionally last so it wins overlaps.
    { id: 'central', name: 'Starting Area', color: '#72ae61', points: rect(1320,1540,2480,2740) }
  ];

  const waters = [
    { name: 'Starter Pond', kind: 'lake', x: 1660, y: 2310, rx: 190, ry: 125, color: '#4d95b5' },
    { name: 'Deadwater Pond', kind: 'lake', x: 2140, y: 1360, rx: 220, ry: 115, color: '#668e9b' },
    { name: 'Swamp Pool', kind: 'lake', x: 3260, y: 2160, rx: 250, ry: 380, color: '#4f8b82' },
    { name: 'Jungle Lagoon', kind: 'lake', x: 640, y: 2320, rx: 260, ry: 330, color: '#3e8fa0' },
    { name: 'Tundra Lake', kind: 'lake', x: 2060, y: 720, rx: 270, ry: 150, color: '#6fa7bd' },
    { name: 'Desert Oasis', kind: 'lake', x: 2040, y: 3670, rx: 235, ry: 125, color: '#4f9fb5' }
  ].map(w=>({...w,x:mapX(w.x),y:mapY(w.y),rx:mapX(w.rx),ry:mapY(w.ry)}));

  // Two usable spots for every fish type. Coastal fish sit offshore with safe stand points on land.
  const fishingSeeds = [
    ['minnow', 1580, 2290, 1430, 2220, 'Starter Pond'],
    ['minnow', 1740, 2340, 1840, 2450, 'Starter Pond'],
    ['crappie', 2070, 1340, 1940, 1240, 'Deadwater Pond'],
    ['crappie', 2210, 1390, 2330, 1280, 'Deadwater Pond'],
    ['bass', 600, 2200, 820, 2110, 'Jungle Lagoon'],
    ['bass', 700, 2440, 860, 2530, 'Jungle Lagoon'],
    ['catfish', 3220, 2050, 3020, 1970, 'Swamp Pool'],
    ['catfish', 3310, 2320, 3060, 2390, 'Swamp Pool'],
    ['tuna', 1540, 120, 1540, 310, 'Northern Ocean'],
    ['tuna', 3710, 1760, 3510, 1760, 'Eastern Ocean'],
    ['grouper', 650, 4200, 980, 4000, 'Southwestern Reef'],
    ['grouper', 3100, 4200, 2820, 4000, 'Southeastern Reef'],
    ['shark', 60, 2840, 310, 2840, 'Deep Western Ocean'],
    ['shark', 3740, 2860, 3500, 2860, 'Deep Eastern Ocean']
  ].map(([type,x,y,standX,standY,location])=>[type,mapX(x),mapY(y),mapX(standX),mapY(standY),location]);
  function makeFishingSpots(saved = {}) {
    return fishingSeeds.map(([type,x,y,standX,standY,location], index) => {
      const id = `fish-${type}-${index}`; const prior=saved[id]||{};
      return { id,type,x,y,standX,standY,location,phase:index*0.83,remaining:prior.remaining ?? randomInt(12,20),respawnAt:prior.respawnAt||0 };
    });
  }

  const towns = [
    { name: 'Starting Town', x: 1900, y: 2140, description: 'The protected central town and starting point for every wanderer.' },
    { name: 'North Town', x: 1900, y: 980, description: 'A fortified tundra outpost below the frozen northern reaches.' },
    { name: 'Jungle Town', x: 930, y: 1900, description: 'A raised settlement at the edge of the western jungle.' },
    { name: 'Swamp Town', x: 3090, y: 1800, description: 'A stilt-built settlement overlooking the eastern marsh.' },
    { name: 'Desert Town', x: 1900, y: 3420, description: 'A shaded trading post at the northern edge of the desert.' }
  ].map(t=>({...t,x:mapX(t.x),y:mapY(t.y)}));


  const WORLD_DECOR_COUNTS = {central:70,deadGrass:105,tundra:105,jungle:125,swamp:110,desert:100};
  function seededRandom(seed){let v=seed>>>0;return()=>{v=(v*1664525+1013904223)>>>0;return v/4294967296;};}
  function pointNearWater(x,y,pad=45){return waters.some(w=>Math.hypot((x-w.x)/(w.rx+pad),(y-w.y)/(w.ry+pad))<1);}
  function makeWorldDecor(){
    const rand=seededRandom(20260718),items=[];
    const rawBounds={central:[1320,1540,2480,2740],deadGrass:[900,1050,2900,3250],tundra:[900,180,2900,1120],jungle:[140,1050,1120,3250],swamp:[2880,1050,3660,3250],desert:[900,3230,2900,4140]};
    const bounds=Object.fromEntries(Object.entries(rawBounds).map(([key,[x1,y1,x2,y2]])=>[key,[mapX(x1),mapY(y1),mapX(x2),mapY(y2)]]));
    for(const [biome,count] of Object.entries(WORLD_DECOR_COUNTS)){
      const [x1,y1,x2,y2]=bounds[biome];let made=0,tries=0;
      while(made<count&&tries++<count*20){const x=x1+rand()*(x2-x1),y=y1+rand()*(y2-y1);if(regionAt(x,y).id!==biome||towns.some(t=>Math.hypot(x-t.x,y-t.y)<145)||pointNearWater(x,y))continue;
        const roll=rand();let kind='grass';
        if(biome==='central')kind=roll<.55?'flower':roll<.82?'grass':'bush';
        else if(biome==='deadGrass')kind=roll<.48?'dryGrass':roll<.72?'stump':roll<.9?'stonePile':'bones';
        else if(biome==='tundra')kind=roll<.5?'snowTuft':roll<.75?'iceShard':roll<.9?'frozenBush':'snowRock';
        else if(biome==='jungle')kind=roll<.42?'fern':roll<.7?'broadleaf':roll<.87?'vine':'mushroom';
        else if(biome==='swamp')kind=roll<.42?'reeds':roll<.68?'mudPatch':roll<.86?'lily':'deadTree';
        else if(biome==='desert')kind=roll<.42?'cactus':roll<.7?'duneGrass':roll<.88?'desertRock':'skull';
        items.push({x,y,kind,scale:.7+rand()*.75,phase:rand()*6.28});made++;
      }
    }return items;
  }
  const worldDecor=makeWorldDecor();
  const worldNPCs=towns.flatMap(town=>(TOWN_NPCS[town.name]||[]).map((npc,index)=>({...npc,id:`npc-${town.name}-${index}`,town,x:town.x+npc.offsetX,y:town.y+npc.offsetY})));
  function npcAt(x,y){let best=null,bestD=42;for(const npc of worldNPCs){const d=Math.hypot(x-npc.x,y-npc.y);if(d<bestD){best=npc;bestD=d;}}return best;}

  const treeSeeds = [
    // Level 1: Starting Area.
    ['cedar',1480,1740],['cedar',1770,1840],['cedar',2250,1760],['cedar',2290,2580],
    // Level 10 and 30-40 temperate trees: Dead Grass ring.
    ['oak',1090,1370],['oak',2700,1360],['oak',1120,3000],
    ['beech',2740,2980],['beech',1040,1820],['beech',2670,2450],
    ['cherry',1530,3000],['cherry',2250,3000],['cherry',1900,1220],
    // Swamp.
    ['willow',3060,1450],['willow',3400,1940],['willow',3150,2860],
    // Tundra.
    ['arcticPine',1120,440],['arcticPine',1620,820],['arcticPine',2680,720],
    // Jungle.
    ['mahogany',370,1360],['mahogany',720,1840],['mahogany',920,2900],
    ['redwood',350,2860],['redwood',780,3160]
  ].map(([type,x,y])=>[type,mapX(x),mapY(y)]);

  function makeTrees(saved = {}) {
    return treeSeeds.map(([type,x,y], index) => {
      const id = `${type}-${index}`; const prior = saved[id] || {};
      const def = TREE_TYPES[type];
      return { id, type, x, y, remaining: prior.remaining ?? randomInt(def.capacity[0], def.capacity[1]), respawnAt: prior.respawnAt || 0, max: prior.max || randomInt(def.capacity[0], def.capacity[1]) };
    });
  }

  const rockSeeds = [
    // Level 1: Starting Area.
    ['stone',1450,2600],['stone',2050,1660],['stone',2350,2210],
    // Level 10: Dead Grass ring.
    ['copper',1070,1580],['copper',2720,1700],['copper',2280,3100],
    // Jungle.
    ['iron',360,1980],['iron',850,1150],
    // Swamp.
    ['coal',3060,1200],['coal',3450,2700],
    // Tundra.
    ['silver',1280,880],['silver',2480,410],
    // Desert.
    ['pyrite',1210,3710],['pyrite',2500,3550],
    ['gold',1570,3970],['gold',2710,3890],
    // Deep tundra deposits.
    ['crystal',1770,360],['crystal',2820,850]
  ].map(([type,x,y])=>[type,mapX(x),mapY(y)]);

  function makeRocks(saved = {}) {
    return rockSeeds.map(([type,x,y], index) => {
      const id = `rock-${type}-${index}`, prior = saved[id] || {}, def = ROCK_TYPES[type];
      return { id, type, x, y, hp: prior.hp ?? def.hp, maxHp: def.hp, respawnAt: prior.respawnAt || 0 };
    });
  }

  const defaultInventory = () => Object.fromEntries(Object.keys(ITEM_DEFS).map(k => [k, 0]));
  const defaultState = () => ({
    version: VERSION,
    player: { x: mapX(1900), y: mapY(2320), targetX: mapX(1900), targetY: mapY(2320) },
    inventory: { ...defaultInventory(), stoneAxe: 1, stonePickaxe: 1, basicFishingRod: 1, coins: 100 },
    skills: Object.fromEntries(Object.keys(SKILL_DEFS).map(k => [k, { xp: 0 }])),
    equipment: { head: null, body: null, legs: null, boots: null, weapon: null, shield: null, cape: null, ring: null, food: null },
    activeSummon: null, summonAttackElapsed: 0, summonFoodEnergy: 0, summonFoodElapsed: 0,
    audio: { music: true, sfx: true, musicVolume: 0.72, sfxVolume: 0.9 },
    autoMode: 'off', autoTargetId: null, autoBiomeId: 'central',
    treeState: {}, fishingState: {}, rockState: {}, enemyState: {}, combat: { hp: 10 }, poh: {}, quests: {}, shopDay: '',
    statistics: { totalKills:0, killsByEnemy:{}, rareDropsByEnemy:{}, lifetimeGoldEarned:0, lifetimeGoldSpent:0, itemsGathered:0, itemsCrafted:0, foodCooked:0, treesCut:0, rocksMined:0, fishCaught:0, uniqueDropsFound:0, deaths:0, playTimeSeconds:0 },
    lastSavedAt: Date.now()
  });

  const camera = { x: 0, y: 0 };
  let state = loadState();
  if((state.skills.fortitude?.xp||0)<xpForLevel(10)) state.skills.fortitude={xp:xpForLevel(10)};
  let trees = makeTrees(state.treeState);
  let fishingSpots = makeFishingSpots(state.fishingState);
  let rocks = makeRocks(state.rockState);
  let enemies = makeEnemies(state.enemyState);
  let lastFrame = performance.now(), toastTimer = null, selectedItemKey = null;
  let activeTree = null, queuedTree = null, activeFishingSpot = null, queuedFishingSpot = null, activeRock = null, queuedRock = null, queuedTown = null, queuedNPC = null, activeEnemy = null, queuedEnemy = null, activePvpUid = null, queuedPvpUid = null, pvpElapsed = 0, combatElapsed = 0, actionElapsed = 0, defeatActive = false;
  let animationClock = 0, autoThinkElapsed = 0, hpRegenElapsed = 0;
  const floaters = [];
  const projectiles = [];
  const remotePlayers = new Map();
  let multiplayerReady = false, multiplayerLastSent = 0, multiplayerFacing = 'down', multiplayerLastX = state.player.x, multiplayerLastY = state.player.y;
  const miniMapView = { zoom: 1.8, centerX: state.player.x, centerY: state.player.y, dragging: false, lastX: 0, lastY: 0, lastDraw: 0 };
  const audioEngine = {
    ctx:null, masterGain:null, compressor:null, musicGain:null, sfxGain:null, musicTimer:null, started:false, unlocked:false,
    ensure(){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return false;
      if(!this.ctx){
        this.ctx=new AC();
        this.masterGain=this.ctx.createGain();
        this.compressor=this.ctx.createDynamicsCompressor();
        this.musicGain=this.ctx.createGain();
        this.sfxGain=this.ctx.createGain();
        this.compressor.threshold.value=-12;
        this.compressor.knee.value=8;
        this.compressor.ratio.value=5;
        this.compressor.attack.value=.002;
        this.compressor.release.value=.12;
        this.masterGain.gain.value=1;
        this.musicGain.gain.value=1;
        this.sfxGain.gain.value=1;
        this.musicGain.connect(this.compressor);
        this.sfxGain.connect(this.compressor);
        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }
      if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
      return true;
    },
    unlock(){
      if(!this.ensure())return;
      if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
      if(!this.unlocked){
        const buffer=this.ctx.createBuffer(1,1,this.ctx.sampleRate);
        const source=this.ctx.createBufferSource();
        source.buffer=buffer;source.connect(this.masterGain);source.start(0);
        this.unlocked=true;
      }
      if(!this.started)this.startMusic();
    },
    tone(freq,duration=.12,type='sine',volume=.8,delay=0,target='sfx'){
      if(!this.ensure())return;
      const now=this.ctx.currentTime+delay,osc=this.ctx.createOscillator(),gain=this.ctx.createGain();
      osc.type=type;osc.frequency.setValueAtTime(freq,now);
      gain.gain.setValueAtTime(0.0001,now);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),now+.008);
      gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      osc.connect(gain);gain.connect(target==='music'?this.musicGain:this.sfxGain);osc.start(now);osc.stop(now+duration+.03);
    },
    noise(duration=.08,volume=.75){
      if(!this.ensure())return;
      const length=Math.max(1,Math.floor(this.ctx.sampleRate*duration)),buffer=this.ctx.createBuffer(1,length,this.ctx.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
      const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;gain.gain.value=volume;source.connect(gain);gain.connect(this.sfxGain);source.start();
    },
    sfx(name){
      this.unlock();
      const map={
        chop:()=>{this.noise(.11,.95);this.tone(135,.14,'triangle',1);},
        mine:()=>{this.tone(760,.08,'square',.9);this.tone(230,.18,'triangle',1,.035);},
        fish:()=>{this.tone(410,.14,'sine',.9);this.tone(760,.2,'sine',1,.07);},
        combat:()=>{this.noise(.08,1);this.tone(95,.14,'sawtooth',1);this.tone(260,.075,'square',.8,.02);},
        loot:()=>{this.tone(700,.11,'sine',.9);this.tone(1050,.18,'sine',1,.07);},
        cook:()=>{this.noise(.14,.8);this.tone(390,.18,'triangle',.9);},
        craft:()=>{this.tone(330,.1,'square',.9);this.tone(520,.16,'triangle',1,.05);},
        summon:()=>{this.tone(250,.22,'sine',.9);this.tone(400,.28,'sine',1,.09);this.tone(620,.38,'sine',1,.18);},
        save:()=>{this.tone(650,.11,'sine',.9);this.tone(900,.16,'sine',1,.06);},
        level:()=>{this.tone(392,.16,'triangle',1);this.tone(523,.2,'triangle',1,.1);this.tone(659,.24,'triangle',1,.22);this.tone(784,.42,'sine',1,.36);}
      };(map[name]||map.loot)();
    },
    startMusic(){
      if(this.started||!this.ensure())return;
      this.started=true;
      const phrase=()=>{
        const root=[196,220,174,196][Math.floor(Date.now()/8000)%4],notes=[root,root*1.25,root*1.5,root*2];
        notes.forEach((f,i)=>this.tone(f,2.7,'sine',.32,i*.85,'music'));
        this.tone(root/2,3.9,'triangle',.24,0,'music');
      };
      phrase();this.musicTimer=setInterval(phrase,4200);
    }
  };
  let inventoryFilter='all';

  const holdWalk = {
    pointerId: null,
    pressed: false,
    active: false,
    clientX: 0,
    clientY: 0,
    startedAt: 0
  };
  const HOLD_WALK_DELAY_MS = 120;
  const HOLD_WALK_DEADZONE = 14;
  const HOLD_WALK_FULL_SPEED_DISTANCE = 92;


  function randomInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
  function xpForLevel(level){ return Math.floor(32 * Math.pow(Math.max(0, level - 1), 2)); }
  function levelFromXp(xp){ let level=1; while(level<100 && xp>=xpForLevel(level+1)) level++; return level; }
  function currentLevelProgress(xp){ const level=levelFromXp(xp); if(level>=100)return 1; return (xp-xpForLevel(level))/(xpForLevel(level+1)-xpForLevel(level)); }

  function showXpBlip(skillKey,amount){
    if(!amount)return;
    const stack=document.getElementById('xpBlips');
    if(!stack)return;
    const blip=document.createElement('div');
    blip.className='xp-blip';
    blip.innerHTML=`<strong>+${Math.round(amount).toLocaleString()} XP</strong><span>${SKILL_DEFS[skillKey]?.name||skillKey}</span>`;
    stack.appendChild(blip);
    while(stack.children.length>4)stack.firstElementChild.remove();
    setTimeout(()=>blip.classList.add('leaving'),1350);
    setTimeout(()=>blip.remove(),1750);
  }

  let levelUpQueue=[];
  let levelUpPlaying=false;
  function queueLevelUp(skillKey,level){
    levelUpQueue.push({skillKey,level});
    if(!levelUpPlaying)playNextLevelUp();
  }
  function playNextLevelUp(){
    const next=levelUpQueue.shift();
    if(!next){levelUpPlaying=false;return;}
    levelUpPlaying=true;
    const overlay=document.getElementById('levelUpOverlay');
    if(!overlay){levelUpPlaying=false;return;}
    overlay.querySelector('.level-up-skill').textContent=SKILL_DEFS[next.skillKey]?.name||next.skillKey;
    overlay.querySelector('.level-up-level').textContent=`Level ${next.level}`;
    overlay.querySelector('.level-up-particles').innerHTML=Array.from({length:18},(_,i)=>`<i style="--i:${i};--x:${(i%6)-2.5};--y:${Math.floor(i/6)-1}"></i>`).join('');
    overlay.classList.remove('show'); void overlay.offsetWidth; overlay.classList.add('show');
    audioEngine.sfx('level');
    if(navigator.vibrate)navigator.vibrate([40,35,80]);
    setTimeout(()=>overlay.classList.remove('show'),2100);
    setTimeout(()=>{levelUpPlaying=false;playNextLevelUp();},2350);
  }

  function awardSkillXp(skillKey,amount,{blip=true}={}){
    const gained=Math.max(0,Math.round(amount||0));
    if(!gained||!state.skills[skillKey])return 0;
    const before=levelFromXp(state.skills[skillKey].xp||0);
    state.skills[skillKey].xp=(state.skills[skillKey].xp||0)+gained;
    const after=levelFromXp(state.skills[skillKey].xp||0);
    if(blip)showXpBlip(skillKey,gained);
    for(let level=before+1;level<=after;level++)queueLevelUp(skillKey,level);
    return gained;
  }

  function pointInPolygon(x,y,points){ let inside=false; for(let i=0,j=points.length-1;i<points.length;j=i++) { const [xi,yi]=points[i],[xj,yj]=points[j]; const hit=((yi>y)!==(yj>y)) && x<(xj-xi)*(y-yi)/((yj-yi)||.00001)+xi; if(hit)inside=!inside; } return inside; }
  function pointInWater(x,y){ return waters.some(w => ((x-w.x)/w.rx)**2 + ((y-w.y)/w.ry)**2 <= 1); }
  // Inland ponds are walkable for now. The ocean remains blocked because it lies outside the continent.
  function isWalkable(x,y){ return pointInPolygon(x,y,continent); }
  function regionAt(x,y){ return regions.slice().reverse().find(r=>pointInPolygon(x,y,r.points)) || { name:'Grasslands', color:'#72ae61' }; }
  function ownedTools(toolType){
    return Object.entries(state.inventory)
      .filter(([key, quantity]) => quantity > 0 && ITEM_DEFS[key]?.tool === toolType)
      .sort((a,b) => (ITEM_DEFS[b[0]].toolTier || 0) - (ITEM_DEFS[a[0]].toolTier || 0));
  }
  function bestOwnedTool(toolType){
    const skillKey = toolType === 'axe' ? 'woodcutting' : toolType === 'pickaxe' ? 'mining' : 'fishing';
    const level = levelFromXp(state.skills[skillKey]?.xp || 0);
    return ownedTools(toolType).find(([key]) => (ITEM_DEFS[key].requiredSkillLevel || 1) <= level)?.[0] || null;
  }
  const SUMMON_FOOD_SECONDS_PER_ENERGY=60;
  function activeSummonDef(){return state.activeSummon?SUMMON_DEFS[state.activeSummon]||null:null;}
  function summonIsFed(){return Boolean(activeSummonDef()&&(state.summonFoodEnergy||0)>0);}
  function summonBonus(name){const d=summonIsFed()?activeSummonDef():null;return d?.passive===name?d.passiveValue:0;}
  function xpWithSummonBonus(skill,amount){
    const d=summonIsFed()?activeSummonDef():null,specific=d?.passive===`${skill}Xp`?d.passiveValue:0,combat=d?.passive==='combatXp'&&['melee','range','fortitude'].includes(skill)?d.passiveValue:0,all=d?.passive==='allXp'?d.passiveValue:0;
    return Math.max(1,Math.round(amount*XP_RATE*(1+specific+combat+all)));
  }
  function awardSummoningXp(sourceXp){if(!summonIsFed()||sourceXp<=0)return;awardSkillXp('summoning',Math.max(1,Math.floor(sourceXp/3)));}
  function summonFoodDuration(){const seconds=(state.summonFoodEnergy||0)*SUMMON_FOOD_SECONDS_PER_ENERGY-(state.summonFoodElapsed||0);if(seconds<=0)return 'Empty';const h=Math.floor(seconds/3600),m=Math.ceil((seconds%3600)/60);return h?`${h}h ${m}m`:`${m}m`;}
  function depositSummonFood(key,all=false){const item=ITEM_DEFS[key],owned=state.inventory[key]||0,amount=all?owned:Math.min(1,owned);if(!item?.foodEnergy||amount<1)return;state.inventory[key]-=amount;state.summonFoodEnergy=(state.summonFoodEnergy||0)+item.foodEnergy*amount;showToast(`Added ${item.foodEnergy*amount} food energy`);renderAll();openSummonFoodBox();saveGame(false);}
  function openSummonFoodBox(){
    const foods=Object.entries(state.inventory).filter(([key,count])=>count>0&&ITEM_DEFS[key]?.foodEnergy);
    const active=activeSummonDef(),status=!active?'No active summon':summonIsFed()?`${active.name} is fed and helping`:`${active.name} is hungry and inactive`;
    const rows=foods.length?foods.map(([key,count])=>{const item=ITEM_DEFS[key];return `<article class="service-card"><div><strong>${item.name} ×${count}</strong><span>${item.foodEnergy} energy each · ${item.foodEnergy} minute${item.foodEnergy===1?'':'s'} each</span></div><div class="service-actions"><button data-feed="${key}">Deposit 1</button><button data-feedall="${key}">Deposit All</button></div></article>`}).join(''):'<div class="empty-state"><strong>No provisions available</strong><span>Cook fish or meat, or craft Spirit Feasts.</span></div>';
    openService('Summoning', 'Companion Food Box', `${status} · ${Math.floor(state.summonFoodEnergy||0)} energy · ${summonFoodDuration()} remaining`, rows);
    ui.serviceContent.querySelectorAll('[data-feed]').forEach(b=>b.addEventListener('click',()=>depositSummonFood(b.dataset.feed,false)));
    ui.serviceContent.querySelectorAll('[data-feedall]').forEach(b=>b.addEventListener('click',()=>depositSummonFood(b.dataset.feedall,true)));
  }
  function gatheringDuration(def, toolType){
    const toolKey=bestOwnedTool(toolType), bonus=toolKey ? (ITEM_DEFS[toolKey].speedBonus || 0) : 0;
    const summonSpeed=toolType==='axe'?summonBonus('woodcuttingSpeed'):toolType==='pickaxe'?summonBonus('miningSpeed'):summonBonus('fishingSpeed');
    return def.ticks*TICK_SECONDS*(1-bonus/100)*(1-summonSpeed);
  }

  function loadState(){
    try {
      const raw=localStorage.getItem(SAVE_KEY);
      if(!raw)return defaultState(); const old=JSON.parse(raw), fresh=defaultState();
      fresh.inventory={...fresh.inventory,...(old.inventory||{})};
      // Tool ownership, not equipment, controls gathering access. Existing saves receive the starter set once.
      for (const starter of ['stoneAxe','stonePickaxe','basicFishingRod']) {
        if (!fresh.inventory[starter] || fresh.inventory[starter] < 1) fresh.inventory[starter] = 1;
      }
      for(const key of Object.keys(SKILL_DEFS)) if(old.skills?.[key]) fresh.skills[key]=old.skills[key];
      if(!old.skills?.fortitude || (old.skills.fortitude.xp||0)<xpForLevel(10)) fresh.skills.fortitude={xp:xpForLevel(10)};
      fresh.equipment={...fresh.equipment,...(old.equipment||{})}; fresh.audio={...fresh.audio,...(old.audio||{})}; fresh.autoMode=['off','combat','woodcutting','mining','fishing','explore'].includes(old.autoMode)?old.autoMode:'off'; fresh.autoTargetId=old.autoTargetId||null; fresh.autoBiomeId=old.autoBiomeId||regionAt(fresh.player.x,fresh.player.y).id; fresh.activeSummon=SUMMON_DEFS[old.activeSummon]?old.activeSummon:null; fresh.summonAttackElapsed=0; fresh.summonFoodEnergy=Math.max(0,Number(old.summonFoodEnergy)||0); fresh.summonFoodElapsed=Math.max(0,Number(old.summonFoodElapsed)||0); fresh.treeState=old.treeState||{}; fresh.fishingState=old.fishingState||{}; fresh.rockState=old.rockState||{}; fresh.enemyState=old.enemyState||{}; fresh.combat={...fresh.combat,...(old.combat||{})}; fresh.poh=old.poh||{}; fresh.quests=old.quests||{}; fresh.statistics={...fresh.statistics,...(old.statistics||{}),killsByEnemy:{...(old.statistics?.killsByEnemy||{})},rareDropsByEnemy:{...(old.statistics?.rareDropsByEnemy||{})}}; for(const type of Object.keys(ENEMY_TYPES)){for(const key of rareDropKeysForEnemy(type)){if((fresh.inventory[key]||0)>0){fresh.statistics.rareDropsByEnemy[type] ||= {};fresh.statistics.rareDropsByEnemy[type][key]=true;}}}
      const isPreExpandedWorld=old.version && old.version!=='0.23.0';
      if(old.player){
        const px=isPreExpandedWorld?mapX(old.player.x):old.player.x;
        const py=isPreExpandedWorld?mapY(old.player.y):old.player.y;
        if(isWalkable(px,py))fresh.player={...fresh.player,x:px,y:py,targetX:px,targetY:py};
      }
      fresh.autoMode='off';fresh.autoTargetId=null;fresh.autoBiomeId=regionAt(fresh.player.x,fresh.player.y).id||'central';
      if(isPreExpandedWorld)fresh.enemyState={};
      return fresh;
    } catch(e){ console.error(e); return defaultState(); }
  }


  const UNIQUE_DROP_KEYS = new Set(Object.entries(ITEM_DEFS).filter(([,d])=>/Rare combat drop|Unique/.test(d.type||'')).map(([k])=>k));
  function rareDropKeysForEnemy(type){
    const drops=(ENEMY_TYPES[type]?.drops||[]).filter(([, , , chance])=>Number(chance)<0.1).map(([key])=>key);
    if(SUMMON_DEFS[type])drops.push(`${type}Essence`);
    return [...new Set(drops)];
  }
  function recordRareDrop(type,key){
    if(!rareDropKeysForEnemy(type).includes(key))return;
    state.statistics.rareDropsByEnemy ||= {};
    state.statistics.rareDropsByEnemy[type] ||= {};
    state.statistics.rareDropsByEnemy[type][key]=true;
  }
  const LEADERBOARD_PUBLISH_INTERVAL = 60 * 60 * 1000;
  const LEADERBOARD_PUBLISH_KEY = 'idle-wanderer-leaderboard-last-publish';
  let leaderboardPublishTimer=null;
  let leaderboardSort='totalLevel';
  function totalLevel(){return Object.values(state.skills).reduce((sum,s)=>sum+levelFromXp(s.xp||0),0);}
  function combatLevel(){const melee=levelFromXp(state.skills.melee?.xp||0),range=levelFromXp(state.skills.range?.xp||0),fort=levelFromXp(state.skills.fortitude?.xp||0);return Math.max(1,Math.floor((fort+Math.max(melee,range)*2)/3));}
  function leaderboardProfile(){
    const skillLevels=Object.fromEntries(Object.entries(state.skills).map(([k,v])=>[k,levelFromXp(v.xp||0)]));
    const highest=Object.entries(skillLevels).sort((a,b)=>b[1]-a[1])[0]||['none',1];
    return {displayName:window.IdleCloud?.user?.displayName||'Wanderer',totalLevel:totalLevel(),combatLevel:combatLevel(),coins:state.inventory.coins||0,lifetimeGold:state.statistics.lifetimeGoldEarned||0,totalKills:state.statistics.totalKills||0,uniqueDrops:state.statistics.uniqueDropsFound||0,deaths:state.statistics.deaths||0,summonsUnlocked:Object.keys(SUMMON_DEFS).filter(k=>(state.inventory[`${k}Essence`]||0)>0).length,skillLevels,highestSkill:{name:SKILL_DEFS[highest[0]]?.name||highest[0],level:highest[1]}};
  }
  function queueLeaderboardPublish(force=false){
    clearTimeout(leaderboardPublishTimer);
    const lastPublished=Number(localStorage.getItem(LEADERBOARD_PUBLISH_KEY)||0);
    const elapsed=Date.now()-lastPublished;
    const delay=force?0:Math.max(0,LEADERBOARD_PUBLISH_INTERVAL-elapsed);
    leaderboardPublishTimer=setTimeout(async()=>{
      try{
        await window.IdleCloud?.publishLeaderboard(leaderboardProfile());
        localStorage.setItem(LEADERBOARD_PUBLISH_KEY,String(Date.now()));
      }catch(e){
        console.warn('Leaderboard publish failed',e);
      }
    },delay);
  }
  function leaderboardValue(row,key){if(key.startsWith('skillLevels.'))return row.skillLevels?.[key.split('.')[1]]||1;return Number(row[key])||0;}
  const LEADERBOARD_CATEGORIES=[['totalLevel','Total Level'],['combatLevel','Combat'],['totalKills','Kills'],['coins','Gold'],['lifetimeGold','Gold Earned'],['uniqueDrops','Uniques'],['summonsUnlocked','Summons'],['skillLevels.woodcutting','Woodcutting'],['skillLevels.mining','Mining'],['skillLevels.fishing','Fishing'],['skillLevels.cooking','Cooking'],['skillLevels.crafting','Crafting'],['skillLevels.melee','Melee'],['skillLevels.range','Ranged'],['skillLevels.fortitude','Fortitude'],['skillLevels.summoning','Summoning']];
  async function renderLeaderboards(sortKey=leaderboardSort){
    leaderboardSort=sortKey;if(!ui.leaderboards)return;ui.leaderboards.innerHTML='<div class="leaderboard-loading">Loading rankings…</div>';
    try{queueLeaderboardPublish(false);const rows=await window.IdleCloud.getLeaderboard(sortKey,100),me=window.IdleCloud.user?.uid;
      const mine=leaderboardProfile();ui.leaderboards.innerHTML=`<div class="leaderboard-head"><div><strong>Family Leaderboards</strong><span>Friendly rankings from cloud saves</span></div><button id="renamePlayerButton" class="small-action">Rename</button></div><div class="leaderboard-own-stats"><div><span>Total level</span><strong>${mine.totalLevel}</strong></div><div><span>Combat</span><strong>${mine.combatLevel}</strong></div><div><span>Kills</span><strong>${mine.totalKills.toLocaleString()}</strong></div><div><span>Gold</span><strong>${mine.coins.toLocaleString()}</strong></div></div><div class="leaderboard-tabs">${LEADERBOARD_CATEGORIES.map(([k,n])=>`<button data-rank="${k}" class="${k===sortKey?'active':''}">${n}</button>`).join('')}</div><div class="leaderboard-list">${rows.length?rows.map((r,i)=>`<button class="leaderboard-row ${r.id===me?'is-me':''}" data-profile="${r.id}"><b class="rank-position">${i<3?['🥇','🥈','🥉'][i]:`#${i+1}`}</b><span><strong>${escapeHtml(r.displayName||'Wanderer')}</strong><small>${r.id===me?'You · ':''}Total ${r.totalLevel||0}</small></span><em>${leaderboardValue(r,sortKey).toLocaleString()}</em></button>`).join(''):'<p class="leaderboard-empty">No ranked players yet. Your profile is being published now.</p>'}</div>`;
      ui.leaderboards.querySelectorAll('[data-rank]').forEach(b=>b.addEventListener('click',()=>renderLeaderboards(b.dataset.rank)));
      ui.leaderboards.querySelectorAll('[data-profile]').forEach(b=>b.addEventListener('click',()=>showLeaderboardProfile(b.dataset.profile)));
      document.getElementById('renamePlayerButton')?.addEventListener('click',renameLeaderboardPlayer);
    }catch(e){console.error(e);ui.leaderboards.innerHTML='<div class="leaderboard-error"><strong>Could not load leaderboards</strong><span>Deploy the included Firestore rules, then refresh.</span><button id="retryLeaderboardButton">Retry</button></div>';document.getElementById('retryLeaderboardButton')?.addEventListener('click',()=>renderLeaderboards(sortKey));}
  }
  function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  async function showLeaderboardProfile(uid){const p=await window.IdleCloud.getLeaderboardProfile(uid);if(!p)return;ui.leaderboardProfileName.textContent=p.displayName||'Wanderer';const skills=Object.entries(p.skillLevels||{}).sort((a,b)=>b[1]-a[1]);ui.leaderboardProfileContent.innerHTML=`<div class="profile-stat-grid"><div><span>Total level</span><strong>${p.totalLevel||0}</strong></div><div><span>Combat</span><strong>${p.combatLevel||0}</strong></div><div><span>Kills</span><strong>${(p.totalKills||0).toLocaleString()}</strong></div><div><span>Gold</span><strong>${(p.coins||0).toLocaleString()}</strong></div><div><span>Uniques</span><strong>${p.uniqueDrops||0}</strong></div><div><span>Summons</span><strong>${p.summonsUnlocked||0}</strong></div><div><span>Defeats</span><strong>${(p.deaths||0).toLocaleString()}</strong></div></div><h3>Skill levels</h3><div class="profile-skills">${skills.map(([k,v])=>`<div><span>${SKILL_DEFS[k]?.name||k}</span><strong>${v}</strong></div>`).join('')}</div>`;ui.leaderboardProfileDialog.showModal();}
  async function renameLeaderboardPlayer(){const old=window.IdleCloud.user?.displayName||'';const name=prompt('Choose a leaderboard name (24 characters max):',old);if(name===null)return;try{await window.IdleCloud.updateDisplayName(name);queueLeaderboardPublish(true);renderLeaderboards(leaderboardSort);}catch(e){showToast('Could not update name');}}
  function recordGoldEarned(amount){if(amount>0)state.statistics.lifetimeGoldEarned=(state.statistics.lifetimeGoldEarned||0)+amount;}
  function recordGoldSpent(amount){if(amount>0)state.statistics.lifetimeGoldSpent=(state.statistics.lifetimeGoldSpent||0)+amount;}
  function saveGame(show=false){
    state.treeState=Object.fromEntries(trees.map(t=>[t.id,{remaining:t.remaining,respawnAt:t.respawnAt,max:t.max}]));
    state.fishingState=Object.fromEntries(fishingSpots.map(f=>[f.id,{remaining:f.remaining,respawnAt:f.respawnAt}]));
    state.rockState=Object.fromEntries(rocks.map(r=>[r.id,{hp:r.hp,respawnAt:r.respawnAt}]));
    state.enemyState=Object.fromEntries(enemies.map(e=>[e.id,{x:e.x,y:e.y,hp:e.hp,respawnAt:e.respawnAt}]));
    state.lastSavedAt=Date.now(); state.version=VERSION; localStorage.setItem(SAVE_KEY,JSON.stringify(state)); window.IdleCloud?.save(state, show); queueLeaderboardPublish(false); if(show){showToast('Cloud save queued');audioEngine.sfx('save');}
  }
  function showToast(message){ ui.toast.textContent=message;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1800); }
  function worldToScreen(x,y){ return {x:x-camera.x,y:y-camera.y}; }
  function screenToWorld(x,y){ return {x:x+camera.x,y:y+camera.y}; }

  function townAt(x,y){ let best=null,bestD=72; for(const t of towns){const d=Math.hypot(x-t.x,y-t.y);if(d<bestD){best=t;bestD=d;}} return best; }
  function treeAt(x,y){ let best=null,bestD=44; for(const t of trees){if(t.remaining<=0)continue;const d=Math.hypot(x-t.x,y-t.y);if(d<bestD){best=t;bestD=d;}} return best; }
  function rockAt(x,y){ let best=null,bestD=48; for(const r of rocks){if(r.hp<=0)continue;const d=Math.hypot(x-r.x,y-r.y);if(d<bestD){best=r;bestD=d;}} return best; }
  function fishingSpotAt(x,y){ let best=null,bestD=52; for(const f of fishingSpots){if(f.remaining<=0)continue;const d=Math.hypot(x-f.x,y-f.y);if(d<bestD){best=f;bestD=d;}} return best; }

  function maxPlayerHp(){return 10+Math.max(0,levelFromXp(state.skills.fortitude?.xp||0)-10)*2;}
  function weaponData(){
    const key=state.equipment.weapon,item=ITEM_DEFS[key];
    if(!item)return {key:null,style:'melee',ticks:4,accuracy:0,strength:0,range:58};
    const stats=item.stats||{},speed=parseFloat(String(stats['Attack speed']||'4'))||4;
    const ranged=item.type==='Ranged weapon';
    const accuracy=parseInt(String(stats[ranged?'Ranged accuracy':'Accuracy']||'0').replace(/[^-\d]/g,''))||0;
    const strength=parseInt(String(stats[ranged?'Ranged strength':'Strength']||'0').replace(/[^-\d]/g,''))||0;
    const rangeText=parseFloat(String(stats.Range||'0'))||0;
    return {key,style:ranged?'range':'melee',ticks:speed,accuracy,strength,range:ranged?Math.max(120,rangeText*50):58,projectile:item.projectile||'arrow',weaponClass:item.weaponClass||''};
  }
  function armourDefence(){return Object.values(state.equipment).reduce((sum,key)=>sum+(parseInt(String(ITEM_DEFS[key]?.stats?.Defence||'0').replace(/[^-\d]/g,''))||0),0);}
  function armourRangedAccuracy(){return Object.values(state.equipment).reduce((sum,key)=>sum+(parseInt(String(ITEM_DEFS[key]?.stats?.['Ranged accuracy']||'0').replace(/[^-\d]/g,''))||0),0);}
  function equipmentBonus(name){return Object.values(state.equipment).reduce((sum,key)=>sum+(Number(ITEM_DEFS[key]?.bonuses?.[name])||0),0);}
  function playerCombatStats(){const w=weaponData(),skill=w.style==='range'?'range':'melee',level=levelFromXp(state.skills[skill]?.xp||0);return {style:w.style,level,ticks:w.ticks,range:w.range,accuracy:level*2+w.accuracy+(w.style==='range'?armourRangedAccuracy():0)+5,maxHit:Math.max(1,Math.floor(level/8)+w.strength),defence:levelFromXp(state.skills.fortitude?.xp||0)+armourDefence()};}
  function hitChance(attack,defence){return clamp(attack/(attack+defence*1.35+8),.05,.95);}
  function enemyAt(x,y){let best=null,bestD=48;for(const e of enemies){if(e.hp<=0)continue;const d=Math.hypot(x-e.x,y-e.y);if(d<bestD){best=e;bestD=d;}}return best;}
  function remotePlayerAt(x,y){let best=null,bestD=48;for(const p of remotePlayers.values()){const d=Math.hypot(x-(p.renderX??p.x),y-(p.renderY??p.y));if(d<bestD){best=p;bestD=d;}}return best;}
  function beginCombat(enemy){activeEnemy=enemy;queuedEnemy=null;combatElapsed=0;state.summonAttackElapsed=0;enemy.target='player';enemy.returning=false;ui.actionName.textContent=`Fighting ${ENEMY_TYPES[enemy.type].name}`;ui.status.textContent=`Fighting ${ENEMY_TYPES[enemy.type].name}...`;}
  function endCombat(message='Exploring'){if(activeEnemy)activeEnemy.target=null;activeEnemy=null;queuedEnemy=null;combatElapsed=0;state.summonAttackElapsed=0;ui.actionProgress.style.width='0%';ui.actionName.textContent=message;renderCombatHud();}
  function damageFloater(x,y,amount,hit=true){floaters.push({x,y,text:hit?String(amount):'0',life:1.1,damage:true,miss:!hit});}
  function rollEnemyDrops(enemy){
    const d=ENEMY_TYPES[enemy.type],received=[];
    for(const [key,min,max,chance] of d.drops||[]){
      if(Math.random()>chance)continue;const amount=randomInt(min,max);state.inventory[key]=(state.inventory[key]||0)+amount;if(key==='coins')recordGoldEarned(amount);if(UNIQUE_DROP_KEYS.has(key))state.statistics.uniqueDropsFound=(state.statistics.uniqueDropsFound||0)+amount;recordRareDrop(enemy.type,key);received.push(`${ITEM_DEFS[key]?.name||key}${amount>1?` ×${amount}`:''}`);
    }
    const essenceKey=`${enemy.type}Essence`;
    if(SUMMON_DEFS[enemy.type] && !(state.inventory[essenceKey]>0) && Math.random()<1/50){state.inventory[essenceKey]=1;state.statistics.uniqueDropsFound=(state.statistics.uniqueDropsFound||0)+1;recordRareDrop(enemy.type,essenceKey);received.push(ITEM_DEFS[essenceKey].name);}
    renderInventory();
    if(received.length)floaters.push({x:enemy.x,y:enemy.y-72,text:received.slice(0,2).join(' · '),life:2});
    return received;
  }
  function killEnemy(enemy){const name=ENEMY_TYPES[enemy.type].name;state.statistics.totalKills=(state.statistics.totalKills||0)+1;state.statistics.killsByEnemy[enemy.type]=(state.statistics.killsByEnemy[enemy.type]||0)+1;const drops=rollEnemyDrops(enemy);enemy.hp=0;enemy.respawnAt=Date.now()+ENEMY_TYPES[enemy.type].respawn*1000;enemy.target=null;showToast(`${name} defeated${drops.length?` · ${drops.join(', ')}`:''}`);endCombat('Victory');saveGame(false);}
  function playerAttack(enemy){
    const ps=playerCombatStats(),ed=ENEMY_TYPES[enemy.type],hit=Math.random()<hitChance(ps.accuracy,ed.defence);
    if(ps.style==='range')projectiles.push({x:state.player.x,y:state.player.y-18,targetX:enemy.x,targetY:enemy.y-18,life:0,duration:ps.projectile==='stone'?.42:ps.projectile==='heavyArrow'?.32:.26,type:ps.projectile||'arrow'});
    if(!hit){damageFloater(enemy.x,enemy.y-55,0,false);return;}
    const styleBonus=ps.style==='range'?summonBonus('rangeDamage'):summonBonus('meleeDamage'),dmg=randomInt(1,Math.max(1,Math.round(ps.maxHit*(1+styleBonus))));enemy.hp=Math.max(0,enemy.hp-dmg);damageFloater(enemy.x,enemy.y-55,dmg,true);
    const skill=ps.style==='range'?'range':'melee',combatXp=xpWithSummonBonus(skill,dmg*4),fortXp=xpWithSummonBonus('fortitude',dmg*2);awardSkillXp(skill,combatXp);awardSkillXp('fortitude',fortXp);awardSummoningXp(combatXp);renderSkills();
    if(enemy.hp<=0)killEnemy(enemy);
  }
  function summonAttack(enemy){
    const d=summonIsFed()?activeSummonDef():null;if(!d||!enemy||enemy.hp<=0)return;
    const level=levelFromXp(state.skills.summoning?.xp||0),maxHit=Math.max(1,Math.floor(d.baseDamage*(1+level/100))),dmg=randomInt(1,maxHit);
    enemy.hp=Math.max(0,enemy.hp-dmg);floaters.push({x:enemy.x+18,y:enemy.y-42,text:`${d.name} ${dmg}`,life:1.1,damage:true,miss:false});
    if(enemy.hp<=0)killEnemy(enemy);
  }
  function enemyAttack(enemy){
    const d=ENEMY_TYPES[enemy.type],ps=playerCombatStats(),hit=Math.random()<hitChance(d.accuracy,ps.defence);
    if(!hit){damageFloater(state.player.x,state.player.y-58,0,false);return;}
    const dmg=randomInt(1,d.maxHit);state.combat.hp=Math.max(0,state.combat.hp-dmg);damageFloater(state.player.x,state.player.y-58,dmg,true);renderCombatHud();
    if(state.combat.hp<=0){
      defeatActive=true;
      state.statistics.deaths=(state.statistics.deaths||0)+1;
      const defeatedBy=ENEMY_TYPES[enemy.type].name;
      const enemyHp=enemy.hp;
      const enemyMaxHp=enemy.maxHp;
      // End every combat reference before moving the player. This prevents the
      // same enemy (or another nearby aggressive enemy) from immediately
      // reacquiring the player during the current update frame.
      for(const e of enemies){if(e.target==='player')e.target=null;}
      activeEnemy=null;queuedEnemy=null;combatElapsed=0;state.summonAttackElapsed=0;
      activeTree=null;queuedTree=null;activeFishingSpot=null;queuedFishingSpot=null;
      activeRock=null;queuedRock=null;queuedTown=null;queuedNPC=null;actionElapsed=0;
      if(state.autoMode!=='off')setAutoMode('off',false);
      state.player.x=mapX(1900);state.player.y=mapY(2320);state.player.targetX=mapX(1900);state.player.targetY=mapY(2320);
      state.combat.hp=maxPlayerHp();
      ui.actionProgress.style.width='0%';
      ui.actionName.textContent='Defeated';
      ui.status.textContent='You were returned to Starting Town.';
      renderCombatHud();
      saveGame(false);
      if(ui.defeatCount)ui.defeatCount.textContent=state.statistics.deaths.toLocaleString();
      if(ui.defeatMessage)ui.defeatMessage.textContent=`${defeatedBy} defeated you. You kept every item, coin, and point of progress. The enemy remains at ${enemyHp}/${enemyMaxHp} HP.`;
      if(ui.defeatDialog&&!ui.defeatDialog.open)ui.defeatDialog.showModal();
      return true;
    }
    return false;
  }
  function eatFood(){const key=state.equipment.food,item=ITEM_DEFS[key];if(!key||!item?.heal||(state.inventory[key]||0)<1)return;const max=maxPlayerHp();if(state.combat.hp>=max)return showToast('Already at full health');state.inventory[key]--;state.combat.hp=Math.min(max,state.combat.hp+item.heal);if(state.inventory[key]<=0)state.equipment.food=null;showToast(`Ate ${item.name} · +${item.heal} HP`);renderInventory();renderEquipment();renderCombatHud();saveGame(false);}
  function renderCombatHud(){const max=maxPlayerHp();state.combat.hp=clamp(state.combat.hp ?? max,0,max);if(ui.combatHp){ui.combatHp.textContent=`${state.combat.hp}/${max}`;ui.combatHpFill.style.width=`${state.combat.hp/max*100}%`;}const key=state.equipment.food,count=key?(state.inventory[key]||0):0;if(ui.eatButton){ui.eatButton.hidden=!key||count<1;ui.eatButton.textContent=key?`Eat ${ITEM_DEFS[key].name.replace('Cooked ','')}`:'Eat';ui.eatCount.textContent=count;}}

  const AUTO_LABELS={off:'OFF',combat:'COMBAT',woodcutting:'WOODCUTTING',mining:'MINING',fishing:'FISHING',explore:'EXPLORE'};
  function currentBiomeId(){return regionAt(state.player.x,state.player.y).id||'central';}
  function sameBiome(x,y){return regionAt(x,y).id===currentBiomeId();}
  function setAutoMode(mode,announce=true){
    state.autoMode=AUTO_LABELS[mode]?mode:'off';state.autoTargetId=null;state.autoBiomeId=currentBiomeId();autoThinkElapsed=0;
    if(ui.autoMode)ui.autoMode.value=state.autoMode;
    if(ui.autoBadge){ui.autoBadge.hidden=state.autoMode==='off';ui.autoBadge.textContent=`AUTO ${AUTO_LABELS[state.autoMode]}`;}
    if(announce)showToast(state.autoMode==='off'?'Auto action stopped':`Auto ${AUTO_LABELS[state.autoMode].toLowerCase()} enabled`);
    saveGame(false);
  }
  function availableTrees(){const level=levelFromXp(state.skills.woodcutting.xp);return trees.filter(t=>t.remaining>0&&sameBiome(t.x,t.y)&&TREE_TYPES[t.type].level<=level);}
  function availableRocks(){const level=levelFromXp(state.skills.mining.xp);return rocks.filter(r=>r.hp>0&&sameBiome(r.x,r.y)&&ROCK_TYPES[r.type].level<=level);}
  function availableFishing(){const level=levelFromXp(state.skills.fishing.xp);return fishingSpots.filter(f=>f.remaining>0&&sameBiome(f.standX,f.standY)&&FISH_TYPES[f.type].level<=level);}
  function availableEnemies(){return enemies.filter(e=>e.hp>0&&sameBiome(e.homeX,e.homeY));}
  function bestTarget(list,defs){
    const pinned=list.find(x=>x.id===state.autoTargetId);if(pinned)return pinned;
    return list.sort((a,b)=>(defs[b.type]?.level||defs[b.type]?.hp||0)-(defs[a.type]?.level||defs[a.type]?.hp||0)||Math.hypot(state.player.x-a.x,state.player.y-a.y)-Math.hypot(state.player.x-b.x,state.player.y-b.y))[0]||null;
  }
  function queueAutoTarget(mode){
    if(state.autoMode==='off'||activeEnemy||activeTree||activeRock||activeFishingSpot||queuedEnemy||queuedTree||queuedRock||queuedFishingSpot||queuedTown)return;
    if(currentBiomeId()!==state.autoBiomeId){state.autoBiomeId=currentBiomeId();state.autoTargetId=null;}
    let chosen=mode;
    if(mode==='explore'){
      const possible=[];if(availableEnemies().length)possible.push('combat');if(bestOwnedTool('axe')&&availableTrees().length)possible.push('woodcutting');if(bestOwnedTool('pickaxe')&&availableRocks().length)possible.push('mining');if(bestOwnedTool('fishingRod')&&availableFishing().length)possible.push('fishing');
      if(!possible.length)return;chosen=possible[Math.floor(Math.random()*possible.length)];
    }
    if(chosen==='combat'){
      const e=bestTarget(availableEnemies(),ENEMY_TYPES);if(!e)return;const ps=playerCombatStats(),dx=state.player.x-e.x,dy=state.player.y-e.y,d=Math.hypot(dx,dy)||1;queuedEnemy=e;state.player.targetX=e.x+dx/d*Math.max(22,ps.range-8);state.player.targetY=e.y+dy/d*Math.max(22,ps.range-8);ui.actionName.textContent=`Auto approaching ${ENEMY_TYPES[e.type].name}`;
    }else if(chosen==='woodcutting'){
      if(!bestOwnedTool('axe'))return;const t=bestTarget(availableTrees(),TREE_TYPES);if(!t)return;queuedTree=t;const dx=state.player.x-t.x,dy=state.player.y-t.y,d=Math.hypot(dx,dy)||1;state.player.targetX=t.x+dx/d*65;state.player.targetY=t.y+dy/d*65;ui.actionName.textContent=`Auto walking to ${TREE_TYPES[t.type].name}`;
    }else if(chosen==='mining'){
      if(!bestOwnedTool('pickaxe'))return;const r=bestTarget(availableRocks(),ROCK_TYPES);if(!r)return;queuedRock=r;const dx=state.player.x-r.x,dy=state.player.y-r.y,d=Math.hypot(dx,dy)||1;state.player.targetX=r.x+dx/d*72;state.player.targetY=r.y+dy/d*72;ui.actionName.textContent=`Auto walking to ${ROCK_TYPES[r.type].name}`;
    }else if(chosen==='fishing'){
      if(!bestOwnedTool('fishingRod'))return;const f=bestTarget(availableFishing(),FISH_TYPES);if(!f)return;queuedFishingSpot=f;state.player.targetX=f.standX;state.player.targetY=f.standY;ui.actionName.textContent=`Auto walking to ${FISH_TYPES[f.type].name}`;
    }
  }

  function offlineCandidates(mode,biome){
    const inBiome=(x,y)=>regionAt(x,y).id===biome;
    if(mode==='woodcutting')return treeSeeds.filter(x=>inBiome(x[1],x[2])&&TREE_TYPES[x[0]].level<=levelFromXp(state.skills.woodcutting.xp)).map(x=>x[0]);
    if(mode==='mining')return rockSeeds.filter(x=>inBiome(x[1],x[2])&&ROCK_TYPES[x[0]].level<=levelFromXp(state.skills.mining.xp)).map(x=>x[0]);
    if(mode==='fishing')return fishingSeeds.filter(x=>inBiome(x[3],x[4])&&FISH_TYPES[x[0]].level<=levelFromXp(state.skills.fishing.xp)).map(x=>x[0]);
    if(mode==='combat')return enemySeeds.filter(x=>inBiome(x[1],x[2])).map(x=>x[0]);
    return [];
  }
  function addOfflineXp(skill,amount,summary){if(amount<=0)return;const before=state.skills[skill].xp||0;state.skills[skill].xp=before+Math.round(amount);summary.xp[skill]=(summary.xp[skill]||0)+Math.round(amount);}
  function simulateOfflineMode(mode,seconds,biome,summary){
    const types=offlineCandidates(mode,biome);if(!types.length||seconds<2)return;
    if(mode==='woodcutting'||mode==='mining'||mode==='fishing'){
      const defs=mode==='woodcutting'?TREE_TYPES:mode==='mining'?ROCK_TYPES:FISH_TYPES, tool=mode==='woodcutting'?'axe':mode==='mining'?'pickaxe':'fishingRod';if(!bestOwnedTool(tool))return;
      const type=types.sort((a,b)=>defs[b].level-defs[a].level)[0],def=defs[type],duration=gatheringDuration(def,tool),count=Math.max(0,Math.floor(seconds/duration*.82));if(!count)return;
      const item=mode==='woodcutting'?def.log:def.item,gained=xpWithSummonBonus(mode,def.xp)*count;state.inventory[item]=(state.inventory[item]||0)+count;summary.items[item]=(summary.items[item]||0)+count;addOfflineXp(mode,gained,summary);if(summonIsFed())addOfflineXp('summoning',Math.max(1,Math.round(gained/3)),summary);
    }else if(mode==='combat'){
      const type=types.sort((a,b)=>ENEMY_TYPES[a].hp-ENEMY_TYPES[b].hp)[0],enemy=ENEMY_TYPES[type],ps=playerCombatStats(),hitRate=hitChance(ps.accuracy,enemy.defence),avgHit=Math.max(.5,(1+ps.maxHit)/2*hitRate),killTime=Math.max(4,enemy.hp/avgHit*ps.ticks*TICK_SECONDS),kills=Math.min(5000,Math.floor(seconds/killTime*.62));if(!kills)return;
      const dmg=Math.round(kills*enemy.hp),skill=ps.style==='range'?'range':'melee',combatXp=xpWithSummonBonus(skill,dmg*4),fortXp=xpWithSummonBonus('fortitude',dmg*2);addOfflineXp(skill,combatXp,summary);addOfflineXp('fortitude',fortXp,summary);if(summonIsFed())addOfflineXp('summoning',Math.max(1,Math.round(combatXp/3)),summary);
      for(const [key,min,max,chance] of enemy.drops||[]){const qty=Math.floor(kills*((min+max)/2)*chance);if(qty>0){state.inventory[key]=(state.inventory[key]||0)+qty;if(key==='coins')recordGoldEarned(qty);if(UNIQUE_DROP_KEYS.has(key))state.statistics.uniqueDropsFound=(state.statistics.uniqueDropsFound||0)+qty;summary.items[key]=(summary.items[key]||0)+qty;}}
      summary.kills=(summary.kills||0)+kills;state.statistics.totalKills=(state.statistics.totalKills||0)+kills;state.statistics.killsByEnemy[type]=(state.statistics.killsByEnemy[type]||0)+kills;
    }
  }
  function processOfflineProgress(){
    const elapsed=Math.min(8*3600,Math.max(0,(Date.now()-(state.lastSavedAt||Date.now()))/1000));if(elapsed<60||state.autoMode==='off')return;
    const summary={seconds:elapsed,items:{},xp:{},kills:0},biome=state.autoBiomeId||currentBiomeId();
    if(state.autoMode==='explore'){const modes=['combat','woodcutting','mining','fishing'].filter(m=>offlineCandidates(m,biome).length);for(const m of modes)simulateOfflineMode(m,elapsed/Math.max(1,modes.length),biome,summary);}else simulateOfflineMode(state.autoMode,elapsed,biome,summary);
    const rows=[];for(const [k,q] of Object.entries(summary.items))if(q)rows.push(`<div><span>${ITEM_DEFS[k]?.name||k}</span><strong>+${q.toLocaleString()}</strong></div>`);for(const [k,x] of Object.entries(summary.xp))if(x)rows.push(`<div><span>${SKILL_DEFS[k]?.name||k} XP</span><strong>+${x.toLocaleString()}</strong></div>`);if(summary.kills)rows.unshift(`<div><span>Enemies defeated</span><strong>${summary.kills.toLocaleString()}</strong></div>`);if(!rows.length)return;
    const h=Math.floor(elapsed/3600),m=Math.floor(elapsed%3600/60);ui.offlineTime.textContent=`Away ${h?`${h}h `:''}${m}m · ${regionAt(state.player.x,state.player.y).name}`;ui.offlineResults.innerHTML=rows.join('');ui.offlineDialog.showModal();state.lastSavedAt=Date.now();saveGame(false);
  }

  function pointerCanvasPosition(event){
    const rect=canvas.getBoundingClientRect();
    return {
      x:(event.clientX-rect.left)*canvas.width/rect.width,
      y:(event.clientY-rect.top)*canvas.height/rect.height
    };
  }
  function activateHoldWalk(){
    if(!holdWalk.pressed||holdWalk.active||defeatActive)return;
    holdWalk.active=true;
    if(state.autoMode!=='off')setAutoMode('off',false);
    stopAction(true);
    ui.actionName.textContent='Walking';
    ui.status.textContent='Hold and drag to steer. Release to stop.';
  }
  function beginCanvasPointer(event){
    if(holdWalk.pressed)return;
    if(event.pointerType==='mouse'&&event.button!==0)return;
    event.preventDefault();
    const point=pointerCanvasPosition(event);
    holdWalk.pointerId=event.pointerId;
    holdWalk.pressed=true;
    holdWalk.active=false;
    holdWalk.clientX=point.x;
    holdWalk.clientY=point.y;
    holdWalk.startedAt=performance.now();
    canvas.setPointerCapture?.(event.pointerId);
  }
  function moveCanvasPointer(event){
    if(!holdWalk.pressed||event.pointerId!==holdWalk.pointerId)return;
    event.preventDefault();
    const point=pointerCanvasPosition(event);
    holdWalk.clientX=point.x;
    holdWalk.clientY=point.y;
  }
  function finishCanvasPointer(event,cancelled=false){
    if(!holdWalk.pressed||event.pointerId!==holdWalk.pointerId)return;
    event.preventDefault?.();
    const wasActive=holdWalk.active;
    holdWalk.pressed=false;
    holdWalk.active=false;
    holdWalk.pointerId=null;
    if(canvas.hasPointerCapture?.(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    if(wasActive||cancelled){
      stopAction(true);
      ui.status.textContent='Tap the ground, a resource, a creature, or a town.';
      ui.actionName.textContent='Exploring';
      return;
    }
    handlePointer(event);
  }
  function endCanvasPointer(event){finishCanvasPointer(event,false);}
  function cancelCanvasPointer(event){finishCanvasPointer(event,true);}

  function handlePointer(event){
    event.preventDefault(); const rect=canvas.getBoundingClientRect(); const sx=(event.clientX-rect.left)*canvas.width/rect.width, sy=(event.clientY-rect.top)*canvas.height/rect.height; const p=screenToWorld(sx,sy);
    const npc=npcAt(p.x,p.y), town=townAt(p.x,p.y), tree=treeAt(p.x,p.y), rock=rockAt(p.x,p.y), fishingSpot=fishingSpotAt(p.x,p.y), enemy=enemyAt(p.x,p.y), remotePlayer=remotePlayerAt(p.x,p.y); stopAction(false);
    if(remotePlayer){const ps=playerCombatStats(),rx=Number(remotePlayer.x)||remotePlayer.renderX,ry=Number(remotePlayer.y)||remotePlayer.renderY,dist=Math.hypot(state.player.x-rx,state.player.y-ry);queuedPvpUid=remotePlayer.uid;queuedEnemy=queuedTree=queuedRock=queuedFishingSpot=queuedTown=queuedNPC=null;if(dist<=ps.range+10){activePvpUid=remotePlayer.uid;queuedPvpUid=null;state.player.targetX=state.player.x;state.player.targetY=state.player.y;ui.actionName.textContent=`Fighting ${remotePlayer.name||'Wanderer'}`;}else{const dx=state.player.x-rx,dy=state.player.y-ry,len=Math.hypot(dx,dy)||1;state.player.targetX=rx+dx/len*Math.max(28,ps.range-8);state.player.targetY=ry+dy/len*Math.max(28,ps.range-8);ui.actionName.textContent=`Approaching ${remotePlayer.name||'Wanderer'}`;}showToast(`PvP target: ${remotePlayer.name||'Wanderer'} · ${Math.max(0,Number(remotePlayer.hp)||0)}/${Math.max(1,Number(remotePlayer.maxHp)||10)} HP`);return;}
    if(npc){queuedNPC=npc;queuedTown=queuedTree=queuedRock=queuedFishingSpot=queuedEnemy=null;const dx=state.player.x-npc.x,dy=state.player.y-npc.y,d=Math.hypot(dx,dy)||1;state.player.targetX=npc.x+dx/d*48;state.player.targetY=npc.y+dy/d*48;ui.status.textContent=`Walking to ${npc.name}...`;ui.actionName.textContent='Walking';showToast(`${npc.name} · ${npc.role}`);return;}
    if(enemy){if(state.autoMode==='combat')state.autoTargetId=enemy.id;const d=ENEMY_TYPES[enemy.type],ps=playerCombatStats();queuedEnemy=enemy;queuedTree=queuedRock=queuedFishingSpot=queuedTown=null;const dist=Math.hypot(state.player.x-enemy.x,state.player.y-enemy.y);showToast(`${d.name} · ${enemy.hp}/${enemy.maxHp} HP · ${d.behaviour}`);if(dist<=ps.range){beginCombat(enemy);state.player.targetX=state.player.x;state.player.targetY=state.player.y;}else{const dx=state.player.x-enemy.x,dy=state.player.y-enemy.y,len=Math.hypot(dx,dy)||1;state.player.targetX=enemy.x+dx/len*(ps.range-8);state.player.targetY=enemy.y+dy/len*(ps.range-8);ui.actionName.textContent=`Approaching ${d.name}`;}return;}
    if(town){
      queuedTown=town; queuedTree=null; queuedFishingSpot=null; queuedRock=null; const dx=state.player.x-town.x,dy=state.player.y-town.y,d=Math.hypot(dx,dy)||1;
      state.player.targetX=town.x+dx/d*82;state.player.targetY=town.y+dy/d*82;ui.status.textContent=`Walking to ${town.name}...`;ui.actionName.textContent='Walking';showToast(town.name);return;
    }
    if(fishingSpot){
      if(state.autoMode==='fishing')state.autoTargetId=fishingSpot.id;
      const def=FISH_TYPES[fishingSpot.type], level=levelFromXp(state.skills.fishing.xp);
      if(level<def.level){showToast(`${def.name} Fishing Spot · Fishing level ${def.level} required`);return;}
      if(!bestOwnedTool('fishingRod')){showToast(`${def.name} Fishing Spot · A fishing rod is required`);return;}
      queuedFishingSpot=fishingSpot; queuedTree=null; queuedTown=null;
      state.player.targetX=fishingSpot.standX; state.player.targetY=fishingSpot.standY;
      ui.status.textContent=`Walking to ${def.name} fishing spot...`;ui.actionName.textContent='Walking';showToast(`${def.name} Fishing Spot`);return;
    }
    if(rock){
      if(state.autoMode==='mining')state.autoTargetId=rock.id;
      const def=ROCK_TYPES[rock.type], level=levelFromXp(state.skills.mining.xp);
      if(level<def.level){showToast(`${def.name} Rock · Mining level ${def.level} required`);return;}
      if(!bestOwnedTool('pickaxe')){showToast(`${def.name} Rock · A pickaxe is required`);return;}
      queuedRock=rock; queuedTree=null; queuedFishingSpot=null; queuedTown=null;
      const dx=state.player.x-rock.x,dy=state.player.y-rock.y,d=Math.hypot(dx,dy)||1;
      state.player.targetX=rock.x+dx/d*62;state.player.targetY=rock.y+dy/d*62;
      ui.status.textContent=`Walking to ${def.name} rock...`;ui.actionName.textContent='Walking';showToast(`${def.name} Rock`);return;
    }
    if(tree){
      if(state.autoMode==='woodcutting')state.autoTargetId=tree.id;
      const def=TREE_TYPES[tree.type], level=levelFromXp(state.skills.woodcutting.xp);
      if(level<def.level){showToast(`${def.name} Tree · Woodcutting level ${def.level} required`);return;}
      if(!bestOwnedTool('axe')){showToast(`${def.name} Tree · An axe is required`);return;}
      queuedTree=tree; queuedFishingSpot=null; const dx=state.player.x-tree.x,dy=state.player.y-tree.y,d=Math.hypot(dx,dy)||1; const stand=58;
      state.player.targetX=tree.x+dx/d*stand;state.player.targetY=tree.y+dy/d*stand;ui.status.textContent=`Walking to ${def.name} tree...`;ui.actionName.textContent='Walking';return;
    }
    if(!isWalkable(p.x,p.y)){showToast('You cannot walk into the ocean');return;}
    queuedTree=null;queuedFishingSpot=null;queuedRock=null;queuedTown=null;state.player.targetX=p.x;state.player.targetY=p.y;ui.status.textContent='Walking...';ui.actionName.textContent='Exploring';
  }

  function stopAction(stopMovement=true){ if(activeEnemy)activeEnemy.target=null;activeEnemy=null;queuedEnemy=null;activePvpUid=null;queuedPvpUid=null;pvpElapsed=0; activeTree=null;queuedTree=null;activeFishingSpot=null;queuedFishingSpot=null;activeRock=null;queuedRock=null;queuedTown=null;queuedNPC=null;actionElapsed=0;ui.actionProgress.style.width='0%';if(stopMovement){state.player.targetX=state.player.x;state.player.targetY=state.player.y;}ui.actionName.textContent='Exploring'; }
  function beginChopping(tree){ activeTree=tree;queuedTree=null;actionElapsed=0;const def=TREE_TYPES[tree.type], tool=ITEM_DEFS[bestOwnedTool('axe')];ui.actionName.textContent=`Chopping ${def.name}`;ui.status.textContent=`Chopping ${def.name} tree with ${tool?.name || 'an axe'}...`; }
  function beginMining(rock){ activeRock=rock;queuedRock=null;actionElapsed=0;const def=ROCK_TYPES[rock.type],tool=ITEM_DEFS[bestOwnedTool('pickaxe')];ui.actionName.textContent=`Mining ${def.name}`;ui.status.textContent=`Mining ${def.name} with ${tool?.name || 'a pickaxe'}...`; }
  function beginFishing(spot){ activeFishingSpot=spot;queuedFishingSpot=null;actionElapsed=0;const def=FISH_TYPES[spot.type],tool=ITEM_DEFS[bestOwnedTool('fishingRod')];ui.actionName.textContent=`Fishing ${def.name}`;ui.status.textContent=`Fishing for ${def.name} with ${tool?.name || 'a fishing rod'}...`; }
  function awardFish(spot){
    state.statistics.fishCaught=(state.statistics.fishCaught||0)+1;state.statistics.itemsGathered=(state.statistics.itemsGathered||0)+1;
    const def=FISH_TYPES[spot.type],gainedXp=xpWithSummonBonus('fishing',def.xp);state.inventory[def.item]=(state.inventory[def.item]||0)+1;awardSkillXp('fishing',gainedXp);awardSummoningXp(gainedXp);spot.remaining--;audioEngine.sfx('fish');
    floaters.push({x:spot.standX,y:spot.standY-65,text:`+1 ${ITEM_DEFS[def.item].name}  +${gainedXp} XP`,life:1.4});renderInventory();renderSkills();
    if(spot.remaining<=0){spot.respawnAt=Date.now()+randomInt(20,36)*1000;showToast(`${def.name} fishing spot moved`);stopAction(true);}else actionElapsed=0;
  }

  function awardOre(rock){
    state.statistics.rocksMined=(state.statistics.rocksMined||0)+1;state.statistics.itemsGathered=(state.statistics.itemsGathered||0)+1;
    const def=ROCK_TYPES[rock.type],gainedXp=xpWithSummonBonus('mining',def.xp);state.inventory[def.item]=(state.inventory[def.item]||0)+1;awardSkillXp('mining',gainedXp);awardSummoningXp(gainedXp);rock.hp--;audioEngine.sfx('mine');
    floaters.push({x:rock.x,y:rock.y-48,text:`+1 ${ITEM_DEFS[def.item].name}  +${gainedXp} XP`,life:1.4});renderInventory();renderSkills();
    if(rock.hp<=0){rock.respawnAt=Date.now()+def.respawn*1000;showToast(`${def.name} rock depleted`);stopAction(true);}else actionElapsed=0;
  }

  function awardLog(tree){
    state.statistics.treesCut=(state.statistics.treesCut||0)+1;state.statistics.itemsGathered=(state.statistics.itemsGathered||0)+1;
    const def=TREE_TYPES[tree.type]; state.inventory[def.log]=(state.inventory[def.log]||0)+1;const gainedXp=xpWithSummonBonus('woodcutting',Math.max(1,Math.round(def.xp*(1+equipmentBonus('woodcuttingXp')))));awardSkillXp('woodcutting',gainedXp);awardSummoningXp(gainedXp);tree.remaining--;audioEngine.sfx('chop');
    floaters.push({x:tree.x,y:tree.y-55,text:`+1 ${ITEM_DEFS[def.log].name}  +${gainedXp} XP`,life:1.4}); renderInventory();renderSkills();
    if(tree.remaining<=0){tree.respawnAt=Date.now()+def.respawn*1000;showToast(`${def.name} tree depleted`);stopAction(true);} else actionElapsed=0;
  }

  function update(dt){
    animationClock+=dt;
    if(holdWalk.pressed&&!holdWalk.active&&performance.now()-holdWalk.startedAt>=HOLD_WALK_DELAY_MS)activateHoldWalk();
    if(defeatActive){ui.actionProgress.style.width='0%';return;}
    const playerMaxHp=maxPlayerHp();
    if((state.combat.hp??playerMaxHp)<playerMaxHp){hpRegenElapsed+=dt;while(hpRegenElapsed>=30&&state.combat.hp<playerMaxHp){hpRegenElapsed-=30;state.combat.hp=Math.min(playerMaxHp,state.combat.hp+1);renderCombatHud();}}else hpRegenElapsed=0;
    if(state.activeSummon&&(state.summonFoodEnergy||0)>0){
      state.summonFoodElapsed=(state.summonFoodElapsed||0)+dt;
      while(state.summonFoodElapsed>=SUMMON_FOOD_SECONDS_PER_ENERGY&&(state.summonFoodEnergy||0)>0){
        state.summonFoodElapsed-=SUMMON_FOOD_SECONDS_PER_ENERGY;
        state.summonFoodEnergy=Math.max(0,(state.summonFoodEnergy||0)-1);
        if(state.summonFoodEnergy<=0){state.summonFoodElapsed=0;showToast(`${activeSummonDef()?.name||'Your summon'} is hungry and has stopped helping`);renderSkills();saveGame(false);}
      }
    }
    const now=Date.now(); for(const t of trees){if(t.remaining<=0&&t.respawnAt&&now>=t.respawnAt){const def=TREE_TYPES[t.type];t.max=randomInt(def.capacity[0],def.capacity[1]);t.remaining=t.max;t.respawnAt=0;}}
    for(const r of rocks){if(r.hp<=0&&r.respawnAt&&now>=r.respawnAt){r.hp=r.maxHp;r.respawnAt=0;}}
    for(const f of fishingSpots){if(f.remaining<=0&&f.respawnAt&&now>=f.respawnAt){f.remaining=randomInt(12,20);f.respawnAt=0;}}
    for(const e of enemies){const d=ENEMY_TYPES[e.type];if(e.hp<=0){if(e.respawnAt&&now>=e.respawnAt){e.hp=e.maxHp;e.respawnAt=0;e.x=e.homeX;e.y=e.homeY;}continue;}e.wanderElapsed-=dt;if(!e.target&&d.behaviour==='aggressive'&&Math.hypot(e.x-state.player.x,e.y-state.player.y)<d.aggro&&regionAt(e.x,e.y).id===regionAt(state.player.x,state.player.y).id){e.target='player';activeEnemy=e;ui.actionName.textContent=`Attacked by ${d.name}`;}if(e.target==='player'){const dd=Math.hypot(state.player.x-e.x,state.player.y-e.y);if(regionAt(e.x,e.y).id!==regionAt(e.homeX,e.homeY).id||Math.hypot(e.x-e.homeX,e.y-e.homeY)>520){e.target=null;e.returning=true;}else if(dd>52){const step=Math.min(dd-48,135*dt);e.x+=(state.player.x-e.x)/dd*step;e.y+=(state.player.y-e.y)/dd*step;}e.attackElapsed+=dt;if(dd<=62&&e.attackElapsed>=d.ticks*TICK_SECONDS){e.attackElapsed=0;enemyAttack(e);}}else if(e.returning){const dd=Math.hypot(e.homeX-e.x,e.homeY-e.y);if(dd<5){e.x=e.homeX;e.y=e.homeY;e.returning=false;}else{const step=Math.min(dd,120*dt);e.x+=(e.homeX-e.x)/dd*step;e.y+=(e.homeY-e.y)/dd*step;}}else if(e.wanderElapsed<=0){e.wanderElapsed=randomInt(2,5);const a=Math.random()*Math.PI*2,r=Math.random()*70;e.wanderX=e.homeX+Math.cos(a)*r;e.wanderY=e.homeY+Math.sin(a)*r;}else{const dd=Math.hypot(e.wanderX-e.x,e.wanderY-e.y);if(dd>3){const step=Math.min(dd,45*dt);e.x+=(e.wanderX-e.x)/dd*step;e.y+=(e.wanderY-e.y)/dd*step;}}}
    const p=state.player;
    if(holdWalk.active){
      const playerScreen=worldToScreen(p.x,p.y),dx=holdWalk.clientX-playerScreen.x,dy=holdWalk.clientY-playerScreen.y,dist=Math.hypot(dx,dy);
      p.targetX=p.x;p.targetY=p.y;
      if(dist>HOLD_WALK_DEADZONE){
        const strength=clamp((dist-HOLD_WALK_DEADZONE)/(HOLD_WALK_FULL_SPEED_DISTANCE-HOLD_WALK_DEADZONE),0,1);
        const move=190*(1+equipmentBonus('moveSpeed')+summonBonus('moveSpeed'))*strength*dt;
        const nx=p.x+dx/dist*move,ny=p.y+dy/dist*move;
        if(isWalkable(nx,ny)){p.x=nx;p.y=ny;}
      }
    }else{
      const dx=p.targetX-p.x,dy=p.targetY-p.y,dist=Math.hypot(dx,dy);
      if(dist>2){const move=Math.min(dist,190*(1+equipmentBonus('moveSpeed')+summonBonus('moveSpeed'))*dt),nx=p.x+dx/dist*move,ny=p.y+dy/dist*move;if(isWalkable(nx,ny)){p.x=nx;p.y=ny;}else{p.targetX=p.x;p.targetY=p.y;queuedTree=null;queuedFishingSpot=null;queuedRock=null;queuedTown=null;queuedNPC=null;showToast('That route is blocked');}}
      else {p.x=p.targetX;p.y=p.targetY;if(queuedPvpUid){const rp=remotePlayers.get(queuedPvpUid);if(rp&&Math.hypot(p.x-Number(rp.x),p.y-Number(rp.y))<=playerCombatStats().range+12){activePvpUid=queuedPvpUid;queuedPvpUid=null;pvpElapsed=0;ui.actionName.textContent=`Fighting ${rp.name||'Wanderer'}`;}}else if(queuedNPC && Math.hypot(p.x-queuedNPC.x,p.y-queuedNPC.y)<70){const npc=queuedNPC;queuedNPC=null;openNPCConversation(npc);}else if(queuedEnemy && queuedEnemy.hp>0 && Math.hypot(p.x-queuedEnemy.x,p.y-queuedEnemy.y)<=playerCombatStats().range+12){beginCombat(queuedEnemy);}else if(queuedTown && Math.hypot(p.x-queuedTown.x,p.y-queuedTown.y)<105){const town=queuedTown;queuedTown=null;openTown(town);}else if(queuedRock && queuedRock.hp>0 && Math.hypot(p.x-queuedRock.x,p.y-queuedRock.y)<90)beginMining(queuedRock);else if(queuedFishingSpot && queuedFishingSpot.remaining>0 && Math.hypot(p.x-queuedFishingSpot.standX,p.y-queuedFishingSpot.standY)<20)beginFishing(queuedFishingSpot);else if(queuedTree && queuedTree.remaining>0 && Math.hypot(p.x-queuedTree.x,p.y-queuedTree.y)<78)beginChopping(queuedTree);else if(!activeTree&&!activeFishingSpot&&!activeRock&&!activeEnemy){ui.status.textContent='Tap the ground, a resource, a creature, or a town.';ui.actionName.textContent='Exploring';}}
    }
    if(activePvpUid){const target=remotePlayers.get(activePvpUid),ps=playerCombatStats();if(!target){activePvpUid=null;pvpElapsed=0;}else{const dist=Math.hypot(p.x-Number(target.x),p.y-Number(target.y));if(dist>ps.range+30){queuedPvpUid=activePvpUid;activePvpUid=null;}else{pvpElapsed+=dt;ui.actionProgress.style.width=`${Math.min(100,pvpElapsed/(ps.ticks*TICK_SECONDS)*100)}%`;if(pvpElapsed>=ps.ticks*TICK_SECONDS){pvpElapsed=0;const chance=hitChance(ps.accuracy,(Number(target.combatLevel)||1)+5);if(Math.random()<chance){const dmg=randomInt(1,Math.max(1,ps.maxHit));window.IdleMultiplayer?.attackPlayer(target.uid,{damage:dmg}).catch(e=>console.warn('PvP attack failed',e));damageFloater(Number(target.x),Number(target.y)-55,dmg,true);audioEngine.sfx('combat');}else damageFloater(Number(target.x),Number(target.y)-55,0,false);}}}}else if(activeEnemy){
      const ps=playerCombatStats(),summon=summonIsFed()?activeSummonDef():null,dist=Math.hypot(p.x-activeEnemy.x,p.y-activeEnemy.y);if(activeEnemy.hp<=0)endCombat('Victory');else if(dist>ps.range+25){queuedEnemy=activeEnemy;activeEnemy=null;}else{combatElapsed+=dt;if(summon)state.summonAttackElapsed=(state.summonAttackElapsed||0)+dt;ui.actionProgress.style.width=`${Math.min(100,combatElapsed/(ps.ticks*TICK_SECONDS)*100)}%`;if(combatElapsed>=ps.ticks*TICK_SECONDS){combatElapsed=0;playerAttack(activeEnemy);}if(activeEnemy&&summon&&state.summonAttackElapsed>=summon.ticks*TICK_SECONDS){state.summonAttackElapsed=0;summonAttack(activeEnemy);}}
    } else if(activeTree){
      if(activeTree.remaining<=0 || Math.hypot(p.x-activeTree.x,p.y-activeTree.y)>85)stopAction(false);
      else {const def=TREE_TYPES[activeTree.type],duration=gatheringDuration(def,'axe');actionElapsed+=dt;ui.actionProgress.style.width=`${Math.min(100,actionElapsed/duration*100)}%`;if(actionElapsed>=duration)awardLog(activeTree);}
    } else if(activeRock){
      if(activeRock.hp<=0 || Math.hypot(p.x-activeRock.x,p.y-activeRock.y)>92)stopAction(false);
      else {const def=ROCK_TYPES[activeRock.type],duration=gatheringDuration(def,'pickaxe');actionElapsed+=dt;ui.actionProgress.style.width=`${Math.min(100,actionElapsed/duration*100)}%`;if(actionElapsed>=duration)awardOre(activeRock);}
    } else if(activeFishingSpot){
      if(activeFishingSpot.remaining<=0 || Math.hypot(p.x-activeFishingSpot.standX,p.y-activeFishingSpot.standY)>30)stopAction(false);
      else {const def=FISH_TYPES[activeFishingSpot.type],duration=gatheringDuration(def,'fishingRod');actionElapsed+=dt;ui.actionProgress.style.width=`${Math.min(100,actionElapsed/duration*100)}%`;if(actionElapsed>=duration)awardFish(activeFishingSpot);}
    } else ui.actionProgress.style.width='0%';
    autoThinkElapsed+=dt;if(autoThinkElapsed>=.65){autoThinkElapsed=0;queueAutoTarget(state.autoMode);}
    const region=regionAt(p.x,p.y);ui.region.textContent=region.name;if(document.getElementById('map')?.classList.contains('active'))drawMiniMap();
    const tx=clamp(p.x-canvas.width/2,0,WORLD.width-canvas.width),ty=clamp(p.y-canvas.height/2,0,WORLD.height-canvas.height),follow=1-Math.pow(.018,dt);camera.x+=(tx-camera.x)*follow;camera.y+=(ty-camera.y)*follow;
    for(let i=floaters.length-1;i>=0;i--){floaters[i].life-=dt;floaters[i].y-=24*dt;if(floaters[i].life<=0)floaters.splice(i,1);}
    for(let i=projectiles.length-1;i>=0;i--){projectiles[i].life+=dt;if(projectiles[i].life>=projectiles[i].duration)projectiles.splice(i,1);}
  }

  function smoothPath(points){
    const s=points.map(([x,y])=>worldToScreen(x,y));ctx.beginPath();ctx.moveTo(s[0].x,s[0].y);
    for(let i=0;i<s.length;i++){const p0=s[(i-1+s.length)%s.length],p1=s[i],p2=s[(i+1)%s.length],p3=s[(i+2)%s.length];const c1={x:p1.x+(p2.x-p0.x)/6,y:p1.y+(p2.y-p0.y)/6},c2={x:p2.x-(p3.x-p1.x)/6,y:p2.y-(p3.y-p1.y)/6};ctx.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,p2.x,p2.y);}ctx.closePath();
  }
  function straightPath(points){const s=points.map(([x,y])=>worldToScreen(x,y));ctx.beginPath();ctx.moveTo(s[0].x,s[0].y);for(const p of s.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();}
  function fillSmooth(points,color,stroke=null,width=1){smoothPath(points);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function fillStraight(points,color,stroke=null,width=1){straightPath(points);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function drawTileTexture(points,straight=false){ctx.save();(straight?straightPath:smoothPath)(points);ctx.clip();const tile=54,minX=Math.floor(camera.x/tile)*tile,minY=Math.floor(camera.y/tile)*tile;for(let y=minY;y<camera.y+canvas.height+tile;y+=tile)for(let x=minX;x<camera.x+canvas.width+tile;x+=tile){const s=worldToScreen(x,y);ctx.fillStyle=((x/tile+y/tile)%2)?'rgba(255,255,255,.025)':'rgba(0,0,0,.025)';ctx.fillRect(s.x,s.y,tile,tile);}ctx.restore();}
  function drawWater(w){const s=worldToScreen(w.x,w.y);ctx.beginPath();ctx.ellipse(s.x,s.y,w.rx,w.ry,0,0,Math.PI*2);ctx.fillStyle=w.color;ctx.fill();ctx.strokeStyle='rgba(176,220,231,.48)';ctx.lineWidth=5;ctx.stroke();ctx.save();ctx.beginPath();ctx.ellipse(s.x,s.y,w.rx-8,w.ry-8,0,0,Math.PI*2);ctx.clip();ctx.strokeStyle='rgba(220,245,250,.34)';ctx.lineWidth=3;const drift=(animationClock*18)%54;for(let yy=-w.ry-54;yy<w.ry+54;yy+=42){const wave=Math.sin(animationClock*1.8+yy*.03)*10;ctx.beginPath();ctx.moveTo(s.x-w.rx*.64+drift,s.y+yy+wave);ctx.lineTo(s.x-w.rx*.18+drift,s.y+yy+wave);ctx.stroke();ctx.beginPath();ctx.moveTo(s.x+w.rx*.02-drift,s.y+yy+18-wave);ctx.lineTo(s.x+w.rx*.5-drift,s.y+yy+18-wave);ctx.stroke();}ctx.restore();} 
  function drawFishShape(type,x,y,color){
    ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.strokeStyle='#223640';ctx.lineWidth=2;
    const tail=(tx,ty,size)=>{ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx+size,ty-size*.72);ctx.lineTo(tx+size,ty+size*.72);ctx.closePath();ctx.fill();};
    if(type==='minnow'){
      ctx.beginPath();ctx.ellipse(0,0,7,3,0,0,Math.PI*2);ctx.fill();tail(6,0,5);
    }else if(type==='crappie'){
      ctx.beginPath();ctx.ellipse(0,0,9,6,0,0,Math.PI*2);ctx.fill();tail(7,0,6);ctx.fillStyle='rgba(30,55,60,.38)';ctx.fillRect(-3,-5,2,10);ctx.fillRect(2,-5,2,10);
    }else if(type==='bass'){
      ctx.beginPath();ctx.ellipse(0,0,12,5,0,0,Math.PI*2);ctx.fill();tail(10,0,7);ctx.fillStyle='#223640';ctx.fillRect(-5,-1,10,2);
    }else if(type==='catfish'){
      ctx.beginPath();ctx.ellipse(0,0,12,6,0,0,Math.PI*2);ctx.fill();tail(10,0,7);ctx.strokeStyle=color;ctx.lineWidth=1.5;for(const yy of [-2,2]){ctx.beginPath();ctx.moveTo(-10,yy);ctx.lineTo(-20,yy-4);ctx.stroke();}
    }else if(type==='tuna'){
      ctx.beginPath();ctx.ellipse(0,0,15,6,0,0,Math.PI*2);ctx.fill();tail(13,0,9);ctx.beginPath();ctx.moveTo(-2,-5);ctx.lineTo(4,-11);ctx.lineTo(7,-4);ctx.closePath();ctx.fill();
    }else if(type==='grouper'){
      ctx.beginPath();ctx.ellipse(0,0,14,9,0,0,Math.PI*2);ctx.fill();tail(11,0,8);ctx.fillStyle='rgba(70,35,25,.32)';for(const [dx,dy] of [[-5,-3],[1,3],[5,-2]]){ctx.beginPath();ctx.arc(dx,dy,1.5,0,Math.PI*2);ctx.fill();}
    }else if(type==='shark'){
      ctx.beginPath();ctx.moveTo(-17,0);ctx.quadraticCurveTo(-2,-9,14,-3);ctx.lineTo(14,3);ctx.quadraticCurveTo(-2,9,-17,0);ctx.fill();tail(12,0,11);ctx.beginPath();ctx.moveTo(-2,-5);ctx.lineTo(4,-15);ctx.lineTo(8,-4);ctx.closePath();ctx.fill();ctx.fillStyle='#eef7fa';ctx.fillRect(-12,0,18,3);
    }
    ctx.restore();
  }
  function drawFishingSpot(f){if(f.remaining<=0)return;const bob=Math.sin(animationClock*3+f.phase)*4,s=worldToScreen(f.x,f.y+bob);if(s.x<-70||s.y<-70||s.x>canvas.width+70||s.y>canvas.height+70)return;const d=FISH_TYPES[f.type];ctx.strokeStyle='rgba(233,249,255,.72)';ctx.lineWidth=3;for(let i=0;i<2;i++){ctx.beginPath();ctx.arc(s.x,s.y,12+i*11+Math.sin(animationClock*2+f.phase)*2,0,Math.PI*2);ctx.stroke();}drawFishShape(f.type,s.x,s.y,d.color);ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(8,18,24,.82)';ctx.fillStyle='#e7f8ff';ctx.strokeText(d.name,s.x,s.y-28);ctx.fillText(d.name,s.x,s.y-28);ctx.textAlign='start';if(activeFishingSpot===f){ctx.strokeStyle='#f0cc64';ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x,s.y,38,0,Math.PI*2);ctx.stroke();}}
  function drawWorldDecorItem(item){const s=worldToScreen(item.x,item.y);if(s.x<-45||s.y<-45||s.x>canvas.width+45||s.y>canvas.height+45)return;const z=item.scale,w=Math.sin(animationClock*1.4+item.phase)*1.2;ctx.save();ctx.translate(s.x,s.y);ctx.scale(z,z);ctx.lineCap='round';switch(item.kind){case'flower':ctx.strokeStyle='#3e6f3e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(w,-7);ctx.stroke();ctx.fillStyle=['#f0c7d0','#f2df7f','#d9c6ef'][Math.floor(item.phase)%3];for(let a=0;a<6;a++){ctx.beginPath();ctx.arc(w+Math.cos(a)*4,-9+Math.sin(a)*4,2.4,0,Math.PI*2);ctx.fill();}break;case'grass':case'dryGrass':case'duneGrass':case'snowTuft':ctx.strokeStyle=item.kind==='grass'?'#4c824a':item.kind==='snowTuft'?'#e7f3f4':item.kind==='duneGrass'?'#a8874a':'#776c45';ctx.lineWidth=2;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*2,7);ctx.lineTo(i*3+w,-7-Math.abs(i));ctx.stroke();}break;case'bush':case'frozenBush':ctx.fillStyle=item.kind==='bush'?'#3f7848':'#8aa6a2';for(const [x,y,r] of [[-7,0,7],[0,-5,9],[8,1,7]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}break;case'fern':case'broadleaf':ctx.strokeStyle='#2e6845';ctx.lineWidth=3;for(let a=-1.2;a<=1.2;a+=.4){ctx.beginPath();ctx.moveTo(0,8);ctx.quadraticCurveTo(Math.sin(a)*9,-3,Math.sin(a)*16,-14);ctx.stroke();}break;case'vine':ctx.strokeStyle='#2d6840';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,10);ctx.quadraticCurveTo(8,0,-6,-14);ctx.stroke();break;case'mushroom':ctx.fillStyle='#eadfc2';ctx.fillRect(-2,-1,4,9);ctx.fillStyle='#c86655';ctx.beginPath();ctx.arc(0,-2,7,Math.PI,0);ctx.fill();break;case'reeds':ctx.strokeStyle='#79905b';ctx.lineWidth=2;for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(i*3,9);ctx.lineTo(i*3+w,-11-Math.abs(i));ctx.stroke();}ctx.fillStyle='#6d5035';ctx.fillRect(-8,-13,3,7);ctx.fillRect(6,-16,3,7);break;case'mudPatch':ctx.fillStyle='rgba(62,69,52,.38)';ctx.beginPath();ctx.ellipse(0,4,15,7,.2,0,Math.PI*2);ctx.fill();break;case'lily':ctx.fillStyle='#5d8f65';ctx.beginPath();ctx.arc(0,2,8,0,Math.PI*2);ctx.lineTo(0,2);ctx.fill();ctx.fillStyle='#e7b6cc';ctx.beginPath();ctx.arc(2,-1,3,0,Math.PI*2);ctx.fill();break;case'deadTree':case'stump':ctx.strokeStyle='#654d39';ctx.lineWidth=item.kind==='deadTree'?5:8;ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(0,-11);if(item.kind==='deadTree'){ctx.moveTo(0,-3);ctx.lineTo(-9,-9);ctx.moveTo(0,-7);ctx.lineTo(8,-14);}ctx.stroke();break;case'cactus':ctx.strokeStyle='#4f8056';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(0,-13);ctx.moveTo(0,-3);ctx.lineTo(-8,-3);ctx.lineTo(-8,-9);ctx.moveTo(0,1);ctx.lineTo(8,1);ctx.lineTo(8,-6);ctx.stroke();break;case'iceShard':ctx.fillStyle='#b9e5ee';ctx.beginPath();ctx.moveTo(-6,8);ctx.lineTo(-1,-14);ctx.lineTo(5,8);ctx.closePath();ctx.fill();break;case'stonePile':case'snowRock':case'desertRock':ctx.fillStyle=item.kind==='snowRock'?'#c7d6d8':item.kind==='desertRock'?'#9d7954':'#77756d';for(const [x,y,r]of[[-6,4,6],[2,1,8],[9,5,5]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}break;case'bones':case'skull':ctx.strokeStyle='#ddd4b5';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-9,-5);ctx.lineTo(9,6);ctx.moveTo(-8,6);ctx.lineTo(8,-5);ctx.stroke();if(item.kind==='skull'){ctx.fillStyle='#ddd4b5';ctx.beginPath();ctx.arc(0,-5,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#4f4538';ctx.fillRect(-4,-7,2,2);ctx.fillRect(2,-7,2,2);}break;}ctx.restore();}
  function drawNPC(npc){const s=worldToScreen(npc.x,npc.y),bob=Math.sin(animationClock*2+npc.x*.01)*1.2;if(s.x<-55||s.y<-75||s.x>canvas.width+55||s.y>canvas.height+75)return;ctx.save();ctx.translate(s.x,s.y+bob);ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(0,25,15,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d2a071';ctx.fillRect(-8,-14,16,16);ctx.fillStyle=npc.color;ctx.fillRect(-11,2,22,24);ctx.fillStyle='#29303a';ctx.fillRect(-9,26,7,13);ctx.fillRect(2,26,7,13);ctx.fillStyle='#3b302a';ctx.fillRect(-9,-20,18,7);ctx.fillStyle='#f4e8bf';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(12,16,18,.85)';ctx.strokeText(npc.name,0,-30);ctx.fillText(npc.name,0,-30);ctx.fillStyle='#d7e6e8';ctx.font='9px system-ui';ctx.strokeText(npc.role,0,-20);ctx.fillText(npc.role,0,-20);ctx.fillStyle='#f0cc64';ctx.beginPath();ctx.arc(15,-20,4+Math.sin(animationClock*3+npc.x)*.7,0,Math.PI*2);ctx.fill();ctx.textAlign='start';ctx.restore();}
  function drawTown(t){const s=worldToScreen(t.x,t.y);if(s.x<-100||s.y<-100||s.x>canvas.width+100||s.y>canvas.height+100)return;ctx.fillStyle='rgba(35,31,27,.2)';ctx.fillRect(s.x-54,s.y-38,108,76);ctx.strokeStyle='#e0d0a5';ctx.lineWidth=3;ctx.strokeRect(s.x-50,s.y-34,100,68);ctx.fillStyle='#b8895b';ctx.fillRect(s.x-25,s.y-17,50,34);ctx.fillStyle='#6b4c34';ctx.fillRect(s.x-6,s.y+1,12,16);ctx.fillStyle='#f0e9d2';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText(t.name,s.x,s.y-45);ctx.textAlign='start';}
  function drawTree(t){if(t.remaining<=0)return;const sway=Math.sin(animationClock*1.6+t.x*.01)*1.8+(activeTree===t?Math.sin(animationClock*12)*3:0);const s=worldToScreen(t.x+sway,t.y);if(s.x<-60||s.y<-90||s.x>canvas.width+60||s.y>canvas.height+60)return;const d=TREE_TYPES[t.type],scale=t.type==='redwood'?1.28:t.type==='mahogany'?1.12:1;ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(s.x-24*scale,s.y+22,48*scale,9);ctx.strokeStyle='rgba(26,25,22,.72)';ctx.lineWidth=2;ctx.fillStyle=d.trunk;ctx.fillRect(s.x-7*scale,s.y-1,14*scale,34*scale);ctx.fillStyle=d.leaves;if(t.type==='arcticPine'){for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(s.x,s.y-55+i*17);ctx.lineTo(s.x-27*scale+i*2,s.y-10+i*14);ctx.lineTo(s.x+27*scale-i*2,s.y-10+i*14);ctx.closePath();ctx.fill();}}else{ctx.fillRect(s.x-25*scale,s.y-44,50*scale,35*scale);ctx.fillRect(s.x-17*scale,s.y-56,34*scale,20*scale);if(t.type==='cherry'){ctx.fillStyle='#e6a1a9';ctx.fillRect(s.x-18,s.y-49,7,7);ctx.fillRect(s.x+11,s.y-39,6,6);}}ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(10,12,14,.8)';ctx.fillStyle='#eef5d4';ctx.strokeText(d.name,s.x,s.y-67);ctx.fillText(d.name,s.x,s.y-67);ctx.textAlign='start';if(activeTree===t){ctx.strokeStyle='#f0cc64';ctx.lineWidth=3;ctx.strokeRect(s.x-31*scale,s.y-61,62*scale,96);}}
  function drawRock(r){if(r.hp<=0)return;const s=worldToScreen(r.x,r.y);if(s.x<-60||s.y<-60||s.x>canvas.width+60||s.y>canvas.height+60)return;const d=ROCK_TYPES[r.type],ratio=r.hp/r.maxHp,shake=activeRock===r?Math.sin(animationClock*15)*2:0;ctx.save();ctx.translate(s.x+shake,s.y);ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(-25,18,50,8);ctx.fillStyle=d.color;ctx.beginPath();ctx.moveTo(-24,15);ctx.lineTo(-18,-18);ctx.lineTo(2,-30);ctx.lineTo(24,-12);ctx.lineTo(28,15);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(30,35,40,.6)';ctx.lineWidth=2;if(ratio<.8){ctx.beginPath();ctx.moveTo(-4,-26);ctx.lineTo(2,-8);ctx.lineTo(-8,7);ctx.stroke();}if(ratio<.5){ctx.beginPath();ctx.moveTo(17,-13);ctx.lineTo(5,-1);ctx.lineTo(15,12);ctx.stroke();}ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(10,12,14,.8)';ctx.fillStyle='#f1ead8';ctx.strokeText(d.name,s.x,s.y-38);ctx.fillText(d.name,s.x,s.y-38);ctx.textAlign='start';if(activeRock===r){ctx.strokeStyle='#f0cc64';ctx.lineWidth=3;ctx.strokeRect(-32,-36,64,58);ctx.fillStyle='#1a2028';ctx.fillRect(-28,-44,56,6);ctx.fillStyle='#68c77e';ctx.fillRect(-28,-44,56*ratio,6);}ctx.restore();}
  function equipmentColor(key){
    if(!key)return null;
    const colors={stone:'#8c9299',copper:'#b9784f',iron:'#707986',silver:'#c7d0d7',pyrite:'#c79c38',gold:'#d7b83f',crystal:'#82d9e9',cloth:'#7b8798',cedar:'#7b5a38',oak:'#6f5635',willow:'#80966a',beech:'#a09a62',cherry:'#b86f77',arcticPine:'#78a797',mahogany:'#7b4030',redwood:'#6d382a'};
    return Object.entries(colors).find(([prefix])=>key.startsWith(prefix))?.[1]||'#9aa4b0';
  }
  function drawEquippedWeapon(s){
    const key=state.equipment.weapon;if(!key)return;const item=ITEM_DEFS[key],color=equipmentColor(key),working=activeTree||activeRock;
    const ps=playerCombatStats();
    const attackDuration=Math.max(.3,ps.ticks*TICK_SECONDS);
    const attackPhase=activeEnemy?Math.min(1,combatElapsed/attackDuration):activePvpUid?Math.min(1,pvpElapsed/attackDuration):0;
    let combatAngle=-Math.PI/4;
    if(activeEnemy||activePvpUid){
      // Hold the weapon upright, snap it downward, then return cleanly.
      if(attackPhase<.58)combatAngle=-Math.PI/4;
      else if(attackPhase<.72){const t=(attackPhase-.58)/.14;combatAngle=-Math.PI/4+(Math.PI*1.02)*(t*t*(3-2*t));}
      else{const t=(attackPhase-.72)/.28;combatAngle=(-Math.PI/4+Math.PI*1.02)+(Math.PI/4-(-Math.PI/4+Math.PI*1.02))*(t*t*(3-2*t));}
    }
    ctx.save();ctx.translate(s.x+13,s.y+10);ctx.rotate(working?(-.8+Math.sin(animationClock*8)*.65):((activeEnemy||activePvpUid)?combatAngle:-.35));ctx.lineCap='round';
    if(['shortbow','longbow','recurve'].includes(item.weaponClass)||key.endsWith('Bow')){ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(9,-4,15,-1.25,1.25);ctx.stroke();ctx.strokeStyle='#e5d9af';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(13,-18);ctx.lineTo(13,10);ctx.stroke();}
    else if(['sword','spear'].includes(item.weaponClass)||key.endsWith('Sword')||key.endsWith('Blade')||key.endsWith('Spear')){ctx.strokeStyle='#76543b';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(7,-5);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(7,-5);ctx.lineTo(29,-27);ctx.stroke();ctx.strokeStyle='#e7eef2';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(9,-7);ctx.lineTo(29,-27);ctx.stroke();}
    else if(item.weaponClass==='dagger'||key.endsWith('Dagger')){ctx.strokeStyle='#76543b';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(6,-4);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(6,-4);ctx.lineTo(18,-16);ctx.stroke();}
    else {ctx.strokeStyle='#795739';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(20,-15);ctx.stroke();ctx.fillStyle=color;ctx.fillRect(15,-21,11,10);}
    ctx.restore();
  }
  function drawEnemy(e){
    if(e.hp<=0)return;const d=ENEMY_TYPES[e.type],s=worldToScreen(e.x,e.y),bob=Math.sin(animationClock*3+e.homeX*.01)*1.5;
    if(s.x<-90||s.y<-90||s.x>canvas.width+90||s.y>canvas.height+90)return;
    ctx.save();ctx.translate(s.x,s.y+bob);ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(0,24,23,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=d.color;ctx.strokeStyle='rgba(19,22,24,.82)';ctx.lineWidth=2.5;
    const shape=d.shape;
    if(shape==='rabbit'){
      ctx.beginPath();ctx.ellipse(0,8,16,13,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(11,-4,10,0,Math.PI*2);ctx.fill();ctx.stroke();
      for(const x of [6,14]){ctx.beginPath();ctx.ellipse(x,-19,4,15,-.12,0,Math.PI*2);ctx.fill();ctx.stroke();}
      ctx.fillStyle='#f0b5b5';ctx.fillRect(8,-18,2,10);ctx.fillRect(16,-18,2,10);ctx.fillStyle='#20242a';ctx.fillRect(14,-7,3,3);ctx.fillStyle='#eee';ctx.beginPath();ctx.arc(-15,5,5,0,Math.PI*2);ctx.fill();
    }else if(shape==='rat'){
      ctx.beginPath();ctx.ellipse(0,7,21,12,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(16,1,9,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.arc(13,-7,5,0,Math.PI*2);ctx.fill();ctx.arc(20,-5,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ba8f92';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-18,10);ctx.quadraticCurveTo(-34,16,-40,4);ctx.stroke();ctx.fillStyle='#20242a';ctx.fillRect(19,-1,3,3);
    }else if(shape==='deer'){
      ctx.beginPath();ctx.ellipse(-4,7,21,13,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillRect(10,-15,9,23);ctx.beginPath();ctx.ellipse(18,-17,11,8,-.2,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillRect(-15,16,5,19);ctx.fillRect(5,16,5,19);ctx.strokeStyle='#6b4d32';ctx.lineWidth=2;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(18+side*3,-22);ctx.lineTo(18+side*8,-34);ctx.lineTo(18+side*13,-29);ctx.moveTo(18+side*8,-34);ctx.lineTo(18+side*5,-39);ctx.stroke();}ctx.fillStyle='#20242a';ctx.fillRect(22,-19,3,3);
    }else if(shape==='serpent'){
      ctx.strokeStyle=d.color;ctx.lineWidth=11;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-24,15);ctx.quadraticCurveTo(-10,-12,4,10);ctx.quadraticCurveTo(17,27,25,-4);ctx.stroke();ctx.fillStyle=d.color;ctx.beginPath();ctx.ellipse(25,-9,11,8,-.25,0,Math.PI*2);ctx.fill();ctx.fillStyle='#20242a';ctx.fillRect(29,-11,3,3);
    }else if(shape==='spider'){
      ctx.lineWidth=4;ctx.strokeStyle=d.color;for(const side of [-1,1])for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(side*7,-3+i*5);ctx.lineTo(side*(18+i*2),-11+i*9);ctx.lineTo(side*(25+i*2),-6+i*10);ctx.stroke();}ctx.fillStyle=d.color;ctx.beginPath();ctx.ellipse(-5,5,12,14,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(8,1,9,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#f3d56c';ctx.fillRect(10,-2,2,2);ctx.fillRect(14,0,2,2);
    }else if(shape==='slime'){
      ctx.beginPath();ctx.moveTo(-21,18);ctx.quadraticCurveTo(-20,-9,0,-12);ctx.quadraticCurveTo(20,-9,21,18);ctx.quadraticCurveTo(11,23,0,18);ctx.quadraticCurveTo(-11,23,-21,18);ctx.fill();ctx.stroke();ctx.fillStyle='#20242a';ctx.fillRect(-7,2,4,5);ctx.fillRect(6,2,4,5);ctx.strokeStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.arc(-7,-4,5,3.6,5.5);ctx.stroke();
    }else if(shape==='crocodile'){
      ctx.beginPath();ctx.ellipse(-5,7,29,12,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(39,1);ctx.lineTo(43,8);ctx.lineTo(17,12);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-29,6);ctx.lineTo(-47,-5);ctx.lineTo(-36,13);ctx.closePath();ctx.fill();ctx.stroke();for(const x of [-17,-3,10]){ctx.beginPath();ctx.moveTo(x,-3);ctx.lineTo(x+5,-11);ctx.lineTo(x+9,-2);ctx.fill();}ctx.fillStyle='#20242a';ctx.fillRect(32,2,3,3);
    }else if(shape==='humanoid'||shape==='skeleton'||shape==='wraith'||shape==='troll'){
      const big=shape==='troll'?1.35:1;ctx.beginPath();ctx.arc(0,-15*big,10*big,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillRect(-13*big,-5,26*big,28*big);ctx.fillRect(-11*big,22,7*big,17*big);ctx.fillRect(4*big,22,7*big,17*big);ctx.fillStyle='#20242a';ctx.fillRect(-5,-18,3,3);ctx.fillRect(4,-18,3,3);if(shape==='wraith'){ctx.fillStyle=d.color;ctx.globalAlpha=.68;ctx.beginPath();ctx.moveTo(-14,18);ctx.lineTo(-20,42);ctx.lineTo(-7,35);ctx.lineTo(0,43);ctx.lineTo(8,34);ctx.lineTo(20,42);ctx.lineTo(14,18);ctx.fill();ctx.globalAlpha=1;}
    }else if(shape==='golem'||shape==='gorilla'||shape==='lurker'){
      const big=shape==='gorilla'?1.25:1.1;ctx.fillRect(-18*big,-17,36*big,34);ctx.strokeRect(-18*big,-17,36*big,34);ctx.fillRect(-29*big,-9,11*big,32);ctx.fillRect(18*big,-9,11*big,32);ctx.fillRect(-14*big,16,10*big,20);ctx.fillRect(4*big,16,10*big,20);ctx.fillStyle='#20242a';ctx.fillRect(-7,-10,4,4);ctx.fillRect(5,-10,4,4);
    }else if(shape==='scorpion'){
      ctx.beginPath();ctx.ellipse(0,7,18,11,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle=d.color;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-15,5);ctx.quadraticCurveTo(-35,-8,-23,-25);ctx.quadraticCurveTo(-16,-32,-10,-23);ctx.stroke();ctx.fillStyle=d.color;for(const side of [-1,1])for(let i=0;i<3;i++){ctx.fillRect(side*(15+i*3),4+i*3,12*side,3);}ctx.fillRect(14,-2,17,6);ctx.fillStyle='#20242a';ctx.fillRect(11,1,3,3);
    }else if(shape==='dragon'){
      ctx.beginPath();ctx.ellipse(-6,6,28,16,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(24,-9,17,12,-.2,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-17,-2);ctx.lineTo(-43,-31);ctx.lineTo(-36,3);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(2,-4);ctx.lineTo(31,-37);ctx.lineTo(23,5);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-28,7);ctx.lineTo(-50,-10);ctx.lineTo(-39,15);ctx.closePath();ctx.fill();ctx.fillStyle='#20242a';ctx.fillRect(29,-12,4,4);
    }else{
      ctx.beginPath();ctx.ellipse(-4,7,22,13,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(16,-3,12,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillRect(-15,16,5,16);ctx.fillRect(5,16,5,16);ctx.beginPath();ctx.moveTo(-24,5);ctx.lineTo(-34,-7);ctx.lineTo(-29,10);ctx.closePath();ctx.fill();ctx.fillStyle='#20242a';ctx.fillRect(20,-6,3,3);
    }
    ctx.restore();ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(10,12,14,.88)';ctx.fillStyle='#f5ead0';ctx.strokeText(d.name,s.x,s.y-52);ctx.fillText(d.name,s.x,s.y-52);ctx.textAlign='start';const ratio=e.hp/e.maxHp;ctx.fillStyle='rgba(8,10,13,.8)';ctx.fillRect(s.x-26,s.y-43,52,6);ctx.fillStyle=ratio>.5?'#67c77b':ratio>.25?'#d9b653':'#cc6268';ctx.fillRect(s.x-26,s.y-43,52*ratio,6);if(activeEnemy===e){ctx.strokeStyle='#efcc61';ctx.lineWidth=2;ctx.strokeRect(s.x-32,s.y-50,64,82);}
  }


  let chatUnread=0,chatMessageCount=0;
  function chatIsOpen(){return document.getElementById('chat')?.classList.contains('active');}
  function renderChatMessages(messages){
    const box=document.getElementById('chatMessages');if(!box)return;
    const nearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<45,newCount=Math.max(0,messages.length-chatMessageCount);
    box.innerHTML=messages.length?messages.map(message=>`<article class="chat-message ${message.uid===window.IdleCloud?.user?.uid?'mine':''}"><strong>${escapeHtml(message.name||'Wanderer')}</strong><span>${escapeHtml(message.text||'')}</span></article>`).join(''):'<p class="chat-empty">No messages yet.</p>';
    if(nearBottom||chatIsOpen())box.scrollTop=box.scrollHeight;
    if(!chatIsOpen()&&newCount){chatUnread=Math.min(99,chatUnread+newCount);updateChatUnread();}
    chatMessageCount=messages.length;
  }
  function updateChatUnread(){const badge=document.getElementById('chatUnread');if(!badge)return;badge.hidden=!chatUnread;badge.textContent=String(chatUnread);}
  function initializeChat(){
    document.getElementById('chatForm')?.addEventListener('submit',async event=>{event.preventDefault();const input=document.getElementById('chatInput'),text=input?.value?.trim();if(!text)return;input.disabled=true;try{await window.IdleMultiplayer?.sendChat(text);input.value='';}catch(error){console.warn('Chat send failed',error);showToast('Chat message failed');}finally{input.disabled=false;input.focus();}});
    try{window.IdleMultiplayer?.connectChat(renderChatMessages);}catch(error){console.warn('Could not open family chat',error);}
  }

  function multiplayerPayload(){
    const dx=state.player.x-multiplayerLastX,dy=state.player.y-multiplayerLastY;
    if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>.15)multiplayerFacing=dx<0?'left':'right';else if(Math.abs(dy)>.15)multiplayerFacing=dy<0?'up':'down';
    multiplayerLastX=state.player.x;multiplayerLastY=state.player.y;
    return {name:window.IdleCloud?.user?.displayName||'Wanderer',x:state.player.x,y:state.player.y,targetX:state.player.targetX,targetY:state.player.targetY,facing:multiplayerFacing,moving:Math.hypot(state.player.targetX-state.player.x,state.player.targetY-state.player.y)>3,activity:ui.actionName?.textContent||'Exploring',area:regionAt(state.player.x,state.player.y).name,combatLevel:combatLevel(),equipment:{...state.equipment},activeSummon:state.activeSummon||'',summonFed:summonIsFed(),hp:state.combat.hp,maxHp:maxPlayerHp()};
  }
  function renderOnlinePlayers(){
    const rows=[{name:window.IdleCloud?.user?.displayName||'You',combatLevel:combatLevel(),area:regionAt(state.player.x,state.player.y).name,self:true},...Array.from(remotePlayers.values())];
    ui.onlineCount.textContent=`${rows.length} online`;
    ui.onlinePlayers.innerHTML=rows.map(p=>`<div class="online-player-row"><i></i><span>${escapeHtml(p.name||'Wanderer')}${p.self?' (you)':''}<small> · ${escapeHtml(p.area||'Unknown')}</small></span><small>Lv ${Number(p.combatLevel)||1}</small></div>`).join('');
  }
  function receiveRemotePlayers(players){
    const seen=new Set();
    for(const [uid,p] of Object.entries(players||{})){seen.add(uid);const old=remotePlayers.get(uid);remotePlayers.set(uid,{uid,...p,renderX:(old?.renderX ?? Number(p.x) ?? 3000),renderY:(old?.renderY ?? Number(p.y) ?? 3000)});}
    for(const uid of remotePlayers.keys())if(!seen.has(uid))remotePlayers.delete(uid);
    renderOnlinePlayers();
  }
  function receivePvpAttack(attack){const damage=Math.max(1,Math.floor(Number(attack.damage)||1));state.combat.hp=Math.max(0,(state.combat.hp??maxPlayerHp())-damage);damageFloater(state.player.x,state.player.y-58,damage,true);showToast(`${attack.attackerName||'A player'} hit you for ${damage}`);renderCombatHud();if(state.combat.hp<=0){state.statistics.deaths=(state.statistics.deaths||0)+1;state.player.x=3000;state.player.y=3237;state.player.targetX=3000;state.player.targetY=3237;state.combat.hp=maxPlayerHp();stopAction(true);showToast(`Defeated by ${attack.attackerName||'another player'} · no items lost`);saveGame(false);}}
  async function startMultiplayer(){
    if(!window.IdleMultiplayer)return;
    try{await window.IdleMultiplayer.connect(multiplayerPayload(),receiveRemotePlayers);window.IdleMultiplayer.connectPvp?.(receivePvpAttack);multiplayerReady=true;ui.familyWorldHud?.classList.remove('multiplayer-error');renderOnlinePlayers();showToast('Joined the private family world');}
    catch(error){console.warn('Could not join family world',error);ui.familyWorldHud?.classList.add('multiplayer-error');ui.onlineCount.textContent='World offline';}
  }
  function updateMultiplayer(now){if(!multiplayerReady||now-multiplayerLastSent<120)return;multiplayerLastSent=now;window.IdleMultiplayer?.update(multiplayerPayload()).catch(e=>console.warn('Presence update failed',e));}
  function drawRemotePlayer(p){
    p.renderX+=(Number(p.x)-p.renderX)*.22;p.renderY+=(Number(p.y)-p.renderY)*.22;const s=worldToScreen(p.renderX,p.renderY);if(s.x<-60||s.y<-90||s.x>canvas.width+60||s.y>canvas.height+70)return;
    const bob=p.moving?Math.sin(animationClock*10+(p.renderX+p.renderY)*.01)*2:0,eq=p.equipment||{},bodyColor=equipmentColor(eq.body),headColor=equipmentColor(eq.head),legsColor=equipmentColor(eq.legs),bootsColor=equipmentColor(eq.boots);
    ctx.save();ctx.globalAlpha=.94;ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(s.x-13,s.y+18+bob,26,7);ctx.fillStyle='#d4a16e';ctx.fillRect(s.x-10,s.y-8+bob,20,16);ctx.fillStyle=bodyColor||'#7b62c7';ctx.fillRect(s.x-13,s.y+8+bob,26,25);const step=p.moving&&Math.sin(animationClock*11)>0?3:0;ctx.fillStyle=legsColor||'#252831';ctx.fillRect(s.x-11,s.y+33+bob+step,8,14);ctx.fillRect(s.x+3,s.y+33+bob-step,8,14);ctx.fillStyle=bootsColor||'#20262b';ctx.fillRect(s.x-12,s.y+45+bob+step,9,7);ctx.fillRect(s.x+3,s.y+45+bob-step,9,7);ctx.fillStyle=headColor||'#342b42';ctx.fillRect(s.x-11,s.y-18+bob,22,10);ctx.globalAlpha=1;ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='rgba(10,12,15,.88)';ctx.fillStyle='#f4f0d6';const name=String(p.name||'Wanderer').slice(0,24);ctx.strokeText(name,s.x,s.y-31+bob);ctx.fillText(name,s.x,s.y-31+bob);ctx.font='10px system-ui';ctx.fillStyle='#c4d3dc';ctx.strokeText(`Lv ${Number(p.combatLevel)||1}`,s.x,s.y-19+bob);ctx.fillText(`Lv ${Number(p.combatLevel)||1}`,s.x,s.y-19+bob);ctx.textAlign='start';ctx.restore();drawRemoteSummon(p);
  }
  function drawRemoteSummon(p){if(!p.activeSummon)return;const d=SUMMON_DEFS[p.activeSummon],enemy=ENEMY_TYPES[p.activeSummon]||{};if(!d)return;const angle=animationClock*1.05+(p.renderX+p.renderY)*.002,x=p.renderX-34+Math.cos(angle)*6,y=p.renderY+28+Math.sin(angle)*3,s=worldToScreen(x,y);ctx.save();ctx.translate(s.x,s.y);ctx.globalAlpha=p.summonFed===false?.45:.9;ctx.fillStyle=enemy.color||'#b8d7de';ctx.strokeStyle='#17232b';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,3,14,9,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(10,-3,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(7,12,16,.9)';ctx.fillStyle='#d9fbff';ctx.strokeText(d.name,0,-18);ctx.fillText(d.name,0,-18);ctx.restore();}
  function drawRemotePlayers(){for(const player of remotePlayers.values())drawRemotePlayer(player);}

  function drawSummon(){
    const d=activeSummonDef();if(!d)return;
    const angle=animationClock*1.15,x=state.player.x-39+Math.cos(angle)*7,y=state.player.y+29+Math.sin(angle)*4,s=worldToScreen(x,y),enemy=ENEMY_TYPES[state.activeSummon]||{},color=enemy.color||'#b8d7de',pulse=.5+Math.sin(animationClock*4)*.12;
    ctx.save();ctx.translate(s.x,s.y);ctx.globalAlpha=.22;ctx.fillStyle='#8ee9ff';ctx.beginPath();ctx.ellipse(0,8,25+pulse*5,12+pulse*2,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.75;ctx.strokeStyle='#b9f4ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,1,18+pulse*3,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<3;i++){const a=animationClock*(1.2+i*.18)+i*2.1;ctx.fillStyle='rgba(202,248,255,.8)';ctx.fillRect(Math.cos(a)*20-1,Math.sin(a)*10-7,3,3);}
    ctx.globalAlpha=.96;ctx.fillStyle=color;ctx.strokeStyle='#17232b';ctx.lineWidth=2.5;const shape=enemy.shape;
    if(shape==='serpent'){ctx.strokeStyle=color;ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-15,8);ctx.quadraticCurveTo(-4,-11,7,6);ctx.quadraticCurveTo(15,14,18,-5);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(18,-8,8,6,-.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#17232b';ctx.lineWidth=2;ctx.stroke();}
    else if(shape==='spider'||shape==='scorpion'){ctx.strokeStyle=color;ctx.lineWidth=3;for(const side of [-1,1])for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(side*5,i*4);ctx.lineTo(side*(16+i*2),-5+i*7);ctx.stroke();}ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,4,11,9,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#17232b';ctx.stroke();}
    else if(shape==='dragon'){ctx.beginPath();ctx.ellipse(-3,3,17,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-8,-2);ctx.lineTo(-25,-20);ctx.lineTo(-20,5);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(3,-3);ctx.lineTo(21,-22);ctx.lineTo(16,6);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(15,-6,10,7,-.2,0,Math.PI*2);ctx.fill();ctx.stroke();}
    else if(['golem','gorilla','lurker','troll'].includes(shape)){ctx.fillRect(-13,-11,26,23);ctx.strokeRect(-13,-11,26,23);ctx.fillRect(-20,-5,7,22);ctx.fillRect(13,-5,7,22);ctx.fillRect(-10,12,7,12);ctx.fillRect(3,12,7,12);}
    else{ctx.beginPath();ctx.ellipse(-3,5,15,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(10,-3,8,0,Math.PI*2);ctx.fill();ctx.stroke();if(shape==='rabbit'){for(const ex of [7,13]){ctx.beginPath();ctx.ellipse(ex,-14,3,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();}}}
    ctx.fillStyle='#142028';ctx.fillRect(13,-6,3,3);ctx.globalAlpha=1;ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(7,12,16,.9)';ctx.fillStyle='#d9fbff';ctx.strokeText(d.name,0,-28);ctx.fillText(d.name,0,-28);ctx.textAlign='start';ctx.restore();
  }
  function drawPlayer(){
    const working=activeTree||activeFishingSpot||activeRock,bounce=working?Math.sin(animationClock*8)*2:0,s=worldToScreen(state.player.x,state.player.y+bounce);
    const eq=state.equipment,bodyColor=equipmentColor(eq.body),headColor=equipmentColor(eq.head),legsColor=equipmentColor(eq.legs),bootsColor=equipmentColor(eq.boots),shieldColor=equipmentColor(eq.shield);
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(s.x-13,s.y+18,26,7);
    ctx.fillStyle='#d4a16e';ctx.fillRect(s.x-10,s.y-8,20,16);
    ctx.fillStyle=bodyColor||'#537fc4';ctx.fillRect(s.x-13,s.y+8,26,25);
    if(bodyColor){ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(s.x-10,s.y+11,20,4);ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(s.x-2,s.y+8,4,25);}
    const walking=Math.hypot(state.player.targetX-state.player.x,state.player.targetY-state.player.y)>3,step=walking&&Math.sin(animationClock*11)>0?3:0;
    ctx.fillStyle=legsColor||'#20262b';ctx.fillRect(s.x-11,s.y+33+step,8,14);ctx.fillRect(s.x+3,s.y+33-step,8,14);
    ctx.fillStyle=bootsColor||'#20262b';ctx.fillRect(s.x-12,s.y+45+step,9,7);ctx.fillRect(s.x+3,s.y+45-step,9,7);
    if(headColor){ctx.fillStyle=headColor;ctx.fillRect(s.x-12,s.y-20,24,9);ctx.fillRect(s.x-9,s.y-26,18,7);ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(s.x-7,s.y-24,10,2);}else{ctx.fillStyle='#20242a';ctx.fillRect(s.x-11,s.y-18,22,10);}
    if(shieldColor){ctx.fillStyle=shieldColor;ctx.beginPath();ctx.moveTo(s.x-18,s.y+8);ctx.lineTo(s.x-8,s.y+5);ctx.lineTo(s.x-7,s.y+25);ctx.lineTo(s.x-18,s.y+32);ctx.lineTo(s.x-27,s.y+25);ctx.lineTo(s.x-26,s.y+5);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=2;ctx.stroke();}
    if(activeTree||activeRock){const swing=Math.sin(animationClock*8)*.65;ctx.save();ctx.translate(s.x+11,s.y+8);ctx.rotate(-.8+swing);ctx.strokeStyle=activeRock?'#7b8590':'#8a6540';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(21,-15);ctx.stroke();ctx.restore();}else drawEquippedWeapon(s);
    if(activeFishingSpot){const fs=worldToScreen(activeFishingSpot.x,activeFishingSpot.y);ctx.strokeStyle='#dbc68b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(s.x+12,s.y+8);ctx.quadraticCurveTo((s.x+fs.x)/2,s.y-28,fs.x,fs.y);ctx.stroke();ctx.fillStyle='#f1d267';ctx.fillRect(fs.x-2,fs.y-2,4,4);}
  }
  function drawProjectiles(){for(const p of projectiles){const t=Math.min(1,p.life/p.duration),ease=t*(2-t),x=p.x+(p.targetX-p.x)*ease,y=p.y+(p.targetY-p.y)*ease-(p.type==='stone'?Math.sin(Math.PI*t)*28:0),s=worldToScreen(x,y);ctx.save();ctx.translate(s.x,s.y);const angle=Math.atan2(p.targetY-p.y,p.targetX-p.x);ctx.rotate(angle);if(p.type==='stone'){ctx.fillStyle='#8d9297';ctx.strokeStyle='#34393e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();ctx.stroke();}else{ctx.strokeStyle=p.type==='heavyArrow'?'#d8ecf4':'#f1dfad';ctx.lineWidth=p.type==='heavyArrow'?4:2;ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(10,0);ctx.stroke();ctx.fillStyle=p.type==='heavyArrow'?'#9fd4e7':'#d7c07d';ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(4,-4);ctx.lineTo(4,4);ctx.closePath();ctx.fill();}ctx.restore();}}
  function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#397f9f';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='rgba(210,240,248,.22)';ctx.lineWidth=3;for(let y=-30+(animationClock*12)%46;y<canvas.height+40;y+=46){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y+10);ctx.stroke();}fillSmooth(continent,'#72ae61','#d5c68b',8);drawTileTexture(continent);for(const r of regions){fillStraight(r.points,r.color,'rgba(55,50,38,.2)',3);drawTileTexture(r.points,true);}for(const w of waters)drawWater(w);for(const item of worldDecor)drawWorldDecorItem(item);for(const f of fishingSpots)drawFishingSpot(f);for(const t of towns)drawTown(t);for(const npc of worldNPCs)drawNPC(npc);for(const t of trees)drawTree(t);for(const r of rocks)drawRock(r);for(const e of enemies)drawEnemy(e);drawRemotePlayers();drawSummon();drawPlayer();drawProjectiles();for(const f of floaters){const s=worldToScreen(f.x,f.y);ctx.globalAlpha=Math.min(1,f.life*1.4);ctx.fillStyle=f.damage?(f.miss?'#d7dbe2':'#ff6b6b'):'#fff4b8';ctx.strokeStyle='rgba(20,20,20,.8)';ctx.lineWidth=4;ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.strokeText(f.text,s.x,s.y);ctx.fillText(f.text,s.x,s.y);ctx.textAlign='start';ctx.globalAlpha=1;}}

  function openPanel(name){if(name==='leaderboards')renderLeaderboards(leaderboardSort);if(name==='bestiary')renderBestiary();if(name==='chat'){chatUnread=0;updateChatUnread();requestAnimationFrame(()=>{const box=document.getElementById('chatMessages');if(box)box.scrollTop=box.scrollHeight;document.getElementById('chatInput')?.focus();});}document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.panel===name));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===name));}
  function itemCategory(key,item){
    if(item.summonType)return 'summons';
    if(item.slot==='weapon'||/weapon|bow/i.test(item.type))return 'weapons';
    if(['head','body','legs','boots','shield','cape','ring'].includes(item.slot)||/armour|armor|ring|cape|shield/i.test(item.type))return 'armour';
    if(item.tool||/tool|axe|pickaxe|fishing rod/i.test(item.type))return 'tools';
    if(COOKING_DATA[key]||Object.values(COOKING_DATA).some(d=>d.cooked===key)||/food|raw meat|cooked/i.test(item.type))return 'food';
    if(/log|ore|bar|material|drop|hide|bone|scale|gel|silk|cloth|stone/i.test(item.type+' '+item.name))return 'materials';
    return 'other';
  }
  function renderHeader(){
    if(ui.coinCount)ui.coinCount.textContent=(state.inventory.coins||0).toLocaleString();
  }
  function renderInventory(){
    const categories=[['all','All'],['weapons','Weapons'],['armour','Armour'],['food','Food'],['materials','Materials'],['tools','Tools'],['summons','Summons'],['other','Other']];
    const equippedCounts=Object.values(state.equipment).filter(Boolean).reduce((counts,key)=>{counts[key]=(counts[key]||0)+1;return counts;},{});
    const owned=Object.entries(state.inventory).map(([k,q])=>[k,Math.max(0,q-(equippedCounts[k]||0))]).filter(([k,q])=>q>0&&k!=='coins'&&ITEM_DEFS[k]);
    const shown=inventoryFilter==='all'?owned:owned.filter(([k])=>itemCategory(k,ITEM_DEFS[k])===inventoryFilter);
    ui.inventory.innerHTML=`<div class="inventory-filters">${categories.map(([k,label])=>`<button class="inventory-filter ${inventoryFilter===k?'active':''}" data-filter="${k}">${label}</button>`).join('')}</div>${shown.length?`<div class="item-grid">${shown.map(([k,q])=>`<button class="item" data-item="${k}"><strong>${ITEM_DEFS[k].name}</strong><span>×${q}</span><small>${ITEM_DEFS[k].type}</small></button>`).join('')}</div>`:`<div class="empty-state"><strong>No ${inventoryFilter==='all'?'items':inventoryFilter} owned</strong><span>Items in this category will appear here.</span></div>`}`;
    ui.inventory.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{inventoryFilter=b.dataset.filter;renderInventory();}));
    ui.inventory.querySelectorAll('[data-item]').forEach(b=>b.addEventListener('click',()=>showItem(b.dataset.item)));
    renderHeader();
  }
  function renderSkills(){
    ui.skills.innerHTML=`<button id="summonFoodBoxButton" class="summon-food-card ${summonIsFed()?'fed':'hungry'}"><span>Companion Food Box</span><strong>${Math.floor(state.summonFoodEnergy||0)} energy · ${summonFoodDuration()}</strong><small>${activeSummonDef()?(summonIsFed()?`${activeSummonDef().name} is helping`:`${activeSummonDef().name} is hungry — no attacks, bonuses, or XP`):'Summon a companion, then keep provisions stocked here.'}</small></button><div class="skill-grid">${Object.entries(SKILL_DEFS).map(([key,def])=>{const xp=state.skills[key]?.xp||0,level=levelFromXp(xp),progress=currentLevelProgress(xp);return `<button class="skill-card ${key==='woodcutting'?'active-skill':''}" data-skill="${key}"><strong>${def.name}</strong><span>Level ${level} · ${xp.toLocaleString()} XP</span><div class="progress-track"><div class="progress-fill" style="width:${progress*100}%"></div></div></button>`}).join('')}</div>`;
    ui.skills.querySelectorAll('[data-skill]').forEach(b=>b.addEventListener('click',()=>showSkill(b.dataset.skill)));
    document.getElementById('summonFoodBoxButton')?.addEventListener('click',openSummonFoodBox);
  }
  function showSkill(key){const def=SKILL_DEFS[key],xp=state.skills[key]?.xp||0,level=levelFromXp(xp),next=level>=100?xpForLevel(100):xpForLevel(level+1);selectedItemKey=null;ui.itemType.textContent='Skill';ui.itemName.textContent=def.name;ui.itemDescription.textContent=def.description;ui.itemStats.innerHTML=`<div><span>Level</span><strong>${level}${level>=100?' · MAX':''}</strong></div><div><span>Experience</span><strong>${xp.toLocaleString()} XP</strong></div>${level<100?`<div><span>Next level</span><strong>${Math.max(0,next-xp).toLocaleString()} XP</strong></div>`:''}`;if(key==='summoning'){ui.itemAction.hidden=false;ui.itemAction.disabled=false;ui.itemAction.textContent='Open Food Box';ui.itemAction.dataset.action='foodBox';}else{ui.itemAction.hidden=true;ui.itemAction.dataset.action='';}ui.dialog.showModal();}
  let currentTown = null;
  function totalLevel(){return Object.values(state.skills).reduce((sum,v)=>sum+levelFromXp(v?.xp||0),0);}
  function openTown(town){
    currentTown=town;ui.townName.textContent=town.name;ui.townDescription.textContent=town.description;
    const services=[['NPCs','Talk to local residents and view rotating requests.'],['Crafting Table','Create tools, weapons, armour, bows, and refined materials.'],['Forge Upgrades','Combine duplicate weapons or armour into stronger +1, +2, and +3 equipment.'],['Cooking Fire','Cook raw fish and meat instantly.'],['Player-Owned Home','Build permanent rooms and family features.'],['Shop','Buy supplies or sell any owned item.'],['Notice Board','View this town’s rotating quests.'],['Inn','Hear a short local rumour and rest.']];
    ui.townServices.innerHTML=services.map(([name,description])=>`<button class="town-service" data-service="${name}"><strong>${name}</strong><span>${description}</span></button>`).join('');
    ui.townServices.querySelectorAll('[data-service]').forEach(b=>b.addEventListener('click',()=>{
      const service=b.dataset.service;ui.townDialog.close();
      if(service==='Crafting Table')return openCrafting(town);
      if(service==='Forge Upgrades')return openForge(town);
      if(service==='Cooking Fire')return openCooking(town);
      if(service==='NPCs')return openNPCs(town);
      if(service==='Notice Board')return openQuests(town);
      if(service==='Player-Owned Home')return openPOH(town);
      if(service==='Shop')return openShop(town);
      if(service==='Inn')return openInn(town);
    }));
    ui.townDialog.showModal();ui.status.textContent=`Visiting ${town.name}`;ui.actionName.textContent='In town';
  }
  function forgeCandidates(){
    return Object.entries(state.inventory).filter(([key,count])=>count>=2&&ITEM_DEFS[key]?.slot&&ITEM_DEFS[key].slot!=='food'&&equipmentUpgradeLevel(key)<3);
  }
  function openForge(town){
    const candidates=forgeCandidates();
    const html=candidates.length?candidates.map(([key,count])=>{
      const item=ITEM_DEFS[key],level=equipmentUpgradeLevel(key),next=level+1,needsShard=next===3,can=count>=2&&(!needsShard||(state.inventory.temperingShard||0)>=1);
      return `<article class="service-card ${can?'':'locked'}"><div><strong>${item.name} → ${ITEM_DEFS[`${equipmentBaseKey(key)}${UPGRADE_SUFFIX}${next}`]?.name}</strong><span>Combine 2 identical items${needsShard?' + 1 Tempering Shard':''}</span><small>Owned ×${count}${needsShard?` · Shards ${(state.inventory.temperingShard||0)}/1`:''}</small></div><button data-forge="${key}" ${can?'':'disabled'}>Upgrade</button></article>`;
    }).join(''):'<div class="empty-state"><strong>No upgrade pair ready</strong><span>Bring two identical weapons or armour pieces. +3 also requires a Tempering Shard from powerful creatures.</span></div>';
    openService('Town Forge',`${town.name} Forge`,'Two identical pieces become one upgraded item. Attack speed and range stay the same; combat stats improve.',html);
    ui.serviceContent.querySelectorAll('[data-forge]').forEach(button=>button.addEventListener('click',()=>{
      const source=button.dataset.forge,level=equipmentUpgradeLevel(source),next=level+1,target=`${equipmentBaseKey(source)}${UPGRADE_SUFFIX}${next}`;
      if((state.inventory[source]||0)<2||!ITEM_DEFS[target])return;
      if(next===3&&(state.inventory.temperingShard||0)<1)return showToast('A Tempering Shard is required');
      state.inventory[source]-=2;state.inventory[target]=(state.inventory[target]||0)+1;
      if(next===3)state.inventory.temperingShard--;
      const slot=Object.keys(state.equipment).find(slot=>state.equipment[slot]===source);if(slot)state.equipment[slot]=target;
      awardSkillXp('crafting',Math.max(15,next*25));showToast(`${ITEM_DEFS[target].name} forged`);audioEngine.sfx('craft');renderAll();saveGame(false);openForge(town);
    }));
  }
  function openService(type,title,description,html){ui.serviceType.textContent=type;ui.serviceTitle.textContent=title;ui.serviceDescription.textContent=description||'';ui.serviceContent.innerHTML=html;ui.serviceDialog.showModal();}
  function cookingEntries(){return Object.entries(COOKING_DATA).filter(([raw])=>(state.inventory[raw]||0)>0);}
  function openCooking(town){
    openService('Cooking Fire',`${town.name} Cooking Fire`,'Cook raw fish and meat instantly. Cooking XP is awarded for every item cooked.','<div data-cooking-menu></div>');
    renderCookingMenu(town);
  }
  function renderCookingMenu(town){
    const menu=ui.serviceContent.querySelector('[data-cooking-menu]')||ui.serviceContent;
    const level=levelFromXp(state.skills.cooking?.xp||0),entries=cookingEntries();
    menu.innerHTML=entries.length?entries.map(([raw,d])=>{
      const owned=state.inventory[raw]||0,ok=level>=d.level;
      return `<article class="service-card ${ok?'':'locked'}"><div><strong>${d.name}</strong><span>Level ${d.level} · +${d.xp} XP each</span><small>${ITEM_DEFS[raw].name} ×${owned}</small></div><div class="service-actions"><button data-cook="${raw}" data-amount="1" ${ok?'':'disabled'}>Cook 1</button><button data-cook="${raw}" data-amount="all" ${ok?'':'disabled'}>Cook All (${owned})</button></div></article>`;
    }).join(''):'<div class="empty-state"><strong>No raw food</strong><span>Catch fish or defeat creatures before using the fire.</span></div>';
    menu.querySelectorAll('[data-cook]').forEach(button=>button.addEventListener('click',()=>{
      const raw=button.dataset.cook;
      const amount=button.dataset.amount==='all'?(state.inventory[raw]||0):1;
      cookFood(raw,amount,town);
    }));
  }
  function cookFood(raw,amount,town){
    const d=COOKING_DATA[raw],level=levelFromXp(state.skills.cooking?.xp||0);
    if(!d)return;
    if(level<d.level){showToast(`Cooking level ${d.level} required`);return;}
    const count=Math.min(Math.max(0,amount),state.inventory[raw]||0);
    if(count<1){showToast('You do not have any raw food to cook');return;}
    state.inventory[raw]-=count;
    state.inventory[d.cooked]=(state.inventory[d.cooked]||0)+count;state.statistics.foodCooked=(state.statistics.foodCooked||0)+count;
    const gainedXp=Math.max(1,Math.round(d.xp*count*XP_RATE));
    awardSkillXp('cooking',gainedXp);
    awardSummoningXp(gainedXp);
    showToast(`Cooked ${d.name.replace('Cooked ','')}${count>1?` ×${count}`:''}`);audioEngine.sfx('cook');
    renderInventory();renderSkills();renderCookingMenu(town);saveGame(false);
  }
  function dayKey(){return new Date().toISOString().slice(0,10);}
  function townQuest(town,index=0){const pool=[['Gather cedar logs','cedarLog',8,45],['Catch minnows','rawMinnow',6,50],['Mine stone','stone',8,55],['Bring copper ore','copperOre',4,75],['Bring cooked fish','cookedMinnow',4,80]];let seed=[...town.name+dayKey()].reduce((a,c)=>a+c.charCodeAt(0),index*17);const q=pool[seed%pool.length];return{id:`${town.name}-${dayKey()}-${index}`,title:q[0],item:q[1],amount:q[2],reward:q[3]};}
  function openNPCConversation(npc){const list=TOWN_NPCS[npc.town.name]||[],index=Math.max(0,list.findIndex(n=>n.name===npc.name)),q=townQuest(npc.town,index);openService(npc.role,npc.name,npc.intro,`<article class="service-card npc-dialogue"><strong>${npc.role}</strong><span>${npc.dialog}</span></article>${questCard(q,npc.town)}`);bindQuestButtons(npc.town);} function openNPCs(town){const npcs=TOWN_NPCS[town.name]||[];openService('Residents',town.name,'These residents now live in the world around town. Tap one outside, or choose one here.',npcs.map((npc,i)=>`<button class="npc-card" data-npc="${i}"><strong>${npc.name}</strong><span>${npc.role} · ${npc.intro}</span></button>`).join(''));ui.serviceContent.querySelectorAll('[data-npc]').forEach(b=>b.addEventListener('click',()=>openNPCConversation({...npcs[+b.dataset.npc],town})));}
  function questCard(q,town){const done=state.quests[q.id]==='done',accepted=state.quests[q.id]==='accepted',owned=state.inventory[q.item]||0;return `<article class="quest-card"><strong>${q.title}</strong><span>Bring ${ITEM_DEFS[q.item]?.name||q.item} ${owned}/${q.amount}</span><small>Reward: ${q.reward} coins · Merching XP</small>${done?'<button disabled>Completed today</button>':accepted?`<button data-claim="${q.id}" ${owned>=q.amount?'':'disabled'}>Turn In</button>`:`<button data-accept="${q.id}">Accept Quest</button>`}</article>`;}
  function bindQuestButtons(town){ui.serviceContent.querySelectorAll('[data-accept]').forEach(b=>b.addEventListener('click',()=>{state.quests[b.dataset.accept]='accepted';openQuests(town);saveGame(false);}));ui.serviceContent.querySelectorAll('[data-claim]').forEach(b=>b.addEventListener('click',()=>{const quests=[townQuest(town,0),townQuest(town,1)],q=quests.find(x=>x.id===b.dataset.claim);if(!q||(state.inventory[q.item]||0)<q.amount)return;state.inventory[q.item]-=q.amount;state.inventory.coins=(state.inventory.coins||0)+q.reward;recordGoldEarned(q.reward);awardSkillXp('merching',Math.max(1,Math.round(q.reward*XP_RATE)));state.quests[q.id]='done';renderAll();openQuests(town);saveGame(false);}));}
  function openQuests(town){const quests=[townQuest(town,0),townQuest(town,1)];openService('Notice Board',`${town.name} Requests`,'These requests rotate daily.',quests.map(q=>questCard(q,town)).join(''));bindQuestButtons(town);}
  function openPOH(town){const total=totalLevel();openService('Player-Owned Home','Your Home',`Total level ${total} · Coins ${state.inventory.coins||0}`,POH_UPGRADES.map(u=>{const built=state.poh[u.id],items=Object.entries(u.items).map(([k,n])=>`${ITEM_DEFS[k]?.name||k} ${state.inventory[k]||0}/${n}`).join(' · '),can=total>=u.total&&(state.inventory.coins||0)>=u.coins&&Object.entries(u.items).every(([k,n])=>(state.inventory[k]||0)>=n);return `<article class="service-card ${built?'built':can?'':'locked'}"><div><strong>${u.name}</strong><span>Total level ${u.total} · ${u.coins} coins</span><small>${u.description}<br>${items}</small></div><button data-build="${u.id}" ${built||!can?'disabled':''}>${built?'Built':'Build'}</button></article>`}).join(''));ui.serviceContent.querySelectorAll('[data-build]').forEach(b=>b.addEventListener('click',()=>{const u=POH_UPGRADES.find(x=>x.id===b.dataset.build);if(!u)return;state.inventory.coins-=u.coins;recordGoldSpent(u.coins);for(const[k,n]of Object.entries(u.items))state.inventory[k]-=n;state.poh[u.id]=true;renderAll();openPOH(town);saveGame(false);}));}
  function itemValue(key){const item=ITEM_DEFS[key];if(!item||key==='coins')return 0;const name=item.name.toLowerCase();let v=2;if(name.includes('crystal'))v=240;else if(name.includes('gold'))v=120;else if(name.includes('pyrite'))v=80;else if(name.includes('silver'))v=55;else if(name.includes('iron'))v=30;else if(name.includes('copper'))v=16;else if(name.includes('redwood'))v=90;else if(name.includes('mahogany'))v=65;else if(name.includes('shark'))v=75;else if(name.includes('grouper'))v=45;else if(name.includes('tuna'))v=30;else if(item.slot)v=20;return v;}
  function merchModifiers(){const level=levelFromXp(state.skills.merching?.xp||0);return{level,buy:Math.max(.75,1-level*.0025),sell:Math.min(1.25,.5+level*.005)};}
  function openShop(town){const m=merchModifiers(),stock=['stoneAxe','stonePickaxe','basicFishingRod','cedarLog','stone','rawMinnow','copperOre'];const buy=stock.map(k=>{const price=Math.max(1,Math.ceil(itemValue(k)*2*m.buy));return `<article class="shop-row"><div><strong>${ITEM_DEFS[k].name}</strong><span>${price} coins</span></div><button data-buy="${k}" data-price="${price}">Buy</button></article>`}).join('');const sell=Object.entries(state.inventory).filter(([k,q])=>q>0&&k!=='coins'&&ITEM_DEFS[k]).map(([k,q])=>{const price=Math.max(1,Math.floor(itemValue(k)*m.sell)),equipped=Object.values(state.equipment).includes(k);return `<article class="shop-row ${equipped?'locked':''}"><div><strong>${ITEM_DEFS[k].name} ×${q}</strong><span>${equipped?'Equipped · unequip before selling':`${price} coins each`}</span></div><div class="service-actions"><button data-sell="${k}" data-price="${price}" ${equipped?'disabled':''}>${equipped?'Equipped':'Sell 1'}</button><button data-sellall="${k}" data-price="${price}" ${equipped?'disabled':''}>Sell All</button></div></article>`}).join('');openService('Shop',`${town.name} Shop`,`Merching level ${m.level} · ${state.inventory.coins||0} coins`,`<details class="shop-group" open><summary>Buy basic supplies</summary>${buy}</details><details class="shop-group"><summary>Sell owned items</summary>${sell||'<p class="item-description">Nothing to sell.</p>'}</details>`);ui.serviceContent.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>{const p=+b.dataset.price;if((state.inventory.coins||0)<p)return showToast('Not enough coins');state.inventory.coins-=p;recordGoldSpent(p);state.inventory[b.dataset.buy]=(state.inventory[b.dataset.buy]||0)+1;awardSkillXp('merching',Math.max(1,Math.round(p*XP_RATE)));renderAll();openShop(town);saveGame(false);}));const sellFn=(b,all)=>{const k=b.dataset.sell||b.dataset.sellall;if(Object.values(state.equipment).includes(k))return showToast('Unequip that item before selling');const q=all?(state.inventory[k]||0):1;if(q<1||!confirm(`Sell ${all?'all ':''}${ITEM_DEFS[k].name}${all?` ×${q}`:''}?`))return;const gain=q*(+b.dataset.price);state.inventory[k]-=q;state.inventory.coins=(state.inventory.coins||0)+gain;recordGoldEarned(gain);awardSkillXp('merching',Math.max(1,Math.round(gain*XP_RATE)));renderAll();openShop(town);saveGame(false);};ui.serviceContent.querySelectorAll('[data-sell]').forEach(b=>b.addEventListener('click',()=>sellFn(b,false)));ui.serviceContent.querySelectorAll('[data-sellall]').forEach(b=>b.addEventListener('click',()=>sellFn(b,true)));}
  function openInn(town){const rumours={"Starting Town":'Mira says the cedar pond is the safest place to begin.',"Swamp Town":'The catfish bite more often when the marsh is quiet.',"North Town":'Crystal deposits glitter beyond the arctic pines.',"Desert Town":'Pyrite is often mistaken for gold by hurried travellers.',"East Town":'Willows favour the wet ground near the eastern water.',"South Town":'The jungle trees provide the most valuable hardwood.',"Jungle Town":'Ancient redwoods grow slowly, but their timber is prized.'};openService('Inn',`${town.name} Inn`,'A quiet place to rest.',`<article class="service-card"><strong>Local rumour</strong><span>${rumours[town.name]||'Travellers speak of resources across the continent.'}</span></article>`);}
  function materialText(materials){
    return Object.entries(materials).map(([key,need])=>`${ITEM_DEFS[key]?.name||key} ${state.inventory[key]||0}/${need}`).join(' · ');
  }
  function maxCraftable(recipe){
    return Math.min(...Object.entries(recipe.materials).map(([key,need])=>Math.floor((state.inventory[key]||0)/need)));
  }
  function openCrafting(town=currentTown){
    currentTown=town;ui.craftingTownName.textContent=`${town?.name||'Town'} Crafting Table`;renderCraftingMenu();ui.craftingDialog.showModal();
  }
  function renderCraftingMenu(){
    const xp=state.skills.crafting?.xp||0,level=levelFromXp(xp);ui.craftingLevel.textContent=`Crafting level ${level} · ${xp.toLocaleString()} XP`;
    const groups=['Materials','Tools','Weapons','Armour','Unique Equipment'];
    ui.craftingRecipes.innerHTML=groups.map(category=>{
      const recipes=RECIPES.filter(r=>r.category===category);
      const available=recipes.filter(r=>level>=r.level&&maxCraftable(r)>0).length;
      const cards=recipes.map(recipe=>{
        const item=ITEM_DEFS[recipe.output],levelOk=level>=recipe.level,max=maxCraftable(recipe),can=levelOk&&max>0;
        return `<article class="recipe-card ${can?'craftable':'locked'}"><div class="recipe-copy"><strong>${item.name}</strong><span>Level ${recipe.level} · +${recipe.xp} XP</span><small>${materialText(recipe.materials)}</small></div><div class="recipe-actions"><button data-craft="${recipe.id}" data-amount="1" ${can?'':'disabled'}>Craft 1</button><button data-craft="${recipe.id}" data-amount="max" ${can?'':'disabled'}>Max${max>0?` (${max})`:''}</button></div></article>`;
      }).join('');
      return `<details class="recipe-group"><summary><span>${category}</span><small>${available} craftable · ${recipes.length} recipes</small></summary><div class="recipe-group-body">${cards}</div></details>`;
    }).join('');
    ui.craftingRecipes.querySelectorAll('[data-craft]').forEach(button=>button.addEventListener('click',()=>{
      const recipe=RECIPES.find(r=>r.id===button.dataset.craft);if(!recipe)return;
      const amount=button.dataset.amount==='max'?maxCraftable(recipe):1;craftRecipe(recipe,amount);
    }));
  }
  function craftRecipe(recipe,amount){
    const level=levelFromXp(state.skills.crafting?.xp||0),possible=maxCraftable(recipe),count=Math.min(amount,possible);
    if(level<recipe.level){showToast(`Crafting level ${recipe.level} required`);return;}
    if(count<1){showToast('You do not have the required materials');return;}
    for(const [key,need] of Object.entries(recipe.materials))state.inventory[key]-=need*count;
    state.inventory[recipe.output]=(state.inventory[recipe.output]||0)+recipe.amount*count;state.statistics.itemsCrafted=(state.statistics.itemsCrafted||0)+recipe.amount*count;
    const gainedXp=xpWithSummonBonus('crafting',recipe.xp*count);awardSkillXp('crafting',gainedXp);awardSummoningXp(gainedXp);
    showToast(`Crafted ${ITEM_DEFS[recipe.output].name}${count>1?` ×${count}`:''}`);audioEngine.sfx('craft');renderInventory();renderSkills();renderEquipment();renderCraftingMenu();saveGame(false);
  }

  function renderBestiary(){
    if(!ui.bestiary)return;
    const totalTypes=Object.keys(ENEMY_TYPES).length;
    const defeatedTypes=Object.keys(ENEMY_TYPES).filter(type=>(state.statistics.killsByEnemy?.[type]||0)>0).length;
    const allRare=Object.keys(ENEMY_TYPES).flatMap(type=>rareDropKeysForEnemy(type).map(key=>[type,key]));
    const foundRare=allRare.filter(([type,key])=>state.statistics.rareDropsByEnemy?.[type]?.[key]).length;
    ui.bestiary.innerHTML=`<div class="bestiary-summary"><div><span>Creatures defeated</span><strong>${defeatedTypes}/${totalTypes}</strong></div><div><span>Rare entries found</span><strong>${foundRare}/${allRare.length}</strong></div><div><span>Total kills</span><strong>${(state.statistics.totalKills||0).toLocaleString()}</strong></div></div><div class="bestiary-list">${Object.entries(ENEMY_TYPES).map(([type,enemy])=>{const kills=state.statistics.killsByEnemy?.[type]||0,rare=rareDropKeysForEnemy(type);return `<details class="bestiary-entry ${kills?'discovered':'unknown'}"><summary><span><strong>${kills?enemy.name:'Unknown Creature'}</strong><small>${kills?`${kills.toLocaleString()} personal kill${kills===1?'':'s'}`:'Not yet defeated'}</small></span><b>${kills?'✓':'?'}</b></summary><div class="collection-log"><h3>Rare collection</h3>${rare.length?rare.map(key=>{const found=Boolean(state.statistics.rareDropsByEnemy?.[type]?.[key]);return `<div class="collection-item ${found?'found':'missing'}"><span>${found?'◆':'◇'}</span><strong>${found?(ITEM_DEFS[key]?.name||key):'Unfound rare item'}</strong><small>${found?'Collected':'Keep hunting this creature'}</small></div>`}).join(''):'<p class="hint">This creature has no rare collection entries.</p>'}</div></details>`}).join('')}</div>`;
  }
  function renderEquipment(){const slots=[['head','Head'],['cape','Cape'],['body','Body'],['weapon','Weapon'],['shield','Shield'],['legs','Legs'],['boots','Boots'],['ring','Ring'],['food','Food']],ps=playerCombatStats();ui.equipment.innerHTML=`<div class="map-summary"><strong>${ps.style==='range'?'Ranged':'Melee'} combat stats</strong><span>Level ${ps.level} · Accuracy ${ps.accuracy} · Max hit ${ps.maxHit} · Defence ${ps.defence}</span></div><div class="equipment-slots">${slots.map(([k,l])=>{const item=state.equipment[k]&&ITEM_DEFS[state.equipment[k]];return `<button class="slot ${item?'filled':''}" data-slot="${k}" ${item?'':'disabled'}><span>${l}</span><strong>${item?item.name:'Empty'}</strong></button>`}).join('')}</div>`;ui.equipment.querySelectorAll('.slot.filled').forEach(b=>b.addEventListener('click',()=>showItem(state.equipment[b.dataset.slot])));}
  function renderMapPanel(){
    ui.map.innerHTML='<div class="minimap-wrap"><canvas id="miniMapCanvas" width="720" height="720" aria-label="Draggable world minimap"></canvas><span class="minimap-hint">Drag to explore · tap your marker button to recenter</span><button id="recenterMapButton" class="minimap-recenter">◎</button></div>';
    const mini=document.getElementById('miniMapCanvas');
    mini.addEventListener('pointerdown',e=>{miniMapView.dragging=true;miniMapView.lastX=e.clientX;miniMapView.lastY=e.clientY;mini.setPointerCapture(e.pointerId);e.preventDefault();});
    mini.addEventListener('pointermove',e=>{if(!miniMapView.dragging)return;const rect=mini.getBoundingClientRect(),worldPerPixel=(WORLD.width/mini.width)/miniMapView.zoom;miniMapView.centerX-=((e.clientX-miniMapView.lastX)*mini.width/rect.width)*worldPerPixel;miniMapView.centerY-=((e.clientY-miniMapView.lastY)*mini.height/rect.height)*worldPerPixel;miniMapView.lastX=e.clientX;miniMapView.lastY=e.clientY;clampMiniMap();drawMiniMap();e.preventDefault();});
    const stopDrag=e=>{miniMapView.dragging=false;if(mini.hasPointerCapture?.(e.pointerId))mini.releasePointerCapture(e.pointerId);};
    mini.addEventListener('pointerup',stopDrag);mini.addEventListener('pointercancel',stopDrag);
    document.getElementById('recenterMapButton').addEventListener('click',()=>{miniMapView.centerX=state.player.x;miniMapView.centerY=state.player.y;clampMiniMap();drawMiniMap();});
    clampMiniMap();drawMiniMap();
  }
  function clampMiniMap(){const halfW=WORLD.width/(2*miniMapView.zoom),halfH=WORLD.height/(2*miniMapView.zoom);miniMapView.centerX=clamp(miniMapView.centerX,halfW,WORLD.width-halfW);miniMapView.centerY=clamp(miniMapView.centerY,halfH,WORLD.height-halfH);}
  function drawMiniMap(){const mini=document.getElementById('miniMapCanvas');if(!mini)return;const m=mini.getContext('2d'),viewW=WORLD.width/miniMapView.zoom,viewH=WORLD.height/miniMapView.zoom,left=miniMapView.centerX-viewW/2,top=miniMapView.centerY-viewH/2,sx=mini.width/viewW,sy=mini.height/viewH,toX=x=>(x-left)*sx,toY=y=>(y-top)*sy;m.clearRect(0,0,mini.width,mini.height);m.fillStyle='#397f9f';m.fillRect(0,0,mini.width,mini.height);const poly=(pts,color)=>{m.beginPath();m.moveTo(toX(pts[0][0]),toY(pts[0][1]));for(const [x,y] of pts.slice(1))m.lineTo(toX(x),toY(y));m.closePath();m.fillStyle=color;m.fill();};poly(continent,'#72ae61');for(const r of regions)poly(r.points,r.color);for(const w of waters){m.beginPath();m.ellipse(toX(w.x),toY(w.y),w.rx*sx,w.ry*sy,0,0,Math.PI*2);m.fillStyle=w.color;m.fill();}for(const t of towns){m.fillStyle='#f0e9d2';m.fillRect(toX(t.x)-5,toY(t.y)-5,10,10);}m.fillStyle='#ffdf65';m.beginPath();m.arc(toX(state.player.x),toY(state.player.y),9,0,Math.PI*2);m.fill();m.strokeStyle='#1d232b';m.lineWidth=4;m.stroke();}

  function showItem(key){const item=ITEM_DEFS[key];if(!item)return;selectedItemKey=key;ui.itemAction.dataset.action='';ui.itemType.textContent=item.type;ui.itemName.textContent=item.name;ui.itemDescription.textContent=item.description;const rows=[];if(item.uses)rows.push(['Used for',item.uses]);for(const [k,v] of Object.entries(item.stats||{}))rows.push([k,v]);if(item.summonType)rows.push(['Current status',state.activeSummon===item.summonType?(summonIsFed()?'Active and fed':'Active but hungry'):'Available to summon']);ui.itemStats.innerHTML=rows.map(([k,v])=>`<div><span>${k}</span><strong>${v}</strong></div>`).join('');const equipped=Object.keys(state.equipment).find(s=>state.equipment[s]===key);if(item.summonType&&state.inventory[key]>0){ui.itemAction.hidden=false;ui.itemAction.textContent=state.activeSummon===item.summonType?'Already Summoned':'Summon';ui.itemAction.disabled=state.activeSummon===item.summonType;}else if(item.slot&&state.inventory[key]>0){ui.itemAction.hidden=false;ui.itemAction.disabled=false;ui.itemAction.textContent=equipped?'Unequip':'Equip';}else{ui.itemAction.hidden=true;ui.itemAction.disabled=false;}ui.dialog.showModal();}
  function toggleSelectedEquipment(){if(ui.itemAction.dataset.action==='foodBox'){ui.dialog.close();openSummonFoodBox();return;}const key=selectedItemKey,item=ITEM_DEFS[key];if(item?.summonType){if(state.activeSummon===item.summonType)return;state.activeSummon=item.summonType;state.summonAttackElapsed=0;ui.dialog.close();showToast(`${SUMMON_DEFS[item.summonType].name} answers your call${summonIsFed()?'':' — stock the Food Box'}`);audioEngine.sfx('summon');renderAll();saveGame(false);return;}if(!item?.slot)return;const existing=Object.keys(state.equipment).find(s=>state.equipment[s]===key);if(existing)state.equipment[existing]=null;else state.equipment[item.slot]=key;ui.dialog.close();renderEquipment();renderCombatHud();saveGame(false);}
  function renderAll(){renderInventory();renderSkills();renderEquipment();renderBestiary();renderMapPanel();renderCombatHud();renderHeader();if(ui.leaderboards?.classList.contains('active'))renderLeaderboards(leaderboardSort);}
  function frame(now){updateMultiplayer(now);const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;update(dt);draw();if(now-miniMapView.lastDraw>180&&document.getElementById('map')?.classList.contains('active')){miniMapView.lastDraw=now;drawMiniMap();}requestAnimationFrame(frame);}

  ui.familyWorldToggle?.addEventListener('click',()=>{ui.onlinePlayers.hidden=!ui.onlinePlayers.hidden;});
  canvas.addEventListener('pointerdown',beginCanvasPointer,{passive:false});canvas.addEventListener('pointermove',moveCanvasPointer,{passive:false});canvas.addEventListener('pointerup',endCanvasPointer,{passive:false});canvas.addEventListener('pointercancel',cancelCanvasPointer,{passive:false});canvas.addEventListener('lostpointercapture',event=>{if(holdWalk.pressed&&event.pointerId===holdWalk.pointerId)cancelCanvasPointer(event);});window.addEventListener('pointerup',event=>{if(holdWalk.pressed&&event.pointerId===holdWalk.pointerId)endCanvasPointer(event);},{passive:false});window.addEventListener('pointercancel',event=>{if(holdWalk.pressed&&event.pointerId===holdWalk.pointerId)cancelCanvasPointer(event);},{passive:false});document.addEventListener('pointerdown',()=>audioEngine.unlock(),{passive:true});document.addEventListener('touchstart',()=>audioEngine.unlock(),{passive:true});document.addEventListener('click',()=>audioEngine.unlock(),{passive:true});document.getElementById('stopButton').addEventListener('click',()=>{setAutoMode('off');stopAction(true);});ui.autoMode.addEventListener('change',()=>{stopAction(true);setAutoMode(ui.autoMode.value);});ui.eatButton.addEventListener('click',eatFood);document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>openPanel(t.dataset.panel)));document.getElementById('closeItemButton').addEventListener('click',()=>ui.dialog.close());document.getElementById('closeTownButton').addEventListener('click',()=>ui.townDialog.close());document.getElementById('closeCraftingButton').addEventListener('click',()=>ui.craftingDialog.close());document.getElementById('closeServiceButton').addEventListener('click',()=>ui.serviceDialog.close());document.getElementById('closeOfflineButton').addEventListener('click',()=>ui.offlineDialog.close());document.getElementById('defeatContinueButton')?.addEventListener('click',()=>{defeatActive=false;ui.defeatDialog.close();ui.actionName.textContent='Exploring';ui.status.textContent='Tap the ground, a resource, a creature, or a town.';});ui.defeatDialog?.addEventListener('cancel',e=>{e.preventDefault();});document.getElementById('closeLeaderboardProfileButton')?.addEventListener('click',()=>ui.leaderboardProfileDialog.close());ui.itemAction.addEventListener('click',toggleSelectedEquipment);ui.dialog.addEventListener('click',e=>{if(e.target===ui.dialog)ui.dialog.close();});ui.townDialog.addEventListener('click',e=>{if(e.target===ui.townDialog)ui.townDialog.close();});ui.craftingDialog.addEventListener('click',e=>{if(e.target===ui.craftingDialog)ui.craftingDialog.close();});ui.serviceDialog.addEventListener('click',e=>{if(e.target===ui.serviceDialog)ui.serviceDialog.close();});document.getElementById('exportButton').addEventListener('click',()=>{saveGame(false);const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`idle-wanderer-save-${Date.now()}.json`;a.click();URL.revokeObjectURL(a.href);});document.getElementById('importInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const imported=JSON.parse(await file.text());localStorage.setItem(SAVE_KEY,JSON.stringify(imported));await window.IdleCloud?.flush(imported);location.reload();}catch{showToast('Invalid save file');}});document.getElementById('logoutButton')?.addEventListener('click',()=>window.IdleCloud?.signOut());document.getElementById('resetButton').addEventListener('click',()=>{if(confirm('Reset all progress for this account? This will replace the cloud save.')){localStorage.removeItem(SAVE_KEY);sessionStorage.setItem('idle-wanderer-reset','1');location.reload();}});window.addEventListener('pagehide',()=>{saveGame(false);window.IdleCloud?.flush(state);window.IdleMultiplayer?.leave();});setInterval(()=>{state.statistics.playTimeSeconds=(state.statistics.playTimeSeconds||0)+15;saveGame(false);},15000);if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(console.error);
  camera.x=clamp(state.player.x-canvas.width/2,0,WORLD.width-canvas.width);camera.y=clamp(state.player.y-canvas.height/2,0,WORLD.height-canvas.height);renderAll();setAutoMode(state.autoMode,false);processOfflineProgress();queueLeaderboardPublish(true);initializeChat();startMultiplayer();requestAnimationFrame(frame);
})();
