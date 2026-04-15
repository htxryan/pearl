#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import { loadConfig } from "../dist/config.js";
import { createServer } from "../dist/server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const VERSION = JSON.parse(
  readFileSync(resolve(__dirname, "..", "package.json"), "utf-8")
).version;

async function main() {
  // Handle --version / --help before anything else
  const arg = process.argv[2];
  if (arg === "--version" || arg === "-v") {
    console.log(`pearl-bdui v${VERSION} — Beads Web UI`);
    process.exit(0);
  }
  if (arg === "--help" || arg === "-h") {
    console.log(`
  pearl-bdui v${VERSION} — Beads Web UI

  Usage: pearl-bdui [options]

  Starts the Pearl (Beads Web UI) server in the current directory.
  Looks for a .beads/ directory in the current or parent directories.

  Options:
    -h, --help     Show this help message
    -v, --version  Show version number
    --no-open      Don't open browser automatically

  Environment variables:
    PORT           Server port (default: 3456)
    DOLT_HOST      Dolt SQL server host (server mode)
    DOLT_PORT      Dolt SQL server port (default: 3307)
`);
    process.exit(0);
  }

  const config = loadConfig();
  const { app, startup, shutdown } = await createServer(config);

  // Start Dolt server and connection pool
  await startup();

  // Start Fastify
  await app.listen({ host: config.host, port: config.port });

  const url = `http://${config.host}:${config.port}`;

  console.log(`
  ${pc.bold(pc.cyan(" Pearl "))}${pc.dim(`v${VERSION}`)}

  ${pc.green(">")} Running at ${pc.underline(url)}
`);

  if (config.needsSetup) {
    console.log("  Setup required \u2014 configure your project in the browser\n");
  }

  // Auto-open browser (unless --no-open flag)
  if (!process.argv.includes("--no-open")) {
    const { default: open } = await import("open");
    open(url).catch(() => {
      // Silently ignore if browser can't be opened (e.g. headless server)
    });
  }

  // Graceful shutdown
  const onSignal = async (signal) => {
    console.log(`\n  Received ${signal}, shutting down...`);
    await app.close();
    await shutdown();
    console.log("  Goodbye!\n");
    process.exit(0);
  };

  process.on("SIGINT", () => void onSignal("SIGINT"));
  process.on("SIGTERM", () => void onSignal("SIGTERM"));
}

main().catch((err) => {
  console.error(`\n  ${pc.red("Fatal error:")}`, err.message || "Unknown error");
  process.exit(1);
});

