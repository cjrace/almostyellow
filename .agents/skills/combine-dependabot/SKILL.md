---
name: combine-dependabot
description: Consolidate selected Dependabot updates for almostyellow into one local branch, check package compatibility, run repository validation and prepare the changes for review. Use for monthly dependency updates or combining dependency PRs in this repository.
---

# Combine Dependabot updates

Prepare one focused dependency update using the user's selected PRs or package versions. Follow `AGENTS.md` for repository conventions and clarification requirements.

## Establish the scope

- Read `AGENTS.md`, `package.json`, `pnpm-workspace.yaml` and `playwright.config.ts`. Check the current branch, working tree and index before changing anything.
- If asked to discover updates, inspect the current open Dependabot PRs and their package diffs. Otherwise, use the supplied targets. Map each selected PR to its packages and versions, removing duplicates.
- Check related packages and peer requirements. Keep `react` and `react-dom` aligned; check compatible React types and Next.js tooling. Explain any necessary companion update before applying it. Check major upgrades against the project's runtime, including deployed Node when changing `@types/node`; report unavailable deployment information.
- Preserve unrelated changes and staged work. Do not stash, reset or overwrite them. If they prevent the update, clarify how to proceed.

## Prepare the branch and environment

- For a new monthly update from a clean checkout, fast-forward `main`, then create the branch using the current convention in `AGENTS.md`. If the branch already exists, inspect it and clarify whether to continue it. Honour requests to use another base or an existing branch.
- Use the pnpm version declared in `packageManager`; do not upgrade pnpm as part of the update.
- On Windows, check that Node, pnpm, Git and `taskkill` are available. Preserve the existing PATH and add discovered directories with semicolons for this shell only.
- If pnpm reports a store mismatch, inspect the store linked to `node_modules`. Use that existing store where available, passing its setting to nested pnpm commands too. Do not change global configuration or reinstall dependencies merely to work around a path mismatch.

## Apply and validate

- Run a targeted `pnpm update` with explicit package versions. Preserve the repository's existing version-range style. Avoid a broad update that selects unrelated newer releases.
- Review both `package.json` and `pnpm-lock.yaml`. Confirm every selected target is covered, related versions agree and unrelated direct dependencies retained their locked versions. Explain additional transitive changes where needed.
- Format only the changed dependency files with the installed Prettier version. Prefer the following checks over `pnpm test`, which formats the whole repository:

  ```sh
  pnpm exec prettier package.json pnpm-lock.yaml --write
  git diff --check
  pnpm run build
  pnpm test:unit
  pnpm test:firebase
  pnpm test:e2e
  ```

  `pnpm run build` lints and checks the production build, but the browser tests need their own: `pnpm test:e2e` rebuilds with `tests/test-env.ts`, whose `SERVED_OVER_HTTP` leaves out `upgrade-insecure-requests`. Without it, WebKit fetches the scripts over HTTPS and the admin pages never hydrate. Don't follow `pnpm run build` with `pnpm test-only`, which reuses that build, or run `pnpm exec playwright test` directly, which skips the emulators.

- Re-read the scripts and Playwright configuration before running these commands. Do not stop an unrelated server. Playwright stops after 10 failed tests; when it does, rerun one failing spec on its own (`pnpm test:e2e --no-build <spec> --project=<name> --retries=0`) to diagnose it rather than rerunning the suite.
- Use existing environment variables and browser installations without printing secrets. Report missing prerequisites and the affected checks explicitly.
- Investigate failures before changing application code or tests. Distinguish dependency regressions from environment problems. If cleanup hangs, inspect the processes and stop only processes started by this run. Retain the actual test result and exit status.

## Prepare the handover

- Review the final diff, formatting and whitespace checks. Report the branch, updated versions, validation results and unresolved compatibility questions.
- Stage changes only, do not commit, then provide a summary of the staged changes and any remaining issues for review.
