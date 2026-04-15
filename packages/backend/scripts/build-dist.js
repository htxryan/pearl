#!/usr/bin/env node

/**
 * Packaging script for pearl-bdui npm distribution.
 *
 * Copies frontend dist into the backend package and inlines the shared package
 * so the published package is self-contained. Building is handled separately
 * by `pnpm -r build` — this script only does packaging.
 */

import {
  cpSync, rmSync, existsSync, mkdirSync,
  readFileSync, writeFileSync, readdirSync,
} from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = resolve(__dirname, "..");
const packagesRoot = resolve(backendRoot, "..");
const projectRoot = resolve(packagesRoot, "..");
const sharedRoot = resolve(packagesRoot, "shared");
const frontendRoot = resolve(packagesRoot, "frontend");

console.log("\n  Building pearl-bdui distribution...\n");

// Step 1: Build all packages in dependency order via pnpm workspace
console.log("  [1/4] Building all packages (shared → frontend → backend)...");
execSync("pnpm -r build", { cwd: projectRoot, stdio: "inherit" });

// Step 2: Copy frontend dist into backend package
console.log("  [2/4] Copying frontend assets...");
const frontendDistSrc = resolve(frontendRoot, "dist");
const frontendTarget = resolve(backendRoot, "frontend-dist");

if (!existsSync(frontendDistSrc)) {
  console.error("  ERROR: Frontend dist not found at", frontendDistSrc);
  process.exit(1);
}

if (existsSync(frontendTarget)) {
  rmSync(frontendTarget, { recursive: true });
}
mkdirSync(frontendTarget, { recursive: true });
cpSync(frontendDistSrc, frontendTarget, { recursive: true });

// Step 3: Inline @pearl/shared into backend dist
// Copy shared dist output into dist/_shared/ and rewrite imports.
// This avoids the node_modules bundling problem (npm strips node_modules from tarballs).
console.log("  [3/4] Inlining @pearl/shared...");
const sharedDist = resolve(sharedRoot, "dist");
if (!existsSync(sharedDist)) {
  console.error("  ERROR: shared dist not found at", sharedDist);
  process.exit(1);
}

const sharedInlineDest = resolve(backendRoot, "dist", "_shared");
if (existsSync(sharedInlineDest)) {
  rmSync(sharedInlineDest, { recursive: true });
}
mkdirSync(sharedInlineDest, { recursive: true });

// Copy only .js files (runtime) and .d.ts files (type resolution) — skip .d.ts.map
for (const entry of readdirSync(sharedDist, { withFileTypes: true })) {
  if (entry.name.endsWith(".d.ts.map")) continue;
  cpSync(
    resolve(sharedDist, entry.name),
    resolve(sharedInlineDest, entry.name),
    { recursive: true }
  );
}

// Rewrite all `@pearl/shared` references in compiled .js and .d.ts files
const backendDist = resolve(backendRoot, "dist");
rewriteImports(backendDist, backendDist);

// Step 4: Post-build verification — fail fast if rewriting missed anything
console.log("  [4/4] Verifying imports...");
const unrewritten = findUnrewrittenImports(backendDist);
if (unrewritten.length > 0) {
  console.error("\n  ERROR: Found unrewritten @pearl/shared imports:");
  for (const { file, line } of unrewritten) {
    console.error(`    ${file}: ${line}`);
  }
  console.error("\n  The package would fail at runtime. Aborting.\n");
  process.exit(1);
}

console.log("\n  Build complete! Run `npm pack` to create the tarball.\n");

/**
 * Recursively rewrite @pearl/shared imports in .js and .d.ts files.
 * Uses string replacement (not just `from` regex) to catch all import forms:
 * import, export, require, dynamic import.
 */
function rewriteImports(dir, distRoot) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_shared") continue;
      rewriteImports(fullPath, distRoot);
    } else if (entry.name.endsWith(".js") || entry.name.endsWith(".d.ts")) {
      // Skip .d.ts.map files
      if (entry.name.endsWith(".d.ts.map")) continue;
      let content = readFileSync(fullPath, "utf-8");
      if (content.includes("@pearl/shared")) {
        const fileDir = dirname(fullPath);
        let relPath = relative(fileDir, resolve(distRoot, "_shared", "index.js"));
        relPath = relPath.split("\\").join("/");
        if (!relPath.startsWith(".")) relPath = "./" + relPath;

        // For .d.ts files, point to index.d.ts instead of index.js
        const targetPath = entry.name.endsWith(".d.ts")
          ? relPath.replace(/index\.js$/, "index.d.ts")
          : relPath;

        // Replace all forms: from "...", require("..."), import("...")
        content = content.replaceAll('"@pearl/shared"', `"${targetPath}"`);
        content = content.replaceAll("'@pearl/shared'", `'${targetPath}'`);
        writeFileSync(fullPath, content);
      }
    }
  }
}

/**
 * Scan dist for any remaining @pearl/shared references in runtime files.
 */
function findUnrewrittenImports(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_shared") continue;
      results.push(...findUnrewrittenImports(fullPath));
    } else if (entry.name.endsWith(".js") || entry.name.endsWith(".d.ts")) {
      if (entry.name.endsWith(".d.ts.map")) continue;
      const content = readFileSync(fullPath, "utf-8");
      if (content.includes("@pearl/shared")) {
        const lines = content.split("\n");
        for (const line of lines) {
          if (line.includes("@pearl/shared")) {
            results.push({ file: relative(dir, fullPath), line: line.trim() });
          }
        }
      }
    }
  }
  return results;
}
