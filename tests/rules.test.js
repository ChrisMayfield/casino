import test from "node:test";
import assert from "node:assert/strict";

import { createCard } from "../js/models/card.js";
import { applyMove } from "../js/engine/rules-engine.js";

function makeTeam(id) {
  return {
    id,
    name: `Team ${id + 1}`,
    points: 30,
    capturedCards: [],
    ledger: [],
  };
}

function makePlayer({ id, seat, teamId, hand }) {
  return {
    id,
    name: `Player ${id.slice(1)}`,
    seat,
    teamId,
    hand,
    pendingRookDeclarations: {},
  };
}

function makeBaseState({ players, tableLooseCards = [], builds = [] }) {
  return {
    phase: "playing",
    players,
    teams: [makeTeam(0), makeTeam(1)],
    table: {
      looseCards: tableLooseCards,
      builds,
    },
    currentPlayerIndex: 0,
    roundNumber: 1,
    turnNumber: 1,
    firstTurnOfRound: false,
    nextBuildId: 2,
    logs: [],
    actionHistory: [],
    lastCapturingTeamId: null,
  };
}

test("capture action supports sum combinations", () => {
  const handCard = createCard({ deckIndex: 1, suit: "hearts", rank: 7 });
  const tableA = createCard({ deckIndex: 1, suit: "clubs", rank: 3 });
  const tableB = createCard({ deckIndex: 1, suit: "diamonds", rank: 4 });

  const state = makeBaseState({
    players: [
      makePlayer({ id: "P1", seat: 0, teamId: 0, hand: [handCard] }),
      makePlayer({ id: "P2", seat: 1, teamId: 1, hand: [] }),
    ],
    tableLooseCards: [tableA, tableB],
  });

  const result = applyMove(state, {
    actionType: "capture",
    cardId: handCard.id,
    targetCardIds: [tableA.id, tableB.id],
    targetBuildIds: [],
  });

  assert.equal(result.ok, true);
  assert.equal(state.table.looseCards.length, 0);
  assert.equal(state.teams[0].capturedCards.length, 3);
  assert.equal(state.lastCapturingTeamId, 0);
});

test("freeze transfers build capture rights", () => {
  const freezeCard = createCard({ deckIndex: 1, suit: "clubs", rank: 3 });
  const keepEight = createCard({ deckIndex: 1, suit: "spades", rank: 8 });
  const looseFive = createCard({ deckIndex: 1, suit: "diamonds", rank: 5 });

  const existingBuildCard = createCard({ deckIndex: 1, suit: "hearts", rank: 8 });
  existingBuildCard.playedByTeamId = 0;

  const build = {
    id: "B1",
    total: 8,
    cards: [existingBuildCard],
    originalOwnerTeamId: 0,
    captureTeamId: 0,
    history: [{ action: "build", teamId: 0 }],
  };

  const state = makeBaseState({
    players: [
      makePlayer({ id: "P2", seat: 0, teamId: 1, hand: [freezeCard, keepEight] }),
      makePlayer({ id: "P1", seat: 1, teamId: 0, hand: [] }),
    ],
    tableLooseCards: [looseFive],
    builds: [build],
  });

  const result = applyMove(state, {
    actionType: "freeze",
    cardId: freezeCard.id,
    targetBuildId: "B1",
    targetCardIds: [looseFive.id],
    targetBuildIds: [],
  });

  assert.equal(result.ok, true);
  assert.equal(state.table.builds[0].captureTeamId, 1);
  assert.equal(state.table.builds[0].cards.length, 3);
  assert.equal(state.table.looseCards.length, 0);
});

test("first-turn table play penalty charges payer by table card count", () => {
  const tablePlayCard = createCard({ deckIndex: 1, suit: "hearts", rank: 6 });
  const looseA = createCard({ deckIndex: 1, suit: "spades", rank: 4 });
  const looseB = createCard({ deckIndex: 1, suit: "diamonds", rank: 9 });

  const state = makeBaseState({
    players: [
      makePlayer({ id: "P1", seat: 0, teamId: 0, hand: [tablePlayCard] }),
      makePlayer({ id: "P2", seat: 1, teamId: 1, hand: [] }),
    ],
    tableLooseCards: [looseA, looseB],
  });

  state.firstTurnOfRound = true;

  const result = applyMove(state, {
    actionType: "table",
    cardId: tablePlayCard.id,
    targetCardIds: [],
    targetBuildIds: [],
  });

  assert.equal(result.ok, true);
  assert.equal(state.teams[0].points, 27);
  assert.equal(state.teams[1].points, 33);
});
