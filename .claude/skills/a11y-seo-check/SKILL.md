---
name: a11y-seo-check
description: Check the accessibility and SEO behaviour affected by an Almost Yellow UI change, using relevant automated tests and focused browser checks.
---

# Accessibility and SEO check

Follow the "Accessibility and SEO" section of AGENTS.md. Choose checks based on the behaviour and routes the change affects.

## 1. Set the scope

Read the diff and follow component and CSS imports to identify affected routes and states. A page-specific CSS module only affects its consumers. For shared layout, theme or component changes, run relevant automated coverage across consumers and choose representative pages for each distinct layout or interaction. Expand coverage if a failure or wider risk warrants it.

New public routes need discovery and page metadata. Documentation-only changes do not need browser checks.

## 2. Run relevant tests

Use the existing tests for the changed behaviour. Accessibility and SEO specs can be run together:

```bash
pnpm test:e2e tests/public/06_seo.spec.ts tests/public-firestore/04_a11y.spec.ts tests/admin/07_a11y.spec.ts
```

Add `--no-build` when the current build includes the changes. Use `-g` to select affected routes or states during development; the full repository suite remains the broader regression check. Add coverage when a new dialog, error or interaction introduces behaviour existing tests do not exercise.

## 3. Inspect the changed UI

Use `pnpm serve:test` for a preview with synthetic Firebase fixtures, or add `--no-build` to reuse an unchanged build. Choose the relevant checks:

- Controls and focus: use changed controls by keyboard and check focus after actions, including closing dialogs.
- Colours: inspect both schemes when appearance, contrast or focus indicators change.
- Layout and text: inspect affected desktop and phone layouts, including 320px and 200% zoom where relevant.
- Dynamic content: check names and announcements for changed dialogs, errors and results.
- Motion: check reduced motion and flashing when effects or timing change.

Check representative pages and changed states rather than repeating untouched journeys. Browser automation and screenshot inspection can supplement hand checks; describe which methods were used. If a browser check cannot run, state the limitation rather than claiming it passed.

## 4. Report

Summarise the scope, test results, browser checks and any limitations. Include representative matching before/after screenshots for visible changes, following AGENTS.md. Automated checks alone do not establish complete WCAG conformance.
