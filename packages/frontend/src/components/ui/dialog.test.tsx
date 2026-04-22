import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Dialog } from "./dialog";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe("Dialog", () => {
  it("keeps dialog mounted but renders no children when closed", () => {
    const { container } = render(
      <Dialog isOpen={false} onClose={vi.fn()}>
        <p>Content</p>
      </Dialog>,
    );
    expect(container.querySelector("dialog")).toBeInTheDocument();
    expect(container.querySelector("dialog")?.innerHTML).toBe("");
  });

  it("renders children when open", () => {
    render(
      <Dialog isOpen={true} onClose={vi.fn()}>
        <p>Hello Dialog</p>
      </Dialog>,
    );
    expect(screen.getByText("Hello Dialog")).toBeInTheDocument();
  });

  it("calls showModal when opened", () => {
    render(
      <Dialog isOpen={true} onClose={vi.fn()}>
        <p>Content</p>
      </Dialog>,
    );
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("applies text-foreground class for dark-mode compatibility", () => {
    render(
      <Dialog isOpen={true} onClose={vi.fn()}>
        <p>Content</p>
      </Dialog>,
    );
    const dialog = screen.getByText("Content").closest("dialog");
    expect(dialog?.className).toContain("text-foreground");
  });

  it("applies bg-background and border-border theme tokens", () => {
    render(
      <Dialog isOpen={true} onClose={vi.fn()}>
        <p>Content</p>
      </Dialog>,
    );
    const dialog = screen.getByText("Content").closest("dialog");
    expect(dialog?.className).toContain("bg-background");
    expect(dialog?.className).toContain("border-border");
  });

  it("applies size-sm by default", () => {
    render(
      <Dialog isOpen={true} onClose={vi.fn()}>
        <p>Content</p>
      </Dialog>,
    );
    const dialog = screen.getByText("Content").closest("dialog");
    expect(dialog?.className).toContain("max-w-sm");
  });

  it("applies size-lg when specified", () => {
    render(
      <Dialog isOpen={true} onClose={vi.fn()} size="lg">
        <p>Content</p>
      </Dialog>,
    );
    const dialog = screen.getByText("Content").closest("dialog");
    expect(dialog?.className).toContain("max-w-lg");
  });

  it("calls onClose when dialog fires close event", () => {
    const onClose = vi.fn();
    render(
      <Dialog isOpen={true} onClose={onClose}>
        <p>Content</p>
      </Dialog>,
    );
    const dialog = screen.getByText("Content").closest("dialog")!;
    fireEvent(dialog, new Event("close", { bubbles: false }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose on backdrop click", () => {
    const onClose = vi.fn();
    render(
      <Dialog isOpen={true} onClose={onClose}>
        <p>Content</p>
      </Dialog>,
    );
    const dialog = screen.getByText("Content").closest("dialog")!;
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose when clicking content inside dialog", () => {
    const onClose = vi.fn();
    render(
      <Dialog isOpen={true} onClose={onClose}>
        <p>Content</p>
      </Dialog>,
    );
    fireEvent.click(screen.getByText("Content"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("forwards onCancel to dialog element", () => {
    const onCancel = vi.fn((e: React.SyntheticEvent) => e.preventDefault());
    render(
      <Dialog isOpen={true} onClose={vi.fn()} onCancel={onCancel}>
        <p>Content</p>
      </Dialog>,
    );
    const dialog = screen.getByText("Content").closest("dialog")!;
    fireEvent(dialog, new Event("cancel", { bubbles: true }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("merges custom className", () => {
    render(
      <Dialog isOpen={true} onClose={vi.fn()} className="custom-test-class">
        <p>Content</p>
      </Dialog>,
    );
    const dialog = screen.getByText("Content").closest("dialog");
    expect(dialog?.className).toContain("custom-test-class");
  });
});
