# AI Usage

## The split

About 70 percent AI assisted, about 30 percent written by me. My share is the game content and the rules behind it. Every card and leader in `src/data/catalog.js` and `src/data/leaders.js`, the rarity bands and legendary cap in `src/data/balance.js`, and the validation rules in `src/data/catalogValidation.js`. I can walk through any of it and explain the choices. The log below shows where AI help went.

## 1. How I used AI

*Note: August work predates per-feature commits and landed in [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb) (squashed initial commit); September entries link individually.*

Week 1, Aug 24 to Aug 30.
- 2026-08-24, with Claude, scaffolded ScreenShell and Button, kept structure and reworked props by hand. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)
- 2026-08-26, with ChatGPT, drafted GameBoard layout and three rows, kept layout and rewrote scoring calls. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)
- 2026-08-27, with Gemini, debugged the empty Button label, found the wrong prop name and fixed it myself. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)
- 2026-08-28, with Claude, drafted the rules engine structure, kept round flow and wrote card effects myself. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)
- 2026-08-30, with Claude, reviewed mulligan and result screens, kept screens and fixed state handling myself. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)

Week 2, Aug 31 to Sep 6.
- 2026-09-02, with ChatGPT, drafted backend routes, kept route shapes and wrote error handling myself. Commit: [`bfb271b`](https://github.com/mielvitug/ResiGwent_Evil/commit/bfb271b)
- 2026-09-04, with Gemini, wired deck persistence, kept wiring and set the loud failure rule myself. Commit: [`3453658`](https://github.com/mielvitug/ResiGwent_Evil/commit/3453658)

Week 3, Sep 7 to Sep 13.
- 2026-09-07, with Claude, drafted CardTile and CardDetail, kept layout and wrote the ability split myself. Commit: [`74db13a`](https://github.com/mielvitug/ResiGwent_Evil/commit/74db13a)
- 2026-09-09, with ChatGPT, worked through quote versus effect styling, kept muted quotes and assigned rarity colors myself. Commit: [`3b01f0e`](https://github.com/mielvitug/ResiGwent_Evil/commit/3b01f0e)
- 2026-09-12, with Claude, drafted test suites, kept cases matching real bugs and deleted the empty ones. Commit: [`7e82f05`](https://github.com/mielvitug/ResiGwent_Evil/commit/7e82f05)

Week 4, Sep 14 to Sep 18.
- 2026-09-16, with Gemini, wired settings and audio, kept stores and tuned volumes myself. Commit: [`3453658`](https://github.com/mielvitug/ResiGwent_Evil/commit/3453658)

Week 5, Sep 19.
- 2026-09-18, with Claude, reviewed README structure and screenshots, kept order and wrote every word myself. Commit: [`74db13a`](https://github.com/mielvitug/ResiGwent_Evil/commit/74db13a)
- 2026-09-19, with ChatGPT, cleaned up report wording, kept dates and facts and fixed grammar myself. Commit: [`74db13a`](https://github.com/mielvitug/ResiGwent_Evil/commit/74db13a)

## 2. Where the AI got it wrong

1. Invalid origin broke the whole app.
- AI gave: Krauser `originGroupId: 'los-iluminados'`, which is an organization, not an origin group.
- Wrong: catalog validation threw `Invalid catalog` and the app could not reach the main menu at all.
- Instead: I reported the crash and the origin was corrected to `'las-plagas'`.
- Commit: [`74db13a`](https://github.com/mielvitug/ResiGwent_Evil/commit/74db13a)

2. Wrong faction.
- AI gave: Krauser as `factionId: 'bioterrorism'`.
- Wrong: Krauser is Los Iluminados (RE4 Las Plagas storyline), so the card sat in the wrong deck.
- Instead: I corrected it flat-out; faction fixed to `'los-iluminados'`.
- Commit: [`74db13a`](https://github.com/mielvitug/ResiGwent_Evil/commit/74db13a)

3. Duplicate key masking missing art.
- AI gave: Gideon's leader entry with `artwork` twice (empty early, filename at the end; the last key silently wins).
- Wrong: only Gideon showed an image while every other bioterrorism leader showed placeholders, and the cause was invisible at a glance.
- Instead: I had the leaders file rewritten with one end-placed `artwork` key per entry and verified the duplication was gone.
- Commit: [`7e82f05`](https://github.com/mielvitug/ResiGwent_Evil/commit/7e82f05)

## 3. Who wrote what

### My fifth, explained

1. Rarity power bands (`src/data/balance.js`, lines 26 to 31). Common 2 to 10, uncommon 4 to 9, rare 4.5 to 11.5, legendary 8 to 13. Ranges overlap so a strong common can fight a weak legendary, averages climb with rarity. Legendary cap of 6 per organization (line 34) stops top card stacking. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)

2. Federal Leon, cleanse leader (`src/data/leaders.js`, line 7). Removes all debuffs from allied cards. He is the Counterforce support leader, so his kit answers Bioterrorism weaken effects instead of adding points. Leaders support, units score. My design rule. Commit: [`8164b3c`](https://github.com/mielvitug/ResiGwent_Evil/commit/8164b3c)

3. Validation that rejects bad data (`src/data/catalogValidation.js`). A deck slot once showed empty from a data typo, so I wrote rules rejecting any card whose game, group, type, or id mismatches the master lists. Bad data fails loudly at load instead of blank tiles at midnight. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)

### Best-understood AI-written piece

My piece is CardTile, the shared card tile (`src/components/cards/CardTile.jsx`). It draws every card in the game. Art or initials on top, then power, rarity, origin and type, name, and ability text. The same tile is used in the Deck Builder, the Collection, and the GameBoard, so a fix in one place reaches all three screens. Rarity tints the pill, so you can see how strong a card is at a glance. Commit: [`3de6bdb`](https://github.com/mielvitug/ResiGwent_Evil/commit/3de6bdb)

## Statement

At least 30 percent of this codebase is work I did myself, listed above with file paths: the card data, leaders, rarity bands, and validation rules, plus all hand-edited card artwork, names, quotes, and ability text. I can explain any of it, including the choices and the bugs behind it. The assisted work above was directed, reviewed, and tested by me.
