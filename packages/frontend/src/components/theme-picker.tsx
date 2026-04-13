import { useTheme } from "@/hooks/use-theme";
import { getAllThemes } from "@/themes";
import { cn } from "@/lib/utils";
import type { ThemeDefinition } from "@/themes";

/** Representative color tokens to show as swatches on each theme card. */
const SWATCH_TOKENS = ["background", "foreground", "primary", "accent", "muted"] as const;

function ThemeCard({
  theme,
  isActive,
  onSelect,
}: {
  theme: ThemeDefinition;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isActive}
      aria-label={`${theme.name} theme${isActive ? " (active)" : ""}`}
      className={cn(
        "group relative flex flex-col gap-3 rounded-lg border p-4 text-left transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/40 hover:bg-accent/30",
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute right-3 top-3">
          <svg
            className="h-5 w-5 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Color swatches */}
      <div className="flex gap-1.5">
        {SWATCH_TOKENS.map((token) => (
          <span
            key={token}
            className="h-5 w-5 rounded-full border border-border/50"
            style={{ backgroundColor: theme.colors[token] }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Theme info */}
      <div className="space-y-0.5">
        <span className="text-sm font-medium leading-tight">{theme.name}</span>
        <span className="block text-xs capitalize text-muted-foreground">
          {theme.colorScheme}
        </span>
      </div>
    </button>
  );
}

export function ThemePicker() {
  const { themeId, setTheme } = useTheme();
  const themes = getAllThemes();

  return (
    <div
      role="listbox"
      aria-label="Available themes"
      className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3"
    >
      {themes.map((t) => (
        <ThemeCard
          key={t.id}
          theme={t}
          isActive={t.id === themeId}
          onSelect={() => setTheme(t.id)}
        />
      ))}
    </div>
  );
}
