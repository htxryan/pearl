import type { AttachmentBlock, Comment } from "@pearl/shared";
import { parseField, serializeField } from "@pearl/shared";
import { useCallback, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AltTextDialog } from "@/components/detail/alt-text-dialog";
import { AttachmentPill } from "@/components/detail/attachment-pill";
import { ImageDropZone } from "@/components/detail/image-drop-zone";
import { UploadErrors } from "@/components/detail/upload-errors";
import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";
import { extractImageFiles, type UploadResult, useImageUpload } from "@/hooks/use-image-upload";
import { remarkAttachmentPills } from "@/lib/remark-attachment-pills";

const commentRemarkPlugins = [remarkGfm, remarkAttachmentPills];

// biome-ignore lint/suspicious/noExplicitAny: react-markdown components typing
const commentComponents: Record<string, React.ComponentType<any>> = {
  "attachment-pill": AttachmentPill,
};

interface CommentThreadProps {
  comments: Comment[];
  onAdd: (text: string) => Promise<unknown>;
  isAdding: boolean;
  hideTitle?: boolean;
}

interface PendingAltText {
  results: Array<UploadResult & { altText?: string }>;
  currentIndex: number;
}

function insertAttachments(
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

  const allBlocks = [...parsed.blocks.values(), ...newBlocks.map((b) => b.block)];
  return serializeField(newProse, allBlocks);
}

export function CommentThread({ comments, onAdd, isAdding, hideTitle }: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cursorPosRef = useRef(0);

  const { uploadFiles, isUploading, progress, lastErrors, clearErrors } = useImageUpload();
  const [altTextState, setAltTextState] = useState<PendingAltText | null>(null);

  const submitComment = () => {
    if (isAdding || isUploading) return;
    const trimmed = newComment.trim();
    if (!trimmed) return;
    setError(null);
    onAdd(trimmed)
      .then(() => setNewComment(""))
      .catch(() => setError("Failed to post comment. Please try again."));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitComment();
  };

  const finishAltTextAndInsert = useCallback(
    (pending: PendingAltText) => {
      const blocks = pending.results.map((r) => ({
        block: r.block,
        altText: r.altText ?? "",
      }));
      const newText = insertAttachments(newComment, cursorPosRef.current, blocks);
      setNewComment(newText);
      setAltTextState(null);
    },
    [newComment],
  );

  const handleAltTextSubmit = useCallback(
    (altText: string) => {
      if (!altTextState) return;
      const updated = { ...altTextState };
      updated.results[updated.currentIndex].altText = altText;
      const nextIndex = updated.currentIndex + 1;
      if (nextIndex >= updated.results.length) {
        finishAltTextAndInsert(updated);
      } else {
        setAltTextState({ ...updated, currentIndex: nextIndex });
      }
    },
    [altTextState, finishAltTextAndInsert],
  );

  const handleAltTextSkip = useCallback(() => {
    if (!altTextState) return;
    const updated = { ...altTextState };
    updated.results[updated.currentIndex].altText = "";
    const nextIndex = updated.currentIndex + 1;
    if (nextIndex >= updated.results.length) {
      finishAltTextAndInsert(updated);
    } else {
      setAltTextState({ ...updated, currentIndex: nextIndex });
    }
  }, [altTextState, finishAltTextAndInsert]);

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      cursorPosRef.current = textareaRef.current?.selectionStart ?? newComment.length;

      const { results } = await uploadFiles(files);
      if (results.length === 0) return;

      setAltTextState({
        results: results.map((r) => ({ ...r, altText: undefined })),
        currentIndex: 0,
      });
    },
    [uploadFiles, newComment.length],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = extractImageFiles(e.clipboardData.items);
      if (files.length > 0) {
        e.preventDefault();
        processFiles(files);
      }
    },
    [processFiles],
  );

  const handleDrop = useCallback(
    (files: File[]) => {
      processFiles(files);
    },
    [processFiles],
  );

  const handleFilePick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFiles(Array.from(files));
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [processFiles],
  );

  const currentAltResult = altTextState?.results[altTextState.currentIndex];

  return (
    <section>
      {!hideTitle && (
        <h2 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3">
          Comments ({comments.length})
        </h2>
      )}

      {/* Comment list */}
      {comments.length > 0 ? (
        <div className="space-y-3 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{comment.author}</span>
                <RelativeTime iso={comment.created_at} className="text-xs text-muted-foreground" />
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <Markdown remarkPlugins={commentRemarkPlugins} components={commentComponents}>
                  {comment.text}
                </Markdown>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-6 text-muted-foreground mb-4">
          <span className="text-3xl opacity-20 mb-1" aria-hidden="true">
            &#9998;
          </span>
          <p className="text-sm">No comments yet. Start the conversation below.</p>
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <ImageDropZone onDrop={handleDrop} disabled={isUploading}>
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onPaste={handlePaste}
            placeholder="Add a comment..."
            className="w-full min-h-[80px] text-sm bg-transparent border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submitComment();
              }
            }}
          />
        </ImageDropZone>

        {isUploading && progress && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Uploading {progress.completed}/{progress.total}...
          </div>
        )}

        <UploadErrors errors={lastErrors} onDismiss={clearErrors} />

        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Cmd+Enter to submit</span>
            <button
              type="button"
              onClick={handleFilePick}
              title="Attach image"
              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3.5 h-3.5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81V14.75c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.06l-2.72-2.72a.75.75 0 0 0-1.06 0l-2.97 2.97-1.22-1.22a.75.75 0 0 0-1.06 0L2.5 11.06ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          <Button type="submit" size="sm" disabled={!newComment.trim() || isAdding || isUploading}>
            {isAdding ? "Posting..." : "Comment"}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          aria-label="Pick image files"
        />
      </form>

      <AltTextDialog
        isOpen={!!currentAltResult}
        fileName={currentAltResult?.fileName ?? ""}
        onSubmit={handleAltTextSubmit}
        onSkip={handleAltTextSkip}
      />
    </section>
  );
}
