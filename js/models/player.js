export function createPlayer({ id, name, seat, teamId }) {
  return {
    id,
    name,
    seat,
    teamId,
    hand: [],
    pendingRookDeclarations: {},
  };
}
