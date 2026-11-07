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
- Your hand is always sorted for you (`src/unogame/handsort.ts`): red, yellow, green, blue, then wilds, with each colour in number order and then Skip, Reverse and Draw Two. A card you draw slots into place and keeps its outline and "just drawn" in its name, so it is still easy to find. Only what is shown is sorted; the server keeps its own order, and the keyboard and screen reader order follows what you see.
- Your hand is an overlapping fan (`src/unogame/handlayout.ts`) that always fits the width it has, so there is no scrolling. Each card keeps its top-left corner showing. If even the narrowest strips would not fit, the hand wraps into rows, each overlapping the one above with its top strip showing. The focused or hovered card comes to the front.
- On a phone held sideways (landscape and 500 pixels tall or less) the page has a narrow side column down the right with the game title, the room code as a small badge and, for the host, one "Room" menu holding Copy join link, End round, End room and Leave game (see the next point). The table is on the left: whose turn it is and the other players as small pills on the left, the piles in the middle, and your buttons (Say Uno, Catch, Keep) in a column of tall buttons on the right, with your hand across the bottom. The hand, piles and buttons stay on screen without scrolling at 874 by 402, 960 by 448 and 667 by 320 pixels (on the smallest, the hints under the buttons are only read out, not shown). A hand of 50 or more cards and a table of ten players scroll. The other players are two rows at most and scroll inside their box, which becomes a keyboard stop while it scrolls. The page order is unchanged, so the keyboard visits the side column (the info button, then the Room menu) before the table.
- While the table shows, the host’s room buttons are one "Room" menu at every size, beside the room code as a small badge. In the lobby they are shown in full, with the room code large for reading out and, where the browser has a share sheet, a Share invite button. The other players are small pills that wrap, not a scrolling row, so the current player is never hidden; "Waiting" is left out and "Playing" and "Uno?" stay. The hint under Say Uno! is only read out. On tall screens the hand’s cards are up to 132 pixels wide.
- In every view, the colour in play is also drawn as a shape on the corner of the discard pile, an orange bar sits over your hand while it is your turn, and Say Uno! fills in and pulses three times (not at all with reduced motion) when saying it matters.

### Table tests

`tests/admin/09_unotable.spec.ts` checks the table at its awkward sizes and states: two and ten players, long names, a large hand, catching Uno, the colour picker and the Uno button, at 320 and 640 pixels, with axe in both colour schemes. It signs in as the host, then writes synthetic tables into a real room with the Admin SDK. They are real engine states from `tests/unogame-preview.ts`, dealt with a fixed shuffle, so the page, its listeners and the server commands are the ones players use. The temporary `/admin/unopreview` page that used to do this has been removed.

## Game service

Uno rooms share the buzzer's room code, join limits, expiry and cleanup (`src/rooms/service.ts`), told apart by a `game` field on the room (`buzzer` when missing). A room holds two to ten Uno players, or twenty for the buzzer, and each game refuses the other's rooms and commands. Sign-in is separate: Uno guests have `uno-` identities, an `unoRoom` token claim and a `uno-guest-<code>` cookie limited to `/api/uno`, so a buzzer sign-in does nothing in an Uno room, or the other way round.

Everything is decided on the server in `src/unogame/service.ts`, which runs the engine inside a Firestore transaction:

- **Lobby.** Joining adds a name to the room's player list. The host starts a round from the lobby (or after a finished round) with at least two players. Starting seats everyone listed, deals, and picks the seat after the previous starter. People who join mid-round wait for the next one.
- **Commands.** `/api/uno` takes `play`, `draw`, `keep`, `catch`, `sayUno` and `leave`, each with a `commandId`. A repeated command id changes nothing. The engine decides whether a move is legal, so most commands do not need the table's version. `catch` does, because it names nobody and could otherwise land on a different player than the one the catcher saw.
- **What is stored.** `gameRooms/{code}` is public to the room: the stage, seats, names, round scores, the public view and the latest events. `roomPrivate/{code}` holds the full round (stock order and every hand) and is never readable by browsers. `roomHands/{code}_{playerId}` is one player's hand and playable cards, readable only by that player while they are in the room. Only hands that changed are rewritten.
- **Leaving.** A seated player can leave, or be removed by the host, during a round. `removePlayer` shuffles their cards back into the draw pile, passes the turn on if it was theirs, and clears any Uno window that was theirs. If one player is left they win and the round ends. Their hand document is deleted. The host can also end a round early with `abandon`, which finishes it with no winner and no score, returning everyone to the lobby.
- **Retention.** A room and its hands expire six hours after it opens. A finished round also writes `roomResults/{code}_{round}`, kept for seven days after the round, so the winner and scores outlive the room.

## Playing online

`/games/uno` (`src/components/uno.tsx`) is the page for playing a round. It mirrors the buzzer: an authorised host creates a room, then everyone joins from a link or a four-character code. The host plays too, so they enter a name like anyone else.

- **Lobby.** Everyone sees the player list. The host copies the join link, removes players, starts the round (two or more players) or ends the room.
- **Table.** Seated players get `UnoTable`, fed by two listeners: the room document and their own hand document. Choosing a card, drawing, keeping, saying Uno and catching become commands to `/api/uno`. `catch` also sends the table version it was made against. Someone who joins mid-round waits for the next one.
- **Lost replies.** A command that gets no answer is sent once more with the same command id, which the server applies at most once. If that also fails, the player is told to look at the table before trying again. Moves are refused while offline or while the listener is serving cached data.
- **Announcements.** `src/unogame/announce.ts` turns the room's public events into sentences for the live region, and adds whose turn it is. It only ever sees public events.
- **After a round.** The room shows who won and the scoreboard. The host can play again, which deals a new round and moves the first turn on one seat. Abandoning a round and the rest of the lifecycle are still to come.
- **Saving to the tracker.** Between rounds, a host with exactly two players and at least one round won sees **Save to tracker**. They say which player is Cam (the other is Laura) and the date played, and `saveRoomToTracker` adds the room's scores to the Uno tracker as one finished historic game, with the note "Played online (room CODE)". It checks the caller owns the room and that the table has not changed. The game id comes from the room code and expiry (`trackerGameId`), and the room records it as `trackerGameId`, so a room is saved once and the button then reads "Saved to tracker". It adds one game however many rounds were played, so save when the session is over. The tracker's own code (`historicGameEntry`) does the counting, so lifetime totals and statistics match entries made on the history page.
- **Reloading.** The tab remembers the room, and the Firebase sign-in keeps the seat. A host's saved room only gives host controls while the host is signed in.

A second journey in the same file has three players, one of whom leaves mid-round, then the host ends the round and plays again. The first journey (`tests/admin/09_unoplay.spec.ts`) cannot know the random deal, so it draws once, then uses the Admin SDK against the emulator to leave one player on a last matching card and plays it. Playing every kind of card is covered by the engine tests. Saving to the tracker is tested in `tests/firebase/unoroom.test.ts` and, with the shared scoreboard, in `tests/admin/07_uno.spec.ts` (desktop Chrome only).
