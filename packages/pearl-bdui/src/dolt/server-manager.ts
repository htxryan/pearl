import type { ResultPromise } from "execa";
import type { Config } from "../config.js";
import { logger } from "../logger.js";

export type DoltServerState = "stopped" | "starting" | "running" | "error";

type StateChangeListener = (state: DoltServerState) => void;

/**
 * Manages the lifecycle of a dolt sql-server process.
 * Handles starting, health checking, and auto-restart with debounce.
 */
export class DoltServerManager {
  private process: ResultPromise | null = null;
  private state: DoltServerState = "stopped";
  private consecutiveFailures = 0;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private startedAt: number | null = null;
  private stateChangeListeners: StateChangeListener[] = [];
  private readonly dbPath: string;

  constructor(
    private config: Config,
    dbPath?: string,
  ) {
    this.dbPath = dbPath || config.doltDbPath;
  }

  getState(): DoltServerState {
    return this.state;
  }

  getUptime(): number {
    if (!this.startedAt) return 0;
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }

  onStateChange(fn: StateChangeListener): () => void {
    this.stateChangeListeners.push(fn);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter((l) => l !== fn);
    };
  }

  private setState(newState: DoltServerState): void {
    const oldState = this.state;
    this.state = newState;
    if (oldState !== newState) {
      for (const fn of this.stateChangeListeners) {
        fn(newState);
      }
    }
  }

  async start(): Promise<void> {
    if (this.state === "running" || this.state === "starting") {
      return;
    }

    this.setState("starting");

    try {
      const { execa } = await import("execa");
      this.process = execa(
        this.config.doltPath,
        [
          "sql-server",
          "--host",
          "127.0.0.1",
          "--port",
          String(this.config.doltPort),
          "--no-auto-commit",
        ],
        {
          cwd: this.dbPath,
          reject: false,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      // Wait for the server to be ready by polling
      const ready = await this.waitForReady();
      if (ready) {
        this.setState("running");
        this.startedAt = Date.now();
        this.consecutiveFailures = 0;
      } else {
        this.setState("error");
        this.scheduleRestart();
      }

      // Monitor the process for unexpected exit
      this.process.then((result) => {
        if (this.state === "running") {
          logger.error({ exitCode: result.exitCode }, "Dolt server exited unexpectedly");
          this.setState("error");
          this.scheduleRestart();
        }
      });
    } catch (err) {
      logger.error({ err }, "Failed to start Dolt server");
      this.setState("error");
      this.scheduleRestart();
    }
  }

  async stop(): Promise<void> {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (this.process) {
      // Mark stopped before killing so the .then() exit handler
      // won't re-trigger scheduleRestart() during the await below
      this.setState("stopped");

      this.process.kill("SIGTERM");
      // Give it 5s to shut down gracefully
      const timeout = setTimeout(() => {
        this.process?.kill("SIGKILL");
      }, 5000);
      try {
        await this.process;
      } catch {
        // Expected — process terminated
      }
      clearTimeout(timeout);
      this.process = null;
    } else {
      this.setState("stopped");
    }

    // Clear any restart timer that the exit handler may have set
    // between kill and await completion
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    this.startedAt = null;
  }

  /** Check if the SQL server is responsive */
  async healthCheck(): Promise<boolean> {
    try {
      const { createConnection } = await import("mysql2/promise");
      const conn = await createConnection({
        host: "127.0.0.1",
        port: this.config.doltPort,
        user: "root",
        connectTimeout: 2000,
      });
      await conn.query("SELECT 1");
      await conn.end();
      return true;
    } catch {
      return false;
    }
  }

  private async waitForReady(maxWaitMs = 15000, intervalMs = 500): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (await this.healthCheck()) {
        return true;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return false;
  }

  private static readonly MAX_RESTART_ATTEMPTS = 10;

  /**
   * Schedule a restart with debounce.
   * Only restarts after N consecutive failures, not on a single timeout.
   * Gives up after MAX_RESTART_ATTEMPTS total failures.
   */
  private scheduleRestart(): void {
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= DoltServerManager.MAX_RESTART_ATTEMPTS) {
      logger.error(
        { consecutiveFailures: this.consecutiveFailures },
        "Giving up after consecutive failures",
      );
      return;
    }

    if (this.restartTimer) return; // Already scheduled

    if (this.consecutiveFailures < this.config.doltRestartThreshold) {
      logger.info(
        {
          failures: this.consecutiveFailures,
          threshold: this.config.doltRestartThreshold,
        },
        "Failure below threshold, will restart",
      );
      // Kill any lingering process before quick retry
      if (this.process) {
        this.process.kill("SIGKILL");
        this.process = null;
      }
      this.restartTimer = setTimeout(() => {
        this.restartTimer = null;
        void this.start();
      }, 1000);
      return;
    }

    logger.info(
      {
        consecutiveFailures: this.consecutiveFailures,
        debounceMs: this.config.doltRestartDebounceMs,
      },
      "Consecutive failures hit threshold, restarting after debounce",
    );

    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;

      // Kill any lingering process
      if (this.process) {
        this.process.kill("SIGKILL");
        this.process = null;
      }

      void this.start().catch((err) => {
        logger.error({ err }, "Restart failed");
      });
    }, this.config.doltRestartDebounceMs);
  }
}
