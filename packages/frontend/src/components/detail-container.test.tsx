import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DetailPanelProvider } from "@/hooks/use-detail-panel";
import {
  DEFAULT_PANEL_WIDTH,
  DetailContainer,
  MAX_PANEL_WIDTH,
  MIN_PANEL_WIDTH,
} from "./detail-container";

vi.mock("@/components/detail/issue-detail", () => ({
  IssueDetail: () => <div data-testid="issue-detail">Detail</div>,
}));

vi.mock("@/hooks/use-focus-trap", () => ({
  useFocusTrap: () => {},
}));

let mockIsCompact = false;
vi.mock("@/hooks/use-media-query", () => ({
  useIsCompact: () => mockIsCompact,
}));

function renderWithRouter(initialEntry = "/list?item=test-123") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DetailPanelProvider>
        <DetailContainer />
      </DetailPanelProvider>
    </MemoryRouter>,
  );
}

function getPanel() {
  return screen.getByTestId("detail-panel");
}

beforeEach(() => {
  window.localStorage.clear();
  mockIsCompact = false;
});

describe("DetailContainer panel resize", () => {
  it("renders a resize separator on the panel's left edge", () => {
    renderWithRouter();
    const separator = screen.getByRole("separator", { name: /resize detail panel/i });
    expect(separator).toBeDefined();
    expect(separator.getAttribute("aria-valuenow")).toBe(String(DEFAULT_PANEL_WIDTH));
    expect(separator.getAttribute("aria-valuemin")).toBe(String(MIN_PANEL_WIDTH));
    expect(separator.getAttribute("aria-valuemax")).toBe(String(MAX_PANEL_WIDTH));
  });

  it("sets inline width style on the panel container", () => {
    renderWithRouter();
    expect(getPanel().style.width).toBe(`${DEFAULT_PANEL_WIDTH}px`);
  });

  it("resizes the panel via mouse drag", () => {
    renderWithRouter();
    const separator = screen.getByRole("separator", { name: /resize detail panel/i });

    fireEvent.mouseDown(separator, { clientX: 500 });
    fireEvent(window, new MouseEvent("mousemove", { clientX: 450 }));
    fireEvent(window, new MouseEvent("mouseup"));

    expect(getPanel().style.width).toBe(`${DEFAULT_PANEL_WIDTH + 50}px`);
  });

  it("clamps width to MAX during drag", () => {
    renderWithRouter();
    const separator = screen.getByRole("separator", { name: /resize detail panel/i });

    fireEvent.mouseDown(separator, { clientX: 500 });
    fireEvent(window, new MouseEvent("mousemove", { clientX: 0 }));
    fireEvent(window, new MouseEvent("mouseup"));

    expect(getPanel().style.width).toBe(`${MAX_PANEL_WIDTH}px`);
  });

  it("clamps width to MIN during drag", () => {
    renderWithRouter();
    const separator = screen.getByRole("separator", { name: /resize detail panel/i });

    fireEvent.mouseDown(separator, { clientX: 500 });
    fireEvent(window, new MouseEvent("mousemove", { clientX: 900 }));
    fireEvent(window, new MouseEvent("mouseup"));

    expect(getPanel().style.width).toBe(`${MIN_PANEL_WIDTH}px`);
  });

  it("persists width to localStorage", () => {
    renderWithRouter();
    const separator = screen.getByRole("separator", { name: /resize detail panel/i });

    fireEvent.mouseDown(separator, { clientX: 500 });
    fireEvent(window, new MouseEvent("mousemove", { clientX: 450 }));
    fireEvent(window, new MouseEvent("mouseup"));

    const stored = JSON.parse(localStorage.getItem("detailPanel.width") ?? "null");
    expect(stored).toBe(DEFAULT_PANEL_WIDTH + 50);
  });

  it("reads persisted width from localStorage on mount", () => {
    localStorage.setItem("detailPanel.width", "600");
    renderWithRouter();
    expect(getPanel().style.width).toBe("600px");
  });

  it("nudges width with ArrowLeft/ArrowRight keys", () => {
    renderWithRouter();
    const separator = screen.getByRole("separator", { name: /resize detail panel/i });

    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    expect(getPanel().style.width).toBe(`${DEFAULT_PANEL_WIDTH + 10}px`);

    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(getPanel().style.width).toBe(`${DEFAULT_PANEL_WIDTH}px`);
  });

  it("uses larger step with Shift+Arrow keys", () => {
    renderWithRouter();
    const separator = screen.getByRole("separator", { name: /resize detail panel/i });

    fireEvent.keyDown(separator, { key: "ArrowLeft", shiftKey: true });
    expect(getPanel().style.width).toBe(`${DEFAULT_PANEL_WIDTH + 40}px`);
  });

  it("does not render the resize handle in modal mode", () => {
    mockIsCompact = true;
    renderWithRouter();
    expect(screen.queryByRole("separator", { name: /resize detail panel/i })).toBeNull();
  });

  it("does not render when no issue is open", () => {
    renderWithRouter("/list");
    expect(screen.queryByRole("separator", { name: /resize detail panel/i })).toBeNull();
    expect(screen.queryByTestId("issue-detail")).toBeNull();
  });
});
