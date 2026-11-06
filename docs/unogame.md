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

## Cards and table components

- `scripts/generate-uno-svgs.mts` writes 54 faces to `public/images/uno`, in the same 5:7 style as the playing cards. Coloured faces spell their colour at the top and bottom and in the image title. The back is the existing Mr Tayto card. Run it again after changing the design.
- `src/unogame/cards.ts` names cards and finds their images. The playing-card API is untouched.
- Components in `src/components/`: `unocard` (images and card buttons), `unohand`, `unoopponents`, `unocolourpicker`, `unoscoreboard` and `unotable`, which composes them. They show a published view and report choices; they never change the game. Styles are in `src/styles/unotable.module.css`.
- Unplayable cards stay focusable and are marked `aria-disabled`, with the reason in their name. Playable cards also stand higher in the hand, and the player to move has a thicker border and the word "Playing", so nothing depends on colour. The colour in play has a shape as well as a colour.
- Your hand is an overlapping fan (`src/unogame/handlayout.ts`) that always fits the width it has, so there is no scrolling. Each card keeps its top-left corner showing. If even the narrowest strips would not fit, the hand wraps into rows, each overlapping the one above with its top strip showing. The focused or hovered card comes to the front.

### Preview page

`/admin/unopreview` (signed-in only, so outside the sitemap and search) shows synthetic tables built from real engine states in `src/unogame/preview.ts`: two and ten players, long names, a large hand, catching Uno and a finished round. Choosing a card only reports the choice. It is temporary and goes when the playable table replaces it.

## Game service

Uno rooms share the buzzer's room code, join limits, expiry and cleanup (`src/rooms/service.ts`), told apart by a `game` field on the room (`buzzer` when missing). A room holds two to ten Uno players, or twenty for the buzzer, and each game refuses the other's rooms and commands. Sign-in is separate: Uno guests have `uno-` identities, an `unoRoom` token claim and a `uno-guest-<code>` cookie limited to `/api/uno`, so a buzzer sign-in does nothing in an Uno room, or the other way round.

Everything is decided on the server in `src/unogame/service.ts`, which runs the engine inside a Firestore transaction:

- **Lobby.** Joining adds a name to the room's player list. The host starts a round from the lobby (or after a finished round) with at least two players. Starting seats everyone listed, deals, and picks the seat after the previous starter. People who join mid-round wait for the next one.
- **Commands.** `/api/uno` takes `play`, `draw`, `keep`, `catch`, `sayUno` and `leave`, each with a `commandId`. A repeated command id changes nothing. The engine decides whether a move is legal, so most commands do not need the table's version. `catch` does, because it names nobody and could otherwise land on a different player than the one the catcher saw.
- **What is stored.** `gameRooms/{code}` is public to the room: the stage, seats, names, round scores, the public view and the latest events. `roomPrivate/{code}` holds the full round (stock order and every hand) and is never readable by browsers. `roomHands/{code}_{playerId}` is one player's hand and playable cards, readable only by that player while they are in the room. Only hands that changed are rewritten.
- **Leaving.** Seated players cannot leave or be removed while a round is being played, since the engine cannot yet drop a hand. Anyone else can. Abandoning a round comes with the room lifecycle work.
- **Retention.** A room and its hands expire six hours after it opens. A finished round also writes `roomResults/{code}_{round}`, kept for seven days after the round, so the winner and scores outlive the room.

## Playing online

`/games/uno` (`src/components/uno.tsx`) is the page for playing a round. It mirrors the buzzer: an authorised host creates a room, then everyone joins from a link or a four-character code. The host plays too, so they enter a name like anyone else.

- **Lobby.** Everyone sees the player list. The host copies the join link, removes players, starts the round (two or more players) or ends the room.
- **Table.** Seated players get `UnoTable`, fed by two listeners: the room document and their own hand document. Choosing a card, drawing, keeping, saying Uno and catching become commands to `/api/uno`. `catch` also sends the table version it was made against. Someone who joins mid-round waits for the next one.
- **Lost replies.** A command that gets no answer is sent once more with the same command id, which the server applies at most once. If that also fails, the player is told to look at the table before trying again. Moves are refused while offline or while the listener is serving cached data.
- **Announcements.** `src/unogame/announce.ts` turns the room's public events into sentences for the live region, and adds whose turn it is. It only ever sees public events.
- **After a round.** The room shows who won and the scoreboard. The host can play again, which deals a new round and moves the first turn on one seat. Abandoning a round and the rest of the lifecycle are still to come.
- **Reloading.** The tab remembers the room, and the Firebase sign-in keeps the seat. A host's saved room only gives host controls while the host is signed in.

The Playwright journey (`tests/admin/09_unoplay.spec.ts`) cannot know the random deal, so it draws once, then uses the Admin SDK against the emulator to leave one player on a last matching card and plays it. Playing every kind of card is covered by the engine tests.
