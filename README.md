![Vercel Deploy](https://deploy-badge.vercel.app/vercel/almostyellow)
[![Playwright tests](https://github.com/cjrace/almostyellow/actions/workflows/playwright.yml/badge.svg)](https://github.com/cjrace/almostyellow/actions/workflows/playwright.yml)
[![CodeQL](https://github.com/cjrace/almostyellow/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/cjrace/almostyellow/actions/workflows/github-code-scanning/codeql)

# Almost yellow

Our own personal site of games, cocktails and all the other good stuff.

## Getting Started

This project was bootstrapped with [Create Next App](https://nextjs.org/docs/api-reference/create-next-app).

Start by installing dependencies:

```bash
npm install
```

To run the development server (use `Ctrl-C` if running in VSCode to cancel the development server):

```bash
npm run dev
```

### Build / compile

To compile the code, which you should do before running the tests, run:

```bash
npm run build
```

### Tests

Basic end to end tests have been set up using [Playwright](https://playwright.dev/), to run them locally run:

```bash
npm run test
```

### Handy scripts 

View other available commands using:

```bash
npm run
```

## Deployment

This site is deployed to the following places using [Vercel](https://vercel.com/):

From the `main` branch:
* https://www.almostyellow.co.uk/
* https://almostyellow.co.uk/ (redirects to www)
* https://almostyellow-nu.vercel.app/ (redirects to first link)
