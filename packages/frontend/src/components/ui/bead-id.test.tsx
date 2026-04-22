import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { displayId } from "@/lib/format-id";

vi.mock("@/hooks/use-issues", () => ({
  useHealth: () => ({ data: { project_prefix: "beads-gui" } }),
}));

import { BeadId } from "./bead-id";

function withQueryClient(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe("displayId", () => {
  it("strips matching project prefix", () => {
    expect(displayId("beads-gui-cfqz.15", "beads-gui")).toBe("cfqz.15");
  });

  it("strips prefix for simple IDs", () => {
    expect(displayId("beads-gui-abc", "beads-gui")).toBe("abc");
  });

  it("preserves foreign-prefix IDs in full", () => {
    expect(displayId("other-proj-456", "beads-gui")).toBe("other-proj-456");
  });

  it("falls back to shortId when no prefix provided", () => {
    expect(displayId("beads-gui-cfqz.15", undefined)).toBe("gui-cfqz.15");
  });

  it("handles ID identical to prefix", () => {
    expect(displayId("beads-gui-", "beads-gui")).toBe("");
  });

  it("handles single-segment ID", () => {
    expect(displayId("abc", "beads-gui")).toBe("abc");
  });
});

describe("BeadId", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("renders prefix-stripped label for matching prefix", () => {
    render(withQueryClient(<BeadId id="beads-gui-cfqz.15" />));
    expect(screen.getByText("cfqz.15")).toBeDefined();
  });

  it("renders full ID for foreign prefix", () => {
    render(withQueryClient(<BeadId id="other-proj-456" />));
    expect(screen.getByText("other-proj-456")).toBeDefined();
  });

  it("shows full canonical ID in title tooltip", () => {
    render(withQueryClient(<BeadId id="beads-gui-cfqz.15" />));
    expect(screen.getByTitle("beads-gui-cfqz.15")).toBeDefined();
  });

  it("copies full canonical ID to clipboard on click", async () => {
    render(withQueryClient(<BeadId id="beads-gui-cfqz.15" />));
    fireEvent.click(screen.getByText("cfqz.15"));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("beads-gui-cfqz.15");
  });

  it("applies custom className", () => {
    render(withQueryClient(<BeadId id="beads-gui-abc" className="text-xs font-mono" />));
    const el = screen.getByText("abc");
    expect(el.className).toContain("text-xs");
    expect(el.className).toContain("font-mono");
  });

  it("renders as span with role=button, not a button element", () => {
    render(withQueryClient(<BeadId id="beads-gui-abc" />));
    const el = screen.getByText("abc");
    expect(el.tagName).toBe("SPAN");
    expect(el.getAttribute("role")).toBe("button");
  });

  it("stops event propagation on click", () => {
    const parentHandler = vi.fn();
    render(
      withQueryClient(
        <div onClick={parentHandler}>
          <BeadId id="beads-gui-abc" />
        </div>,
      ),
    );
    fireEvent.click(screen.getByText("abc"));
    expect(parentHandler).not.toHaveBeenCalled();
  });

  it("renders plain span without click handler when interactive=false", () => {
    const parentHandler = vi.fn();
    render(
      withQueryClient(
        <div onClick={parentHandler}>
          <BeadId id="beads-gui-abc" interactive={false} />
        </div>,
      ),
    );
    fireEvent.click(screen.getByText("abc"));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(parentHandler).toHaveBeenCalled();
  });

  it("uses full ID as aria-label when display label is empty", () => {
    render(withQueryClient(<BeadId id="beads-gui-" />));
    const el = screen.getByLabelText("beads-gui-");
    expect(el).toBeDefined();
  });
});
