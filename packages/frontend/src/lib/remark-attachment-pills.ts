import { PILL_RE } from "@pearl/shared";

interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
  data?: Record<string, unknown>;
}

function splitTextNode(text: string, pillCounter: { value: number }): MdastNode[] {
  const nodes: MdastNode[] = [];
  let lastIndex = 0;
  const re = new RegExp(PILL_RE.source, "g");

  for (const match of text.matchAll(re)) {
    const ref = match[1];
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    if (matchStart > lastIndex) {
      nodes.push({ type: "text", value: text.slice(lastIndex, matchStart) });
    }

    pillCounter.value += 1;
    nodes.push({
      type: "attachmentPill",
      data: {
        hName: "attachment-pill",
        hProperties: { "data-ref": ref, "data-index": pillCounter.value },
      },
      children: [],
    });

    lastIndex = matchEnd;
  }

  if (lastIndex < text.length) {
    nodes.push({ type: "text", value: text.slice(lastIndex) });
  }

  return nodes;
}

function walkAndReplace(nodes: MdastNode[], pillCounter: { value: number }): MdastNode[] {
  const result: MdastNode[] = [];
  for (const node of nodes) {
    if (node.type === "text" && node.value && PILL_RE.test(node.value)) {
      result.push(...splitTextNode(node.value, pillCounter));
    } else if (node.children) {
      node.children = walkAndReplace(node.children, pillCounter);
      result.push(node);
    } else {
      result.push(node);
    }
  }
  return result;
}

const ATTACHMENT_BLOCK_RE = /<!--\s*pearl-attachment:v\d+:[0-9a-f]{12}[\s\S]*?-->/;

function stripAttachmentBlocks(nodes: MdastNode[]): MdastNode[] {
  const result: MdastNode[] = [];
  for (const node of nodes) {
    if (node.type === "html" && node.value && ATTACHMENT_BLOCK_RE.test(node.value)) {
      continue; // drop the whole HTML node for pearl-attachment blocks
    }
    if (node.type === "text" && node.value && ATTACHMENT_BLOCK_RE.test(node.value)) {
      const cleaned = node.value.replace(new RegExp(ATTACHMENT_BLOCK_RE.source, "g"), "").trim();
      if (cleaned) {
        result.push({ ...node, value: cleaned });
      }
      continue;
    }
    if (node.children) {
      const filteredChildren = stripAttachmentBlocks(node.children);
      // Drop paragraph/block wrappers that became empty after stripping
      if (filteredChildren.length === 0 && (node.type === "paragraph" || node.type === "html")) {
        continue;
      }
      result.push({ ...node, children: filteredChildren });
    } else {
      result.push(node);
    }
  }
  return result;
}

export function remarkAttachmentPills() {
  return (tree: MdastNode) => {
    const pillCounter = { value: 0 };

    if (tree.children) {
      // First strip attachment data blocks
      tree.children = stripAttachmentBlocks(tree.children);
      // Then replace [img:ref] pills in remaining text nodes
      for (const node of tree.children) {
        if (node.children) {
          node.children = walkAndReplace(node.children, pillCounter);
        }
      }
    }
  };
}
