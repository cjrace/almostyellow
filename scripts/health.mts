// Builds and checks public pages against the fixture-backed Firebase emulators.
// --no-build reuses the last build. Reports go in health-reports/ and .lighthouseci/.
import { runBrowserChecks } from "./emulators.mts";

await runBrowserChecks("playwright.health.config.ts");
