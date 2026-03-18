import { createCard } from "./card.js";
import { MAX_CARD_VALUE, SUITS } from "../utils/constants.js";
import { shuffleInPlace } from "../utils/helpers.js";

function buildSingleDeck(deckIndex) {
  const cards = [];

  for (const suitSpec of SUITS) {
    for (let rank = 1; rank <= MAX_CARD_VALUE; rank += 1) {
      cards.push(
        createCard({
          deckIndex,
          suit: suitSpec.key,
          rank,
        }),
      );
    }
  }

  cards.push(
    createCard({
      deckIndex,
      isRook: true,
    }),
  );

  return cards;
}

export class DeckPool {
  constructor(deckCount, randomFn = Math.random) {
    if (!Number.isInteger(deckCount) || deckCount < 1) {
      throw new Error("DeckPool deckCount must be a positive integer.");
    }

    this.randomFn = randomFn;
    this.cards = [];

    for (let deckIndex = 1; deckIndex <= deckCount; deckIndex += 1) {
      this.cards.push(...buildSingleDeck(deckIndex));
    }

    this.shuffle();
  }

  shuffle() {
    shuffleInPlace(this.cards, this.randomFn);
  }

  drawOne() {
    return this.cards.pop() ?? null;
  }

  drawMany(count) {
    const amount = Math.max(0, Number.isFinite(count) ? Math.floor(count) : 0);
    const draws = [];
    for (let index = 0; index < amount; index += 1) {
      const card = this.drawOne();
      if (!card) {
        break;
      }
      draws.push(card);
    }
    return draws;
  }

  remaining() {
    return this.cards.length;
  }
}
