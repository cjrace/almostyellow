// Test values for every variable in .env.example, used by scripts/e2e.mts and
// playwright.config.ts. next build and next start also read .env, but only
// fill in variables that are not already set, so setting all of them here
// means nothing from .env or the shell is ever used in a test run.

// The Firebase emulators run as this project, see scripts/e2e.mts. Tests and
// the app both refuse to use the emulators with anything but a demo- project.
process.env.FIREBASE_PROJECT_ID = "demo-almostyellow";

// The Auth emulator accepts any API key
process.env.FIREBASE_API_KEY = "fake-api-key";
process.env.FIREBASE_AUTH_DOMAIN = "demo-almostyellow.firebaseapp.com";

// Empty rather than unset, so a real key in .env is not filled in. The
// emulators need no credentials, and tests/firebase/guard.ts refuses to run
// if this has a value.
process.env.FIREBASE_SERVICE_ACCOUNT_KEY = "";
