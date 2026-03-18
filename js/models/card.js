import {
  CARD_COLORS,
  MAX_CARD_VALUE,
  ROOK_DRAW_VALUE,
  SPECIAL_CARD_PENALTIES,
  SUITS,
} from "../utils/constants.js";

function rankLabel(rank) {
  return String(rank);
}

export function createCard({ deckIndex, suit, rank, isRook = false }) {
  if (isRook) {
    return {
      id: `d${deckIndex}-rook`,
      deckIndex,
      suit: "rook",
      color: CARD_COLORS.none,
      rank: null,
      isRook: true,
      label: "Rook",
      playedByTeamId: null,
      tableValue: null,
    };
  }

  const suitSpec = SUITS.find((entry) => entry.key === suit);
  if (!suitSpec) {
    throw new Error(`Unknown suit: ${suit}`);
  }
  if (rank < 1 || rank > MAX_CARD_VALUE) {
    throw new Error(`Card rank out of range: ${rank}`);
  }

  return {
    id: `d${deckIndex}-${suit}-${rank}`,
    deckIndex,
    suit,
    color: suitSpec.color,
    rank,
    isRook: false,
    label: `${rankLabel(rank)}${suitSpec.symbol}`,
    playedByTeamId: null,
    tableValue: null,
  };
}

export function getCardDrawRank(card) {
  return card.isRook ? ROOK_DRAW_VALUE : card.rank;
}

export function getCardBasePlayValue(card) {
  if (card.isRook) {
    return 1;
  }
  return card.rank;
}

export function getEffectiveCardValue(card, fallbackRookValue = 1) {
  if (card.isRook) {
    return card.tableValue ?? fallbackRookValue;
  }
  return card.rank;
}

export function getCardPointValue(card) {
  if (card.isRook) {
    return 1;
  }

  if (card.color === CARD_COLORS.red && card.rank === 10) {
    return 10;
  }

  if (card.color === CARD_COLORS.black && card.rank === 2) {
    return 5;
  }

  if (card.color === CARD_COLORS.black) {
    return 1;
  }

  return 0;
}

export function getSpecialPenaltyValue(card) {
  if (card.isRook) {
    return SPECIAL_CARD_PENALTIES.rook;
  }
  if (card.color === CARD_COLORS.black && card.rank === 2) {
    return SPECIAL_CARD_PENALTIES.blackTwo;
  }
  if (card.color === CARD_COLORS.red && card.rank === 10) {
    return SPECIAL_CARD_PENALTIES.redTen;
  }
  return 0;
}
