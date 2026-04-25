import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { Button, type ButtonProps } from "@/components/ui/button";

describe("Button", () => {
  it("renders with default props and displays children text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  describe("variants", () => {
    const variants = ["default", "secondary", "ghost", "destructive", "outline", "link"] as const;

    it.each(variants)("variant=%s renders and is clickable", (variant) => {
      const handler = vi.fn();
      render(
        <Button variant={variant} onClick={handler}>
          {variant}
        </Button>,
      );
      const btn = screen.getByRole("button", { name: variant });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe("sizes", () => {
    const sizes = ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"] as const;

    it.each(sizes)("size=%s renders", (size) => {
      render(
        <Button size={size} aria-label={`size-${size}`}>
          X
        </Button>,
      );
      expect(screen.getByRole("button", { name: `size-${size}` })).toBeInTheDocument();
    });
  });

  it("disabled state prevents click handler from firing", () => {
    const handler = vi.fn();
    render(
      <Button disabled onClick={handler}>
        Disabled
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Disabled" });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(handler).not.toHaveBeenCalled();
  });

  it("forwards ref to the button element", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref test</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe("Ref test");
  });

  it("render prop renders as a different element", () => {
    render(
      // biome-ignore lint/a11y/useAnchorContent: children injected by Button render prop
      <Button render={<a href="/home" />} data-testid="link-btn">
        Go home
      </Button>,
    );
    const el = screen.getByTestId("link-btn");
    expect(el.tagName).toBe("A");
    expect(el.getAttribute("href")).toBe("/home");
    expect(el.textContent).toBe("Go home");
  });

  it("render prop merges button click handler with element", () => {
    const handler = vi.fn();
    render(
      // biome-ignore lint/a11y/useAnchorContent: children injected by Button render prop
      <Button render={<a href="/somewhere" />} onClick={handler}>
        Link
      </Button>,
    );
    const el = screen.getByText("Link");
    fireEvent.click(el);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("render prop preserves pre-existing onClick on the render element", () => {
    const existingHandler = vi.fn();
    const buttonHandler = vi.fn();
    render(
      // biome-ignore lint/a11y/useAnchorContent: children injected by Button render prop
      <Button render={<a href="/somewhere" onClick={existingHandler} />} onClick={buttonHandler}>
        Link
      </Button>,
    );
    const el = screen.getByText("Link");
    fireEvent.click(el);
    expect(existingHandler).toHaveBeenCalledOnce();
    expect(buttonHandler).toHaveBeenCalledOnce();
  });

  it("defaults to type=button to prevent accidental form submission", () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole("button", { name: "Default" }).getAttribute("type")).toBe("button");
  });

  it("allows type override to submit", () => {
    render(
      <Button type="submit" aria-label="Submit form" data-testid="submit-btn">
        Submit
      </Button>,
    );
    const btn = screen.getByTestId("submit-btn");
    expect(btn.getAttribute("type")).toBe("submit");
    expect(btn.getAttribute("aria-label")).toBe("Submit form");
  });

  it("F1: type-level variant/size", () => {
    expectTypeOf<ButtonProps["variant"]>().toEqualTypeOf<
      "default" | "secondary" | "ghost" | "destructive" | "outline" | "link" | undefined | null
    >();

    expectTypeOf<ButtonProps["size"]>().toEqualTypeOf<
      "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg" | undefined | null
    >();
  });
});
