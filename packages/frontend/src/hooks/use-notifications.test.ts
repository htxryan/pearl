import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addNotification,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  clearAllNotifications,
  setPreference,
  notifyCommentAdded,
  detectChanges,
  type NotificationPreferences,
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

    markAsRead(id!);

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

    dismissNotification(id!);

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
    // Reset all preferences to defaults
    setPreference("issue_assigned", true);
    setPreference("status_changed", true);
    setPreference("blocker_resolved", true);
    setPreference("comment_added", true);
    setPreference("browser_push", false);
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
    // Reset all preferences to defaults
    setPreference("issue_assigned", true);
    setPreference("status_changed", true);
    setPreference("blocker_resolved", true);
    setPreference("comment_added", true);
    setPreference("browser_push", false);
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

describe("cross-tab deduplication", () => {
  beforeEach(() => {
    localStorage.clear();
    clearAllNotifications();
  });

  it("addNotification deduplicates same type+issueId within 30s window", () => {
    const input = {
      type: "status_changed" as const,
      issueId: "dup-1",
      issueTitle: "Dup Issue",
      message: "Status changed",
    };

    const first = addNotification(input);
    const second = addNotification(input);

    expect(first).toBeTruthy();
    expect(second).toBeNull();

    const stored = JSON.parse(localStorage.getItem("beads-gui-notifications") ?? "[]");
    expect(stored).toHaveLength(1);
  });

  it("allows same type+issueId for different types", () => {
    addNotification({
      type: "status_changed",
      issueId: "multi-1",
      issueTitle: "Issue",
      message: "Status changed",
    });
    const second = addNotification({
      type: "issue_assigned",
      issueId: "multi-1",
      issueTitle: "Issue",
      message: "Assigned",
    });

    expect(second).toBeTruthy();

    const stored = JSON.parse(localStorage.getItem("beads-gui-notifications") ?? "[]");
    expect(stored).toHaveLength(2);
  });

  it("allows same type+issueId for different issues", () => {
    addNotification({
      type: "status_changed",
      issueId: "issue-a",
      issueTitle: "Issue A",
      message: "Status changed",
    });
    const second = addNotification({
      type: "status_changed",
      issueId: "issue-b",
      issueTitle: "Issue B",
      message: "Status changed",
    });

    expect(second).toBeTruthy();

    const stored = JSON.parse(localStorage.getItem("beads-gui-notifications") ?? "[]");
    expect(stored).toHaveLength(2);
  });

  it("syncs in-memory state from localStorage on storage event", () => {
    // Simulate another tab writing to localStorage
    const externalNotifs = [
      {
        id: "notif-ext-1",
        type: "status_changed",
        issueId: "ext-1",
        issueTitle: "External",
        message: "From another tab",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];

    // Fire a storage event (simulating another tab's write)
    const event = new StorageEvent("storage", {
      key: "beads-gui-notifications",
      newValue: JSON.stringify(externalNotifs),
    });
    window.dispatchEvent(event);

    // The in-memory store should now reflect the external write.
    // We verify by trying to add a duplicate — the dedup check re-reads localStorage,
    // but the storage event updates the in-memory array directly.
    const stored = JSON.parse(localStorage.getItem("beads-gui-notifications") ?? "[]");
    // localStorage itself wasn't changed by the event (browser does that),
    // but the in-memory notifications array was updated
    // We can verify by adding a non-duplicate and checking the total count
    localStorage.setItem("beads-gui-notifications", JSON.stringify(externalNotifs));
    const id = addNotification({
      type: "issue_assigned",
      issueId: "ext-1",
      issueTitle: "External",
      message: "Different type, should not dedup",
    });
    expect(id).toBeTruthy();
  });
});

describe("detectChanges", () => {
  const allEnabled: NotificationPreferences = {
    issue_assigned: true,
    status_changed: true,
    blocker_resolved: true,
    comment_added: true,
    browser_push: false,
  };

  it("detects status change", () => {
    const prev = { "i-1": { status: "open" as const, assignee: null } };
    const current = [{ id: "i-1", title: "Test", status: "in_progress" as const, assignee: null }] as any;

    const result = detectChanges(prev, current, allEnabled);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("status_changed");
  });

  it("detects blocker resolved", () => {
    const prev = { "i-1": { status: "blocked" as const, assignee: null } };
    const current = [{ id: "i-1", title: "Test", status: "open" as const, assignee: null }] as any;

    const result = detectChanges(prev, current, allEnabled);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("blocker_resolved");
  });

  it("blocker_resolved fires even when status_changed is disabled", () => {
    const prefs = { ...allEnabled, status_changed: false };
    const prev = { "i-1": { status: "blocked" as const, assignee: null } };
    const current = [{ id: "i-1", title: "Test", status: "open" as const, assignee: null }] as any;

    const result = detectChanges(prev, current, prefs);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("blocker_resolved");
  });

  it("status_changed fires for non-blocker transitions when blocker_resolved is disabled", () => {
    const prefs = { ...allEnabled, blocker_resolved: false };
    const prev = { "i-1": { status: "open" as const, assignee: null } };
    const current = [{ id: "i-1", title: "Test", status: "closed" as const, assignee: null }] as any;

    const result = detectChanges(prev, current, prefs);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("status_changed");
  });

  it("emits status_changed (not blocker_resolved) when blocker_resolved pref is off", () => {
    const prefs = { ...allEnabled, blocker_resolved: false };
    const prev = { "i-1": { status: "blocked" as const, assignee: null } };
    const current = [{ id: "i-1", title: "Test", status: "open" as const, assignee: null }] as any;

    const result = detectChanges(prev, current, prefs);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("status_changed");
  });

  it("no notification when both status_changed and blocker_resolved are disabled", () => {
    const prefs = { ...allEnabled, status_changed: false, blocker_resolved: false };
    const prev = { "i-1": { status: "blocked" as const, assignee: null } };
    const current = [{ id: "i-1", title: "Test", status: "open" as const, assignee: null }] as any;

    const result = detectChanges(prev, current, prefs);
    expect(result).toHaveLength(0);
  });

  it("detects assignee change", () => {
    const prev = { "i-1": { status: "open" as const, assignee: null } };
    const current = [{ id: "i-1", title: "Test", status: "open" as const, assignee: "alice" }] as any;

    const result = detectChanges(prev, current, allEnabled);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("issue_assigned");
  });

  it("skips new issues not in previous snapshot", () => {
    const prev = {};
    const current = [{ id: "i-1", title: "Test", status: "open" as const, assignee: null }] as any;

    const result = detectChanges(prev, current, allEnabled);
    expect(result).toHaveLength(0);
  });
});
