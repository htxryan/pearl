import type { Event } from "@pearl/shared";
import { describe, expect, it } from "vitest";
import {
  extractFieldChanges,
  getEventTypeMeta,
  groupAdjacentEvents,
  parseEvent,
} from "./activity-timeline";

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: crypto.randomUUID(),
    issue_id: "beads-test",
    event_type: "closed",
    actor: "Alice",
    old_value: null,
    new_value: null,
    comment: null,
    created_at: "2026-04-10T12:00:00Z",
    ...overrides,
  };
}

describe("groupAdjacentEvents", () => {
  it("returns empty array for empty input", () => {
    expect(groupAdjacentEvents([])).toEqual([]);
  });

  it("does not group non-adjacent identical events", () => {
    const events = [
      makeEvent({ event_type: "closed" }),
      makeEvent({ event_type: "created" }),
      makeEvent({ event_type: "closed" }),
    ];
    const groups = groupAdjacentEvents(events);
    expect(groups).toHaveLength(3);
  });

  it("groups adjacent events with same actor, type, and values", () => {
    const events = [
      makeEvent({ actor: "Alice", event_type: "closed" }),
      makeEvent({ actor: "Alice", event_type: "closed" }),
      makeEvent({ actor: "Alice", event_type: "closed" }),
    ];
    const groups = groupAdjacentEvents(events);
    expect(groups).toHaveLength(1);
    expect(groups[0].events).toHaveLength(3);
  });

  it("does not group events with different actors", () => {
    const events = [
      makeEvent({ actor: "Alice", event_type: "closed" }),
      makeEvent({ actor: "Bob", event_type: "closed" }),
    ];
    const groups = groupAdjacentEvents(events);
    expect(groups).toHaveLength(2);
  });

  it("does not group events with different types", () => {
    const events = [makeEvent({ event_type: "closed" }), makeEvent({ event_type: "created" })];
    const groups = groupAdjacentEvents(events);
    expect(groups).toHaveLength(2);
  });

  it("does not group events that have comments", () => {
    const events = [
      makeEvent({ event_type: "closed" }),
      makeEvent({ event_type: "closed", comment: "Closing because duplicate" }),
    ];
    const groups = groupAdjacentEvents(events);
    expect(groups).toHaveLength(2);
  });

  it("uses first event as representative", () => {
    const first = makeEvent({ id: "first" });
    const second = makeEvent({ id: "second" });
    const groups = groupAdjacentEvents([first, second]);
    expect(groups[0].representative.id).toBe("first");
    expect(groups[0].key).toBe("first");
  });

  it("groups value-matching status changes", () => {
    const events = [
      makeEvent({ event_type: "status_change", old_value: "open", new_value: "closed" }),
      makeEvent({ event_type: "status_change", old_value: "open", new_value: "closed" }),
    ];
    const groups = groupAdjacentEvents(events);
    expect(groups).toHaveLength(1);
    expect(groups[0].events).toHaveLength(2);
  });

  it("does not group status changes with different values", () => {
    const events = [
      makeEvent({ event_type: "status_change", old_value: "open", new_value: "closed" }),
      makeEvent({ event_type: "status_change", old_value: "closed", new_value: "open" }),
    ];
    const groups = groupAdjacentEvents(events);
    expect(groups).toHaveLength(2);
  });
});

describe("extractFieldChanges", () => {
  it("returns no changes for created events", () => {
    expect(extractFieldChanges(makeEvent({ event_type: "created" }))).toEqual([]);
  });

  it("diffs JSON old_value (full row) against JSON new_value (changes)", () => {
    const fullRow = {
      title: "Old title",
      description: "old desc",
      status: "open",
      priority: 2,
      assignee: null,
      content_hash: "abc",
      updated_at: "2026-04-10T11:00:00Z",
    };
    const changes = { title: "New title", priority: 1 };
    const event = makeEvent({
      event_type: "updated",
      old_value: JSON.stringify(fullRow),
      new_value: JSON.stringify(changes),
    });
    const result = extractFieldChanges(event);
    expect(result).toHaveLength(2);
    const titleChange = result.find((c) => c.field === "title");
    const priorityChange = result.find((c) => c.field === "priority");
    expect(titleChange?.before).toBe("Old title");
    expect(titleChange?.after).toBe("New title");
    expect(priorityChange?.before).toBe("P2");
    expect(priorityChange?.after).toBe("P1");
  });

  it("omits unchanged fields even if present in new_value", () => {
    const fullRow = { title: "Same", status: "open" };
    const changes = { title: "Same", status: "in_progress" };
    const event = makeEvent({
      event_type: "status_changed",
      old_value: JSON.stringify(fullRow),
      new_value: JSON.stringify(changes),
    });
    const result = extractFieldChanges(event);
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe("status");
  });

  it("hides noisy bookkeeping fields like content_hash and updated_at", () => {
    const fullRow = {
      title: "T",
      content_hash: "abc",
      updated_at: "2026-04-10T11:00:00Z",
    };
    const changes = {
      title: "T2",
      content_hash: "def",
      updated_at: "2026-04-10T12:00:00Z",
    };
    const event = makeEvent({
      event_type: "updated",
      old_value: JSON.stringify(fullRow),
      new_value: JSON.stringify(changes),
    });
    const result = extractFieldChanges(event);
    expect(result.map((c) => c.field)).toEqual(["title"]);
  });

  it("flags long-text fields as longText (no full-text diff render)", () => {
    const fullRow = { description: "old long body..." };
    const changes = { description: "new long body..." };
    const event = makeEvent({
      event_type: "updated",
      old_value: JSON.stringify(fullRow),
      new_value: JSON.stringify(changes),
    });
    const result = extractFieldChanges(event);
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe("description");
    expect(result[0].longText).toBe(true);
  });

  it("formats null assignee as null (rendered as 'none')", () => {
    const fullRow = { assignee: "alice" };
    const changes = { assignee: null };
    const event = makeEvent({
      event_type: "updated",
      old_value: JSON.stringify(fullRow),
      new_value: JSON.stringify(changes),
    });
    const result = extractFieldChanges(event);
    expect(result).toHaveLength(1);
    expect(result[0].before).toBe("alice");
    expect(result[0].after).toBeNull();
  });

  it("handles scalar CLI events (status_change with plain string values)", () => {
    const event = makeEvent({
      event_type: "status_change",
      old_value: "open",
      new_value: "in_progress",
    });
    const result = extractFieldChanges(event);
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe("status");
    expect(result[0].before).toBe("open");
    expect(result[0].after).toBe("in progress");
  });

  it("returns no field changes for asymmetric closed events (old=row, new=reason)", () => {
    const event = makeEvent({
      event_type: "closed",
      old_value: JSON.stringify({ status: "open" }),
      new_value: "duplicate of beads-1",
    });
    expect(extractFieldChanges(event)).toEqual([]);
  });

  it("handles labels arrays and shows them as comma-joined", () => {
    const fullRow = { labels: ["bug", "ui"] };
    const changes = { labels: ["bug", "ui", "polish"] };
    const event = makeEvent({
      event_type: "updated",
      old_value: JSON.stringify(fullRow),
      new_value: JSON.stringify(changes),
    });
    const result = extractFieldChanges(event);
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe("labels");
    expect(result[0].before).toBe("bug, ui");
    expect(result[0].after).toBe("bug, ui, polish");
  });

  it("does not produce changes for empty scalar CLI events", () => {
    const event = makeEvent({
      event_type: "status_change",
      old_value: "",
      new_value: "",
    });
    expect(extractFieldChanges(event)).toEqual([]);
  });
});

describe("parseEvent verbs", () => {
  it("created", () => {
    expect(parseEvent(makeEvent({ event_type: "created" })).verb).toBe("created this issue");
  });
  it("updated", () => {
    expect(parseEvent(makeEvent({ event_type: "updated" })).verb).toBe("updated this issue");
  });
  it("dependency_added with target", () => {
    const event = makeEvent({ event_type: "dependency_added", new_value: "beads-7" });
    expect(parseEvent(event).verb).toBe("added dependency on beads-7");
  });
  it("commented", () => {
    expect(parseEvent(makeEvent({ event_type: "comment_added" })).verb).toBe("added a comment");
  });
});

describe("getEventTypeMeta", () => {
  it("maps known event types to a category key + label", () => {
    expect(getEventTypeMeta("created").key).toBe("create");
    expect(getEventTypeMeta("created").label).toBe("created");
    expect(getEventTypeMeta("closed").key).toBe("close");
    expect(getEventTypeMeta("status_change").key).toBe("status");
    expect(getEventTypeMeta("status_changed").key).toBe("status");
    expect(getEventTypeMeta("priority_change").key).toBe("priority");
    expect(getEventTypeMeta("comment_added").key).toBe("comment");
    expect(getEventTypeMeta("commented").key).toBe("comment");
    expect(getEventTypeMeta("dependency_added").key).toBe("depend-add");
    expect(getEventTypeMeta("dependency_removed").key).toBe("depend-remove");
    expect(getEventTypeMeta("label_added").key).toBe("labels");
    expect(getEventTypeMeta("title_change").label).toBe("title");
    expect(getEventTypeMeta("description_change").label).toBe("description");
  });

  it("returns a fallback meta with humanized label for unknown types", () => {
    const meta = getEventTypeMeta("some_unknown_thing");
    expect(meta.key).toBe("other");
    expect(meta.label).toBe("some unknown thing");
    expect(meta.iconBgClass).toBeTruthy();
    expect(meta.iconColorClass).toBeTruthy();
    expect(meta.badgeClass).toBeTruthy();
  });
});
