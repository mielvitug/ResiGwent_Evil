An unofficial fan-game spinoff of The Witcher's Gwent-like gameplay, set in the Resident Evil universe.

Disclaimer: all artwork, images, and music used here belong to CAPCOM. This is a non-commercial fan project, not affiliated with or endorsed by CAPCOM. All original code and content here are all rights reserved, see LICENSE.

Working game link here: https://resigwentevil.vercel.app

# ResiGwent Evil

A Gwent-style card battler set in the Resident Evil universe. Build a deck of 3 to 25 cards, then win a best-of-3 match across three combat rows. Made for players first, and for course markers second.

## 1. Overview

ResiGwent Evil is a tactical card game where Resident Evil characters, creatures, and gear fight across Melee, Ranged, and Siege rows. The problem it solves is simple: a full card game loop (collect, build, battle, review) that runs in the browser with no account and no setup for the player. The live game is hosted on Vercel with its PostgreSQL database on Neon. It is for fans of card battlers and for anyone marking this course.

## 2. Setup and installation

What to install first:

- Node 20 or newer.
- PostgreSQL, local or hosted. Any Postgres that gives you a connection string works.

How to get the code:

```sh
git clone https://github.com/mielvitug/ResiGwent_evil.git
cd ResiGwent_evil
```

How to install dependencies:

```sh
npm install
```

Environment and configuration. The app needs exactly one variable. Copy `.env.example` to `.env` and fill in your own connection string:

```sh
DATABASE_URL=postgresql://user:password@localhost:5432/resigwent
```

How to set up and seed the database. There is no seed step. The tables (`settings`, `decks`, `matches`) create themselves when the server starts. Cards live in code under `src/data/`, so a fresh database is already a working one.

## 3. How to run it

Required: the game itself.

```sh
npm run dev
```

Open `http://localhost:5173`. You should see the Command Center menu with four operations: Play Game, Deck Builder, Collection, Options. On its own this is fully playable, but everything lives in this browser only. Reloads keep your data, other machines never see it.

Recommended: the server, so anything saves.

```sh
npm run server
```

This starts the API on port 3001. `GET http://localhost:3001/api/health` should answer `{ok: true, decks: N}`. With it running, finished matches, decks, and settings persist in PostgreSQL instead of local storage.

Checks that should pass before you play:

```sh
npm test
npm run build
```

## 4. Features and usage

The primary flow: pick Play Game, choose a deck in the Deck Builder (3 to 25 cards, max 6 legendaries per organization), survive the mulligan, play three rounds across the rows, and read the result. Finished matches are saved and readable later. Collection reviews every card. Options covers music, effects, fullscreen, animations, and confirm-before-play.

API endpoints (method, path, what each does):

- GET `/api/health` — server plus deck count check.
- GET `/api/settings` — read saved settings, or null on first run.
- PUT `/api/settings` — save settings, answers 204 with an empty body.
- POST `/api/matches` — save a finished match, answers 201 with the saved row.
- GET `/api/matches` — recent matches with deck names, newest first.
- GET `/api/decks` — all saved decks, newest first.
- PUT `/api/decks/:name` — create or replace the named deck.
- DELETE `/api/decks/:name` — delete the named deck, 404 when missing.
- GET `/api/stats` — per-side and per-deck win rates.

## 5. Project structure

- `src/screens/` — MainMenu, DeckBuilder, Collection, GameBoard, Options.
- `src/components/` — cards, deck panels, game rows, filters, UI atoms.
- `src/data/` — catalog, leaders, factions, origins, balance bands, tests.
- `src/game/` — rules, opponent logic, leader effects.
- `src/api/` — client with JSON headers and an 8s timeout.
- `src/styles/` — base, game, cards-filters-deck, music-player.
- `server/` — Express app, Postgres pool with auto-created tables, tests.
- `api/` — Vercel adapter for hosted deploys.
- `public/images/cards/` — card artwork.

## 6. Screenshots

See the `screenshots/` folder.

![Main menu](screenshots/1_Main_Menu.png)
![Deck builder](screenshots/2_Deck_Builder.png)
![Battle board](screenshots/3_Battle_Board.png)
![Card collection](screenshots/4_Card_Collection.png)
![Options](screenshots/5_Options.png)

## 7. Known issues and next steps

- The test suite sits at 122 passing with 4 known catalog failures. They are tracked, not hidden.
- Phone layouts are rough. Desktop at 1024px and up is the real target, and small screens are devtools-verified only.
- There is no seed data by design. Cards ship in code, so player data (decks, matches, settings) is the only thing the database holds.
- Next: full-trip save verification from the GameBoard screen through `POST /api/matches` with read-back on screen.
