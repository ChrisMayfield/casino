import test from "node:test";
import assert from "node:assert/strict";

import { createCard } from "../js/models/card.js";
import {
  applyLostCardPenalties,
  applySpecialHandBonuses,
  finalizeGameScoring,
} from "../js/engine/scoring-engine.js";

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

function makeState(players) {
  return {
    teams: [makeTeam(0), makeTeam(1)],
    players,
    table: {
      looseCards: [],
      builds: [],
    },
    logs: [],
    turnNumber: 1,
    roundNumber: 1,
    winnerTeamIds: [],
  };
}

test("special hand bonus awards same-color and same-number with rook declaration", () => {
  const cardA = createCard({ deckIndex: 1, suit: "hearts", rank: 5 });
  const cardB = createCard({ deckIndex: 1, suit: "diamonds", rank: 5 });
  const cardC = createCard({ deckIndex: 2, suit: "diamonds", rank: 5 });
  const rook = createCard({ deckIndex: 1, isRook: true });

  const players = [
    makePlayer({ id: "P1", seat: 0, teamId: 0, hand: [cardA, cardB, cardC, rook] }),
    makePlayer({ id: "P2", seat: 1, teamId: 1, hand: [] }),
  ];

  const state = makeState(players);
  applySpecialHandBonuses(state, 4);

  assert.equal(state.teams[0].points, 40);
  assert.equal(players[0].pendingRookDeclarations[rook.id], 5);
});

test("lost-card penalties transfer points to capturing team", () => {
  const blackTwo = createCard({ deckIndex: 1, suit: "clubs", rank: 2 });
  blackTwo.playedByTeamId = 0;

  const state = makeState([
    makePlayer({ id: "P1", seat: 0, teamId: 0, hand: [] }),
    makePlayer({ id: "P2", seat: 1, teamId: 1, hand: [] }),
  ]);

  applyLostCardPenalties(state, 1, [blackTwo]);

  assert.equal(state.teams[0].points, 25);
  assert.equal(state.teams[1].points, 35);
});

test("final scoring applies captured card values and most-cards differential", () => {
  const state = makeState([
    makePlayer({ id: "P1", seat: 0, teamId: 0, hand: [] }),
    makePlayer({ id: "P2", seat: 1, teamId: 1, hand: [] }),
  ]);

  state.teams[0].capturedCards.push(
    createCard({ deckIndex: 1, suit: "clubs", rank: 2 }),
    createCard({ deckIndex: 1, suit: "hearts", rank: 10 }),
    createCard({ deckIndex: 1, suit: "spades", rank: 7 }),
  );
  state.teams[1].capturedCards.push(createCard({ deckIndex: 1, suit: "diamonds", rank: 3 }));

  finalizeGameScoring(state);

  assert.equal(state.teams[0].points, 48);
  assert.equal(state.teams[1].points, 30);
  assert.deepEqual(state.winnerTeamIds, [0]);
});
