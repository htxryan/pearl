import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageDropZone } from "./image-drop-zone";

function createDragEvent(type: string, files: File[] = []) {
  const items = files.map((f) => ({
    kind: "file",
    type: f.type,
    getAsFile: () => f,
  }));

  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    dataTransfer: {
      items: Object.assign(items, { length: items.length }),
      files,
    },
  };
}

describe("ImageDropZone", () => {
  it("renders children", () => {
    render(
      <ImageDropZone onDrop={vi.fn()}>
        <span>Editor content</span>
      </ImageDropZone>,
    );
    expect(screen.getByText("Editor content")).toBeInTheDocument();
  });

  it("shows overlay on drag enter", () => {
    render(
      <ImageDropZone onDrop={vi.fn()}>
        <span>Editor</span>
      </ImageDropZone>,
    );

    const zone = screen.getByText("Editor").parentElement!;
    fireEvent.dragEnter(zone, createDragEvent("dragenter"));

    expect(screen.getByText("Drop images here")).toBeInTheDocument();
  });

  it("hides overlay on drag leave", () => {
    render(
      <ImageDropZone onDrop={vi.fn()}>
        <span>Editor</span>
      </ImageDropZone>,
    );

    const zone = screen.getByText("Editor").parentElement!;
    fireEvent.dragEnter(zone, createDragEvent("dragenter"));
    expect(screen.getByText("Drop images here")).toBeInTheDocument();

    fireEvent.dragLeave(zone, createDragEvent("dragleave"));
    expect(screen.queryByText("Drop images here")).not.toBeInTheDocument();
  });

  it("calls onDrop with image files on drop", () => {
    const onDrop = vi.fn();
    render(
      <ImageDropZone onDrop={onDrop}>
        <span>Editor</span>
      </ImageDropZone>,
    );

    const imageFile = new File(["img"], "test.png", { type: "image/png" });
    const zone = screen.getByText("Editor").parentElement!;
    fireEvent.drop(zone, createDragEvent("drop", [imageFile]));

    expect(onDrop).toHaveBeenCalledWith([imageFile]);
  });

  it("does not call onDrop when disabled", () => {
    const onDrop = vi.fn();
    render(
      <ImageDropZone onDrop={onDrop} disabled>
        <span>Editor</span>
      </ImageDropZone>,
    );

    const imageFile = new File(["img"], "test.png", { type: "image/png" });
    const zone = screen.getByText("Editor").parentElement!;
    fireEvent.drop(zone, createDragEvent("drop", [imageFile]));

    expect(onDrop).not.toHaveBeenCalled();
  });

  it("filters out non-image files on drop", () => {
    const onDrop = vi.fn();
    render(
      <ImageDropZone onDrop={onDrop}>
        <span>Editor</span>
      </ImageDropZone>,
    );

    const textFile = new File(["txt"], "doc.txt", { type: "text/plain" });
    const zone = screen.getByText("Editor").parentElement!;

    const event = createDragEvent("drop", [textFile]);
    event.dataTransfer.items = Object.assign(
      [{ kind: "file", type: "text/plain", getAsFile: () => textFile }],
      { length: 1 },
    ) as unknown as DataTransferItemList;

    fireEvent.drop(zone, event);
    expect(onDrop).not.toHaveBeenCalled();
  });
});
