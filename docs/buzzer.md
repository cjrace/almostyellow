# Quiz buzzer

An authorised host creates a room at `/games/buzzer` for up to 20 players. Guests join by code or link without creating an account. The host can join as a player too. Open buzzing for each question; close it to freeze results, or reset to prepare the next question. Late joiners wait until the next question. Rooms end after six hours or when the host ends them.

## Recovery and maintenance

Hosting uses the existing authorised session. Player sign-in is separate: a failure there does not stop a host creating, restoring or controlling a room, but the host needs a player identity to join the game. Sign-in errors show the Firebase error code so configuration and connection problems can be diagnosed.

Keep user self-service account creation disabled in Firebase Authentication. Joining uses the Admin SDK to create a guest record only after the room accepts membership, then signs the browser in with a custom token. The Anonymous provider is not needed. See [Firebase custom tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens).

Each room has a separate guest identity and named Firebase app, independent of admin sign-in and other rooms. A random 256-bit key in local storage lets a failed join retry with the same identity; only its room-specific hash reaches Firestore. Treat that key as a credential. Firebase authentication persists across refreshes; deleting browser storage loses that identity. Leaving frees a place, and the host can remove unwanted entries. A recorded buzz remains in the current results after a player leaves.

A room admits at most 20 active players and creates at most 100 guest identities over its lifetime. Existing guests can retry or rejoin after that creation limit; a host can create another room if necessary. Guest tokens grant access through room membership, never the authorised-user allowlist.

Buzzes are never queued offline. An uncertain response must be reconciled with the server before another attempt. Server timestamps determine order; exactly equal timestamps share a place. Network and processing delays affect close finishes.

Expired rooms are inaccessible immediately. Creating a room deletes up to 100 expired records per buzzer collection, including the Auth accounts tracked by expired guest memberships. Failed Auth deletion leaves the membership records for a later cleanup attempt. Records may remain stored while nobody hosts; cleanup uses normal Firebase quotas.

Run the repository checks in `AGENTS.md`. Automated tests use local Firebase emulators. Real phone/laptop latency and assistive-technology announcement checks remain part of release validation; emulator timings do not establish deployed performance.
