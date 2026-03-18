import { DeckPool } from "../models/deck-pool.js";
import { getCardDrawRank } from "../models/card.js";
import {
  APP_ASSUMPTIONS,
  LOG_LEVELS,
  STARTING_CHIPS,
  STARTING_TEAM_POINTS,
} from "../utils/constants.js";
import { createSeededRandom, range } from "../utils/helpers.js";

function buildTeamsAndPlayers(playerCount) {
  const players = range(playerCount).map((index) => ({
    id: `P${index + 1}`,
    name: `Player ${index + 1}`,
    seat: index,
    teamId: null,
    hand: [],
    pendingRookDeclarations: {},
  }));

  const teams = [];

  if (playerCount === 2) {
    for (let index = 0; index < 2; index += 1) {
      players[index].teamId = index;
      teams.push({
        id: index,
        name: `Team ${index + 1}`,
        playerIds: [players[index].id],
        points: STARTING_TEAM_POINTS,
        startingChips: { ...STARTING_CHIPS },
        capturedCards: [],
        ledger: [],
      });
    }
    return { players, teams };
  }

  if (playerCount % 2 === 0) {
    const teamCount = playerCount / 2;
    const oppositeOffset = playerCount / 2;

    for (let teamId = 0; teamId < teamCount; teamId += 1) {
      const seatA = teamId;
      const seatB = (teamId + oppositeOffset) % playerCount;
      const playerA = players[seatA];
      const playerB = players[seatB];

      playerA.teamId = teamId;
      playerB.teamId = teamId;

      teams.push({
        id: teamId,
        name: `Team ${teamId + 1}`,
        playerIds: [playerA.id, playerB.id],
        points: STARTING_TEAM_POINTS,
        startingChips: { ...STARTING_CHIPS },
        capturedCards: [],
        ledger: [],
      });
    }

    return { players, teams };
  }

  for (let index = 0; index < playerCount; index += 1) {
    players[index].teamId = index;
    teams.push({
      id: index,
      name: `Team ${index + 1}`,
      playerIds: [players[index].id],
      points: STARTING_TEAM_POINTS,
      startingChips: { ...STARTING_CHIPS },
      capturedCards: [],
      ledger: [],
    });
  }

  return { players, teams };
}

function performOpeningDrawOff(deckPool, playerCount) {
  let contenders = range(playerCount);
  const rounds = [];

  while (contenders.length > 1) {
    const draws = [];

    for (const playerIndex of contenders) {
      const card = deckPool.drawOne();
      if (!card) {
        throw new Error("Deck exhausted during opening draw-off.");
      }

      draws.push({
        playerIndex,
        card,
        drawRank: getCardDrawRank(card),
      });
    }

    const highest = Math.max(...draws.map((entry) => entry.drawRank));
    const tied = draws
      .filter((entry) => entry.drawRank === highest)
      .map((entry) => entry.playerIndex);

    rounds.push({
      draws,
      highest,
      tied,
    });

    if (tied.length === 1) {
      return {
        winnerIndex: tied[0],
        rounds,
      };
    }

    contenders = tied;
  }

  return {
    winnerIndex: contenders[0],
    rounds,
  };
}

function totalGamesForPlayerCount(playerCount, teamCount) {
  if (playerCount === 6) {
    return teamCount;
  }
  return playerCount;
}

export function createMatchState({ playerCount, seed = Date.now() }) {
  if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 6) {
    throw new Error("Player count must be an integer between 2 and 6.");
  }

  const participants = buildTeamsAndPlayers(playerCount);

  return {
    seed: String(seed),
    playerCount,
    teamCount: participants.teams.length,
    totalGames: totalGamesForPlayerCount(playerCount, participants.teams.length),
    currentGameNumber: 1,
    rotationBasePlayerIndex: null,
    cumulativeTeamPoints: Object.fromEntries(
      participants.teams.map((team) => [team.id, 0]),
    ),
    completedGames: [],
  };
}

function buildParticipantsFromCount(playerCount) {
  const participants = buildTeamsAndPlayers(playerCount);
  return {
    players: participants.players.map((player) => ({
      ...player,
      hand: [],
      pendingRookDeclarations: {},
    })),
    teams: participants.teams.map((team) => ({
      ...team,
      capturedCards: [],
      ledger: [],
      points: STARTING_TEAM_POINTS,
      startingChips: { ...STARTING_CHIPS },
    })),
  };
}

export function createGameState(matchState, gameNumber = matchState.currentGameNumber) {
  const rng = createSeededRandom(`${matchState.seed}-game-${gameNumber}`);
  const participants = buildParticipantsFromCount(matchState.playerCount);
  const deckPool = new DeckPool(participants.teams.length, rng);

  let startingPlayerIndex = 0;
  let openingDrawOff = null;

  if (gameNumber === 1) {
    openingDrawOff = performOpeningDrawOff(deckPool, participants.players.length);
    startingPlayerIndex = openingDrawOff.winnerIndex;

    if (matchState.rotationBasePlayerIndex === null) {
      matchState.rotationBasePlayerIndex = startingPlayerIndex;
    }
  } else {
    const base = matchState.rotationBasePlayerIndex ?? 0;
    startingPlayerIndex = (base + gameNumber - 1) % participants.players.length;
  }

  const state = {
    matchSeed: matchState.seed,
    gameNumber,
    totalGamesInMatch: matchState.totalGames,
    playerCount: participants.players.length,
    teamCount: participants.teams.length,
    players: participants.players,
    teams: participants.teams,
    deckPool,
    table: {
      looseCards: [],
      builds: [],
    },
    openingDrawOff,
    burnedCards: openingDrawOff
      ? openingDrawOff.rounds.flatMap((round) => round.draws.map((entry) => entry.card))
      : [],
    currentPlayerIndex: startingPlayerIndex,
    startingPlayerIndex,
    roundNumber: 0,
    turnNumber: 1,
    roundStarterPlayerIndex: startingPlayerIndex,
    firstTurnOfRound: true,
    phase: "setup",
    nextBuildId: 1,
    lastCapturingTeamId: null,
    logs: [],
    actionHistory: [],
    assumptions: { ...APP_ASSUMPTIONS },
    winnerTeamIds: [],
  };

  addLog(
    state,
    `Game ${gameNumber} initialized. Starting player: ${state.players[startingPlayerIndex].name}.`,
    LOG_LEVELS.info,
  );

  return state;
}

export function recordCompletedGame(matchState, gameState) {
  const teamPoints = Object.fromEntries(gameState.teams.map((team) => [team.id, team.points]));

  matchState.completedGames.push({
    gameNumber: gameState.gameNumber,
    teamPoints,
    winnerTeamIds: [...gameState.winnerTeamIds],
  });

  for (const team of gameState.teams) {
    matchState.cumulativeTeamPoints[team.id] += team.points;
  }

  matchState.currentGameNumber += 1;
}

export function isMatchComplete(matchState) {
  return matchState.currentGameNumber > matchState.totalGames;
}

export function getCurrentPlayer(state) {
  return state.players[state.currentPlayerIndex];
}

export function getCurrentTeam(state) {
  const player = getCurrentPlayer(state);
  return state.teams.find((team) => team.id === player.teamId);
}

export function getPlayerById(state, playerId) {
  return state.players.find((player) => player.id === playerId);
}

export function getTeamById(state, teamId) {
  return state.teams.find((team) => team.id === teamId);
}

export function getPlayerBySeat(state, seatIndex) {
  return state.players.find((player) => player.seat === seatIndex);
}

export function removeCardFromPlayerHand(player, cardId) {
  const index = player.hand.findIndex((card) => card.id === cardId);
  if (index === -1) {
    return null;
  }
  const [card] = player.hand.splice(index, 1);
  return card;
}

export function addLog(state, message, level = LOG_LEVELS.info) {
  state.logs.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    level,
    message,
    turnNumber: state.turnNumber,
    roundNumber: state.roundNumber,
    timestamp: new Date().toISOString(),
  });

  if (state.logs.length > 200) {
    state.logs.length = 200;
  }
}

export function getAllTableCardCount(state) {
  const looseCount = state.table.looseCards.length;
  const buildCount = state.table.builds.reduce(
    (total, build) => total + build.cards.length,
    0,
  );
  return looseCount + buildCount;
}

export function allHandsEmpty(state) {
  return state.players.every((player) => player.hand.length === 0);
}

export function getTeammates(state, playerId) {
  const player = getPlayerById(state, playerId);
  if (!player) {
    return [];
  }
  return state.players.filter(
    (candidate) => candidate.teamId === player.teamId && candidate.id !== player.id,
  );
}
