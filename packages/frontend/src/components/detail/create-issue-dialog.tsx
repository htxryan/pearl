import { useState, useEffect, useRef, useCallback } from "react";
import type { IssueType, Priority } from "@beads-gui/shared";
import { ISSUE_TYPES, ISSUE_PRIORITIES } from "@beads-gui/shared";
import { useCreateIssue } from "@/hooks/use-issues";
import { useDraft } from "@/hooks/use-draft";
import { Button } from "@/components/ui/button";
import { LabelPicker } from "@/components/ui/label-picker";
import { DatePicker } from "@/components/ui/date-picker";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "beads:create-issue-draft";
const TITLE_MAX = 200;
const TITLE_WARN = 150;

type DescriptionTab = "write" | "preview";

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
  const [labels, setLabels] = useState<string[]>([]);
  const [due, setDue] = useState("");

  // Markdown preview tab
  const [descTab, setDescTab] = useState<DescriptionTab>("write");

  // Title validation state
  const [titleTouched, setTitleTouched] = useState(false);
  const [titleDirty, setTitleDirty] = useState(false);

  // Draft restored banner
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  const { draft, saveDraft, clearDraft, hasDraft } = useDraft(DRAFT_KEY);
  const createMutation = useCreateIssue();
  const titleRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hasRestoredRef = useRef(false);

  // Focus title on open and restore draft
  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      titleRef.current?.focus();

      // Restore draft on open (only once per open)
      if (!hasRestoredRef.current && hasDraft && draft) {
        setTitle(draft.title);
        setDescription(draft.description);
        setIssueType(draft.issueType as IssueType);
        setPriority(draft.priority as Priority);
        setAssignee(draft.assignee);
        setLabels(draft.labels);
        setDue(draft.due);
        setShowDraftBanner(true);
        hasRestoredRef.current = true;
      }
    } else {
      dialogRef.current?.close();
      hasRestoredRef.current = false;
      setShowDraftBanner(false);
      setTitleTouched(false);
      setTitleDirty(false);
      setDescTab("write");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- draft excluded to prevent focus theft on every keystroke
  }, [isOpen, hasDraft]);

  // Auto-save draft on field changes
  const saveDraftFromFields = useCallback(() => {
    saveDraft({
      title,
      description,
      issueType,
      priority,
      assignee,
      labels,
      due,
    });
  }, [title, description, issueType, priority, assignee, labels, due, saveDraft]);

  useEffect(() => {
    if (isOpen) {
      saveDraftFromFields();
    }
  }, [isOpen, saveDraftFromFields]);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setIssueType("task");
    setPriority(2);
    setAssignee("");
    setLabels([]);
    setDue("");
    setTitleTouched(false);
    setTitleDirty(false);
    setDescTab("write");
    setShowDraftBanner(false);
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
        labels: labels.length > 0 ? labels : undefined,
        due: due || undefined,
      },
      {
        onSuccess: () => {
          clearDraft();
          resetForm();
          onClose();
        },
      },
    );
  };

  const handleCancel = () => {
    // Don't resetForm() here — draft should survive cancel.
    // resetForm() would clear fields, and the auto-save effect could
    // flush the empty state to localStorage, wiping the draft.
    // Form state resets via the else-branch of the isOpen effect (line 67-73)
    // and gets re-initialized from the draft on the next open.
    onClose();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (!titleDirty && e.target.value.length > 0) {
      setTitleDirty(true);
    }
  };

  const handleTitleBlur = () => {
    setTitleTouched(true);
  };

  const showTitleError = titleTouched && !title.trim();
  const showCharCount = titleDirty;
  const charCountWarning = title.length > TITLE_WARN;

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-full max-w-lg rounded-xl border border-border bg-background p-0 shadow-xl backdrop:bg-black/50"
      onClose={handleCancel}
      onCancel={(e) => {
        // Belt-and-suspenders: child pickers already call preventDefault()
        // on Escape keydown to suppress this cancel event. This guard is a
        // fallback in case a future picker forgets to preventDefault().
        if (e.currentTarget.querySelector('[aria-expanded="true"]')) {
          e.preventDefault();
        }
      }}
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === dialogRef.current) {
          handleCancel();
        }
      }}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4 animate-modal-enter">
        <h2 className="text-lg font-semibold">Create Issue</h2>

        {/* Draft restored banner */}
        {showDraftBanner && (
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
            <span>Draft restored</span>
            <button
              type="button"
              className="ml-2 hover:text-foreground"
              onClick={() => setShowDraftBanner(false)}
              aria-label="Dismiss draft restored notice"
            >
              &times;
            </button>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="create-title" className="block text-sm font-medium mb-1">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            ref={titleRef}
            id="create-title"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            placeholder="Issue title"
            maxLength={TITLE_MAX}
            className={cn(
              "w-full text-sm bg-transparent border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring",
              showTitleError ? "border-destructive" : "border-border",
            )}
            required
          />
          <div className="flex items-center justify-between mt-1">
            {showTitleError ? (
              <span className="text-destructive text-xs">Title is required</span>
            ) : (
              <span />
            )}
            {showCharCount && (
              <span
                className={cn(
                  "text-xs",
                  charCountWarning ? "text-warning" : "text-muted-foreground",
                )}
              >
                {title.length} / {TITLE_MAX} characters
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="create-desc" className="block text-sm font-medium mb-1">
            Description
          </label>
          {/* Tab bar */}
          <div className="flex gap-4 border-b border-border mb-2">
            <button
              type="button"
              className={cn(
                "text-sm font-medium pb-1.5 -mb-px transition-colors",
                descTab === "write"
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setDescTab("write")}
            >
              Write
            </button>
            <button
              type="button"
              className={cn(
                "text-sm font-medium pb-1.5 -mb-px transition-colors",
                descTab === "preview"
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setDescTab("preview")}
            >
              Preview
            </button>
          </div>

          {descTab === "write" ? (
            <textarea
              id="create-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue (supports markdown)"
              className="w-full min-h-[80px] text-sm bg-transparent border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          ) : (
            <div className="w-full min-h-[80px] text-sm border border-border rounded-lg px-3 py-2 overflow-y-auto">
              {description.trim() ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown remarkPlugins={[remarkGfm]}>{description}</Markdown>
                </div>
              ) : (
                <p className="text-muted-foreground italic">Nothing to preview</p>
              )}
            </div>
          )}
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
          <label className="block text-sm font-medium mb-1">
            Labels
          </label>
          <LabelPicker
            selected={labels}
            selectedColors={{}}
            onChange={setLabels}
            placeholder="Search or create labels..."
          />
        </div>

        {/* Due date */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Due Date
          </label>
          <DatePicker
            value={due || null}
            onChange={(date) => setDue(date ?? "")}
            placeholder="Set due date"
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
