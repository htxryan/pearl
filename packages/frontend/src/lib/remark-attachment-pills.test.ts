import { describe, expect, it } from "vitest";
import { remarkAttachmentPills } from "./remark-attachment-pills";

function makeTree(markdown: string) {
  return {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: [{ type: "text", value: markdown }],
      },
    ],
  };
}

describe("remarkAttachmentPills", () => {
  const transform = remarkAttachmentPills();

  it("transforms [img:ref] into attachmentPill nodes", () => {
    const tree = makeTree("hello [img:a1b2c3d4e5f6] world");
    transform(tree);

    const children = tree.children[0].children;
    expect(children).toHaveLength(3);
    expect(children[0]).toEqual({ type: "text", value: "hello " });
    expect(children[1]).toMatchObject({
      type: "attachmentPill",
      data: {
        hName: "attachment-pill",
        hProperties: { "data-ref": "a1b2c3d4e5f6", "data-index": 1 },
      },
    });
    expect(children[2]).toEqual({ type: "text", value: " world" });
  });

  it("assigns sequential indices to multiple pills", () => {
    const tree = makeTree("[img:aabbccdd0011] text [img:112233445566]");
    transform(tree);

    const children = tree.children[0].children;
    expect(children).toHaveLength(3);
    expect(children[0].data.hProperties["data-index"]).toBe(1);
    expect(children[2].data.hProperties["data-index"]).toBe(2);
  });

  it("leaves text without pills unchanged", () => {
    const tree = makeTree("no pills here");
    transform(tree);

    expect(tree.children[0].children).toHaveLength(1);
    expect(tree.children[0].children[0]).toEqual({ type: "text", value: "no pills here" });
  });

  it("handles pill at start of text", () => {
    const tree = makeTree("[img:a1b2c3d4e5f6] trailing");
    transform(tree);

    const children = tree.children[0].children;
    expect(children).toHaveLength(2);
    expect(children[0].type).toBe("attachmentPill");
    expect(children[1]).toEqual({ type: "text", value: " trailing" });
  });

  it("handles pill at end of text", () => {
    const tree = makeTree("leading [img:a1b2c3d4e5f6]");
    transform(tree);

    const children = tree.children[0].children;
    expect(children).toHaveLength(2);
    expect(children[0]).toEqual({ type: "text", value: "leading " });
    expect(children[1].type).toBe("attachmentPill");
  });

  it("ignores invalid refs (wrong length)", () => {
    const tree = makeTree("not a pill [img:abc123] or [img:toolongtobevalid]");
    transform(tree);

    expect(tree.children[0].children).toHaveLength(1);
    expect(tree.children[0].children[0].type).toBe("text");
  });

  it("handles nested elements (bold with pill inside)", () => {
    const tree = {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            {
              type: "strong",
              children: [{ type: "text", value: "bold [img:a1b2c3d4e5f6] text" }],
            },
          ],
        },
      ],
    };
    transform(tree);

    const strong = tree.children[0].children[0];
    expect(strong.children).toHaveLength(3);
    expect(strong.children[1].type).toBe("attachmentPill");
  });
});
