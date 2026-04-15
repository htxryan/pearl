import { useCallback, useState } from "react";
import {
  useNotificationPreferences,
  setPreference,
  requestBrowserPermission,
  getBrowserPermissionState,
  type NotificationType,
} from "@/hooks/use-notifications";

interface ToggleItem {
  key: NotificationType | "browser_push";
  label: string;
  description: string;
}

const NOTIFICATION_TOGGLES: ToggleItem[] = [
  {
    key: "issue_assigned",
    label: "Issue assigned",
    description: "When an issue is assigned or reassigned",
  },
  {
    key: "status_changed",
    label: "Status changed",
    description: "When an issue's status is updated",
  },
  {
    key: "blocker_resolved",
    label: "Blocker resolved",
    description: "When a blocked issue becomes unblocked",
  },
  {
    key: "comment_added",
    label: "Comment added",
    description: "When a new comment is posted on an issue",
  },
];

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  id: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      type="button"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function NotificationPreferences() {
  const prefs = useNotificationPreferences();
  const [permissionState, setPermissionState] = useState(getBrowserPermissionState);

  const handleBrowserPushToggle = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestBrowserPermission();
      setPermissionState(getBrowserPermissionState());
      if (granted) {
        setPreference("browser_push", true);
      }
    } else {
      setPreference("browser_push", false);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Notification type toggles */}
      <div className="space-y-3">
        {NOTIFICATION_TOGGLES.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
          >
            <div className="mr-4">
              <label
                htmlFor={`notif-toggle-${item.key}`}
                className="text-sm font-medium cursor-pointer"
              >
                {item.label}
              </label>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <Toggle
              id={`notif-toggle-${item.key}`}
              checked={prefs[item.key]}
              onChange={(val) => setPreference(item.key, val)}
            />
          </div>
        ))}
      </div>

      {/* Browser push notification */}
      <div className="rounded-lg border border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="mr-4">
            <label
              htmlFor="notif-toggle-browser_push"
              className="text-sm font-medium cursor-pointer"
            >
              Browser notifications
            </label>
            <p className="text-xs text-muted-foreground">
              {permissionState === "denied"
                ? "Browser notifications are blocked. Enable them in your browser settings."
                : permissionState === "unsupported"
                  ? "Your browser does not support push notifications."
                  : "Show desktop notifications when changes occur while the tab is in the background."}
            </p>
          </div>
          <Toggle
            id="notif-toggle-browser_push"
            checked={prefs.browser_push && permissionState === "granted"}
            onChange={handleBrowserPushToggle}
          />
        </div>
        {permissionState === "denied" && (
          <p className="mt-2 text-xs text-warning">
            Permission was denied. You can reset this in your browser&apos;s site settings.
          </p>
        )}
      </div>
    </div>
  );
}
