# AI Usage

## The split

About 70 percent AI assisted, about 30 percent written by me. My share is the game content and the rules behind it. Every card and leader in `src/data/catalog.js` and `src/data/leaders.js`, the artwork pairings, the leader kits in `src/game/leaderEffects.js`, and the validation rules in `src/data/catalogValidation.js`. I can walk through any of it and explain the choices. The log below shows where AI help went.

## 1. How I used AI

*Note: the project was not on GitHub yet in August. All August work happened locally and was uploaded on Sep 6 as one squashed initial commit ([`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)), so the five August entries share that single commit. September onward, entries link individually.*

Week 1, Aug 24 to Aug 30.
- 2026-08-24, with Claude, scaffolded ScreenShell and Button, kept structure and reworked props by hand. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)
- 2026-08-26, with Codex, drafted GameBoard layout and three rows, kept layout and rewrote scoring calls. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)
- 2026-08-27, with Gemini, debugged the empty Button label, found the wrong prop name and fixed it myself. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)
- 2026-08-28, with Claude, drafted the rules engine structure, kept round flow and wrote card effects myself. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)
- 2026-08-30, with Claude, reviewed mulligan and result screens, kept screens and fixed state handling myself. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)

Week 2, Aug 31 to Sep 6.
- 2026-09-02, with Codex, drafted backend routes, kept route shapes and wrote error handling myself. Commit: [`bfb271b`](https://github.com/mielvitug/ResiGwent_Evil/commit/bfb271b)
- 2026-09-04, with Gemini, wired deck persistence, kept wiring and set the loud failure rule myself. Commit: [`3453658`](https://github.com/mielvitug/ResiGwent_Evil/commit/3453658)

Week 3, Sep 7 to Sep 13.
- 2026-09-07, with Claude, drafted CardTile and CardDetail, kept layout and wrote the ability split myself. Commit: [`74db13a`](https://github.com/mielvitug/ResiGwent_Evil/commit/74db13a)
- 2026-09-09, with Codex, worked through quote versus effect styling, kept muted quotes and assigned rarity colors myself. Commit: [`3b01f0e`](https://github.com/mielvitug/ResiGwent_Evil/commit/3b01f0e)
- 2026-09-12, with Claude, drafted test suites, kept cases matching real bugs and deleted the empty ones. Commit: [`7e82f05`](https://github.com/mielvitug/ResiGwent_Evil/commit/7e82f05)

Week 4, Sep 14 to Sep 18.
- 2026-09-16, with Gemini, wired settings and audio, kept stores and tuned volumes myself. Commit: [`3453658`](https://github.com/mielvitug/ResiGwent_Evil/commit/3453658)

Week 5, Sep 19.
- 2026-09-18, with Claude, reviewed README structure and screenshots, kept order and wrote every word myself. Commit: [`74db13a`](https://github.com/mielvitug/ResiGwent_Evil/commit/74db13a)

Week 6, Oct 1.
- 2026-10-01, with Codex, polished the main-menu collage and trimmed the Deck Builder, kept the dark pill plus frame and removed the Card Type filter myself because the Collection already covers it. Commit: [`3c8a7eb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3c8a7eb)
- 2026-10-01, with Codex, added two music tracks with autoplay and lowered the default volume to 30 percent, kept the track choices and set the quieter default myself. Commit: [`3c8a7eb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3c8a7eb), [`747e4c8`](https://github.com/mielvitug/ResiGwent_Evil/commit/747e4c8)
- 2026-10-01, with Codex, synced the mini-player volume slider with the Options slider through the engine broadcast, extended the existing notify channel with volume and added persistence myself so either slider survives reload. Commit: [`728819a`](https://github.com/mielvitug/ResiGwent_Evil/commit/728819a)

## 2. Where the AI got it wrong

*Note: these three catches happened during local work before the project reached GitHub, and landed in the Sep 6 squashed initial commit ([`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)), same as the August log entries above.*

1. Krauser's wrong story group crashed the whole app.
- AI gave: Krauser `originGroupId: 'los-iluminados'`, which is an organization, not an origin group.
- Wrong: catalog validation threw `Invalid catalog` and the app could not reach the main menu at all.
- Instead: I reported the crash and the origin was corrected to `'las-plagas'`.
- Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)

2. Krauser was missing his Los Iluminados label.
- AI gave: Krauser with `factionId: 'bioterrorism'` but no Los Iluminados organization tag.
- Wrong: Bioterrorism is correct as his faction, but without the organization label he never sorted into the Los Iluminados deck where he belongs.
- Instead: I labeled him `los-iluminados` at the organization level and left the Bioterrorism faction alone.
- Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)

3. One repeated image line hid every other leader's portrait.
- AI gave: Gideon's leader entry with `artwork` twice (empty early, filename at the end; the last key silently wins).
- Wrong: only Gideon showed an image while every other bioterrorism leader showed placeholders, and the cause was invisible at a glance.
- Instead: I had the leaders file rewritten with one end-placed `artwork` key per entry and verified the duplication was gone.
- Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)

4. The saved volume kept beating the new default.
- AI gave: a volume default lowered to 30 percent in code, while browsers kept playing 70 percent.
- Wrong: saved settings outrank code defaults, so the new default never reached existing browsers, and the mini-player slider never saved at all, resetting every reload.
- Instead: I traced the three settings layers, synced both sliders through the engine broadcast, and made either slider persist, so the last touch wins everywhere.
- Commits: [`747e4c8`](https://github.com/mielvitug/ResiGwent_Evil/commit/747e4c8), [`728819a`](https://github.com/mielvitug/ResiGwent_Evil/commit/728819a)

## 3. Who wrote what

### My Own Work

1. Card names, quotes, abilities, and artwork pairings (`src/data/catalog.js`, `src/data/leaders.js`, `public/images/cards/`). Every card's title, flavor quote, ability, and image was chosen and matched by me, both what the card says and what it does on the board, so the card you read is the character you recognize. New faces arrived in batches as I found the right art: Mia, Sherry, and Tyrell, then Neptune and Yawn, then the HUNK and railgun Jill pieces. Commits: [`74db13a`](https://github.com/mielvitug/ResiGwent_Evil/commit/74db13a), [`8164b3c`](https://github.com/mielvitug/ResiGwent_Evil/commit/8164b3c), [`3b01f0e`](https://github.com/mielvitug/ResiGwent_Evil/commit/3b01f0e)

2. Validation that rejects bad data (`src/data/catalogValidation.js`). A deck slot once showed empty from a data typo, so I wrote rules rejecting any card whose game, group, type, or id mismatches the master lists. Bad data fails loudly at load instead of blank tiles at midnight. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)

3. Leader kits (`src/game/leaderEffects.js`, `src/data/leaders.js`). I designed how all 17 leaders play on the battle board: most boost or weaken rows, but the special ones break the mold, Federal Leon cleansing allied debuffs, Eveline seizing enemy cards, Gideon advancing allied evolutions, Birkin and HUNK deploying allies onto the board. Leaders support, units score, my design rule. The AI implemented the table from my kits. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)

### Best-understood AI-written piece

The AI wrote CardTile, the shared card tile (`src/components/cards/CardTile.jsx`). Every card you see in the game is this one tile. Art on top, or the card initials when there is no art yet. Then power, the rarity pill, origin and type, the name, and the ability text. The Deck Builder, the Collection, and the GameBoard all use it, so one fix there reaches all three screens. The pill color tells you the rarity at a glance, which is how you spot a legendary without reading a word. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)

## Statement

At least 30 percent of this codebase is work I did myself, listed above with file paths: the card data, leaders, artwork pairings, leader kits, and validation rules, plus all hand-edited card names, quotes, and ability text. I can explain any of it, including the choices and the bugs behind it. The assisted work above was directed, reviewed, and tested by me.
