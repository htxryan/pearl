import { DEFAULT_SETTINGS, type Settings, type StorageMode } from "@pearl/shared";
import { useCallback, useEffect, useState } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function WarningBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm"
    >
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
      <div>{children}</div>
    </div>
  );
}

function RadioGroup({
  label,
  value,
  options,
  onChange,
  name,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; description?: string }[];
  onChange: (value: string) => void;
  name: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
              value === opt.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40",
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-0.5"
            />
            <div>
              <span className="text-sm font-medium">{opt.label}</span>
              {opt.description && (
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function NumberInput({
  label,
  description,
  value,
  onChange,
  min,
  id,
  suffix,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  id: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          value={value}
          min={min}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            if (!Number.isNaN(n) && n > 0) onChange(n);
          }}
          className="w-32 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function TextInput({
  label,
  description,
  value,
  onChange,
  placeholder,
  id,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full max-w-md rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <p className="text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

export function AttachmentSettings() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const [draft, setDraft] = useState<Settings | null>(null);

  useEffect(() => {
    if (settings && !draft) {
      setDraft(structuredClone(settings));
    }
  }, [settings, draft]);

  const handleSave = useCallback(() => {
    if (!draft) return;
    updateMutation.mutate(draft, {
      onSuccess: (response) => {
        if (response.data) {
          setDraft(structuredClone(response.data));
        }
      },
    });
  }, [draft, updateMutation]);

  const handleReset = useCallback(() => {
    const defaults = structuredClone(DEFAULT_SETTINGS);
    setDraft(defaults);
    updateMutation.mutate(defaults, {
      onSuccess: (response) => {
        if (response.data) {
          setDraft(structuredClone(response.data));
        }
      },
    });
  }, [updateMutation]);

  if (isLoading || !draft) {
    return <div className="animate-pulse text-sm text-muted-foreground">Loading settings...</div>;
  }

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const isLocal = draft.attachments.storageMode === "local";

  return (
    <div className="space-y-6">
      {isLocal && (
        <WarningBanner>
          <p className="font-medium">Local storage mode is not collaborative</p>
          <p className="mt-1 text-muted-foreground">
            Attachments stored locally will not sync across machines. Team members will see broken
            image references unless they have the same local files.
          </p>
        </WarningBanner>
      )}

      <RadioGroup
        label="Storage mode"
        name="storageMode"
        value={draft.attachments.storageMode}
        onChange={(value) => {
          setDraft((prev) => {
            if (!prev) return prev;
            const next = structuredClone(prev);
            next.attachments.storageMode = value as StorageMode;
            return next;
          });
        }}
        options={[
          {
            value: "inline",
            label: "Inline (embedded in issue data)",
            description: "Attachments are stored as base64 in Dolt. Fully collaborative.",
          },
          {
            value: "local",
            label: "Local filesystem",
            description:
              "Attachments are stored on disk in .pearl/attachments/. Not shared across machines.",
          },
        ]}
      />

      {isLocal && (
        <>
          <RadioGroup
            label="Local scope"
            name="localScope"
            value={draft.attachments.local.scope}
            onChange={(value) => {
              setDraft((prev) => {
                if (!prev) return prev;
                const next = structuredClone(prev);
                next.attachments.local.scope = value as "project" | "user";
                return next;
              });
            }}
            options={[
              {
                value: "project",
                label: "Project scope",
                description: "Store in .pearl/attachments/ within the project directory.",
              },
              {
                value: "user",
                label: "User scope",
                description: "Store in ~/.pearl/attachments/<project>/.",
              },
            ]}
          />

          {draft.attachments.local.scope === "project" && (
            <TextInput
              id="projectPathOverride"
              label="Project path override"
              description="Custom path for project-scoped attachments. Leave empty for default."
              value={draft.attachments.local.projectPathOverride ?? ""}
              onChange={(value) => {
                setDraft((prev) => {
                  if (!prev) return prev;
                  const next = structuredClone(prev);
                  next.attachments.local.projectPathOverride = value || null;
                  return next;
                });
              }}
              placeholder=".pearl/attachments"
            />
          )}

          {draft.attachments.local.scope === "user" && (
            <TextInput
              id="userPathOverride"
              label="User path override"
              description="Custom absolute path for user-scoped attachments. Leave empty for default."
              value={draft.attachments.local.userPathOverride ?? ""}
              onChange={(value) => {
                setDraft((prev) => {
                  if (!prev) return prev;
                  const next = structuredClone(prev);
                  next.attachments.local.userPathOverride = value || null;
                  return next;
                });
              }}
              placeholder="~/.pearl/attachments"
            />
          )}
        </>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-medium">Encoding policy</h3>

        <NumberInput
          id="maxBytes"
          label="Maximum file size"
          description={`Files above this limit will be rejected. Currently: ${formatBytes(draft.attachments.encoding.maxBytes)}`}
          value={draft.attachments.encoding.maxBytes}
          onChange={(value) => {
            setDraft((prev) => {
              if (!prev) return prev;
              const next = structuredClone(prev);
              next.attachments.encoding.maxBytes = value;
              return next;
            });
          }}
          min={1}
          suffix="bytes"
        />

        <NumberInput
          id="maxDimension"
          label="Maximum dimension"
          description="Images wider or taller than this will be downscaled."
          value={draft.attachments.encoding.maxDimension}
          onChange={(value) => {
            setDraft((prev) => {
              if (!prev) return prev;
              const next = structuredClone(prev);
              next.attachments.encoding.maxDimension = value;
              return next;
            });
          }}
          min={1}
          suffix="pixels"
        />

        <ReadonlyField label="Output format" value="WebP" />
        <ReadonlyField label="EXIF stripping" value="Always enabled (mandatory)" />
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || updateMutation.isPending}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            isDirty && !updateMutation.isPending
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "cursor-not-allowed bg-muted text-muted-foreground",
          )}
        >
          {updateMutation.isPending ? "Saving..." : "Save changes"}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={updateMutation.isPending}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/30"
        >
          Reset to defaults
        </button>

        {updateMutation.isError && (
          <p className="text-sm text-red-500">Failed to save settings. Please try again.</p>
        )}
        {updateMutation.isSuccess && !isDirty && (
          <p className="text-sm text-green-600 dark:text-green-400">Settings saved.</p>
        )}
      </div>
    </div>
  );
}
