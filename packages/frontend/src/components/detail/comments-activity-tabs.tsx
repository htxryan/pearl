import type { Comment, Event } from "@pearl/shared";
import { useState } from "react";
import { ActivityTimeline } from "@/components/detail/activity-timeline";
import { CommentThread } from "@/components/detail/comment-thread";
import { cn } from "@/lib/utils";

type Tab = "comments" | "activity";

interface CommentsActivityTabsProps {
  comments: Comment[];
  events: Event[];
  onAddComment: (text: string) => Promise<unknown>;
  isAddingComment: boolean;
}

export function CommentsActivityTabs({
  comments,
  events,
  onAddComment,
  isAddingComment,
}: CommentsActivityTabsProps) {
  const [active, setActive] = useState<Tab>("comments");

  return (
    <section>
      <div
        role="tablist"
        aria-label="Comments and activity"
        className="flex border-b border-border mb-3"
      >
        <TabButton
          id="tab-comments"
          panelId="panel-comments"
          active={active === "comments"}
          onClick={() => setActive("comments")}
          label="Comments"
          count={comments.length}
        />
        <TabButton
          id="tab-activity"
          panelId="panel-activity"
          active={active === "activity"}
          onClick={() => setActive("activity")}
          label="Activity"
          count={events.length}
        />
      </div>

      <div
        role="tabpanel"
        id="panel-comments"
        aria-labelledby="tab-comments"
        hidden={active !== "comments"}
      >
        {active === "comments" && (
          <CommentThread
            comments={comments}
            onAdd={onAddComment}
            isAdding={isAddingComment}
            hideTitle
          />
        )}
      </div>

      <div
        role="tabpanel"
        id="panel-activity"
        aria-labelledby="tab-activity"
        hidden={active !== "activity"}
      >
        {active === "activity" && <ActivityTimeline events={events} hideTitle />}
      </div>
    </section>
  );
}

interface TabButtonProps {
  id: string;
  panelId: string;
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}

function TabButton({ id, panelId, active, onClick, label, count }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={panelId}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={cn(
        "min-h-[36px] px-3 py-2 text-sm font-medium transition-colors -mb-px border-b-2",
        active
          ? "text-foreground border-primary"
          : "text-muted-foreground border-transparent hover:text-foreground",
      )}
    >
      {`${label} (${count})`}
    </button>
  );
}
