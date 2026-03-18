import { ACTION_TYPES, LOG_LEVELS } from "../utils/constants.js";

function readNumericValue(inputElement) {
  const raw = inputElement.value.trim();
  if (!raw) {
    return null;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.floor(value);
}

export class ActionController {
  constructor() {
    this.selectedHandCardId = null;
    this.selectedTableCardIds = new Set();
    this.selectedBuildIds = new Set();
    this.message = null;
  }

  getUiState() {
    return {
      selectedHandCardId: this.selectedHandCardId,
      selectedTableCardIds: this.selectedTableCardIds,
      selectedBuildIds: this.selectedBuildIds,
      message: this.message,
    };
  }

  setMessage(text, level = LOG_LEVELS.info) {
    this.message = {
      text,
      level,
    };
  }

  clearMessage() {
    this.message = null;
  }

  resetSelections() {
    this.selectedHandCardId = null;
    this.selectedTableCardIds = new Set();
    this.selectedBuildIds = new Set();
  }

  clearAll() {
    this.resetSelections();
    this.clearMessage();
  }

  toggleSelectionFromClick(targetElement) {
    const pick = targetElement.dataset.pick;
    if (!pick) {
      return false;
    }

    if (pick === "hand") {
      const cardId = targetElement.dataset.cardId;
      this.selectedHandCardId = this.selectedHandCardId === cardId ? null : cardId;
      return true;
    }

    if (pick === "table") {
      const cardId = targetElement.dataset.cardId;
      if (this.selectedTableCardIds.has(cardId)) {
        this.selectedTableCardIds.delete(cardId);
      } else {
        this.selectedTableCardIds.add(cardId);
      }
      return true;
    }

    if (pick === "build") {
      const buildId = targetElement.dataset.buildId;
      if (this.selectedBuildIds.has(buildId)) {
        this.selectedBuildIds.delete(buildId);
      } else {
        this.selectedBuildIds.add(buildId);
      }
      return true;
    }

    return false;
  }

  composeMove(formElement) {
    const actionType = formElement.querySelector("#action-type").value;
    const rookValue = readNumericValue(formElement.querySelector("#rook-value"));
    const buildTotal = readNumericValue(formElement.querySelector("#build-total"));

    if (!this.selectedHandCardId) {
      return {
        ok: false,
        reason: "Select a card from the current hand first.",
      };
    }

    const move = {
      actionType,
      cardId: this.selectedHandCardId,
      rookValue,
      buildTotal,
      targetCardIds: [...this.selectedTableCardIds],
      targetBuildIds: [...this.selectedBuildIds],
      targetBuildId: null,
    };

    if (
      actionType === ACTION_TYPES.add ||
      actionType === ACTION_TYPES.freeze ||
      actionType === ACTION_TYPES.refreeze
    ) {
      const buildIds = [...this.selectedBuildIds];
      if (buildIds.length !== 1) {
        return {
          ok: false,
          reason: "Select exactly one build for add, freeze, or refreeze.",
        };
      }
      move.targetBuildId = buildIds[0];
    }

    if (actionType === ACTION_TYPES.table) {
      move.targetCardIds = [];
      move.targetBuildIds = [];
      move.targetBuildId = null;
    }

    if (actionType === ACTION_TYPES.build) {
      move.targetBuildIds = [];
      move.targetBuildId = null;
    }

    if (actionType === ACTION_TYPES.capture) {
      move.targetBuildId = null;
    }

    return {
      ok: true,
      move,
    };
  }
}

export function createActionController() {
  return new ActionController();
}
