import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AltTextDialog } from "./alt-text-dialog";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe("AltTextDialog", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <AltTextDialog isOpen={false} fileName="test.png" onSubmit={vi.fn()} onSkip={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders dialog with file name when open", () => {
    render(
      <AltTextDialog isOpen={true} fileName="screenshot.png" onSubmit={vi.fn()} onSkip={vi.fn()} />,
    );
    expect(screen.getByText(/screenshot\.png/)).toBeInTheDocument();
    expect(screen.getByText("Add alt text")).toBeInTheDocument();
  });

  it("calls onSubmit with entered text", () => {
    const onSubmit = vi.fn();
    render(
      <AltTextDialog isOpen={true} fileName="test.png" onSubmit={onSubmit} onSkip={vi.fn()} />,
    );

    const input = screen.getByLabelText("Alt text for image");
    fireEvent.change(input, { target: { value: "Login page screenshot" } });
    fireEvent.click(screen.getByText("Insert"));

    expect(onSubmit).toHaveBeenCalledWith("Login page screenshot");
  });

  it("calls onSubmit with empty string when input is blank", () => {
    const onSubmit = vi.fn();
    render(
      <AltTextDialog isOpen={true} fileName="test.png" onSubmit={onSubmit} onSkip={vi.fn()} />,
    );

    fireEvent.click(screen.getByText("Insert"));
    expect(onSubmit).toHaveBeenCalledWith("");
  });

  it("calls onSkip when Skip button is clicked", () => {
    const onSkip = vi.fn();
    render(<AltTextDialog isOpen={true} fileName="test.png" onSubmit={vi.fn()} onSkip={onSkip} />);

    fireEvent.click(screen.getByText("Skip"));
    expect(onSkip).toHaveBeenCalled();
  });

  it("submits on form Enter key", () => {
    const onSubmit = vi.fn();
    render(
      <AltTextDialog isOpen={true} fileName="test.png" onSubmit={onSubmit} onSkip={vi.fn()} />,
    );

    const input = screen.getByLabelText("Alt text for image");
    fireEvent.change(input, { target: { value: "My alt text" } });
    fireEvent.submit(input.closest("form")!);

    expect(onSubmit).toHaveBeenCalledWith("My alt text");
  });
});
