// Lighthouse CI settings, used by tests/lighthouse/lighthouse.spec.ts. The URLs
// come from src/routes.ts. Run it with pnpm test:lighthouse, never by hand, so
// it reads from the Firebase emulators.
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      settings: {
        // The canonical URLs point at the live site, which Lighthouse counts
        // as wrong when testing localhost. tests/public/06_seo.spec.ts checks
        // them instead.
        skipAudits: ["canonical"],
      },
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:seo": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        // Too noisy on shared CI runners to fail on
        "categories:performance": ["warn", { minScore: 0.8 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
