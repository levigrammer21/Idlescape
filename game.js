(() => {
  'use strict';

  const VERSION = '0.1.0';
  const SAVE_KEY = 'idle-wanderer-save-v1';
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const ui = {
    status: document.getElementById('statusText'),
    actionName: document.getElementById('actionName'),
    actionProgress: document.getElementById('actionProgress'),
    inventory: document.getElementById('inventory'),
    skills: document.getElementById('skills'),
    toast: document.getElementById('toast')
  };

  const resources = [
    { id: 'tree1', type: 'tree', x: 78, y: 164, radius: 26, skill: 'woodcutting', item: 'logs', xp: 12, duration: 2400 },
    { id: 'tree2', type: 'tree', x: 306, y: 248, radius: 26, skill: 'woodcutting', item: 'logs', xp: 12, duration: 2400 },
    { id: 'rock1', type: 'rock', x: 92, y: 420, radius: 24, skill: 'mining', item: 'ore', xp: 14, duration: 2800 },
    { id: 'rock2', type: 'rock', x: 294, y: 500, radius: 24, skill: 'mining', item: 'ore', xp: 14, duration: 2800 },
    { id: 'fish1', type: 'fish', x: 302, y: 94, radius: 30, skill: 'fishing', item: 'fish', xp: 13, duration: 2600 }
  ];

  const defaultState = () => ({
    version: VERSION,
    player: { x: 192, y: 330, targetX: 192, targetY: 330 },
    inventory: { logs: 0, ore: 0, fish: 0 },
    skills: {
      woodcutting: { xp: 0 },
      mining: { xp: 0 },
      fishing: { xp: 0 }
    },
    activeResourceId: null,
    actionStartedAt: 0,
    lastSavedAt: Date.now()
  });

  let state = loadState();
  let lastFrame = performance.now();
  let toastTimer = null;

  function xpForLevel(level) { return 45 * level * level; }
  function levelFromXp(xp) {
    let level = 1;
    while (xp >= xpForLevel(level)) level++;
    return level;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const merged = defaultState();
      Object.assign(merged, parsed);
      merged.player = { ...merged.player, ...(parsed.player || {}) };
      merged.inventory = { ...merged.inventory, ...(parsed.inventory || {}) };
      for (const key of Object.keys(merged.skills)) merged.skills[key] = { ...merged.skills[key], ...(parsed.skills?.[key] || {}) };
      applyOfflineProgress(merged);
      return merged;
    } catch (error) {
      console.error(error);
      return defaultState();
    }
  }

  function applyOfflineProgress(save) {
    if (!save.activeResourceId || !save.lastSavedAt) return;
    const resource = resources.find(r => r.id === save.activeResourceId);
    if (!resource) return;
    const elapsed = Math.min(Date.now() - save.lastSavedAt, 4 * 60 * 60 * 1000);
    const cycles = Math.floor(elapsed / resource.duration);
    if (cycles <= 0) return;
    save.inventory[resource.item] += cycles;
    save.skills[resource.skill].xp += cycles * resource.xp;
    setTimeout(() => showToast(`Offline gains: +${cycles} ${resource.item}`), 600);
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
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1800);
  }

  function resourceName(resource) {
    return resource.type === 'tree' ? 'Chopping tree' : resource.type === 'rock' ? 'Mining rock' : 'Fishing';
  }

  function stopAction() {
    state.activeResourceId = null;
    state.actionStartedAt = 0;
    ui.actionName.textContent = 'Exploring';
    ui.actionProgress.style.width = '0%';
    ui.status.textContent = 'Tap the ground to move.';
  }

  function beginInteraction(resource) {
    state.player.targetX = resource.x;
    state.player.targetY = resource.y + resource.radius + 20;
    state.activeResourceId = resource.id;
    state.actionStartedAt = 0;
    ui.status.textContent = `Walking to ${resource.type}...`;
    ui.actionName.textContent = resourceName(resource);
  }

  function handlePointer(event) {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * canvas.width / rect.width;
    const y = (event.clientY - rect.top) * canvas.height / rect.height;
    const hit = [...resources].reverse().find(r => Math.hypot(x - r.x, y - r.y) <= r.radius + 16);
    if (hit) return beginInteraction(hit);
    stopAction();
    state.player.targetX = Math.max(20, Math.min(canvas.width - 20, x));
    state.player.targetY = Math.max(40, Math.min(canvas.height - 24, y));
    ui.status.textContent = 'Walking...';
  }

  function update(dt) {
    const p = state.player;
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const distance = Math.hypot(dx, dy);
    const speed = 92;
    if (distance > 2) {
      const move = Math.min(distance, speed * dt);
      p.x += dx / distance * move;
      p.y += dy / distance * move;
    } else {
      p.x = p.targetX;
      p.y = p.targetY;
      const resource = resources.find(r => r.id === state.activeResourceId);
      if (resource) {
        if (!state.actionStartedAt) state.actionStartedAt = Date.now();
        ui.status.textContent = resourceName(resource);
        const elapsed = Date.now() - state.actionStartedAt;
        const progress = Math.min(1, elapsed / resource.duration);
        ui.actionProgress.style.width = `${progress * 100}%`;
        if (elapsed >= resource.duration) {
          state.inventory[resource.item] += 1;
          state.skills[resource.skill].xp += resource.xp;
          state.actionStartedAt = Date.now();
          showToast(`+1 ${resource.item} · +${resource.xp} XP`);
          renderPanels();
          saveGame(false);
        }
      } else {
        ui.status.textContent = 'Tap a resource to gather.';
      }
    }
  }

  function drawTileGround() {
    const size = 32;
    for (let y = 0; y < canvas.height; y += size) {
      for (let x = 0; x < canvas.width; x += size) {
        const odd = ((x / size) + (y / size)) % 2;
        ctx.fillStyle = odd ? '#6fa75d' : '#75ad62';
        ctx.fillRect(x, y, size, size);
      }
    }
    ctx.fillStyle = '#c7a66a';
    ctx.fillRect(150, 0, 82, canvas.height);
    ctx.fillStyle = '#4e8fb3';
    ctx.fillRect(254, 0, 130, 166);
    ctx.fillStyle = '#7bbbd4';
    for (let y = 14; y < 160; y += 24) ctx.fillRect(265 + (y % 35), y, 36, 3);
  }

  function drawTree(r) {
    ctx.fillStyle = '#5b3a25';
    ctx.fillRect(r.x - 6, r.y + 8, 12, 28);
    ctx.fillStyle = '#2f6f3b';
    ctx.fillRect(r.x - 20, r.y - 18, 40, 34);
    ctx.fillStyle = '#3e8a48';
    ctx.fillRect(r.x - 13, r.y - 27, 27, 27);
    ctx.fillStyle = '#76b95b';
    ctx.fillRect(r.x - 9, r.y - 20, 9, 7);
  }

  function drawRock(r) {
    ctx.fillStyle = '#515966';
    ctx.fillRect(r.x - 20, r.y - 8, 40, 24);
    ctx.fillStyle = '#717b89';
    ctx.fillRect(r.x - 13, r.y - 18, 24, 24);
    ctx.fillStyle = '#929ba6';
    ctx.fillRect(r.x - 8, r.y - 14, 8, 5);
  }

  function drawFishSpot(r) {
    ctx.strokeStyle = '#d6f2ff';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(r.x, r.y, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(r.x, r.y, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f4d35e';
    ctx.fillRect(r.x - 3, r.y - 3, 6, 6);
  }

  function drawPlayer() {
    const p = state.player;
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.fillRect(Math.round(p.x - 10), Math.round(p.y + 13), 20, 7);
    ctx.fillStyle = '#e1b07b';
    ctx.fillRect(Math.round(p.x - 7), Math.round(p.y - 17), 14, 13);
    ctx.fillStyle = '#4f74b7';
    ctx.fillRect(Math.round(p.x - 9), Math.round(p.y - 4), 18, 18);
    ctx.fillStyle = '#242a34';
    ctx.fillRect(Math.round(p.x - 8), Math.round(p.y + 14), 6, 9);
    ctx.fillRect(Math.round(p.x + 2), Math.round(p.y + 14), 6, 9);
    ctx.fillStyle = '#2b1a13';
    ctx.fillRect(Math.round(p.x - 7), Math.round(p.y - 18), 14, 5);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTileGround();
    for (const r of resources) {
      if (r.type === 'tree') drawTree(r);
      else if (r.type === 'rock') drawRock(r);
      else drawFishSpot(r);
    }
    drawPlayer();
  }

  function renderPanels() {
    const names = { logs: 'Logs', ore: 'Copper Ore', fish: 'Raw Fish' };
    ui.inventory.innerHTML = `<h2>Inventory</h2><div class="item-grid">${Object.entries(state.inventory).map(([key, value]) => `<div class="item"><strong>${names[key]}</strong><span>${value}</span></div>`).join('')}</div>`;
    const labels = { woodcutting: 'Woodcutting', mining: 'Mining', fishing: 'Fishing' };
    ui.skills.innerHTML = `<h2>Skills</h2>${Object.entries(state.skills).map(([key, value]) => {
      const level = levelFromXp(value.xp);
      const previous = level === 1 ? 0 : xpForLevel(level - 1);
      const next = xpForLevel(level);
      const percent = ((value.xp - previous) / (next - previous)) * 100;
      return `<div class="skill"><div class="skill-head"><strong>${labels[key]}</strong><span>Level ${level} · ${value.xp} XP</span></div><div class="progress-track"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, percent))}%"></div></div></div>`;
    }).join('')}`;
  }

  function frame(now) {
    const dt = Math.min(.05, (now - lastFrame) / 1000);
    lastFrame = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  canvas.addEventListener('pointerdown', handlePointer, { passive: false });
  document.getElementById('stopButton').addEventListener('click', stopAction);
  document.getElementById('saveButton').addEventListener('click', () => saveGame(true));

  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === tab.dataset.panel));
  }));

  document.getElementById('exportButton').addEventListener('click', () => {
    saveGame(false);
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `idle-wanderer-save-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  document.getElementById('importInput').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
      location.reload();
    } catch {
      showToast('Invalid save file');
    }
  });

  document.getElementById('resetButton').addEventListener('click', () => {
    if (!confirm('Reset all progress on this device?')) return;
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  });

  window.addEventListener('pagehide', () => saveGame(false));
  setInterval(() => saveGame(false), 15000);

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(console.error);

  renderPanels();
  const active = resources.find(r => r.id === state.activeResourceId);
  if (active) {
    ui.actionName.textContent = resourceName(active);
    state.player.targetX = active.x;
    state.player.targetY = active.y + active.radius + 20;
  }
  requestAnimationFrame(frame);
})();
