(() => {
  'use strict';

  const VERSION = '0.11.5';
  const SAVE_KEY = 'idle-wanderer-save-v6';
  const LEGACY_KEYS = ['idle-wanderer-save-v5', 'idle-wanderer-save-v4', 'idle-wanderer-save-v3', 'idle-wanderer-save-v2'];
  const TICK_SECONDS = 0.6;
  const MAP_SCALE = 1.5;
  const WORLD = { width: Math.round(3800 * MAP_SCALE), height: Math.round(4300 * MAP_SCALE) };
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
    townDialog: document.getElementById('townDialog'), townName: document.getElementById('townName'), townDescription: document.getElementById('townDescription'), townServices: document.getElementById('townServices'),
    craftingDialog: document.getElementById('craftingDialog'), craftingTownName: document.getElementById('craftingTownName'), craftingLevel: document.getElementById('craftingLevel'), craftingRecipes: document.getElementById('craftingRecipes'),
    combatHp: document.getElementById('combatHp'), combatHpFill: document.getElementById('combatHpFill'), eatButton: document.getElementById('eatButton'), eatCount: document.getElementById('eatCount'),
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

    const dagger=`${tier.key}Dagger`, sword=`${tier.key}Sword`;
    defineItem(dagger,{name:`${tier.name} Dagger`,type:'Weapon',description:`A quick ${tier.name.toLowerCase()} dagger. Damage is determined by combat stats and the target's defence.`,slot:'weapon',stats:{'Attack speed':'3 ticks · 1.8 seconds','Accuracy':`+${tier.accuracy}`,'Strength':`+${tier.strength}`}});
    defineItem(sword,{name:`${tier.name} Sword`,type:'Weapon',description:`A balanced ${tier.name.toLowerCase()} sword. Damage is determined by combat stats and the target's defence.`,slot:'weapon',stats:{'Attack speed':'4 ticks · 2.4 seconds','Accuracy':`+${tier.accuracy+2}`,'Strength':`+${tier.strength+2}`}});
    addRecipe({id:dagger,category:'Weapons',level:tier.level,output:dagger,amount:1,xp:Math.max(8,tier.level*2),materials:tier.key==='stone'?{stone:2}:{[mat]:1}});
    addRecipe({id:sword,category:'Weapons',level:tier.level,output:sword,amount:1,xp:Math.max(12,tier.level*3),materials:tier.key==='stone'?{stone:3,cedarLog:1}:{[mat]:2,[tier.log]:1}});

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

  for(const [key,name,level,log,ticks,strength] of BOW_TIERS){
    const itemKey=`${key}Bow`;
    defineItem(itemKey,{name:`${name} Bow`,type:'Ranged weapon',description:`A ${name.toLowerCase()} bow. Damage is determined by Ranged skill, ammunition, and the target's defence.`,slot:'weapon',stats:{'Attack speed':`${ticks} ticks · ${(ticks*TICK_SECONDS).toFixed(1)} seconds`,'Ranged accuracy':`+${strength+3}`,'Ranged strength':`+${strength}`,'Range':'6 tiles'}});
    addRecipe({id:itemKey,category:'Weapons',level,output:itemKey,amount:1,xp:Math.max(10,level*3),materials:{[log]:2}});
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
    rawRabbit:['Raw Rabbit','Raw meat','Fresh rabbit meat. Cook it at a town fire.'], rabbitFoot:['Rabbit Foot','Rare combat drop','A lucky foot dropped very rarely by rabbits.'],
    ratMeat:['Rat Meat','Raw meat','Questionable meat from a giant rat. It can still be cooked.'], ratTail:['Rat Tail','Rare combat drop','A long tail prized by unusual collectors.'],
    rawVenison:['Raw Venison','Raw meat','Lean meat from a deer.'], animalHide:['Animal Hide','Combat material','A basic hide useful for future leather crafting.'], antler:['Antler','Rare combat drop','A well-shaped deer antler.'],
    rawPork:['Raw Pork','Raw meat','A thick cut from a wild boar.'], boarTusk:['Boar Tusk','Rare combat drop','A heavy curved tusk.'],
    wolfMeat:['Wolf Meat','Raw meat','Tough meat from a wolf.'], wolfFang:['Wolf Fang','Rare combat drop','A sharp wolf fang.'],
    clothScrap:['Cloth Scrap','Combat material','Rough cloth taken from a bandit.'], banditDagger:['Bandit Dagger','Weapon','A quick dagger taken from a bandit.',{slot:'weapon',stats:{'Attack speed':'3 ticks · 1.8 seconds','Accuracy':'+9','Strength':'+5'}}],
    bones:['Bones','Combat material','Ordinary bones.'], ancientBone:['Ancient Bone','Rare combat drop','A bone darkened by age and strange energy.'],
    spiritResidue:['Spirit Residue','Combat material','Cold residue left behind by a wraith.'], wraithCloth:['Wraith Cloth','Rare combat drop','A nearly weightless strip of spectral cloth.'],
    scorpionMeat:['Scorpion Meat','Raw meat','Edible once carefully cooked.'], venomGland:['Venom Gland','Rare combat drop','A gland containing potent venom.'],
    serpentMeat:['Serpent Meat','Raw meat','A long cut of desert serpent meat.'], serpentScale:['Serpent Scale','Combat material','A durable scale from a large serpent.'], sandFang:['Sand Fang','Rare combat drop','A fang polished by desert sand.'],
    golemCore:['Golem Core','Rare combat drop','The compact core that animated a sand golem.'], slimeGel:['Slime Gel','Combat material','Sticky gel from a bog slime.'], clearGel:['Clear Gel','Rare combat drop','An unusually pure glob of slime gel.'],
    crocodileMeat:['Crocodile Meat','Raw meat','Dense meat from a swamp crocodile.'], crocodileHide:['Crocodile Hide','Combat material','Thick scaled hide.'], crocodileTooth:['Crocodile Tooth','Rare combat drop','A large crocodile tooth.'],
    murkyHide:['Murky Hide','Combat material','Dark hide from a marsh lurker.'], lurkerEye:['Lurker Eye','Rare combat drop','The unsettling eye of a marsh lurker.'],
    spiderSilk:['Spider Silk','Combat material','Strong silk from a jungle spider.'], venomSac:['Venom Sac','Rare combat drop','A full venom sac.'],
    snakeMeat:['Snake Meat','Raw meat','Fresh jungle snake meat.'], venomFang:['Venom Fang','Rare combat drop','A venom-coated jungle fang.'],
    jaguarMeat:['Jaguar Meat','Raw meat','Rich meat from a jungle jaguar.'], jaguarHide:['Jaguar Hide','Combat material','A patterned hide.'], jaguarClaw:['Jaguar Claw','Rare combat drop','A razor-sharp claw.'],
    gorillaMeat:['Gorilla Meat','Raw meat','A large heavy cut of meat.'], gorillaKnuckle:['Gorilla Knuckle','Rare combat drop','A massive knuckle bone.'],
    frozenMeat:['Frozen Meat','Raw meat','Meat preserved by the northern cold.'], frozenHide:['Frozen Hide','Combat material','A hide hardened by ice.'], iceFang:['Ice Fang','Rare combat drop','A fang that remains freezing cold.'],
    trollClub:['Troll Club','Weapon','A huge crude club dropped by a frost troll.',{slot:'weapon',stats:{'Attack speed':'6 ticks · 3.6 seconds','Accuracy':'+18','Strength':'+20'}}],
    dragonMeat:['Dragon Meat','Raw meat','Extremely valuable meat from a frost dragon.'], frostScale:['Frost Scale','Rare combat drop','A pale scale carrying deep frost magic.'], frozenHeart:['Frozen Heart','Rare combat drop','The impossibly cold heart of a frost dragon.']
  };
  for(const [key,data] of Object.entries(COMBAT_ITEM_DEFS)){
    const [name,type,description,extra={}] = data; defineItem(key,{name,type,description,...extra});
  }
  for(const [raw,d] of Object.entries(COOKING_DATA)) defineItem(d.cooked,{name:d.name,type:'Cooked food',description:`A properly cooked ${d.name.replace('Cooked ','').toLowerCase()}.`,slot:'food',heal:d.heal,stats:{'Cooking level':String(d.level),'Healing':`${d.heal} HP`}});

  const TOWN_NPCS = {
    'Starting Town':[['Mira','A cheerful guide who keeps an eye on new wanderers.'],['Old Fen','A retired woodcutter with too many stories.']],
    'Swamp Town':[['Bogdan','A patient marsh fisher who studies catfish.'],['Reed','A collector of unusual swamp materials.']],
    'North Town':[['Sera Pine','A cold-weather forester who knows the arctic pines.'],['Kell','A miner searching for crystal seams.']],
    'Desert Town':[['Asha','A trader who crosses the western sands.'],['Flint','A stoneworker who values simple materials.']],
    'East Town':[['Rowan','A travelling bowyer who enjoys the open grassland.'],['Pip','A pond watcher who tracks moving fishing spots.']],
    'South Town':[['Mae','A cook experimenting with fish recipes.'],['Orin','A builder interested in player-owned homes.']],
    'Jungle Town':[['Tala','A hardwood expert who protects the jungle.'],['Red','A quiet explorer fascinated by redwoods.']]
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


  const ENEMY_TYPES = {
    rabbit:{name:'Rabbit',behaviour:'passive',shape:'rabbit',hp:8,defence:1,accuracy:3,maxHit:1,ticks:5,color:'#d9cfb8',respawn:20,drops:[['rawRabbit',1,1,1],['rabbitFoot',1,1,.0125]]},
    giantRat:{name:'Giant Rat',behaviour:'passive',shape:'rat',hp:14,defence:3,accuracy:6,maxHit:2,ticks:4,color:'#746d68',respawn:24,drops:[['ratMeat',1,1,1],['ratTail',1,1,.025]]},
    deer:{name:'Deer',behaviour:'passive',shape:'deer',hp:24,defence:7,accuracy:9,maxHit:3,ticks:5,color:'#a6774e',respawn:32,drops:[['rawVenison',1,2,1],['animalHide',1,1,.55],['antler',1,1,.0167]]},
    wildBoar:{name:'Wild Boar',behaviour:'aggressive',shape:'boar',hp:30,defence:9,accuracy:12,maxHit:5,ticks:4,color:'#74523c',aggro:190,respawn:38,drops:[['rawPork',1,2,1],['animalHide',1,1,.45],['boarTusk',1,1,.02]]},
    wolf:{name:'Wolf',behaviour:'aggressive',shape:'wolf',hp:40,defence:12,accuracy:15,maxHit:6,ticks:3,color:'#66717b',aggro:230,respawn:45,drops:[['wolfMeat',1,2,1],['animalHide',1,1,.5],['wolfFang',1,1,.0154]]},
    bandit:{name:'Bandit',behaviour:'aggressive',shape:'humanoid',hp:48,defence:14,accuracy:18,maxHit:7,ticks:4,color:'#8d6548',aggro:220,respawn:55,drops:[['coins',8,24,1],['clothScrap',1,2,.7],['banditDagger',1,1,.01]]},
    skeleton:{name:'Skeleton',behaviour:'aggressive',shape:'skeleton',hp:55,defence:17,accuracy:20,maxHit:8,ticks:4,color:'#ded9c8',aggro:220,respawn:60,drops:[['bones',1,2,1],['coins',10,30,.7],['ancientBone',1,1,.0133]]},
    wraith:{name:'Wraith',behaviour:'aggressive',shape:'wraith',hp:85,defence:25,accuracy:29,maxHit:11,ticks:5,color:'#8c85ad',aggro:250,respawn:150,drops:[['spiritResidue',1,2,1],['wraithCloth',1,1,.01]]},
    scorpion:{name:'Scorpion',behaviour:'aggressive',shape:'scorpion',hp:36,defence:10,accuracy:16,maxHit:6,ticks:3,color:'#b4773f',aggro:190,respawn:42,drops:[['scorpionMeat',1,1,1],['venomGland',1,1,.0167]]},
    sandSerpent:{name:'Sand Serpent',behaviour:'aggressive',shape:'serpent',hp:62,defence:19,accuracy:24,maxHit:9,ticks:4,color:'#b89b58',aggro:230,respawn:70,drops:[['serpentMeat',1,2,1],['serpentScale',1,2,.5],['sandFang',1,1,.0118]]},
    sandGolem:{name:'Sand Golem',behaviour:'aggressive',shape:'golem',hp:110,defence:34,accuracy:30,maxHit:13,ticks:6,color:'#c4a66d',aggro:200,respawn:180,drops:[['stone',2,5,1],['goldOre',1,2,.3],['golemCore',1,1,.01]]},
    bogSlime:{name:'Bog Slime',behaviour:'passive',shape:'slime',hp:32,defence:8,accuracy:10,maxHit:4,ticks:5,color:'#739d75',respawn:38,drops:[['slimeGel',1,3,1],['clearGel',1,1,.02]]},
    crocodile:{name:'Crocodile',behaviour:'aggressive',shape:'crocodile',hp:78,defence:24,accuracy:28,maxHit:11,ticks:4,color:'#526f47',aggro:240,respawn:85,drops:[['crocodileMeat',1,2,1],['crocodileHide',1,1,.65],['crocodileTooth',1,1,.0143]]},
    marshLurker:{name:'Marsh Lurker',behaviour:'aggressive',shape:'lurker',hp:120,defence:37,accuracy:38,maxHit:15,ticks:5,color:'#47675c',aggro:260,respawn:210,drops:[['murkyHide',1,2,1],['lurkerEye',1,1,.01]]},
    jungleSpider:{name:'Jungle Spider',behaviour:'aggressive',shape:'spider',hp:50,defence:15,accuracy:23,maxHit:8,ticks:3,color:'#563d4a',aggro:210,respawn:55,drops:[['spiderSilk',1,2,1],['venomSac',1,1,.0182]]},
    venomSnake:{name:'Venom Snake',behaviour:'aggressive',shape:'serpent',hp:65,defence:21,accuracy:29,maxHit:10,ticks:3,color:'#4e8b52',aggro:230,respawn:75,drops:[['snakeMeat',1,2,1],['serpentScale',1,1,.55],['venomFang',1,1,.0133]]},
    jaguar:{name:'Jaguar',behaviour:'aggressive',shape:'cat',hp:100,defence:31,accuracy:39,maxHit:14,ticks:3,color:'#c39a45',aggro:270,respawn:130,drops:[['jaguarMeat',1,2,1],['jaguarHide',1,1,.7],['jaguarClaw',1,1,.0111]]},
    gorilla:{name:'Gorilla',behaviour:'aggressive',shape:'gorilla',hp:150,defence:43,accuracy:42,maxHit:18,ticks:5,color:'#4e4b47',aggro:240,respawn:240,drops:[['gorillaMeat',1,2,1],['mahoganyLog',1,2,.35],['gorillaKnuckle',1,1,.01]]},
    iceWolf:{name:'Ice Wolf',behaviour:'aggressive',shape:'wolf',hp:115,defence:36,accuracy:43,maxHit:16,ticks:3,color:'#a8c4cc',aggro:280,respawn:145,drops:[['frozenMeat',1,2,1],['frozenHide',1,1,.65],['iceFang',1,1,.0125]]},
    frostTroll:{name:'Frost Troll',behaviour:'aggressive',shape:'troll',hp:200,defence:55,accuracy:50,maxHit:23,ticks:6,color:'#78939b',aggro:250,respawn:300,drops:[['frozenMeat',2,3,1],['goldOre',1,3,.45],['trollClub',1,1,.01]]},
    frostDragon:{name:'Frost Dragon',behaviour:'aggressive',shape:'dragon',hp:650,defence:105,accuracy:85,maxHit:42,ticks:5,color:'#8fc5d4',aggro:340,respawn:600,drops:[['dragonMeat',2,4,1],['crystal',1,3,.5],['frostScale',1,1,.025],['frozenHeart',1,1,.01]]}
  };
  const enemySeeds=[
    // Central grasslands — common beginner creatures
    ['rabbit',1460,2380],['rabbit',1580,2450],['rabbit',1740,2260],['rabbit',1940,2320],['rabbit',2080,2480],['rabbit',2240,2070],['rabbit',2420,2210],['rabbit',2570,2380],['rabbit',2720,2080],['rabbit',2860,2320],['rabbit',3050,2150],['rabbit',3180,2460],
    ['giantRat',1260,2460],['giantRat',1360,2380],['giantRat',1510,2630],['giantRat',1880,2580],['giantRat',2190,2460],['giantRat',2520,2280],['giantRat',2810,2540],['giantRat',3060,2620],
    ['deer',2350,1880],['deer',2650,1920],['deer',2910,2450],['deer',3190,2240],['deer',3000,2780],['deer',2550,2750],
    ['wildBoar',2180,2670],['wildBoar',2380,2620],['wildBoar',2680,2820],['wildBoar',3000,2920],['wildBoar',3250,2650],
    ['wolf',2860,2600],['wolf',3150,2350],['wolf',2900,2740],['wolf',3320,2480],['wolf',3200,3000],['wolf',2740,2960],
    ['bandit',760,2260],['bandit',850,2360],['bandit',950,2510],
    // Dead grass and undead
    ['skeleton',980,2860],['skeleton',1200,2920],['skeleton',1450,3090],['skeleton',1740,3000],['skeleton',2020,3150],['skeleton',2280,3250],
    ['wraith',520,2880],['wraith',620,3000],['wraith',790,3160],
    // Desert
    ['scorpion',420,1580],['scorpion',470,1770],['scorpion',610,1960],['scorpion',700,2200],['scorpion',520,2380],['scorpion',820,2500],
    ['sandSerpent',260,2200],['sandSerpent',330,2450],['sandSerpent',430,2650],['sandSerpent',650,2730],
    ['sandGolem',300,1420],['sandGolem',330,1520],['sandGolem',520,1320],
    // Swamp
    ['bogSlime',980,620],['bogSlime',1250,720],['bogSlime',1510,560],['bogSlime',1770,820],['bogSlime',2050,870],['bogSlime',2330,910],
    ['crocodile',690,520],['crocodile',770,600],['crocodile',1160,880],['crocodile',1930,640],['crocodile',2370,720],
    ['marshLurker',2480,480],['marshLurker',2750,510],['marshLurker',2920,700],
    // Jungle
    ['jungleSpider',980,3520],['jungleSpider',1180,3650],['jungleSpider',1450,3820],['jungleSpider',1840,3610],['jungleSpider',2270,3540],['jungleSpider',2540,3740],
    ['venomSnake',850,3790],['venomSnake',950,3910],['venomSnake',1320,4020],['venomSnake',2050,3950],['venomSnake',2480,4050],
    ['jaguar',2200,3650],['jaguar',2670,3790],['jaguar',2860,3950],
    ['gorilla',1980,4020],['gorilla',2250,4050],['gorilla',2550,4140],
    // Northern high-level region
    ['iceWolf',920,1020],['iceWolf',1120,1040],['iceWolf',1560,950],['iceWolf',2140,1080],['iceWolf',2580,1120],['iceWolf',2910,1000],
    ['frostTroll',2470,780],['frostTroll',2850,850],['frostTroll',3050,650],
    ['frostDragon',2750,360]
  ];
  function makeEnemies(saved={}){
    return enemySeeds.map(([type,x,y],index)=>{const id=`enemy-${type}-${index}`,d=ENEMY_TYPES[type],old=saved[id]||{};return {id,type,x:old.x??x,y:old.y??y,homeX:x,homeY:y,hp:Math.min(old.hp??d.hp,d.hp),maxHp:d.hp,respawnAt:old.respawnAt||0,target:null,returning:false,attackElapsed:0,wanderElapsed:Math.random()*3,wanderX:x,wanderY:y,attackAnim:0,hitFlash:0,deathAnim:0,facing:1};});
  }

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
    // Starter and central freshwater
    ['minnow', 1450, 1840, 1315, 1800, 'Cedar Pond'],
    ['minnow', 1600, 1900, 1740, 2015, 'Cedar Pond'],
    ['minnow', 1515, 1980, 1390, 2070, 'Cedar Pond'],
    ['minnow', 1680, 1840, 1780, 1740, 'Cedar Pond'],
    ['crappie', 2780, 2090, 2630, 2035, 'Willow Mere'],
    ['crappie', 2940, 2170, 3090, 2250, 'Willow Mere'],
    ['crappie', 2860, 2270, 2730, 2370, 'Willow Mere'],
    ['crappie', 3020, 2040, 3120, 1940, 'Willow Mere'],
    // Jungle lagoon
    ['bass', 1860, 3730, 1710, 3630, 'Jungle Lagoon'],
    ['bass', 2000, 3800, 2140, 3900, 'Jungle Lagoon'],
    ['bass', 1740, 3860, 1610, 3950, 'Jungle Lagoon'],
    ['bass', 2080, 3710, 2210, 3620, 'Jungle Lagoon'],
    // Swamp pool
    ['catfish', 2140, 600, 2010, 750, 'Swamp Pool'],
    ['catfish', 2300, 555, 2420, 705, 'Swamp Pool'],
    ['catfish', 2210, 700, 2070, 820, 'Swamp Pool'],
    ['catfish', 2390, 650, 2520, 790, 'Swamp Pool'],
    // Coastal ocean
    ['tuna', 3470, 1650, 3295, 1670, 'Eastern Ocean'],
    ['tuna', 3500, 2020, 3325, 2020, 'Eastern Ocean'],
    ['tuna', 3020, 3610, 2880, 3500, 'Southern Ocean'],
    ['tuna', 620, 1190, 760, 1270, 'Western Ocean'],
    ['grouper', 2380, 4190, 2380, 4005, 'Southern Ocean'],
    ['grouper', 2740, 4080, 2660, 3920, 'Southern Ocean'],
    ['grouper', 500, 3340, 680, 3340, 'Western Ocean'],
    ['grouper', 3300, 2760, 3140, 2710, 'Eastern Ocean'],
    ['shark', 1660, 4270, 1660, 4085, 'Deep Southern Ocean'],
    ['shark', 2050, 4250, 2050, 4070, 'Deep Southern Ocean'],
    ['shark', 3440, 2890, 3260, 2820, 'Deep Eastern Ocean'],
    ['shark', 360, 2550, 540, 2550, 'Deep Western Ocean']
  ];

  function makeFishingSpots(saved = {}) {
    return fishingSeeds.map(([type,x,y,standX,standY,location], index) => {
      const id = `fish-${type}-${index}`; const prior=saved[id]||{};
      return { id,type,x,y,standX,standY,location,phase:index*0.83,remaining:prior.remaining ?? randomInt(12,20),respawnAt:prior.respawnAt||0 };
    });
  }

  const towns = [
    { name: 'Swamp Town', x: 1250, y: 520, description: 'A quiet settlement raised above the wet northern marsh.' }, { name: 'North Town', x: 2600, y: 1270, description: 'A hardy northern stop serving travellers headed toward the cold pines.' },
    { name: 'Desert Town', x: 520, y: 1980, description: 'A sun-baked trading post near the western sands.' }, { name: 'Starting Town', x: 1770, y: 2190, description: 'The central home town and starting point for your family adventure.' },
    { name: 'East Town', x: 3050, y: 1880, description: 'A green eastern settlement beside open grassland and water.' }, { name: 'South Town', x: 1350, y: 3100, description: 'A weathered town between the central fields and southern jungle.' },
    { name: 'Jungle Town', x: 2470, y: 3720, description: 'A warm jungle settlement surrounded by valuable hardwoods.' }
  ];

  const treeSeeds = [
    // Cedar — dense around the central starter region
    ['cedar',1360,1640],['cedar',1540,1540],['cedar',1770,1580],['cedar',1980,1740],
    ['cedar',1280,2040],['cedar',1510,2230],['cedar',1860,2290],['cedar',2190,1990],
    // Oak — central and eastern woodland
    ['oak',1080,1740],['oak',1180,1960],['oak',2080,2200],['oak',2350,1840],
    ['oak',2540,1670],['oak',2720,1900],
    // Willow — kept close to freshwater
    ['willow',1390,2000],['willow',1730,2060],['willow',2630,2030],['willow',2780,2380],
    ['willow',3050,2290],['willow',3150,2070],
    // Beech — transitional forests farther from the starter town
    ['beech',860,2380],['beech',1030,2610],['beech',1200,2820],['beech',2240,2730],
    ['beech',2530,2670],['beech',2860,2490],
    // Cherry — southern/eastern grass and dead-grass edges
    ['cherry',700,3010],['cherry',940,3180],['cherry',1410,3290],['cherry',1770,3370],
    ['cherry',2180,3190],['cherry',2450,3020],
    // Arctic Pine — far north only
    ['arcticPine',850,560],['arcticPine',1120,420],['arcticPine',1510,380],['arcticPine',1840,500],
    ['arcticPine',2320,500],['arcticPine',2730,650],
    // Mahogany — jungle interior
    ['mahogany',980,3650],['mahogany',1230,3840],['mahogany',2050,3700],['mahogany',2380,3870],
    ['mahogany',2650,3470],['mahogany',2780,3770],
    // Redwood — rare, deepest jungle
    ['redwood',1460,3970],['redwood',1760,4070],['redwood',2140,4040],['redwood',2440,3950]
  ];

  function makeTrees(saved = {}) {
    return treeSeeds.map(([type,x,y], index) => {
      const id = `${type}-${index}`; const prior = saved[id] || {};
      const def = TREE_TYPES[type];
      return { id, type, x, y, remaining: prior.remaining ?? randomInt(def.capacity[0], def.capacity[1]), respawnAt: prior.respawnAt || 0, max: prior.max || randomInt(def.capacity[0], def.capacity[1]) };
    });
  }

  const rockSeeds = [
    // Stone — widespread beginner deposits
    ['stone',1440,2380],['stone',1680,2480],['stone',1920,2450],['stone',2160,2330],
    ['stone',2440,2450],['stone',1120,2250],['stone',2720,2240],
    // Copper — central/eastern grass foothills
    ['copper',2260,1510],['copper',2470,1610],['copper',2700,1730],['copper',2890,1850],
    // Iron — eastern and southern approaches
    ['iron',2510,2460],['iron',2760,2570],['iron',3020,2410],['iron',3160,2590],
    // Coal — northern dead-grass hills
    ['coal',930,1310],['coal',1160,1390],['coal',1410,1260],['coal',1660,1380],
    // Silver — deep desert
    ['silver',420,2060],['silver',610,2220],['silver',790,2370],['silver',500,2570],
    // Pyrite — southern dead grass and rough borderlands
    ['pyrite',930,3010],['pyrite',1180,3160],['pyrite',1480,3000],['pyrite',1770,3150],
    // Gold — jungle ridges
    ['gold',2110,3430],['gold',2350,3550],['gold',2600,3640],['gold',2780,3440],
    // Crystal — rare remote northern deposits
    ['crystal',1040,460],['crystal',1420,330],['crystal',1940,390],['crystal',2480,480]
  ];

  function makeRocks(saved = {}) {
    return rockSeeds.map(([type,x,y], index) => {
      const id = `rock-${type}-${index}`, prior = saved[id] || {}, def = ROCK_TYPES[type];
      return { id, type, x, y, hp: prior.hp ?? def.hp, maxHp: def.hp, respawnAt: prior.respawnAt || 0 };
    });
  }

  // v0.11.0 world expansion: preserve the exact hand-built layout while
  // increasing all distances and biome areas by 50% in each direction.
  function scaleWorldPoint(point){ point[0] = Math.round(point[0] * MAP_SCALE); point[1] = Math.round(point[1] * MAP_SCALE); }
  continent.forEach(scaleWorldPoint);
  regions.forEach(region => region.points.forEach(scaleWorldPoint));
  waters.forEach(water => {
    water.x = Math.round(water.x * MAP_SCALE); water.y = Math.round(water.y * MAP_SCALE);
    water.rx = Math.round(water.rx * MAP_SCALE); water.ry = Math.round(water.ry * MAP_SCALE);
  });
  fishingSeeds.forEach(seed => { for(let i=1;i<=4;i++) seed[i] = Math.round(seed[i] * MAP_SCALE); });
  towns.forEach(town => { town.x = Math.round(town.x * MAP_SCALE); town.y = Math.round(town.y * MAP_SCALE); });
  treeSeeds.forEach(seed => { seed[1] = Math.round(seed[1] * MAP_SCALE); seed[2] = Math.round(seed[2] * MAP_SCALE); });
  rockSeeds.forEach(seed => { seed[1] = Math.round(seed[1] * MAP_SCALE); seed[2] = Math.round(seed[2] * MAP_SCALE); });
  enemySeeds.forEach(seed => { seed[1] = Math.round(seed[1] * MAP_SCALE); seed[2] = Math.round(seed[2] * MAP_SCALE); });

  const defaultInventory = () => Object.fromEntries(Object.keys(ITEM_DEFS).map(k => [k, 0]));
  const defaultState = () => ({
    version: VERSION,
    player: { x: Math.round(1780 * MAP_SCALE), y: Math.round(2340 * MAP_SCALE), targetX: Math.round(1780 * MAP_SCALE), targetY: Math.round(2340 * MAP_SCALE) },
    inventory: { ...defaultInventory(), stoneAxe: 1, stonePickaxe: 1, basicFishingRod: 1, coins: 100 },
    skills: Object.fromEntries(Object.keys(SKILL_DEFS).map(k => [k, { xp: 0 }])),
    equipment: { head: null, body: null, legs: null, boots: null, weapon: null, shield: null, cape: null, ring: null, food: null },
    treeState: {}, fishingState: {}, rockState: {}, enemyState: {}, combat: { hp: 10 }, poh: {}, quests: {}, shopDay: '', lastSavedAt: Date.now()
  });

  const camera = { x: 0, y: 0 };
  let state = loadState();
  if((state.skills.fortitude?.xp||0)<xpForLevel(10)) state.skills.fortitude={xp:xpForLevel(10)};
  let trees = makeTrees(state.treeState);
  let fishingSpots = makeFishingSpots(state.fishingState);
  let rocks = makeRocks(state.rockState);
  let enemies = makeEnemies(state.enemyState);
  let lastFrame = performance.now(), toastTimer = null, selectedItemKey = null;
  let activeTree = null, queuedTree = null, activeFishingSpot = null, queuedFishingSpot = null, activeRock = null, queuedRock = null, queuedTown = null, activeEnemy = null, queuedEnemy = null, combatElapsed = 0, actionElapsed = 0;
  let animationClock = 0;
  const floaters = [];
  let playerAttackAnim=0, playerHitFlash=0, defeatFlash=0, respawnLock=0;
  const miniMapView = { zoom: 1.8, centerX: state.player.x, centerY: state.player.y, dragging: false, lastX: 0, lastY: 0, lastDraw: 0 };

  function randomInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
  function xpForLevel(level){ return Math.floor(32 * Math.pow(Math.max(0, level - 1), 2)); }
  function levelFromXp(xp){ let level=1; while(level<100 && xp>=xpForLevel(level+1)) level++; return level; }
  function currentLevelProgress(xp){ const level=levelFromXp(xp); if(level>=100)return 1; return (xp-xpForLevel(level))/(xpForLevel(level+1)-xpForLevel(level)); }

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
  function gatheringDuration(def, toolType){
    const toolKey=bestOwnedTool(toolType), bonus=toolKey ? (ITEM_DEFS[toolKey].speedBonus || 0) : 0;
    return def.ticks*TICK_SECONDS*(1-bonus/100);
  }

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
      if(!old.skills?.fortitude || (old.skills.fortitude.xp||0)<xpForLevel(10)) fresh.skills.fortitude={xp:xpForLevel(10)};
      fresh.equipment={...fresh.equipment,...(old.equipment||{})}; fresh.treeState=old.treeState||{}; fresh.fishingState=old.fishingState||{}; fresh.rockState=old.rockState||{}; fresh.enemyState=old.enemyState||{}; fresh.combat={...fresh.combat,...(old.combat||{})}; fresh.poh=old.poh||{}; fresh.quests=old.quests||{};
      // The world was enlarged once in v0.11.0. Only saves from before that
      // release need coordinate scaling. The old `old.version !== VERSION`
      // check scaled positions again on every later update and could leave the
      // player/camera in an empty part of the map.
      const versionParts = String(old.version || '0.0.0').split('.').map(n => Number(n) || 0);
      const predatesWorldExpansion = versionParts[0] === 0 && versionParts[1] < 11;
      const brokenPopulationSave = old.version === '0.11.2';
      if(predatesWorldExpansion){
        fresh.enemyState=Object.fromEntries(Object.entries(fresh.enemyState).map(([id,enemy])=>[id,{...enemy,x:typeof enemy.x==='number'?Math.round(enemy.x*MAP_SCALE):enemy.x,y:typeof enemy.y==='number'?Math.round(enemy.y*MAP_SCALE):enemy.y}]));
      }
      if(brokenPopulationSave){
        // v0.11.2 may have multiplied already-expanded positions a second time.
        // Reset only position data; inventory, skills, equipment and resource
        // progress remain untouched.
        fresh.enemyState={};
        fresh.player={...fresh.player};
      } else if(old.player){
        const px=predatesWorldExpansion?Math.round(old.player.x*MAP_SCALE):Number(old.player.x);
        const py=predatesWorldExpansion?Math.round(old.player.y*MAP_SCALE):Number(old.player.y);
        if(Number.isFinite(px)&&Number.isFinite(py)&&isWalkable(px,py)) fresh.player={...fresh.player,x:px,y:py,targetX:px,targetY:py};
      }
      if(old.version && old.version !== VERSION){
        for(const [id,node] of Object.entries(fresh.treeState||{})){const type=id.replace(/-\d+$/,'');const def=TREE_TYPES[type];if(def&&node.remaining>0){node.remaining=Math.max(node.remaining,def.capacity[0]);node.max=Math.max(node.max||0,def.capacity[1]);}}
        for(const node of Object.values(fresh.fishingState||{}))if(node.remaining>0)node.remaining=Math.max(node.remaining,12);
        for(const [id,node] of Object.entries(fresh.rockState||{})){const type=id.split('-')[1],def=ROCK_TYPES[type];if(def&&node.hp>0)node.hp=Math.max(node.hp,def.hp);}
      }
      return fresh;
    } catch(e){ console.error(e); return defaultState(); }
  }

  function saveGame(show=false){
    state.treeState=Object.fromEntries(trees.map(t=>[t.id,{remaining:t.remaining,respawnAt:t.respawnAt,max:t.max}]));
    state.fishingState=Object.fromEntries(fishingSpots.map(f=>[f.id,{remaining:f.remaining,respawnAt:f.respawnAt}]));
    state.rockState=Object.fromEntries(rocks.map(r=>[r.id,{hp:r.hp,respawnAt:r.respawnAt}]));
    state.enemyState=Object.fromEntries(enemies.map(e=>[e.id,{x:e.x,y:e.y,hp:e.hp,respawnAt:e.respawnAt}]));
    state.lastSavedAt=Date.now(); state.version=VERSION; localStorage.setItem(SAVE_KEY,JSON.stringify(state)); if(show)showToast('Game saved');
  }
  function showToast(message){ ui.toast.textContent=message;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1800); }
  function worldToScreen(x,y){ return {x:x-camera.x,y:y-camera.y}; }
  function screenToWorld(x,y){ return {x:x+camera.x,y:y+camera.y}; }

  function townAt(x,y){ let best=null,bestD=112; for(const t of towns){const d=Math.hypot(x-t.x,y-t.y);if(d<bestD){best=t;bestD=d;}} return best; }
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
    return {key,style:ranged?'range':'melee',ticks:speed,accuracy,strength,range:ranged?260:58};
  }
  function armourDefence(){return Object.values(state.equipment).reduce((sum,key)=>sum+(parseInt(String(ITEM_DEFS[key]?.stats?.Defence||'0').replace(/[^-\d]/g,''))||0),0);}
  function playerCombatStats(){const w=weaponData(),skill=w.style==='range'?'range':'melee',level=levelFromXp(state.skills[skill]?.xp||0);return {style:w.style,level,ticks:w.ticks,range:w.range,accuracy:level*2+w.accuracy+5,maxHit:Math.max(1,Math.floor(level/8)+w.strength),defence:levelFromXp(state.skills.fortitude?.xp||0)+armourDefence()};}
  function hitChance(attack,defence){return clamp(attack/(attack+defence*1.35+8),.05,.95);}
  function enemyAt(x,y){let best=null,bestD=48;for(const e of enemies){if(e.hp<=0)continue;const d=Math.hypot(x-e.x,y-e.y);if(d<bestD){best=e;bestD=d;}}return best;}
  function beginCombat(enemy){activeEnemy=enemy;queuedEnemy=null;combatElapsed=0;enemy.target='player';enemy.returning=false;enemy.facing=state.player.x>=enemy.x?1:-1;ui.actionName.textContent=`Fighting ${ENEMY_TYPES[enemy.type].name}`;ui.status.textContent=`Fighting ${ENEMY_TYPES[enemy.type].name}...`;}
  function endCombat(message='Exploring'){if(activeEnemy)activeEnemy.target=null;activeEnemy=null;queuedEnemy=null;combatElapsed=0;ui.actionProgress.style.width='0%';ui.actionName.textContent=message;renderCombatHud();}
  function damageFloater(x,y,amount,hit=true){floaters.push({x,y,text:hit?String(amount):'0',life:1.1,damage:true,miss:!hit});}
  function rollEnemyDrops(enemy){
    const d=ENEMY_TYPES[enemy.type],received=[];
    for(const [key,min,max,chance] of d.drops||[]){
      if(Math.random()>chance)continue;const amount=randomInt(min,max);state.inventory[key]=(state.inventory[key]||0)+amount;received.push(`${ITEM_DEFS[key]?.name||key}${amount>1?` ×${amount}`:''}`);
    }
    renderInventory();
    if(received.length)floaters.push({x:enemy.x,y:enemy.y-72,text:received.slice(0,2).join(' · '),life:2});
    return received;
  }
  function killEnemy(enemy){const name=ENEMY_TYPES[enemy.type].name,drops=rollEnemyDrops(enemy);enemy.hp=0;enemy.respawnAt=Date.now()+ENEMY_TYPES[enemy.type].respawn*1000;enemy.target=null;showToast(`${name} defeated${drops.length?` · ${drops.join(', ')}`:''}`);endCombat('Victory');saveGame(false);}
  function playerAttack(enemy){
    const ps=playerCombatStats(),ed=ENEMY_TYPES[enemy.type],hit=Math.random()<hitChance(ps.accuracy,ed.defence);
    playerAttackAnim=.32;
    if(!hit){damageFloater(enemy.x,enemy.y-55,0,false);return;}
    const dmg=randomInt(1,ps.maxHit);enemy.hp=Math.max(0,enemy.hp-dmg);enemy.hitFlash=.18;damageFloater(enemy.x,enemy.y-55,dmg,true);
    const skill=ps.style==='range'?'range':'melee';state.skills[skill].xp=(state.skills[skill].xp||0)+dmg*4;state.skills.fortitude.xp=(state.skills.fortitude.xp||0)+dmg*2;renderSkills();
    if(enemy.hp<=0){enemy.deathAnim=.5;killEnemy(enemy);}
  }
  function respawnAtStartingTown(){
    const spawn={x:Math.round(1770*MAP_SCALE),y:Math.round(2295*MAP_SCALE)};
    state.combat.hp=maxPlayerHp();
    state.player.x=spawn.x;state.player.y=spawn.y;state.player.targetX=spawn.x;state.player.targetY=spawn.y;
    activeTree=queuedTree=activeRock=queuedRock=activeFishingSpot=queuedFishingSpot=queuedTown=activeEnemy=queuedEnemy=null;
    actionElapsed=0;combatElapsed=0;respawnLock=1.1;
    for(const foe of enemies){foe.target=null;foe.returning=true;foe.attackElapsed=0;foe.wanderX=foe.homeX;foe.wanderY=foe.homeY;}
    camera.x=clamp(spawn.x-canvas.width/2,0,WORLD.width-canvas.width);
    camera.y=clamp(spawn.y-canvas.height/2,0,WORLD.height-canvas.height);
    miniMapView.centerX=spawn.x;miniMapView.centerY=spawn.y;
    ui.actionProgress.style.width='0%';ui.actionName.textContent='Recovering at Starting Town';
    ui.status.textContent='You were defeated and returned to Starting Town.';
    defeatFlash=.85;showToast('Returned to Starting Town');renderCombatHud();saveGame(false);
  }
  function enemyAttack(enemy){
    if(respawnLock>0)return false;
    const d=ENEMY_TYPES[enemy.type],ps=playerCombatStats(),hit=Math.random()<hitChance(d.accuracy,ps.defence);
    enemy.attackAnim=.34;enemy.facing=state.player.x>=enemy.x?1:-1;
    if(!hit){damageFloater(state.player.x,state.player.y-58,0,false);return false;}
    const dmg=randomInt(1,d.maxHit);state.combat.hp=Math.max(0,state.combat.hp-dmg);playerHitFlash=.2;damageFloater(state.player.x,state.player.y-58,dmg,true);renderCombatHud();
    if(state.combat.hp<=0){respawnAtStartingTown();return true;}
    return false;
  }
  function eatFood(){const key=state.equipment.food,item=ITEM_DEFS[key];if(!key||!item?.heal||(state.inventory[key]||0)<1)return;const max=maxPlayerHp();if(state.combat.hp>=max)return showToast('Already at full health');state.inventory[key]--;state.combat.hp=Math.min(max,state.combat.hp+item.heal);if(state.inventory[key]<=0)state.equipment.food=null;showToast(`Ate ${item.name} · +${item.heal} HP`);renderInventory();renderEquipment();renderCombatHud();saveGame(false);}
  function renderCombatHud(){const max=maxPlayerHp();state.combat.hp=clamp(state.combat.hp||max,0,max);if(ui.combatHp){ui.combatHp.textContent=`${state.combat.hp}/${max}`;ui.combatHpFill.style.width=`${state.combat.hp/max*100}%`;}const key=state.equipment.food,count=key?(state.inventory[key]||0):0;if(ui.eatButton){ui.eatButton.hidden=!key||count<1;ui.eatButton.textContent=key?`Eat ${ITEM_DEFS[key].name.replace('Cooked ','')}`:'Eat';ui.eatCount.textContent=count;}}

  function handlePointer(event){
    event.preventDefault(); const rect=canvas.getBoundingClientRect(); const sx=(event.clientX-rect.left)*canvas.width/rect.width, sy=(event.clientY-rect.top)*canvas.height/rect.height; const p=screenToWorld(sx,sy);
    const town=townAt(p.x,p.y), tree=treeAt(p.x,p.y), rock=rockAt(p.x,p.y), fishingSpot=fishingSpotAt(p.x,p.y), enemy=enemyAt(p.x,p.y); stopAction(false);
    if(enemy){const d=ENEMY_TYPES[enemy.type],ps=playerCombatStats();queuedEnemy=enemy;queuedTree=queuedRock=queuedFishingSpot=queuedTown=null;const dist=Math.hypot(state.player.x-enemy.x,state.player.y-enemy.y);showToast(`${d.name} · ${enemy.hp}/${enemy.maxHp} HP · ${d.behaviour}`);if(dist<=ps.range){beginCombat(enemy);state.player.targetX=state.player.x;state.player.targetY=state.player.y;}else{const dx=state.player.x-enemy.x,dy=state.player.y-enemy.y,len=Math.hypot(dx,dy)||1;state.player.targetX=enemy.x+dx/len*(ps.range-8);state.player.targetY=enemy.y+dy/len*(ps.range-8);ui.actionName.textContent=`Approaching ${d.name}`;}return;}
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
    if(!isWalkable(p.x,p.y)){showToast('You cannot walk into the ocean');return;}
    queuedTree=null;queuedFishingSpot=null;queuedRock=null;queuedTown=null;state.player.targetX=p.x;state.player.targetY=p.y;ui.status.textContent='Walking...';ui.actionName.textContent='Exploring';
  }

  function stopAction(stopMovement=true){ if(activeEnemy)activeEnemy.target=null;activeEnemy=null;queuedEnemy=null; activeTree=null;queuedTree=null;activeFishingSpot=null;queuedFishingSpot=null;activeRock=null;queuedRock=null;queuedTown=null;actionElapsed=0;ui.actionProgress.style.width='0%';if(stopMovement){state.player.targetX=state.player.x;state.player.targetY=state.player.y;}ui.actionName.textContent='Exploring'; }
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
    animationClock+=dt;
    // Recover safely from malformed or out-of-bounds saved coordinates.
    const pstate=state.player;
    if(!Number.isFinite(pstate.x)||!Number.isFinite(pstate.y)||!isWalkable(pstate.x,pstate.y)){
      pstate.x=Math.round(1770*MAP_SCALE);pstate.y=Math.round(2295*MAP_SCALE);
      pstate.targetX=pstate.x;pstate.targetY=pstate.y;
      camera.x=clamp(pstate.x-canvas.width/2,0,WORLD.width-canvas.width);
      camera.y=clamp(pstate.y-canvas.height/2,0,WORLD.height-canvas.height);
      stopAction(false);
    }
    if(!Number.isFinite(pstate.targetX)||!Number.isFinite(pstate.targetY)){
      pstate.targetX=pstate.x;pstate.targetY=pstate.y;
    } playerAttackAnim=Math.max(0,playerAttackAnim-dt);playerHitFlash=Math.max(0,playerHitFlash-dt);defeatFlash=Math.max(0,defeatFlash-dt);respawnLock=Math.max(0,respawnLock-dt); const now=Date.now(); for(const t of trees){if(t.remaining<=0&&t.respawnAt&&now>=t.respawnAt){const def=TREE_TYPES[t.type];t.max=randomInt(def.capacity[0],def.capacity[1]);t.remaining=t.max;t.respawnAt=0;}}
    for(const r of rocks){if(r.hp<=0&&r.respawnAt&&now>=r.respawnAt){r.hp=r.maxHp;r.respawnAt=0;}}
    for(const f of fishingSpots){if(f.remaining<=0&&f.respawnAt&&now>=f.respawnAt){f.remaining=randomInt(12,20);f.respawnAt=0;}}
    for(const e of enemies){const d=ENEMY_TYPES[e.type];e.attackAnim=Math.max(0,(e.attackAnim||0)-dt);e.hitFlash=Math.max(0,(e.hitFlash||0)-dt);e.deathAnim=Math.max(0,(e.deathAnim||0)-dt);if(e.hp<=0){if(e.respawnAt&&now>=e.respawnAt){e.hp=e.maxHp;e.respawnAt=0;e.x=e.homeX;e.y=e.homeY;}continue;}e.wanderElapsed-=dt;if(!e.target&&d.behaviour==='aggressive'&&Math.hypot(e.x-state.player.x,e.y-state.player.y)<d.aggro&&regionAt(e.x,e.y).id===regionAt(state.player.x,state.player.y).id){e.target='player';activeEnemy=e;ui.actionName.textContent=`Attacked by ${d.name}`;}if(e.target==='player'){const dd=Math.hypot(state.player.x-e.x,state.player.y-e.y);if(regionAt(e.x,e.y).id!==regionAt(e.homeX,e.homeY).id||Math.hypot(e.x-e.homeX,e.y-e.homeY)>520){e.target=null;e.returning=true;}else if(dd>52){const step=Math.min(dd-48,135*dt);e.x+=(state.player.x-e.x)/dd*step;e.y+=(state.player.y-e.y)/dd*step;}e.attackElapsed+=dt;if(dd<=62&&e.attackElapsed>=d.ticks*TICK_SECONDS){e.attackElapsed=0;if(enemyAttack(e))break;}}else if(e.returning){const dd=Math.hypot(e.homeX-e.x,e.homeY-e.y);if(dd<5){e.x=e.homeX;e.y=e.homeY;e.returning=false;}else{const step=Math.min(dd,120*dt);e.x+=(e.homeX-e.x)/dd*step;e.y+=(e.homeY-e.y)/dd*step;}}else if(e.wanderElapsed<=0){e.wanderElapsed=randomInt(2,5);const a=Math.random()*Math.PI*2,r=Math.random()*70;e.wanderX=e.homeX+Math.cos(a)*r;e.wanderY=e.homeY+Math.sin(a)*r;}else{const dd=Math.hypot(e.wanderX-e.x,e.wanderY-e.y);if(dd>3){const step=Math.min(dd,45*dt);e.x+=(e.wanderX-e.x)/dd*step;e.y+=(e.wanderY-e.y)/dd*step;}}}
    const p=state.player;if(respawnLock>0){p.targetX=p.x;p.targetY=p.y;}const dx=p.targetX-p.x,dy=p.targetY-p.y,dist=Math.hypot(dx,dy);
    if(dist>2){const move=Math.min(dist,190*dt),nx=p.x+dx/dist*move,ny=p.y+dy/dist*move;if(isWalkable(nx,ny)){p.x=nx;p.y=ny;}else{p.targetX=p.x;p.targetY=p.y;queuedTree=null;queuedFishingSpot=null;queuedRock=null;queuedTown=null;showToast('That route is blocked');}}
    else {p.x=p.targetX;p.y=p.targetY;if(queuedEnemy && queuedEnemy.hp>0 && Math.hypot(p.x-queuedEnemy.x,p.y-queuedEnemy.y)<=playerCombatStats().range+12){beginCombat(queuedEnemy);}else if(queuedTown && Math.hypot(p.x-queuedTown.x,p.y-queuedTown.y)<105){const town=queuedTown;queuedTown=null;openTown(town);}else if(queuedRock && queuedRock.hp>0 && Math.hypot(p.x-queuedRock.x,p.y-queuedRock.y)<90)beginMining(queuedRock);else if(queuedFishingSpot && queuedFishingSpot.remaining>0 && Math.hypot(p.x-queuedFishingSpot.standX,p.y-queuedFishingSpot.standY)<20)beginFishing(queuedFishingSpot);else if(queuedTree && queuedTree.remaining>0 && Math.hypot(p.x-queuedTree.x,p.y-queuedTree.y)<78)beginChopping(queuedTree);else if(!activeTree&&!activeFishingSpot&&!activeRock&&!activeEnemy){ui.status.textContent='Tap the ground, a resource, a creature, or a town.';ui.actionName.textContent='Exploring';}}
    if(activeEnemy){
      const ps=playerCombatStats(),dist=Math.hypot(p.x-activeEnemy.x,p.y-activeEnemy.y);if(activeEnemy.hp<=0)endCombat('Victory');else if(dist>ps.range+25){queuedEnemy=activeEnemy;activeEnemy=null;}else{combatElapsed+=dt;ui.actionProgress.style.width=`${Math.min(100,combatElapsed/(ps.ticks*TICK_SECONDS)*100)}%`;if(combatElapsed>=ps.ticks*TICK_SECONDS){combatElapsed=0;playerAttack(activeEnemy);}}
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
    const region=regionAt(p.x,p.y);ui.region.textContent=region.name;if(document.getElementById('map')?.classList.contains('active'))drawMiniMap();
    const tx=clamp(p.x-canvas.width/2,0,WORLD.width-canvas.width),ty=clamp(p.y-canvas.height/2,0,WORLD.height-canvas.height),follow=1-Math.pow(.018,dt);
    const playerScreenX=p.x-camera.x,playerScreenY=p.y-camera.y;
    const cameraLostPlayer=!Number.isFinite(camera.x)||!Number.isFinite(camera.y)||playerScreenX<-40||playerScreenX>canvas.width+40||playerScreenY<-60||playerScreenY>canvas.height+70;
    if(cameraLostPlayer){camera.x=tx;camera.y=ty;}else{camera.x+=(tx-camera.x)*follow;camera.y+=(ty-camera.y)*follow;}
    for(let i=floaters.length-1;i>=0;i--){floaters[i].life-=dt;floaters[i].y-=24*dt;if(floaters[i].life<=0)floaters.splice(i,1);}
  }

  function smoothPath(points){
    const s=points.map(([x,y])=>worldToScreen(x,y));ctx.beginPath();ctx.moveTo(s[0].x,s[0].y);
    for(let i=0;i<s.length;i++){const p0=s[(i-1+s.length)%s.length],p1=s[i],p2=s[(i+1)%s.length],p3=s[(i+2)%s.length];const c1={x:p1.x+(p2.x-p0.x)/6,y:p1.y+(p2.y-p0.y)/6},c2={x:p2.x-(p3.x-p1.x)/6,y:p2.y-(p3.y-p1.y)/6};ctx.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,p2.x,p2.y);}ctx.closePath();
  }
  function fillSmooth(points,color,stroke=null,width=1){smoothPath(points);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function drawTileTexture(points){ctx.save();smoothPath(points);ctx.clip();const tile=54,minX=Math.floor(camera.x/tile)*tile,minY=Math.floor(camera.y/tile)*tile;for(let y=minY;y<camera.y+canvas.height+tile;y+=tile)for(let x=minX;x<camera.x+canvas.width+tile;x+=tile){const s=worldToScreen(x,y);ctx.fillStyle=((x/tile+y/tile)%2)?'rgba(255,255,255,.025)':'rgba(0,0,0,.025)';ctx.fillRect(s.x,s.y,tile,tile);}ctx.restore();}
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
  function drawFishingSpot(f){if(f.remaining<=0)return;const bob=Math.sin(animationClock*3+f.phase)*4,s=worldToScreen(f.x,f.y+bob);if(s.x<-70||s.y<-70||s.x>canvas.width+70||s.y>canvas.height+70)return;const d=FISH_TYPES[f.type];ctx.strokeStyle='rgba(233,249,255,.72)';ctx.lineWidth=3;for(let i=0;i<2;i++){ctx.beginPath();ctx.arc(s.x,s.y,12+i*11+Math.sin(animationClock*2+f.phase)*2,0,Math.PI*2);ctx.stroke();}drawFishShape(f.type,s.x,s.y,d.color);if(activeFishingSpot===f){ctx.strokeStyle='#f0cc64';ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x,s.y,38,0,Math.PI*2);ctx.stroke();}}
  function drawTown(t){
    const s=worldToScreen(t.x,t.y); if(s.x<-150||s.y<-150||s.x>canvas.width+150||s.y>canvas.height+150)return;
    const pulse=1+Math.sin(animationClock*1.4+t.x*.002)*.015;
    ctx.save();ctx.translate(s.x,s.y);ctx.scale(pulse,pulse);
    // town clearing and path
    ctx.fillStyle='rgba(44,37,29,.18)';ctx.beginPath();ctx.ellipse(0,10,92,64,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#b9a77f';ctx.fillRect(-10,-74,20,148);ctx.fillRect(-82,-8,164,18);
    ctx.fillStyle='#8b7655';ctx.fillRect(-7,-74,14,148);ctx.fillRect(-82,-5,164,12);
    // fence corners
    ctx.strokeStyle='#7b5636';ctx.lineWidth=4;for(const x of [-78,78]){ctx.beginPath();ctx.moveTo(x,-42);ctx.lineTo(x,46);ctx.stroke();}for(const y of [-43,47]){ctx.beginPath();ctx.moveTo(-78,y);ctx.lineTo(-35,y);ctx.moveTo(35,y);ctx.lineTo(78,y);ctx.stroke();}
    // three small buildings
    const houses=[[-48,-31,34,28,'#b8895b'],[25,-29,38,31,'#a87951'],[-18,22,42,30,'#c39a68']];
    for(const [x,y,w,h,c] of houses){ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x-3,y+h-1,w+6,7);ctx.fillStyle=c;ctx.fillRect(x,y,w,h);ctx.fillStyle='#6c4730';ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+w/2,y-15);ctx.lineTo(x+w+5,y);ctx.closePath();ctx.fill();ctx.fillStyle='#5a3827';ctx.fillRect(x+w/2-4,y+h-12,8,12);ctx.fillStyle='#e9d58f';ctx.fillRect(x+5,y+7,6,6);ctx.fillRect(x+w-11,y+7,6,6);}
    // well, crates and lamps
    ctx.fillStyle='#68717a';ctx.beginPath();ctx.arc(46,26,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#26313b';ctx.beginPath();ctx.arc(46,26,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#8a5e37';ctx.fillRect(-66,25,12,12);ctx.fillRect(-54,30,10,9);
    ctx.strokeStyle='#3d352d';ctx.lineWidth=3;for(const lx of [-70,70]){ctx.beginPath();ctx.moveTo(lx,-5);ctx.lineTo(lx,-25);ctx.stroke();ctx.fillStyle='#f4d56b';ctx.fillRect(lx-4,-30,8,8);}
    // central banner
    ctx.fillStyle='#e0d0a5';ctx.fillRect(-3,-10,6,28);ctx.fillStyle='#8a3f44';ctx.fillRect(3,-9,18,12);
    ctx.restore();
    ctx.fillStyle='#f0e9d2';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.strokeStyle='rgba(20,20,20,.8)';ctx.lineWidth=4;ctx.strokeText(t.name,s.x,s.y-92);ctx.fillText(t.name,s.x,s.y-92);ctx.textAlign='start';
  }
  function drawTree(t){
    const d=TREE_TYPES[t.type],scale=t.type==='redwood'?1.38:t.type==='mahogany'?1.18:t.type==='arcticPine'?1.12:1;
    const sway=t.remaining>0?(Math.sin(animationClock*1.45+t.x*.011)*2.2+(activeTree===t?Math.sin(animationClock*15)*4.2:0)):0;
    const s=worldToScreen(t.x+sway,t.y);if(s.x<-80||s.y<-110||s.x>canvas.width+80||s.y>canvas.height+80)return;
    ctx.save();ctx.translate(s.x,s.y);
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(0,29,28*scale,8,0,0,Math.PI*2);ctx.fill();
    if(t.remaining<=0){
      ctx.fillStyle=d.trunk;ctx.fillRect(-11*scale,8,22*scale,20);ctx.fillStyle='rgba(238,205,151,.72)';ctx.beginPath();ctx.ellipse(0,8,11*scale,4.5,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(65,45,31,.65)';ctx.fillRect(-20,24,9,4);ctx.fillRect(12,22,8,4);ctx.restore();return;
    }
    // trunk with lighter face and branch nubs
    ctx.fillStyle=d.trunk;ctx.fillRect(-8*scale,-6,16*scale,40);ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(-5*scale,-4,4*scale,35);
    ctx.fillStyle=d.trunk;ctx.fillRect(-18*scale,1,12*scale,7);ctx.fillRect(6*scale,-10,14*scale,7);
    ctx.fillStyle=d.leaves;
    if(t.type==='arcticPine'){
      for(let i=0;i<4;i++){const yy=-66+i*17,w=(28-i*2)*scale;ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(-w,yy+38);ctx.lineTo(w,yy+38);ctx.closePath();ctx.fill();}
      ctx.fillStyle='rgba(225,241,239,.45)';ctx.fillRect(-17,-48,12,5);ctx.fillRect(8,-31,13,5);
    }else if(t.type==='redwood'){
      ctx.fillRect(-34*scale,-58,68*scale,43);ctx.fillRect(-27*scale,-78,54*scale,28);ctx.fillRect(-18*scale,-91,36*scale,20);
    }else{
      ctx.beginPath();ctx.arc(-16*scale,-38,19*scale,0,Math.PI*2);ctx.arc(12*scale,-45,22*scale,0,Math.PI*2);ctx.arc(0,-61,20*scale,0,Math.PI*2);ctx.arc(25*scale,-28,15*scale,0,Math.PI*2);ctx.fill();
    }
    if(t.type==='cherry'){ctx.fillStyle='#f2b0b9';for(const [x,y] of [[-19,-55],[8,-67],[24,-39],[-2,-31]]){ctx.fillRect(x,y,7,7);}}
    if(t.type==='mahogany'){ctx.fillStyle='rgba(29,82,52,.72)';ctx.fillRect(-25,-52,16,11);ctx.fillRect(13,-59,15,12);}
    const ratio=Math.max(0,t.remaining/(t.max||t.remaining));
    if(activeTree===t){ctx.strokeStyle='#f0cc64';ctx.lineWidth=3;ctx.strokeRect(-38*scale,-96,76*scale,132);ctx.fillStyle='#151b22';ctx.fillRect(-30,-105,60,7);ctx.fillStyle='#68c77e';ctx.fillRect(-30,-105,60*ratio,7);}
    ctx.restore();
  }
  function drawRock(r){
    const s=worldToScreen(r.x,r.y);if(s.x<-75||s.y<-75||s.x>canvas.width+75||s.y>canvas.height+75)return;const d=ROCK_TYPES[r.type],ratio=Math.max(0,r.hp/r.maxHp),shake=activeRock===r?Math.sin(animationClock*17)*2.7:0;
    ctx.save();ctx.translate(s.x+shake,s.y);
    ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(0,23,31,8,0,0,Math.PI*2);ctx.fill();
    if(r.hp<=0){
      ctx.fillStyle=d.color;for(const [x,y,w,h] of [[-24,10,17,10],[-7,15,18,9],[10,8,20,13],[-12,4,12,8]]){ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x+3,y);ctx.lineTo(x+w-3,y+2);ctx.lineTo(x+w,y+h);ctx.closePath();ctx.fill();}ctx.restore();return;
    }
    // multi-faceted geometric deposit
    ctx.fillStyle=d.color;ctx.beginPath();ctx.moveTo(-30,17);ctx.lineTo(-24,-13);ctx.lineTo(-8,-32);ctx.lineTo(12,-29);ctx.lineTo(29,-9);ctx.lineTo(32,17);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.16)';ctx.beginPath();ctx.moveTo(-24,-13);ctx.lineTo(-8,-32);ctx.lineTo(-3,8);ctx.lineTo(-24,17);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.14)';ctx.beginPath();ctx.moveTo(-3,8);ctx.lineTo(12,-29);ctx.lineTo(29,-9);ctx.lineTo(32,17);ctx.closePath();ctx.fill();
    // ore flecks distinguish tiers
    ctx.fillStyle=r.type==='crystal'?'rgba(235,250,255,.9)':r.type==='gold'?'#ffe176':r.type==='pyrite'?'#f2cf55':'rgba(255,255,255,.28)';
    for(const [x,y] of [[-14,-11],[9,-15],[18,2]]){ctx.fillRect(x,y,5,4);}
    ctx.strokeStyle='rgba(24,29,34,.72)';ctx.lineWidth=2.2;
    if(ratio<.82){ctx.beginPath();ctx.moveTo(-5,-28);ctx.lineTo(1,-10);ctx.lineTo(-10,5);ctx.lineTo(-2,18);ctx.stroke();}
    if(ratio<.56){ctx.beginPath();ctx.moveTo(19,-12);ctx.lineTo(7,0);ctx.lineTo(18,14);ctx.stroke();}
    if(ratio<.3){ctx.beginPath();ctx.moveTo(-24,-10);ctx.lineTo(-13,-2);ctx.lineTo(-20,14);ctx.stroke();}
    if(activeRock===r){ctx.strokeStyle='#f0cc64';ctx.lineWidth=3;ctx.strokeRect(-38,-40,76,65);ctx.fillStyle='#151b22';ctx.fillRect(-30,-49,60,7);ctx.fillStyle='#68c77e';ctx.fillRect(-30,-49,60*ratio,7);}
    ctx.restore();
  }

  function drawEnemy(e){
    if(!e || e.hp<=0)return;
    const d=ENEMY_TYPES[e.type];
    if(!d)return;
    const s=worldToScreen(e.x,e.y);
    if(s.x<-100||s.y<-100||s.x>canvas.width+100||s.y>canvas.height+100)return;
    const bob=Math.sin(animationClock*3+(e.homeX||0)*.01)*1.5;
    const lunge=e.attackAnim>0?Math.sin((1-e.attackAnim/.32)*Math.PI)*8:0;
    const facing=e.facing||1;
    ctx.save();
    ctx.translate(s.x+facing*lunge,s.y+bob);
    if(e.hitFlash>0){ctx.shadowColor='#fff';ctx.shadowBlur=14;}
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(0,20,22,7,0,0,Math.PI*2);ctx.fill();
    const c=e.hitFlash>0?'#fff':d.color;
    ctx.fillStyle=c;ctx.strokeStyle='rgba(20,25,30,.75)';ctx.lineWidth=2;
    const shape=d.shape||e.type;
    if(['rabbit'].includes(shape)){
      ctx.beginPath();ctx.ellipse(0,5,15,11,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(8,-5,9,8,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillRect(5,-22,5,15);ctx.fillRect(12,-24,5,17);
    }else if(['deer','boar','wolf','iceWolf','jaguar','crocodile'].includes(shape)){
      const long=shape==='crocodile';ctx.beginPath();ctx.ellipse(0,5,long?25:19,long?8:12,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(facing*(long?22:17),0,long?11:9,long?6:8,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      if(!long){for(const x of [-10,8])ctx.fillRect(x,12,5,12);}else{ctx.beginPath();ctx.moveTo(-22,4);ctx.lineTo(-38,0);ctx.lineTo(-23,10);ctx.fill();}
      if(shape==='deer'){ctx.strokeStyle=c;ctx.beginPath();ctx.moveTo(facing*17,-7);ctx.lineTo(facing*22,-18);ctx.lineTo(facing*29,-23);ctx.moveTo(facing*22,-18);ctx.lineTo(facing*15,-24);ctx.stroke();}
    }else if(['spider','jungleSpider'].includes(shape)){
      ctx.beginPath();ctx.arc(0,4,13,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(11,2,8,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.strokeStyle=c;ctx.lineWidth=3;for(const yy of [-8,-3,4,9]){ctx.beginPath();ctx.moveTo(-8,yy+4);ctx.lineTo(-22,yy);ctx.moveTo(8,yy+4);ctx.lineTo(22,yy);ctx.stroke();}
    }else if(['snake','venomSnake','sandSerpent'].includes(shape)){
      ctx.strokeStyle=c;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-20,12);ctx.quadraticCurveTo(-5,-6,8,10);ctx.quadraticCurveTo(18,18,24,-3);ctx.stroke();ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(24,-5,9,7,0,0,Math.PI*2);ctx.fill();
    }else if(['dragon','frostDragon'].includes(shape)){
      ctx.beginPath();ctx.ellipse(0,5,27,16,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(facing*25,-5,13,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(-10,-5);ctx.lineTo(-28,-27);ctx.lineTo(2,-15);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(8,-6);ctx.lineTo(28,-28);ctx.lineTo(25,-8);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(-25,7);ctx.lineTo(-43,1);ctx.lineTo(-29,15);ctx.closePath();ctx.fill();
    }else if(['skeleton','wraith','bandit','frostTroll','gorilla','sandGolem','marshLurker'].includes(shape)){
      ctx.fillRect(-13,-10,26,30);ctx.beginPath();ctx.arc(0,-18,12,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillRect(-18,15,8,16);ctx.fillRect(10,15,8,16);
      if(shape==='skeleton'){ctx.fillStyle='#20242a';ctx.fillRect(-6,-21,4,4);ctx.fillRect(3,-21,4,4);}
    }else{
      ctx.beginPath();ctx.ellipse(0,4,18,14,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
    if(activeEnemy===e||e.target==='player'){
      const ratio=Math.max(0,e.hp/e.maxHp);ctx.fillStyle='#151b22';ctx.fillRect(-24,-38,48,6);ctx.fillStyle='#d65d64';ctx.fillRect(-24,-38,48*ratio,6);
    }
    ctx.restore();
  }

  function drawPlayer(){
    const working=activeTree||activeFishingSpot||activeRock,bounce=working?Math.sin(animationClock*8)*2:0,combatLunge=playerAttackAnim>0?Math.sin((1-playerAttackAnim/.32)*Math.PI)*9:0,combatDir=activeEnemy?(activeEnemy.x>=state.player.x?1:-1):1,s=worldToScreen(state.player.x+combatDir*combatLunge,state.player.y+bounce);
    const eq=state.equipment,bodyColor=equipmentColor(eq.body),headColor=equipmentColor(eq.head),legsColor=equipmentColor(eq.legs),bootsColor=equipmentColor(eq.boots),shieldColor=equipmentColor(eq.shield);
    ctx.save();ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=2;ctx.strokeRect(s.x-15,s.y-28,30,82);ctx.restore();
    ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(s.x-15,s.y+18,30,8);
    if(playerHitFlash>0){ctx.save();ctx.shadowColor='#fff';ctx.shadowBlur=15;}ctx.fillStyle=playerHitFlash>0?'#fff':'#d4a16e';ctx.fillRect(s.x-10,s.y-8,20,16);
    ctx.fillStyle=bodyColor||'#537fc4';ctx.fillRect(s.x-13,s.y+8,26,25);
    if(bodyColor){ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(s.x-10,s.y+11,20,4);ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(s.x-2,s.y+8,4,25);}
    const walking=Math.hypot(state.player.targetX-state.player.x,state.player.targetY-state.player.y)>3,step=walking&&Math.sin(animationClock*11)>0?3:0;
    ctx.fillStyle=legsColor||'#20262b';ctx.fillRect(s.x-11,s.y+33+step,8,14);ctx.fillRect(s.x+3,s.y+33-step,8,14);
    ctx.fillStyle=bootsColor||'#20262b';ctx.fillRect(s.x-12,s.y+45+step,9,7);ctx.fillRect(s.x+3,s.y+45-step,9,7);
    if(headColor){ctx.fillStyle=headColor;ctx.fillRect(s.x-12,s.y-20,24,9);ctx.fillRect(s.x-9,s.y-26,18,7);ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(s.x-7,s.y-24,10,2);}else{ctx.fillStyle='#20242a';ctx.fillRect(s.x-11,s.y-18,22,10);}
    if(shieldColor){ctx.fillStyle=shieldColor;ctx.beginPath();ctx.moveTo(s.x-18,s.y+8);ctx.lineTo(s.x-8,s.y+5);ctx.lineTo(s.x-7,s.y+25);ctx.lineTo(s.x-18,s.y+32);ctx.lineTo(s.x-27,s.y+25);ctx.lineTo(s.x-26,s.y+5);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=2;ctx.stroke();}
    if(activeTree||activeRock){const swing=Math.sin(animationClock*8)*.65;ctx.save();ctx.translate(s.x+11,s.y+8);ctx.rotate(-.8+swing);ctx.strokeStyle=activeRock?'#7b8590':'#8a6540';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(21,-15);ctx.stroke();ctx.restore();}else drawEquippedWeapon(s);
    if(playerAttackAnim>0&&activeEnemy){ctx.strokeStyle='rgba(255,238,160,.75)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x+combatDir*14,s.y+7,20+combatLunge,-1.1,1.1);ctx.stroke();}
    if(playerHitFlash>0)ctx.restore();
    if(activeFishingSpot){const fs=worldToScreen(activeFishingSpot.x,activeFishingSpot.y);ctx.strokeStyle='#dbc68b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(s.x+12,s.y+8);ctx.quadraticCurveTo((s.x+fs.x)/2,s.y-28,fs.x,fs.y);ctx.stroke();ctx.fillStyle='#f1d267';ctx.fillRect(fs.x-2,fs.y-2,4,4);}
  }
  function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#397f9f';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='rgba(210,240,248,.22)';ctx.lineWidth=3;for(let y=-30+(animationClock*12)%46;y<canvas.height+40;y+=46){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y+10);ctx.stroke();}fillSmooth(continent,'#72ae61','#d5c68b',8);drawTileTexture(continent);for(const r of regions){fillSmooth(r.points,r.color);drawTileTexture(r.points);}for(const w of waters)drawWater(w);for(const f of fishingSpots)drawFishingSpot(f);for(const t of towns)drawTown(t);for(const t of trees)drawTree(t);for(const r of rocks)drawRock(r);for(const e of enemies)drawEnemy(e);drawPlayer();for(const f of floaters){const s=worldToScreen(f.x,f.y);ctx.globalAlpha=Math.min(1,f.life*1.4);ctx.fillStyle=f.damage?(f.miss?'#d7dbe2':'#ff6b6b'):'#fff4b8';ctx.strokeStyle='rgba(20,20,20,.8)';ctx.lineWidth=4;ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.strokeText(f.text,s.x,s.y);ctx.fillText(f.text,s.x,s.y);ctx.textAlign='start';ctx.globalAlpha=1;}if(defeatFlash>0){ctx.fillStyle=`rgba(180,35,45,${Math.min(.42,defeatFlash*.7)})`;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='rgba(255,255,255,.95)';ctx.font='bold 25px system-ui';ctx.textAlign='center';ctx.fillText('Defeated',canvas.width/2,canvas.height/2-8);ctx.font='bold 13px system-ui';ctx.fillText('Returned to Starting Town',canvas.width/2,canvas.height/2+18);ctx.textAlign='start';}}

  function openPanel(name){document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.panel===name));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===name));}
  function renderInventory(){const owned=Object.entries(state.inventory).filter(([k,q])=>q>0&&ITEM_DEFS[k]);ui.inventory.innerHTML=owned.length?`<div class="item-grid">${owned.map(([k,q])=>`<button class="item" data-item="${k}"><strong>${ITEM_DEFS[k].name}</strong><span>×${q}</span><small>${ITEM_DEFS[k].type}</small></button>`).join('')}</div>`:`<div class="empty-state"><strong>Your inventory is empty</strong><span>Gather logs, fish, or ore to fill it.</span></div>`;ui.inventory.querySelectorAll('[data-item]').forEach(b=>b.addEventListener('click',()=>showItem(b.dataset.item)));}
  function renderSkills(){
    ui.skills.innerHTML=`<div class="skill-grid">${Object.entries(SKILL_DEFS).map(([key,def])=>{const xp=state.skills[key]?.xp||0,level=levelFromXp(xp),progress=currentLevelProgress(xp);return `<button class="skill-card ${key==='woodcutting'?'active-skill':''}" data-skill="${key}"><strong>${def.name}</strong><span>Level ${level} · ${xp.toLocaleString()} XP</span><div class="progress-track"><div class="progress-fill" style="width:${progress*100}%"></div></div></button>`}).join('')}</div>`;
    ui.skills.querySelectorAll('[data-skill]').forEach(b=>b.addEventListener('click',()=>showSkill(b.dataset.skill)));
  }
  function showSkill(key){const def=SKILL_DEFS[key],xp=state.skills[key]?.xp||0,level=levelFromXp(xp),next=level>=100?xpForLevel(100):xpForLevel(level+1);selectedItemKey=null;ui.itemType.textContent='Skill';ui.itemName.textContent=def.name;ui.itemDescription.textContent=def.description;ui.itemStats.innerHTML=`<div><span>Level</span><strong>${level}${level>=100?' · MAX':''}</strong></div><div><span>Experience</span><strong>${xp.toLocaleString()} XP</strong></div>${level<100?`<div><span>Next level</span><strong>${Math.max(0,next-xp).toLocaleString()} XP</strong></div>`:''}`;ui.itemAction.hidden=true;ui.dialog.showModal();}
  let currentTown = null;
  let cookingTimer=null, activeCooking=null;
  function totalLevel(){return Object.values(state.skills).reduce((sum,v)=>sum+levelFromXp(v?.xp||0),0);}
  function openTown(town){
    currentTown=town;ui.townName.textContent=town.name;ui.townDescription.textContent=town.description;
    const services=[['NPCs','Talk to local residents and view rotating requests.'],['Crafting Table','Create tools, weapons, armour, bows, and refined materials.'],['Cooking Fire','Cook fish over time.'],['Player-Owned Home','Build permanent rooms and family features.'],['Shop','Buy supplies or sell any owned item.'],['Notice Board','View this town’s rotating quests.'],['Inn','Hear a short local rumour and rest.']];
    ui.townServices.innerHTML=services.map(([name,description])=>`<button class="town-service" data-service="${name}"><strong>${name}</strong><span>${description}</span></button>`).join('');
    ui.townServices.querySelectorAll('[data-service]').forEach(b=>b.addEventListener('click',()=>{
      const service=b.dataset.service;ui.townDialog.close();
      if(service==='Crafting Table')return openCrafting(town);
      if(service==='Cooking Fire')return openCooking(town);
      if(service==='NPCs')return openNPCs(town);
      if(service==='Notice Board')return openQuests(town);
      if(service==='Player-Owned Home')return openPOH(town);
      if(service==='Shop')return openShop(town);
      if(service==='Inn')return openInn(town);
    }));
    ui.townDialog.showModal();ui.status.textContent=`Visiting ${town.name}`;ui.actionName.textContent='In town';
  }
  function openService(type,title,description,html){ui.serviceType.textContent=type;ui.serviceTitle.textContent=title;ui.serviceDescription.textContent=description||'';ui.serviceContent.innerHTML=html;ui.serviceDialog.showModal();}
  function cookingEntries(){return Object.entries(COOKING_DATA).filter(([raw])=>(state.inventory[raw]||0)>0);}
  function openCooking(town){
    const level=levelFromXp(state.skills.cooking?.xp||0),entries=cookingEntries();
    const cookingBanner=activeCooking?`<div class="cooking-status"><strong>Cooking ${ITEM_DEFS[activeCooking.raw].name.replace('Raw ','')}</strong><span><b data-cooking-left>${activeCooking.left}</b> remaining · <b data-cooking-done>${activeCooking.done}</b> cooked</span><div class="cook-progress active"><i data-cooking-progress></i></div></div>`:'';
    openService('Cooking Fire',`${town.name} Cooking Fire`,`Cooking level ${level} · Food cooks one item at a time.`,cookingBanner+(entries.length?entries.map(([raw,d])=>{const ok=level>=d.level,busy=!!activeCooking;return `<article class="service-card ${ok?'':'locked'}" data-cooking-card="${raw}"><div><strong>${d.name}</strong><span>Level ${d.level} · ${d.ticks} ticks · +${d.xp} XP</span><small>${ITEM_DEFS[raw].name} ×<b data-raw-count="${raw}">${state.inventory[raw]||0}</b></small></div><div class="service-actions"><button data-cook="${raw}" ${ok&&!busy?'':'disabled'}>Cook 1</button><button data-cookall="${raw}" ${ok&&!busy?'':'disabled'}>Cook All (${state.inventory[raw]||0})</button></div><div class="cook-progress"><i></i></div></article>`}).join(''):'<div class="empty-state"><strong>No raw food</strong><span>Catch fish or defeat creatures before using the fire.</span></div>'));
    ui.serviceContent.querySelectorAll('[data-cook]').forEach(b=>b.addEventListener('click',()=>startCooking(b.dataset.cook,1,town)));
    ui.serviceContent.querySelectorAll('[data-cookall]').forEach(b=>b.addEventListener('click',()=>startCooking(b.dataset.cook,state.inventory[b.dataset.cook]||0,town)));
    refreshCookingDisplay();
  }
  function refreshCookingDisplay(){
    if(!activeCooking)return;
    const progress=ui.serviceContent.querySelector('[data-cooking-progress]');if(progress)progress.style.width=`${activeCooking.progress||0}%`;
    const left=ui.serviceContent.querySelector('[data-cooking-left]');if(left)left.textContent=activeCooking.left;
    const done=ui.serviceContent.querySelector('[data-cooking-done]');if(done)done.textContent=activeCooking.done;
    const count=ui.serviceContent.querySelector(`[data-raw-count="${activeCooking.raw}"]`);if(count)count.textContent=state.inventory[activeCooking.raw]||0;
  }
  function finishCooking(town){
    if(cookingTimer){clearInterval(cookingTimer);cookingTimer=null;}activeCooking=null;ui.actionProgress.style.width='0%';ui.actionName.textContent='In town';ui.status.textContent=`Visiting ${town.name}`;openCooking(town);renderAll();saveGame(false);
  }
  function startCooking(raw,count,town){
    if(cookingTimer||activeCooking)return showToast('Already cooking');const d=COOKING_DATA[raw],level=levelFromXp(state.skills.cooking?.xp||0);if(!d||level<d.level||count<1)return;
    const amount=Math.min(count,state.inventory[raw]||0);if(amount<1)return;
    activeCooking={raw,left:amount,done:0,progress:0};const duration=d.ticks*TICK_SECONDS*1000;ui.actionName.textContent=`Cooking ${d.name.replace('Cooked ','')}`;ui.status.textContent=`Cooking ${amount} ${ITEM_DEFS[raw].name.replace('Raw ','')} at ${town.name}...`;openCooking(town);
    const cookOne=()=>{
      if(!activeCooking||activeCooking.left<=0||(state.inventory[raw]||0)<=0){finishCooking(town);return;}
      const start=performance.now();activeCooking.progress=0;refreshCookingDisplay();
      cookingTimer=setInterval(()=>{
        const elapsed=performance.now()-start;activeCooking.progress=Math.min(100,elapsed/duration*100);ui.actionProgress.style.width=`${activeCooking.progress}%`;refreshCookingDisplay();
        if(elapsed>=duration){clearInterval(cookingTimer);cookingTimer=null;state.inventory[raw]--;state.inventory[d.cooked]=(state.inventory[d.cooked]||0)+1;state.skills.cooking.xp=(state.skills.cooking.xp||0)+d.xp;activeCooking.left--;activeCooking.done++;activeCooking.progress=0;showToast(`Cooked ${d.name.replace('Cooked ','')}`);renderInventory();renderSkills();refreshCookingDisplay();setTimeout(cookOne,120);}
      },80);
    };
    cookOne();
  }
  function dayKey(){return new Date().toISOString().slice(0,10);}
  function townQuest(town,index=0){const pool=[['Gather cedar logs','cedarLog',8,45],['Catch minnows','rawMinnow',6,50],['Mine stone','stone',8,55],['Bring copper ore','copperOre',4,75],['Bring cooked fish','cookedMinnow',4,80]];let seed=[...town.name+dayKey()].reduce((a,c)=>a+c.charCodeAt(0),index*17);const q=pool[seed%pool.length];return{id:`${town.name}-${dayKey()}-${index}`,title:q[0],item:q[1],amount:q[2],reward:q[3]};}
  function openNPCs(town){const npcs=TOWN_NPCS[town.name]||[];openService('Residents',town.name,'Each town has its own residents. Their daily requests rotate with time.',npcs.map(([name,text],i)=>`<button class="npc-card" data-npc="${i}"><strong>${name}</strong><span>${text}</span></button>`).join(''));ui.serviceContent.querySelectorAll('[data-npc]').forEach(b=>b.addEventListener('click',()=>{const [name,text]=npcs[+b.dataset.npc],q=townQuest(town,+b.dataset.npc);openService('Conversation',name,text,questCard(q,town));bindQuestButtons(town);}));}
  function questCard(q,town){const done=state.quests[q.id]==='done',accepted=state.quests[q.id]==='accepted',owned=state.inventory[q.item]||0;return `<article class="quest-card"><strong>${q.title}</strong><span>Bring ${ITEM_DEFS[q.item]?.name||q.item} ${owned}/${q.amount}</span><small>Reward: ${q.reward} coins · Merching XP</small>${done?'<button disabled>Completed today</button>':accepted?`<button data-claim="${q.id}" ${owned>=q.amount?'':'disabled'}>Turn In</button>`:`<button data-accept="${q.id}">Accept Quest</button>`}</article>`;}
  function bindQuestButtons(town){ui.serviceContent.querySelectorAll('[data-accept]').forEach(b=>b.addEventListener('click',()=>{state.quests[b.dataset.accept]='accepted';openQuests(town);saveGame(false);}));ui.serviceContent.querySelectorAll('[data-claim]').forEach(b=>b.addEventListener('click',()=>{const quests=[townQuest(town,0),townQuest(town,1)],q=quests.find(x=>x.id===b.dataset.claim);if(!q||(state.inventory[q.item]||0)<q.amount)return;state.inventory[q.item]-=q.amount;state.inventory.coins=(state.inventory.coins||0)+q.reward;state.skills.merching.xp=(state.skills.merching.xp||0)+q.reward;state.quests[q.id]='done';renderAll();openQuests(town);saveGame(false);}));}
  function openQuests(town){const quests=[townQuest(town,0),townQuest(town,1)];openService('Notice Board',`${town.name} Requests`,'These requests rotate daily.',quests.map(q=>questCard(q,town)).join(''));bindQuestButtons(town);}
  function openPOH(town){const total=totalLevel();openService('Player-Owned Home','Your Home',`Total level ${total} · Coins ${state.inventory.coins||0}`,POH_UPGRADES.map(u=>{const built=state.poh[u.id],items=Object.entries(u.items).map(([k,n])=>`${ITEM_DEFS[k]?.name||k} ${state.inventory[k]||0}/${n}`).join(' · '),can=total>=u.total&&(state.inventory.coins||0)>=u.coins&&Object.entries(u.items).every(([k,n])=>(state.inventory[k]||0)>=n);return `<article class="service-card ${built?'built':can?'':'locked'}"><div><strong>${u.name}</strong><span>Total level ${u.total} · ${u.coins} coins</span><small>${u.description}<br>${items}</small></div><button data-build="${u.id}" ${built||!can?'disabled':''}>${built?'Built':'Build'}</button></article>`}).join(''));ui.serviceContent.querySelectorAll('[data-build]').forEach(b=>b.addEventListener('click',()=>{const u=POH_UPGRADES.find(x=>x.id===b.dataset.build);if(!u)return;state.inventory.coins-=u.coins;for(const[k,n]of Object.entries(u.items))state.inventory[k]-=n;state.poh[u.id]=true;renderAll();openPOH(town);saveGame(false);}));}
  function itemValue(key){const item=ITEM_DEFS[key];if(!item||key==='coins')return 0;const name=item.name.toLowerCase();let v=2;if(name.includes('crystal'))v=240;else if(name.includes('gold'))v=120;else if(name.includes('pyrite'))v=80;else if(name.includes('silver'))v=55;else if(name.includes('iron'))v=30;else if(name.includes('copper'))v=16;else if(name.includes('redwood'))v=90;else if(name.includes('mahogany'))v=65;else if(name.includes('shark'))v=75;else if(name.includes('grouper'))v=45;else if(name.includes('tuna'))v=30;else if(item.slot)v=20;return v;}
  function merchModifiers(){const level=levelFromXp(state.skills.merching?.xp||0);return{level,buy:Math.max(.75,1-level*.0025),sell:Math.min(1.25,.5+level*.005)};}
  function openShop(town){const m=merchModifiers(),stock=['stoneAxe','stonePickaxe','basicFishingRod','cedarLog','stone','rawMinnow','copperOre'];const buy=stock.map(k=>{const price=Math.max(1,Math.ceil(itemValue(k)*2*m.buy));return `<article class="shop-row"><div><strong>${ITEM_DEFS[k].name}</strong><span>${price} coins</span></div><button data-buy="${k}" data-price="${price}">Buy</button></article>`}).join('');const sell=Object.entries(state.inventory).filter(([k,q])=>q>0&&k!=='coins'&&ITEM_DEFS[k]).map(([k,q])=>{const price=Math.max(1,Math.floor(itemValue(k)*m.sell));return `<article class="shop-row"><div><strong>${ITEM_DEFS[k].name} ×${q}</strong><span>${price} coins each</span></div><div class="service-actions"><button data-sell="${k}" data-price="${price}">Sell 1</button><button data-sellall="${k}" data-price="${price}">Sell All</button></div></article>`}).join('');openService('Shop',`${town.name} Shop`,`Merching level ${m.level} · ${state.inventory.coins||0} coins`,`<details class="shop-group" open><summary>Buy basic supplies</summary>${buy}</details><details class="shop-group"><summary>Sell owned items</summary>${sell||'<p class="item-description">Nothing to sell.</p>'}</details>`);ui.serviceContent.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>{const p=+b.dataset.price;if((state.inventory.coins||0)<p)return showToast('Not enough coins');state.inventory.coins-=p;state.inventory[b.dataset.buy]=(state.inventory[b.dataset.buy]||0)+1;state.skills.merching.xp=(state.skills.merching.xp||0)+p;renderAll();openShop(town);saveGame(false);}));const sellFn=(b,all)=>{const k=b.dataset.sell||b.dataset.sellall,q=all?(state.inventory[k]||0):1;if(q<1||!confirm(`Sell ${all?'all ':''}${ITEM_DEFS[k].name}${all?` ×${q}`:''}?`))return;const gain=q*(+b.dataset.price);state.inventory[k]-=q;state.inventory.coins=(state.inventory.coins||0)+gain;state.skills.merching.xp=(state.skills.merching.xp||0)+gain;renderAll();openShop(town);saveGame(false);};ui.serviceContent.querySelectorAll('[data-sell]').forEach(b=>b.addEventListener('click',()=>sellFn(b,false)));ui.serviceContent.querySelectorAll('[data-sellall]').forEach(b=>b.addEventListener('click',()=>sellFn(b,true)));}
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
    const groups=['Materials','Tools','Weapons','Armour'];
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
    state.inventory[recipe.output]=(state.inventory[recipe.output]||0)+recipe.amount*count;
    state.skills.crafting.xp=(state.skills.crafting.xp||0)+recipe.xp*count;
    showToast(`Crafted ${ITEM_DEFS[recipe.output].name}${count>1?` ×${count}`:''}`);renderInventory();renderSkills();renderEquipment();renderCraftingMenu();saveGame(false);
  }

  function renderEquipment(){const slots=[['head','Head'],['cape','Cape'],['body','Body'],['weapon','Weapon'],['shield','Shield'],['legs','Legs'],['boots','Boots'],['ring','Ring'],['food','Food']];ui.equipment.innerHTML=`<div class="equipment-slots">${slots.map(([k,l])=>{const item=state.equipment[k]&&ITEM_DEFS[state.equipment[k]];return `<button class="slot ${item?'filled':''}" data-slot="${k}" ${item?'':'disabled'}><span>${l}</span><strong>${item?item.name:'Empty'}</strong></button>`}).join('')}</div>`;ui.equipment.querySelectorAll('.slot.filled').forEach(b=>b.addEventListener('click',()=>showItem(state.equipment[b.dataset.slot])));}
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

  function showItem(key){const item=ITEM_DEFS[key];if(!item)return;selectedItemKey=key;ui.itemType.textContent=item.type;ui.itemName.textContent=item.name;ui.itemDescription.textContent=item.description;const rows=[];if(item.uses)rows.push(['Used for',item.uses]);for(const [k,v] of Object.entries(item.stats||{}))rows.push([k,v]);ui.itemStats.innerHTML=rows.map(([k,v])=>`<div><span>${k}</span><strong>${v}</strong></div>`).join('');const equipped=Object.keys(state.equipment).find(s=>state.equipment[s]===key);if(item.slot&&state.inventory[key]>0){ui.itemAction.hidden=false;ui.itemAction.textContent=equipped?'Unequip':'Equip';}else ui.itemAction.hidden=true;ui.dialog.showModal();}
  function toggleSelectedEquipment(){const key=selectedItemKey,item=ITEM_DEFS[key];if(!item?.slot)return;const existing=Object.keys(state.equipment).find(s=>state.equipment[s]===key);if(existing)state.equipment[existing]=null;else state.equipment[item.slot]=key;ui.dialog.close();renderEquipment();renderCombatHud();saveGame(false);}
  function renderAll(){renderInventory();renderSkills();renderEquipment();renderMapPanel();renderCombatHud();}
  function frame(now){const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;update(dt);draw();if(now-miniMapView.lastDraw>180&&document.getElementById('map')?.classList.contains('active')){miniMapView.lastDraw=now;drawMiniMap();}requestAnimationFrame(frame);}

  canvas.addEventListener('pointerdown',handlePointer,{passive:false});document.getElementById('saveButton').addEventListener('click',()=>saveGame(true));document.getElementById('stopButton').addEventListener('click',()=>stopAction(true));ui.eatButton.addEventListener('click',eatFood);document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>openPanel(t.dataset.panel)));document.getElementById('closeItemButton').addEventListener('click',()=>ui.dialog.close());document.getElementById('closeTownButton').addEventListener('click',()=>ui.townDialog.close());document.getElementById('closeCraftingButton').addEventListener('click',()=>ui.craftingDialog.close());document.getElementById('closeServiceButton').addEventListener('click',()=>ui.serviceDialog.close());ui.itemAction.addEventListener('click',toggleSelectedEquipment);ui.dialog.addEventListener('click',e=>{if(e.target===ui.dialog)ui.dialog.close();});ui.townDialog.addEventListener('click',e=>{if(e.target===ui.townDialog)ui.townDialog.close();});ui.craftingDialog.addEventListener('click',e=>{if(e.target===ui.craftingDialog)ui.craftingDialog.close();});ui.serviceDialog.addEventListener('click',e=>{if(e.target===ui.serviceDialog)ui.serviceDialog.close();});document.getElementById('exportButton').addEventListener('click',()=>{saveGame(false);const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`idle-wanderer-save-${Date.now()}.json`;a.click();URL.revokeObjectURL(a.href);});document.getElementById('importInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(JSON.parse(await file.text())));location.reload();}catch{showToast('Invalid save file');}});document.getElementById('resetButton').addEventListener('click',()=>{if(confirm('Reset all progress on this device?')){localStorage.removeItem(SAVE_KEY);location.reload();}});window.addEventListener('pagehide',()=>saveGame(false));setInterval(()=>saveGame(false),15000);if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(console.error);
  camera.x=clamp(state.player.x-canvas.width/2,0,WORLD.width-canvas.width);camera.y=clamp(state.player.y-canvas.height/2,0,WORLD.height-canvas.height);renderAll();requestAnimationFrame(frame);
})();
