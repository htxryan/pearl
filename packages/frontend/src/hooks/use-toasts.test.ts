import { renderHook } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addToast, dismissToast, useToasts } from "./use-toasts";

vi.mock("sonner", () => {
  const dismiss = vi.fn();
  const success = vi.fn(() => "toast-1");
  const error = vi.fn(() => "toast-2");
  const warning = vi.fn(() => "toast-3");
  const info = vi.fn(() => "toast-4");
  const loading = vi.fn(() => "toast-5");
  return {
    toast: Object.assign(vi.fn(), { success, error, warning, info, loading, dismiss }),
    Toaster: () => null,
  };
});

describe("useToasts adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("addToast", () => {
    it("dispatches success to toast.success", () => {
      const id = addToast({ message: "Done!", variant: "success" });
      expect(toast.success).toHaveBeenCalledWith("Done!", {});
      expect(id).toBe("toast-1");
    });

    it("dispatches error to toast.error with 5s default", () => {
      addToast({ message: "Failed", variant: "error" });
      expect(toast.error).toHaveBeenCalledWith("Failed", { duration: 5000 });
    });

    it("dispatches error with custom duration override", () => {
      addToast({ message: "Oops", variant: "error", duration: 2000 });
      expect(toast.error).toHaveBeenCalledWith("Oops", { duration: 2000 });
    });

    it("dispatches warning to toast.warning", () => {
      addToast({ message: "Careful", variant: "warning" });
      expect(toast.warning).toHaveBeenCalledWith("Careful", {});
    });

    it("dispatches info to toast.info", () => {
      addToast({ message: "FYI", variant: "info" });
      expect(toast.info).toHaveBeenCalledWith("FYI", {});
    });

    it("passes action through to sonner", () => {
      const onClick = vi.fn();
      addToast({ message: "Undo?", variant: "success", action: { label: "Undo", onClick } });
      expect(toast.success).toHaveBeenCalledWith("Undo?", {
        action: { label: "Undo", onClick },
      });
    });

    it("passes custom duration through", () => {
      addToast({ message: "Quick", variant: "info", duration: 1000 });
      expect(toast.info).toHaveBeenCalledWith("Quick", { duration: 1000 });
    });
  });

  describe("dismissToast", () => {
    it("calls toast.dismiss with the given id", () => {
      dismissToast("toast-42");
      expect(toast.dismiss).toHaveBeenCalledWith("toast-42");
    });
  });

  describe("useToasts hook", () => {
    it("returns all severity methods plus loading and dismiss", () => {
      const { result } = renderHook(() => useToasts());
      expect(result.current).toHaveProperty("success");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("warning");
      expect(result.current).toHaveProperty("info");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("dismiss");
    });

    it("success dispatches to sonner toast.success", () => {
      const { result } = renderHook(() => useToasts());
      result.current.success("Saved!");
      expect(toast.success).toHaveBeenCalledWith("Saved!", {});
    });

    it("error dispatches to sonner toast.error", () => {
      const { result } = renderHook(() => useToasts());
      result.current.error("Boom");
      expect(toast.error).toHaveBeenCalledWith("Boom", { duration: 5000 });
    });

    it("warning dispatches to sonner toast.warning", () => {
      const { result } = renderHook(() => useToasts());
      result.current.warning("Watch out");
      expect(toast.warning).toHaveBeenCalledWith("Watch out", {});
    });

    it("info dispatches to sonner toast.info", () => {
      const { result } = renderHook(() => useToasts());
      result.current.info("Note");
      expect(toast.info).toHaveBeenCalledWith("Note", {});
    });

    it("loading dispatches to sonner toast.loading", () => {
      const { result } = renderHook(() => useToasts());
      result.current.loading("Working...");
      expect(toast.loading).toHaveBeenCalledWith("Working...", undefined);
    });

    it("dismiss dispatches to sonner toast.dismiss", () => {
      const { result } = renderHook(() => useToasts());
      result.current.dismiss("toast-99");
      expect(toast.dismiss).toHaveBeenCalledWith("toast-99");
    });

    it("dismiss with no args dismisses all", () => {
      const { result } = renderHook(() => useToasts());
      result.current.dismiss();
      expect(toast.dismiss).toHaveBeenCalledWith(undefined);
    });
  });
});
