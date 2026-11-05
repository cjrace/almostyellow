# Permanent space for the confetti credit

The page, dialogs and drawers reserve a permanent `2.5rem` bottom gap (40px at the default text size). The test badge measures about 27px on phones and 31px on desktop. Screen-filling games size themselves above the gap, and Back to top sits above it. Page spacing stays the same when the badge appears or disappears.

The DOM observer and badge measurements have been removed. A CSS scroll margin gives native keyboard scrolling enough room to keep focused fields clear in Safari. The games list lets its artwork shrink slightly further in short desktop windows so all six Play buttons still fit.

Before is `fcf2a084e538efdf92a5007cf0e2c4a24f44169b`; after is `1c73308`. Each full-page pair uses matching synthetic Firebase fixtures, viewport, colour scheme and game state at 320 × 640. The game board uses the same random seed, and the credit is mocked locally.

| View | Before | After |
| --- | --- | --- |
| Irish Bingo, phone, dark | [Before](before-irishbingo-mobile.png) | [After](after-irishbingo-mobile.png) |
| Active Snakes and Ladders with credit, phone, dark | [Before](before-snakes-mobile.png) | [After](after-snakes-mobile.png) |

Additional inspected after views: [games list at 1280 × 800](after-games-desktop.png), [whisky rating dialog in the light scheme at 320 × 640](after-journal-dialog-mobile.png). Visible artwork was allowed to load and dialogs to finish opening before capture.

## Scope and checks

The monthly health feature, Lighthouse dependency, dependency auditor and reporting bot are removed. All six script files added by the PR are removed; the fixture preview reuses the existing end-to-end runner and test server. The checking guidance now follows component and CSS consumers, with representative manual checks for shared changes.

The targeted layout, fixed-gap and focus checks passed 27 tests across Mobile Chrome, Desktop Chrome and Mobile Safari without retries. Separate Uno dialog checks passed in both colour schemes, including hovered destructive-button contrast. The existing layout suite covers complete games with the bottom gap always present.

The final full `pnpm test --no-format --no-build` run passed 199 unit tests, 180 Firebase tests and 569 browser tests with no failures, skips or flaky passes, after a fresh production build. Repository-wide formatting also passed. [Before measurements](before-measurements.json) and [after measurements](after-measurements.json) record the representative viewports; neither game page has horizontal or vertical overflow in Chrome or WebKit.

Browser automation and screenshot inspection are distinct from hands-on checks; the interactive browser is disabled in Work settings, so actual 200% browser zoom and physical-device or screen-reader checks are not verified.
