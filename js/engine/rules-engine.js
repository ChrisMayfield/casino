import { getEffectiveCardValue } from "../models/card.js";
import { ACTION_TYPES, LOG_LEVELS, MAX_CARD_VALUE } from "../utils/constants.js";
import { clampCardValue, dedupeIds, sumBy } from "../utils/helpers.js";
import {
  addLog,
  getAllTableCardCount,
  getCurrentPlayer,
  getTeamById,
  removeCardFromPlayerHand,
} from "../state/game-state.js";
import {
  applyFirstTurnTablePenalty,
  applyLostCardPenalties,
  applySweepBonus,
} from "./scoring-engine.js";

function findLooseCardsByIds(state, ids) {
  const idSet = new Set(ids);
  return state.table.looseCards.filter((card) => idSet.has(card.id));
}

function findBuildById(state, buildId) {
  return state.table.builds.find((build) => build.id === buildId);
}

function removeLooseCardsByIds(state, ids) {
  const idSet = new Set(ids);
  const removed = [];
  state.table.looseCards = state.table.looseCards.filter((card) => {
    if (idSet.has(card.id)) {
      removed.push(card);
      return false;
    }
    return true;
  });
  return removed;
}

function removeBuildsByIds(state, buildIds) {
  const idSet = new Set(buildIds);
  const removed = [];
  state.table.builds = state.table.builds.filter((build) => {
    if (idSet.has(build.id)) {
      removed.push(build);
      return false;
    }
    return true;
  });
  return removed;
}

function canPartitionIntoTarget(values, target) {
  if (values.length === 0) {
    return true;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  if (total % target !== 0) {
    return false;
  }

  const sorted = [...values].sort((a, b) => b - a);
  const used = new Array(sorted.length).fill(false);
  const memo = new Map();

  function stateKey(currentSum) {
    return `${used.map((flag) => (flag ? "1" : "0")).join("")}|${currentSum}`;
  }

  function search(currentSum, startIndex) {
    if (used.every(Boolean)) {
      return currentSum === 0;
    }

    const key = stateKey(currentSum);
    if (memo.has(key)) {
      return memo.get(key);
    }

    if (currentSum === 0) {
      for (let index = 0; index < sorted.length; index += 1) {
        if (used[index]) {
          continue;
        }
        used[index] = true;
        const value = sorted[index];
        const success =
          value === target ? search(0, 0) : value < target ? search(value, index + 1) : false;
        used[index] = false;
        memo.set(key, success);
        return success;
      }
      memo.set(key, false);
      return false;
    }

    for (let index = startIndex; index < sorted.length; index += 1) {
      if (used[index]) {
        continue;
      }

      const next = currentSum + sorted[index];
      if (next > target) {
        continue;
      }

      used[index] = true;
      const success = next === target ? search(0, 0) : search(next, index + 1);
      used[index] = false;

      if (success) {
        memo.set(key, true);
        return true;
      }
    }

    memo.set(key, false);
    return false;
  }

  return search(0, 0);
}

function teamPlayers(state, teamId) {
  return state.players.filter((player) => player.teamId === teamId);
}

function cardCanRepresentTotal(card, total, playerContext = null) {
  if (!card.isRook) {
    return card.rank === total;
  }

  if (!playerContext) {
    return total >= 1 && total <= MAX_CARD_VALUE;
  }

  const pending = playerContext.pendingRookDeclarations[card.id];
  if (pending !== undefined) {
    return pending === total;
  }

  return total >= 1 && total <= MAX_CARD_VALUE;
}

function teamHasCaptureCard(state, teamId, total, excluded = {}) {
  const players = teamPlayers(state, teamId);
  for (const player of players) {
    for (const card of player.hand) {
      if (
        excluded.playerId === player.id &&
        excluded.cardId &&
        excluded.cardId === card.id
      ) {
        continue;
      }

      if (cardCanRepresentTotal(card, total, player)) {
        return true;
      }
    }
  }
  return false;
}

function resolvePlayedValue(player, card, rookValue) {
  if (!card.isRook) {
    return {
      ok: true,
      value: card.rank,
    };
  }

  const pending = player.pendingRookDeclarations[card.id];
  const requested = clampCardValue(rookValue ?? pending ?? null);

  if (!requested) {
    return {
      ok: false,
      reason: "Rook requires a declared value between 1 and 14.",
    };
  }

  if (pending !== undefined && requested !== pending) {
    return {
      ok: false,
      reason: `Rook was declared as ${pending} for same-number bonus and must be played as ${pending}.`,
    };
  }

  return {
    ok: true,
    value: requested,
  };
}

function validateCapture(state, context) {
  const targetCardIds = dedupeIds(context.move.targetCardIds ?? []);
  const targetBuildIds = dedupeIds(context.move.targetBuildIds ?? []);

  if (targetCardIds.length === 0 && targetBuildIds.length === 0) {
    return {
      ok: false,
      reason: "Capture requires at least one loose card or build target.",
    };
  }

  const looseCards = findLooseCardsByIds(state, targetCardIds);
  if (looseCards.length !== targetCardIds.length) {
    return {
      ok: false,
      reason: "Some selected loose cards are no longer on the table.",
    };
  }

  const looseValues = looseCards.map((card) => getEffectiveCardValue(card, 1));
  if (!canPartitionIntoTarget(looseValues, context.playedValue)) {
    return {
      ok: false,
      reason: `Selected loose cards cannot be captured with value ${context.playedValue}.`,
    };
  }

  const builds = targetBuildIds.map((buildId) => findBuildById(state, buildId)).filter(Boolean);
  if (builds.length !== targetBuildIds.length) {
    return {
      ok: false,
      reason: "Some selected builds are no longer on the table.",
    };
  }

  for (const build of builds) {
    if (build.total !== context.playedValue) {
      return {
        ok: false,
        reason: `Build ${build.id} total is ${build.total}, expected ${context.playedValue}.`,
      };
    }
    if (build.captureTeamId !== context.teamId) {
      return {
        ok: false,
        reason: `Your team cannot capture build ${build.id} right now.`,
      };
    }
  }

  return {
    ok: true,
    targetCardIds,
    targetBuildIds,
    looseCards,
    builds,
  };
}

function validateBuild(state, context) {
  const targetCardIds = dedupeIds(context.move.targetCardIds ?? []);
  const looseCards = findLooseCardsByIds(state, targetCardIds);

  if (looseCards.length !== targetCardIds.length) {
    return {
      ok: false,
      reason: "Some selected loose cards are no longer on the table.",
    };
  }

  if (looseCards.length === 0) {
    return {
      ok: false,
      reason: "Build creation requires selecting at least one table card.",
    };
  }

  const buildTotal = clampCardValue(context.move.buildTotal);
  if (!buildTotal) {
    return {
      ok: false,
      reason: "Build total must be between 1 and 14.",
    };
  }

  const aggregate = context.playedValue + sumBy(looseCards, (card) => getEffectiveCardValue(card, 1));
  if (aggregate !== buildTotal) {
    return {
      ok: false,
      reason: `Played and selected cards sum to ${aggregate}, not declared build total ${buildTotal}.`,
    };
  }

  const hasCaptureCard = teamHasCaptureCard(state, context.teamId, buildTotal, {
    playerId: context.player.id,
    cardId: context.card.id,
  });

  if (!hasCaptureCard) {
    return {
      ok: false,
      reason: `Your team must hold a capture card for build total ${buildTotal}.`,
    };
  }

  return {
    ok: true,
    targetCardIds,
    looseCards,
    buildTotal,
  };
}

function validateBuildMutation(state, context, expectedAction) {
  const buildId = context.move.targetBuildId;
  if (!buildId) {
    return {
      ok: false,
      reason: `${expectedAction} requires a build target.`,
    };
  }

  const build = findBuildById(state, buildId);
  if (!build) {
    return {
      ok: false,
      reason: "Selected build is no longer on the table.",
    };
  }

  if (expectedAction === ACTION_TYPES.add && build.captureTeamId !== context.teamId) {
    return {
      ok: false,
      reason: "Only the controlling team can add to this build.",
    };
  }

  if (expectedAction === ACTION_TYPES.freeze && build.captureTeamId === context.teamId) {
    return {
      ok: false,
      reason: "Freeze requires opposing team control.",
    };
  }

  if (
    expectedAction === ACTION_TYPES.refreeze &&
    (build.originalOwnerTeamId !== context.teamId || build.captureTeamId === context.teamId)
  ) {
    return {
      ok: false,
      reason: "Only original owner team can refreeze when control has changed.",
    };
  }

  const targetCardIds = dedupeIds(context.move.targetCardIds ?? []);
  const looseCards = findLooseCardsByIds(state, targetCardIds);
  if (looseCards.length !== targetCardIds.length) {
    return {
      ok: false,
      reason: "Some selected loose cards are no longer on the table.",
    };
  }

  const addValue = context.playedValue + sumBy(looseCards, (card) => getEffectiveCardValue(card, 1));
  if (addValue !== build.total) {
    return {
      ok: false,
      reason: `Cards added sum to ${addValue}, but build total is ${build.total}.`,
    };
  }

  const hasCaptureCard = teamHasCaptureCard(state, context.teamId, build.total, {
    playerId: context.player.id,
    cardId: context.card.id,
  });

  if (!hasCaptureCard) {
    return {
      ok: false,
      reason: `Your team must keep a card to capture build total ${build.total}.`,
    };
  }

  return {
    ok: true,
    targetCardIds,
    looseCards,
    build,
  };
}

function validateTablePlay() {
  return {
    ok: true,
  };
}

export function validateMove(state, move) {
  if (state.phase !== "playing") {
    return {
      ok: false,
      reason: "Game is not in a playable state.",
    };
  }

  const player = getCurrentPlayer(state);
  const card = player.hand.find((candidate) => candidate.id === move.cardId);

  if (!card) {
    return {
      ok: false,
      reason: "Selected card is not in current player hand.",
    };
  }

  const playedValue = resolvePlayedValue(player, card, move.rookValue);
  if (!playedValue.ok) {
    return {
      ok: false,
      reason: playedValue.reason,
    };
  }

  const context = {
    move,
    player,
    card,
    teamId: player.teamId,
    playedValue: playedValue.value,
  };

  let actionResult;
  switch (move.actionType) {
    case ACTION_TYPES.capture:
      actionResult = validateCapture(state, context);
      break;
    case ACTION_TYPES.build:
      actionResult = validateBuild(state, context);
      break;
    case ACTION_TYPES.add:
      actionResult = validateBuildMutation(state, context, ACTION_TYPES.add);
      break;
    case ACTION_TYPES.freeze:
      actionResult = validateBuildMutation(state, context, ACTION_TYPES.freeze);
      break;
    case ACTION_TYPES.refreeze:
      actionResult = validateBuildMutation(state, context, ACTION_TYPES.refreeze);
      break;
    case ACTION_TYPES.table:
      actionResult = validateTablePlay(state, context);
      break;
    default:
      return {
        ok: false,
        reason: `Unknown action type: ${move.actionType}`,
      };
  }

  if (!actionResult.ok) {
    return actionResult;
  }

  return {
    ok: true,
    normalized: {
      ...move,
      targetCardIds: actionResult.targetCardIds ?? [],
      targetBuildIds: actionResult.targetBuildIds ?? [],
      buildTotal: actionResult.buildTotal ?? move.buildTotal ?? null,
      playedValue: playedValue.value,
      playerId: player.id,
      teamId: player.teamId,
    },
    details: actionResult,
  };
}

function applyCapture(state, player, playedCard, normalizedMove, details) {
  const capturedLooseCards = removeLooseCardsByIds(state, normalizedMove.targetCardIds);
  const capturedBuilds = removeBuildsByIds(state, normalizedMove.targetBuildIds);
  const capturedBuildCards = capturedBuilds.flatMap((build) => build.cards);

  const team = getTeamById(state, player.teamId);
  team.capturedCards.push(playedCard, ...capturedLooseCards, ...capturedBuildCards);

  applyLostCardPenalties(state, player.teamId, [...capturedLooseCards, ...capturedBuildCards]);

  const cardsRemaining = getAllTableCardCount(state);
  if (cardsRemaining === 0) {
    applySweepBonus(state, player.teamId);
  }

  state.lastCapturingTeamId = player.teamId;

  addLog(
    state,
    `${player.name} captured ${capturedLooseCards.length + capturedBuildCards.length} table cards with ${playedCard.label}.`,
    LOG_LEVELS.success,
  );

  return {
    capturedLooseCards,
    capturedBuilds,
  };
}

function applyBuildCreate(state, player, playedCard, normalizedMove) {
  const selectedLoose = removeLooseCardsByIds(state, normalizedMove.targetCardIds);

  playedCard.playedByTeamId = player.teamId;
  playedCard.tableValue = playedCard.isRook ? normalizedMove.playedValue : null;

  const build = {
    id: `B${state.nextBuildId}`,
    total: normalizedMove.buildTotal,
    cards: [playedCard, ...selectedLoose],
    originalOwnerTeamId: player.teamId,
    captureTeamId: player.teamId,
    history: [
      {
        action: ACTION_TYPES.build,
        teamId: player.teamId,
      },
    ],
  };

  state.nextBuildId += 1;
  state.table.builds.push(build);

  addLog(
    state,
    `${player.name} created build ${build.id} at total ${build.total}.`,
    LOG_LEVELS.info,
  );
}

function applyBuildMutation(state, player, playedCard, normalizedMove, actionType) {
  const build = findBuildById(state, normalizedMove.targetBuildId);
  const selectedLoose = removeLooseCardsByIds(state, normalizedMove.targetCardIds);

  playedCard.playedByTeamId = player.teamId;
  playedCard.tableValue = playedCard.isRook ? normalizedMove.playedValue : null;

  build.cards.push(playedCard, ...selectedLoose);

  if (actionType === ACTION_TYPES.freeze || actionType === ACTION_TYPES.refreeze) {
    build.captureTeamId = player.teamId;
  }

  build.history.push({
    action: actionType,
    teamId: player.teamId,
  });

  addLog(
    state,
    `${player.name} ${actionType === ACTION_TYPES.add ? "added to" : actionType === ACTION_TYPES.freeze ? "froze" : "refroze"} ${build.id}.`,
    LOG_LEVELS.info,
  );
}

function applyTablePlay(state, player, playedCard, normalizedMove) {
  playedCard.playedByTeamId = player.teamId;
  playedCard.tableValue = playedCard.isRook ? normalizedMove.playedValue : null;

  state.table.looseCards.push(playedCard);

  if (state.firstTurnOfRound) {
    applyFirstTurnTablePenalty(state, player.teamId);
  }

  addLog(state, `${player.name} played ${playedCard.label} to table.`, LOG_LEVELS.info);
}

export function applyMove(state, move) {
  const validation = validateMove(state, move);
  if (!validation.ok) {
    return validation;
  }

  const normalizedMove = validation.normalized;
  const player = getCurrentPlayer(state);
  const playedCard = removeCardFromPlayerHand(player, normalizedMove.cardId);

  if (!playedCard) {
    return {
      ok: false,
      reason: "Card was not available in player hand during execution.",
    };
  }

  if (playedCard.isRook) {
    const pendingValue = player.pendingRookDeclarations[playedCard.id];
    if (pendingValue !== undefined) {
      delete player.pendingRookDeclarations[playedCard.id];
    }
  }

  switch (normalizedMove.actionType) {
    case ACTION_TYPES.capture:
      applyCapture(state, player, playedCard, normalizedMove, validation.details);
      break;
    case ACTION_TYPES.build:
      applyBuildCreate(state, player, playedCard, normalizedMove);
      break;
    case ACTION_TYPES.add:
    case ACTION_TYPES.freeze:
    case ACTION_TYPES.refreeze:
      applyBuildMutation(
        state,
        player,
        playedCard,
        normalizedMove,
        normalizedMove.actionType,
      );
      break;
    case ACTION_TYPES.table:
      applyTablePlay(state, player, playedCard, normalizedMove);
      break;
    default:
      return {
        ok: false,
        reason: `Unsupported action type ${normalizedMove.actionType}`,
      };
  }

  state.actionHistory.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    turnNumber: state.turnNumber,
    roundNumber: state.roundNumber,
    playerId: player.id,
    teamId: player.teamId,
    move: normalizedMove,
  });

  state.firstTurnOfRound = false;

  return {
    ok: true,
    normalizedMove,
  };
}
