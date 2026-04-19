import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Settings } from "@pearl/shared";
import { DEFAULT_SETTINGS } from "@pearl/shared";

const SETTINGS_DIR = ".pearl";
const SETTINGS_FILE = "settings.json";

const MAX_BYTES_LIMIT = 52_428_800;
const MAX_DIMENSION_LIMIT = 16_384;
const MAX_PATH_LENGTH = 1024;

export function settingsFilePath(projectRoot: string): string {
  return resolve(projectRoot, SETTINGS_DIR, SETTINGS_FILE);
}

function containsTraversal(p: string): boolean {
  return p.split(/[/\\]/).includes("..");
}

function isValidPathOverride(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_PATH_LENGTH && !containsTraversal(value);
}

function deepMergeSettings(partial: Record<string, unknown>): Settings {
  const defaults = structuredClone(DEFAULT_SETTINGS);
  const attachments = partial.attachments as Record<string, unknown> | undefined;
  if (!attachments || typeof attachments !== "object") return defaults;

  if (attachments.storageMode === "inline" || attachments.storageMode === "local") {
    defaults.attachments.storageMode = attachments.storageMode;
  }

  const local = attachments.local as Record<string, unknown> | undefined;
  if (local && typeof local === "object") {
    if (local.scope === "project" || local.scope === "user") {
      defaults.attachments.local.scope = local.scope;
    }
    if (isValidPathOverride(local.projectPathOverride)) {
      defaults.attachments.local.projectPathOverride = local.projectPathOverride;
    } else if (local.projectPathOverride === null) {
      defaults.attachments.local.projectPathOverride = null;
    }
    if (isValidPathOverride(local.userPathOverride)) {
      defaults.attachments.local.userPathOverride = local.userPathOverride;
    } else if (local.userPathOverride === null) {
      defaults.attachments.local.userPathOverride = null;
    }
  }

  const encoding = attachments.encoding as Record<string, unknown> | undefined;
  if (encoding && typeof encoding === "object") {
    if (
      typeof encoding.maxBytes === "number" &&
      encoding.maxBytes > 0 &&
      encoding.maxBytes <= MAX_BYTES_LIMIT
    ) {
      defaults.attachments.encoding.maxBytes = encoding.maxBytes;
    }
    if (
      typeof encoding.maxDimension === "number" &&
      encoding.maxDimension > 0 &&
      encoding.maxDimension <= MAX_DIMENSION_LIMIT
    ) {
      defaults.attachments.encoding.maxDimension = encoding.maxDimension;
    }
  }

  return defaults;
}

export interface SettingsLogger {
  warn(msg: string): void;
}

export function loadSettingsSync(projectRoot: string, logger?: SettingsLogger): Settings {
  const filePath = settingsFilePath(projectRoot);

  if (!existsSync(filePath)) {
    logger?.warn(`Settings file not found at ${filePath}, using defaults`);
    return structuredClone(DEFAULT_SETTINGS);
  }

  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    logger?.warn(`Failed to read settings file at ${filePath}, using defaults`);
    return structuredClone(DEFAULT_SETTINGS);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    logger?.warn(`Malformed JSON in settings file at ${filePath}, using defaults`);
    return structuredClone(DEFAULT_SETTINGS);
  }

  if (!parsed || typeof parsed !== "object") {
    logger?.warn(`Settings file at ${filePath} is not a JSON object, using defaults`);
    return structuredClone(DEFAULT_SETTINGS);
  }

  return deepMergeSettings(parsed as Record<string, unknown>);
}

export async function loadSettings(
  projectRoot: string,
  logger?: SettingsLogger,
): Promise<Settings> {
  const filePath = settingsFilePath(projectRoot);

  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      logger?.warn(`Settings file not found at ${filePath}, using defaults`);
    } else {
      logger?.warn(`Failed to read settings file at ${filePath}, using defaults`);
    }
    return structuredClone(DEFAULT_SETTINGS);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    logger?.warn(`Malformed JSON in settings file at ${filePath}, using defaults`);
    return structuredClone(DEFAULT_SETTINGS);
  }

  if (!parsed || typeof parsed !== "object") {
    logger?.warn(`Settings file at ${filePath} is not a JSON object, using defaults`);
    return structuredClone(DEFAULT_SETTINGS);
  }

  return deepMergeSettings(parsed as Record<string, unknown>);
}

export async function saveSettings(projectRoot: string, settings: Settings): Promise<void> {
  const dir = resolve(projectRoot, SETTINGS_DIR);
  await mkdir(dir, { recursive: true });
  const filePath = settingsFilePath(projectRoot);
  const tmpPath = `${filePath}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
  await rename(tmpPath, filePath);
}
