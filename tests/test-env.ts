// Settings for the Playwright tests, used by scripts/e2e.mts and
// playwright.config.ts. They are always forced, so production values exported
// in a shell or kept in .env (which next start also reads, but never over the
// real environment) can never be tested against.

// Only the host matters: src/db.ts sends queries to the Neon proxy on port 4444
process.env.POSTGRES_URL = "postgres://postgres:postgres@localhost:5432/main";

// The Firebase emulators run as this project, see scripts/e2e.mts. Tests and
// the app both refuse to use the emulators with anything but a demo- project.
process.env.FIREBASE_PROJECT_ID = "demo-almostyellow";
