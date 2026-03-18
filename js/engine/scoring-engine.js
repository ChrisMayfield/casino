import {
  getCardPointValue,
  getEffectiveCardValue,
  getSpecialPenaltyValue,
} from "../models/card.js";
import { LOG_LEVELS } from "../utils/constants.js";
import { sumBy } from "../utils/helpers.js";
import { addLog, getAllTableCardCount, getTeamById } from "../state/game-state.js";

function pushLedger(team, entry) {
  team.ledger.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ...entry,
  });

  if (team.ledger.length > 300) {
    team.ledger.shift();
  }
}

export function awardBankPoints(state, teamId, points, reason, metadata = {}) {
  if (!points) {
    return;
  }
  const team = getTeamById(state, teamId);
  if (!team) {
    throw new Error(`Cannot award points to unknown team ${teamId}.`);
  }

  team.points += points;
  pushLedger(team, {
    type: "bank-award",
    delta: points,
    reason,
    metadata,
  });
}

export function transferPoints(state, fromTeamId, toTeamId, points, reason, metadata = {}) {
  if (!points || fromTeamId === toTeamId) {
    return;
  }

  const source = getTeamById(state, fromTeamId);
  const destination = getTeamById(state, toTeamId);

  if (!source || !destination) {
    throw new Error(`Invalid transfer: ${fromTeamId} -> ${toTeamId}`);
  }

  source.points -= points;
  destination.points += points;

  pushLedger(source, {
    type: "transfer-out",
    delta: -points,
    reason,
    metadata: {
      ...metadata,
      otherTeamId: toTeamId,
    },
  });

  pushLedger(destination, {
    type: "transfer-in",
    delta: points,
    reason,
    metadata: {
      ...metadata,
      otherTeamId: fromTeamId,
    },
  });
}

function allSameColor(cards) {
  const nonRookColors = cards.filter((card) => !card.isRook).map((card) => card.color);
  if (nonRookColors.length <= 1) {
    return true;
  }
  return nonRookColors.every((color) => color === nonRookColors[0]);
}

function sameNumberTarget(cards) {
  const nonRookValues = cards.filter((card) => !card.isRook).map((card) => card.rank);

  if (nonRookValues.length === 0) {
    return 14;
  }

  const target = nonRookValues[0];
  const allAligned = nonRookValues.every((value) => value === target);
  if (!allAligned) {
    return null;
  }

  return target;
}

function povertyBonus(cards) {
  const values = cards.map((card) => (card.isRook ? 1 : getEffectiveCardValue(card, 1)));
  const maxValue = Math.max(...values);

  if (maxValue <= 1) {
    return 20;
  }
  if (maxValue <= 2) {
    return 15;
  }
  if (maxValue <= 3) {
    return 10;
  }
  if (maxValue <= 4) {
    return 5;
  }
  return 0;
}

export function applySpecialHandBonuses(state, dealSize) {
  if (dealSize !== 4) {
    return;
  }

  for (const player of state.players) {
    const cards = player.hand;
    if (cards.length !== 4) {
      continue;
    }

    if (allSameColor(cards)) {
      awardBankPoints(state, player.teamId, 5, "Special hand: same color", {
        playerId: player.id,
      });
      addLog(
        state,
        `${player.name} earned +5 bank points for all same color.`,
        LOG_LEVELS.success,
      );
    }

    const numberTarget = sameNumberTarget(cards);
    if (numberTarget !== null) {
      awardBankPoints(state, player.teamId, numberTarget, "Special hand: same number", {
        playerId: player.id,
        numberTarget,
      });

      const rookCards = cards.filter((card) => card.isRook);
      for (const rookCard of rookCards) {
        player.pendingRookDeclarations[rookCard.id] = numberTarget;
      }

      addLog(
        state,
        `${player.name} earned +${numberTarget} bank points for same number (${numberTarget}).`,
        LOG_LEVELS.success,
      );
    }

    const poverty = povertyBonus(cards);
    if (poverty > 0) {
      awardBankPoints(state, player.teamId, poverty, "Poverty bonus", {
        playerId: player.id,
      });
      addLog(state, `${player.name} earned +${poverty} poverty bonus.`, LOG_LEVELS.success);
    }
  }
}

export function applySweepBonus(state, captorTeamId) {
  for (const team of state.teams) {
    if (team.id === captorTeamId) {
      continue;
    }
    transferPoints(state, team.id, captorTeamId, 1, "Sweep bonus");
  }

  addLog(
    state,
    `${getTeamById(state, captorTeamId).name} made a sweep. Each other team paid 1 point.`,
    LOG_LEVELS.success,
  );
}

export function applyLostCardPenalties(state, captorTeamId, capturedCards) {
  for (const card of capturedCards) {
    const playedByTeamId = card.playedByTeamId;
    if (playedByTeamId === null || playedByTeamId === undefined) {
      continue;
    }
    if (playedByTeamId === captorTeamId) {
      continue;
    }

    const penalty = getSpecialPenaltyValue(card);
    if (!penalty) {
      continue;
    }

    transferPoints(state, playedByTeamId, captorTeamId, penalty, "Lost card penalty", {
      cardId: card.id,
      cardLabel: card.label,
    });

    addLog(
      state,
      `${getTeamById(state, playedByTeamId).name} paid ${penalty} to ${getTeamById(state, captorTeamId).name} for lost ${card.label}.`,
      LOG_LEVELS.warn,
    );
  }
}

export function applyFirstTurnTablePenalty(state, payerTeamId) {
  const tableCount = getAllTableCardCount(state);
  if (tableCount <= 0) {
    return;
  }

  for (const team of state.teams) {
    if (team.id === payerTeamId) {
      continue;
    }
    transferPoints(
      state,
      payerTeamId,
      team.id,
      tableCount,
      "First player table-play penalty",
      {
        tableCount,
      },
    );
  }

  addLog(
    state,
    `${getTeamById(state, payerTeamId).name} paid ${tableCount} to each opponent for first-turn table play.`,
    LOG_LEVELS.warn,
  );
}

function awardCapturedCardValues(state) {
  for (const team of state.teams) {
    const points = sumBy(team.capturedCards, (card) => getCardPointValue(card));
    if (points > 0) {
      awardBankPoints(state, team.id, points, "Captured card values");
      addLog(state, `${team.name} earned ${points} points from captured cards.`, LOG_LEVELS.success);
    }
  }
}

function awardMostCardsBonus(state) {
  if (state.teams.length < 2) {
    return;
  }

  const standings = state.teams
    .map((team) => ({
      teamId: team.id,
      capturedCount: team.capturedCards.length,
    }))
    .sort((left, right) => right.capturedCount - left.capturedCount);

  const first = standings[0];
  const second = standings[1];
  const difference = first.capturedCount - second.capturedCount;

  if (difference <= 0) {
    return;
  }

  awardBankPoints(state, first.teamId, difference, "Most cards bonus", {
    capturedCount: first.capturedCount,
    secondCapturedCount: second.capturedCount,
  });

  addLog(
    state,
    `${getTeamById(state, first.teamId).name} earned ${difference} for most cards captured.`,
    LOG_LEVELS.success,
  );
}

export function finalizeGameScoring(state) {
  awardCapturedCardValues(state);
  awardMostCardsBonus(state);

  const highestScore = Math.max(...state.teams.map((team) => team.points));
  state.winnerTeamIds = state.teams
    .filter((team) => team.points === highestScore)
    .map((team) => team.id);

  addLog(
    state,
    `Game over. Winning ${state.winnerTeamIds.length > 1 ? "teams" : "team"}: ${state.winnerTeamIds.map((teamId) => getTeamById(state, teamId).name).join(", ")}.`,
    LOG_LEVELS.success,
  );
}
