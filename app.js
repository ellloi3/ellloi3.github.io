// app.js — updated to add Achievements (client-side, localStorage-based)
// This file keeps authentication, shop, leaderboard, battle, damage popups, etc.
// New: achievements tracked per user under users[username].stats and users[username].achievements

// Storage keys
const STORAGE_KEY_USERS = 'ninjago_users_v1';
const STORAGE_KEY_CURRENT = 'ninjago_current_user_v1';

// Weapon definitions and limits
const WEAPONS = [
  { id: 'sword', name: 'Katana', baseCost: 120, dmgMinPerLevel: 6, dmgMaxPerLevel: 10, desc: 'Balanced attack sword' },
  { id: 'nunchucks', name: 'Nunchucks', baseCost: 140, dmgMinPerLevel: 8, dmgMaxPerLevel: 12, desc: 'Faster strikes' },
  { id: 'shuriken', name: 'Shuriken', baseCost: 100, dmgMinPerLevel: 5, dmgMaxPerLevel: 9, desc: 'Ranged burst' },
  { id: 'staff', name: 'Staff', baseCost: 160, dmgMinPerLevel: 10, dmgMaxPerLevel: 14, desc: 'Heavy, powerful' },
  { id: 'dagger', name: 'Dagger', baseCost: 90, dmgMinPerLevel: 4, dmgMaxPerLevel: 8, desc: 'Quick but light' }
];
const MAX_WEAPON_LEVEL = 10;

// storage helpers
function loadUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('loadUsers error', e);
    return {};
  }
}
function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users || {}));
}
function saveCurrent(username) {
  localStorage.setItem(STORAGE_KEY_CURRENT, username || '');
}
function loadCurrent() {
  return localStorage.getItem(STORAGE_KEY_CURRENT) || '';
}

// password hashing (SHA-256)
async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const data = enc.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
function randomSalt() {
  return Math.random().toString(36).slice(2, 10);
}

// DOM references
const screens = {
  auth: document.getElementById('auth'),
  home: document.getElementById('home'),
  select: document.getElementById('select'),
  battle: document.getElementById('battle'),
  shop: document.getElementById('shop'),
  leaderboard: document.getElementById('leaderboard'),
  achievements: document.getElementById('achievements'),
  profile: document.getElementById('profile'),
  win: document.getElementById('win'),
  lose: document.getElementById('lose')
};

// Auth elements
const signinUser = document.getElementById('signinUser');
const signinPass = document.getElementById('signinPass');
const signupUser = document.getElementById('signupUser');
const signupPass = document.getElementById('signupPass');
const signinBtn = document.getElementById('signinBtn');
const signupBtn = document.getElementById('signupBtn');
const authMsg = document.getElementById('authMsg');

// Home
const currentUserName = document.getElementById('currentUserName');
const userCoinsEl = document.getElementById('userCoins');
const goSelect = document.getElementById('goSelect');
const goShop = document.getElementById('goShop');
const goProfile = document.getElementById('goProfile');
const goLeaderboard = document.getElementById('goLeaderboard');
const goAchievements = document.getElementById('goAchievements');
const signOutBtn = document.getElementById('signOutBtn');

// Select
const charactersGrid = document.getElementById('charactersGrid');
const backToHome = document.getElementById('backToHome');
const difficultySelect = document.getElementById('difficulty');
const selectUserName = document.getElementById('selectUserName');

// Battle elements
const playerAvatar = document.getElementById('playerAvatar');
const aiAvatar = document.getElementById('aiAvatar');
const playerNameEl = document.getElementById('playerName');
const aiNameEl = document.getElementById('aiName');
const playerHPBar = document.getElementById('playerHP');
const aiHPBar = document.getElementById('aiHP');
const playerHPText = document.getElementById('playerHPText');
const aiHPText = document.getElementById('aiHPText');
const battleLog = document.getElementById('battleLog');
const attackBtn = document.getElementById('attackBtn');
const specialBtn = document.getElementById('specialBtn');
const autoBtn = document.getElementById('autoBtn');
const playerArt = document.getElementById('playerArt');
const aiArt = document.getElementById('aiArt');
const impact = document.getElementById('impact');

// Shop
const shopSelectChar = document.getElementById('shopSelectChar');
const weaponsList = document.getElementById('weaponsList');
const shopBack = document.getElementById('shopBack');
const shopCoins = document.getElementById('shopCoins');

// Leaderboard
const leaderboardList = document.getElementById('leaderboardList');
const leaderboardBack = document.getElementById('leaderboardBack');

// Achievements
const achievementsList = document.getElementById('achievementsList');
const achievementsBack = document.getElementById('achievementsBack');

// Profile
const profileUser = document.getElementById('profileUser');
const profileCoins = document.getElementById('profileCoins');
const profileUpgrades = document.getElementById('profileUpgrades');
const deleteAccountBtn = document.getElementById('deleteAccount');
const profileBack = document.getElementById('profileBack');

// Win/Lose controls
const winToSelect = document.getElementById('winToSelect');
const loseToSelect = document.getElementById('loseToSelect');
const winText = document.getElementById('winText');
const loseText = document.getElementById('loseText');

// App state
let users = loadUsers(); // object keyed by username
let currentUser = loadCurrent() || ''; // username string
let session = null; // currently logged-in user object reference users[currentUser]
let playerChar = null;
let aiChar = null;
let state = null; // battle state
let selectedDifficulty = Number(difficultySelect.value) || 5;

// ACHIEVEMENTS metadata
const ACHIEVEMENTS = [
  { id: 'first_win', title: 'First Victory', desc: 'Win your first battle', check: (s) => (s.stats.wins || 0) >= 1, badge: 'bronze' },
  { id: 'five_wins', title: 'Five Wins', desc: 'Win 5 battles', check: (s) => (s.stats.wins || 0) >= 5, badge: 'bronze' },
  { id: 'ten_wins', title: 'Ten Wins', desc: 'Win 10 battles', check: (s) => (s.stats.wins || 0) >= 10, badge: 'silver' },
  { id: 'win_streak_5', title: 'Streak: 5', desc: 'Win 5 battles in a row', check: (s) => (s.stats.winStreak || 0) >= 5, badge: 'bronze' },
  { id: 'diff10_win', title: 'Conqueror (10)', desc: 'Win a battle at difficulty 10', check: (s) => (s.stats.winsByDifficulty && s.stats.winsByDifficulty[10] >= 1), badge: 'gold' },
  { id: 'master_collector', title: 'Master Collector', desc: 'Buy 50 weapon levels total', check: (s) => (s.stats.purchases || 0) >= 50, badge: 'silver' },
  { id: 'rich', title: 'Rich!', desc: 'Earn a total of 5000 coins (lifetime)', check: (s) => (s.totalEarned || 0) >= 5000, badge: 'gold' },
  { id: 'specialist', title: 'Specialist', desc: 'Use Special 50 times', check: (s) => (s.stats.specialUses || 0) >= 50, badge: 'bronze' },
  { id: 'heavy_hitter', title: 'Heavy Hitter', desc: 'Deal a single-hit of 400+ damage', check: (s) => (s.stats.highestDamage || 0) >= 400, badge: 'silver' },
  { id: 'defeat_all', title: 'Slayer', desc: 'Defeat every other character at least once', check: (s) => {
      const set = s.stats.defeated || {};
      return Object.keys(set).length >= (CHARACTERS.length - 1);
    }, badge: 'gold' },
  { id: 'play_100', title: 'Veteran', desc: 'Play 100 battles', check: (s) => (s.stats.totalBattles || 0) >= 100, badge: 'gold' }
];

// Helper: ensure user object has stats and achievements fields
function ensureUserFields(u) {
  u.stats = u.stats || {
    wins: 0,
    losses: 0,
    winStreak: 0,
    totalBattles: 0,
    specialUses: 0,
    purchases: 0,
    highestDamage: 0,
    defeated: {},
    winsByDifficulty: {}
  };
  u.achievements = u.achievements || {}; // id => timestamp
  u.totalEarned = u.totalEarned || (u.coins || 0); // if missing
  u.upgrades = u.upgrades || {};
  u.settings = u.settings || { difficulty: 5 };
}

// Persist user changes helper
function persistSession() {
  if (!currentUser) return;
  users[currentUser] = session;
  saveUsers(users);
  // update UI numbers
  userCoinsEl.textContent = session.coins || 0;
  shopCoins.textContent = session.coins || 0;
  profileCoins.textContent = session.coins || 0;
}

// Show small toast when achievement unlocked
function showAchievementToast(title, desc) {
  const existing = document.querySelector('.achievement-toast');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.className = 'achievement-toast';
  div.innerHTML = `<strong>${title}</strong><div style="font-size:13px;color:#cbd5e1;margin-top:6px">${desc}</div>`;
  document.body.appendChild(div);
  // animate
  setTimeout(() => div.classList.add('show'), 50);
  setTimeout(() => div.classList.remove('show'), 3500);
  setTimeout(() => div.remove(), 4000);
}

// Check and unlock achievements for a user (returns list of newly unlocked ids)
function checkAndUnlockAchievementsForUser(u) {
  ensureUserFields(u);
  const unlocked = [];
  ACHIEVEMENTS.forEach(a => {
    if (!u.achievements[a.id] && a.check(u)) {
      u.achievements[a.id] = Date.now();
      unlocked.push(a);
    }
  });
  if (unlocked.length) {
    saveUsers(users);
    unlocked.forEach(a => showAchievementToast(a.title, a.desc));
  }
  return unlocked.map(a => a.id);
}

// Helper: show achievements screen
function renderAchievementsScreen() {
  achievementsList.innerHTML = '';
  if (!session) {
    achievementsList.innerHTML = '<div class="muted">Sign in to see achievements.</div>';
    return;
  }
  ensureUserFields(session);
  ACHIEVEMENTS.forEach(a => {
    const unlocked = !!session.achievements[a.id];
    const card = document.createElement('div');
    card.className = 'achievement' + (unlocked ? '' : ' locked');
    const badgeClass = unlocked ? (a.badge === 'gold' ? 'gold' : (a.badge === 'silver' ? 'silver' : 'bronze')) : '';
    card.innerHTML = `
      <div class="badge ${badgeClass}">${unlocked ? '★' : '?'}</div>
      <div class="meta">
        <div class="title">${a.title}</div>
        <div class="desc">${a.desc}</div>
        ${unlocked ? `<div style="margin-top:8px;font-size:12px;color:var(--muted)">Unlocked: ${new Date(session.achievements[a.id]).toLocaleString()}</div>` : ''}
      </div>
    `;
    achievementsList.appendChild(card);
  });
}

// UI helpers
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('visible'));
  if (screens[name]) screens[name].classList.add('visible');
}

// Authentication flow
function refreshAuthUI() {
  if (currentUser && users[currentUser]) {
    session = users[currentUser];
    ensureUserFields(session);
    currentUserName.textContent = currentUser;
    userCoinsEl.textContent = session.coins || 0;
    selectUserName.textContent = currentUser;
    shopCoins.textContent = session.coins || 0;
    profileUser.textContent = currentUser;
    profileCoins.textContent = session.coins || 0;
    showScreen('home');
  } else {
    session = null;
    showScreen('auth');
  }
}

// signup
signupBtn.addEventListener('click', async () => {
  const username = (signupUser.value || '').trim();
  const password = (signupPass.value || '').trim();
  if (!username || !password) {
    authMsg.textContent = 'Choose a username and password.';
    return;
  }
  if (users[username]) {
    authMsg.textContent = 'Username already exists — pick another.';
    return;
  }
  const salt = randomSalt();
  const hash = await hashPassword(password, salt);
  const newUser = {
    passwordHash: hash,
    salt,
    coins: 500,
    totalEarned: 500,
    upgrades: {},
    settings: { difficulty: 5 }
  };
  ensureUserFields(newUser);
  users[username] = newUser;
  saveUsers(users);
  currentUser = username;
  saveCurrent(currentUser);
  refreshAuthUI();
});

// signin
signinBtn.addEventListener('click', async () => {
  const username = (signinUser.value || '').trim();
  const password = (signinPass.value || '').trim();
  if (!username || !password) { authMsg.textContent = 'Enter username and password.'; return; }
  const user = users[username];
  if (!user) { authMsg.textContent = 'No such user.'; return; }
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    authMsg.textContent = 'Incorrect password.';
    return;
  }
  currentUser = username;
  saveCurrent(currentUser);
  refreshAuthUI();
});

// sign out
signOutBtn.addEventListener('click', () => {
  saveCurrent('');
  currentUser = '';
  session = null;
  refreshAuthUI();
});

// delete account
deleteAccountBtn.addEventListener('click', () => {
  if (!currentUser) return;
  if (!confirm(`Delete account ${currentUser}? This cannot be undone (data only in your browser).`)) return;
  delete users[currentUser];
  saveUsers(users);
  saveCurrent('');
  currentUser = '';
  session = null;
  refreshAuthUI();
});

// Navigation handlers
goSelect.addEventListener('click', () => {
  if (session && session.settings && session.settings.difficulty) difficultySelect.value = session.settings.difficulty;
  renderCharacters();
  showScreen('select');
});
backToHome.addEventListener('click', () => refreshAuthUI());
goShop.addEventListener('click', () => {
  populateShopCharSelect();
  renderWeaponsForShop();
  showScreen('shop');
});
shopBack.addEventListener('click', () => showScreen('home'));
goProfile.addEventListener('click', () => { renderProfile(); showScreen('profile'); });
goLeaderboard.addEventListener('click', () => { renderLeaderboard(); showScreen('leaderboard'); });
goAchievements.addEventListener('click', () => { renderAchievementsScreen(); showScreen('achievements'); });
achievementsBack && achievementsBack.addEventListener('click', () => showScreen('home'));

difficultySelect.addEventListener('change', () => {
  selectedDifficulty = Number(difficultySelect.value);
  if (session) {
    session.settings = session.settings || {};
    session.settings.difficulty = selectedDifficulty;
    users[currentUser] = session;
    saveUsers(users);
  }
});

// Character rendering
function svgToDataUri(svgString) {
  if (!svgString) return '';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString.trim());
}

function renderCharacters() {
  charactersGrid.innerHTML = '';
  CHARACTERS.forEach(c => {
    const card = document.createElement('div');
    card.className = 'card';
    const imgSrc = c.imageSVG ? svgToDataUri(c.imageSVG) : '';
    const imgHtml = imgSrc ? `<img src="${imgSrc}" alt="${c.name}" style="width:56px;height:56px;object-fit:contain;border-radius:8px">` : `<div class="avatar ${c.colorClass}">${c.short}</div>`;
    card.innerHTML = `
      ${imgHtml}
      <div class="info">
        <div class="name">${c.name}</div>
        <div class="desc">HP ${c.maxHP} • ATK ${c.attackMin}-${c.attackMax} • Special after ${c.specialRequired} attacks</div>
      </div>
    `;
    card.addEventListener('click', () => {
      if (session) {
        session.settings = session.settings || {};
        session.settings.difficulty = Number(difficultySelect.value);
        users[currentUser] = session;
        saveUsers(users);
      }
      onSelectCharacter(c.id);
    });
    charactersGrid.appendChild(card);
  });
}

// Shop
function populateShopCharSelect() {
  shopSelectChar.innerHTML = '';
  CHARACTERS.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.name;
    shopSelectChar.appendChild(opt);
  });
  shopSelectChar.addEventListener('change', renderWeaponsForShop);
  shopSelectChar.value = CHARACTERS[0].id;
  shopCoins.textContent = session ? session.coins : 0;
}

function getUserUpgradeLevel(username, charId, weaponId) {
  const u = users[username];
  if (!u) return 0;
  u.upgrades = u.upgrades || {};
  u.upgrades[charId] = u.upgrades[charId] || {};
  return u.upgrades[charId][weaponId] || 0;
}
function setUserUpgradeLevel(username, charId, weaponId, level) {
  const u = users[username];
  if (!u) return;
  u.upgrades = u.upgrades || {};
  u.upgrades[charId] = u.upgrades[charId] || {};
  u.upgrades[charId][weaponId] = level;
  saveUsers(users);
}
function costToBuyNext(weapon, currentLevel) {
  const next = currentLevel + 1;
  return Math.round(weapon.baseCost * next * 1.0);
}

function renderWeaponsForShop() {
  if (!session) { weaponsList.innerHTML = '<div class="muted">Sign in to access shop.</div>'; return; }
  const charId = shopSelectChar.value;
  weaponsList.innerHTML = '';
  weaponsList.style.gridTemplateColumns = 'repeat(auto-fit,minmax(240px,1fr))';
  WEAPONS.forEach(w => {
    const currentLevel = getUserUpgradeLevel(currentUser, charId, w.id);
    const nextCost = (currentLevel < MAX_WEAPON_LEVEL) ? costToBuyNext(w, currentLevel) : null;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="flex:1">
        <div class="name">${w.name}</div>
        <div class="desc">${w.desc}</div>
        <div class="muted">Level: <strong>${currentLevel}</strong> / ${MAX_WEAPON_LEVEL}</div>
        <div class="muted">Per-level bonus: +${w.dmgMinPerLevel} / +${w.dmgMaxPerLevel} damage</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
        ${ nextCost ? `<div>Cost: <strong>${nextCost}</strong> coins</div>` : `<div class="muted">Maxed</div>` }
        <button class="primary buyBtn" data-weapon="${w.id}" ${nextCost && session.coins >= nextCost ? '' : (nextCost ? 'disabled' : 'disabled')}>${ nextCost ? 'Buy +1' : 'Full' }</button>
      </div>
    `;
    const btn = card.querySelector('.buyBtn');
    btn && btn.addEventListener('click', () => {
      const lvl = getUserUpgradeLevel(currentUser, charId, w.id);
      if (lvl >= MAX_WEAPON_LEVEL) return;
      const cost = costToBuyNext(w, lvl);
      if (session.coins < cost) { alert('Not enough coins'); return; }
      session.coins -= cost;
      // record purchase stat (for achievements)
      session.stats.purchases = (session.stats.purchases || 0) + 1;
      setUserUpgradeLevel(currentUser, charId, w.id, lvl + 1);
      users[currentUser] = session;
      saveUsers(users);
      shopCoins.textContent = session.coins;
      userCoinsEl.textContent = session.coins;
      profileCoins.textContent = session.coins;
      renderWeaponsForShop();
      checkAndUnlockAchievementsForUser(session);
    });
    weaponsList.appendChild(card);
  });
}

// profile rendering
function renderProfile() {
  if (!session) return;
  profileUser.textContent = currentUser;
  profileCoins.textContent = session.coins;
  profileUpgrades.innerHTML = '';
  CHARACTERS.forEach(c => {
    const card = document.createElement('div');
    card.className = 'card';
    const upgrades = (session.upgrades && session.upgrades[c.id]) || {};
    let upgradesHtml = '';
    WEAPONS.forEach(w => {
      const lvl = upgrades[w.id] || 0;
      upgradesHtml += `<div style="font-size:13px" class="muted">${w.name}: <strong>${lvl}</strong></div>`;
    });
    card.innerHTML = `
      <div>
        <div class="name">${c.name}</div>
        <div class="desc">${upgradesHtml}</div>
      </div>
    `;
    profileUpgrades.appendChild(card);
  });
}

// leaderboard
function renderLeaderboard() {
  leaderboardList.innerHTML = '';
  const arr = Object.keys(users).map(username => {
    const u = users[username];
    return {
      username,
      coins: u.coins || 0,
      totalEarned: u.totalEarned || 0
    };
  });
  arr.sort((a, b) => b.totalEarned - a.totalEarned);
  if (arr.length === 0) {
    leaderboardList.innerHTML = '<div class="muted">No players yet.</div>';
    return;
  }
  arr.forEach((u, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="flex:1">
        <div class="name">${idx + 1}. ${u.username}</div>
        <div class="muted">Total earned: <strong>${u.totalEarned}</strong> coins</div>
        <div class="muted">Current balance: <strong>${u.coins}</strong></div>
      </div>
    `;
    leaderboardList.appendChild(card);
  });
}

/* ----------------
   Battle functions
   ---------------- */
function computeEffectiveCharStats(char, username) {
  const base = Object.assign({}, char);
  let up = (users[username] && users[username].upgrades && users[username].upgrades[char.id]) || {};
  let addMin = 0, addMax = 0;
  WEAPONS.forEach(w => {
    const lvl = up[w.id] || 0;
    addMin += w.dmgMinPerLevel * lvl;
    addMax += w.dmgMaxPerLevel * lvl;
  });
  base.attackMin = (base.attackMin || 0) + addMin;
  base.attackMax = (base.attackMax || 0) + addMax;
  return base;
}

function coinsRewardForWin(baseReward = 100, difficulty = 5) {
  const mult = difficulty;
  const bonus = Math.floor(Math.random() * (difficulty * 5));
  return Math.max(10, Math.round(baseReward * mult + bonus));
}

// select character & start battle
function onSelectCharacter(id) {
  playerChar = CHARACTERS.find(ch => ch.id === id);
  startBattle();
}

function startBattle() {
  const possible = CHARACTERS.filter(c => c.id !== playerChar.id);
  aiChar = possible[Math.floor(Math.random() * possible.length)];

  const effectivePlayerChar = session ? computeEffectiveCharStats(playerChar, currentUser) : playerChar;
  const effectiveAIChar = aiChar;

  const difficulty = session && session.settings && session.settings.difficulty ? session.settings.difficulty : Number(difficultySelect.value);
  selectedDifficulty = Number(difficulty);

  const aiAttackScale = 1 + (selectedDifficulty - 1) * 0.07;
  const aiHPScale = 1 + (selectedDifficulty - 1) * 0.02;

  state = {
    playerHP: effectivePlayerChar.maxHP,
    aiHP: Math.round(effectiveAIChar.maxHP * aiHPScale),
    autoMode: false,
    turn: 'player',
    playerAttacks: 0,
    aiAttacks: 0,
    aiDefend: false,
    difficulty: selectedDifficulty,
    playerEffectiveChar: effectivePlayerChar,
    aiEffectiveChar: {
      ...effectiveAIChar,
      attackMin: Math.max(1, Math.round(effectiveAIChar.attackMin * aiAttackScale)),
      attackMax: Math.max(1, Math.round(effectiveAIChar.attackMax * aiAttackScale)),
      maxHP: Math.round(effectiveAIChar.maxHP * aiHPScale)
    }
  };

  playerAvatar.className = `avatar ${playerChar.colorClass}`;
  playerAvatar.textContent = playerChar.short;
  aiAvatar.className = `avatar ${aiChar.colorClass}`;
  aiAvatar.textContent = aiChar.short;
  playerNameEl.textContent = playerChar.name;
  aiNameEl.textContent = aiChar.name;

  if (playerChar.imageSVG) playerArt.src = svgToDataUri(playerChar.imageSVG); else playerArt.src = '';
  if (aiChar.imageSVG) aiArt.src = svgToDataUri(aiChar.imageSVG); else aiArt.src = '';

  updateHPUI();
  appendLog(`<div>Opponent: <strong>${aiChar.name}</strong> has been chosen by the AI. Difficulty: ${selectedDifficulty}</div>`);
  showScreen('battle');
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function randInt(min, max){ return Math.floor(Math.random()*(max-min+1)) + min; }

function updateHPUI() {
  if (!state) return;
  const pPerc = Math.round((state.playerHP / state.playerEffectiveChar.maxHP) * 100);
  const aPerc = Math.round((state.aiHP / state.aiEffectiveChar.maxHP) * 100);
  playerHPBar.style.width = `${clamp(pPerc,0,100)}%`;
  aiHPBar.style.width = `${clamp(aPerc,0,100)}%`;
  playerHPText.textContent = `HP: ${Math.max(0, state.playerHP)} / ${state.playerEffectiveChar.maxHP}`;
  aiHPText.textContent = `HP: ${Math.max(0, state.aiHP)} / ${state.aiEffectiveChar.maxHP}`;

  if (pPerc < 30) playerHPBar.style.background = 'linear-gradient(90deg,#f97316,#ef4444)';
  else playerHPBar.style.background = 'linear-gradient(90deg,#34d399,#10b981)';
  if (aPerc < 30) aiHPBar.style.background = 'linear-gradient(90deg,#f97316,#ef4444)';
  else aiHPBar.style.background = 'linear-gradient(90deg,#34d399,#10b981)';

  updateSpecialUI();
}

function updateSpecialUI() {
  const pReq = state.playerEffectiveChar.specialRequired;
  const pHave = state.playerAttacks;
  const pReady = pHave >= pReq;
  specialBtn.disabled = !pReady;
  specialBtn.textContent = pReady ? `Special (Ready)` : `Special (${pHave}/${pReq})`;
  autoBtn.textContent = state.autoMode ? 'Auto: ON' : 'Auto';
}

function calcDamage(attacker, isSpecial=false) {
  const baseMin = attacker.attackMin;
  const baseMax = attacker.attackMax;
  const base = randInt(baseMin, baseMax);
  return Math.round(base * (isSpecial ? attacker.specialMultiplier : 1));
}

// logging helper
function appendLog(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  battleLog.prepend(el);
}

/* Damage popup implementation (same as before) */
function showDamagePopup(side, amount, isSpecial=false) {
  try {
    const arena = document.querySelector('.visual-arena');
    if (!arena) return;
    const popup = document.createElement('div');
    popup.className = 'damage-popup';
    if (isSpecial) popup.classList.add('special');
    const defender = (side === 'ai') ? aiArt : playerArt;
    popup.textContent = `-${amount}`;
    const arenaRect = arena.getBoundingClientRect();
    const defRect = defender.getBoundingClientRect();
    const x = (defRect.left + defRect.right) / 2 - arenaRect.left;
    const y = defRect.top - arenaRect.top + 10;
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.transform = 'translate(-50%, 0)';
    arena.appendChild(popup);
    setTimeout(() => { try { popup.remove(); } catch(e){} }, 1000);
  } catch (e) {
    console.error('showDamagePopup error', e);
  }
}

/* Visual attack animator (same as before) */
function animateAttack(side, isSpecial=false) {
  const attackerImg = side === 'player' ? playerArt : aiArt;
  const defenderImg = side === 'player' ? aiArt : playerArt;
  attackerImg.classList.remove('attack', 'special');
  defenderImg.classList.remove('hit');
  void attackerImg.offsetWidth;
  if (isSpecial) attackerImg.classList.add('special');
  if (side === 'player') attackerImg.classList.add('attack', 'player'); else attackerImg.classList.add('attack', 'ai');
  setTimeout(() => {
    defenderImg.classList.add('hit');
    impact.classList.add('show');
    impact.style.width = isSpecial ? '110px' : '70px';
    impact.style.height = isSpecial ? '110px' : '70px';
    impact.style.background = isSpecial ? 'radial-gradient(circle, rgba(255,240,160,0.95), rgba(255,160,60,0.08))' : 'radial-gradient(circle, rgba(255,255,255,0.9), rgba(255,255,255,0.05))';
    setTimeout(() => impact.classList.remove('show'), 200);
  }, 180);
  setTimeout(() => {
    attackerImg.classList.remove('attack', 'player', 'ai');
    defenderImg.classList.remove('hit');
    attackerImg.classList.remove('special');
  }, 700);
}

/* AI decision (same as before) */
function aiChooseAction() {
  const aiHPPercent = state.aiHP / state.aiEffectiveChar.maxHP;
  const playerHPPercent = state.playerHP / state.playerEffectiveChar.maxHP;
  let roll = Math.random();
  const diff = state.difficulty;
  const defendBias = 0.6 - (diff * 0.04);
  const specialBias = 0.4 + (diff * 0.05);

  if (aiHPPercent < 0.3 && roll < defendBias) return 'defend';
  if (state.aiAttacks >= state.aiEffectiveChar.specialRequired) {
    if (playerHPPercent < 0.25 && roll < specialBias) return 'special';
    if (roll < (0.6 + diff*0.03)) return 'attack';
    return 'special';
  }
  return (roll < (0.85 - diff*0.03)) ? 'attack' : 'defend';
}

/* Player action handlers (with achievement-tracking hooks) */
function playerAttack(isSpecial=false) {
  if (!state) return;
  if (state.turn !== 'player') return;
  if (isSpecial && state.playerAttacks < state.playerEffectiveChar.specialRequired) {
    appendLog(`<em>Special not ready — you need ${state.playerEffectiveChar.specialRequired - state.playerAttacks} more attack(s).</em>`);
    specialBtn.classList.add('shake');
    setTimeout(()=> specialBtn.classList.remove('shake'), 300);
    return;
  }

  const dmg = calcDamage(state.playerEffectiveChar, isSpecial);
  let finalDmg = dmg;
  if (state.aiDefend) {
    finalDmg = Math.round(finalDmg * 0.5);
    state.aiDefend = false;
    appendLog(`<em>${aiChar.name} braces, reducing damage.</em>`);
  }

  state.aiHP -= finalDmg;
  if (isSpecial) {
    appendLog(`<strong>${playerChar.name}</strong> used SPECIAL and deals <strong>${finalDmg}</strong> damage!`);
    state.playerAttacks = 0;
    // track special use
    if (session) { session.stats.specialUses = (session.stats.specialUses || 0) + 1; }
  } else {
    appendLog(`<strong>${playerChar.name}</strong> attacks and deals <strong>${finalDmg}</strong> damage!`);
    state.playerAttacks = (state.playerAttacks || 0) + 1;
  }

  // track highest damage
  if (session) {
    session.stats.highestDamage = Math.max(session.stats.highestDamage || 0, finalDmg);
    persistSession();
  }

  // show popup on AI (defender)
  showDamagePopup('ai', finalDmg, isSpecial);

  animateAttack('player', isSpecial);
  updateHPUI();
  checkBattleEndThenProceed('player');
}

function checkBattleEndThenProceed(lastActor) {
  if (state.aiHP <= 0) { endBattle(true); return; }
  if (state.playerHP <= 0) { endBattle(false); return; }

  if (lastActor === 'player') {
    state.turn = 'ai';
    setTimeout(aiTurn, 700);
  } else {
    state.turn = 'player';
    if (state.autoMode) {
      setTimeout(() => {
        const pReady = state.playerAttacks >= state.playerEffectiveChar.specialRequired;
        const choice = pReady ? ((Math.random() < 0.45) ? 'special' : 'attack') : 'attack';
        if (choice === 'special') playerAttack(true); else playerAttack(false);
      }, 600);
    }
  }
}

function aiTurn() {
  if (!state || state.turn !== 'ai') return;
  let action = aiChooseAction();
  if (action === 'special' && state.aiAttacks < state.aiEffectiveChar.specialRequired) action = 'attack';

  if (action === 'defend') {
    appendLog(`<em>${aiChar.name} defends and braces for impact.</em>`);
    state.aiDefend = true;
    checkBattleEndThenProceed('ai');
    return;
  }

  if (action === 'attack') {
    const dmg = calcDamage(state.aiEffectiveChar, false);
    state.playerHP -= dmg;
    appendLog(`<strong>${aiChar.name}</strong> attacks and deals <strong>${dmg}</strong> damage!`);
    state.aiAttacks = (state.aiAttacks || 0) + 1;

    // show popup on player (defender)
    showDamagePopup('player', dmg, false);
    animateAttack('ai', false);
    updateHPUI();
    checkBattleEndThenProceed('ai');
    return;
  }

  if (action === 'special') {
    const dmg = calcDamage(state.aiEffectiveChar, true);
    state.playerHP -= dmg;
    appendLog(`<strong>${aiChar.name}</strong> uses SPECIAL and deals <strong>${dmg}</strong> damage!`);
    state.aiAttacks = 0;

    // show popup on player for special
    showDamagePopup('player', dmg, true);
    animateAttack('ai', true);
    updateHPUI();
    checkBattleEndThenProceed('ai');
    return;
  }
  checkBattleEndThenProceed('ai');
}

/* End battle: update stats, coins, achievements */
function endBattle(didPlayerWin) {
  if (session) {
    // update stats
    session.stats.totalBattles = (session.stats.totalBattles || 0) + 1;
    if (didPlayerWin) {
      session.stats.wins = (session.stats.wins || 0) + 1;
      session.stats.winStreak = (session.stats.winStreak || 0) + 1;
      // record defeated character
      session.stats.defeated = session.stats.defeated || {};
      session.stats.defeated[aiChar.id] = true;
      // record wins by difficulty
      session.stats.winsByDifficulty = session.stats.winsByDifficulty || {};
      session.stats.winsByDifficulty[state.difficulty] = (session.stats.winsByDifficulty[state.difficulty] || 0) + 1;

      const reward = coinsRewardForWin(50, state.difficulty || 5);
      session.coins = (session.coins || 0) + reward;
      session.totalEarned = (session.totalEarned || 0) + reward;
      appendLog(`<em>You earned ${reward} coins for this victory.</em>`);
      alert(`Victory! You earned ${reward} coins.`);
    } else {
      session.stats.losses = (session.stats.losses || 0) + 1;
      session.stats.winStreak = 0;
      const consolation = Math.max(5, Math.round(5 * (state.difficulty || 1)));
      session.coins = (session.coins || 0) + consolation;
      session.totalEarned = (session.totalEarned || 0) + consolation;
      appendLog(`<em>Consolation: ${consolation} coins.</em>`);
      alert(`Defeat. You received ${consolation} consolation coins.`);
    }

    // persist and check achievements
    users[currentUser] = session;
    saveUsers(users);
    // update UI coin numbers
    userCoinsEl.textContent = session.coins;
    shopCoins.textContent = session.coins;
    profileCoins.textContent = session.coins;

    // check achievements (this will also show toasts for newly unlocked)
    checkAndUnlockAchievementsForUser(session);
  }

  state.autoMode = false;
  if (didPlayerWin) {
    winText.textContent = `You defeated ${aiChar.name}!`;
    showScreen('win');
  } else {
    loseText.textContent = `${aiChar.name} defeated you...`;
    showScreen('lose');
  }
}

// Wire battle buttons
attackBtn.addEventListener('click', () => { if (!state) return; playerAttack(false); });
specialBtn.addEventListener('click', () => { if (!state) return; playerAttack(true); });
autoBtn.addEventListener('click', () => {
  if (!state) return;
  state.autoMode = !state.autoMode;
  autoBtn.textContent = state.autoMode ? 'Auto: ON' : 'Auto';
  if (state.autoMode && state.turn === 'player') {
    setTimeout(() => {
      const pReady = state.playerAttacks >= state.playerEffectiveChar.specialRequired;
      const choice = pReady ? ((Math.random() < 0.35) ? 'special' : 'attack') : 'attack';
      if (choice === 'special') playerAttack(true); else playerAttack(false);
    }, 400);
  }
  updateSpecialUI();
});

// Win/Lose navigation
winToSelect.addEventListener('click', () => { renderCharacters(); showScreen('select'); });
loseToSelect.addEventListener('click', () => { renderCharacters(); showScreen('select'); });

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (!state) return;
  if (screens.battle.classList.contains('visible')) {
    if (e.key === 'a') attackBtn.click();
    if (e.key === 's') specialBtn.click();
    if (e.key === 'd') autoBtn.click();
  }
});

// initial render on page load
(function init() {
  users = loadUsers();
  currentUser = loadCurrent();
  // ensure all users have stats/achievements if older data exists
  Object.keys(users).forEach(k => { ensureUserFields(users[k]); });
  refreshAuthUI();
  renderCharacters();
  populateShopCharSelect();
})();
