import { useCallback, useRef, useState } from "react";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";

interface MarkdownSectionProps {
  title: string;
  content?: string;
  field: string;
  onSave: (value: string) => void;
  hideTitle?: boolean;
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
  // Restore cursor position after the inserted text
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
  // Find start of current line
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
}: MarkdownSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content ?? "");
  const [activeTab, setActiveTab] = useState<EditorTab>("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        {!hideTitle && (
          <h2 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
            {title}
          </h2>
        )}
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditValue(content ?? "");
              setIsEditing(true);
              setActiveTab("write");
            }}
            className="text-xs"
          >
            Edit
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
              </div>
            )}
          </div>

          {activeTab === "write" ? (
            <textarea
              ref={textareaRef}
              name={field}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full min-h-[120px] text-sm bg-transparent border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono"
              autoFocus
            />
          ) : (
            <div className="min-h-[120px] border border-border rounded-lg px-3 py-2">
              {editValue ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {editValue}
                  </Markdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nothing to preview.</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
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
          <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
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

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="h-7 w-7 flex items-center justify-center rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );
}
