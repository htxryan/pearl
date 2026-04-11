import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";

interface MarkdownSectionProps {
  title: string;
  content?: string;
  field: string;
  onSave: (value: string) => void;
}

export function MarkdownSection({
  title,
  content,
  field,
  onSave,
}: MarkdownSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content ?? "");

  const handleSave = () => {
    if (editValue !== (content ?? "")) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(content ?? "");
    setIsEditing(false);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </h2>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditValue(content ?? "");
              setIsEditing(true);
            }}
            className="text-xs"
          >
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            name={field}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full min-h-[120px] text-sm bg-transparent border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono"
            autoFocus
          />
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
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
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
