# PR 229 comparison and checks

Before: `47631a69989be14b244b68bf114ce9e231ca831d` (main). After: `1900e70069668103e2774f799cc620f263e087b3`.

The full-page pairs use the same synthetic Firebase fixtures, dark colour scheme (light for Uno) and viewports: desktop 1280 × 800, mobile 390 × 844, device scale factor 1. The badge is a deterministic copy of the vendor credit so comparisons do not depend on its network request. No production records appear. The active Snakes and Ladders game uses the same random seed.

[Complete local validation output](validation.txt). Browser inspection covered all 22 page templates in both colour schemes: desktop Chrome, Chrome and WebKit at 320px wide, and desktop Chromium at real 200% browser zoom. No horizontal overflow or clipped button labels remained. Focus traversal and screenshot review were supplemented by the suite's game, form, dialog, focus-return and reduced-motion journeys. WebKit's default Tab navigation skips links; desktop traversal covers those. No physical iPhone, VoiceOver or NVDA check was performed. These checks do not establish complete WCAG conformance.

## Performance measurement

Three paired runs per page, fresh isolated Chrome contexts, 390 × 844, 4× CPU slowdown, 150ms latency and 200,000 bytes/s download. Servers were warm and external requests blocked. Values are medians. Image bytes include all image requests during the observation window. Cocktails use the fixture placeholder image. These are local comparisons, not production Core Web Vitals.

| Page | Largest contentful paint, before → after | Image payload, before → after |
| --- | --- | --- |
| /games | 972 → 800 ms | 549852 → 5702 bytes |
| /games/irishbingo | 1020 → 820 ms | 149865 → 44715 bytes |
| /cocktails | 1388 → 892 ms | 11578 → 11578 bytes |

[Raw measurements](performance.json).

## Screenshots

Five representative pairs show distinct visible changes. Unchanged and repetitive page or state comparisons have been removed; the validation scope above is unchanged.

| Visible change | Before | After |
| --- | --- | --- |
| Homepage: removed broken Recipes link and reflowed desktop links | [Before](https://raw.githubusercontent.com/cjrace/almostyellow/pr-assets/229/before/home-desktop-page.png) | [After](https://raw.githubusercontent.com/cjrace/almostyellow/pr-assets/229/after/home-desktop-page.png) |
| Homepage: shorter phone link list | [Before](https://raw.githubusercontent.com/cjrace/almostyellow/pr-assets/229/before/home-mobile-page.png) | [After](https://raw.githubusercontent.com/cjrace/almostyellow/pr-assets/229/after/home-mobile-page.png) |
| Snakes and Ladders: dice control clear of the credit | [Before](https://raw.githubusercontent.com/cjrace/almostyellow/pr-assets/229/before/snakesandladders-mobile-playing-badge.png) | [After](https://raw.githubusercontent.com/cjrace/almostyellow/pr-assets/229/after/snakesandladders-mobile-playing-badge.png) |
| Irish Bingo: card and bottom controls fit above the credit | [Before](https://raw.githubusercontent.com/cjrace/almostyellow/pr-assets/229/before/games-irishbingo-mobile-badge.png) | [After](https://raw.githubusercontent.com/cjrace/almostyellow/pr-assets/229/after/games-irishbingo-mobile-badge.png) |
| Uno: phone scoring layout and light-scheme contrast | [Before](https://raw.githubusercontent.com/cjrace/almostyellow/pr-assets/229/before/uno-light-mobile-scoring-badge.png) | [After](https://raw.githubusercontent.com/cjrace/almostyellow/pr-assets/229/after/uno-light-mobile-scoring-badge.png) |

The final follow-up only removed a duplicate HTML string assertion after CodeQL flagged its comment-removal pattern. The existing JavaScript-disabled browser check still verifies server HTML. [Formatting, lint and all nine affected tests passed without retries](validation-followup.txt). Application code was unchanged after the full suite.

[Lighthouse scores](lighthouse-scores.json) · [Browser inspection measurements](inspection-summary.json).
