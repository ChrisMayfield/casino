export const CHIP_VALUES = Object.freeze({
  white: 1,
  red: 10,
  blue: 50,
});

export const STARTING_CHIPS = Object.freeze({
  white: 10,
  red: 2,
  blue: 0,
});

export const STARTING_TEAM_POINTS =
  STARTING_CHIPS.white * CHIP_VALUES.white +
  STARTING_CHIPS.red * CHIP_VALUES.red +
  STARTING_CHIPS.blue * CHIP_VALUES.blue;

export const MAX_CARD_VALUE = 14;
export const ROOK_DRAW_VALUE = 15;

export const CARD_COLORS = Object.freeze({
  red: "red",
  black: "black",
  none: "none",
});

export const SUITS = Object.freeze([
  { key: "hearts", color: CARD_COLORS.red, symbol: "H" },
  { key: "diamonds", color: CARD_COLORS.red, symbol: "D" },
  { key: "clubs", color: CARD_COLORS.black, symbol: "C" },
  { key: "spades", color: CARD_COLORS.black, symbol: "S" },
]);

export const ACTION_TYPES = Object.freeze({
  capture: "capture",
  build: "build",
  add: "add",
  freeze: "freeze",
  refreeze: "refreeze",
  table: "table",
});

export const SPECIAL_CARD_PENALTIES = Object.freeze({
  blackTwo: 5,
  redTen: 10,
  rook: 20,
});

export const APP_ASSUMPTIONS = Object.freeze({
  deckShape:
    "Each Rook deck is modeled as 57 cards: four suits (H, D, C, S) numbered 1-14 plus one Rook.",
  rookPlay:
    "Rook is wild for move value selection (1-14) and highest in opening draw-off.",
  buildOwnership:
    "Only the team currently controlling a build may capture it; freeze transfers control to the freezing team; refreeze transfers back to original team.",
  firstTurnPenalty:
    "First-turn table-play penalty triggers whenever the first player in a round chooses table-play.",
  finalDeal:
    "When fewer than 4 cards per player remain, each player draws floor(remaining/playerCount) cards (1-3 if possible), and leftovers turn face-up on table.",
  endgameRemainder:
    "If cards remain on table at game end, the last capturing team takes them.",
  specialHandTiming:
    "Special-hand and poverty bonuses are evaluated immediately after each 4-card deal.",
});

export const LOG_LEVELS = Object.freeze({
  info: "info",
  warn: "warn",
  error: "error",
  success: "success",
});
