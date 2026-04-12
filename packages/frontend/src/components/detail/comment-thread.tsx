import { useState } from "react";
import type { Comment } from "@beads-gui/shared";
import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";

interface CommentThreadProps {
  comments: Comment[];
  onAdd: (text: string) => Promise<unknown>;
  isAdding: boolean;
}

export function CommentThread({ comments, onAdd, isAdding }: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitComment = () => {
    if (isAdding) return;
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

  return (
    <section>
      <h2 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3">
        Comments ({comments.length})
      </h2>

      {/* Comment list */}
      {comments.length > 0 ? (
        <div className="space-y-3 mb-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-border p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{comment.author}</span>
                <RelativeTime iso={comment.created_at} className="text-xs text-muted-foreground" />
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-6 text-muted-foreground mb-4">
          <span className="text-3xl opacity-20 mb-1" aria-hidden="true">&#9998;</span>
          <p className="text-sm">No comments yet. Start the conversation below.</p>
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full min-h-[80px] text-sm bg-transparent border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submitComment();
            }
          }}
        />
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Cmd+Enter to submit
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={!newComment.trim() || isAdding}
          >
            {isAdding ? "Posting..." : "Comment"}
          </Button>
        </div>
      </form>
    </section>
  );
}
