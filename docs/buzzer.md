# Quiz buzzer

An authorised host chooses Create a room at `/games/buzzer` for up to 20 players. Sign-in returns to the buzzer if needed. Creating a room automatically generates a four-character code using letters and numbers, with ambiguous characters left out. A shared link opens directly at name entry; Join with a code is a fallback for guests entering the code manually. Guests need no account.

Players see the buzz button first, with their place beneath it ("You're 2nd, 84 ms behind first"), then the buzz order and a collapsed player list. The host gets Reset, Copy join link and End room in one row above the results. A single Leave game button frees a player's seat and returns to the games page; a host who leaves keeps the room open and returns to it in the same tab until it ends or expires.

The host can join as a player too. Buzzing is always open, including for players who join mid-question. Each player can buzz once per question. Reset clears the results and immediately starts the next question; leaving and rejoining does not give a player another buzz in the same question. Rooms end after six hours or when the host ends them.

Reset advances the round, so delayed requests from an earlier question cannot enter the new results.

## Recovery and maintenance

Hosting uses the existing authorised session. Player sign-in is separate: a failure there does not stop a host creating, restoring or controlling a room, but the host needs a player identity to join the game. Sign-in errors show the Firebase error code so configuration and connection problems can be diagnosed.

Keep user self-service account creation disabled in Firebase Authentication. Joining uses the Admin SDK to create a guest record only after the room accepts membership, then signs the browser in with a custom token. The Anonymous provider is not needed. See [Firebase custom tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens).

Each room has a separate guest identity and named Firebase app, independent of admin sign-in and other rooms. The server creates a random 256-bit recovery key in a host-only, HttpOnly cookie, limited to `/api/buzzer` for six hours with `SameSite=Strict` and `Secure` except on localhost. JavaScript never receives that key; only its room-specific hash reaches Firestore. The browser confirms it can return the cookie before a join allocates a seat, so blocked cookies create no guest records. Firebase authentication persists across refreshes; deleting browser storage loses that identity. Leaving frees a place, and the host can remove unwanted entries. A recorded buzz remains in the current results after a player leaves.

A room admits at most 20 active players and creates at most 100 guest identities over its lifetime. Existing guests can retry or rejoin after that creation limit; a host can create another room if necessary. Guest tokens grant access through room membership, never the authorised-user allowlist. The guest commands route (`src/rooms/route.ts`, shared with online Uno) verifies the token's signature and expiry but does not look up revocation, which saved a round trip on every move. A removed player's token therefore stays valid until it expires, and the room transaction refuses it because their membership is no longer active (`tests/firebase/buzzer.test.ts`).

Buzzes are never queued offline. An uncertain response must be reconciled with the server before another attempt. Server timestamps determine order; exactly equal timestamps share a place. Network and processing delays affect close finishes.

Expired rooms are inaccessible immediately. Creating a room deletes up to 100 expired records per buzzer collection, including the Auth accounts tracked by expired guest memberships. Failed Auth deletion leaves the membership records for a later cleanup attempt. Records may remain stored while nobody hosts; cleanup uses normal Firebase quotas.

Run the repository checks in `AGENTS.md`. Automated tests use local Firebase emulators. Real phone/laptop latency and assistive-technology announcement checks remain part of release validation; emulator timings do not establish deployed performance.
