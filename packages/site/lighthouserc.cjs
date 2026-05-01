module.exports = {
  ci: {
    collect: {
      staticDistDir: "packages/site/dist",
      url: ["/", "/docs/", "/docs/quickstart/"],
      settings: {
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
        emulatedFormFactor: "mobile",
        chromeFlags: "--no-sandbox",
      },
      numberOfRuns: 3,
    },
    assert: {
      aggregationMethod: "median-run",
      assertions: {
        "categories:performance": ["warn", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.95 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
