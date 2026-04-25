import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COLOR_TOKENS } from "@/themes/types";

const indexCss = readFileSync(resolve(__dirname, "../index.css"), "utf8");
const indexHtml = readFileSync(resolve(__dirname, "../../index.html"), "utf8");

describe("F1: Theme definition keys match :root declarations", () => {
  it("every COLOR_TOKEN has a matching :root CSS variable declaration", () => {
    const rootMatch = indexCss.match(/:root\s*\{([^}]+)\}/s);
    expect(rootMatch, ":root block not found in index.css").toBeTruthy();
    const rootBlock = rootMatch![1];

    for (const token of COLOR_TOKENS) {
      expect(rootBlock, `Missing :root declaration for --${token}`).toContain(`--${token}:`);
    }
  });

  it("every COLOR_TOKEN has a matching .dark CSS variable declaration", () => {
    const darkBlocks = [...indexCss.matchAll(/^\.dark\s*\{([^}]+)\}/gms)];
    const darkMatch = darkBlocks.find((m) => m[1].includes("--background:"));
    expect(darkMatch, ".dark token block not found in index.css").toBeTruthy();
    const darkBlock = darkMatch![1];

    for (const token of COLOR_TOKENS) {
      expect(darkBlock, `Missing .dark declaration for --${token}`).toContain(`--${token}:`);
    }
  });

  it("every COLOR_TOKEN has a matching @theme inline bridge", () => {
    const themeMatch = indexCss.match(/@theme inline\s*\{([^}]+)\}/s);
    expect(themeMatch, "@theme inline block not found in index.css").toBeTruthy();
    const themeBlock = themeMatch![1];

    for (const token of COLOR_TOKENS) {
      expect(themeBlock, `Missing @theme inline bridge for --color-${token}`).toContain(
        `--color-${token}: var(--${token})`,
      );
    }
  });
});

describe("F3: #root has isolation:isolate", () => {
  it("index.css contains #root { isolation: isolate }", () => {
    expect(indexCss).toMatch(/#root\s*\{[^}]*isolation:\s*isolate/s);
  });
});

describe("F4: Boot script validTokens matches COLOR_TOKENS", () => {
  it("index.html validTokens array is in sync with COLOR_TOKENS", () => {
    const match = indexHtml.match(/validTokens\s*=\s*\[([^\]]+)\]/);
    expect(match, "validTokens array not found in index.html").toBeTruthy();
    const htmlTokens = match![1].split(",").map((t) => t.trim().replace(/^"|"$/g, ""));
    expect(htmlTokens.sort()).toEqual([...COLOR_TOKENS].sort());
  });
});

describe("F5: Exact-pinned dependency versions", () => {
  const pkgJson = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf8"));
  const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };

  const exactPinned = [
    "@base-ui/react",
    "lucide-react",
    "sonner",
    "tw-animate-css",
    "class-variance-authority",
  ];

  for (const pkg of exactPinned) {
    it(`${pkg} has no ^ or ~ prefix`, () => {
      const version = deps[pkg];
      expect(version, `${pkg} not found in package.json`).toBeDefined();
      expect(version).not.toMatch(/^[\^~]/);
    });
  }
});
