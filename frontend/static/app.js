const apiUrl = window.location.origin;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let players = [];

defaultSounds = {
  pointAdd:    document.getElementById('sound-point-add'),
  pointRemove: document.getElementById('sound-point-remove'),
  smallAdd:    document.getElementById('sound-small-add'),
  smallReset:  document.getElementById('sound-small-reset'),
  gameWin:     document.getElementById('sound-game-win'),
  titleClick: document.getElementById('sound-title-click')
};

function playSound(key) {
  const audio = defaultSounds[key];
  if (!audio) return;

  // Use AudioContext to play the sound
  const source = audioContext.createBufferSource();
  fetch(audio.src)
    .then(response => response.arrayBuffer())
    .then(data => audioContext.decodeAudioData(data))
    .then(buffer => {
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    })
    .catch(err => console.error('Error playing sound:', err));
}

function addLocalPlayer(name) {
  if (!players.find(p => p.name === name)) {
    players.push({ name, points: 0, small: 0, id: null });
  }

  // Clear the input field after adding the player
  document.getElementById('newName').value = '';
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

    // Add a red outline if the player has 9 points or 2 small points
    if (p.points === 9 || p.small >= 2) {
      li.classList.add('highlight-danger');
    }

    // Grey out the player card if the player has 10 points
    if (p.points >= 10) {
      li.classList.add('greyed-out');
    }

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

// Show the confirmation modal
function showEndGameModal() {
  document.getElementById('endGameModal').classList.replace('hidden', 'flex');
}

// Hide the confirmation modal
function hideEndGameModal() {
  document.getElementById('endGameModal').classList.replace('flex', 'hidden');
}

// Handle the "Einde Potje" button click
document.body.addEventListener('click', async e => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const idx = btn.dataset.idx;
  switch (btn.dataset.action) {
    case 'titleClick':
      playSound('titleClick');
      break;
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
        document.getElementById('leaderboardModal').classList.replace('flex', 'hidden');
      } else if (btn.id === 'endGame') {
        showEndGameModal(); // Show the confirmation modal
      } else if (btn.id === 'cancelEndGame') {
        hideEndGameModal(); // Hide the modal when "Nee" is pressed
      } else if (btn.id === 'confirmEndGame') {
        hideEndGameModal(); // Hide the modal
        endGame(); // End the game when "Ja" is pressed
      }
  }
  renderPlayers();
});

renderPlayers();
