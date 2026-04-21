import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Lightbox } from "./lightbox";

vi.mock("@/hooks/use-attachment-context", () => ({
  useAttachmentBlob: vi.fn(),
  useAllAttachmentRefs: vi.fn(),
  useAttachmentCacheCheck: vi.fn(),
  useAttachmentSourceLabel: vi.fn(() => undefined),
}));

vi.mock("@/components/keyboard-help", () => ({
  toggleKeyboardHelp: vi.fn(),
}));

import {
  useAllAttachmentRefs,
  useAttachmentBlob,
  useAttachmentCacheCheck,
} from "@/hooks/use-attachment-context";

const mockUseAllRefs = vi.mocked(useAllAttachmentRefs);
const mockUseBlob = vi.mocked(useAttachmentBlob);
const mockUseCacheCheck = vi.mocked(useAttachmentCacheCheck);

function makeRefs(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const ref = `ref${String(i).padStart(9, "0")}`;
    return {
      ref,
      block: { type: "inline" as const, ref: ref as any, mime: "image/webp", data: "" },
    };
  });
}

function setupBlobs(statuses: Array<"loaded" | "error" | "loading">) {
  mockUseBlob.mockImplementation((ref: string) => {
    const idx = Number.parseInt(ref.replace("ref", ""), 10);
    const status = statuses[idx] ?? "loaded";
    if (status === "loaded") {
      return { status: "loaded", objectUrl: `blob:img-${idx}` };
    }
    if (status === "error") {
      return { status: "error", error: "file not found" };
    }
    return { status: "loading" };
  });
  mockUseCacheCheck.mockReturnValue((ref: string) => {
    const idx = Number.parseInt(ref.replace("ref", ""), 10);
    return statuses[idx] ?? "loaded";
  });
}

function pressKey(key: string) {
  const dialog = screen.getByRole("dialog");
  fireEvent.keyDown(dialog, { key });
}

describe("Lightbox", () => {
  it("does not render when closed", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(3));
    setupBlobs(["loaded", "loaded", "loaded"]);

    const { container } = render(<Lightbox activeRef={null} onClose={vi.fn()} />);
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });

  it("renders modal with image when opened", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(3));
    setupBlobs(["loaded", "loaded", "loaded"]);

    render(<Lightbox activeRef="ref000000001" onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-label", "Image viewer");

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "blob:img-1");
  });

  it("shows image counter (N of M)", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(5));
    setupBlobs(["loaded", "loaded", "loaded", "loaded", "loaded"]);

    render(<Lightbox activeRef="ref000000002" onClose={vi.fn()} />);

    expect(screen.getByText("3 of 5")).toBeInTheDocument();
  });

  it("closes on Escape key", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(1));
    setupBlobs(["loaded"]);
    const onClose = vi.fn();

    render(<Lightbox activeRef="ref000000000" onClose={onClose} />);

    pressKey("Escape");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on backdrop click", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(1));
    setupBlobs(["loaded"]);
    const onClose = vi.fn();

    render(<Lightbox activeRef="ref000000000" onClose={onClose} />);

    const backdrop = screen.getByTestId("lightbox-backdrop");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("navigates forward with ArrowRight", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(3));
    setupBlobs(["loaded", "loaded", "loaded"]);

    render(<Lightbox activeRef="ref000000000" onClose={vi.fn()} />);

    expect(screen.getByText("1 of 3")).toBeInTheDocument();

    pressKey("ArrowRight");
    expect(screen.getByText("2 of 3")).toBeInTheDocument();

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "blob:img-1");
  });

  it("navigates backward with ArrowLeft", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(3));
    setupBlobs(["loaded", "loaded", "loaded"]);

    render(<Lightbox activeRef="ref000000002" onClose={vi.fn()} />);

    expect(screen.getByText("3 of 3")).toBeInTheDocument();

    pressKey("ArrowLeft");
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
  });

  it("jumps to first with Home key", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(5));
    setupBlobs(["loaded", "loaded", "loaded", "loaded", "loaded"]);

    render(<Lightbox activeRef="ref000000003" onClose={vi.fn()} />);
    expect(screen.getByText("4 of 5")).toBeInTheDocument();

    pressKey("Home");
    expect(screen.getByText("1 of 5")).toBeInTheDocument();
  });

  it("jumps to last with End key", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(5));
    setupBlobs(["loaded", "loaded", "loaded", "loaded", "loaded"]);

    render(<Lightbox activeRef="ref000000000" onClose={vi.fn()} />);
    expect(screen.getByText("1 of 5")).toBeInTheDocument();

    pressKey("End");
    expect(screen.getByText("5 of 5")).toBeInTheDocument();
  });

  it("wraps around at boundaries", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(3));
    setupBlobs(["loaded", "loaded", "loaded"]);

    render(<Lightbox activeRef="ref000000002" onClose={vi.fn()} />);
    expect(screen.getByText("3 of 3")).toBeInTheDocument();

    pressKey("ArrowRight");
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
  });

  it("skips broken images during navigation", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(3));
    setupBlobs(["loaded", "error", "loaded"]);

    render(<Lightbox activeRef="ref000000000" onClose={vi.fn()} />);
    expect(screen.getByText("1 of 3")).toBeInTheDocument();

    pressKey("ArrowRight");
    expect(screen.getByText("3 of 3")).toBeInTheDocument();
  });

  it("stays on current when all others are broken", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(3));
    setupBlobs(["loaded", "error", "error"]);

    render(<Lightbox activeRef="ref000000000" onClose={vi.fn()} />);

    pressKey("ArrowRight");
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
  });

  it("has close button with correct aria-label", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(1));
    setupBlobs(["loaded"]);

    render(<Lightbox activeRef="ref000000000" onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("has previous and next navigation buttons", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(3));
    setupBlobs(["loaded", "loaded", "loaded"]);

    render(<Lightbox activeRef="ref000000001" onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Previous image" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next image" })).toBeInTheDocument();
  });

  it("announces current image for screen readers", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(3));
    setupBlobs(["loaded", "loaded", "loaded"]);

    render(<Lightbox activeRef="ref000000001" onClose={vi.fn()} />);

    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion.textContent).toContain("Image 2 of 3");
  });

  it("does not render with empty attachment list", () => {
    mockUseAllRefs.mockReturnValue([]);
    const { container } = render(<Lightbox activeRef="ref000000000" onClose={vi.fn()} />);
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });

  it("restores focus on close", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(1));
    setupBlobs(["loaded"]);

    const button = document.createElement("button");
    button.textContent = "trigger";
    document.body.appendChild(button);
    button.focus();
    expect(document.activeElement).toBe(button);

    const onClose = vi.fn();
    const { unmount } = render(<Lightbox activeRef="ref000000000" onClose={onClose} />);

    expect(document.activeElement).not.toBe(button);

    unmount();
    expect(document.activeElement).toBe(button);
    document.body.removeChild(button);
  });

  it("clicking the image does not close lightbox", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(1));
    setupBlobs(["loaded"]);
    const onClose = vi.fn();

    render(<Lightbox activeRef="ref000000000" onClose={onClose} />);

    const img = screen.getByRole("img");
    fireEvent.click(img);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("next button navigates forward", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(3));
    setupBlobs(["loaded", "loaded", "loaded"]);

    render(<Lightbox activeRef="ref000000000" onClose={vi.fn()} />);

    const nextBtn = screen.getByRole("button", { name: "Next image" });
    fireEvent.click(nextBtn);
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
  });

  it("previous button navigates backward", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(3));
    setupBlobs(["loaded", "loaded", "loaded"]);

    render(<Lightbox activeRef="ref000000002" onClose={vi.fn()} />);

    const prevBtn = screen.getByRole("button", { name: "Previous image" });
    fireEvent.click(prevBtn);
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
  });

  it("Home key skips broken images", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(4));
    setupBlobs(["error", "loaded", "loaded", "loaded"]);

    render(<Lightbox activeRef="ref000000003" onClose={vi.fn()} />);
    expect(screen.getByText("4 of 4")).toBeInTheDocument();

    pressKey("Home");
    expect(screen.getByText("2 of 4")).toBeInTheDocument();
  });

  it("End key skips broken images", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(4));
    setupBlobs(["loaded", "loaded", "loaded", "error"]);

    render(<Lightbox activeRef="ref000000000" onClose={vi.fn()} />);
    expect(screen.getByText("1 of 4")).toBeInTheDocument();

    pressKey("End");
    expect(screen.getByText("3 of 4")).toBeInTheDocument();
  });

  it("locks body scroll while open", () => {
    mockUseAllRefs.mockReturnValue(makeRefs(1));
    setupBlobs(["loaded"]);

    const { unmount } = render(<Lightbox activeRef="ref000000000" onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
