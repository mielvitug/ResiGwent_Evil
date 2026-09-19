# Weekly Increment Report

## Week of: Aug 24-30 (Week 1)
### What changed this week

- [Aug 23-24] - Interface. Set up the Vite + React scaffold and the shell every screen shares: `ScreenShell` with eyebrow, title, and back control, plus `Button` with primary/secondary variants. Built the main menu around four operations - Play Game, Deck Builder, Collection, Options - each with a numbered slot and a muted subcaption.
- [Aug 24] - Counterforce leaders. Added `leaders.js`: Leon across three eras (R.P.D., D.S.O. Agent, U.S. Federal Agent), Jill, Chris, and Wesker, each with a version, ability, description, and artwork slot. Every leader pinned to an entry from `re1` through `re9-requiem`. Validation rejects any leader pointing at an unknown entry.
- [Aug 24] - Counterforce units and data. Added the unit cards in `catalog.js` with rarity, power, row, and effects, plus the Deck Builder with deck limits 3-25. The structure follows Gwent: three combat rows, round-based play with passing, and deck-building under rarity limits. Abilities carry verbatim character quotes ("WITNESS THE POWER!", "Where's everybody going? Bingo?"), and `loreAffiliation` notes mark where canon bends for gameplay. Validation and search queries went in with the data rather than after, so a bad entry fails loudly at once.
- [Aug 24] - Tiles before artwork. Built `CardTile`, `CardGrid`, `CardDetail`, and `LeaderTile`, with `SearchBar` and `FilterControl` serving both Deck and Collection. No card images yet, so tiles rendered the initials fallback. The tile anatomy was fixed here and never changed after: art region up top, power pill top-right, IN DECK label top-left, then meta, rarity pill, origin plus type, name, and ability.
- [Aug 24] - Game. Implemented the rules engine, rows (Melee / Ranged / Siege), opponent logic, leader effects, mulligan and result overlays, and the GameBoard screen. Rarity value bands went into `balance.js` (common 2-10 through legendary 8-13).
- [Aug 24] - Support. Added the settings store, match log, audio engine, and error boundary, so the week ended with a game that runs start to finish without a server.

### Why

Playable core first. Get the whole game working locally before any backend or polish.

- Every screen opens from the menu, so a player can reach the whole game with no dead ends.
- A full match (draw cards, play rounds, decide a winner) runs on one machine with no server, so everything later builds on something real instead of promises.

### What broke or what I got stuck on

- Leader and unit entries had to agree exactly (entry ids, origin groups, card types) or validation rejected the card.
- Early ability text mixed quotes and mechanics with no consistent rule for which part gets emphasized.

### What is left

- Stylesheet polish.
- Backend persistence.
- Final card wiring.

---
---
---

## Week of: Aug 31-Sep 6 (Week 2)
### What changed this week

- [Aug 31] - Styling. Added the four stylesheets (base, game, cards-filters-deck, music-player) plus the `Icon` set, so buttons, tiles, rows, and overlays finally shared one visual language. `AbilityText` followed on Sep 3 with quote-plus-title segmentation: the leading quote stays muted, every `Title:` bolds in the card's rarity tint.
- [Aug 25-27] - Card artwork. Images landed across three days, file by file, and each one needed an exact path match before its tile swapped from initials to art.
- [Sep 5-6] - Menu art. Added the menu art manifest with the collage treatment.
- [Sep 6] - Characters and mutations. Added Federal Leon, Neptune, Yawn, Duke/Merchant duals, T-501, and the HUNK combat style, alongside Luis Serra, Robert Kendo, Ethan Winters, and Ada Wong, plus leader kits including the Wesker pulse, Jill railgun, and Zeno decay. The evolution mechanics went in with them: staged forms over time, trigger-on-weaken mutations, and entry effects that fire on mutation.
- [Sep 6] - Backend routes and queries. Built the Express + PostgreSQL layer with 9 routes: `/api/health`, settings GET/PUT, matches POST/GET, decks GET/PUT/DELETE, and `/api/stats`. `POST /api/matches` returns 201 with the saved row. The stats query aggregates per-side win rates with `COUNT(*) FILTER`. Validation rejects bad payloads with 400s before any query runs.
- [Sep 6] - Deployment and client. Added the Vercel adapter, a self-skipping test suite, `.env` handling (local file ignored, example committed), and a client with JSON headers and an 8s timeout.

### Why

The game worked, and now it had to save. Reloads keep your data, and hosted acts like local.

- Finished matches, saved decks, and settings live in a database, so closing the browser no longer wipes them.
- The hosted copy behaves exactly like the local one, so testing at home means testing the real thing.

### What broke or what I got stuck on

- Startup crash on a missing `DATABASE_URL`. Looked like broken queries. Turned out to be connection setup. Fixed by separating the local `.env` from the server environment variables.
- Card artwork volume: dozens of files needing consistent naming and paths before tiles would swap from initials to art.
- `PUT /api/settings` returns 204 with an empty body, first read as a failure. Empty can mean success.

### What is left

- Final card wiring (Mia, Sherry, Tyrell).
- Production build verification.

---
---
---

## Week of: Sep 7-13 (Week 3)
### What changed this week

- [Sep 11] - Final cards. Wired Mia Winters, Sherry Birkin, and Tyrell Patrick into the catalog with artwork, rarities, and abilities, each passing validation like every card before them.
- [Sep 11] - Production build. Ran and verified the build end to end, walking the `dist/` output file by file to confirm every image, route fallback, and bundle landed where the app expects them.

### Why

Finishing the card set and proving the shipped build, so nothing was left half-done.

- Every planned card exists in the catalog with art, stats, and abilities, all passing validation.
- The production build compiles with every image and file in place, so the shipped game is the tested game.

### What broke or what I got stuck on

Lighter week with no major breakage. The one real task, the build review, got a slow file-by-file pass instead of a skim.

### What is left

- Playtesting and balance review.
- Late-card ability checks against `balance.js` bands.

---
---
---

## Week of: Sep 14-18 (Week 4)
### What changed this week

- [Sep 17] - Component API review. Tabulated every reusable component with its level, screens, and props (Button variant/size/label-children through Toggle/Slider with gold percent output), confirming each prop name against source.
- [Sep 17] - Tile anatomy check. Re-verified the `CardTile` render order against `CardTile.jsx`: portrait art with gold inner frame, power pill top-right, IN DECK label top-left, then meta, rarity pill, origin plus type, name, and ability. Specimen: Leon R.P.D, power 6, rare, Ranged.

### Why

Slow double-checking. Every value and prop name read back against the source before submission.

- Every value and prop name read back against the actual source files, so nothing stated drifts from the code.
- Each reusable component checked prop by prop, so future screens can trust the list.

### What broke or what I got stuck on

- Confirming every reusable component's prop names against source took a full checking pass before anything was finalized.

### What is left

- Final polish on tile details and spacing scale.
- Full-trip save check (GameBoard to matches table and back).

---
---
---

## Week of: Sep 19 (Week 5)
### What changed this week

- Finalized access-check wording to PASS pills and corrected legend wording to per organization, matching `MAX_LEGENDARIES_PER_ORGANIZATION`.
- Gave the colour token list one swatch per token so hexes read at a glance.
- Realigned the spacing-scale bars to a shared start edge by right-aligning the label column.
- Standardized 18 text labels to plain coordinates for consistent alignment.

### Why

Last pass. Wording matched to the code, with everything lined up and easy to read.

- Access states read PASS and limits read per organization, exactly as the code names them.
- Rarity bands and deck limits (3-25, max 6 per organization) match `balance.js` and the Deck Builder.

### What broke or what I got stuck on

- Spacing-bar labels left-aligned at varying widths made the bar starts look ragged. Fixed with a right-aligned label column.
- Tile body text washed out on the dark surface in preview. Secondary notes came up one shade. Quotes stayed muted per the AbilityText rule.

### What is left

Final-project full trip: a finished match saving from the GameBoard screen through `POST /api/matches` and reading back on screen.
