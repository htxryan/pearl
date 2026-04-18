import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "./header";

const mockMutate = vi.fn();
let mockIsPending = false;

vi.mock("@/hooks/use-issues", () => ({
  useSyncReplica: () => ({
    mutate: mockMutate,
    isPending: mockIsPending,
  }),
}));

vi.mock("./notification-bell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  it("renders the Sync button", () => {
    render(<Header />);
    const syncButton = screen.getByTitle("Sync from primary database");
    expect(syncButton).toBeInTheDocument();
    expect(syncButton).toBeEnabled();
  });

  it("calls mutate when the Sync button is clicked", () => {
    render(<Header />);
    fireEvent.click(screen.getByTitle("Sync from primary database"));
    expect(mockMutate).toHaveBeenCalledOnce();
  });

  it("disables the Sync button while a sync is pending", () => {
    mockIsPending = true;
    render(<Header />);
    expect(screen.getByTitle("Sync from primary database")).toBeDisabled();
  });

  it("shows the spinner animation while syncing", () => {
    mockIsPending = true;
    render(<Header />);
    const svg = screen.getByTitle("Sync from primary database").querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("animate-spin");
  });

  it("does not show spinner when idle", () => {
    render(<Header />);
    const svg = screen.getByTitle("Sync from primary database").querySelector("svg");
    expect(svg?.getAttribute("class")).toBeNull();
  });

  it("renders the Create Issue button when onCreateIssue is provided", () => {
    const onCreate = vi.fn();
    render(<Header onCreateIssue={onCreate} />);
    const createButton = screen.getByRole("button", { name: /create issue/i });
    fireEvent.click(createButton);
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("does not render the Create Issue button when onCreateIssue is omitted", () => {
    render(<Header />);
    expect(screen.queryByRole("button", { name: /create issue/i })).not.toBeInTheDocument();
  });
});
