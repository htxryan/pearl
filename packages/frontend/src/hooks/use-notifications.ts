import { useSyncExternalStore, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchIssues } from "@/lib/api-client";
import { issueKeys } from "./use-issues";
import type { IssueListItem, IssueStatus } from "@pearl/shared";

// ─── Types ────────────────────────────────────────────
export type NotificationType =
  | "issue_assigned"
  | "status_changed"
  | "blocker_resolved"
  | "comment_added";

export interface AppNotification {
  id: string;
  type: NotificationType;
  issueId: string;
  issueTitle: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  issue_assigned: boolean;
  status_changed: boolean;
  blocker_resolved: boolean;
  comment_added: boolean;
  browser_push: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  issue_assigned: true,
  status_changed: true,
  blocker_resolved: true,
  comment_added: true,
  browser_push: false,
};

// ─── Storage Keys ─────────────────────────────────────
const NOTIFICATIONS_KEY = "pearl-notifications";
const PREFS_KEY = "pearl-notification-prefs";
const SNAPSHOT_KEY = "pearl-notification-snapshot";

// ─── Issue Snapshot (for change detection) ────────────
interface IssueSnapshot {
  status: IssueStatus;
  assignee: string | null;
}

type SnapshotMap = Record<string, IssueSnapshot>;

function loadSnapshot(): SnapshotMap {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSnapshot(snapshot: SnapshotMap) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage unavailable
  }
}

// ─── External Store (notifications) ──────────────────
let notifications: AppNotification[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const l of [...listeners]) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AppNotification[] {
  return notifications;
}

// Initialize from localStorage
function initStore() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (raw) {
      notifications = JSON.parse(raw);
    }
  } catch {
    notifications = [];
  }
}

initStore();

// ─── Cross-tab Sync ─────────────────────────────────
// Listen for localStorage changes from other tabs so all tabs
// share a consistent notification + preference state.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === NOTIFICATIONS_KEY) {
      try {
        notifications = e.newValue ? JSON.parse(e.newValue) : [];
      } catch {
        notifications = [];
      }
      notify();
    }
    if (e.key === PREFS_KEY) {
      try {
        preferences = e.newValue
          ? { ...DEFAULT_PREFERENCES, ...JSON.parse(e.newValue) }
          : DEFAULT_PREFERENCES;
      } catch {
        preferences = DEFAULT_PREFERENCES;
      }
      notifyPrefs();
    }
  });
}

function persistNotifications() {
  try {
    // Keep only the most recent 50 notifications
    const trimmed = notifications.slice(0, 50);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage unavailable
  }
}

let idCounter = Date.now();

/** Check if a near-duplicate notification was already added within the dedup window. */
const DEDUP_WINDOW_MS = 30_000; // 30 seconds

function isDuplicate(input: Omit<AppNotification, "id" | "read" | "createdAt">): boolean {
  const cutoff = Date.now() - DEDUP_WINDOW_MS;
  return notifications.some(
    (n) =>
      n.type === input.type &&
      n.issueId === input.issueId &&
      new Date(n.createdAt).getTime() > cutoff,
  );
}

export function addNotification(
  input: Omit<AppNotification, "id" | "read" | "createdAt">,
): string | null {
  // Re-read localStorage to pick up writes from other tabs before dedup check
  initStore();
  if (isDuplicate(input)) return null;

  const id = `notif-${++idCounter}`;
  const notification: AppNotification = {
    ...input,
    id,
    read: false,
    createdAt: new Date().toISOString(),
  };
  notifications = [notification, ...notifications].slice(0, 50);
  notify();
  persistNotifications();
  return id;
}

export function markAsRead(id: string) {
  notifications = notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n,
  );
  notify();
  persistNotifications();
}

export function markAllAsRead() {
  notifications = notifications.map((n) => ({ ...n, read: true }));
  notify();
  persistNotifications();
}

export function dismissNotification(id: string) {
  notifications = notifications.filter((n) => n.id !== id);
  notify();
  persistNotifications();
}

export function clearAllNotifications() {
  notifications = [];
  notify();
  persistNotifications();
}

// ─── Preferences Store ───────────────────────────────
let preferences: NotificationPreferences = DEFAULT_PREFERENCES;
const prefsListeners = new Set<() => void>();

function notifyPrefs() {
  for (const l of [...prefsListeners]) l();
}

function subscribePrefs(listener: () => void) {
  prefsListeners.add(listener);
  return () => {
    prefsListeners.delete(listener);
  };
}

function getPrefsSnapshot(): NotificationPreferences {
  return preferences;
}

function initPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    }
  } catch {
    preferences = DEFAULT_PREFERENCES;
  }
}

initPrefs();

export function setPreference<K extends keyof NotificationPreferences>(
  key: K,
  value: NotificationPreferences[K],
) {
  preferences = { ...preferences, [key]: value };
  notifyPrefs();
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
  } catch {
    // localStorage unavailable
  }
}

// ─── Change Detection ────────────────────────────────
export type NewNotification = Omit<AppNotification, "id" | "read" | "createdAt">;

export function detectChanges(
  prev: SnapshotMap,
  current: IssueListItem[],
  prefs: NotificationPreferences,
): NewNotification[] {
  const newNotifs: NewNotification[] = [];

  for (const issue of current) {
    const old = prev[issue.id];
    if (!old) continue; // New issue — skip (no notification on first appearance)

    // Status changed — blocker_resolved and status_changed are independent prefs
    if (old.status !== issue.status) {
      if (old.status === "blocked" && issue.status !== "blocked" && prefs.blocker_resolved) {
        newNotifs.push({
          type: "blocker_resolved",
          issueId: issue.id,
          issueTitle: issue.title,
          message: `Blocker resolved: "${issue.title}" is now ${issue.status.replace("_", " ")}`,
        });
      } else if (prefs.status_changed) {
        newNotifs.push({
          type: "status_changed",
          issueId: issue.id,
          issueTitle: issue.title,
          message: `"${issue.title}" changed from ${old.status.replace("_", " ")} to ${issue.status.replace("_", " ")}`,
        });
      }
    }

    // Assignee changed
    if (old.assignee !== issue.assignee && issue.assignee && prefs.issue_assigned) {
      newNotifs.push({
        type: "issue_assigned",
        issueId: issue.id,
        issueTitle: issue.title,
        message: `"${issue.title}" assigned to ${issue.assignee}`,
      });
    }
  }

  return newNotifs;
}

// ─── Browser Push Notifications ──────────────────────
function sendBrowserNotification(title: string, body: string, issueId: string) {
  if (
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return;
  }
  try {
    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: issueId,
    });
    n.onclick = () => {
      window.focus();
      window.location.href = `/issues/${issueId}`;
      n.close();
    };
  } catch {
    // Notification API not available
  }
}

export async function requestBrowserPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function getBrowserPermissionState(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

// ─── Hooks ───────────────────────────────────────────
export function useNotifications(): AppNotification[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useUnreadCount(): number {
  const notifs = useNotifications();
  return notifs.filter((n) => !n.read).length;
}

export function useNotificationPreferences(): NotificationPreferences {
  return useSyncExternalStore(subscribePrefs, getPrefsSnapshot);
}

/**
 * Hook that polls issues and generates notifications from detected changes.
 * Should be mounted once at the app shell level.
 */
export function useNotificationPoller() {
  const prefs = useNotificationPreferences();
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const snapshotRef = useRef<SnapshotMap>(loadSnapshot());
  const initializedRef = useRef(Object.keys(snapshotRef.current).length > 0);

  const { data: issues } = useQuery<IssueListItem[]>({
    queryKey: issueKeys.lists(),
    queryFn: async () => {
      const result = await fetchIssues();
      return result ?? [];
    },
    refetchInterval: 10_000, // Poll every 10 seconds
    staleTime: 5_000,
  });

  useEffect(() => {
    if (!issues) return;

    const currentSnapshot: SnapshotMap = {};
    for (const issue of issues) {
      currentSnapshot[issue.id] = {
        status: issue.status,
        assignee: issue.assignee,
      };
    }

    if (initializedRef.current) {
      // Detect changes and generate notifications
      const currentPrefs = prefsRef.current;
      const changes = detectChanges(snapshotRef.current, issues, currentPrefs);
      for (const change of changes) {
        const added = addNotification(change);
        if (added && currentPrefs.browser_push) {
          sendBrowserNotification(
            "Pearl",
            change.message,
            change.issueId,
          );
        }
      }
    } else {
      // First time — just save snapshot, don't generate notifications
      initializedRef.current = true;
    }

    // Only persist snapshot if it actually changed
    if (JSON.stringify(snapshotRef.current) !== JSON.stringify(currentSnapshot)) {
      saveSnapshot(currentSnapshot);
    }
    snapshotRef.current = currentSnapshot;
  }, [issues]); // prefs read via ref — no dependency needed
}

/**
 * Generate a comment notification manually (called from comment mutation).
 */
export function notifyCommentAdded(issueId: string, issueTitle: string, author: string) {
  const prefs = getPrefsSnapshot();
  if (!prefs.comment_added) return;
  addNotification({
    type: "comment_added",
    issueId,
    issueTitle,
    message: `${author} commented on "${issueTitle}"`,
  });
  if (prefs.browser_push) {
    sendBrowserNotification(
      "New Comment",
      `${author} commented on "${issueTitle}"`,
      issueId,
    );
  }
}
