import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { COLOR_TOKENS } from "@/themes/types";

const SRC = resolve(__dirname, "..");
const FRONTEND_ROOT = resolve(__dirname, "../..");
const DIST = resolve(FRONTEND_ROOT, "dist/assets");

function readSrc(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), "utf8");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IV Check #5: Bundle ceiling ≤ 600 KB gzip
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("IV-5: Bundle gzip ceiling", () => {
  it("total JS gzip size is within 600KB budget", () => {
    const jsFiles = readdirSync(DIST).filter((f) => f.endsWith(".js"));
    expect(jsFiles.length).toBeGreaterThan(0);

    let totalGzipBytes = 0;
    for (const f of jsFiles) {
      const content = readFileSync(resolve(DIST, f));
      totalGzipBytes += gzipSync(content).length;
    }

    const BUDGET_KB = 600;
    const totalKB = Math.ceil(totalGzipBytes / 1024);
    expect(totalKB, `Bundle gzip ${totalKB}KB exceeds ${BUDGET_KB}KB budget`).toBeLessThanOrEqual(
      BUDGET_KB,
    );
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IV Check #11: Z-index discipline — overlays use z-50, no arbitrary z-index
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("IV-11: Z-index discipline in overlay primitives", () => {
  const overlayFiles = [
    "components/ui/dialog.tsx",
    "components/ui/sheet.tsx",
    "components/ui/dropdown-menu.tsx",
    "components/ui/popover.tsx",
    "components/ui/combobox.tsx",
  ];

  for (const file of overlayFiles) {
    it(`${file}: uses z-50 (Tailwind) — no arbitrary z-[N] values`, () => {
      const content = readSrc(file);
      const arbitraryZIndex = content.match(/z-\[\d+\]/g);
      expect(
        arbitraryZIndex,
        `${file} has arbitrary z-index: ${arbitraryZIndex?.join(", ")}`,
      ).toBeNull();

      expect(content, `${file} must use z-50 for overlay stacking`).toContain("z-50");
    });
  }

  it("no overlay uses inline style zIndex", () => {
    for (const file of overlayFiles) {
      const content = readSrc(file);
      expect(content, `${file} has inline zIndex`).not.toMatch(/style=.*zIndex/);
    }
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IV Check #12: Combobox multi-select shape
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("IV-12: Combobox exposes multi-select primitives", () => {
  it("Combobox exports Chips, Chip, ChipRemove for multi-select", () => {
    const content = readSrc("components/ui/combobox.tsx");
    expect(content).toContain("ComboboxChips");
    expect(content).toContain("ComboboxChip");
    expect(content).toContain("ComboboxChipRemove");
  });

  it("LabelPicker consumes combobox with multi-select onChange(string[])", () => {
    const content = readSrc("components/ui/label-picker.tsx");
    expect(content).toMatch(/onChange/);
    expect(content).toContain("Combobox");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IV Check #13: DatePicker composes E3 Popover
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("IV-13: DatePicker composes Popover from E3", () => {
  it("date-picker.tsx imports Popover from @/components/ui/popover", () => {
    const content = readSrc("components/ui/date-picker.tsx");
    expect(content).toMatch(/import.*Popover.*from.*@\/components\/ui\/popover/);
  });

  it("date-picker.tsx uses PopoverTrigger and PopoverContent", () => {
    const content = readSrc("components/ui/date-picker.tsx");
    expect(content).toContain("PopoverTrigger");
    expect(content).toContain("PopoverContent");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IV Check #14: Sonner adapter is sole export path
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("IV-14: Sonner adapter is sole export path", () => {
  it("only use-toasts.ts and app.tsx import from 'sonner'", () => {
    const srcFiles = getAllTsFiles(SRC);
    const sonnerImporters: string[] = [];
    const allowedSonnerFiles = ["use-toasts.ts", "app.tsx"];
    for (const file of srcFiles) {
      if (file.includes(".test.") || file.includes("iv-contract-verification")) continue;
      const content = readFileSync(file, "utf8");
      if (
        content.match(/from\s+["']sonner["']/) &&
        !allowedSonnerFiles.some((allowed) => file.includes(allowed))
      ) {
        sonnerImporters.push(file.replace(SRC, ""));
      }
    }
    expect(
      sonnerImporters,
      `Unexpected sonner imports in: ${sonnerImporters.join(", ")}`,
    ).toHaveLength(0);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SC-IV-1: Token completeness — every theme defines all tokens
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("SC-IV-1: Token completeness for all themes", () => {
  it("every theme definition file exports a ThemeDefinition with all COLOR_TOKENS", () => {
    const defsDir = resolve(SRC, "themes/definitions");
    const defFiles = readdirSync(defsDir).filter((f) => f.endsWith(".ts"));
    expect(defFiles.length).toBeGreaterThanOrEqual(15);

    for (const file of defFiles) {
      const content = readFileSync(resolve(defsDir, file), "utf8");
      for (const token of COLOR_TOKENS) {
        const pattern = token.includes("-")
          ? `"${token}"` // hyphenated keys must be quoted
          : new RegExp(`(?:"|\\b)${token}(?:"|\\s*:)`); // bare or quoted
        expect(content, `${file} missing token "${token}"`).toMatch(pattern);
      }
    }
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SC-IV-2: Portal stacking total order
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("SC-IV-2: Portal stacking total order", () => {
  it("Toaster renders at app root before Routes (always visible, not route-conditional)", () => {
    const appContent = readSrc("app.tsx");
    const toasterPos = appContent.indexOf("<Toaster");
    const routesPos = appContent.indexOf("<Routes");
    expect(toasterPos, "Toaster not found in app.tsx").toBeGreaterThan(-1);
    expect(routesPos, "Routes not found in app.tsx").toBeGreaterThan(-1);
    expect(
      toasterPos,
      "Toaster must render before Routes so it is not route-conditional",
    ).toBeLessThan(routesPos);
  });

  it("all overlay components use z-50 for consistent stacking base", () => {
    const overlays = ["dialog.tsx", "sheet.tsx", "dropdown-menu.tsx"];
    for (const file of overlays) {
      const content = readSrc(`components/ui/${file}`);
      expect(content, `${file} missing z-50`).toContain("z-50");
    }
  });

  it("Sonner Toaster is rendered at the app root level (top of z-stack)", () => {
    const appContent = readSrc("app.tsx");
    expect(appContent).toMatch(/import.*Toaster.*from.*sonner/);
    expect(appContent).toContain("<Toaster");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SC-IV-4: Deletion ordering gate
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("SC-IV-4: No imports of deleted files", () => {
  const deletedModules = ["icons.tsx", "toast.tsx", "toaster.tsx"];

  it("no source files import previously-deleted modules", () => {
    const srcFiles = getAllTsFiles(SRC);
    const violations: string[] = [];
    for (const file of srcFiles) {
      if (file.includes(".test.") || file.includes("iv-contract-verification")) continue;
      const content = readFileSync(file, "utf8");
      for (const deleted of deletedModules) {
        const base = deleted.replace(/\.tsx?$/, "");
        if (content.match(new RegExp(`from\\s+["'](?:\\.|@).*\\/${base}["']`))) {
          violations.push(`${file.replace(SRC, "")} imports deleted ${deleted}`);
        }
      }
    }
    expect(violations, violations.join("\n")).toHaveLength(0);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SC-IV-5: Toast lifecycle determinism
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("SC-IV-5: Toast lifecycle — adapter is sole sonner export path", () => {
  it("useToasts hook exposes all 5 severity methods + dismiss", () => {
    const content = readSrc("hooks/use-toasts.ts");
    expect(content).toContain("success");
    expect(content).toContain("error");
    expect(content).toContain("warning");
    expect(content).toContain("info");
    expect(content).toContain("loading");
    expect(content).toContain("dismiss");
  });

  it("addToast function covers all ToastVariant cases", () => {
    const content = readSrc("hooks/use-toasts.ts");
    expect(content).toContain('case "success"');
    expect(content).toContain('case "error"');
    expect(content).toContain('case "warning"');
    expect(content).toContain('case "info"');
  });

  it("error toast has a longer default duration (5000ms)", () => {
    const content = readSrc("hooks/use-toasts.ts");
    expect(content).toMatch(/error.*duration:\s*5000/s);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cross-epic contract summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("Cross-epic contract: E2 Button enum stability", () => {
  it("Button exports variant and size type unions (check #7)", () => {
    const content = readSrc("components/ui/button.tsx");
    expect(content).toContain("variant");
    expect(content).toContain("size");
    expect(content).toContain("default");
    expect(content).toContain("destructive");
    expect(content).toContain("ghost");
    expect(content).toContain("outline");
    expect(content).toContain("secondary");
    expect(content).toContain("link");
  });
});

describe("Cross-epic contract: Sidebar composition", () => {
  it("Sidebar exports SidebarProvider + useSidebar context for composition", () => {
    const content = readSrc("components/ui/sidebar.tsx");
    expect(content).toContain("SidebarProvider");
    expect(content).toContain("useSidebar");
    expect(content).toContain("SidebarContent");
    expect(content).toContain("SidebarHeader");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      files.push(...getAllTsFiles(full));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}
