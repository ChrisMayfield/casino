export function createTeam({ id, name, playerIds, startingPoints, startingChips }) {
  return {
    id,
    name,
    playerIds,
    points: startingPoints,
    startingChips: { ...startingChips },
    capturedCards: [],
    ledger: [],
  };
}
