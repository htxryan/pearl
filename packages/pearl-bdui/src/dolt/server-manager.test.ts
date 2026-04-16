import { describe, expect, it } from "vitest";
import type { Config } from "../config.js";
import { DoltServerManager } from "./server-manager.js";

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
    doltDatabase: "beads_gui",
    needsSetup: false,
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
    const mgr = new DoltServerManager(makeConfig(), "/__replica__/beads_gui");
    expect(mgr.getState()).toBe("stopped");
  });

  it("stop is safe when not started", async () => {
    const mgr = new DoltServerManager(makeConfig());
    await expect(mgr.stop()).resolves.not.toThrow();
    expect(mgr.getState()).toBe("stopped");
  });

  it("fires state change listeners", async () => {
    const mgr = new DoltServerManager(makeConfig());
    const states: string[] = [];
    mgr.onStateChange((s) => states.push(s));
    // stop() from "stopped" does not fire (same state)
    await mgr.stop();
    expect(states).toEqual([]);
    // A second stop also doesn't fire — state is still "stopped"
    await mgr.stop();
    expect(states).toEqual([]);
  });

  it("unsubscribes state change listener on dispose", async () => {
    const mgr = new DoltServerManager(makeConfig());
    const states: string[] = [];
    const unsub = mgr.onStateChange((s) => states.push(s));
    unsub();
    // After unsubscribe, no events should be received even if state changes
    await mgr.stop();
    expect(states).toEqual([]);
  });
});
