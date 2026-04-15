import { loadConfig } from "./config.js";
import { createServer } from "./server.js";

async function main() {
  const config = loadConfig();
  const { app, startup, shutdown } = await createServer(config);

  // Start Dolt server and connection pool
  await startup();

  // Start Fastify — bound to 127.0.0.1 ONLY (security: no LAN access)
  await app.listen({ host: config.host, port: config.port });

  console.log(`\n  Pearl backend running at http://${config.host}:${config.port}`);
  if (config.needsSetup) {
    console.log("  Setup required — open the frontend to configure your project\n");
  } else {
    console.log(`  Dolt SQL server on port ${config.doltPort}\n`);
  }

  // Graceful shutdown
  const onSignal = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    await app.close();
    await shutdown();
    process.exit(0);
  };

  process.on("SIGINT", () => void onSignal("SIGINT"));
  process.on("SIGTERM", () => void onSignal("SIGTERM"));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
