# ToepApp

**Main branch is Firebase-DB** 

Mobile-first web app to track and manage a Toepen game with sounds, dark mode, and a leaderboard.

- Frontend: JS + Tailwind (CDN) + custom CSS (CSS variables)
- Backend: Flask + SQLAlchemy (SQLite)
- Leaderboard: Firebase Realtime Database (client-side)
- PWA-ready: manifest included


## Features

- Player management
  - Add/remove players
  - Track points and “small” points
  - Per-player increment/decrement
  - Reset “small” points
  - Auto “greyed out” style when a player hits max points (adaptive in dark mode)
- Settings 
  - Max points (+/-)
  - Max small points (+/-)
  - Sound on/off
- Dark/Light mode 
  - One-tap toggle, persists via localStorage
  - Uses CSS variables for theme
  - Dark mode background black, player cards/search grey, text adapts
- Sounds
  - Button and feedback sounds (with on/off toggle)
- Leaderboard
  - Simple push-based win/loss records in Firebase
  - Aggregate top players
- Mobile-first UI
  - Touch-friendly
  - Lightweight, no build step required
- PWA groundwork
  - manifest.json included for installability

## How it works

### Game logic (frontend)
- State is kept in memory (`state.players`).
- “End game”:
  - Find the minimum points among players.
  - Everyone with the minimum gets a win; others get a loss.
  - Push per-player records to Firebase (`/leaderboard`) as small deltas.
  - Reset all players’ points and “small”.
- Sounds are played via the Web Audio API when enabled.

### UI and events
- Central event delegation via `document.body.addEventListener('click', …)`.
- Button `data-action` attributes map to handlers (inc/dec points, small, reset, remove, etc.).
- Settings and dark-mode toggles are dedicated buttons at the header corners.
- Rendering functions update the DOM for players and leaderboard.

### Theming (light/dark)
- CSS variables control theme (`data-theme="light" | "dark"` on `<html>`).
- Dark mode:
  - Background: black
  - Player cards/search: grey
  - Text colors adapt via variables
  - “Greyed out” player in dark mode uses an almost-black background
- Theme persists in `localStorage`.

### Leaderboard (Firebase)
- Client pushes small records to `/leaderboard` (name, wins, losses, timestamp).
- Reads all records, aggregates per player (wins/losses), sorts, and shows top N.

### Backend (Flask + SQLAlchemy) for testing
- Provides an app shell, SQLite DB, and a `Player` model (wins/losses).
- Static and templates are served from `frontend/`.


## Prerequisites

- Python 3.10+ (recommended)
- Windows terminal or PowerShell
- A Firebase Realtime Database instance (URL)
- Optional: sounds as `<audio>` tags with the expected IDs in your HTML

## Local setup (Windows)

1) Create and activate a virtual environment
```
py -m venv .venv
.\.venv\Scripts\activate
```

2) Install backend requirements
```
pip install -r backend\requirements.txt
```

3) Environment variables
- Create these files and set values appropriately:
  - Root `.env` (app secrets)
  - `database\.env` for Firebase

Example:
```
# .env
ADMIN_PW=<admin-password>
NORMAL_PW=<user-password>
```

```
# database\.env
FIREBASE_URL=https://<your-project>.europe-west1.firebasedatabase.app
```

4) Initialize the SQLite database
- Add minimal bootstrapping in `backend\app.py` to create tables on first run:
```
from models import db
# On first request or startup: db.create_all()
```

5) Run the server
- Using Flask’s dev server:
```
set FLASK_APP=backend.app
set FLASK_ENV=development
flask run
```


## Frontend integration notes

- Tailwind is loaded via CDN in HTML head.
- `frontend\static\app.js` expects:
  - Audio elements with IDs:
    - sound-point-add
    - sound-point-remove
    - sound-small-add
    - sound-small-reset
    - sound-game-win
    - sound-title-click
  - Firebase “compat” SDK loaded and initialized with `db` available globally, pointing to your Realtime Database.
    - `pushRecordToFirebase` uses `db.ref('leaderboard').push({...})`.
    - `fetchTopRecords` reads/aggregates all entries.

- Dark mode toggle:
  - Button ID: `toggleDarkMode`
  - Theme stored in `localStorage` as `theme = 'light'|'dark'`
  - Icons swap via JS (only one icon rendered at a time).

- Settings:
  - Button ID: `showSettings` (top-left)
  - Max points and max small points use +/- controls (no text input)
  - Sound toggle via checkbox
  - “Apply/Save” updates config and re-renders



## Data model

- Firebase leaderboard entry (per record pushed):
```
{
  name: string,
  wins: number,
  losses: number,
  ts: epochMillis
}
```

- Aggregation is done client-side and sorted by total wins (desc).

- Backend SQLAlchemy (optional/extendable):
```
Player: id, name (unique), wins, losses
```


## PWA

- `frontend\static\manifest.json` included.
- Add an icon, splashscreen set and  a service worker for offline support.


## Known issues
  - Audio not working reliably on IOS PWA 

