import { PILL_RE } from "@pearl/shared";

interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
  data?: Record<string, unknown>;
}

const PILL_RE_GLOBAL = new RegExp(PILL_RE.source, "g");

function splitTextNode(text: string, pillCounter: { value: number }): MdastNode[] {
  const nodes: MdastNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(PILL_RE_GLOBAL)) {
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
    if (node.type === "text" && node.value && PILL_RE_GLOBAL.test(node.value)) {
      PILL_RE_GLOBAL.lastIndex = 0;
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

export function remarkAttachmentPills() {
  return (tree: MdastNode) => {
    const pillCounter = { value: 0 };

    if (tree.children) {
      for (const node of tree.children) {
        if (node.children) {
          node.children = walkAndReplace(node.children, pillCounter);
        }
      }
    }
  };
}
