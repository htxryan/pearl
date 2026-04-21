/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies lead to hard-to-debug issues",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "shared-no-import-frontend",
      severity: "error",
      comment: "@pearl/shared must not import from @pearl/frontend",
      from: {
        path: "^packages/shared/",
      },
      to: {
        path: "^packages/frontend/",
      },
    },
    {
      name: "shared-no-import-backend",
      severity: "error",
      comment: "@pearl/shared must not import from pearl-bdui",
      from: {
        path: "^packages/shared/",
      },
      to: {
        path: "^packages/pearl-bdui/",
      },
    },
    {
      name: "frontend-no-import-backend-internals",
      severity: "error",
      comment:
        "@pearl/frontend must not import pearl-bdui internals (only @pearl/shared is allowed)",
      from: {
        path: "^packages/frontend/",
      },
      to: {
        path: "^packages/pearl-bdui/",
      },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
