import { cp, rm, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Create an initial replica by copying the primary database directory.
 * Removes any existing replica first to ensure a clean copy.
 */
export async function createReplica(
  primaryPath: string,
  replicaPath: string
): Promise<void> {
  await rm(replicaPath, { recursive: true, force: true });
  await mkdir(dirname(replicaPath), { recursive: true });
  await cp(primaryPath, replicaPath, { recursive: true });
}

/**
 * Sync the replica by overwriting it with a fresh copy from primary.
 * The caller must stop the SQL server before calling this.
 */
export async function syncReplica(
  primaryPath: string,
  replicaPath: string
): Promise<void> {
  await rm(replicaPath, { recursive: true, force: true });
  await mkdir(dirname(replicaPath), { recursive: true });
  await cp(primaryPath, replicaPath, { recursive: true });
}

/**
 * Remove the replica directory entirely.
 */
export async function cleanupReplica(replicaPath: string): Promise<void> {
  await rm(replicaPath, { recursive: true, force: true });
}
