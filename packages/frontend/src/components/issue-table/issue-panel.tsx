import { useNavigate } from "react-router";
import {
  useIssue,
  useComments,
  useDependencies,
  useUpdateIssue,
  useCloseIssue,
  useAddComment,
} from "@/hooks/use-issues";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { TypeBadge } from "@/components/ui/type-badge";
import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";
import { useToastActions } from "@/hooks/use-toast";
import { useState, useCallback } from "react";

interface IssuePanelProps {
  issueId: string;
  onClose: () => void;
}

export function IssuePanel({ issueId, onClose }: IssuePanelProps) {
  const navigate = useNavigate();
  const { data: issue, isLoading, error } = useIssue(issueId);
  const { data: comments = [] } = useComments(issueId);
  const { data: dependencies = [] } = useDependencies(issueId);
  const updateMutation = useUpdateIssue();
  const closeMutation = useCloseIssue();
  const addCommentMutation = useAddComment();
  const toast = useToastActions();
  const [commentText, setCommentText] = useState("");

  const handleAddComment = useCallback(() => {
    const text = commentText.trim();
    if (!text) return;
    setCommentText("");
    addCommentMutation.mutate(
      { issueId, data: { text } },
      { onError: () => { toast.error("Failed to add comment."); setCommentText(text); } },
    );
  }, [issueId, commentText, addCommentMutation, toast]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <PanelHeader onClose={onClose} />
        <div className="flex-1 p-4 space-y-4">
          <div className="h-6 skeleton-shimmer rounded w-3/4" />
          <div className="h-4 skeleton-shimmer rounded w-1/2" />
          <div className="h-20 skeleton-shimmer rounded" />
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="h-full flex flex-col">
        <PanelHeader onClose={onClose} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="font-semibold">Issue not found</p>
            <p className="text-sm text-muted-foreground mt-1">{error?.message ?? `Could not load ${issueId}`}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <PanelHeader onClose={onClose}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/issues/${issueId}`, { state: { from: "/list" } })}
          title="Open full detail view"
        >
          Expand
        </Button>
      </PanelHeader>

      <div className="flex-1 overflow-auto p-4 space-y-5">
        {/* Title and badges */}
        <div>
          <h2 className="text-lg font-semibold">{issue.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={issue.status} />
            <PriorityIndicator priority={issue.priority} />
            <TypeBadge type={issue.issue_type} />
            <code className="text-[10px] text-muted-foreground">{issue.id}</code>
          </div>
        </div>

        {/* Key fields */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Assignee</span>
            <p>{issue.assignee ?? "Unassigned"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Owner</span>
            <p>{issue.owner}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Created</span>
            <p><RelativeTime iso={issue.created_at} /></p>
          </div>
          <div>
            <span className="text-muted-foreground">Updated</span>
            <p><RelativeTime iso={issue.updated_at} /></p>
          </div>
        </div>

        {/* Description */}
        {issue.description && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Description</h3>
            <p className="text-sm whitespace-pre-wrap">{issue.description}</p>
          </div>
        )}

        {/* Dependencies */}
        {dependencies.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              Dependencies ({dependencies.length})
            </h3>
            <ul className="space-y-1">
              {dependencies.map((dep) => (
                <li key={`${dep.issue_id}-${dep.depends_on_id}`} className="text-sm text-muted-foreground">
                  {dep.issue_id === issueId ? `Depends on ${dep.depends_on_id}` : `Blocks ${dep.issue_id}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Comments */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            Comments ({comments.length})
          </h3>
          {comments.length > 5 && (
            <p className="text-xs text-muted-foreground mb-2">
              Showing last 5 of {comments.length} comments.{" "}
              <button
                type="button"
                onClick={() => navigate(`/issues/${issueId}`, { state: { from: "/list" } })}
                className="underline hover:text-foreground"
              >
                View all
              </button>
            </p>
          )}
          {comments.length > 0 && (
            <div className="space-y-2 mb-2">
              {comments.slice(-5).map((c) => (
                <div key={c.id} className="rounded bg-muted/50 p-2 text-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="font-medium">{c.author}</span>
                    <RelativeTime iso={c.created_at} />
                  </div>
                  <p className="whitespace-pre-wrap">{c.text}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddComment(); } }}
              placeholder="Add a comment..."
              className="flex-1 h-8 rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim() || addCommentMutation.isPending}>
              Post
            </Button>
          </div>
        </div>

        {/* Actions */}
        {issue.status !== "closed" && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateMutation.mutate({ id: issueId, data: { claim: true } }, {
                onSuccess: () => toast.success("Issue claimed."),
                onError: () => toast.error("Failed to claim."),
              })}
              disabled={updateMutation.isPending}
            >
              Claim
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => closeMutation.mutate({ id: issueId }, {
                onSuccess: () => { toast.success("Issue closed."); onClose(); },
                onError: () => toast.error("Failed to close."),
              })}
              disabled={closeMutation.isPending}
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PanelHeader({ onClose, children }: { onClose: () => void; children?: React.ReactNode }) {
  return (
    <div className="shrink-0 flex items-center justify-between border-b border-border px-4 py-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Detail</span>
      <div className="flex items-center gap-1">
        {children}
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close panel">
          &times;
        </Button>
      </div>
    </div>
  );
}
