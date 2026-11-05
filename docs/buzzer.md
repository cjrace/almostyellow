# Quiz buzzer

An authorised host creates a room at `/games/buzzer` for up to 20 players. Guests join by code or link without creating an account. The host can join as a player too. Open buzzing for each question; close it to freeze results, or reset to prepare the next question. Late joiners wait until the next question. Rooms end after six hours or when the host ends them.

## Recovery and maintenance

Guest authentication persists in a named Firebase app, separate from admin sign-in. Refresh restores membership in the same browser; deleting browser storage loses that identity. Leaving frees a place, and the host can remove unwanted entries. A recorded buzz remains in the current results after a player leaves.

Buzzes are never queued offline. An uncertain response must be reconciled with the server before another attempt. Server timestamps determine order; exactly equal timestamps share a place. Network and processing delays affect close finishes.

Expired rooms are inaccessible immediately. Creating a room deletes up to 100 expired records per buzzer collection. Records may remain stored while nobody hosts; cleanup uses normal Firestore quotas.

Run the repository checks in `AGENTS.md`. Automated tests use local Firebase emulators. Real phone/laptop latency and assistive-technology announcement checks remain part of release validation; emulator timings do not establish deployed performance.
