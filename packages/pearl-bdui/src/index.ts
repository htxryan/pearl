import { loadConfig } from "./config.js";
import { logger } from "./logger.js";
import { createServer } from "./server.js";

async function main() {
  const config = loadConfig();
  const { app, startup, shutdown } = await createServer(config);

  // Start Dolt server and connection pool
  await startup();

  // Start Fastify — bound to 127.0.0.1 ONLY (security: no LAN access)
  await app.listen({ host: config.host, port: config.port });

  app.log.info({ host: config.host, port: config.port }, "Pearl backend running");
  if (config.needsSetup) {
    app.log.info("Setup required — open the frontend to configure your project");
  } else {
    app.log.info({ doltPort: config.doltPort }, "Dolt SQL server ready");
  }

  // Graceful shutdown
  const onSignal = async (signal: string) => {
    app.log.info({ signal }, "Received signal, shutting down");
    await app.close();
    await shutdown();
    process.exit(0);
  };

  process.on("SIGINT", () => void onSignal("SIGINT"));
  process.on("SIGTERM", () => void onSignal("SIGTERM"));
}

main().catch((err) => {
  logger.fatal({ err }, "Fatal error");
  process.exit(1);
});
