import { CHIP_VALUES, MAX_CARD_VALUE } from "./constants.js";

export function createSeededRandom(seedInput) {
  const normalized = String(seedInput ?? "casino-seed");
  let hash = 1779033703 ^ normalized.length;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = Math.imul(hash ^ normalized.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 4294967296;
  };
}

export function shuffleInPlace(values, randomFn = Math.random) {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomFn() * (i + 1));
    const temp = values[i];
    values[i] = values[j];
    values[j] = temp;
  }
  return values;
}

export function clampCardValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  const rounded = Math.floor(numeric);
  if (rounded < 1 || rounded > MAX_CARD_VALUE) {
    return null;
  }
  return rounded;
}

export function sum(values) {
  return values.reduce((accumulator, value) => accumulator + value, 0);
}

export function sumBy(values, project) {
  return values.reduce((accumulator, value) => accumulator + project(value), 0);
}

export function pointsToChipBreakdown(points) {
  const sign = points < 0 ? -1 : 1;
  let remainder = Math.abs(Math.trunc(points));

  const blue = Math.floor(remainder / CHIP_VALUES.blue);
  remainder -= blue * CHIP_VALUES.blue;

  const red = Math.floor(remainder / CHIP_VALUES.red);
  remainder -= red * CHIP_VALUES.red;

  const white = remainder;

  return {
    sign,
    blue,
    red,
    white,
  };
}

export function formatChipBreakdown(points) {
  const chips = pointsToChipBreakdown(points);
  const prefix = chips.sign < 0 ? "-" : "";
  return `${prefix}${chips.blue}B ${chips.red}R ${chips.white}W`;
}

export function dedupeIds(values) {
  return [...new Set(values.filter(Boolean))];
}

export function range(length) {
  return Array.from({ length }, (_, index) => index);
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
