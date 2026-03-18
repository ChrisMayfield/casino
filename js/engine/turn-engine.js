import { LOG_LEVELS } from "../utils/constants.js";
import {
  addLog,
  allHandsEmpty,
  getCurrentPlayer,
  getTeamById,
} from "../state/game-state.js";
import {
  applyLostCardPenalties,
  applySpecialHandBonuses,
  finalizeGameScoring,
} from "./scoring-engine.js";

function flipRemainingCardsToTable(state) {
  const remaining = state.deckPool.remaining();
  if (remaining <= 0) {
    return [];
  }

  const flipped = state.deckPool.drawMany(remaining);
  for (const card of flipped) {
    state.table.looseCards.push(card);
  }

  return flipped;
}

export function dealRound(state) {
  const remaining = state.deckPool.remaining();
  if (remaining <= 0) {
    return {
      dealtPerPlayer: 0,
      flippedCount: 0,
    };
  }

  const playerCount = state.players.length;
  const fullRoundsAvailable = Math.floor(remaining / playerCount);
  const dealtPerPlayer = fullRoundsAvailable >= 4 ? 4 : Math.min(fullRoundsAvailable, 3);

  if (dealtPerPlayer <= 0) {
    const flipped = flipRemainingCardsToTable(state);
    addLog(
      state,
      `No complete final deal possible. Flipped ${flipped.length} cards to table.`,
      LOG_LEVELS.warn,
    );

    return {
      dealtPerPlayer: 0,
      flippedCount: flipped.length,
    };
  }

  for (const player of state.players) {
    const drawn = state.deckPool.drawMany(dealtPerPlayer);
    player.hand.push(...drawn);
  }

  state.roundNumber += 1;
  state.firstTurnOfRound = true;
  state.roundStarterPlayerIndex = state.currentPlayerIndex;

  addLog(
    state,
    `Round ${state.roundNumber}: each player drew ${dealtPerPlayer} card${
      dealtPerPlayer === 1 ? "" : "s"
    }.`,
    LOG_LEVELS.info,
  );

  applySpecialHandBonuses(state, dealtPerPlayer);

  const leftover = state.deckPool.remaining();
  let flippedCount = 0;

  if (leftover > 0 && leftover < playerCount) {
    const flipped = state.deckPool.drawMany(leftover);
    flippedCount = flipped.length;

    for (const card of flipped) {
      state.table.looseCards.push(card);
    }

    addLog(
      state,
      `Final-round remainder: flipped ${flipped.length} extra card${
        flipped.length === 1 ? "" : "s"
      } to the table.`,
      LOG_LEVELS.warn,
    );
  }

  return {
    dealtPerPlayer,
    flippedCount,
  };
}

function captureTableRemainderToLastCaptor(state) {
  if (state.lastCapturingTeamId === null || state.lastCapturingTeamId === undefined) {
    return;
  }

  const loose = [...state.table.looseCards];
  const buildCards = state.table.builds.flatMap((build) => build.cards);
  const allRemainderCards = [...loose, ...buildCards];

  if (allRemainderCards.length === 0) {
    return;
  }

  state.table.looseCards = [];
  state.table.builds = [];

  const team = getTeamById(state, state.lastCapturingTeamId);
  team.capturedCards.push(...allRemainderCards);
  applyLostCardPenalties(state, team.id, allRemainderCards);

  addLog(
    state,
    `${team.name} collected ${allRemainderCards.length} remaining table cards as last captor.`,
    LOG_LEVELS.info,
  );
}

export function finishGame(state) {
  if (state.phase === "game-over") {
    return;
  }

  captureTableRemainderToLastCaptor(state);
  finalizeGameScoring(state);
  state.phase = "game-over";

  addLog(state, "Game finished and scores finalized.", LOG_LEVELS.success);
}

export function startGame(state) {
  if (state.phase !== "setup") {
    return;
  }

  state.phase = "playing";
  dealRound(state);

  const currentPlayer = getCurrentPlayer(state);
  addLog(state, `${currentPlayer.name} has the opening turn.`, LOG_LEVELS.info);

  if (allHandsEmpty(state) && state.deckPool.remaining() === 0) {
    finishGame(state);
  }
}

export function advanceTurn(state) {
  if (state.phase !== "playing") {
    return;
  }

  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.turnNumber += 1;

  if (!allHandsEmpty(state)) {
    return;
  }

  if (state.deckPool.remaining() > 0) {
    const dealOutcome = dealRound(state);
    if (dealOutcome.dealtPerPlayer <= 0 && state.deckPool.remaining() === 0) {
      finishGame(state);
    }
    return;
  }

  finishGame(state);
}
