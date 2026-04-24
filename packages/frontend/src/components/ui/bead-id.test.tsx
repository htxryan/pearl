import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { displayId } from "@/lib/format-id";

vi.mock("@/hooks/use-issues", () => ({
  useHealth: () => ({ data: { project_prefix: "beads-gui" } }),
}));

import { BeadId } from "./bead-id";

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
}

function withWrappers(ui: ReactElement, initialPath = "/") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                {ui}
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
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
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders prefix-stripped label for matching prefix", () => {
    render(withWrappers(<BeadId id="beads-gui-cfqz.15" />));
    expect(screen.getByText("cfqz.15")).toBeDefined();
  });

  it("renders full ID for foreign prefix", () => {
    render(withWrappers(<BeadId id="other-proj-456" />));
    expect(screen.getByText("other-proj-456")).toBeDefined();
  });

  it("shows full canonical ID in title tooltip on the pill wrapper", () => {
    const { container } = render(withWrappers(<BeadId id="beads-gui-cfqz.15" />));
    const pill = container.querySelector("[data-bead-id-pill]") as HTMLElement;
    expect(pill).not.toBeNull();
    expect(pill.getAttribute("title")).toBe("beads-gui-cfqz.15");
  });

  it("navigates to issue detail when the ID text is clicked", async () => {
    render(withWrappers(<BeadId id="beads-gui-cfqz.15" />, "/list"));
    const link = screen.getByRole("link", { name: /Open beads-gui-cfqz\.15/ });
    fireEvent.click(link);
    expect(screen.getByTestId("location").textContent).toBe("/issues/beads-gui-cfqz.15");
  });

  it("URL-encodes the id when navigating", async () => {
    render(withWrappers(<BeadId id="weird/id" />, "/list"));
    const link = screen.getByRole("link", { name: /Open weird\/id/ });
    fireEvent.click(link);
    expect(screen.getByTestId("location").textContent).toBe("/issues/weird%2Fid");
  });

  it("copies full canonical ID to clipboard when copy button is clicked", async () => {
    render(withWrappers(<BeadId id="beads-gui-cfqz.15" />));
    const copyBtn = screen.getByRole("button", { name: /Copy beads-gui-cfqz\.15/ });
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("beads-gui-cfqz.15");
  });

  it("shows 'Copied' state after a successful copy and reverts after timeout", async () => {
    render(withWrappers(<BeadId id="beads-gui-abc" />));
    const copyBtn = screen.getByRole("button", { name: /Copy beads-gui-abc/ });
    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });
    expect(screen.getByText("Copied")).toBeDefined();
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.queryByText("Copied")).toBeNull();
    expect(screen.getByText("abc")).toBeDefined();
  });

  it("applies custom className to the pill wrapper", () => {
    const { container } = render(
      withWrappers(<BeadId id="beads-gui-abc" className="text-xs custom-klass" />),
    );
    const pill = container.querySelector("[data-bead-id-pill]") as HTMLElement;
    expect(pill.className).toContain("custom-klass");
  });

  it("stops click propagation when link is clicked", () => {
    const parentHandler = vi.fn();
    render(
      withWrappers(
        <div onClick={parentHandler}>
          <BeadId id="beads-gui-abc" />
        </div>,
      ),
    );
    fireEvent.click(screen.getByRole("link", { name: /Open beads-gui-abc/ }));
    expect(parentHandler).not.toHaveBeenCalled();
  });

  it("stops click propagation when copy is clicked", async () => {
    const parentHandler = vi.fn();
    render(
      withWrappers(
        <div onClick={parentHandler}>
          <BeadId id="beads-gui-abc" />
        </div>,
      ),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Copy beads-gui-abc/ }));
    });
    expect(parentHandler).not.toHaveBeenCalled();
  });

  it("renders visual-only pill without click handlers when interactive=false", () => {
    const parentHandler = vi.fn();
    render(
      withWrappers(
        <div onClick={parentHandler}>
          <BeadId id="beads-gui-abc" interactive={false} />
        </div>,
      ),
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    fireEvent.click(screen.getByText("abc"));
    expect(parentHandler).toHaveBeenCalled();
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it("uses full ID as aria-label when display label is empty", () => {
    render(withWrappers(<BeadId id="beads-gui-" interactive={false} />));
    expect(screen.getByLabelText("beads-gui-")).toBeDefined();
  });

  it("does not crash when navigator.clipboard is undefined", async () => {
    vi.stubGlobal("navigator", {});
    render(withWrappers(<BeadId id="beads-gui-abc" />));
    const copyBtn = screen.getByRole("button", { name: /Copy beads-gui-abc/ });
    await expect(async () => {
      await act(async () => {
        fireEvent.click(copyBtn);
      });
    }).not.toThrow();
  });

  it("activates link on Enter key", () => {
    render(withWrappers(<BeadId id="beads-gui-abc" />, "/list"));
    const link = screen.getByRole("link", { name: /Open beads-gui-abc/ });
    fireEvent.keyDown(link, { key: "Enter" });
    expect(screen.getByTestId("location").textContent).toBe("/issues/beads-gui-abc");
  });

  it("activates copy on Space key", async () => {
    render(withWrappers(<BeadId id="beads-gui-abc" />));
    const copyBtn = screen.getByRole("button", { name: /Copy beads-gui-abc/ });
    await act(async () => {
      fireEvent.keyDown(copyBtn, { key: " " });
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("beads-gui-abc");
  });
});
