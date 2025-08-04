; (function () {
  // CONFIG & STATE
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const config = {
    maxPoints: 10,
    maxSmall: 2,
    soundEnabled: true,
    darkMode: true,
    sounds: {
      pointAdd: 'sound-point-add',
      pointRemove: 'sound-point-remove',
      smallAdd: 'sound-small-add',
      smallReset: 'sound-small-reset',
      gameWin: 'sound-game-win',
      titleClick: 'sound-title-click'
    }
  };

  const state = {
    players: []
  };

  // SOUND MANAGER
  const Sound = {
    play(key) {
      if (!config.soundEnabled || !config.sounds[key]) return;
      const audio = document.getElementById(config.sounds[key]);
      if (!audio) return;
      fetch(audio.src)
        .then(r => r.arrayBuffer())
        .then(data => audioCtx.decodeAudioData(data))
        .then(buffer => {
          const src = audioCtx.createBufferSource();
          src.buffer = buffer;
          src.connect(audioCtx.destination);
          src.start();
        })
        .catch(err => console.error('Sound error:', err));
    }
  };

  // THEME MANAGER
  const ThemeManager = {
    init() {
      // Load saved theme or default to light
      const savedTheme = localStorage.getItem('theme') || 'light';
      config.darkMode = savedTheme === 'dark';
      this.apply();
      this.updateIcon();
    },

    toggle() {
      config.darkMode = !config.darkMode;
      localStorage.setItem('theme', config.darkMode ? 'dark' : 'light');
      this.apply();
      this.updateIcon();
    },

    apply() {
      document.documentElement.setAttribute('data-theme', config.darkMode ? 'dark' : 'light');
    },

    updateIcon() {
      const button = document.getElementById('toggleDarkMode');
      if (!button) return;

      const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"/>
    </svg>`;

      const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
    </svg>`;

      // Show moon icon in light mode (to switch to dark), sun icon in dark mode (to switch to light)
      button.innerHTML = config.darkMode ? sunIcon : moonIcon;
    }
  };

  // PLAYER MODEL
  class Player {
    constructor(name) {
      this.name = name;
      this.points = 0;
      this.small = 0;
    }
    resetScores() {
      this.points = 0;
      this.small = 0;
    }
  }

  // UI SELECTORS
  const ui = {
    playerList: '#playerList',
    leaderboardList: '#leaderboardList',
    modals: {
      leaderboard: '#leaderboardModal',
      endGame: '#endGameModal',
      settings: '#settingsModal'
    },
    newNameInput: '#newName',
    maxPointsDisp: '#maxPointsDisplay',
    maxSmallDisp: '#maxSmallPointsDisplay',
    soundToggle: '#soundToggle'
  };

  // RENDER
  function renderPlayers() {
    const list = document.querySelector(ui.playerList);
    list.innerHTML = '';
    state.players.forEach((p, i) => {
      const li = document.createElement('li');
      li.className = 'player-card';

      if (p.points >= config.maxPoints) {
        li.classList.add('greyed-out');
      } else if (p.points === config.maxPoints - 1 || p.small === config.maxSmall) {
        li.classList.add('highlight-danger');
      }

      li.innerHTML = `
        <button data-action="remove"    data-idx="${i}" class="remove-btn">×</button>
        <div class="player-info">
          <div class="name">${p.name}</div>
          <div class="points">${p.points}</div>
        </div>
        <div class="player-actions">
          <button data-action="incPoints" data-idx="${i}" class="btn btn-secondary">+</button>
          <button data-action="decPoints" data-idx="${i}" class="btn btn-secondary">−</button>
        </div>
        <div class="small-section">
          <div class="label">Kleine Speler</div>
          <div class="small-count">${p.small}</div>
          <div class="small-controls">
            <button data-action="incSmall"  data-idx="${i}" class="btn btn-tertiary">+</button>
            <button data-action="resetSmall"data-idx="${i}" class="btn btn-tertiary">⟳</button>
          </div>
        </div>
      `;
      list.appendChild(li);
    });
  }

  function renderLeaderboard(players) {
    const lb = document.querySelector(ui.leaderboardList);
    lb.innerHTML = players.map(p =>
      `<li class="grid grid-cols-3">
        <div>${p.name}</div>
        <div class="text-center">${p.wins}</div>
        <div class="text-center">${p.losses}</div>
      </li>`
    ).join('');
  }

  // MODAL CONTROLS
  function toggleModal(name, show) {
    const modal = document.querySelector(ui.modals[name]);
    modal.classList.toggle('hidden', !show);
    modal.classList.toggle('flex', show);
  }

  // FIREBASE HELPERS

  // Push one record into /leaderboard
  function pushRecordToFirebase({ name, wins, losses }) {
    return db.ref('leaderboard').push({
      name,
      wins,
      losses,
      ts: Date.now()
    });
  }

  // Fetch last ~100 entries, aggregate per player, sort by wins desc
  async function fetchTopRecords(limit = 10) {
    try {
      // COMPAT SDK uses .once('value') on queries
      const snap = await db.ref('leaderboard')
        .orderByChild('ts')
        .limitToLast(100)
        .once('value');
      if (!snap.exists()) return [];
      const all = Object.values(snap.val());
      const agg = all.reduce((m, r) => {
        if (!m[r.name]) m[r.name] = { name: r.name, wins: 0, losses: 0 };
        m[r.name].wins += r.wins;
        m[r.name].losses += r.losses;
        return m;
      }, {});
      return Object.values(agg)
        .sort((a, b) => b.wins - a.wins)
        .slice(0, limit);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      return [];
    }
  }

  // GAME LOGIC
  async function endGame() {
    if (!state.players.length) return;
    const minPts = Math.min(...state.players.map(p => p.points));
    const deltas = state.players.map(p => ({
      name: p.name,
      wins: p.points === minPts ? 1 : 0,
      losses: p.points === minPts ? 0 : 1
    }));
    Sound.play('gameWin');
    await Promise.all(deltas.map(pushRecordToFirebase));
    state.players.forEach(p => p.resetScores());
    renderPlayers();
  }

  // EVENT HANDLING
  const actionHandlers = {
    titleClick: () => Sound.play('titleClick'),
    incPoints: i => { state.players[i].points++; Sound.play('pointAdd'); },
    decPoints: i => { state.players[i].points--; Sound.play('pointRemove'); },
    incSmall: i => { state.players[i].small++; Sound.play('smallAdd'); },
    resetSmall: i => { state.players[i].small = 0; Sound.play('smallReset'); },
    remove: i => state.players.splice(i, 1)
  };

  document.body.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const action = btn.dataset.action;
    const idx = btn.dataset.idx && Number(btn.dataset.idx);

    if (action && actionHandlers[action]) {
      actionHandlers[action](idx);
      renderPlayers();
      return;
    }

    switch (btn.id) {
      case 'addPlayer': {
        const raw = document.querySelector(ui.newNameInput).value.trim();
        if (!raw) return;
        const name = raw[0].toUpperCase() + raw.slice(1).toLowerCase();
        if (!state.players.some(p => p.name === name)) {
          state.players.push(new Player(name));
        }
        document.querySelector(ui.newNameInput).value = '';
        renderPlayers();
        break;
      }
      case 'resetGame':
        state.players.forEach(p => p.resetScores());
        renderPlayers();
        break;

      case 'showLeaderboard': {
        try {
          const top = await fetchTopRecords(10);
          renderLeaderboard(top);
          toggleModal('leaderboard', true);
        } catch (err) {
          console.error('Failed to show leaderboard:', err);
        }
        break;
      }
      case 'closeLeaderboard':
        toggleModal('leaderboard', false);
        break;

      case 'endGame':
        toggleModal('endGame', true);
        break;
      case 'cancelEndGame':
        toggleModal('endGame', false);
        break;
      case 'confirmEndGame':
        toggleModal('endGame', false);
        await endGame();
        break;

      case 'showSettings':
        toggleModal('settings', true);
        break;
      case 'toggleDarkMode':
        ThemeManager.toggle();
        break;
      case 'closeSettings':
        toggleModal('settings', false);
        break;
      case 'applySettings':
        e.preventDefault();
        config.maxPoints = Number(document.querySelector(ui.maxPointsDisp).textContent);
        config.maxSmall = Number(document.querySelector(ui.maxSmallDisp).textContent);
        config.soundEnabled = document.querySelector(ui.soundToggle).checked;
        renderPlayers();
        toggleModal('settings', false);
        break;
    }
  });

  // SETTINGS CONTROLS
  function bindIncrement(id, key) {
    document.getElementById(id).addEventListener('click', () => {
      config[key]++;
      document.querySelector(ui[key === 'maxPoints' ? 'maxPointsDisp' : 'maxSmallDisp'])
        .textContent = config[key];
      Sound.play('pointAdd');
      renderPlayers();
    });
  }
  function bindDecrement(id, key) {
    document.getElementById(id).addEventListener('click', () => {
      if (config[key] > 1) {
        config[key]--;
        document.querySelector(ui[key === 'maxPoints' ? 'maxPointsDisp' : 'maxSmallDisp'])
          .textContent = config[key];
        Sound.play('pointRemove');
        renderPlayers();
      }
    });
  }

  bindIncrement('increaseMaxPoints', 'maxPoints');
  bindDecrement('decreaseMaxPoints', 'maxPoints');
  bindIncrement('increaseMaxSmallPoints', 'maxSmall');
  bindDecrement('decreaseMaxSmallPoints', 'maxSmall');

  // INITIAL RENDER
  ThemeManager.init();
  document.querySelector(ui.maxPointsDisp).textContent = config.maxPoints;
  document.querySelector(ui.maxSmallDisp).textContent = config.maxSmall;
  renderPlayers();
})();
