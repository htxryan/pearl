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

  it("renders the command palette shortcut hint", () => {
    render(<Header />);
    expect(screen.getByText(/for command palette/)).toBeInTheDocument();
  });

  it("renders the notification bell", () => {
    render(<Header />);
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
  });
});
