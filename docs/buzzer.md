# Quiz buzzer

An authorised user creates a six-hour room at `/games/buzzer`. Guests choose a unique name and join by code or link. Hosting does not consume a player place. The host may also join as a player. Rooms support 20 active players.

The host opens buzzing, closes it to preserve the current results, or resets to prepare a new question. Opening is always a separate action. New and returning players joining an open question wait until the next question. Leaving frees a place; removal blocks that guest identity from rejoining. Already-recorded buzzes remain in the current results.

Results use Firestore commit timestamps, with millisecond gaps and joint places for exactly equal timestamps. Network and processing delays affect close finishes. This is a party-game buzzer, not a measurement of physical reaction time.

## Deployment

Enable Anonymous sign-in in the Firebase Authentication console before releasing the page. Deploy `firestore.rules` and `firestore.indexes.json` before the application. The existing Firebase server and browser configuration is reused; no additional credentials or hosting platform are needed.

The public landing page is indexed; room query URLs are noindex and canonical to the landing page. No room URLs are added to the sitemap.

No TTL policy is required. On authorised room creation, the server deletes at most 100 expired records from each buzzer collection. Expired records remain inaccessible before deletion, but may remain stored if nobody hosts another room. Cleanup failures are logged and do not prevent hosting. Deletions and other operations consume normal Firestore quotas.

## Identity and recovery

Guests use a named Firebase app with local authentication persistence. Admin browser authentication remains in memory in the default app. A verified guest UID owns each membership; a display name cannot recover someone else's place. Browser storage deletion loses the guest identity. Tabs with the same identity share membership.

Server actions check the authorised host session and room ownership. Guest commands check same origin, ID tokens and membership. Firestore rules allow member/owner reads and deny browser writes. The private room and membership collections never appear in public snapshots.

Buzzes are never queued offline. A failed response triggers a server read to reconcile the result. Until reconciliation succeeds, another buzz is blocked. Previous-round requests cannot enter a new round. Host commands use version checks and command receipts; one document per round/player deduplicates buzzes.

## Validation

Run `pnpm test`. The buzzer tests cover ordering and ties, transactional capacity, 20 concurrent buzzes, duplicate requests, late joining, removal, private reads, expiry and cleanup. Browser journeys exercise the actual API and host session against synthetic emulator users.

The concurrency test logs emulator confirmation latency and an estimate of listener reads. Emulator performance does not predict deployed latency. Before relying on the game for a quiz, use isolated non-production Firebase data to record median, 95th-percentile and maximum confirmation/display times on real phones and laptops, including weaker connections. Do not run automated tests against production.

Complete focused keyboard, announcement, light/dark, narrow-screen and zoom checks before release. Consider a dedicated backend for the buzzer only if measured behaviour warrants it.
