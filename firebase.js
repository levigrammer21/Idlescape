import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail,
  signOut, updateProfile
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {
  getFirestore, doc, collection, getDocs, getDoc, setDoc, writeBatch, serverTimestamp, query, orderBy, limit
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const VERSION = '0.14.1';
const SAVE_KEY_PREFIX = 'idle-wanderer-save-v6:';
const firebaseConfig = {
  apiKey: 'AIzaSyDPS8qby2nMPc0beclK7igZcD-PvVOjviw',
  authDomain: 'idle-wonders.firebaseapp.com',
  projectId: 'idle-wonders',
  storageBucket: 'idle-wonders.firebasestorage.app',
  messagingSenderId: '537194194344',
  appId: '1:537194194344:web:d71107c9a027215e18299d'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
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

async function loadCloudState(user) {
  const snapshot = await getDocs(collection(db, 'users', user.uid, 'save'));
  if (snapshot.empty) return null;
  const restored = {};
  snapshot.forEach(saveDoc => {
    if (saveDoc.id === '_metadata') return;
    restored[saveDoc.id] = saveDoc.data().value;
  });
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
  updateCloudIndicator('saving');
  try {
    const batch = writeBatch(db);
    const saveCollection = collection(db, 'users', activeUser.uid, 'save');
    for (const [key, value] of Object.entries(state)) {
      batch.set(doc(saveCollection, key), { value });
    }
    batch.set(doc(saveCollection, '_metadata'), {
      gameVersion: VERSION,
      saveVersion: 1,
      updatedAt: serverTimestamp()
    });
    batch.set(doc(db, 'users', activeUser.uid), {
      displayName: activeUser.displayName || '',
      email: activeUser.email || '',
      gameVersion: VERSION,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    await batch.commit();
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


function cleanLeaderboardName(value) {
  const fallback = activeUser?.displayName || activeUser?.email?.split('@')[0] || 'Wanderer';
  return String(value || fallback).replace(/[<>]/g, '').trim().slice(0, 24) || 'Wanderer';
}

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
    skillLevels: profile.skillLevels || {},
    highestSkill: profile.highestSkill || { name: 'None', level: 1 },
    updatedAt: serverTimestamp()
  };
  await setDoc(doc(db, 'leaderboards', activeUser.uid), payload, { merge: true });
}

async function readLeaderboard(sortKey = 'totalLevel', count = 100) {
  const allowed = new Set(['totalLevel','combatLevel','coins','lifetimeGold','totalKills','uniqueDrops','summonsUnlocked',
    'skillLevels.woodcutting','skillLevels.fishing','skillLevels.mining','skillLevels.cooking','skillLevels.crafting',
    'skillLevels.melee','skillLevels.range','skillLevels.fortitude','skillLevels.summoning','skillLevels.merching']);
  const field = allowed.has(sortKey) ? sortKey : 'totalLevel';
  const snapshot = await getDocs(query(collection(db, 'leaderboards'), orderBy(field, 'desc'), limit(Math.max(1, Math.min(100, count)))));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function readLeaderboardProfile(uid) {
  const snapshot = await getDoc(doc(db, 'leaderboards', uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
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
    await signOut(auth);
    location.reload();
  },
  get user() { return activeUser; },
  get localSaveKey() { return activeUser ? saveKeyFor(activeUser) : null; }
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
