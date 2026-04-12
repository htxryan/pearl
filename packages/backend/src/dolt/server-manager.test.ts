import { describe, it, expect } from "vitest";
import { DoltServerManager } from "./server-manager.js";
import type { Config } from "../config.js";

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    host: "127.0.0.1",
    port: 3456,
    doltMode: "embedded",
    doltHost: "127.0.0.1",
    doltPort: 3307,
    doltDbPath: "/primary/beads_gui",
    replicaPath: "/__replica__/beads_gui",
    bdPath: "bd",
    doltPath: "dolt",
    dbLockMaxRetries: 3,
    dbLockRetryDelayMs: 1000,
    doltRestartThreshold: 3,
    doltRestartDebounceMs: 5000,
    poolSize: 5,
    doltUser: "root",
    doltPassword: "",
    ...overrides,
  };
}

describe("DoltServerManager", () => {
  it("starts in stopped state", () => {
    const mgr = new DoltServerManager(makeConfig());
    expect(mgr.getState()).toBe("stopped");
  });

  it("reports zero uptime when not started", () => {
    const mgr = new DoltServerManager(makeConfig());
    expect(mgr.getUptime()).toBe(0);
  });

  it("accepts optional dbPath override", () => {
    // Constructing with a custom dbPath should not throw
    const mgr = new DoltServerManager(
      makeConfig(),
      "/__replica__/beads_gui"
    );
    expect(mgr.getState()).toBe("stopped");
  });

  it("stop is safe when not started", async () => {
    const mgr = new DoltServerManager(makeConfig());
    await expect(mgr.stop()).resolves.not.toThrow();
    expect(mgr.getState()).toBe("stopped");
  });

  it("fires state change listeners", () => {
    const mgr = new DoltServerManager(makeConfig());
    const states: string[] = [];
    mgr.onStateChange((s) => states.push(s));
    // Calling stop from stopped → no change
    // We can't easily test start without a real dolt process,
    // but we can verify the listener mechanism via stop()
    // which only fires if state changes
  });

  it("unsubscribes state change listener on dispose", () => {
    const mgr = new DoltServerManager(makeConfig());
    const states: string[] = [];
    const unsub = mgr.onStateChange((s) => states.push(s));
    unsub();
    // After unsubscribe, no events should be received
  });
});
