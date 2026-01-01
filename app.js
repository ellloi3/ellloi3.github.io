// app.js
// Simple client-side app for selecting a LEGO Ninjago fighter and fighting an AI opponent.
// The "AI" is a lightweight decision function that picks a random opponent and chooses actions based on simple heuristics.

(() => {
  // DOM references
  const screens = {
    home: document.getElementById('home'),
    select: document.getElementById('select'),
    battle: document.getElementById('battle'),
    win: document.getElementById('win'),
    lose: document.getElementById('lose')
  };

  const startBtn = document.getElementById('startBtn');
  const charactersGrid = document.getElementById('charactersGrid');
  const backToHome = document.getElementById('backToHome');

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

  // Win/Lose controls
  const winToSelect = document.getElementById('winToSelect');
  const loseToSelect = document.getElementById('loseToSelect');
  const winText = document.getElementById('winText');
  const loseText = document.getElementById('loseText');

  // App state
  let playerChar = null;
  let aiChar = null;
  let state = null; // { playerHP, aiHP, autoMode, turn: 'player'|'ai' }

  // Utilities
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('visible'));
    screens[name].classList.add('visible');
  }

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function randInt(min, max){ return Math.floor(Math.random()*(max-min+1)) + min; }

  // Initialize select grid from CHARACTERS (from characters.js)
  function renderCharacters() {
    charactersGrid.innerHTML = '';
    CHARACTERS.forEach(c => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="avatar ${c.colorClass}">${c.short}</div>
        <div class="info">
          <div class="name">${c.name}</div>
          <div class="desc">HP ${c.maxHP} • ATK ${c.attackMin}-${c.attackMax}</div>
        </div>
      `;
      card.addEventListener('click', () => onSelectCharacter(c.id));
      charactersGrid.appendChild(card);
    });
  }

  // Select player's character
  function onSelectCharacter(id) {
    playerChar = CHARACTERS.find(ch => ch.id === id);
    startBattle();
  }

  // Start a battle: AI chooses random opponent (not same id)
  function startBattle() {
    // choose AI character randomly, avoid the player's pick
    const possible = CHARACTERS.filter(c => c.id !== playerChar.id);
    aiChar = possible[randInt(0, possible.length - 1)];

    // initialize state
    state = {
      playerHP: playerChar.maxHP,
      aiHP: aiChar.maxHP,
      autoMode: false,
      turn: 'player' // player goes first
    };

    // render UI
    playerAvatar.className = `avatar ${playerChar.colorClass}`;
    playerAvatar.textContent = playerChar.short;
    aiAvatar.className = `avatar ${aiChar.colorClass}`;
    aiAvatar.textContent = aiChar.short;
    playerNameEl.textContent = playerChar.name;
    aiNameEl.textContent = aiChar.name;

    updateHPUI();
    battleLog.innerHTML = `<div>Opponent: <strong>${aiChar.name}</strong> has been chosen by the AI.</div>`;
    showScreen('battle');
  }

  function updateHPUI() {
    const pPerc = Math.round((state.playerHP / playerChar.maxHP) * 100);
    const aPerc = Math.round((state.aiHP / aiChar.maxHP) * 100);
    playerHPBar.style.width = `${clamp(pPerc,0,100)}%`;
    aiHPBar.style.width = `${clamp(aPerc,0,100)}%`;
    playerHPText.textContent = `HP: ${Math.max(0, state.playerHP)} / ${playerChar.maxHP}`;
    aiHPText.textContent = `HP: ${Math.max(0, state.aiHP)} / ${aiChar.maxHP}`;

    // colorize HP bars on low health
    if (pPerc < 30) playerHPBar.style.background = 'linear-gradient(90deg,#f97316,#ef4444)';
    else playerHPBar.style.background = 'linear-gradient(90deg,#34d399,#10b981)';
    if (aPerc < 30) aiHPBar.style.background = 'linear-gradient(90deg,#f97316,#ef4444)';
    else aiHPBar.style.background = 'linear-gradient(90deg,#34d399,#10b981)';
  }

  // Simple damage calculation
  function calcDamage(attacker, isSpecial=false) {
    const base = randInt(attacker.attackMin, attacker.attackMax);
    return Math.round(base * (isSpecial ? attacker.specialMultiplier : 1));
  }

  function appendLog(text) {
    const el = document.createElement('div');
    el.innerHTML = text;
    battleLog.prepend(el); // newest on top
  }

  // AI decision function (lightweight "AI")
  function aiChooseAction() {
    // Heuristics:
    // - If AI HP is low (<30%), high chance to defend (here we simulate a weaker action reducing incoming damage)
    // - If player HP is low, higher chance to special
    // - Otherwise random between 'attack' and 'special'
    const aiHPPercent = state.aiHP / aiChar.maxHP;
    const playerHPPercent = state.playerHP / playerChar.maxHP;
    let roll = Math.random();

    if (aiHPPercent < 0.3 && roll < 0.6) return 'defend';
    if (playerHPPercent < 0.25 && roll < 0.7) return 'special';
    // otherwise 70% attack, 30% special
    return (roll < 0.7) ? 'attack' : 'special';
  }

  // Player action handlers
  function playerAttack(isSpecial=false) {
    if (!state) return;
    if (state.turn !== 'player') return;
    const dmg = calcDamage(playerChar, isSpecial);
    // AI defend possibility is handled on AI turn; but we can add a small random guard chance
    state.aiHP -= dmg;
    appendLog(`<strong>${playerChar.name}</strong> ${isSpecial ? 'used SPECIAL' : 'attacks'} and deals <strong>${dmg}</strong> damage!`);
    updateHPUI();
    checkBattleEndThenProceed('player');
  }

  function checkBattleEndThenProceed(lastActor) {
    if (state.aiHP <= 0) {
      // player won
      endBattle(true);
      return;
    }
    if (state.playerHP <= 0) {
      endBattle(false);
      return;
    }

    // switch to other turn
    if (lastActor === 'player') {
      state.turn = 'ai';
      // if auto mode trigger delay for AI turn
      setTimeout(aiTurn, 700);
    } else {
      state.turn = 'player';
      // if auto mode trigger next player action automatically
      if (state.autoMode) {
        setTimeout(() => {
          // auto choose best action: if AI HP low -> attack, else sometimes special
          const choice = (state.aiHP / aiChar.maxHP < 0.35) ? 'attack' : ((Math.random() < 0.4) ? 'special' : 'attack');
          if (choice === 'special') playerAttack(true); else playerAttack(false);
        }, 600);
      }
    }
  }

  function aiTurn() {
    if (!state || state.turn !== 'ai') return;
    const action = aiChooseAction();

    if (action === 'defend') {
      // defending reduces damage on next player attack -> simulate as a temporary buff: heal a tiny amount and note defended
      appendLog(`<em>${aiChar.name} defends and braces for impact.</em>`);
      // apply a small heal or shield effect by storing a defend flag
      state.aiDefend = true;
      // end AI turn
      checkBattleEndThenProceed('ai');
      return;
    }

    if (action === 'attack') {
      const dmg = calcDamage(aiChar, false);
      // if player has defend effect? (we did not implement player defend)
      state.playerHP -= dmg;
      appendLog(`<strong>${aiChar.name}</strong> attacks and deals <strong>${dmg}</strong> damage!`);
      updateHPUI();
      checkBattleEndThenProceed('ai');
      return;
    }

    if (action === 'special') {
      const dmg = calcDamage(aiChar, true);
      // if player had defend reduce damage
      state.playerHP -= dmg;
      appendLog(`<strong>${aiChar.name}</strong> uses SPECIAL and deals <strong>${dmg}</strong> damage!`);
      updateHPUI();
      checkBattleEndThenProceed('ai');
      return;
    }
  }

  function endBattle(didPlayerWin) {
    // clear state.autoMode
    state.autoMode = false;
    if (didPlayerWin) {
      winText.textContent = `You defeated ${aiChar.name}!`;
      showScreen('win');
    } else {
      loseText.textContent = `${aiChar.name} defeated you...`;
      showScreen('lose');
    }
  }

  // Wire buttons
  startBtn.addEventListener('click', () => {
    renderCharacters();
    showScreen('select');
  });

  backToHome.addEventListener('click', () => showScreen('home'));

  attackBtn.addEventListener('click', () => {
    if (!state) return;
    playerAttack(false);
  });

  specialBtn.addEventListener('click', () => {
    if (!state) return;
    // special has a small chance to miss: add small risk
    if (Math.random() < 0.12) {
      appendLog(`<strong>${playerChar.name}</strong> tried a SPECIAL but missed!`);
      // switch to AI turn
      state.turn = 'ai';
      setTimeout(aiTurn, 600);
      return;
    }
    playerAttack(true);
  });

  autoBtn.addEventListener('click', () => {
    if (!state) return;
    state.autoMode = !state.autoMode;
    autoBtn.textContent = state.autoMode ? 'Auto: ON' : 'Auto';
    if (state.autoMode && state.turn === 'player') {
      // kick off automatic actions
      setTimeout(() => {
        const choice = (Math.random() < 0.35) ? 'special' : 'attack';
        if (choice === 'special') playerAttack(true); else playerAttack(false);
      }, 400);
    }
  });

  winToSelect.addEventListener('click', () => {
    renderCharacters();
    showScreen('select');
  });
  loseToSelect.addEventListener('click', () => {
    renderCharacters();
    showScreen('select');
  });

  // initial render
  renderCharacters();
  showScreen('home');

  // Helpful: keyboard shortcuts for quicker testing (optional)
  document.addEventListener('keydown', (e) => {
    if (!state) return;
    if (screens.battle.classList.contains('visible')) {
      if (e.key === 'a') attackBtn.click();
      if (e.key === 's') specialBtn.click();
      if (e.key === 'd') autoBtn.click();
    }
  });

})();
