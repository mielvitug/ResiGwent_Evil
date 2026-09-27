# AI Usage

## The split

About three quarters AI assisted, about one quarter written by me. My quarter is the game content and the rules behind it. Every card and leader in `src/data/catalog.js` and `src/data/leaders.js`, the rarity bands and legendary cap in `src/data/balance.js`, and the validation rules in `src/data/catalogValidation.js`. I can walk through any of it and explain the choices. The log below shows where AI help went.

## Usage log

Week 1, Aug 24 to Aug 30.
- 26-08-24, with Claude, scaffolded ScreenShell and Button, kept structure and reworked props by hand.
- 26-08-26, with ChatGPT, drafted GameBoard layout and three rows, kept layout and rewrote scoring calls.
- 26-08-27, with Gemini, debugged the empty Button label, found the wrong prop name and fixed it myself.
- 26-08-28, with Claude, drafted the rules engine structure, kept round flow and wrote card effects myself.
- 26-08-30, with Claude, reviewed mulligan and result screens, kept screens and fixed state handling myself.

Week 2, Aug 31 to Sep 6.
- 26-09-02, with ChatGPT, drafted backend routes, kept route shapes and wrote error handling myself.
- 26-09-04, with Gemini, wired deck persistence, kept wiring and set the loud failure rule myself.

Week 3, Sep 7 to Sep 13.
- 26-09-07, with Claude, drafted CardTile and CardDetail, kept layout and wrote the ability split myself.
- 26-09-09, with ChatGPT, worked through quote versus effect styling, kept muted quotes and assigned rarity colors myself.
- 26-09-12, with Claude, drafted test suites, kept cases matching real bugs and deleted the empty ones.

Week 4, Sep 14 to Sep 18.
- 26-09-16, with Gemini, wired settings and audio, kept stores and tuned volumes myself.

Week 5, Sep 19.
- 26-09-18, with Claude, reviewed README structure and screenshots, kept order and wrote every word myself.
- 26-09-19, with ChatGPT, cleaned up report wording, kept dates and facts and fixed grammar myself.

## My fifth, explained

1. Rarity power bands (`src/data/balance.js`, lines 26 to 31). Common 2 to 10, uncommon 4 to 9, rare 4.5 to 11.5, legendary 8 to 13. Ranges overlap so a strong common can fight a weak legendary, averages climb with rarity. Legendary cap of 6 per organization (line 34) stops top card stacking.

2. Federal Leon, cleanse leader (`src/data/leaders.js`, line 7). Removes all debuffs from allied cards. He is the Counterforce support leader, so his kit answers Bioterrorism weaken effects instead of adding points. Leaders support, units score. My design rule.

3. Validation that rejects bad data (`src/data/catalogValidation.js`). A deck slot once showed empty from a data typo, so I wrote rules rejecting any card whose game, group, type, or id mismatches the master lists. Bad data fails loudly at load instead of blank tiles at midnight.

## Statement

At least one fifth of this codebase is code I wrote myself, listed above with file paths. I can explain any of it, including the choices and the bugs behind it. The assisted work above was directed, reviewed, and tested by me.
