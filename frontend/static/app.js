
; (function () {
  const apiUrl = window.location.origin;
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  /*** CONFIG & STATE ***/
  const config = {
    maxPoints: 10,
    maxSmall: 2,
    soundEnabled: true,
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

  /*** SOUND MANAGER ***/
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

  /*** PLAYER MODEL ***/
  class Player {
    constructor(name) {
      this.name = name;
      this.points = 0;
      this.small = 0;
      this.id = null;
    }
    resetScores() {
      this.points = 0;
      this.small = 0;
    }
  }

  /*** UI SELECTORS ***/
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

  /*** RENDER ***/
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
        <button data-action="remove" data-idx="${i}" class="remove-btn">×</button>
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
            <button data-action="incSmall" data-idx="${i}" class="btn btn-tertiary">+</button>
            <button data-action="resetSmall" data-idx="${i}" class="btn btn-tertiary">⟳</button>
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

  /*** MODAL CONTROLS ***/
  function toggleModal(name, show) {
    const modal = document.querySelector(ui.modals[name]);
    modal.classList.toggle('hidden', !show);
    modal.classList.toggle('flex', show);
  }

  /*** DATA SYNC ***/
  async function syncRecords(records) {
    for (const rec of records) {
      let pid = rec.id;
      if (!pid) {
        const res = await fetch(`${apiUrl}/players`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: rec.name })
        });
        pid = (await res.json()).id;
      }
      await fetch(`${apiUrl}/players/${pid}/record`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ win_delta: rec.wins, loss_delta: rec.losses })
      });
    }
  }

  /*** GAME LOGIC ***/
  async function endGame() {
    if (!state.players.length) return;
    const minPts = Math.min(...state.players.map(p => p.points));
    const deltas = state.players.map(p => ({
      id: p.id,
      name: p.name,
      wins: p.points === minPts ? 1 : 0,
      losses: p.points === minPts ? 0 : 1
    }));
    Sound.play('gameWin');
    await syncRecords(deltas);
    state.players.forEach(p => p.resetScores());
    renderPlayers();
  }

  /*** EVENT HANDLING ***/
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
    const idx = btn.dataset.idx;

    switch (action) {
      case 'titleClick':
      case 'incPoints':
      case 'decPoints':
      case 'incSmall':
      case 'resetSmall':
      case 'remove':
        actionHandlers[action](Number(idx));
        break;
      default:
        switch (btn.id) {
          case 'addPlayer': {
            const raw = document.querySelector(ui.newNameInput).value.trim();
            if (!raw) return;
            const name = raw[0].toUpperCase() + raw.slice(1).toLowerCase();
            if (!state.players.some(p => p.name === name)) {
              state.players.push(new Player(name));
            }
            document.querySelector(ui.newNameInput).value = '';
            break;
          }
          case 'resetGame':
            state.players.forEach(p => p.resetScores());
            break;
          case 'showLeaderboard': {
            const res = await fetch(`${apiUrl}/players`);
            const all = await res.json();
            all.sort((a, b) => b.wins - a.wins);
            renderLeaderboard(all);
            toggleModal('leaderboard', true);
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
    }
    renderPlayers();
  });

  /*** SETTINGS CONTROLS ***/
  function bindIncrement(id, key) {
    document.getElementById(id).addEventListener('click', () => {
      config[key]++;
      document.querySelector(ui[key === 'maxPoints' ? 'maxPointsDisp' : 'maxSmallDisp']).textContent = config[key];
      Sound.play('pointAdd');
      renderPlayers();
    });
  }
  function bindDecrement(id, key) {
    document.getElementById(id).addEventListener('click', () => {
      if (config[key] > 1) {
        config[key]--;
        document.querySelector(ui[key === 'maxPoints' ? 'maxPointsDisp' : 'maxSmallDisp']).textContent = config[key];
        Sound.play('pointRemove');
        renderPlayers();
      }
    });
  }

  bindIncrement('increaseMaxPoints', 'maxPoints');
  bindDecrement('decreaseMaxPoints', 'maxPoints');
  bindIncrement('increaseMaxSmallPoints', 'maxSmall');
  bindDecrement('decreaseMaxSmallPoints', 'maxSmall');

  // Initial render
  document.querySelector(ui.maxPointsDisp).textContent = config.maxPoints;
  document.querySelector(ui.maxSmallDisp).textContent = config.maxSmall;
  renderPlayers();
})();
