import { ACTION_TYPES } from "../utils/constants.js";
import { formatChipBreakdown } from "../utils/helpers.js";
import { getCurrentPlayer } from "../state/game-state.js";

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cardClass(card) {
  if (card.isRook) {
    return "card-rook";
  }
  return card.color === "red" ? "card-red" : "card-black";
}

function cardButtonMarkup(card, selectionKind, selected) {
  return `<button type="button" class="card ${cardClass(card)} ${selected ? "selected" : ""}" data-pick="${selectionKind}" data-card-id="${card.id}">${escapeHtml(card.label)}${
    card.isRook && card.tableValue ? `<span class="sub">(${card.tableValue})</span>` : ""
  }</button>`;
}

function renderHand(gameState, uiState) {
  const currentPlayer = getCurrentPlayer(gameState);
  const handEl = document.getElementById("current-hand");
  const pendingEl = document.getElementById("pending-rook");

  handEl.innerHTML = currentPlayer.hand
    .map((card) =>
      cardButtonMarkup(card, "hand", uiState.selectedHandCardId === card.id),
    )
    .join("");

  if (currentPlayer.hand.length === 0) {
    handEl.innerHTML = '<p class="empty">No cards left this round.</p>';
  }

  const declarations = Object.entries(currentPlayer.pendingRookDeclarations);
  if (declarations.length === 0) {
    pendingEl.innerHTML = "";
    return;
  }

  pendingEl.innerHTML = `<div class="pending-rook-box"><strong>Pending Rook Declaration</strong><p>${declarations
    .map(([cardId, value]) => `${escapeHtml(cardId)} must be played as ${value}`)
    .join("<br>")}</p></div>`;
}

function renderTable(gameState, uiState) {
  const looseEl = document.getElementById("table-loose");
  const buildsEl = document.getElementById("table-builds");

  if (gameState.table.looseCards.length === 0) {
    looseEl.innerHTML = '<p class="empty">No loose cards on table.</p>';
  } else {
    looseEl.innerHTML = gameState.table.looseCards
      .map((card) =>
        cardButtonMarkup(
          card,
          "table",
          uiState.selectedTableCardIds.has(card.id),
        ),
      )
      .join("");
  }

  if (gameState.table.builds.length === 0) {
    buildsEl.innerHTML = '<p class="empty">No active builds.</p>';
    return;
  }

  buildsEl.innerHTML = gameState.table.builds
    .map((build) => {
      const controllingTeam = gameState.teams.find((team) => team.id === build.captureTeamId);
      const ownerTeam = gameState.teams.find((team) => team.id === build.originalOwnerTeamId);

      return `<article class="build ${
        uiState.selectedBuildIds.has(build.id) ? "selected" : ""
      }" data-pick="build" data-build-id="${build.id}">
        <header>
          <h4>${escapeHtml(build.id)} / Total ${build.total}</h4>
          <p>Capture rights: ${escapeHtml(controllingTeam?.name ?? "Unknown")}</p>
          <p>Original owner: ${escapeHtml(ownerTeam?.name ?? "Unknown")}</p>
        </header>
        <div class="build-cards">${build.cards
          .map((card) => `<span class="card-mini ${cardClass(card)}">${escapeHtml(card.label)}</span>`)
          .join("")}</div>
      </article>`;
    })
    .join("");
}

function renderScores(gameState) {
  const scoreEl = document.getElementById("team-scores");
  scoreEl.innerHTML = gameState.teams
    .map((team) => {
      const members = gameState.players
        .filter((player) => player.teamId === team.id)
        .map((player) => player.name)
        .join(", ");

      const ledgerPreview = team.ledger
        .slice(-3)
        .reverse()
        .map((entry) => `<li>${escapeHtml(entry.reason)}: ${entry.delta > 0 ? "+" : ""}${entry.delta}</li>`)
        .join("");

      return `<article class="team-score">
        <h4>${escapeHtml(team.name)}</h4>
        <p class="subtle">Players: ${escapeHtml(members)}</p>
        <p><strong>${team.points}</strong> points (${escapeHtml(formatChipBreakdown(team.points))})</p>
        <p>Captured cards: ${team.capturedCards.length}</p>
        <ul>${ledgerPreview || "<li>No point transfers yet.</li>"}</ul>
      </article>`;
    })
    .join("");
}

function renderLogs(gameState) {
  const logEl = document.getElementById("event-log");
  logEl.innerHTML = gameState.logs
    .slice(0, 24)
    .map(
      (entry) =>
        `<li class="log-${entry.level}">R${entry.roundNumber || 0} T${entry.turnNumber || 0}: ${escapeHtml(
          entry.message,
        )}</li>`,
    )
    .join("");
}

function renderStatus(gameState, matchState) {
  const currentPlayer = getCurrentPlayer(gameState);
  const currentTeam = gameState.teams.find((team) => team.id === currentPlayer.teamId);

  document.getElementById("status-game").textContent =
    `Game ${gameState.gameNumber} of ${matchState.totalGames}`;
  document.getElementById("status-round").textContent = `Round ${gameState.roundNumber}`;
  document.getElementById("status-turn").textContent = `Turn ${gameState.turnNumber}`;
  document.getElementById("status-player").textContent =
    `${currentPlayer.name} (${currentTeam.name})`;
  document.getElementById("status-phase").textContent =
    gameState.phase === "game-over" ? "Game complete" : "In progress";

  const assumptions = Object.values(gameState.assumptions);
  document.getElementById("assumption-note").innerHTML = assumptions
    .map((text) => `<li>${escapeHtml(text)}</li>`)
    .join("");
}

function renderMatchSummary(matchState) {
  const summaryEl = document.getElementById("match-summary");
  const rows = Object.entries(matchState.cumulativeTeamPoints)
    .map(([teamId, points]) => ({
      teamId: Number(teamId),
      points,
    }))
    .sort((left, right) => right.points - left.points)
    .map(
      (entry) =>
        `<li>Team ${entry.teamId + 1}: ${entry.points} cumulative points</li>`,
    )
    .join("");

  summaryEl.innerHTML = rows || "<li>No games completed yet.</li>";

  const nextGameButton = document.getElementById("next-game");
  const matchDone = matchState.currentGameNumber > matchState.totalGames;
  nextGameButton.disabled = !matchState.completedGames.length || matchDone;

  const bannerEl = document.getElementById("match-banner");
  if (!matchDone) {
    bannerEl.textContent = "";
    return;
  }

  const winnerScore = Math.max(...Object.values(matchState.cumulativeTeamPoints));
  const winners = Object.entries(matchState.cumulativeTeamPoints)
    .filter(([, score]) => score === winnerScore)
    .map(([teamId]) => `Team ${Number(teamId) + 1}`)
    .join(", ");

  bannerEl.textContent = `Match complete. Winner: ${winners}.`;
}

function syncActionControls(gameState, uiState) {
  const actionType = document.getElementById("action-type").value;
  const buildTotalGroup = document.getElementById("group-build-total");
  const rookGroup = document.getElementById("group-rook-value");
  const actionMessage = document.getElementById("action-message");

  buildTotalGroup.style.display = actionType === ACTION_TYPES.build ? "block" : "none";

  const selectedHandCard = getCurrentPlayer(gameState).hand.find(
    (card) => card.id === uiState.selectedHandCardId,
  );
  rookGroup.style.display = selectedHandCard?.isRook ? "block" : "none";

  if (uiState.message) {
    actionMessage.textContent = uiState.message.text;
    actionMessage.className = `message message-${uiState.message.level}`;
  } else {
    actionMessage.textContent = "";
    actionMessage.className = "message";
  }
}

export function renderBoard(appState, uiState) {
  const { gameState, matchState } = appState;

  if (!gameState || !matchState) {
    return;
  }

  renderStatus(gameState, matchState);
  renderHand(gameState, uiState);
  renderTable(gameState, uiState);
  renderScores(gameState);
  renderLogs(gameState);
  renderMatchSummary(matchState);
  syncActionControls(gameState, uiState);
}
