[![Vercel Deploy](https://deploy-badge.vercel.app/vercel/almostyellow)](https://www.almostyellow.co.uk/)
[![Playwright tests](https://github.com/cjrace/almostyellow/actions/workflows/playwright.yml/badge.svg)](https://github.com/cjrace/almostyellow/actions/workflows/playwright.yml)
[![CodeQL](https://github.com/cjrace/almostyellow/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/cjrace/almostyellow/actions/workflows/github-code-scanning/codeql)
[![Linting](https://github.com/cjrace/almostyellow/actions/workflows/lint.yml/badge.svg)](https://github.com/cjrace/almostyellow/actions/workflows/lint.yml)
[![Code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat)](https://github.com/prettier/prettier)

# Almost yellow

Our own personal site of games, cocktails and all the other good stuff.

## Getting Started

This project was bootstrapped with [Create Next App](https://nextjs.org/docs/api-reference/create-next-app), and uses [App Router](https://nextjs.org/docs/app). Package management is handled by [pnpm](https://pnpm.io/). Main libraries used so far are:

Styling and components

- [Mantine](https://mantine.dev/)
- [Tabler icons](https://tabler-icons.io/)

Database

- ?

Auth

- something around auth?

### Run locally

Start by installing dependencies:

```bash
pnpm install
```

Then you'll need to setup an `.env.local` file with the credentials needed to access the user database and manage the auth. The database can be managed within [Vercel](https://vercel.com/) and is hosted by [Neon](https://neon.tech/). Once you've got what you need in place, then you can run the development server (automatically opens a browser tab to preview the site):

```bash
pnpm dev
```

## Tests

[Prettier](https://prettier.io/) is used for code formatting, [ESLint](https://eslint.org/) is used for linting and basic end to end tests have been set up using [Playwright](https://playwright.dev/).

To format all scripts, run linting checks, compile a production build, and then run the end to end tests run:

```bash
pnpm test
```

### Pre-commit hooks

[Husky](https://typicode.github.io/husky) is used to manage pre-commit hooks, currently this is used to enforce [Prettier](https://prettier.io/) formatting on all code.

### Handy scripts

View other available commands, including for running linting, formatting (including how to check format without making changes), compiling and more using:

```bash
pnpm run
```

## Deployment

This site is deployed to the following places using [Vercel](https://vercel.com/), trigger from pushes to the `main` branch:

- https://www.almostyellow.co.uk/
- https://almostyellow.co.uk/ (redirects to www)
- https://almostyellow-nu.vercel.app/ (redirects to first link)
