import { access, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupReplica, createReplica, syncReplica } from "./replica-sync.js";

const TEST_DIR = resolve(tmpdir(), "beads-replica-sync-test");

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe("createReplica", () => {
  it("copies primary directory to replica path", async () => {
    const primary = resolve(TEST_DIR, "primary", "beads_gui");
    const replica = resolve(TEST_DIR, "__replica__", "beads_gui");

    // Create a fake primary with some files
    await mkdir(resolve(primary, ".dolt"), { recursive: true });
    await writeFile(resolve(primary, ".dolt", "config"), "dolt-config");
    await writeFile(resolve(primary, "data.json"), '{"issues": []}');

    await createReplica(primary, replica);

    expect(await exists(replica)).toBe(true);
    expect(await readFile(resolve(replica, ".dolt", "config"), "utf-8")).toBe("dolt-config");
    expect(await readFile(resolve(replica, "data.json"), "utf-8")).toBe('{"issues": []}');
  });

  it("removes existing replica before copying", async () => {
    const primary = resolve(TEST_DIR, "primary", "beads_gui");
    const replica = resolve(TEST_DIR, "__replica__", "beads_gui");

    // Create primary
    await mkdir(primary, { recursive: true });
    await writeFile(resolve(primary, "v2.txt"), "version 2");

    // Create a stale replica with different content
    await mkdir(replica, { recursive: true });
    await writeFile(resolve(replica, "stale.txt"), "old data");

    await createReplica(primary, replica);

    // Stale file should be gone
    expect(await exists(resolve(replica, "stale.txt"))).toBe(false);
    // New file should be present
    expect(await readFile(resolve(replica, "v2.txt"), "utf-8")).toBe("version 2");
  });

  it("creates parent directories if missing", async () => {
    const primary = resolve(TEST_DIR, "primary", "beads_gui");
    const replica = resolve(TEST_DIR, "deep", "nested", "__replica__", "beads_gui");

    await mkdir(primary, { recursive: true });
    await writeFile(resolve(primary, "test.txt"), "data");

    await createReplica(primary, replica);

    expect(await exists(replica)).toBe(true);
    expect(await readFile(resolve(replica, "test.txt"), "utf-8")).toBe("data");
  });
});

describe("syncReplica", () => {
  it("overwrites replica with fresh primary contents", async () => {
    const primary = resolve(TEST_DIR, "primary", "beads_gui");
    const replica = resolve(TEST_DIR, "__replica__", "beads_gui");

    // Create primary with initial data
    await mkdir(primary, { recursive: true });
    await writeFile(resolve(primary, "data.txt"), "initial");
    await createReplica(primary, replica);

    // Modify primary (simulating a bd CLI write)
    await writeFile(resolve(primary, "data.txt"), "updated");
    await writeFile(resolve(primary, "new-file.txt"), "new");

    // Sync
    await syncReplica(primary, replica);

    expect(await readFile(resolve(replica, "data.txt"), "utf-8")).toBe("updated");
    expect(await readFile(resolve(replica, "new-file.txt"), "utf-8")).toBe("new");
  });

  it("removes files deleted from primary", async () => {
    const primary = resolve(TEST_DIR, "primary", "beads_gui");
    const replica = resolve(TEST_DIR, "__replica__", "beads_gui");

    await mkdir(primary, { recursive: true });
    await writeFile(resolve(primary, "keep.txt"), "keep");
    await writeFile(resolve(primary, "remove.txt"), "remove");
    await createReplica(primary, replica);

    // Delete a file from primary
    await rm(resolve(primary, "remove.txt"));
    await syncReplica(primary, replica);

    expect(await exists(resolve(replica, "keep.txt"))).toBe(true);
    expect(await exists(resolve(replica, "remove.txt"))).toBe(false);
  });
});

describe("cleanupReplica", () => {
  it("removes the replica directory entirely", async () => {
    const replica = resolve(TEST_DIR, "__replica__", "beads_gui");
    await mkdir(resolve(replica, ".dolt"), { recursive: true });
    await writeFile(resolve(replica, "data.txt"), "data");

    await cleanupReplica(replica);

    expect(await exists(replica)).toBe(false);
  });

  it("does not throw if replica does not exist", async () => {
    const replica = resolve(TEST_DIR, "nonexistent");
    await expect(cleanupReplica(replica)).resolves.not.toThrow();
  });
});
