export function createBuildPile({ id, total, cards, originalOwnerTeamId, captureTeamId }) {
  return {
    id,
    total,
    cards,
    originalOwnerTeamId,
    captureTeamId,
    history: [],
  };
}
