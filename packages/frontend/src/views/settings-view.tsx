import { SettingsSection } from "@/components/settings-section";
import { ThemePicker } from "@/components/theme-picker";
import { NotificationPreferences } from "@/components/notification-preferences";

export function SettingsView() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <SettingsSection
        title="Appearance"
        description="Choose a theme for the interface. Changes apply immediately."
      >
        <ThemePicker />
      </SettingsSection>

      <SettingsSection
        title="Notifications"
        description="Choose which notifications you'd like to receive."
      >
        <NotificationPreferences />
      </SettingsSection>
    </div>
  );
}
