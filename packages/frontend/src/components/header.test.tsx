import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "./header";

vi.mock("@/hooks/use-embedded-mode", () => ({
  useIsEmbeddedMode: () => false,
}));

vi.mock("./notification-bell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("renders the keyboard shortcut hints", () => {
    render(<Header />);
    expect(screen.getByText(/for commands/)).toBeInTheDocument();
    expect(screen.getByText(/to search/)).toBeInTheDocument();
  });

  it("renders the search issues button when onSearchIssues is provided", () => {
    const onSearch = vi.fn();
    render(<Header onSearchIssues={onSearch} />);
    const searchButton = screen.getByRole("button", { name: /open search/i });
    fireEvent.click(searchButton);
    expect(onSearch).toHaveBeenCalledOnce();
  });

  it("renders the notification bell", () => {
    render(<Header />);
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
  });
});
