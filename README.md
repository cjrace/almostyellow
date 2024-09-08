[![Playwright Tests](https://github.com/cjrace/almostyellow/actions/workflows/playwright.yml/badge.svg)](https://github.com/cjrace/almostyellow/actions/workflows/playwright.yml)

# Almost yellow

Our own personal site of games, cocktails and all the other good stuff.

## Getting Started

This project was created with `npx create-react-app`.

Start by installing dependencies:

```bash
npm install
```

To run the development server (use Ctrl-c if running in VSCode to cancel the development server):

```bash
npm run dev
```

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


## Tests

Basic end to end tests have been set up using [Playwright](https://playwright.dev/), to run them locally run:

```bash
npx playwright test
```
