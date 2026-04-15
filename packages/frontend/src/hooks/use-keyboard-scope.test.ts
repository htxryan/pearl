import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useKeyboardScope, type KeyBinding } from "./use-keyboard-scope";

describe("useKeyboardScope", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it("should register and fire keyboard shortcuts", () => {
    const handler = vi.fn();
    const bindings: KeyBinding[] = [
      { key: "1", handler, description: "Go to list" },
    ];

    renderHook(() => useKeyboardScope("test", bindings));

    // Simulate keypress
    const event = new KeyboardEvent("keydown", { key: "1", bubbles: true });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledOnce();
  });

  it("should unregister shortcuts on unmount", () => {
    const handler = vi.fn();
    const bindings: KeyBinding[] = [
      { key: "1", handler, description: "Go to list" },
    ];

    const { unmount } = renderHook(() => useKeyboardScope("test", bindings));

    unmount();

    const event = new KeyboardEvent("keydown", { key: "1", bubbles: true });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it("should handle modifier keys", () => {
    const handler = vi.fn();
    const bindings: KeyBinding[] = [
      { key: "k", modifiers: ["meta"], handler, description: "Command palette" },
    ];

    renderHook(() => useKeyboardScope("test", bindings));

    // Without meta — should not fire
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", bubbles: true }),
    );
    expect(handler).not.toHaveBeenCalled();

    // With meta — should fire
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
    expect(handler).toHaveBeenCalledOnce();
  });

  it("should respect scope stack order (last registered wins)", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    renderHook(() =>
      useKeyboardScope("scope1", [{ key: "x", handler: handler1 }]),
    );
    renderHook(() =>
      useKeyboardScope("scope2", [{ key: "x", handler: handler2 }]),
    );

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "x", bubbles: true }),
    );

    // scope2 was pushed last, should win
    expect(handler2).toHaveBeenCalledOnce();
    expect(handler1).not.toHaveBeenCalled();
  });
});
