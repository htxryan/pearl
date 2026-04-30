module.exports = {
  ci: {
    collect: {
      staticDistDir: "packages/site/dist",
      url: ["/", "/docs/", "/docs/quickstart/"],
      settings: {
        preset: "desktop",
        chromeFlags: "--no-sandbox",
      },
      numberOfRuns: 1,
    },
    assert: {
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
