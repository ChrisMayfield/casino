import {
  createGameState,
  createMatchState,
  isMatchComplete,
  recordCompletedGame,
} from "./state/game-state.js";
import { applyMove } from "./engine/rules-engine.js";
import { advanceTurn, startGame } from "./engine/turn-engine.js";
import { createActionController } from "./ui/action-controller.js";
import { renderBoard } from "./ui/render-board.js";
import { LOG_LEVELS } from "./utils/constants.js";

const appState = {
  matchState: null,
  gameState: null,
};

const actionController = createActionController();

function render() {
  renderBoard(appState, actionController.getUiState());
}

function attachSelectionHandler() {
  const boardRoot = document.getElementById("app-root");
  boardRoot.addEventListener("click", (event) => {
    const target = event.target.closest("[data-pick]");
    if (!target) {
      return;
    }

    const changed = actionController.toggleSelectionFromClick(target);
    if (!changed) {
      return;
    }

    render();
  });
}

function startMatch() {
  const playerCount = Number(document.getElementById("player-count").value);
  const seed = document.getElementById("seed-input").value.trim() || String(Date.now());

  try {
    appState.matchState = createMatchState({ playerCount, seed });
    appState.gameState = createGameState(appState.matchState);
    appState.gameState.matchRecorded = false;
    startGame(appState.gameState);

    actionController.clearAll();
    actionController.setMessage(
      `Match started with ${playerCount} players and seed ${seed}.`,
      LOG_LEVELS.success,
    );
  } catch (error) {
    actionController.setMessage(error.message, LOG_LEVELS.error);
  }

  render();
}

function advanceToNextGame() {
  if (!appState.matchState || !appState.gameState) {
    return;
  }

  if (!isMatchComplete(appState.matchState)) {
    appState.gameState = createGameState(
      appState.matchState,
      appState.matchState.currentGameNumber,
    );
    appState.gameState.matchRecorded = false;
    startGame(appState.gameState);

    actionController.clearAll();
    actionController.setMessage(
      `Started game ${appState.gameState.gameNumber}.`,
      LOG_LEVELS.success,
    );

    render();
  }
}

function recordIfFinished() {
  if (!appState.matchState || !appState.gameState) {
    return;
  }
  if (appState.gameState.phase !== "game-over") {
    return;
  }
  if (appState.gameState.matchRecorded) {
    return;
  }

  recordCompletedGame(appState.matchState, appState.gameState);
  appState.gameState.matchRecorded = true;

  if (isMatchComplete(appState.matchState)) {
    actionController.setMessage("Match complete. Review cumulative standings below.", LOG_LEVELS.success);
  } else {
    actionController.setMessage(
      `Game ${appState.gameState.gameNumber} complete. Start next game when ready.`,
      LOG_LEVELS.info,
    );
  }
}

function submitTurn(event) {
  event.preventDefault();

  if (!appState.gameState || appState.gameState.phase !== "playing") {
    actionController.setMessage("Start a match before submitting turns.", LOG_LEVELS.warn);
    render();
    return;
  }

  const result = actionController.composeMove(event.currentTarget);
  if (!result.ok) {
    actionController.setMessage(result.reason, LOG_LEVELS.warn);
    render();
    return;
  }

  const applied = applyMove(appState.gameState, result.move);
  if (!applied.ok) {
    actionController.setMessage(applied.reason, LOG_LEVELS.error);
    render();
    return;
  }

  actionController.setMessage("Turn applied successfully.", LOG_LEVELS.success);
  actionController.resetSelections();

  advanceTurn(appState.gameState);
  recordIfFinished();
  render();
}

function clearSelections() {
  actionController.clearAll();
  render();
}

function seedDefaults() {
  document.getElementById("seed-input").value = String(Date.now());
}

function bootstrap() {
  seedDefaults();
  attachSelectionHandler();

  document.getElementById("start-match").addEventListener("click", startMatch);
  document.getElementById("next-game").addEventListener("click", advanceToNextGame);
  document.getElementById("clear-selection").addEventListener("click", clearSelections);
  document.getElementById("action-form").addEventListener("submit", submitTurn);
  document.getElementById("action-type").addEventListener("change", render);

  render();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
