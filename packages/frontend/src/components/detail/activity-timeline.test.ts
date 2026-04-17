import type { Event } from "@pearl/shared";
import { describe, expect, it } from "vitest";
import { groupAdjacentEvents } from "./activity-timeline";

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
