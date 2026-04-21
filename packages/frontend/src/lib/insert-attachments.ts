import type { AttachmentBlock } from "@pearl/shared";
import { parseField, serializeField } from "@pearl/shared";

export function insertAttachments(
  currentText: string,
  cursorPos: number,
  newBlocks: Array<{ block: AttachmentBlock; altText: string }>,
): string {
  const parsed = currentText ? parseField(currentText) : { prose: "", blocks: new Map() };
  const proseEnd = parsed.prose.length;
  const insertPos = Math.min(cursorPos, proseEnd);

  let pillText = "";
  for (const { block, altText } of newBlocks) {
    const pill = `[img:${block.ref}]`;
    pillText += altText ? `${altText}: ${pill}\n` : `${pill}\n`;
  }

  const newProse =
    parsed.prose.slice(0, insertPos) +
    (insertPos > 0 && parsed.prose[insertPos - 1] !== "\n" ? "\n" : "") +
    pillText +
    parsed.prose.slice(insertPos);

  const deduped = new Map(parsed.blocks);
  for (const { block } of newBlocks) {
    deduped.set(block.ref, block);
  }
  return serializeField(newProse, [...deduped.values()]);
}
