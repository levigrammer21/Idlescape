(() => {
  'use strict';

  const VERSION = '0.2.0';
  const SAVE_KEY = 'idle-wanderer-save-v2';
  const TICK_MS = 600;
  const WORLD = { width: 1500, height: 1200 };
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const ui = {
    status: document.getElementById('statusText'),
    actionName: document.getElementById('actionName'),
    actionProgress: document.getElementById('actionProgress'),
    inventory: document.getElementById('inventory'),
    skills: document.getElementById('skills'),
    equipment: document.getElementById('equipment'),
    crafting: document.getElementById('crafting'),
    toast: document.getElementById('toast'),
    hpText: document.getElementById('hpText'),
    hpFill: document.getElementById('hpFill')
  };

  const resources = [
    { id: 'tree1', type: 'tree', x: 355, y: 360, radius: 28, skill: 'woodcutting', item: 'sticks', xp: 12, duration: 2400 },
    { id: 'tree2', type: 'tree', x: 520, y: 260, radius: 28, skill: 'woodcutting', item: 'sticks', xp: 12, duration: 2400 },
    { id: 'tree3', type: 'tree', x: 965, y: 350, radius: 28, skill: 'woodcutting', item: 'sticks', xp: 12, duration: 2400 },
    { id: 'tree4', type: 'tree', x: 1120, y: 760, radius: 28, skill: 'woodcutting', item: 'sticks', xp: 12, duration: 2400 },
    { id: 'rock1', type: 'rock', x: 420, y: 750, radius: 25, skill: 'mining', item: 'rocks', xp: 14, duration: 2800 },
    { id: 'rock2', type: 'rock', x: 1040, y: 590, radius: 25, skill: 'mining', item: 'rocks', xp: 14, duration: 2800 },
    { id: 'rock3', type: 'rock', x: 1240, y: 900, radius: 25, skill: 'mining', item: 'rocks', xp: 14, duration: 2800 },
    { id: 'fish1', type: 'fish', x: 1110, y: 230, radius: 32, skill: 'fishing', item: 'fish', xp: 13, duration: 2600 },
    { id: 'fish2', type: 'fish', x: 1260, y: 300, radius: 32, skill: 'fishing', item: 'fish', xp: 13, duration: 2600 }
  ];

  const bench = { id: 'bench1', type: 'bench', x: 735, y: 520, radius: 34 };
  const ratSpawn = { x: 850, y: 690 };
  const camera = { x: 0, y: 0 };
  const floaters = [];

  const defaultState = () => ({
    version: VERSION,
    player: {
      x: 650, y: 620, targetX: 650, targetY: 620,
      hp: 10, maxHp: 10, attackCooldownUntil: 0
    },
    inventory: { sticks: 0, rocks: 0, fish: 0, club: 0 },
    skills: {
      woodcutting: { xp: 0 }, mining: { xp: 0 }, fishing: { xp: 0 }, combat: { xp: 0 }
    },
    equipment: { weapon: null },
    rat: { x: ratSpawn.x, y: ratSpawn.y, hp: 8, maxHp: 8, alive: true, respawnAt: 0, attackCooldownUntil: 0 },
    activeTarget: null,
    actionStartedAt: 0,
    lastSavedAt: Date.now()
  });

  let state = loadState();
  let lastFrame = performance.now();
  let toastTimer = null;

  function xpForLevel(level) { return 45 * level * level; }
  function levelFromXp(xp) { let level = 1; while (xp >= xpForLevel(level)) level++; return level; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const merged = defaultState();
      Object.assign(merged, parsed);
      merged.player = { ...merged.player, ...(parsed.player || {}) };
      merged.inventory = { ...merged.inventory, ...(parsed.inventory || {}) };
      merged.equipment = { ...merged.equipment, ...(parsed.equipment || {}) };
      merged.rat = { ...merged.rat, ...(parsed.rat || {}) };
      for (const key of Object.keys(merged.skills)) merged.skills[key] = { ...merged.skills[key], ...(parsed.skills?.[key] || {}) };
      applyOfflineProgress(merged);
      return merged;
    } catch (error) {
      console.error(error);
      return defaultState();
    }
  }

  function applyOfflineProgress(save) {
    if (!save.activeTarget?.startsWith('resource:') || !save.lastSavedAt) return;
    const resource = resources.find(r => `resource:${r.id}` === save.activeTarget);
    if (!resource) return;
    const elapsed = Math.min(Date.now() - save.lastSavedAt, 4 * 60 * 60 * 1000);
    const cycles = Math.floor(elapsed / resource.duration);
    if (cycles <= 0) return;
    save.inventory[resource.item] += cycles;
    save.skills[resource.skill].xp += cycles * resource.xp;
    setTimeout(() => showToast(`Offline: +${cycles} ${resource.item}`), 500);
  }

  function saveGame(showMessage = false) {
    state.lastSavedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    if (showMessage) showToast('Game saved');
  }

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1700);
  }

  function worldToScreen(x, y) { return { x: x - camera.x, y: y - camera.y }; }
  function screenToWorld(x, y) { return { x: x + camera.x, y: y + camera.y }; }

  function resourceName(resource) {
    return resource.type === 'tree' ? 'Cutting branches' : resource.type === 'rock' ? 'Breaking rock' : 'Fishing';
  }

  function stopAction(message = 'Tap the world to move.') {
    state.activeTarget = null;
    state.actionStartedAt = 0;
    ui.actionName.textContent = 'Exploring';
    ui.actionProgress.style.width = '0%';
    ui.status.textContent = message;
  }

  function moveNear(target, gap = 42) {
    const p = state.player;
    const angle = Math.atan2(p.y - target.y, p.x - target.x);
    p.targetX = clamp(target.x + Math.cos(angle) * gap, 24, WORLD.width - 24);
    p.targetY = clamp(target.y + Math.sin(angle) * gap, 30, WORLD.height - 24);
  }

  function beginResource(resource) {
    state.activeTarget = `resource:${resource.id}`;
    state.actionStartedAt = 0;
    moveNear(resource, resource.radius + 22);
    ui.status.textContent = `Walking to ${resource.type}...`;
    ui.actionName.textContent = resourceName(resource);
  }

  function beginCombat() {
    if (!state.rat.alive) return showToast('The rat is respawning');
    state.activeTarget = 'rat';
    state.actionStartedAt = 0;
    moveNear(state.rat, 45);
    ui.status.textContent = 'Approaching rat...';
    ui.actionName.textContent = 'Fighting rat';
  }

  function beginBench() {
    state.activeTarget = 'bench';
    state.actionStartedAt = 0;
    moveNear(bench, 48);
    ui.status.textContent = 'Walking to crafting bench...';
    ui.actionName.textContent = 'Using crafting bench';
  }

  function handlePointer(event) {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = (event.clientX - rect.left) * canvas.width / rect.width;
    const sy = (event.clientY - rect.top) * canvas.height / rect.height;
    const point = screenToWorld(sx, sy);

    if (state.rat.alive && Math.hypot(point.x - state.rat.x, point.y - state.rat.y) <= 42) return beginCombat();
    if (Math.hypot(point.x - bench.x, point.y - bench.y) <= bench.radius + 18) return beginBench();
    const hit = [...resources].reverse().find(r => Math.hypot(point.x - r.x, point.y - r.y) <= r.radius + 18);
    if (hit) return beginResource(hit);

    stopAction('Walking...');
    state.player.targetX = clamp(point.x, 20, WORLD.width - 20);
    state.player.targetY = clamp(point.y, 26, WORLD.height - 22);
  }

  function addFloater(x, y, text, kind = 'damage') {
    floaters.push({ x, y, text, kind, born: performance.now(), duration: 900 });
  }

  function playerAttackInterval() {
    return state.equipment.weapon === 'club' ? 4 * TICK_MS : 4 * TICK_MS;
  }

  function playerMaxHit() { return state.equipment.weapon === 'club' ? 3 : 1; }

  function damageRat() {
    const hit = Math.floor(Math.random() * (playerMaxHit() + 1));
    state.rat.hp = Math.max(0, state.rat.hp - hit);
    addFloater(state.rat.x, state.rat.y - 28, String(hit), hit ? 'damage' : 'zero');
    if (hit > 0) state.skills.combat.xp += hit * 4;
    if (state.rat.hp <= 0) {
      state.rat.alive = false;
      state.rat.respawnAt = Date.now() + 9000;
      state.inventory.fish += 1;
      showToast('Rat defeated · +1 raw fish');
      stopAction('Rat defeated. It will respawn.');
      renderPanels();
    }
  }

  function damagePlayer() {
    const hit = Math.floor(Math.random() * 3);
    state.player.hp = Math.max(0, state.player.hp - hit);
    addFloater(state.player.x, state.player.y - 30, String(hit), hit ? 'damage' : 'zero');
    if (state.player.hp <= 0) {
      state.player.hp = state.player.maxHp;
      state.player.x = 650; state.player.y = 620;
      state.player.targetX = 650; state.player.targetY = 620;
      stopAction('You were knocked out and returned to camp.');
      showToast('Knocked out!');
    }
  }

  function updateCombat(now) {
    const p = state.player;
    const rat = state.rat;
    if (!rat.alive) return stopAction('The rat is respawning.');
    if (distance(p, rat) > 58) return;
    ui.status.textContent = 'Trading blows on game ticks';
    ui.actionProgress.style.width = '100%';
    if (now >= p.attackCooldownUntil) {
      p.attackCooldownUntil = now + playerAttackInterval();
      damageRat();
    }
    if (rat.alive && now >= rat.attackCooldownUntil) {
      rat.attackCooldownUntil = now + 3 * TICK_MS;
      damagePlayer();
    }
  }

  function update(dt) {
    const p = state.player;
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const dist = Math.hypot(dx, dy);
    const speed = 132;
    if (dist > 2) {
      const move = Math.min(dist, speed * dt);
      p.x += dx / dist * move;
      p.y += dy / dist * move;
    } else {
      p.x = p.targetX; p.y = p.targetY;
      if (state.activeTarget?.startsWith('resource:')) {
        const resource = resources.find(r => `resource:${r.id}` === state.activeTarget);
        if (resource) {
          if (!state.actionStartedAt) state.actionStartedAt = Date.now();
          ui.status.textContent = resourceName(resource);
          const elapsed = Date.now() - state.actionStartedAt;
          ui.actionProgress.style.width = `${Math.min(100, elapsed / resource.duration * 100)}%`;
          if (elapsed >= resource.duration) {
            state.inventory[resource.item] += 1;
            state.skills[resource.skill].xp += resource.xp;
            state.actionStartedAt = Date.now();
            showToast(`+1 ${resource.item} · +${resource.xp} XP`);
            renderPanels(); saveGame(false);
          }
        }
      } else if (state.activeTarget === 'rat') updateCombat(Date.now());
      else if (state.activeTarget === 'bench') {
        ui.status.textContent = 'Crafting bench ready';
        ui.actionProgress.style.width = '100%';
        openPanel('crafting');
      } else ui.status.textContent = 'Tap a resource, rat, or bench.';
    }

    if (!state.rat.alive && Date.now() >= state.rat.respawnAt) {
      state.rat.alive = true; state.rat.hp = state.rat.maxHp;
      state.rat.x = ratSpawn.x; state.rat.y = ratSpawn.y;
      state.rat.attackCooldownUntil = 0;
      showToast('The rat has respawned');
    }

    const targetCameraX = clamp(p.x - canvas.width / 2, 0, WORLD.width - canvas.width);
    const targetCameraY = clamp(p.y - canvas.height / 2, 0, WORLD.height - canvas.height);
    const follow = 1 - Math.pow(0.001, dt);
    camera.x += (targetCameraX - camera.x) * follow;
    camera.y += (targetCameraY - camera.y) * follow;

    ui.hpText.textContent = `${p.hp} / ${p.maxHp}`;
    ui.hpFill.style.width = `${p.hp / p.maxHp * 100}%`;
  }

  function drawGround() {
    const tile = 40;
    const startX = Math.floor(camera.x / tile) * tile;
    const startY = Math.floor(camera.y / tile) * tile;
    for (let y = startY; y < camera.y + canvas.height + tile; y += tile) {
      for (let x = startX; x < camera.x + canvas.width + tile; x += tile) {
        const s = worldToScreen(x, y);
        ctx.fillStyle = ((x / tile + y / tile) % 2) ? '#70a85e' : '#76ae63';
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y), tile + 1, tile + 1);
      }
    }

    drawWorldRect(610, 0, 115, WORLD.height, '#c7a568');
    drawWorldRect(1030, 40, 420, 350, '#4f91b5');
    for (let y = 75; y < 370; y += 45) drawWorldRect(1060 + (y % 70), y, 90, 4, '#7abbd4');
    drawWorldRect(120, 880, 400, 130, '#669c54');
    drawWorldRect(210, 910, 210, 65, '#bc9b61');
  }

  function drawWorldRect(x, y, w, h, color) {
    const s = worldToScreen(x, y); ctx.fillStyle = color; ctx.fillRect(Math.round(s.x), Math.round(s.y), w, h);
  }

  function drawTree(r) {
    const s = worldToScreen(r.x, r.y);
    ctx.fillStyle = '#5a3824'; ctx.fillRect(s.x - 7, s.y + 8, 14, 31);
    ctx.fillStyle = '#2e6e3a'; ctx.fillRect(s.x - 22, s.y - 18, 44, 36);
    ctx.fillStyle = '#3d8947'; ctx.fillRect(s.x - 14, s.y - 29, 29, 28);
    ctx.fillStyle = '#78b95b'; ctx.fillRect(s.x - 9, s.y - 22, 10, 7);
  }

  function drawRock(r) {
    const s = worldToScreen(r.x, r.y);
    ctx.fillStyle = '#505865'; ctx.fillRect(s.x - 22, s.y - 8, 44, 25);
    ctx.fillStyle = '#717b89'; ctx.fillRect(s.x - 14, s.y - 20, 27, 25);
    ctx.fillStyle = '#929ba6'; ctx.fillRect(s.x - 8, s.y - 16, 9, 5);
  }

  function drawFishSpot(r) {
    const s = worldToScreen(r.x, r.y);
    ctx.strokeStyle = '#d8f3ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f4d35e'; ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
  }

  function drawBench() {
    const s = worldToScreen(bench.x, bench.y);
    ctx.fillStyle = '#4d3422'; ctx.fillRect(s.x - 27, s.y - 7, 54, 16);
    ctx.fillRect(s.x - 21, s.y + 8, 8, 22); ctx.fillRect(s.x + 13, s.y + 8, 8, 22);
    ctx.fillStyle = '#8d683f'; ctx.fillRect(s.x - 30, s.y - 14, 60, 12);
    ctx.fillStyle = '#c8a46e'; ctx.fillRect(s.x - 16, s.y - 19, 22, 5);
  }

  function drawRat() {
    if (!state.rat.alive) return;
    const r = state.rat; const s = worldToScreen(r.x, r.y);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(s.x - 15, s.y + 10, 30, 6);
    ctx.fillStyle = '#76717b'; ctx.fillRect(s.x - 15, s.y - 9, 29, 20);
    ctx.fillStyle = '#908a95'; ctx.fillRect(s.x + 8, s.y - 13, 12, 13);
    ctx.fillStyle = '#d7a1a8'; ctx.fillRect(s.x + 18, s.y - 8, 4, 4);
    ctx.fillStyle = '#2a2023'; ctx.fillRect(s.x + 14, s.y - 10, 3, 3);
    ctx.strokeStyle = '#b9898f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x - 14, s.y + 2); ctx.quadraticCurveTo(s.x - 27, s.y - 2, s.x - 30, s.y + 8); ctx.stroke();
    drawHealthBar(s.x - 20, s.y - 25, 40, r.hp / r.maxHp);
  }

  function drawHealthBar(x, y, w, ratio) {
    ctx.fillStyle = '#15191f'; ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = ratio > .5 ? '#62c879' : ratio > .25 ? '#dfb65b' : '#d7666b';
    ctx.fillRect(x + 1, y + 1, (w - 2) * ratio, 3);
  }

  function drawPlayer() {
    const p = state.player; const s = worldToScreen(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(Math.round(s.x - 11), Math.round(s.y + 14), 22, 7);
    ctx.fillStyle = '#e1b07b'; ctx.fillRect(Math.round(s.x - 7), Math.round(s.y - 18), 14, 14);
    ctx.fillStyle = '#4f74b7'; ctx.fillRect(Math.round(s.x - 10), Math.round(s.y - 4), 20, 19);
    ctx.fillStyle = '#242a34'; ctx.fillRect(Math.round(s.x - 9), Math.round(s.y + 15), 7, 10); ctx.fillRect(Math.round(s.x + 2), Math.round(s.y + 15), 7, 10);
    ctx.fillStyle = '#2b1a13'; ctx.fillRect(Math.round(s.x - 7), Math.round(s.y - 19), 14, 5);
    if (state.equipment.weapon === 'club') {
      ctx.fillStyle = '#6b492d'; ctx.fillRect(Math.round(s.x + 10), Math.round(s.y - 5), 5, 24);
      ctx.fillStyle = '#77747a'; ctx.fillRect(Math.round(s.x + 8), Math.round(s.y - 9), 10, 8);
    }
  }

  function drawFloaters(now) {
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i]; const age = now - f.born;
      if (age >= f.duration) { floaters.splice(i, 1); continue; }
      const s = worldToScreen(f.x, f.y - age * .035);
      ctx.globalAlpha = 1 - age / f.duration;
      ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 4;
      ctx.strokeStyle = '#1a1012'; ctx.strokeText(f.text, s.x, s.y);
      ctx.fillStyle = f.kind === 'zero' ? '#d9dce2' : '#ff666d'; ctx.fillText(f.text, s.x, s.y);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'start';
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGround();
    for (const r of resources) r.type === 'tree' ? drawTree(r) : r.type === 'rock' ? drawRock(r) : drawFishSpot(r);
    drawBench(); drawRat(); drawPlayer(); drawFloaters(performance.now());
  }

  function openPanel(id) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.panel === id));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === id));
  }

  function craftClub() {
    if (state.activeTarget !== 'bench' || distance(state.player, bench) > 60) return showToast('Stand at the crafting bench');
    if (state.inventory.sticks < 1 || state.inventory.rocks < 1) return showToast('Need 1 stick and 1 rock');
    state.inventory.sticks--; state.inventory.rocks--; state.inventory.club++;
    showToast('Crafted a crude club'); renderPanels(); saveGame(false);
  }

  function equipClub() {
    if (state.inventory.club < 1) return showToast('Craft a club first');
    state.equipment.weapon = state.equipment.weapon === 'club' ? null : 'club';
    renderPanels(); saveGame(false);
  }

  function renderPanels() {
    const names = { sticks: 'Stick', rocks: 'Rock', fish: 'Raw Fish', club: 'Crude Club' };
    ui.inventory.innerHTML = `<div class="item-grid">${Object.entries(state.inventory).map(([key, value]) => `<div class="item ${value ? '' : 'empty'}"><strong>${names[key]}</strong><span>${value}</span></div>`).join('')}</div>`;

    const labels = { woodcutting: 'Woodcutting', mining: 'Mining', fishing: 'Fishing', combat: 'Combat' };
    ui.skills.innerHTML = Object.entries(state.skills).map(([key, value]) => {
      const level = levelFromXp(value.xp); const previous = level === 1 ? 0 : xpForLevel(level - 1); const next = xpForLevel(level);
      const percent = clamp((value.xp - previous) / (next - previous) * 100, 0, 100);
      return `<div class="skill"><div class="skill-head"><strong>${labels[key]}</strong><span>Lv ${level} · ${value.xp} XP</span></div><div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div></div>`;
    }).join('');

    const equipped = state.equipment.weapon === 'club';
    ui.equipment.innerHTML = `<div class="equipment-grid"><div class="equipment-card"><div class="equipment-row"><div><strong>Weapon</strong><span>${equipped ? 'Crude Club' : 'Unarmed'}</span></div><button id="equipClubButton" class="equip-button" ${state.inventory.club < 1 ? 'disabled' : ''}>${equipped ? 'Unequip' : 'Equip club'}</button></div></div><div class="equipment-card"><strong>Attack speed</strong><span>${equipped ? '4 ticks · 2.4 seconds' : '4 ticks · 2.4 seconds'}</span></div><div class="equipment-card"><strong>Maximum hit</strong><span>${equipped ? '3' : '1'}</span></div></div>`;
    document.getElementById('equipClubButton')?.addEventListener('click', equipClub);

    const canCraft = state.inventory.sticks >= 1 && state.inventory.rocks >= 1 && state.activeTarget === 'bench' && distance(state.player, bench) <= 60;
    ui.crafting.innerHTML = `<div class="recipe"><div class="recipe-row"><div><strong>Crude Club</strong><span>1 stick + 1 rock</span></div><button id="craftClubButton" class="craft-button" ${canCraft ? '' : 'disabled'}>Craft</button></div></div><p class="hint">Tap the wooden bench in the world and walk to it before crafting.</p>`;
    document.getElementById('craftClubButton')?.addEventListener('click', craftClub);
  }

  function frame(now) {
    const dt = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now;
    update(dt); draw(); requestAnimationFrame(frame);
  }

  canvas.addEventListener('pointerdown', handlePointer, { passive: false });
  document.getElementById('stopButton').addEventListener('click', () => stopAction());
  document.getElementById('saveButton').addEventListener('click', () => saveGame(true));
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => openPanel(tab.dataset.panel)));

  document.getElementById('exportButton').addEventListener('click', () => {
    saveGame(false);
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `idle-wanderer-save-${Date.now()}.json`; link.click(); URL.revokeObjectURL(link.href);
  });

  document.getElementById('importInput').addEventListener('change', async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(JSON.parse(await file.text()))); location.reload(); }
    catch { showToast('Invalid save file'); }
  });

  document.getElementById('resetButton').addEventListener('click', () => {
    if (!confirm('Reset all progress on this device?')) return;
    localStorage.removeItem(SAVE_KEY); location.reload();
  });

  window.addEventListener('pagehide', () => saveGame(false));
  setInterval(() => saveGame(false), 15000);
  setInterval(renderPanels, 1000);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(console.error);

  camera.x = clamp(state.player.x - canvas.width / 2, 0, WORLD.width - canvas.width);
  camera.y = clamp(state.player.y - canvas.height / 2, 0, WORLD.height - canvas.height);
  renderPanels(); requestAnimationFrame(frame);
})();
