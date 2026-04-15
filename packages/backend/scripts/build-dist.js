#!/usr/bin/env node

/**
 * Build script for pearl-bdui npm distribution.
 *
 * Builds all packages in order (shared -> frontend -> backend), then copies
 * the frontend dist into the backend package and inlines the shared package
 * so the published package is self-contained.
 */

import { execSync } from "node:child_process";
import {
  cpSync, rmSync, existsSync, mkdirSync,
  readFileSync, writeFileSync, readdirSync,
} from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = resolve(__dirname, "..");
const packagesRoot = resolve(backendRoot, "..");
const sharedRoot = resolve(packagesRoot, "shared");
const frontendRoot = resolve(packagesRoot, "frontend");

function run(cmd, cwd) {
  console.log(`  > ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

console.log("\n  Building pearl-bdui distribution...\n");

// Step 1: Build shared types (clean build to avoid tsbuildinfo stale cache)
console.log("  [1/5] Building shared types...");
for (const f of ["tsconfig.tsbuildinfo", "dist"]) {
  const p = resolve(sharedRoot, f);
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
}
run("node_modules/.bin/tsc", sharedRoot);

const sharedDist = resolve(sharedRoot, "dist");
if (!existsSync(sharedDist)) {
  console.error("  ERROR: shared dist not found after build at", sharedDist);
  process.exit(1);
}

// Step 2: Build frontend
console.log("  [2/5] Building frontend...");
run("pnpm build", frontendRoot);

// Step 3: Build backend
console.log("  [3/5] Building backend...");
run("pnpm build", backendRoot);

// Step 4: Copy frontend dist into backend package
console.log("  [4/5] Copying frontend assets...");
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

// Step 5: Inline @pearl/shared into backend dist
// Copy shared dist output into dist/_shared/ and rewrite imports.
// This avoids the node_modules bundling problem (npm strips node_modules from tarballs).
console.log("  [5/5] Inlining @pearl/shared...");
const sharedInlineDest = resolve(backendRoot, "dist", "_shared");
if (existsSync(sharedInlineDest)) {
  rmSync(sharedInlineDest, { recursive: true });
}
mkdirSync(sharedInlineDest, { recursive: true });
cpSync(sharedDist, sharedInlineDest, { recursive: true });

// Rewrite `from "@pearl/shared"` imports in all compiled .js files
const backendDist = resolve(backendRoot, "dist");
rewriteImports(backendDist, backendDist);

console.log("\n  Build complete! Run `npm pack` to create the tarball.\n");

/**
 * Recursively rewrite @pearl/shared imports in .js files.
 * Replaces `from "@pearl/shared"` with the correct relative path to dist/_shared/index.js.
 */
function rewriteImports(dir, distRoot) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_shared") continue; // Don't rewrite _shared itself
      rewriteImports(fullPath, distRoot);
    } else if (entry.name.endsWith(".js")) {
      let content = readFileSync(fullPath, "utf-8");
      if (content.includes("@pearl/shared")) {
        // Calculate relative path from this file to dist/_shared/index.js
        const fileDir = dirname(fullPath);
        let relPath = relative(fileDir, resolve(distRoot, "_shared", "index.js"));
        // Ensure it starts with ./ and uses posix separators
        relPath = relPath.split("\\").join("/");
        if (!relPath.startsWith(".")) relPath = "./" + relPath;

        content = content.replace(
          /from\s+["']@pearl\/shared["']/g,
          `from "${relPath}"`
        );
        writeFileSync(fullPath, content);
      }
    }
  }
}
