# Uno tracker

`/games/uno-tracker` is a public, mobile-first tracker (the Tracker, Statistics and History pages share a segmented control) for Cam and Laura. Anyone can view scores, `/games/uno-tracker/stats` and `/games/uno-tracker/history`; only an account on the existing Firebase allowlist can start games, score, finish games or add historic games.

## Playing and finishing

Each won round adds one point. The smaller minus button records a separate correction. A game ends only after an authorised player confirms **Finish game**, while connected and with this device’s saved changes synced. The server checks the displayed game version; a change from another device requires a fresh confirmation. Starting the next game is a separate action.

The history page lists every completed game with filters and a scoring history for each, and has an authorised **Add historic game** form for both scores, a date and free-text notes. Dates can be exact, month only, year only or unknown. Each entry increases lifetime totals once and contributes to completed-game statistics. Unknown dates are excluded from trends and streaks, and year-only dates are excluded from monthly wins. Live games on the same date are ordered by completion time. Historic entries have no recorded time: they come before live games on that date, in stable ID order. Approximate dates can affect streak ordering. Historical entries record final totals, so they have no individual round history.

## Status messages

A single status pill in the shared header (the same on all three pages) shows the sync and connection state on one fixed-height line, so changes in state never move the content below it. Tapping it opens a dialog with the full explanation, the offline time, and Retry and Discard for any change that needs attention. While there is a problem the pill is an alert named "Scores need attention".

## Offline use

Open the tracker online and sign in before taking a device offline. The pages cache themselves for offline reopening in the background. IndexedDB stores the last confirmed scores, the account identifier, a game-scoring permission and every pending change. A tap changes the displayed score only after its storage transaction completes. The account identifier and scoring permission cannot authenticate a request: the server still requires the existing session cookie.

A service worker scoped to `/games/uno-tracker` caches the public tracker, statistics and history shells and static assets. Pages and assets are fetched from the network first, so a rebuilt file is never hidden by an older cached copy with the same URL; the cache is only the offline fallback (after a 4 second timeout for assets). It does not cache session checks, server-action responses, credentials or other routes. Offline totals include provisional changes on this device; cached statistics show confirmed scores and may be outdated. Reopening an initially unvisited page offline is not supported.

Pending changes replay in ordered batches of up to 25 on page load, reconnection, foregrounding and new scores. While visible, pages also check for shared updates every five seconds by reading only the scoreboard version, and fetch the full state only when it has changed. Failures retry with backoff, capped at a minute. A shared coordinator per tab owns polling and retries. A browser lock serialises its server operations across tabs; score taps save independently of that lock. An IndexedDB transaction acknowledges event IDs and authoritative scores together, and older server snapshots cannot replace newer ones. Local transaction revisions prevent late reads from rolling the display back. Existing version-1 browser records and queues remain readable. Event IDs make server retries idempotent, including a response lost after its transaction commits.

If an account changes, another account’s pending events remain stored and do not sync under the new account. A rejected correction stays visible for explicit retry or confirmed discard. Storage failures show a warning and do not confirm an award. Browser data deletion, private browsing and storage eviction can still remove unsynced data. No background-sync support is needed: if the app is closed, reopening it resumes replay.

Historic-game entry remains available while changes await sync. If a returned snapshot could already include unacknowledged events, it is deferred until reconciliation, and the history page confirms that the entry was saved. Cache-storage failures leave successful online asset requests usable and mark offline reopening as unavailable.

## Late rounds and security

`uno/scoreboard` stores lifetime totals and the active/last-finished game references. `unoGames/{id}` holds live or historic games; its `events` subcollection holds immutable scoring events. Private `unoLeases/{id}` documents bind a scoring permission to an authorised account and original game. Direct browser reads and writes to these collections are denied; public server reads omit event account identifiers and scoring permissions.

A scoring permission can only be issued while its game is active. When an offline device reconnects, its previously issued permission lets queued changes amend that original game, even if a new game has started. Scores, lifetime totals and the amended result update atomically; statistics derive from the revised game records. Ordinary controls never add points to a game known to be completed.

There is no trusted offline browser clock. The server can verify that the device’s permission predates completion, but cannot prove when an authorised person actually tapped. A holder of an old permission could fabricate a replay. Strictly preventing that would require rejecting some legitimate late offline rounds. This implementation accepts late rounds from any scoring permission that was issued while its game was active, for 7 days after that game finishes. Finishing a game stamps its permissions with that expiry, rejects later rounds once it passes, and deletes any expired permissions, so the `unoLeases` collection stays small. Permissions and account identifiers are never exposed by public reads.

## Validation

Run the repository commands in `AGENTS.md`. New coverage lives in `tests/unit/uno.test.ts`, `tests/unit/uno_controller.test.ts`, `tests/firebase/uno.test.ts`, `tests/admin/07_uno.spec.ts` and `tests/public/04_uno.spec.ts`, with authentication and Security Rules checks in the existing suites. The shared-scoreboard mutation tests run sequentially in desktop Chrome to avoid cross-project interference; public layout checks run in all configured browser projects. Automated tests use only the local demo-project Firebase emulators.

Real Android Chrome and iPhone Safari checks remain necessary for operating-system app closure, browser storage policies and real device safe areas; desktop emulation cannot establish those behaviours.
