# Casino Rule Assumptions

This implementation follows the rules in README.md and makes explicit choices for ambiguous cases so gameplay remains deterministic.

## A. Deck and Card Model

1. Each deck is represented as 57 cards:
- Four suits (hearts, diamonds, clubs, spades)
- Numbered 1 through 14 in each suit
- One Rook card

2. Color mapping:
- Hearts and diamonds are red
- Clubs and spades are black

## B. Opening Draw-Off

1. Game 1 uses draw-off to choose starting player.
2. Rook is highest in draw-off.
3. Draw-off cards are removed from the draw pile.

## C. Match Rotation

1. Match mode rotates starting player clockwise from game to game.
2. Match length:
- 2 to 5 players: number of games equals player count
- 6 players: number of games equals team count (3)

## D. Build Ownership and Freeze

1. New build is controlled by the builder's team.
2. Add action is allowed only for the controlling team.
3. Freeze transfers capture rights to the freezing team.
4. Refreeze transfers capture rights back to original owner team.
5. Only the team with current capture rights may capture a build.

## E. Build Validation

1. Build totals are limited to 1-14.
2. A build or build mutation is legal only if the acting team still holds a card that can capture that total after the move.
3. For add, freeze, and refreeze, played card plus selected loose cards must sum exactly to the build total.

## F. Rook Use

1. Rook is wild for move values and can represent 1-14.
2. If same-number bonus used a Rook, that Rook is constrained to the declared number when played.
3. Rook on table keeps the value used when played.

## G. Round and Final Deal

1. Standard deal gives each player 4 cards.
2. Final reduced deal gives each player floor(remaining / playerCount) cards, capped at 3.
3. Any leftovers after reduced deal are flipped face-up to table.

## H. Penalties and Sweeps

1. First-turn table-play penalty always triggers if first player chooses table-play.
2. Penalty amount N is total card count currently on table (loose + all build cards) at penalty time.
3. Lost-card penalties apply to special cards (black 2, red 10, rook) captured by an opposing team, including cards captured from builds.
4. Sweep bonus triggers when capture leaves no cards on table.

## I. End of Game

1. When draw pile is empty and all hands are empty, game ends.
2. Remaining table cards are captured by last capturing team.
3. Most-cards bonus is top captured-card count minus second-highest count.
4. Captured card values and most-cards bonus are bank awards.
