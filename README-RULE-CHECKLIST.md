# Casino Rule Checklist

This checklist maps README.md gameplay requirements to implementation modules.

## Setup and Players

- [x] 2 to 6 players supported.
- [x] Teams modeled with across-the-table pairing for even counts.
- [x] Deck count equals team count.
- [x] Combined multi-deck draw pile with deterministic shuffle option.
- [x] Opening draw-off with tie-break redraw loops.
- [x] Match-mode starting-player rotation after game 1.

Implementation:
- js/state/game-state.js
- js/models/deck-pool.js

## Turn and Round Flow

- [x] Standard deal: 4 cards per player.
- [x] Final reduced deal: 1 to 3 cards per player when insufficient for full 4.
- [x] Remaining cards turned face-up to table in final deal.
- [x] One-card turn actions with clockwise progression.
- [x] End-game trigger when draw pile empty and hands empty.

Implementation:
- js/engine/turn-engine.js
- js/main.js

## Move Types

- [x] Capture loose cards by value combinations.
- [x] Capture builds with equal declared total.
- [x] Create build from played card + loose cards with declared total.
- [x] Add to own controlling build while preserving declared total.
- [x] Freeze opposing build and transfer capture rights.
- [x] Refreeze back to original owner team.
- [x] Table-play action.

Implementation:
- js/engine/rules-engine.js

## Penalties and Bonuses

- [x] First-turn table-play penalty to each opponent based on table size.
- [x] Lost-card penalties for black 2, red 10, and rook.
- [x] Sweep bonus paid by each opponent.
- [x] Special hand bonuses after 4-card deal: same color and same number.
- [x] Poverty bonuses by threshold.
- [x] Rook declaration constraint for same-number bonus usage.
- [x] Captured card point values.
- [x] Most-cards differential bonus at game end.

Implementation:
- js/engine/scoring-engine.js
- js/engine/rules-engine.js

## Match and UI

- [x] Multi-game match state with cumulative team scoring.
- [x] Game board includes table, builds, hand, action composer, scores, and log.
- [x] Assumptions are displayed in UI and documented separately.

Implementation:
- js/state/game-state.js
- js/main.js
- js/ui/render-board.js
- README-RULE-ASSUMPTIONS.md

## Tests

- [x] Rules engine tests for capture, freeze, and first-turn penalty.
- [x] Scoring tests for special-hand bonuses, lost-card penalties, and final scoring.
- [x] State tests for player/team setup and match rotation.

Implementation:
- tests/rules.test.js
- tests/scoring.test.js
- tests/state.test.js
