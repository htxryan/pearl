import { existsSync } from "node:fs";
import { readdir, stat, unlink } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { LocalScope, Settings } from "@pearl/shared";
import { isRef } from "@pearl/shared";

export interface SweepDeps {
  resolveAttachmentBase: (scope: LocalScope, projectRoot: string, settings: Settings) => string;
  getSettings: () => Promise<Settings>;
  isRefReferenced: (ref: string) => Promise<boolean>;
  projectRoot: string;
  logger: { info(msg: string): void; warn(msg: string): void; error(msg: string): void };
}

export interface SweepResult {
  scanned: number;
  deleted: number;
  skippedYoung: number;
  skippedReferenced: number;
  errors: number;
}

export class OrphanSweep {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private _lastRunTs = 0;
  private _running = false;
  private readonly deps: SweepDeps;

  constructor(deps: SweepDeps) {
    this.deps = deps;
  }

  get lastRunTs(): number {
    return this._lastRunTs;
  }

  get running(): boolean {
    return this._running;
  }

  start(intervalSeconds: number): void {
    if (this.timer) return;
    const tick = async () => {
      await this.runOnce();
      this.timer = setTimeout(tick, intervalSeconds * 1000);
    };
    this.timer = setTimeout(tick, intervalSeconds * 1000);
    this.deps.logger.info(`[sweep] Orphan sweep scheduled every ${intervalSeconds}s`);
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async runOnce(): Promise<SweepResult> {
    if (this._running) {
      return { scanned: 0, deleted: 0, skippedYoung: 0, skippedReferenced: 0, errors: 0 };
    }
    this._running = true;

    const result: SweepResult = {
      scanned: 0,
      deleted: 0,
      skippedYoung: 0,
      skippedReferenced: 0,
      errors: 0,
    };

    try {
      const settings = await this.deps.getSettings();
      const graceMs = settings.attachments.sweep.graceSeconds * 1000;
      const now = Date.now();

      for (const scope of ["project", "user"] as LocalScope[]) {
        const baseDir = this.deps.resolveAttachmentBase(scope, this.deps.projectRoot, settings);

        if (!existsSync(baseDir)) continue;

        const files = await collectAttachmentFiles(baseDir);

        for (const filePath of files) {
          result.scanned++;

          try {
            const fileStat = await stat(filePath);
            const ageMs = now - fileStat.mtimeMs;

            if (ageMs < graceMs) {
              result.skippedYoung++;
              continue;
            }

            const fileName = basename(filePath);
            const ref = fileName.split(".")[0];
            if (!isRef(ref)) continue;

            const referenced = await this.deps.isRefReferenced(ref);
            if (referenced) {
              result.skippedReferenced++;
              continue;
            }

            await unlink(filePath);
            result.deleted++;
          } catch (err) {
            if ((err as NodeJS.ErrnoException).code === "ENOENT") continue;
            result.errors++;
            this.deps.logger.warn(`[sweep] Error processing ${filePath}: ${err}`);
          }
        }
      }

      this._lastRunTs = Date.now();
      this.deps.logger.info(
        `[sweep] Complete: scanned=${result.scanned} deleted=${result.deleted} ` +
          `young=${result.skippedYoung} referenced=${result.skippedReferenced} errors=${result.errors}`,
      );
    } catch (err) {
      this.deps.logger.error(`[sweep] Sweep failed: ${err}`);
    } finally {
      this._running = false;
    }

    return result;
  }
}

async function collectAttachmentFiles(baseDir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(baseDir, { recursive: true });
  for (const entry of entries) {
    const name = typeof entry === "string" ? entry.split("/").pop()! : entry;
    if (name.endsWith(".tmp")) continue;
    if (!name.includes(".")) continue;
    const fullPath = resolve(baseDir, typeof entry === "string" ? entry : entry);
    try {
      const s = await stat(fullPath);
      if (s.isFile()) files.push(fullPath);
    } catch {
      // skip unreadable entries
    }
  }
  return files;
}
