import { useState, useEffect, useRef, useCallback } from "react";
import type { IssueType, Priority } from "@beads-gui/shared";
import { ISSUE_TYPES, ISSUE_PRIORITIES } from "@beads-gui/shared";
import { useCreateIssue } from "@/hooks/use-issues";
import { Button } from "@/components/ui/button";

interface CreateIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateIssueDialog({ isOpen, onClose }: CreateIssueDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState<IssueType>("task");
  const [priority, setPriority] = useState<Priority>(2);
  const [assignee, setAssignee] = useState("");
  const [labels, setLabels] = useState("");
  const [due, setDue] = useState("");

  const createMutation = useCreateIssue();
  const titleRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Focus title on open
  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      titleRef.current?.focus();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setIssueType("task");
    setPriority(2);
    setAssignee("");
    setLabels("");
    setDue("");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createMutation.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        issue_type: issueType,
        priority,
        assignee: assignee.trim() || undefined,
        labels: labels
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
        due: due || undefined,
      },
      {
        onSuccess: () => {
          resetForm();
          onClose();
        },
      },
    );
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-full max-w-lg rounded-xl border border-border bg-background p-0 shadow-xl backdrop:bg-black/50"
      onClose={handleCancel}
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === dialogRef.current) {
          handleCancel();
        }
      }}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4 animate-modal-enter">
        <h2 className="text-lg font-semibold">Create Issue</h2>

        {/* Title */}
        <div>
          <label htmlFor="create-title" className="block text-sm font-medium mb-1">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            ref={titleRef}
            id="create-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
            className="w-full text-sm bg-transparent border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="create-desc" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="create-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue (supports markdown)"
            className="w-full min-h-[80px] text-sm bg-transparent border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
        </div>

        {/* Type + Priority row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="create-type" className="block text-sm font-medium mb-1">
              Type
            </label>
            <select
              id="create-type"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value as IssueType)}
              className="w-full text-sm bg-transparent border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ISSUE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="create-priority" className="block text-sm font-medium mb-1">
              Priority
            </label>
            <select
              id="create-priority"
              value={String(priority)}
              onChange={(e) => setPriority(Number(e.target.value) as Priority)}
              className="w-full text-sm bg-transparent border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ISSUE_PRIORITIES.map((p) => (
                <option key={p} value={String(p)}>
                  P{p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assignee */}
        <div>
          <label htmlFor="create-assignee" className="block text-sm font-medium mb-1">
            Assignee
          </label>
          <input
            id="create-assignee"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Assignee name"
            className="w-full text-sm bg-transparent border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Labels */}
        <div>
          <label htmlFor="create-labels" className="block text-sm font-medium mb-1">
            Labels
          </label>
          <input
            id="create-labels"
            value={labels}
            onChange={(e) => setLabels(e.target.value)}
            placeholder="Comma-separated labels"
            className="w-full text-sm bg-transparent border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Due date */}
        <div>
          <label htmlFor="create-due" className="block text-sm font-medium mb-1">
            Due Date
          </label>
          <input
            id="create-due"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-full text-sm bg-transparent border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!title.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Issue"}
          </Button>
        </div>

        {createMutation.isError && (
          <div className="text-sm text-destructive">
            Failed to create issue. Please try again.
          </div>
        )}
      </form>
    </dialog>
  );
}
