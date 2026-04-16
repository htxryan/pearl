import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type DraftState, useDraft } from "./use-draft";

const TEST_KEY = "test:draft";

const sampleDraft: DraftState = {
  title: "Test issue",
  description: "A description",
  issueType: "task",
  priority: 2,
  assignee: "alice",
  labels: ["bug"],
  due: "2026-01-15",
};

describe("useDraft", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null draft when localStorage is empty", () => {
    const { result } = renderHook(() => useDraft(TEST_KEY));

    expect(result.current.draft).toBeNull();
    expect(result.current.hasDraft).toBe(false);
  });

  it("loads existing draft from localStorage on mount", () => {
    localStorage.setItem(TEST_KEY, JSON.stringify(sampleDraft));

    const { result } = renderHook(() => useDraft(TEST_KEY));

    expect(result.current.draft).toEqual(sampleDraft);
    expect(result.current.hasDraft).toBe(true);
  });

  it("saveDraft writes to localStorage after debounce", () => {
    const { result } = renderHook(() => useDraft(TEST_KEY));

    act(() => {
      result.current.saveDraft(sampleDraft);
    });

    // Not yet persisted (debounce pending)
    expect(localStorage.getItem(TEST_KEY)).toBeNull();

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const stored = JSON.parse(localStorage.getItem(TEST_KEY)!);
    expect(stored).toEqual(sampleDraft);
  });

  it("saveDraft updates in-memory draft immediately", () => {
    const { result } = renderHook(() => useDraft(TEST_KEY));

    act(() => {
      result.current.saveDraft(sampleDraft);
    });

    expect(result.current.draft).toEqual(sampleDraft);
    expect(result.current.hasDraft).toBe(true);
  });

  it("clearDraft removes from localStorage", () => {
    localStorage.setItem(TEST_KEY, JSON.stringify(sampleDraft));

    const { result } = renderHook(() => useDraft(TEST_KEY));
    expect(result.current.hasDraft).toBe(true);

    act(() => {
      result.current.clearDraft();
    });

    expect(result.current.draft).toBeNull();
    expect(result.current.hasDraft).toBe(false);
    expect(localStorage.getItem(TEST_KEY)).toBeNull();
  });

  it("clearDraft cancels pending debounced save", () => {
    const { result } = renderHook(() => useDraft(TEST_KEY));

    act(() => {
      result.current.saveDraft(sampleDraft);
    });

    act(() => {
      result.current.clearDraft();
    });

    // Advance past debounce — should NOT write to localStorage
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(localStorage.getItem(TEST_KEY)).toBeNull();
  });

  it("hasDraft correctly reflects state", () => {
    const { result } = renderHook(() => useDraft(TEST_KEY));

    expect(result.current.hasDraft).toBe(false);

    act(() => {
      result.current.saveDraft(sampleDraft);
    });

    expect(result.current.hasDraft).toBe(true);

    act(() => {
      result.current.clearDraft();
    });

    expect(result.current.hasDraft).toBe(false);
  });

  it("ignores empty drafts in localStorage", () => {
    const emptyDraft: DraftState = {
      title: "",
      description: "",
      issueType: "task",
      priority: 2,
      assignee: "",
      labels: [],
      due: "",
    };
    localStorage.setItem(TEST_KEY, JSON.stringify(emptyDraft));

    const { result } = renderHook(() => useDraft(TEST_KEY));

    expect(result.current.draft).toBeNull();
    expect(result.current.hasDraft).toBe(false);
  });

  it("handles invalid JSON in localStorage gracefully", () => {
    localStorage.setItem(TEST_KEY, "not-json");

    const { result } = renderHook(() => useDraft(TEST_KEY));

    expect(result.current.draft).toBeNull();
    expect(result.current.hasDraft).toBe(false);
  });

  it("debounce resets on rapid saves", () => {
    const { result } = renderHook(() => useDraft(TEST_KEY));

    const draft1 = { ...sampleDraft, title: "First" };
    const draft2 = { ...sampleDraft, title: "Second" };

    act(() => {
      result.current.saveDraft(draft1);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    act(() => {
      result.current.saveDraft(draft2);
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const stored = JSON.parse(localStorage.getItem(TEST_KEY)!);
    expect(stored.title).toBe("Second");
  });
});
