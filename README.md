[![Vercel Deploy](https://deploy-badge.vercel.app/vercel/almostyellow)](https://www.almostyellow.co.uk/)
[![Playwright tests](https://github.com/cjrace/almostyellow/actions/workflows/playwright.yml/badge.svg)](https://github.com/cjrace/almostyellow/actions/workflows/playwright.yml)
[![CodeQL](https://github.com/cjrace/almostyellow/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/cjrace/almostyellow/actions/workflows/github-code-scanning/codeql)
[![Linting](https://github.com/cjrace/almostyellow/actions/workflows/lint.yml/badge.svg)](https://github.com/cjrace/almostyellow/actions/workflows/lint.yml)
[![Code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat)](https://github.com/prettier/prettier)

# Almost yellow

Our own personal site of games, cocktails and all the other good stuff.

## Getting Started

This project was bootstrapped with [Create Next App](https://nextjs.org/docs/api-reference/create-next-app), and uses [App Router](https://nextjs.org/docs/app). Package management is handled by [pnpm](https://pnpm.io/). There is a supporting Postgres database that can be managed within [Vercel](https://vercel.com/) and is hosted by [Neon](https://neon.tech/). Main libraries used so far are:

Styling and components

- [Mantine](https://mantine.dev/)
- [Tabler icons](https://tabler-icons.io/)

Database

- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)

Auth

- [Firebase Authentication](https://firebase.google.com/docs/auth)

### Run locally

Start by installing dependencies:

```bash
pnpm install
```

Then you'll need to setup an `.env` file with the credentials needed to access the user database and manage the auth, follow the example from `.env.example`.

You can run the development server (automatically opens a browser tab to preview the site):

```bash
pnpm dev
```

## Tests

[Prettier](https://prettier.io/) is used for code formatting, [ESLint](https://eslint.org/) for linting, [Vitest](https://vitest.dev/) for unit tests and [Playwright](https://playwright.dev/) for end to end tests. The Firebase migration is also tested against the Firebase emulators.

To format all scripts, run linting checks, run the unit and emulator tests, compile a production build, and then run the end to end tests run:

```bash
pnpm test
```

None of the tests use production data. The end to end tests run against a throwaway Postgres database in Docker, and the Firebase tests run against local emulators.

### What you need installed

Running `pnpm test` needs two things on top of Node and pnpm:

- **Docker** for the end to end tests. On Windows and Mac install [Docker Desktop](https://www.docker.com/products/docker-desktop/), `pnpm test:e2e` starts it for you if it is not already running.
- **Java 21 or later** for the Firestore emulator. Check with `java -version`. If it is missing, install it and then open a new terminal so it is picked up:

  ```bash
  winget install EclipseAdoptium.Temurin.21.JDK
  ```

  On Mac use `brew install --cask temurin@21`, and on Linux install `openjdk-21-jdk` with your package manager.

The tests use fixed ports, so stop `pnpm dev` (port 3000) and `pnpm emulators` (ports 8080 and 9099) before running them. If a port is in use the end to end script says which one.

### Running one set of tests

```bash
pnpm test:unit    # Unit tests, no Docker or Java needed
pnpm test:rules   # Firestore Security Rules only
pnpm test:ci      # All the Firebase emulator tests
pnpm test:e2e     # Build, then the Playwright tests against the Docker database
```

See [AGENTS.md](AGENTS.md) for how the test database, fixtures and Firebase safeguards work.

### Pre-commit hooks

[Husky](https://typicode.github.io/husky) is used to manage pre-commit hooks, currently this is used to enforce [Prettier](https://prettier.io/) formatting on all code.

### Handy scripts

View other available commands, including for running linting, formatting (including how to check format without making changes), compiling and more using:

```bash
pnpm run
```

## Deployment

This site is deployed to the following places using [Vercel](https://vercel.com/), deploys are triggered from pushes to the `main` branch.

- https://www.almostyellow.co.uk/
- https://almostyellow.co.uk/ (redirects to www)
- https://almostyellow-nu.vercel.app/ (redirects to first link)
