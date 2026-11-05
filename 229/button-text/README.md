# Homepage button text correction

Before: `ce015e9c8f86d80b32d09e23a453193289977e41`. After: `911149e` (homepage fix), followed by `fcf2a08` (Safari checks). The automatic button height left its contents 9px above centre. The correction centres the contents, gives wrapped lines more space and leaves room for descenders. Button wording is unchanged.

Full-page pairs use the dark scheme and identical viewports: desktop 1280 × 800 and phone 320 × 700. The wider PR gallery's homepage after captures have also been refreshed at their original sizes.

| View | Before | After |
| --- | --- | --- |
| Desktop | [Before](before-desktop.png) | [After](after-desktop.png) |
| Phone | [Before](before-mobile.png) | [After](after-mobile.png) |

## Checks

The full `pnpm test --no-format` run passed: 214 unit tests, 180 Firebase tests and 569 Playwright tests, with no failures, skips or flaky passes. Repository-wide formatting also passed. The new homepage alignment tests failed on the original build at both widths before passing with the fix. Both previously unreliable Safari scenarios then passed ten repetitions each without retries: 20 passed, none failed.

The CSS module is only imported by the homepage. Other button styles were searched for the same automatic-height override; no matching button override was found. The full suite also covers the shared confetti change across the games and other pages.

- Keyboard: automated Chrome traversal reached the skip link, header controls and all six homepage links with visible outlines; Enter on the games link navigated correctly. Interactive hand checks could not run because the browser is disabled in Work settings.
- Both colour schemes: Chrome and WebKit full-page captures were taken at 320px, 390px and 1280px. Representative dark and light captures were visually inspected; button text is centred and readable.
- Reflow and zoom: automated measurements found no horizontal overflow or clipped labels at those widths; every homepage button is at least 24 × 24px. Actual 200% browser zoom could not be checked interactively because the browser is disabled.
- Announcements: the homepage change adds no results or dialogs. The full suite's axe and dialog/announcement checks passed.
- Motion: the full suite's reduced-motion checks passed. The confetti test waits until the media preference is applied before completing its delayed download; playback queries the current preference after loading. The dice timing test uses a repeatable board to avoid a random dialog racing the Players action. Interactive motion checks could not run because the browser is disabled.

[Automated label, target-size and keyboard measurements](measurements.json). These checks do not establish complete WCAG conformance.
