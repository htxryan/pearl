import type { Comment, Event } from "@pearl/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommentsActivityTabs } from "./comments-activity-tabs";

const mockComment: Comment = {
  id: "c1",
  issue_id: "pearl-beads-test",
  author: "alice",
  text: "Hello world",
  created_at: "2026-04-10T11:00:00Z",
};

const mockEvent: Event = {
  id: "e1",
  issue_id: "pearl-beads-test",
  event_type: "status_change",
  actor: "bob",
  old_value: "open",
  new_value: "in_progress",
  comment: null,
  created_at: "2026-04-10T11:00:00Z",
};

function renderTabs(comments: Comment[] = [], events: Event[] = [], isAddingComment = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CommentsActivityTabs
        comments={comments}
        events={events}
        onAddComment={vi.fn(async () => undefined)}
        isAddingComment={isAddingComment}
      />
    </QueryClientProvider>,
  );
}

describe("CommentsActivityTabs", () => {
  it("renders both tabs with counts in their labels", () => {
    renderTabs([mockComment], [mockEvent]);
    expect(screen.getByRole("tab", { name: /Comments \(1\)/ })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Activity \(1\)/ })).toBeDefined();
  });

  it("renders zero counts when both arrays are empty", () => {
    renderTabs([], []);
    expect(screen.getByRole("tab", { name: /Comments \(0\)/ })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Activity \(0\)/ })).toBeDefined();
  });

  it("defaults to the Comments tab being active", () => {
    renderTabs([mockComment], [mockEvent]);
    const commentsTab = screen.getByRole("tab", { name: /Comments/ });
    const activityTab = screen.getByRole("tab", { name: /Activity/ });

    expect(commentsTab.getAttribute("aria-selected")).toBe("true");
    expect(activityTab.getAttribute("aria-selected")).toBe("false");

    // Comments content visible; activity content not visible.
    expect(screen.getByText("Hello world")).toBeDefined();
    expect(screen.queryByText("bob")).toBeNull();
  });

  it("switches to Activity when its tab is clicked and shows the events filter", () => {
    renderTabs([mockComment], [mockEvent]);

    fireEvent.click(screen.getByRole("tab", { name: /Activity/ }));

    expect(screen.getByRole("tab", { name: /Activity/ }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByText("bob")).toBeDefined();
    // Filter dropdown moved into the Activity tab header.
    expect(screen.getByLabelText("Filter events by type")).toBeDefined();
    // Comments panel is hidden while Activity is active.
    expect(screen.queryByText("Hello world")).toBeNull();
  });

  it("does not render the duplicate Activity h2 heading when shown inside tabs", () => {
    renderTabs([], [mockEvent]);
    fireEvent.click(screen.getByRole("tab", { name: /Activity/ }));

    // No heading element with "Activity" text — the tab label is the only label.
    expect(screen.queryByRole("heading", { name: /^Activity/ })).toBeNull();
  });
});
