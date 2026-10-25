// Settings for the Playwright tests, used by scripts/e2e.mts and
// playwright.config.ts. These only unlock the throwaway Docker database from
// docker-compose.test.yml, so they are safe to commit. Anything already set in
// the environment wins, which is how CI supplies its own generated secrets.
const testEnv = {
  POSTGRES_URL: "postgres://postgres:postgres@localhost:5432/main",
  AUTH_URL: "http://localhost:3000",
  AUTH_SECRET: "almost-yellow-local-test-secret",
  TEST_EMAIL: "test@example.com",
  TEST_PASSWORD: "almost-yellow-test",
};

for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] ??= value;
}
