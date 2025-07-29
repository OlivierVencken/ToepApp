const apiUrl = window.location.origin;
let players = [];

defaultSounds = {
  pointAdd:    document.getElementById('sound-point-add'),
  pointRemove: document.getElementById('sound-point-remove'),
  smallAdd:    document.getElementById('sound-small-add'),
  smallReset:  document.getElementById('sound-small-reset'),
  gameWin:     document.getElementById('sound-game-win')
};

function playSound(key) {
  const audio = defaultSounds[key];
  if (!audio) return;
  audio.currentTime = 0;
  audio.play();
}

function addLocalPlayer(name) {
  if (!players.find(p => p.name === name)) {
    players.push({ name, points: 0, small: 0, id: null });
  }
}

function removeLocalPlayer(name) {
  players = players.filter(p => p.name !== name);
}

function renderPlayers() {
  const list = document.getElementById('playerList');
  list.innerHTML = '';
  players.forEach((p, idx) => {
    const li = document.createElement('li');
    li.className = 'player-card';

    li.innerHTML = `
      <button data-idx="${idx}" class="remove-btn">×</button>
      <div class="player-info">
        <div class="name">${p.name}</div>
        <div class="points">${p.points}</div>
      </div>
      <div class="player-actions">
        <button data-idx="${idx}" data-action="incPoints" class="btn btn-secondary">+</button>
        <button data-idx="${idx}" data-action="decPoints" class="btn btn-secondary">−</button>
      </div>
      <div class="small-section">
        <div class="label">Kleine Speler</div>
        <div class="small-count">${p.small}</div>
        <div class="small-controls">
          <button data-idx="${idx}" data-action="incSmall"   class="btn btn-tertiary">+</button>
          <button data-idx="${idx}" data-action="resetSmall" class="btn btn-tertiary">⟳</button>
        </div>
      </div>
    `;
    list.appendChild(li);
  });
}

async function showLeaderboard() {
  const res = await fetch(`${apiUrl}/players`);
  const all = await res.json();
  all.sort((a,b) => b.wins - a.wins);
  const lb = document.getElementById('leaderboardList');
  lb.innerHTML = all.map(p =>
    `<li class="grid grid-cols-3">
       <div>${p.name}</div>
       <div class="text-center">${p.wins}</div>
       <div class="text-center">${p.losses}</div>
     </li>`
  ).join('');
  document.getElementById('leaderboardModal').classList.replace('hidden','flex');
}

async function syncRecords(records) {
  for (let { id, name, wins, losses } of records) {
    let pid = id;
    if (!pid) {
      const res = await fetch(`${apiUrl}/players`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      pid = data.id;
    }
    await fetch(`${apiUrl}/players/${pid}/record`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ win_delta: wins, loss_delta: losses })
    });
  }
}

async function endGame() {
  if (!players.length) return;
  // find the lowest point‑total
  let minPts = Math.min(...players.map(p => p.points));

  // build the win/loss deltas: winner (lowest) +1 win, others +1 loss
  const records = players.map(p => ({
    id:     p.id,
    name:   p.name,
    wins:   (p.points === minPts ? 1 : 0),
    losses: (p.points === minPts ? 0 : 1)
  }));

  playSound('gameWin');
  await syncRecords(records);

  // reset local scores
  players.forEach(p => { p.points = 0; p.small = 0; });
  renderPlayers();
}

document.body.addEventListener('click', async e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const idx = btn.dataset.idx;
  switch (btn.dataset.action) {
    case 'incPoints':
      players[idx].points++;
      playSound('pointAdd');
      break;
    case 'decPoints':
      players[idx].points--;
      playSound('pointRemove');
      break;
    case 'incSmall':
      players[idx].small++;
      playSound('smallAdd');
      break;
    case 'resetSmall':
      players[idx].small = 0;
      playSound('smallReset');
      break;
    default:
      if (btn.id === 'addPlayer') {
        const raw = document.getElementById('newName').value.trim();
        if (!raw) return;
        const name = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        addLocalPlayer(name);
      } else if (btn.classList.contains('remove-btn')) {
        removeLocalPlayer(players[idx].name);
      } else if (btn.id === 'resetGame') {
        players.forEach(p => { p.points = 0; p.small = 0; });
      } else if (btn.id === 'showLeaderboard') {
        showLeaderboard();
      } else if (btn.id === 'closeLeaderboard') {
        document.getElementById('leaderboardModal').classList.replace('flex','hidden');
      } else if (btn.id === 'endGame') {
        endGame();
      }
  }
  renderPlayers();
});

renderPlayers();
