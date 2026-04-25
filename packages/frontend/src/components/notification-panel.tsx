import { useNavigate } from "react-router";
import { CheckIcon } from "@/components/ui/icons";
import {
  type AppNotification,
  dismissNotification,
  markAllAsRead,
  markAsRead,
  type NotificationType,
  useNotifications,
} from "@/hooks/use-notifications";

const TYPE_COLORS: Record<NotificationType, string> = {
  issue_assigned: "text-info",
  status_changed: "text-warning",
  blocker_resolved: "text-success",
  comment_added: "text-accent",
};

function NotificationIcon({ type }: { type: NotificationType }) {
  const colorClass = TYPE_COLORS[type];

  switch (type) {
    case "issue_assigned":
      return (
        <svg
          className={`h-4 w-4 ${colorClass}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      );
    case "status_changed":
      return (
        <svg
          className={`h-4 w-4 ${colorClass}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      );
    case "blocker_resolved":
      return (
        <svg
          className={`h-4 w-4 ${colorClass}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "comment_added":
      return (
        <svg
          className={`h-4 w-4 ${colorClass}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
  }
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: AppNotification;
  onNavigate: (notificationId: string, issueId: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(notification.id, notification.issueId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate(notification.id, notification.issueId);
        }
      }}
      className={`group flex items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors cursor-pointer hover:bg-muted/50 ${
        notification.read ? "opacity-60" : ""
      }`}
    >
      {/* Unread indicator */}
      <div className="mt-1 flex-shrink-0">
        {!notification.read ? (
          <div className="h-2 w-2 rounded-full bg-primary" />
        ) : (
          <div className="h-2 w-2" />
        )}
      </div>

      {/* Icon */}
      <div className="mt-0.5 flex-shrink-0">
        <NotificationIcon type={notification.type} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{notification.message}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatTimeAgo(notification.createdAt)}
        </p>
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dismissNotification(notification.id);
        }}
        className="mt-0.5 flex-shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const notifications = useNotifications();
  const navigate = useNavigate();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNavigate = (notificationId: string, issueId: string) => {
    markAsRead(notificationId);
    navigate(`/issues/${issueId}`);
    onClose();
  };

  // Show the most recent 20 notifications
  const visible = notifications.slice(0, 20);

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {unreadCount} new
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <CheckIcon size={12} />
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="max-h-96 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <svg
              className="mb-3 h-8 w-8 opacity-40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <p className="text-sm">No notifications yet</p>
            <p className="mt-1 text-xs">You&apos;ll see updates about your issues here</p>
          </div>
        ) : (
          <div className="py-1">
            {visible.map((notif) => (
              <NotificationItem key={notif.id} notification={notif} onNavigate={handleNavigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
