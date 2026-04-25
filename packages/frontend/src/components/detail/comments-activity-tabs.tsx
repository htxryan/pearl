import type { Comment, Event } from "@pearl/shared";
import { useCallback, useRef, useState } from "react";
import { ActivityTimeline } from "@/components/detail/activity-timeline";
import { CommentThread } from "@/components/detail/comment-thread";
import { cn } from "@/lib/utils";

type Tab = "comments" | "activity";
const TABS: Tab[] = ["comments", "activity"];

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
  const tablistRef = useRef<HTMLDivElement>(null);

  const handleTablistKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let nextIndex: number | null = null;
      const currentIndex = TABS.indexOf(active);

      if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % TABS.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
      } else if (e.key === "Home") {
        nextIndex = 0;
      } else if (e.key === "End") {
        nextIndex = TABS.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        const nextTab = TABS[nextIndex];
        setActive(nextTab);
        const btn = tablistRef.current?.querySelector<HTMLElement>(`#tab-${nextTab}`);
        btn?.focus();
      }
    },
    [active],
  );

  return (
    <section>
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Comments and activity"
        className="flex border-b border-border mb-3"
        onKeyDown={handleTablistKeyDown}
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
        <CommentThread
          comments={comments}
          onAdd={onAddComment}
          isAdding={isAddingComment}
          hideTitle
        />
      </div>

      <div
        role="tabpanel"
        id="panel-activity"
        aria-labelledby="tab-activity"
        hidden={active !== "activity"}
      >
        <ActivityTimeline events={events} hideTitle />
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
