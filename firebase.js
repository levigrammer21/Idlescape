import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail,
  signOut, updateProfile
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {
  getFirestore, doc, collection, getDocs, getDoc, setDoc, writeBatch, serverTimestamp, query, orderBy, limit
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {
  getDatabase, ref as databaseRef, set as databaseSet, update as databaseUpdate, onValue, onDisconnect, serverTimestamp as realtimeTimestamp
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js';

const VERSION = '0.19.0';
const SAVE_KEY_PREFIX = 'idle-wanderer-save-v6:';
const firebaseConfig = {
  apiKey: 'AIzaSyDPS8qby2nMPc0beclK7igZcD-PvVOjviw',
  authDomain: 'idle-wonders.firebaseapp.com',
  projectId: 'idle-wonders',
  storageBucket: 'idle-wonders.firebasestorage.app',
  messagingSenderId: '537194194344',
  appId: '1:537194194344:web:d71107c9a027215e18299d',
  databaseURL: 'https://idle-wonders-default-rtdb.firebaseio.com'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);
const FAMILY_WORLD_ID = 'family-world';
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const loginScreen = document.getElementById('loginScreen');
const appShell = document.getElementById('app');
const authMessage = document.getElementById('authMessage');
const authForm = document.getElementById('authForm');
const emailInput = document.getElementById('authEmail');
const passwordInput = document.getElementById('authPassword');
const nameInput = document.getElementById('authName');
const nameRow = document.getElementById('nameRow');
const submitButton = document.getElementById('emailSubmitButton');
const createToggle = document.getElementById('createAccountButton');
const googleButton = document.getElementById('googleSignInButton');
const resetButton = document.getElementById('forgotPasswordButton');
let createMode = false;
let gameLoaded = false;
let activeUser = null;
let saveTimer = null;
let pendingState = null;
let saving = false;
let savedSectionFingerprints = new Map();

function setMessage(message, kind = '') {
  authMessage.textContent = message;
  authMessage.dataset.kind = kind;
}

function friendlyError(error) {
  const code = error?.code || '';
  const map = {
    'auth/invalid-credential': 'That email or password is not correct.',
    'auth/email-already-in-use': 'An account already uses that email.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/popup-closed-by-user': 'Google sign-in was closed before finishing.',
    'auth/popup-blocked': 'The browser blocked the sign-in window. Trying a redirect instead.',
    'auth/network-request-failed': 'Could not reach Firebase. Check your connection.'
  };
  return map[code] || error?.message || 'Something went wrong. Please try again.';
}

function setBusy(busy) {
  for (const element of loginScreen.querySelectorAll('button,input')) element.disabled = busy;
  loginScreen.classList.toggle('busy', busy);
}

function setCreateMode(enabled) {
  createMode = enabled;
  nameRow.hidden = !enabled;
  submitButton.textContent = enabled ? 'Create Account' : 'Sign In';
  createToggle.textContent = enabled ? 'Already have an account? Sign in' : 'Create Account';
  setMessage('');
}

function sectionFingerprint(value) {
  return JSON.stringify(value);
}

async function loadCloudState(user) {
  const snapshot = await getDocs(collection(db, 'users', user.uid, 'save'));
  if (snapshot.empty) {
    savedSectionFingerprints = new Map();
    return null;
  }
  const restored = {};
  const fingerprints = new Map();
  snapshot.forEach(saveDoc => {
    if (saveDoc.id === '_metadata') return;
    const value = saveDoc.data().value;
    restored[saveDoc.id] = value;
    fingerprints.set(saveDoc.id, sectionFingerprint(value));
  });
  savedSectionFingerprints = fingerprints;
  return Object.keys(restored).length ? restored : null;
}

function saveKeyFor(user) {
  return `${SAVE_KEY_PREFIX}${user.uid}`;
}

function localState(user) {
  try {
    const raw = localStorage.getItem(saveKeyFor(user));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function updateCloudIndicator(status, detail = '') {
  const indicator = document.getElementById('cloudStatus');
  if (!indicator) return;
  indicator.dataset.status = status;
  indicator.textContent = status === 'saving' ? '☁ Saving…' : status === 'error' ? '☁ Save failed' : '☁ Saved';
  indicator.title = detail || indicator.textContent;
}

async function writeCloudState(state) {
  if (!activeUser || !state) return;
  if (saving) {
    pendingState = state;
    return;
  }
  saving = true;
  try {
    const changedSections = [];
    for (const [key, value] of Object.entries(state)) {
      const fingerprint = sectionFingerprint(value);
      if (savedSectionFingerprints.get(key) !== fingerprint) changedSections.push([key, value, fingerprint]);
    }
    if (!changedSections.length) {
      updateCloudIndicator('saved');
      return;
    }
    updateCloudIndicator('saving');
    const batch = writeBatch(db);
    const saveCollection = collection(db, 'users', activeUser.uid, 'save');
    for (const [key, value] of changedSections) batch.set(doc(saveCollection, key), { value });
    batch.set(doc(saveCollection, '_metadata'), {
      gameVersion: VERSION,
      saveVersion: 1,
      updatedAt: serverTimestamp()
    });
    await batch.commit();
    for (const [key, , fingerprint] of changedSections) savedSectionFingerprints.set(key, fingerprint);
    updateCloudIndicator('saved');
  } catch (error) {
    console.error('Cloud save failed', error);
    updateCloudIndicator('error', friendlyError(error));
  } finally {
    saving = false;
    if (pendingState) {
      const next = pendingState;
      pendingState = null;
      await writeCloudState(next);
    }
  }
}

function queueCloudSave(state, immediate = false) {
  pendingState = structuredClone(state);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const next = pendingState;
    pendingState = null;
    writeCloudState(next);
  }, immediate ? 0 : 900);
}

async function clearCloudSave(user) {
  const snapshot = await getDocs(collection(db, 'users', user.uid, 'save'));
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.forEach(saveDoc => batch.delete(saveDoc.ref));
  await batch.commit();
  savedSectionFingerprints = new Map();
}

async function enterGame(user) {
  activeUser = user;
  setBusy(true);
  setMessage('Loading your cloud save…');
  try {
    const resetRequested = sessionStorage.getItem('idle-wanderer-reset') === '1';
    if (resetRequested) {
      sessionStorage.removeItem('idle-wanderer-reset');
      await clearCloudSave(user);
    }
    const cloud = resetRequested ? null : await loadCloudState(user);
    if (resetRequested) savedSectionFingerprints = new Map();
    await setDoc(doc(db, 'users', user.uid), {
      displayName: user.displayName || '',
      email: user.email || '',
      gameVersion: VERSION,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    const accountSaveKey = saveKeyFor(user);
    const local = localState(user);
    if (cloud) {
      localStorage.setItem(accountSaveKey, JSON.stringify(cloud));
    } else if (local) {
      // Only recover a cache that belongs to this exact Firebase UID.
      queueCloudSave(local, true);
    } else {
      // A new account must start clean. Never adopt the old shared browser save.
      localStorage.removeItem(accountSaveKey);
    }
    loginScreen.hidden = true;
    appShell.hidden = false;
    document.body.classList.add('game-ready');
    document.getElementById('accountName').textContent = user.displayName || user.email || 'Player';
    if (!gameLoaded) {
      gameLoaded = true;
      const script = document.createElement('script');
      script.src = `game.js?v=${VERSION}`;
      script.defer = true;
      document.body.appendChild(script);
    }
  } catch (error) {
    console.error(error);
    setBusy(false);
    setMessage(`Could not load the cloud save. ${friendlyError(error)}`, 'error');
  }
}




let multiplayerUnsubscribe = null;
let multiplayerPlayerRef = null;
let multiplayerConnected = false;
let lastPresenceData = null;
let lastPresenceWriteAt = 0;
const PRESENCE_HEARTBEAT_MS = 25000;

function safePresenceData(payload = {}) {
  const fallback = activeUser?.displayName || activeUser?.email?.split('@')[0] || 'Wanderer';
  return {
    uid: activeUser?.uid || '',
    name: String(payload.name || fallback).replace(/[<>]/g, '').trim().slice(0, 24) || 'Wanderer',
    x: Math.max(0, Math.min(3800, Number(payload.x) || 1780)),
    y: Math.max(0, Math.min(4300, Number(payload.y) || 2340)),
    targetX: Math.max(0, Math.min(3800, Number(payload.targetX ?? payload.x) || 1780)),
    targetY: Math.max(0, Math.min(4300, Number(payload.targetY ?? payload.y) || 2340)),
    facing: ['left','right','up','down'].includes(payload.facing) ? payload.facing : 'down',
    moving: Boolean(payload.moving),
    activity: String(payload.activity || 'Exploring').slice(0, 40),
    area: String(payload.area || 'Central Grass').slice(0, 40),
    combatLevel: Math.max(1, Number(payload.combatLevel) || 1),
    equipment: payload.equipment && typeof payload.equipment === 'object' ? payload.equipment : {},
    online: true
  };
}

function changedPresenceFields(next, previous) {
  if (!previous) return { ...next };
  const changed = {};
  for (const [key, value] of Object.entries(next)) {
    const same = key === 'equipment'
      ? JSON.stringify(value) === JSON.stringify(previous[key])
      : value === previous[key];
    if (!same) changed[key] = value;
  }
  return changed;
}

async function connectMultiplayer(initialPayload, onPlayers) {
  if (!activeUser) throw new Error('Sign in before joining the family world.');
  if (multiplayerUnsubscribe) multiplayerUnsubscribe();
  multiplayerPlayerRef = databaseRef(realtimeDb, `worlds/${FAMILY_WORLD_ID}/players/${activeUser.uid}`);
  const initialPresence = safePresenceData(initialPayload);
  await databaseSet(multiplayerPlayerRef, { ...initialPresence, updatedAt: realtimeTimestamp() });
  lastPresenceData = initialPresence;
  lastPresenceWriteAt = Date.now();
  await onDisconnect(multiplayerPlayerRef).remove();
  const playersRef = databaseRef(realtimeDb, `worlds/${FAMILY_WORLD_ID}/players`);
  multiplayerUnsubscribe = onValue(playersRef, snapshot => {
    const all = snapshot.val() || {};
    const others = Object.fromEntries(Object.entries(all).filter(([uid, player]) => uid !== activeUser.uid && player?.online !== false));
    onPlayers?.(others);
  }, error => console.warn('Family world listener failed', error));
  multiplayerConnected = true;
  return { worldId: FAMILY_WORLD_ID, uid: activeUser.uid };
}

async function updateMultiplayer(payload) {
  if (!activeUser || !multiplayerPlayerRef || !multiplayerConnected) return;
  const next = safePresenceData(payload);
  const changed = changedPresenceFields(next, lastPresenceData);
  const now = Date.now();
  if (!Object.keys(changed).length && now - lastPresenceWriteAt < PRESENCE_HEARTBEAT_MS) return;
  await databaseUpdate(multiplayerPlayerRef, { ...changed, updatedAt: realtimeTimestamp() });
  lastPresenceData = next;
  lastPresenceWriteAt = now;
}

async function leaveMultiplayer() {
  multiplayerConnected = false;
  if (multiplayerUnsubscribe) multiplayerUnsubscribe();
  multiplayerUnsubscribe = null;
  if (multiplayerPlayerRef) await databaseSet(multiplayerPlayerRef, null).catch(() => {});
  multiplayerPlayerRef = null;
  lastPresenceData = null;
  lastPresenceWriteAt = 0;
}

function cleanLeaderboardName(value) {
  const fallback = activeUser?.displayName || activeUser?.email?.split('@')[0] || 'Wanderer';
  return String(value || fallback).replace(/[<>]/g, '').trim().slice(0, 24) || 'Wanderer';
}

const LEADERBOARD_CACHE_MS = 60000;
const leaderboardQueryCache = new Map();
const leaderboardProfileCache = new Map();

async function publishLeaderboard(profile) {
  if (!activeUser || !profile) return;
  const payload = {
    uid: activeUser.uid,
    displayName: cleanLeaderboardName(profile.displayName),
    totalLevel: Number(profile.totalLevel) || 0,
    combatLevel: Number(profile.combatLevel) || 0,
    coins: Number(profile.coins) || 0,
    lifetimeGold: Number(profile.lifetimeGold) || 0,
    totalKills: Number(profile.totalKills) || 0,
    uniqueDrops: Number(profile.uniqueDrops) || 0,
    summonsUnlocked: Number(profile.summonsUnlocked) || 0,
    deaths: Number(profile.deaths) || 0,
    skillLevels: profile.skillLevels || {},
    highestSkill: profile.highestSkill || { name: 'None', level: 1 },
    updatedAt: serverTimestamp()
  };
  await setDoc(doc(db, 'leaderboards', activeUser.uid), payload, { merge: true });
  leaderboardQueryCache.clear();
  leaderboardProfileCache.set(activeUser.uid, { at: Date.now(), profile: { id: activeUser.uid, ...payload } });
}

async function readLeaderboard(sortKey = 'totalLevel', count = 100) {
  const allowed = new Set(['totalLevel','combatLevel','coins','lifetimeGold','totalKills','uniqueDrops','summonsUnlocked',
    'skillLevels.woodcutting','skillLevels.fishing','skillLevels.mining','skillLevels.cooking','skillLevels.crafting',
    'skillLevels.melee','skillLevels.range','skillLevels.fortitude','skillLevels.summoning','skillLevels.merching']);
  const field = allowed.has(sortKey) ? sortKey : 'totalLevel';
  const safeCount = Math.max(1, Math.min(100, count));
  const cacheKey = `${field}:${safeCount}`;
  const cached = leaderboardQueryCache.get(cacheKey);
  if (cached && Date.now() - cached.at < LEADERBOARD_CACHE_MS) return cached.rows;
  const snapshot = await getDocs(query(collection(db, 'leaderboards'), orderBy(field, 'desc'), limit(safeCount)));
  const rows = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  leaderboardQueryCache.set(cacheKey, { at: Date.now(), rows });
  for (const row of rows) leaderboardProfileCache.set(row.id, { at: Date.now(), profile: row });
  return rows;
}

async function readLeaderboardProfile(uid) {
  const cached = leaderboardProfileCache.get(uid);
  if (cached && Date.now() - cached.at < LEADERBOARD_CACHE_MS) return cached.profile;
  const snapshot = await getDoc(doc(db, 'leaderboards', uid));
  const profile = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  if (profile) leaderboardProfileCache.set(uid, { at: Date.now(), profile });
  return profile;
}

async function changeDisplayName(name) {
  if (!activeUser) throw new Error('No signed-in player.');
  const cleaned = cleanLeaderboardName(name);
  await updateProfile(activeUser, { displayName: cleaned });
  await setDoc(doc(db, 'users', activeUser.uid), { displayName: cleaned, updatedAt: serverTimestamp() }, { merge: true });
  document.getElementById('accountName').textContent = cleaned;
  return cleaned;
}

window.IdleCloud = {
  version: VERSION,
  publishLeaderboard,
  getLeaderboard: readLeaderboard,
  getLeaderboardProfile: readLeaderboardProfile,
  updateDisplayName: changeDisplayName,
  save(state, immediate = false) {
    queueCloudSave(state, immediate);
  },
  async flush(state) {
    clearTimeout(saveTimer);
    pendingState = null;
    await writeCloudState(structuredClone(state));
  },
  async signOut() {
    await leaveMultiplayer();
    await signOut(auth);
    location.reload();
  },
  get user() { return activeUser; },
  get localSaveKey() { return activeUser ? saveKeyFor(activeUser) : null; }
};

window.IdleMultiplayer = {
  worldId: FAMILY_WORLD_ID,
  connect: connectMultiplayer,
  update: updateMultiplayer,
  leave: leaveMultiplayer,
  get connected() { return multiplayerConnected; }
};

setCreateMode(false);
createToggle.addEventListener('click', () => setCreateMode(!createMode));

googleButton.addEventListener('click', async () => {
  setBusy(true);
  setMessage('Opening Google sign-in…');
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (error?.code === 'auth/popup-blocked') {
      setMessage(friendlyError(error));
      await signInWithRedirect(auth, provider);
      return;
    }
    setBusy(false);
    setMessage(friendlyError(error), 'error');
  }
});

authForm.addEventListener('submit', async event => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  setBusy(true);
  setMessage(createMode ? 'Creating your account…' : 'Signing in…');
  try {
    if (createMode) {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const displayName = nameInput.value.trim();
      if (displayName) await updateProfile(credential.user, { displayName });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    setBusy(false);
    setMessage(friendlyError(error), 'error');
  }
});

resetButton.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  if (!email) {
    setMessage('Enter your email first, then tap Forgot password.', 'error');
    emailInput.focus();
    return;
  }
  setBusy(true);
  try {
    await sendPasswordResetEmail(auth, email);
    setMessage('Password reset email sent.', 'success');
  } catch (error) {
    setMessage(friendlyError(error), 'error');
  } finally {
    setBusy(false);
  }
});

onAuthStateChanged(auth, user => {
  if (user) enterGame(user);
  else {
    activeUser = null;
    setBusy(false);
    loginScreen.hidden = false;
    appShell.hidden = true;
    setMessage('Sign in to load your wanderer.');
  }
});
