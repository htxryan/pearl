/** Tests for j/k keyboard navigation in the detail view (beads-gui-dnaq). */
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stub out heavy data hooks so useDetailView can run in isolation.
vi.mock("@/hooks/use-issues", () => ({
  useIssue: () => ({
    data: { id: "a", title: "A", status: "open" },
    isLoading: false,
    error: null,
  }),
  useComments: () => ({ data: [] }),
  useEvents: () => ({ data: [] }),
  useDependencies: () => ({ data: [] }),
  useUpdateIssue: () => ({ mutate: vi.fn() }),
  useCloseIssue: () => ({ mutate: vi.fn() }),
  useDeleteIssue: () => ({ mutate: vi.fn() }),
  useAddComment: () => ({ mutate: vi.fn() }),
  useAddDependency: () => ({ mutate: vi.fn() }),
  useRemoveDependency: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToastActions: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

vi.mock("@/hooks/use-undo", () => ({
  useUndoActions: () => ({
    recordFieldEdit: vi.fn(),
    recordClose: vi.fn(),
    recordStatusChange: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-command-palette", () => ({
  useCommandPaletteActions: () => {},
}));

vi.mock("@/hooks/use-parse-field", () => ({
  useParseField: () => ({ parsed: null }),
}));

vi.mock("@/lib/issue-recency", () => ({
  markIssueOpened: vi.fn(),
}));

import { DetailPanelProvider } from "@/hooks/use-detail-panel";
import { NavListProvider, useSetNavList } from "@/hooks/use-nav-list";
import { useDetailView } from "@/views/use-detail-view";

function Probe({ id, inline }: { id: string; inline: boolean }) {
  const location = useLocation();
  // Calling useDetailView with onExit=truthy puts it in "inline" (modal/panel) mode.
  // Without onExit, it runs in full-page mode and uses navigate() instead.
  useDetailView(id, inline ? { onExit: () => {} } : {});
  return <div data-testid="search">{location.search}</div>;
}

function FullPagePathProbe() {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
}

function PopulateNavList({ ids, children }: { ids: string[]; children: ReactNode }) {
  useSetNavList(ids);
  return <>{children}</>;
}

function PanelProbe({ id }: { id: string }) {
  // Read the openIssueId from URL via DetailPanelProvider
  return <Probe id={id} inline={true} />;
}

function makeWrapper(initialEntries: string[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <NavListProvider>
          <DetailPanelProvider>{children}</DetailPanelProvider>
        </NavListProvider>
      </MemoryRouter>
    );
  };
}

describe("useDetailView j/k keyboard navigation", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    sessionStorage.clear();
  });

  it("pressing j when modal/panel is open advances to the next issue in the nav list", () => {
    const Wrapper = makeWrapper(["/list?item=a"]);
    render(
      <Wrapper>
        <PopulateNavList ids={["a", "b", "c"]}>
          <PanelProbe id="a" />
        </PopulateNavList>
      </Wrapper>,
    );
    expect(screen.getByTestId("search").textContent).toBe("?item=a");

    fireEvent.keyDown(window, { key: "j" });
    expect(screen.getByTestId("search").textContent).toBe("?item=b");
  });

  it("pressing k when modal/panel is open retreats to the previous issue in the nav list", () => {
    const Wrapper = makeWrapper(["/list?item=b"]);
    render(
      <Wrapper>
        <PopulateNavList ids={["a", "b", "c"]}>
          <PanelProbe id="b" />
        </PopulateNavList>
      </Wrapper>,
    );
    fireEvent.keyDown(window, { key: "k" });
    expect(screen.getByTestId("search").textContent).toBe("?item=a");
  });

  it("pressing j at the end of the list is a no-op", () => {
    const Wrapper = makeWrapper(["/list?item=c"]);
    render(
      <Wrapper>
        <PopulateNavList ids={["a", "b", "c"]}>
          <PanelProbe id="c" />
        </PopulateNavList>
      </Wrapper>,
    );
    fireEvent.keyDown(window, { key: "j" });
    expect(screen.getByTestId("search").textContent).toBe("?item=c");
  });

  it("pressing k at the start of the list is a no-op", () => {
    const Wrapper = makeWrapper(["/list?item=a"]);
    render(
      <Wrapper>
        <PopulateNavList ids={["a", "b", "c"]}>
          <PanelProbe id="a" />
        </PopulateNavList>
      </Wrapper>,
    );
    fireEvent.keyDown(window, { key: "k" });
    expect(screen.getByTestId("search").textContent).toBe("?item=a");
  });

  it("j/k are skipped when an input element has focus (so users can type 'j' in fields)", () => {
    const Wrapper = makeWrapper(["/list?item=a"]);
    function WithInput() {
      useEffect(() => {
        document.getElementById("focused-input")?.focus();
      }, []);
      return (
        <>
          <input id="focused-input" />
          <PanelProbe id="a" />
        </>
      );
    }
    render(
      <Wrapper>
        <PopulateNavList ids={["a", "b", "c"]}>
          <WithInput />
        </PopulateNavList>
      </Wrapper>,
    );
    const input = document.getElementById("focused-input")!;
    fireEvent.keyDown(input, { key: "j" });
    // Search should still be ?item=a — the focused input swallows the shortcut.
    expect(screen.getByTestId("search").textContent).toBe("?item=a");
  });

  it("on the full-page detail route, j navigates to /issues/<next>", () => {
    const Wrapper = makeWrapper(["/issues/a"]);
    render(
      <Wrapper>
        <PopulateNavList ids={["a", "b", "c"]}>
          <Routes>
            <Route
              path="/issues/:id"
              element={
                <>
                  <Probe id="a" inline={false} />
                  <FullPagePathProbe />
                </>
              }
            />
          </Routes>
        </PopulateNavList>
      </Wrapper>,
    );
    expect(screen.getByTestId("path").textContent).toBe("/issues/a");
    fireEvent.keyDown(window, { key: "j" });
    expect(screen.getByTestId("path").textContent).toBe("/issues/b");
  });

  it("does nothing when the nav list is empty (e.g. cold direct navigation)", () => {
    const Wrapper = makeWrapper(["/list?item=a"]);
    render(
      <Wrapper>
        <PanelProbe id="a" />
      </Wrapper>,
    );
    fireEvent.keyDown(window, { key: "j" });
    expect(screen.getByTestId("search").textContent).toBe("?item=a");
  });
});
