(() => {
  'use strict';

  const VERSION = '0.3.0';
  const SAVE_KEY = 'idle-wanderer-save-v3';
  const LEGACY_KEY = 'idle-wanderer-save-v2';
  const WORLD = { width: 2500, height: 2900 };
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

  const ITEM_DEFS = {
    sticks: { name: 'Stick', type: 'Material', description: 'A straight piece of wood. Useful for simple tools, weapons, and fires.', uses: 'Crafting · Firemaking' },
    rocks: { name: 'Loose Rock', type: 'Material', description: 'A sturdy loose rock that could be shaped or fastened to a handle.', uses: 'Crafting · Construction' },
    fish: { name: 'Raw Fish', type: 'Food ingredient', description: 'A freshly caught fish. It needs to be cooked at a campfire or cooking pot.', uses: 'Cooking', stats: { 'Heals': 'Nothing while raw' } },
    club: { name: 'Crude Club', type: 'Weapon', description: 'A rough club made by fastening a heavy rock to a stick.', slot: 'weapon', stats: { 'Attack speed': '4 ticks · 2.4 seconds', 'Maximum hit': '3', 'Strength': '+2' } },
    clothShirt: { name: 'Cloth Shirt', type: 'Body armour', description: 'A basic shirt that offers a little protection without restricting movement.', slot: 'body', stats: { 'Defence': '+1', 'Weight': 'Light' } }
  };

  // Hand-built continent translated from the supplied sketch. Polygons intentionally preserve narrow biome joins.
  const regions = [
    { id: 'central', name: 'Central Grass', color: '#72ad60', points: [[830,1020],[1640,1010],[1820,1170],[1760,1620],[1540,1730],[1490,1980],[1040,2010],[870,1840],[750,1500],[760,1180]] },
    { id: 'northDead', name: 'Northern Dead Grass', color: '#95885e', points: [[760,650],[1810,650],[1830,1080],[1640,1140],[1510,1030],[830,1040],[670,900]] },
    { id: 'swamp', name: 'Swamp', color: '#56795d', points: [[820,170],[1740,170],[1860,330],[1810,690],[760,690],[650,520],[720,300]] },
    { id: 'desert', name: 'Desert', color: '#c9a45f', points: [[120,920],[690,920],[810,1110],[760,1450],[850,1780],[680,2140],[160,2180],[80,1920],[100,1260]] },
    { id: 'eastGrass', name: 'Eastern Grass', color: '#67a65a', points: [[1740,1030],[2260,1050],[2390,1230],[2320,1700],[2050,1840],[1730,1640],[1800,1180]] },
    { id: 'southDead', name: 'Southern Dead Grass', color: '#887d58', points: [[790,1900],[1560,1900],[1710,2080],[1600,2390],[880,2400],[690,2220]] },
    { id: 'jungle', name: 'Jungle', color: '#3f8152', points: [[760,2330],[1680,2330],[1850,2510],[1730,2790],[760,2780],[620,2600]] }
  ];

  const towns = [
    { name: 'Swamp Town', x: 1450, y: 470 }, { name: 'North Town', x: 920, y: 835 },
    { name: 'Desert Town', x: 360, y: 1320 }, { name: 'Starting Town', x: 1230, y: 1450 },
    { name: 'East Town', x: 2110, y: 1330 }, { name: 'South Town', x: 900, y: 2160 },
    { name: 'Jungle Town', x: 1380, y: 2550 }
  ];

  const defaultState = () => ({
    version: VERSION,
    player: { x: 1230, y: 1570, targetX: 1230, targetY: 1570 },
    inventory: { sticks: 0, rocks: 0, fish: 0, club: 0, clothShirt: 0 },
    skills: { woodcutting: { xp: 0 }, mining: { xp: 0 }, fishing: { xp: 0 }, cooking: { xp: 0 }, crafting: { xp: 0 }, combat: { xp: 0 } },
    equipment: { head: null, body: null, legs: null, boots: null, weapon: null, shield: null, cape: null, ring: null },
    lastSavedAt: Date.now()
  });

  const camera = { x: 0, y: 0 };
  let state = loadState();
  let lastFrame = performance.now();
  let toastTimer = null;
  let selectedItemKey = null;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function xpForLevel(level) { return 45 * level * level; }
  function levelFromXp(xp) { let level = 1; while (xp >= xpForLevel(level)) level++; return level; }

  function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i][0], yi = points[i][1], xj = points[j][0], yj = points[j][1];
      const intersect = ((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / ((yj - yi) || .00001) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function regionAt(x, y) { return regions.find(r => pointInPolygon(x, y, r.points)) || null; }
  function isWalkable(x, y) { return !!regionAt(x, y); }

  function closestWalkable(x, y) {
    if (isWalkable(x, y)) return { x, y };
    let best = { x: state.player.x, y: state.player.y, d: Infinity };
    for (const region of regions) for (const [px, py] of region.points) {
      const d = Math.hypot(x - px, y - py);
      if (d < best.d) best = { x: px, y: py, d };
    }
    const towardCenter = regionAt(best.x, best.y) ? best : { x: 1230, y: 1450 };
    return { x: towardCenter.x, y: towardCenter.y };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_KEY);
      if (!raw) return defaultState();
      const old = JSON.parse(raw); const fresh = defaultState();
      fresh.inventory = { ...fresh.inventory, ...(old.inventory || {}) };
      fresh.skills = { ...fresh.skills, ...(old.skills || {}) };
      fresh.equipment = { ...fresh.equipment, ...(old.equipment || {}) };
      if (old.player && isWalkable(old.player.x, old.player.y)) fresh.player = { ...fresh.player, x: old.player.x, y: old.player.y, targetX: old.player.x, targetY: old.player.y };
      return fresh;
    } catch (e) { console.error(e); return defaultState(); }
  }

  function saveGame(show = false) {
    state.lastSavedAt = Date.now(); state.version = VERSION;
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    if (show) showToast('Game saved');
  }

  function showToast(message) {
    ui.toast.textContent = message; ui.toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1700);
  }

  function worldToScreen(x, y) { return { x: x - camera.x, y: y - camera.y }; }
  function screenToWorld(x, y) { return { x: x + camera.x, y: y + camera.y }; }

  function handlePointer(event) {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = (event.clientX - rect.left) * canvas.width / rect.width;
    const sy = (event.clientY - rect.top) * canvas.height / rect.height;
    const point = screenToWorld(sx, sy);
    if (!isWalkable(point.x, point.y)) { showToast('You cannot leave the continent'); return; }
    state.player.targetX = point.x; state.player.targetY = point.y;
    ui.status.textContent = 'Walking...'; ui.actionName.textContent = 'Exploring'; ui.actionProgress.style.width = '35%';
  }

  function stopMovement() {
    state.player.targetX = state.player.x; state.player.targetY = state.player.y;
    ui.status.textContent = 'Standing still.'; ui.actionProgress.style.width = '0%';
  }

  function update(dt) {
    const p = state.player; const dx = p.targetX - p.x, dy = p.targetY - p.y, dist = Math.hypot(dx, dy);
    if (dist > 2) {
      const move = Math.min(dist, 185 * dt); const nx = p.x + dx / dist * move, ny = p.y + dy / dist * move;
      if (isWalkable(nx, ny)) { p.x = nx; p.y = ny; }
      else stopMovement();
      ui.actionProgress.style.width = '65%';
    } else {
      p.x = p.targetX; p.y = p.targetY; ui.actionProgress.style.width = '0%';
      ui.status.textContent = 'Tap anywhere on the continent to walk.';
    }

    const region = regionAt(p.x, p.y); ui.region.textContent = region?.name || 'Outside';
    const targetCameraX = clamp(p.x - canvas.width / 2, 0, WORLD.width - canvas.width);
    const targetCameraY = clamp(p.y - canvas.height / 2, 0, WORLD.height - canvas.height);
    const follow = 1 - Math.pow(0.012, dt);
    camera.x += (targetCameraX - camera.x) * follow; camera.y += (targetCameraY - camera.y) * follow;
  }

  function drawPolygon(region) {
    ctx.beginPath();
    region.points.forEach(([x,y], i) => { const s = worldToScreen(x,y); i ? ctx.lineTo(s.x,s.y) : ctx.moveTo(s.x,s.y); });
    ctx.closePath(); ctx.fillStyle = region.color; ctx.fill(); ctx.strokeStyle = 'rgba(30,42,31,.72)'; ctx.lineWidth = 7; ctx.stroke();
    ctx.save(); ctx.clip();
    const tile = 48, minX = Math.floor(camera.x / tile) * tile, minY = Math.floor(camera.y / tile) * tile;
    for (let y=minY; y<camera.y+canvas.height+tile; y+=tile) for (let x=minX; x<camera.x+canvas.width+tile; x+=tile) {
      if (!pointInPolygon(x+tile/2,y+tile/2,region.points)) continue;
      const s=worldToScreen(x,y); ctx.fillStyle=((x/tile+y/tile)%2)?'rgba(255,255,255,.025)':'rgba(0,0,0,.025)'; ctx.fillRect(s.x,s.y,tile,tile);
    }
    ctx.restore();
  }

  function drawTown(town) {
    const s = worldToScreen(town.x, town.y);
    ctx.fillStyle = 'rgba(25,29,31,.25)'; ctx.fillRect(s.x-54,s.y-37,108,74);
    ctx.strokeStyle = '#dbcda2'; ctx.lineWidth = 3; ctx.strokeRect(s.x-50,s.y-34,100,68);
    ctx.fillStyle = '#b98b58'; ctx.fillRect(s.x-25,s.y-18,50,36); ctx.fillStyle='#6b4c34'; ctx.fillRect(s.x-6,s.y+2,12,16);
    ctx.fillStyle='#eee7cf'; ctx.font='bold 13px system-ui'; ctx.textAlign='center'; ctx.fillText(town.name,s.x,s.y-46); ctx.textAlign='start';
  }

  function drawPlayer() {
    const s=worldToScreen(state.player.x,state.player.y);
    ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(Math.round(s.x-12),Math.round(s.y+15),24,7);
    ctx.fillStyle='#e1b07b'; ctx.fillRect(Math.round(s.x-7),Math.round(s.y-18),14,14);
    ctx.fillStyle='#4f74b7'; ctx.fillRect(Math.round(s.x-10),Math.round(s.y-4),20,19);
    ctx.fillStyle='#242a34'; ctx.fillRect(Math.round(s.x-9),Math.round(s.y+15),7,10); ctx.fillRect(Math.round(s.x+2),Math.round(s.y+15),7,10);
    ctx.fillStyle='#2b1a13'; ctx.fillRect(Math.round(s.x-7),Math.round(s.y-19),14,5);
    if (state.equipment.weapon==='club') { ctx.fillStyle='#6b492d'; ctx.fillRect(s.x+10,s.y-5,5,24); ctx.fillStyle='#77747a'; ctx.fillRect(s.x+8,s.y-9,10,8); }
  }

  function draw() {
    ctx.fillStyle='#18221d'; ctx.fillRect(0,0,canvas.width,canvas.height);
    for (const region of regions) drawPolygon(region);
    for (const town of towns) drawTown(town);
    drawPlayer();
  }

  function openPanel(id) {
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.panel===id));
    document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===id));
  }

  function inventoryEntries() { return Object.entries(state.inventory).filter(([key,value])=>value>0 && ITEM_DEFS[key]); }

  function renderInventory() {
    const entries=inventoryEntries();
    if (!entries.length) { ui.inventory.innerHTML='<div class="empty-state"><strong>Your inventory is empty</strong><span>Only items you actually own will appear here.</span></div>'; return; }
    ui.inventory.innerHTML=`<div class="item-grid">${entries.map(([key,value])=>`<button class="item" data-item="${key}"><strong>${ITEM_DEFS[key].name}</strong><span>×${value}</span><small>${ITEM_DEFS[key].type}</small></button>`).join('')}</div>`;
    ui.inventory.querySelectorAll('[data-item]').forEach(b=>b.addEventListener('click',()=>showItem(b.dataset.item)));
  }

  function renderSkills() {
    const labels={woodcutting:'Woodcutting',mining:'Mining',fishing:'Fishing',cooking:'Cooking',crafting:'Crafting',combat:'Combat'};
    ui.skills.innerHTML=Object.entries(state.skills).map(([key,val])=>{const level=levelFromXp(val.xp||0), prev=level===1?0:xpForLevel(level-1), next=xpForLevel(level), pct=clamp(((val.xp||0)-prev)/(next-prev)*100,0,100);return `<div class="skill"><div class="skill-head"><strong>${labels[key]}</strong><span>Lv ${level} · ${val.xp||0} XP</span></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>`}).join('');
  }

  function renderEquipment() {
    const slots=[['head','Head'],['cape','Cape'],['body','Body'],['weapon','Weapon'],['shield','Shield'],['legs','Legs'],['boots','Boots'],['ring','Ring']];
    ui.equipment.innerHTML=`<div class="equipment-slots">${slots.map(([key,label])=>{const item=state.equipment[key]&&ITEM_DEFS[state.equipment[key]];return `<button class="slot ${item?'filled':''}" data-slot="${key}" ${item?'':'disabled'}><span>${label}</span><strong>${item?item.name:'Empty'}</strong></button>`}).join('')}</div>`;
    ui.equipment.querySelectorAll('.slot.filled').forEach(b=>b.addEventListener('click',()=>showItem(state.equipment[b.dataset.slot])));
  }

  function renderMapPanel() {
    ui.map.innerHTML=`<div class="map-summary"><strong>Hand-built continent</strong><span>Seven connected regions based on your drawing.</span></div><div class="region-list">${regions.map(r=>`<div><i style="background:${r.color}"></i><span>${r.name}</span></div>`).join('')}</div><p class="hint">Town boxes are scale markers only. Walk through every region and check whether the sizes and narrow entrances feel right.</p>`;
  }

  function showItem(key) {
    const item=ITEM_DEFS[key]; if(!item)return; selectedItemKey=key;
    ui.itemType.textContent=item.type; ui.itemName.textContent=item.name; ui.itemDescription.textContent=item.description;
    const rows=[]; if(item.uses) rows.push(['Used for',item.uses]); for(const [k,v] of Object.entries(item.stats||{})) rows.push([k,v]);
    ui.itemStats.innerHTML=rows.map(([k,v])=>`<div><span>${k}</span><strong>${v}</strong></div>`).join('');
    const equippedSlot=Object.keys(state.equipment).find(slot=>state.equipment[slot]===key);
    if(item.slot && state.inventory[key]>0) { ui.itemAction.hidden=false; ui.itemAction.textContent=equippedSlot?'Unequip':'Equip'; }
    else ui.itemAction.hidden=true;
    ui.dialog.showModal();
  }

  function toggleSelectedEquipment() {
    const key=selectedItemKey,item=ITEM_DEFS[key]; if(!item?.slot)return;
    const existing=Object.keys(state.equipment).find(slot=>state.equipment[slot]===key);
    if(existing) state.equipment[existing]=null; else state.equipment[item.slot]=key;
    ui.dialog.close(); renderAll(); saveGame(false);
  }

  function renderAll(){renderInventory();renderSkills();renderEquipment();renderMapPanel();}

  function frame(now){const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;update(dt);draw();requestAnimationFrame(frame);}

  canvas.addEventListener('pointerdown',handlePointer,{passive:false});
  document.getElementById('saveButton').addEventListener('click',()=>saveGame(true));
  document.getElementById('stopButton').addEventListener('click',stopMovement);
  document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>openPanel(tab.dataset.panel)));
  document.getElementById('closeItemButton').addEventListener('click',()=>ui.dialog.close());
  ui.itemAction.addEventListener('click',toggleSelectedEquipment);
  ui.dialog.addEventListener('click',e=>{if(e.target===ui.dialog)ui.dialog.close();});
  document.getElementById('exportButton').addEventListener('click',()=>{saveGame(false);const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`idle-wanderer-save-${Date.now()}.json`;a.click();URL.revokeObjectURL(a.href);});
  document.getElementById('importInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(JSON.parse(await file.text())));location.reload();}catch{showToast('Invalid save file');}});
  document.getElementById('resetButton').addEventListener('click',()=>{if(confirm('Reset all progress on this device?')){localStorage.removeItem(SAVE_KEY);localStorage.removeItem(LEGACY_KEY);location.reload();}});
  window.addEventListener('pagehide',()=>saveGame(false)); setInterval(()=>saveGame(false),15000);
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(console.error);
  camera.x=clamp(state.player.x-canvas.width/2,0,WORLD.width-canvas.width);camera.y=clamp(state.player.y-canvas.height/2,0,WORLD.height-canvas.height);
  renderAll();requestAnimationFrame(frame);
})();
