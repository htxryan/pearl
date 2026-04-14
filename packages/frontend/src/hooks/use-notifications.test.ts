import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addNotification,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  clearAllNotifications,
  setPreference,
  notifyCommentAdded,
} from "./use-notifications";

// We need to re-import the store getters after clearing
// The module uses module-level state, so we test via the exported functions

describe("notification store", () => {
  beforeEach(() => {
    localStorage.clear();
    clearAllNotifications();
  });

  it("addNotification adds a notification and returns an id", () => {
    const id = addNotification({
      type: "status_changed",
      issueId: "test-1",
      issueTitle: "Test Issue",
      message: "Status changed",
    });

    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  it("markAsRead marks a notification as read", () => {
    const id = addNotification({
      type: "status_changed",
      issueId: "test-1",
      issueTitle: "Test Issue",
      message: "Status changed",
    });

    markAsRead(id);

    // Verify via localStorage
    const stored = JSON.parse(localStorage.getItem("beads-gui-notifications") ?? "[]");
    const notif = stored.find((n: any) => n.id === id);
    expect(notif?.read).toBe(true);
  });

  it("markAllAsRead marks all notifications as read", () => {
    addNotification({
      type: "status_changed",
      issueId: "test-1",
      issueTitle: "Test 1",
      message: "Changed 1",
    });
    addNotification({
      type: "issue_assigned",
      issueId: "test-2",
      issueTitle: "Test 2",
      message: "Assigned 2",
    });

    markAllAsRead();

    const stored = JSON.parse(localStorage.getItem("beads-gui-notifications") ?? "[]");
    expect(stored.every((n: any) => n.read === true)).toBe(true);
  });

  it("dismissNotification removes a notification", () => {
    const id = addNotification({
      type: "status_changed",
      issueId: "test-1",
      issueTitle: "Test Issue",
      message: "Status changed",
    });

    dismissNotification(id);

    const stored = JSON.parse(localStorage.getItem("beads-gui-notifications") ?? "[]");
    expect(stored.find((n: any) => n.id === id)).toBeUndefined();
  });

  it("clearAllNotifications empties the store", () => {
    addNotification({
      type: "status_changed",
      issueId: "test-1",
      issueTitle: "Test 1",
      message: "Changed 1",
    });
    addNotification({
      type: "issue_assigned",
      issueId: "test-2",
      issueTitle: "Test 2",
      message: "Assigned 2",
    });

    clearAllNotifications();

    const stored = JSON.parse(localStorage.getItem("beads-gui-notifications") ?? "[]");
    expect(stored).toHaveLength(0);
  });

  it("limits notifications to 50", () => {
    for (let i = 0; i < 60; i++) {
      addNotification({
        type: "status_changed",
        issueId: `test-${i}`,
        issueTitle: `Test ${i}`,
        message: `Changed ${i}`,
      });
    }

    const stored = JSON.parse(localStorage.getItem("beads-gui-notifications") ?? "[]");
    expect(stored.length).toBeLessThanOrEqual(50);
  });

  it("notifications are ordered newest first", () => {
    addNotification({
      type: "status_changed",
      issueId: "first",
      issueTitle: "First",
      message: "First",
    });
    addNotification({
      type: "status_changed",
      issueId: "second",
      issueTitle: "Second",
      message: "Second",
    });

    const stored = JSON.parse(localStorage.getItem("beads-gui-notifications") ?? "[]");
    expect(stored[0].issueId).toBe("second");
    expect(stored[1].issueId).toBe("first");
  });
});

describe("notification preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("setPreference persists to localStorage", () => {
    setPreference("issue_assigned", false);

    const stored = JSON.parse(localStorage.getItem("beads-gui-notification-prefs") ?? "{}");
    expect(stored.issue_assigned).toBe(false);
  });

  it("setPreference updates individual keys", () => {
    setPreference("status_changed", false);
    setPreference("browser_push", true);

    const stored = JSON.parse(localStorage.getItem("beads-gui-notification-prefs") ?? "{}");
    expect(stored.status_changed).toBe(false);
    expect(stored.browser_push).toBe(true);
  });
});

describe("notifyCommentAdded", () => {
  beforeEach(() => {
    localStorage.clear();
    clearAllNotifications();
    // Reset preferences to defaults
    setPreference("comment_added", true);
  });

  it("creates a comment notification", () => {
    notifyCommentAdded("issue-1", "My Issue", "alice");

    const stored = JSON.parse(localStorage.getItem("beads-gui-notifications") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].type).toBe("comment_added");
    expect(stored[0].issueId).toBe("issue-1");
    expect(stored[0].message).toContain("alice");
    expect(stored[0].message).toContain("My Issue");
  });

  it("respects comment_added preference being disabled", () => {
    setPreference("comment_added", false);

    notifyCommentAdded("issue-1", "My Issue", "alice");

    const stored = JSON.parse(localStorage.getItem("beads-gui-notifications") ?? "[]");
    expect(stored).toHaveLength(0);
  });
});
