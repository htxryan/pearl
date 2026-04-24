import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router";
import { AttachmentSettings } from "@/components/attachment-settings";
import { NotificationPreferences } from "@/components/notification-preferences";
import { SettingsSection } from "@/components/settings-section";
import { ThemePicker } from "@/components/theme-picker";
import { cn } from "@/lib/utils";

interface SettingsTab {
  to: string;
  label: string;
}

const SETTINGS_TABS: SettingsTab[] = [
  { to: "appearance", label: "Appearance" },
  { to: "attachments", label: "Attachments" },
  { to: "notifications", label: "Notifications" },
];

function SettingsTabLink({ tab }: { tab: SettingsTab }) {
  return (
    <NavLink
      to={tab.to}
      className={({ isActive }) =>
        cn(
          "block rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )
      }
    >
      {tab.label}
    </NavLink>
  );
}

export function SettingsView() {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-48 md:flex-col md:overflow-visible"
        >
          {SETTINGS_TABS.map((tab) => (
            <SettingsTabLink key={tab.to} tab={tab} />
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function SettingsTabContent({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <SettingsSection title={title} description={description}>
      {children}
    </SettingsSection>
  );
}

export function AppearanceSettingsTab() {
  return (
    <SettingsTabContent
      title="Appearance"
      description="Choose a theme for the interface. Changes apply immediately."
    >
      <ThemePicker />
    </SettingsTabContent>
  );
}

export function AttachmentsSettingsTab() {
  return (
    <SettingsTabContent
      title="Attachments"
      description="Configure how image attachments are stored and processed."
    >
      <AttachmentSettings />
    </SettingsTabContent>
  );
}

export function NotificationsSettingsTab() {
  return (
    <SettingsTabContent
      title="Notifications"
      description="Choose which notifications you'd like to receive."
    >
      <NotificationPreferences />
    </SettingsTabContent>
  );
}
