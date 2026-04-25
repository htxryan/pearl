import { hasAttachmentSyntax, parseField } from "@pearl/shared";
import { useCallback, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { AttachmentPill } from "@/components/detail/attachment-pill";
import { ImageDropZone } from "@/components/detail/image-drop-zone";
import { UploadErrors } from "@/components/detail/upload-errors";
import { Button } from "@/components/ui/button";
import { PlusIcon, SaveIcon, XIcon } from "@/components/ui/icons";
import { PencilIcon } from "@/components/ui/pencil-icon";
import { AttachmentProvider } from "@/hooks/use-attachment-context";
import { extractImageFiles, useImageUpload } from "@/hooks/use-image-upload";
import { insertAttachments } from "@/lib/insert-attachments";
import { remarkAttachmentPills } from "@/lib/remark-attachment-pills";

const remarkPluginsPipeline = [remarkGfm, remarkAttachmentPills];
const rehypePluginsPipeline = [rehypeHighlight];

// biome-ignore lint/suspicious/noExplicitAny: react-markdown components typing
const markdownComponents: Record<string, React.ComponentType<any>> = {
  "attachment-pill": AttachmentPill,
};

interface MarkdownSectionProps {
  title: string;
  content?: string;
  field: string;
  onSave: (value: string) => void;
  hideTitle?: boolean;
  /**
   * When true and content is empty (and not editing), render a single compact
   * "Add {title}" button in place of the full section. Used for secondary
   * fields (Design Notes, Acceptance Criteria, Notes) where an empty section
   * would just be visual noise.
   */
  collapseWhenEmpty?: boolean;
}

type EditorTab = "write" | "preview";

function insertAround(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  setValue: (v: string) => void,
) {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const newValue =
    value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
  setValue(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    const newPos = selectionStart + before.length + selected.length;
    textarea.setSelectionRange(newPos, newPos);
  });
}

function insertLinePrefix(
  textarea: HTMLTextAreaElement,
  prefix: string,
  setValue: (v: string) => void,
) {
  const { selectionStart, value } = textarea;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  setValue(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(selectionStart + prefix.length, selectionStart + prefix.length);
  });
}

export function MarkdownSection({
  title,
  content,
  field,
  onSave,
  hideTitle,
  collapseWhenEmpty,
}: MarkdownSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content ?? "");
  const [activeTab, setActiveTab] = useState<EditorTab>("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cursorPosRef = useRef(0);

  const { uploadFiles, isUploading, progress, lastErrors, clearErrors } = useImageUpload();

  const handleSave = () => {
    if (editValue !== (content ?? "")) {
      onSave(editValue);
    }
    setIsEditing(false);
    setActiveTab("write");
  };

  const handleCancel = () => {
    setEditValue(content ?? "");
    setIsEditing(false);
    setActiveTab("write");
  };

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || isUploading) return;
      cursorPosRef.current =
        textareaRef.current?.selectionStart ?? textareaRef.current?.value?.length ?? 0;

      const { results } = await uploadFiles(files);
      if (results.length === 0) return;

      setEditValue((prev) =>
        insertAttachments(
          prev,
          cursorPosRef.current,
          results.map((r) => r.block),
        ),
      );
    },
    [uploadFiles, isUploading],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = extractImageFiles(e.clipboardData.items);
      if (files.length > 0) {
        const hasText = e.clipboardData.types.includes("text/plain");
        if (!hasText) {
          e.preventDefault();
          processFiles(files);
        } else {
          setTimeout(() => processFiles(files), 0);
        }
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

  const handleToolbar = useCallback((action: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    switch (action) {
      case "bold":
        insertAround(ta, "**", "**", setEditValue);
        break;
      case "italic":
        insertAround(ta, "_", "_", setEditValue);
        break;
      case "code":
        insertAround(ta, "`", "`", setEditValue);
        break;
      case "link":
        insertAround(ta, "[", "](url)", setEditValue);
        break;
      case "list":
        insertLinePrefix(ta, "- ", setEditValue);
        break;
    }
  }, []);

  const isEmpty = !content?.trim();

  if (collapseWhenEmpty && isEmpty && !isEditing) {
    return (
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsEditing(true);
            setActiveTab("write");
          }}
          className="gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <PlusIcon size={12} />
          Add {title}
        </Button>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        {(!hideTitle || isEditing) && (
          <h2 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
            {title}
          </h2>
        )}
        {!isEditing && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditValue(content ?? "");
              setIsEditing(true);
              setActiveTab("write");
            }}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label={`Edit ${title}`}
            title={`Edit ${title}`}
          >
            <PencilIcon />
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          {/* Tab bar + toolbar */}
          <div className="flex items-center justify-between border-b border-border">
            <div className="flex">
              <button
                onClick={() => setActiveTab("write")}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === "write"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Write
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === "preview"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Preview
              </button>
            </div>
            {activeTab === "write" && (
              <div className="flex items-center gap-0.5 pb-1">
                <ToolbarButton label="Bold" onClick={() => handleToolbar("bold")}>
                  <strong>B</strong>
                </ToolbarButton>
                <ToolbarButton label="Italic" onClick={() => handleToolbar("italic")}>
                  <em>I</em>
                </ToolbarButton>
                <ToolbarButton label="Code" onClick={() => handleToolbar("code")}>
                  {"<>"}
                </ToolbarButton>
                <ToolbarButton label="Link" onClick={() => handleToolbar("link")}>
                  &#128279;
                </ToolbarButton>
                <ToolbarButton label="List" onClick={() => handleToolbar("list")}>
                  &equiv;
                </ToolbarButton>
                <div className="w-px h-4 bg-border mx-1" />
                <ToolbarButton label="Attach image" onClick={handleFilePick} disabled={isUploading}>
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
                </ToolbarButton>
              </div>
            )}
          </div>

          {activeTab === "write" ? (
            <ImageDropZone onDrop={handleDrop} disabled={isUploading}>
              <textarea
                ref={textareaRef}
                name={field}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onPaste={handlePaste}
                readOnly={isUploading}
                className="w-full min-h-[120px] text-sm bg-transparent border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono"
                autoFocus
              />
            </ImageDropZone>
          ) : (
            <PreviewPane text={editValue} />
          )}

          {isUploading && progress && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Uploading {progress.completed}/{progress.total}...
            </div>
          )}

          <UploadErrors errors={lastErrors} onDismiss={clearErrors} />

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={isUploading} className="gap-1.5">
              <SaveIcon />
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isUploading}
              className="gap-1.5"
            >
              <XIcon />
              Cancel
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              Paste, drop, or pick images
            </span>
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
        </div>
      ) : content ? (
        <div
          className="prose prose-sm dark:prose-invert max-w-none cursor-pointer rounded-lg p-3 hover:bg-muted/50 transition-colors"
          role="button"
          tabIndex={0}
          onClick={() => {
            setEditValue(content ?? "");
            setIsEditing(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setEditValue(content ?? "");
              setIsEditing(true);
            }
          }}
        >
          <Markdown
            remarkPlugins={remarkPluginsPipeline}
            rehypePlugins={rehypePluginsPipeline}
            components={markdownComponents}
          >
            {content}
          </Markdown>
        </div>
      ) : (
        <div
          className="text-sm text-muted-foreground italic cursor-pointer rounded-lg p-3 hover:bg-muted/50 transition-colors"
          role="button"
          tabIndex={0}
          onClick={() => {
            setEditValue("");
            setIsEditing(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setEditValue("");
              setIsEditing(true);
            }
          }}
        >
          No {title.toLowerCase()} yet. Click to add.
        </div>
      )}
    </section>
  );
}

function PreviewPane({ text }: { text: string }) {
  const parsedFields = useMemo(() => {
    if (!text || !hasAttachmentSyntax(text)) return [];
    try {
      return [parseField(text)];
    } catch {
      return [];
    }
  }, [text]);

  const content = (
    <div className="min-h-[120px] border border-border rounded-lg px-3 py-2">
      {text ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Markdown
            remarkPlugins={remarkPluginsPipeline}
            rehypePlugins={rehypePluginsPipeline}
            components={markdownComponents}
          >
            {text}
          </Markdown>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Nothing to preview.</p>
      )}
    </div>
  );

  if (parsedFields.length > 0) {
    return <AttachmentProvider parsedFields={parsedFields}>{content}</AttachmentProvider>;
  }
  return content;
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="h-7 w-7 flex items-center justify-center rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}
