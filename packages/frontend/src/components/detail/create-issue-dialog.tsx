import type { IssueType, Priority } from "@pearl/shared";
import { ISSUE_PRIORITIES, ISSUE_TYPES } from "@pearl/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlusIcon, XIcon } from "@/components/ui/icons";
import { LabelPicker } from "@/components/ui/label-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateIssue } from "@/hooks/use-issues";
import { cn } from "@/lib/utils";

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

  const [descTab, setDescTab] = useState<DescriptionTab>("write");

  const [titleTouched, setTitleTouched] = useState(false);
  const [titleDirty, setTitleDirty] = useState(false);

  const createMutation = useCreateIssue();
  const titleRef = useRef<HTMLInputElement>(null);

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
  }, []);

  useEffect(() => {
    if (isOpen) {
      titleRef.current?.focus();
    } else {
      resetForm();
    }
  }, [isOpen, resetForm]);

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
          resetForm();
          onClose();
        },
      },
    );
  };

  const handleCancel = () => {
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

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <span className="block text-sm font-medium mb-1">Type</span>
              <Select
                value={issueType}
                onValueChange={(v) => {
                  if (v) setIssueType(v as IssueType);
                }}
                modal={false}
              >
                <SelectTrigger className="w-full rounded-lg px-3 py-2" aria-label="Issue type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="block text-sm font-medium mb-1">Priority</span>
              <Select
                value={priority}
                onValueChange={(v) => {
                  if (v != null) setPriority(v as Priority);
                }}
                modal={false}
              >
                <SelectTrigger className="w-full rounded-lg px-3 py-2" aria-label="Priority">
                  <SelectValue>
                    {(v: number | null) => (v != null ? `P${v}` : "Priority")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{`P${p}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee + Due date row */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <DatePicker
                value={due || null}
                onChange={(date) => setDue(date ?? "")}
                placeholder="Set due date"
              />
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="block text-sm font-medium mb-1">Labels</label>
            <LabelPicker
              selected={labels}
              selectedColors={{}}
              onChange={setLabels}
              placeholder="Search or create labels..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleCancel} className="gap-1.5">
              <XIcon />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || createMutation.isPending}
              className="gap-1.5"
            >
              <PlusIcon />
              {createMutation.isPending ? "Creating..." : "Create Issue"}
            </Button>
          </div>

          {createMutation.isError && (
            <div className="text-sm text-destructive">
              Failed to create issue. Please try again.
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
