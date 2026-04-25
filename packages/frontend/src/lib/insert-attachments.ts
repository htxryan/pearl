import type { AttachmentBlock, Ref } from "@pearl/shared";
import { parseField, serializeField } from "@pearl/shared";

export function insertAttachments(
  currentText: string,
  cursorPos: number,
  newBlocks: AttachmentBlock[],
): string {
  const parsed = currentText
    ? parseField(currentText)
    : { prose: "", blocks: new Map<Ref, AttachmentBlock>(), refsInProse: [] as Ref[] };
  const proseEnd = parsed.prose.length;
  const insertPos = Math.min(cursorPos, proseEnd);
  const existingCount = parsed.refsInProse.length;

  let pillText = "";
  newBlocks.forEach((block, index) => {
    const altText = `image ${existingCount + index + 1}`;
    pillText += `${altText}: [img:${block.ref}]\n`;
  });

  const newProse =
    parsed.prose.slice(0, insertPos) +
    (insertPos > 0 && parsed.prose[insertPos - 1] !== "\n" ? "\n" : "") +
    pillText +
    parsed.prose.slice(insertPos);

  const deduped = new Map(parsed.blocks);
  for (const block of newBlocks) {
    deduped.set(block.ref, block);
  }
  return serializeField(newProse, [...deduped.values()]);
}
