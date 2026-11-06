# Online Uno

Work in progress, built in stages on the `feat/uno` branch. This page describes what has landed so far. The Cam and Laura score tracker is separate; see [uno.md](uno.md).

## Rules engine (`src/unogame/engine/`)

A pure TypeScript engine with no Firebase, React, clock or randomness of its own. The caller passes `now` and a `shuffle` function with every command, and keeps the full state on the server. Shuffling stays authoritative there.

- 108 cards, each with a stable id (0-107). Seven each, one card per turn. The opening discard is always a number card.
- No stacking. Wild Draw Four can be played at any time. A player may draw even when they hold a playable card, and may then play or keep that one card.
- With two players Reverse acts as Skip. An action card that empties a hand wins the round and its effect is not applied.
- The first empty hand wins one point. `nextStartingIndex` rotates the starting player between rounds.
- The wild colour is chosen in the same command as the play.
- When the stock runs out, every discard except the top card is reshuffled. Penalties draw what exists. If the stock cannot be refilled and nobody holds a playable card, the round ends as `blocked` with no winner. Cards are never created or lost.

### Uno timing

Playing down to one card with `declareUno` opens no window. Without it, the player is protected until `now + 3000 ms`. After that any other player can catch them, adding two cards once, until the next draw or play by anyone. If the next player acts inside the protected time, the chance to catch is gone.

### Views

`publicView` exposes hand counts, the top card, the colour in force, the turn and any Uno window. `privateView` adds one player's own hand and playable cards. `publicEvent` removes drawn cards from events. Hands and stock order must never leave the server.

### Known limits

There are no turn timers. A player who stops responding holds up the table until the host abandons the round (added in a later stage).
