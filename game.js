(() => {
  'use strict';

  const VERSION = '0.4.0';
  const SAVE_KEY = 'idle-wanderer-save-v4';
  const LEGACY_KEYS = ['idle-wanderer-save-v3', 'idle-wanderer-save-v2'];
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
    itemDescription: document.getElementById('itemDescription'), itemStats: document.getElementById('itemStats'), itemAction: document.getElementById('itemActionButton')
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

  const ITEM_DEFS = {
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

  const towns = [
    { name: 'Swamp Town', x: 1250, y: 520 }, { name: 'North Town', x: 2600, y: 1270 },
    { name: 'Desert Town', x: 520, y: 1980 }, { name: 'Starting Town', x: 1770, y: 2190 },
    { name: 'East Town', x: 3050, y: 1880 }, { name: 'South Town', x: 1350, y: 3100 },
    { name: 'Jungle Town', x: 2470, y: 3720 }
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

  const defaultInventory = () => Object.fromEntries(Object.keys(ITEM_DEFS).map(k => [k, 0]));
  const defaultState = () => ({
    version: VERSION,
    player: { x: 1780, y: 2340, targetX: 1780, targetY: 2340 },
    inventory: defaultInventory(),
    skills: { woodcutting: { xp: 0 } },
    equipment: { head: null, body: null, legs: null, boots: null, weapon: null, shield: null, cape: null, ring: null },
    treeState: {}, lastSavedAt: Date.now()
  });

  const camera = { x: 0, y: 0 };
  let state = loadState();
  let trees = makeTrees(state.treeState);
  let lastFrame = performance.now(), toastTimer = null, selectedItemKey = null;
  let activeTree = null, queuedTree = null, actionElapsed = 0;
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

  function loadState(){
    try {
      let raw=localStorage.getItem(SAVE_KEY); if(!raw) for(const key of LEGACY_KEYS){raw=localStorage.getItem(key);if(raw)break;}
      if(!raw)return defaultState(); const old=JSON.parse(raw), fresh=defaultState();
      fresh.inventory={...fresh.inventory,...(old.inventory||{})};
      if(old.skills?.woodcutting) fresh.skills.woodcutting=old.skills.woodcutting;
      fresh.equipment={...fresh.equipment,...(old.equipment||{})}; fresh.treeState=old.treeState||{};
      if(old.player && isWalkable(old.player.x,old.player.y)) fresh.player={...fresh.player,x:old.player.x,y:old.player.y,targetX:old.player.x,targetY:old.player.y};
      return fresh;
    } catch(e){ console.error(e); return defaultState(); }
  }

  function saveGame(show=false){
    state.treeState=Object.fromEntries(trees.map(t=>[t.id,{remaining:t.remaining,respawnAt:t.respawnAt,max:t.max}]));
    state.lastSavedAt=Date.now(); state.version=VERSION; localStorage.setItem(SAVE_KEY,JSON.stringify(state)); if(show)showToast('Game saved');
  }
  function showToast(message){ ui.toast.textContent=message;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1800); }
  function worldToScreen(x,y){ return {x:x-camera.x,y:y-camera.y}; }
  function screenToWorld(x,y){ return {x:x+camera.x,y:y+camera.y}; }

  function treeAt(x,y){ let best=null,bestD=44; for(const t of trees){if(t.remaining<=0)continue;const d=Math.hypot(x-t.x,y-t.y);if(d<bestD){best=t;bestD=d;}} return best; }
  function handlePointer(event){
    event.preventDefault(); const rect=canvas.getBoundingClientRect(); const sx=(event.clientX-rect.left)*canvas.width/rect.width, sy=(event.clientY-rect.top)*canvas.height/rect.height; const p=screenToWorld(sx,sy);
    const tree=treeAt(p.x,p.y); stopAction(false);
    if(tree){
      const def=TREE_TYPES[tree.type], level=levelFromXp(state.skills.woodcutting.xp);
      if(level<def.level){showToast(`Woodcutting level ${def.level} required`);return;}
      queuedTree=tree; const dx=state.player.x-tree.x,dy=state.player.y-tree.y,d=Math.hypot(dx,dy)||1; const stand=58;
      state.player.targetX=tree.x+dx/d*stand;state.player.targetY=tree.y+dy/d*stand;ui.status.textContent=`Walking to ${def.name} tree...`;ui.actionName.textContent='Walking';return;
    }
    if(!isWalkable(p.x,p.y)){showToast(pointInWater(p.x,p.y)?'You cannot walk into the water':'You cannot leave the continent');return;}
    queuedTree=null;state.player.targetX=p.x;state.player.targetY=p.y;ui.status.textContent='Walking...';ui.actionName.textContent='Exploring';
  }

  function stopAction(stopMovement=true){ activeTree=null;queuedTree=null;actionElapsed=0;ui.actionProgress.style.width='0%';if(stopMovement){state.player.targetX=state.player.x;state.player.targetY=state.player.y;}ui.actionName.textContent='Exploring'; }
  function beginChopping(tree){ activeTree=tree;queuedTree=null;actionElapsed=0;const def=TREE_TYPES[tree.type];ui.actionName.textContent=`Chopping ${def.name}`;ui.status.textContent=`Chopping ${def.name} tree...`; }
  function awardLog(tree){
    const def=TREE_TYPES[tree.type]; state.inventory[def.log]=(state.inventory[def.log]||0)+1;state.skills.woodcutting.xp+=def.xp;tree.remaining--;
    floaters.push({x:tree.x,y:tree.y-55,text:`+1 ${ITEM_DEFS[def.log].name}  +${def.xp} XP`,life:1.4}); renderInventory();renderSkills();
    if(tree.remaining<=0){tree.respawnAt=Date.now()+def.respawn*1000;showToast(`${def.name} tree depleted`);stopAction(true);} else actionElapsed=0;
  }

  function update(dt){
    const now=Date.now(); for(const t of trees){if(t.remaining<=0&&t.respawnAt&&now>=t.respawnAt){const def=TREE_TYPES[t.type];t.max=randomInt(def.capacity[0],def.capacity[1]);t.remaining=t.max;t.respawnAt=0;}}
    const p=state.player,dx=p.targetX-p.x,dy=p.targetY-p.y,dist=Math.hypot(dx,dy);
    if(dist>2){const move=Math.min(dist,190*dt),nx=p.x+dx/dist*move,ny=p.y+dy/dist*move;if(isWalkable(nx,ny)){p.x=nx;p.y=ny;}else{p.targetX=p.x;p.targetY=p.y;queuedTree=null;showToast('That route is blocked');}}
    else {p.x=p.targetX;p.y=p.targetY;if(queuedTree && queuedTree.remaining>0 && Math.hypot(p.x-queuedTree.x,p.y-queuedTree.y)<78)beginChopping(queuedTree);else if(!activeTree){ui.status.textContent='Tap the ground to walk or tap a tree to chop.';ui.actionName.textContent='Exploring';}}
    if(activeTree){
      if(activeTree.remaining<=0 || Math.hypot(p.x-activeTree.x,p.y-activeTree.y)>85)stopAction(false);
      else {const def=TREE_TYPES[activeTree.type],duration=def.ticks*TICK_SECONDS;actionElapsed+=dt;ui.actionProgress.style.width=`${Math.min(100,actionElapsed/duration*100)}%`;if(actionElapsed>=duration)awardLog(activeTree);}
    } else ui.actionProgress.style.width='0%';
    const region=regionAt(p.x,p.y);ui.region.textContent=region.name;
    const tx=clamp(p.x-canvas.width/2,0,WORLD.width-canvas.width),ty=clamp(p.y-canvas.height/2,0,WORLD.height-canvas.height),follow=1-Math.pow(.018,dt);camera.x+=(tx-camera.x)*follow;camera.y+=(ty-camera.y)*follow;
    for(let i=floaters.length-1;i>=0;i--){floaters[i].life-=dt;floaters[i].y-=24*dt;if(floaters[i].life<=0)floaters.splice(i,1);}
  }

  function smoothPath(points){
    const s=points.map(([x,y])=>worldToScreen(x,y));ctx.beginPath();ctx.moveTo(s[0].x,s[0].y);
    for(let i=0;i<s.length;i++){const p0=s[(i-1+s.length)%s.length],p1=s[i],p2=s[(i+1)%s.length],p3=s[(i+2)%s.length];const c1={x:p1.x+(p2.x-p0.x)/6,y:p1.y+(p2.y-p0.y)/6},c2={x:p2.x-(p3.x-p1.x)/6,y:p2.y-(p3.y-p1.y)/6};ctx.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,p2.x,p2.y);}ctx.closePath();
  }
  function fillSmooth(points,color,stroke=null,width=1){smoothPath(points);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function drawTileTexture(points){ctx.save();smoothPath(points);ctx.clip();const tile=54,minX=Math.floor(camera.x/tile)*tile,minY=Math.floor(camera.y/tile)*tile;for(let y=minY;y<camera.y+canvas.height+tile;y+=tile)for(let x=minX;x<camera.x+canvas.width+tile;x+=tile){const s=worldToScreen(x,y);ctx.fillStyle=((x/tile+y/tile)%2)?'rgba(255,255,255,.025)':'rgba(0,0,0,.025)';ctx.fillRect(s.x,s.y,tile,tile);}ctx.restore();}
  function drawWater(w){const s=worldToScreen(w.x,w.y);ctx.beginPath();ctx.ellipse(s.x,s.y,w.rx,w.ry,0,0,Math.PI*2);ctx.fillStyle=w.color;ctx.fill();ctx.strokeStyle='rgba(176,220,231,.48)';ctx.lineWidth=5;ctx.stroke();ctx.save();ctx.beginPath();ctx.ellipse(s.x,s.y,w.rx-8,w.ry-8,0,0,Math.PI*2);ctx.clip();ctx.strokeStyle='rgba(210,241,250,.32)';ctx.lineWidth=4;for(let yy=-w.ry;yy<w.ry;yy+=42){ctx.beginPath();ctx.moveTo(s.x-w.rx*.58,s.y+yy);ctx.lineTo(s.x-w.rx*.1,s.y+yy);ctx.stroke();ctx.beginPath();ctx.moveTo(s.x+w.rx*.08,s.y+yy+18);ctx.lineTo(s.x+w.rx*.55,s.y+yy+18);ctx.stroke();}ctx.restore();}
  function drawTown(t){const s=worldToScreen(t.x,t.y);if(s.x<-100||s.y<-100||s.x>canvas.width+100||s.y>canvas.height+100)return;ctx.fillStyle='rgba(35,31,27,.2)';ctx.fillRect(s.x-54,s.y-38,108,76);ctx.strokeStyle='#e0d0a5';ctx.lineWidth=3;ctx.strokeRect(s.x-50,s.y-34,100,68);ctx.fillStyle='#b8895b';ctx.fillRect(s.x-25,s.y-17,50,34);ctx.fillStyle='#6b4c34';ctx.fillRect(s.x-6,s.y+1,12,16);ctx.fillStyle='#f0e9d2';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText(t.name,s.x,s.y-45);ctx.textAlign='start';}
  function drawTree(t){if(t.remaining<=0)return;const s=worldToScreen(t.x,t.y);if(s.x<-60||s.y<-90||s.x>canvas.width+60||s.y>canvas.height+60)return;const d=TREE_TYPES[t.type],scale=t.type==='redwood'?1.28:t.type==='mahogany'?1.12:1;ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(s.x-24*scale,s.y+22,48*scale,9);ctx.fillStyle=d.trunk;ctx.fillRect(s.x-7*scale,s.y-1,14*scale,34*scale);ctx.fillStyle=d.leaves;if(t.type==='arcticPine'){for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(s.x,s.y-55+i*17);ctx.lineTo(s.x-27*scale+i*2,s.y-10+i*14);ctx.lineTo(s.x+27*scale-i*2,s.y-10+i*14);ctx.closePath();ctx.fill();}}else{ctx.fillRect(s.x-25*scale,s.y-44,50*scale,35*scale);ctx.fillRect(s.x-17*scale,s.y-56,34*scale,20*scale);if(t.type==='cherry'){ctx.fillStyle='#e6a1a9';ctx.fillRect(s.x-18,s.y-49,7,7);ctx.fillRect(s.x+11,s.y-39,6,6);}}if(activeTree===t){ctx.strokeStyle='#f0cc64';ctx.lineWidth=3;ctx.strokeRect(s.x-31*scale,s.y-61,62*scale,96);}}
  function drawPlayer(){const s=worldToScreen(state.player.x,state.player.y);ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(s.x-13,s.y+18,26,7);ctx.fillStyle='#20242a';ctx.fillRect(s.x-11,s.y-18,22,10);ctx.fillStyle='#d4a16e';ctx.fillRect(s.x-10,s.y-8,20,16);ctx.fillStyle='#537fc4';ctx.fillRect(s.x-13,s.y+8,26,25);ctx.fillStyle='#20262b';ctx.fillRect(s.x-11,s.y+33,8,18);ctx.fillRect(s.x+3,s.y+33,8,18);}
  function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#101a16';ctx.fillRect(0,0,canvas.width,canvas.height);fillSmooth(continent,'#72ae61','#304537',8);drawTileTexture(continent);for(const r of regions){fillSmooth(r.points,r.color);drawTileTexture(r.points);}for(const w of waters)drawWater(w);for(const t of towns)drawTown(t);for(const t of trees)drawTree(t);drawPlayer();for(const f of floaters){const s=worldToScreen(f.x,f.y);ctx.globalAlpha=Math.min(1,f.life*1.4);ctx.fillStyle='#fff4b8';ctx.strokeStyle='rgba(20,20,20,.8)';ctx.lineWidth=4;ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.strokeText(f.text,s.x,s.y);ctx.fillText(f.text,s.x,s.y);ctx.textAlign='start';ctx.globalAlpha=1;}}

  function openPanel(name){document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.panel===name));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===name));}
  function renderInventory(){const owned=Object.entries(state.inventory).filter(([k,q])=>q>0&&ITEM_DEFS[k]);ui.inventory.innerHTML=owned.length?`<div class="item-grid">${owned.map(([k,q])=>`<button class="item" data-item="${k}"><strong>${ITEM_DEFS[k].name}</strong><span>×${q}</span><small>${ITEM_DEFS[k].type}</small></button>`).join('')}</div>`:`<div class="empty-state"><strong>Your inventory is empty</strong><span>Chop a tree to collect your first log.</span></div>`;ui.inventory.querySelectorAll('[data-item]').forEach(b=>b.addEventListener('click',()=>showItem(b.dataset.item)));}
  function renderSkills(){const xp=state.skills.woodcutting.xp,level=levelFromXp(xp),next=level>=100?xpForLevel(100):xpForLevel(level+1);ui.skills.innerHTML=`<div class="skill"><div class="skill-head"><strong>Woodcutting</strong><span>Level ${level}${level>=100?' · MAX':''}</span></div><div class="progress-track"><div class="progress-fill" style="width:${currentLevelProgress(xp)*100}%"></div></div><span>${xp.toLocaleString()} XP${level<100?` · ${Math.max(0,next-xp).toLocaleString()} to next level`:''}</span></div><p class="hint">Efficient progression is tuned toward roughly 5–10 hours from level 1 to 100. Higher-tier trees take longer per log but award substantially more XP.</p><div class="region-list">${Object.values(TREE_TYPES).map(d=>`<div><i style="background:${d.leaves}"></i><span>Lv ${d.level} ${d.name} · ${d.ticks} ticks · ${d.xp} XP</span></div>`).join('')}</div>`;}
  function renderEquipment(){const slots=[['head','Head'],['cape','Cape'],['body','Body'],['weapon','Weapon'],['shield','Shield'],['legs','Legs'],['boots','Boots'],['ring','Ring']];ui.equipment.innerHTML=`<div class="equipment-slots">${slots.map(([k,l])=>{const item=state.equipment[k]&&ITEM_DEFS[state.equipment[k]];return `<button class="slot ${item?'filled':''}" data-slot="${k}" ${item?'':'disabled'}><span>${l}</span><strong>${item?item.name:'Empty'}</strong></button>`}).join('')}</div>`;ui.equipment.querySelectorAll('.slot.filled').forEach(b=>b.addEventListener('click',()=>showItem(state.equipment[b.dataset.slot])));}
  function renderMapPanel(){ui.map.innerHTML=`<div class="map-summary"><strong>Expanded hand-built continent</strong><span>Organic biome transitions, four future fishing waters, seven town sites, and 23 hand-placed trees.</span></div><div class="region-list">${regions.map(r=>`<div><i style="background:${r.color}"></i><span>${r.name}</span></div>`).join('')}${waters.map(w=>`<div><i style="background:${w.color}"></i><span>${w.name}</span></div>`).join('')}</div><p class="hint">This is still intentionally sparse. The current goal is to approve the geography, travel distances, water placement, and Woodcutting tree distribution before adding another skill.</p>`;}
  function showItem(key){const item=ITEM_DEFS[key];if(!item)return;selectedItemKey=key;ui.itemType.textContent=item.type;ui.itemName.textContent=item.name;ui.itemDescription.textContent=item.description;const rows=[];if(item.uses)rows.push(['Used for',item.uses]);for(const [k,v] of Object.entries(item.stats||{}))rows.push([k,v]);ui.itemStats.innerHTML=rows.map(([k,v])=>`<div><span>${k}</span><strong>${v}</strong></div>`).join('');const equipped=Object.keys(state.equipment).find(s=>state.equipment[s]===key);if(item.slot&&state.inventory[key]>0){ui.itemAction.hidden=false;ui.itemAction.textContent=equipped?'Unequip':'Equip';}else ui.itemAction.hidden=true;ui.dialog.showModal();}
  function toggleSelectedEquipment(){const key=selectedItemKey,item=ITEM_DEFS[key];if(!item?.slot)return;const existing=Object.keys(state.equipment).find(s=>state.equipment[s]===key);if(existing)state.equipment[existing]=null;else state.equipment[item.slot]=key;ui.dialog.close();renderEquipment();saveGame(false);}
  function renderAll(){renderInventory();renderSkills();renderEquipment();renderMapPanel();}
  function frame(now){const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;update(dt);draw();requestAnimationFrame(frame);}

  canvas.addEventListener('pointerdown',handlePointer,{passive:false});document.getElementById('saveButton').addEventListener('click',()=>saveGame(true));document.getElementById('stopButton').addEventListener('click',()=>stopAction(true));document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>openPanel(t.dataset.panel)));document.getElementById('closeItemButton').addEventListener('click',()=>ui.dialog.close());ui.itemAction.addEventListener('click',toggleSelectedEquipment);ui.dialog.addEventListener('click',e=>{if(e.target===ui.dialog)ui.dialog.close();});document.getElementById('exportButton').addEventListener('click',()=>{saveGame(false);const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`idle-wanderer-save-${Date.now()}.json`;a.click();URL.revokeObjectURL(a.href);});document.getElementById('importInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(JSON.parse(await file.text())));location.reload();}catch{showToast('Invalid save file');}});document.getElementById('resetButton').addEventListener('click',()=>{if(confirm('Reset all progress on this device?')){localStorage.removeItem(SAVE_KEY);location.reload();}});window.addEventListener('pagehide',()=>saveGame(false));setInterval(()=>saveGame(false),15000);if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(console.error);
  camera.x=clamp(state.player.x-canvas.width/2,0,WORLD.width-canvas.width);camera.y=clamp(state.player.y-canvas.height/2,0,WORLD.height-canvas.height);renderAll();requestAnimationFrame(frame);
})();
