import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttachmentPill } from "./attachment-pill";

vi.mock("@/hooks/use-attachment-context", () => ({
  useAttachmentBlob: vi.fn(),
}));

import { useAttachmentBlob } from "@/hooks/use-attachment-context";

const mockUseAttachmentBlob = vi.mocked(useAttachmentBlob);

describe("AttachmentPill", () => {
  it("renders skeleton when loading", () => {
    mockUseAttachmentBlob.mockReturnValue({ status: "loading" });
    render(<AttachmentPill data-ref="a1b2c3d4e5f6" data-index={1} />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toHaveAttribute("aria-label", "Loading attachment 1");
    expect(skeleton).toHaveClass("animate-pulse");
  });

  it("renders loaded pill with index number", () => {
    mockUseAttachmentBlob.mockReturnValue({
      status: "loaded",
      objectUrl: "blob:http://localhost/abc",
    });
    render(<AttachmentPill data-ref="a1b2c3d4e5f6" data-index={3} />);

    const pill = screen.getByRole("button", { name: "Attachment 3" });
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveAttribute("data-ref", "a1b2c3d4e5f6");

    const img = pill.querySelector("img");
    expect(img).toHaveAttribute("src", "blob:http://localhost/abc");
  });

  it("renders broken pill with ref and reason", () => {
    mockUseAttachmentBlob.mockReturnValue({
      status: "error",
      error: "file not found",
    });
    render(<AttachmentPill data-ref="a1b2c3d4e5f6" data-index={2} />);

    const broken = screen.getByRole("img");
    expect(broken).toHaveAttribute("aria-label", "Broken attachment a1b2c3d4e5f6: file not found");
    expect(broken).toHaveAttribute("title", "file not found");
    expect(broken.textContent).toContain("a1b2c3d4");
  });

  it("pill is keyboard-focusable", () => {
    mockUseAttachmentBlob.mockReturnValue({ status: "loaded", objectUrl: "blob:x" });
    render(<AttachmentPill data-ref="a1b2c3d4e5f6" data-index={1} />);

    const pill = screen.getByRole("button");
    expect(pill.tagName).toBe("BUTTON");
  });

  it("skeleton respects prefers-reduced-motion", () => {
    mockUseAttachmentBlob.mockReturnValue({ status: "loading" });
    render(<AttachmentPill data-ref="a1b2c3d4e5f6" data-index={1} />);

    const skeleton = screen.getByRole("status");
    expect(skeleton.className).toContain("motion-reduce:animate-none");
  });
});
