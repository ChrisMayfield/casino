## Plan: Vanilla JS Casino Game

Build a browser-based, pass-and-play vanilla JavaScript implementation of Casino with full README rules in v1 by separating domain state, rule validation, scoring, and UI rendering. Handle ambiguous rules through explicit assumptions documented beside the app rules, then enforce those assumptions consistently through a central rules engine.

**Steps**
1. Phase 1: Rule Baseline and Assumptions (*blocks all later phases*)
2. Extract every explicit rule from `/home/mayfiecs/GitHub/ChrisMayfield/casino/README.md` into a normalized rules checklist grouped by setup, turn actions, builds/freezes, penalties, bonuses, and endgame.
3. Define assumption entries for each ambiguous case (timing of special-hand bonuses, build freeze ownership behavior, first-player penalty trigger semantics, final-round remainder dealing, rook wild declaration lifetime), with one chosen behavior per case and rationale.
4. Add a human-readable assumptions/rules supplement to ship with the app so players can verify house-rule choices.
5. Phase 2: Project Skeleton and Core Models (*depends on Phase 1*)
6. Create static browser app structure (HTML/CSS/JS modules) and initialize app bootstrap and state container.
7. Implement core model modules: Card, DeckPool (multi-deck), Player, Team, BuildPile, GameState, MatchState.
8. Implement deterministic setup flow: team assignment (2-6 players), teammate seating abstraction, deck count = team count, shuffled draw pile, starting-player draw-off with tie-break loops.
9. Phase 3: Rules Engine for Legal Moves (*depends on Phase 2*)
10. Implement move intent types: capture, build, add-to-build, freeze, refreeze, table-play.
11. Implement capture validation and resolution for exact-match and sum combinations, including multi-target captures where legal.
12. Implement build lifecycle state machine: open build, team-owned build, frozen-by-opponent, refrozen state transitions, and legal captor determination.
13. Implement round-level illegal-move prevention with actionable UI feedback instead of allowing invalid state transitions.
14. Phase 4: Turn/Round Controller (*depends on Phase 3*)
15. Implement per-round dealing (4 cards each) and final-round remainder logic (1-3 cards each + leftover face-up table cards) per chosen assumptions.
16. Enforce one-card-per-turn and clockwise progression, while allowing a single played card to execute the chosen legal action type.
17. Implement first-player-in-round penalty hook when table-play action is chosen under configured condition.
18. Track captured cards face-up by team and table history needed for downstream scoring and lost-card penalties.
19. Phase 5: Scoring and Economy Engine (*parallel with late Phase 4 once capture logs exist*)
20. Implement intrinsic card-value scoring (red 10, black 2, black cards, rook cards, others zero).
21. Implement penalty transfers: first-player round penalty, black-2/red-10/rook loss penalties to captor team.
22. Implement bonus scoring: sweeps, same-color hand, same-number hand with rook declaration, poverty tiers, and most-cards differential bonus at game end.
23. Implement chip accounting abstraction (white=1, red=10, blue=50), with ledger-style transfers between teams and bank.
24. Phase 6: UI/UX and Interaction Layer (*depends on Phases 3-5*)
25. Build board UI regions: draw pile, table cards/builds, current hand, team capture piles, score/chip ledger, turn status, action composer.
26. Implement interaction flow for composing legal moves (select card, select table/build targets, choose action), including clear validation errors and confirmation prompts where ambiguity risk is high.
27. Add visual state markers for builds (owner/frozen/refrozen) and sweep/penalty events.
28. Ensure responsive behavior for desktop and mobile while preserving readability for up to 6 players in pass-and-play.
29. Phase 7: Match Mode and Persistence (*depends on Phase 6*)
30. Implement multi-game match play: total games based on player count convention, rotating starting player clockwise, cumulative team scoring.
31. Implement new game / new match reset behavior without stale state leakage.
32. Optional lightweight persistence (localStorage) for in-progress match recovery.
33. Phase 8: Verification and Hardening (*parallelizable test writing after each prior phase; final pass depends on all phases*)
34. Build rule-focused automated tests (Node built-in test runner or browser harness) for capture combos, build/freeze transitions, penalty triggers, and bonus calculations.
35. Add deterministic fixture scenarios mirroring README examples and edge-case scenarios for ties, final-round leftovers, and multi-team scoring.
36. Run exploratory manual QA scripts for 2/4/6-player games and confirm no illegal move can mutate state.
37. Perform regression pass on score reconciliation (sum of transfers + bank adjustments) to catch accounting drift.

**Relevant files**
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/README.md` - source-of-truth rules to normalize and trace to tests
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/README-RULE-ASSUMPTIONS.md` (new) - explicit choices for ambiguous rules and examples
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/index.html` (new) - application shell and board regions
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/css/base.css` (new) - tokens, layout primitives, responsive rules
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/css/components.css` (new) - card/build/table/chip components
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/js/main.js` (new) - app bootstrap, event wiring, top-level orchestration
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/js/state/game-state.js` (new) - canonical mutable game state
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/js/models/card.js` (new) - card representation and helpers
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/js/models/deck-pool.js` (new) - multi-deck creation and shuffle/draw
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/js/engine/rules-engine.js` (new) - legal move validation + resolution
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/js/engine/turn-engine.js` (new) - turn/round progression and dealing
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/js/engine/scoring-engine.js` (new) - points, penalties, bonuses, chip transfers
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/js/ui/render-board.js` (new) - board rendering and UI state syncing
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/js/ui/action-controller.js` (new) - action composition and input handling
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/tests/rules.test.js` (new) - move legality and state-transition tests
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/tests/scoring.test.js` (new) - scoring/penalty/bonus correctness tests
- `/home/mayfiecs/GitHub/ChrisMayfield/casino/tests/fixtures/` (new) - deterministic scenarios and expected outcomes

**Verification**
1. Static verification: confirm every README rule has a trace entry to either rules-engine logic or documented assumption.
2. Automated tests: run the rules and scoring suites; require passing tests for 2, 4, and 6-player fixtures.
3. Integration simulation: execute scripted full-round simulations to verify no dead turns and legal action availability each turn.
4. Manual QA: play at least one full game each for 2, 4, and 6 players in pass-and-play mode and validate expected penalties/bonuses.
5. Accounting audit: verify net chip movement equals sum of bank transfers and team-to-team penalties for each game.
6. Match-mode validation: run multi-game rotation and confirm starter shifts correctly and cumulative totals match per-game summaries.

**Decisions**
- Platform: browser-based local multiplayer pass-and-play.
- Scope: full README rules included in v1.
- Supported player counts in v1: 2 through 6.
- Ambiguity handling: implement explicit assumptions and document them publicly in the app repository.
- Included: game logic, scoring/chips, match mode, responsive UI, automated rule/scoring tests.
- Excluded: network multiplayer, AI players, account/login systems, backend services.

**Further Considerations**
1. Prefer deterministic PRNG seed option for reproducible debugging and easier issue reports.
2. Add an optional "show legal moves" helper overlay after baseline correctness is stable to reduce user errors in complex build/freeze states.
3. If rule disputes arise in playtesting, add assumption toggles in a configuration panel without changing engine defaults.
