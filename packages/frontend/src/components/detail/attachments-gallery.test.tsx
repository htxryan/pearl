import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttachmentsGallery } from "./attachments-gallery";

vi.mock("@/hooks/use-attachment-context", () => ({
  useAllAttachmentRefs: vi.fn(),
  useAttachmentBlob: vi.fn(),
  useAttachmentSourceLabel: vi.fn(() => undefined),
}));

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn().mockImplementation(({ count }: { count: number }) => ({
    getTotalSize: () => count * 128,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        index: i,
        start: i * 128,
        size: 120,
      })),
  })),
}));

import { useAllAttachmentRefs, useAttachmentBlob } from "@/hooks/use-attachment-context";

const mockUseAllRefs = vi.mocked(useAllAttachmentRefs);
const mockUseBlob = vi.mocked(useAttachmentBlob);

const mockIntersectionObserver = vi.fn().mockImplementation((cb: IntersectionObserverCallback) => ({
  observe: vi.fn().mockImplementation((el: Element) => {
    cb(
      [{ isIntersecting: true, target: el } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  }),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));
vi.stubGlobal("IntersectionObserver", mockIntersectionObserver);

describe("AttachmentsGallery", () => {
  it("renders nothing when no attachments", () => {
    mockUseAllRefs.mockReturnValue([]);
    const { container } = render(<AttachmentsGallery />);
    expect(container.firstChild).toBeNull();
  });

  it("renders gallery with attachment count", () => {
    mockUseAllRefs.mockReturnValue([
      {
        ref: "a1b2c3d4e5f6",
        block: { type: "inline", ref: "a1b2c3d4e5f6" as any, mime: "image/webp", data: "" },
      },
      {
        ref: "112233445566",
        block: { type: "inline", ref: "112233445566" as any, mime: "image/webp", data: "" },
      },
    ]);
    mockUseBlob.mockReturnValue({ status: "loaded", objectUrl: "blob:test" });

    render(<AttachmentsGallery />);

    expect(screen.getByText("Attachments (2)")).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("shows broken placeholder for failed attachments", () => {
    mockUseAllRefs.mockReturnValue([
      {
        ref: "a1b2c3d4e5f6",
        block: {
          type: "local",
          ref: "a1b2c3d4e5f6" as any,
          mime: "image/webp",
          scope: "project" as const,
          path: "missing.webp",
          sha256: "a".repeat(64),
        },
      },
    ]);
    mockUseBlob.mockReturnValue({ status: "error", error: "file not found" });

    render(<AttachmentsGallery />);

    expect(screen.getByText("a1b2c3d4")).toBeInTheDocument();
    expect(screen.getByText("file not found")).toBeInTheDocument();
  });

  it("shows loading state for pending attachments", () => {
    mockUseAllRefs.mockReturnValue([
      {
        ref: "a1b2c3d4e5f6",
        block: { type: "inline", ref: "a1b2c3d4e5f6" as any, mime: "image/webp", data: "" },
      },
    ]);
    mockUseBlob.mockReturnValue({ status: "loading" });

    render(<AttachmentsGallery />);

    const grid = screen.getByRole("list");
    expect(grid).toBeInTheDocument();
    const button = grid.querySelector('button[aria-label="Attachment a1b2c3d4"]');
    expect(button).toBeInTheDocument();
  });

  it("renders thumbnail image when loaded", () => {
    mockUseAllRefs.mockReturnValue([
      {
        ref: "a1b2c3d4e5f6",
        block: { type: "inline", ref: "a1b2c3d4e5f6" as any, mime: "image/webp", data: "" },
      },
    ]);
    mockUseBlob.mockReturnValue({ status: "loaded", objectUrl: "blob:http://localhost/img" });

    render(<AttachmentsGallery />);

    const img = screen.getByAltText("Attachment a1b2c3d4");
    expect(img).toHaveAttribute("src", "blob:http://localhost/img");
  });
});
