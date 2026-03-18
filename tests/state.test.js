import test from "node:test";
import assert from "node:assert/strict";

import { createGameState, createMatchState, recordCompletedGame } from "../js/state/game-state.js";

function applyMockResults(gameState, pointsByTeam) {
  for (const team of gameState.teams) {
    team.points = pointsByTeam[team.id] ?? team.points;
  }
  gameState.winnerTeamIds = [
    Number(
      Object.entries(pointsByTeam).sort((left, right) => right[1] - left[1])[0][0],
    ),
  ];
}

test("match state supports six players as three teams", () => {
  const match = createMatchState({ playerCount: 6, seed: "state-six" });

  assert.equal(match.playerCount, 6);
  assert.equal(match.teamCount, 3);
  assert.equal(match.totalGames, 3);
});

test("game state rotates starting player after first game", () => {
  const match = createMatchState({ playerCount: 4, seed: "rotation" });

  const game1 = createGameState(match, 1);
  const firstStarter = game1.startingPlayerIndex;

  applyMockResults(game1, { 0: 40, 1: 33 });
  recordCompletedGame(match, game1);

  const game2 = createGameState(match, 2);
  const game3 = createGameState(match, 3);

  assert.equal(game2.startingPlayerIndex, (firstStarter + 1) % 4);
  assert.equal(game3.startingPlayerIndex, (firstStarter + 2) % 4);
});
