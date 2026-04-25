import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import type { ThemeDefinition } from "@/themes";
import { getAllThemes } from "@/themes";

const SWATCH_TOKENS = ["background", "muted", "accent", "primary", "foreground"] as const;

function ColorBand({ theme }: { theme: ThemeDefinition }) {
  return (
    <div
      className="flex h-8 w-24 shrink-0 overflow-hidden rounded-md border border-border/60"
      role="presentation"
    >
      {SWATCH_TOKENS.map((token) => (
        <span
          key={token}
          className="h-full flex-1"
          style={{ backgroundColor: theme.colors[token] }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function ThemeRow({
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
      aria-pressed={isActive}
      aria-label={`${theme.name} theme${isActive ? " (active)" : ""}`}
      className={cn(
        "group flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive
          ? "border-primary bg-primary/5"
          : "border-transparent hover:border-border hover:bg-accent/30",
      )}
      onClick={onSelect}
    >
      <ColorBand theme={theme} />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-tight">{theme.name}</span>
        <span className="block text-xs capitalize text-muted-foreground">{theme.colorScheme}</span>
      </div>
      {isActive && (
        <svg
          className="h-4 w-4 shrink-0 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

export function ThemePicker() {
  const { themeId, setTheme } = useTheme();
  const themes = getAllThemes();

  const lightThemes = themes.filter((t) => t.colorScheme === "light");
  const darkThemes = themes.filter((t) => t.colorScheme === "dark");

  return (
    <div role="group" aria-label="Available themes" className="flex flex-col gap-4">
      {lightThemes.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Light
          </h3>
          <div className="flex flex-col gap-1">
            {lightThemes.map((t) => (
              <ThemeRow
                key={t.id}
                theme={t}
                isActive={t.id === themeId}
                onSelect={() => setTheme(t.id)}
              />
            ))}
          </div>
        </section>
      )}
      {darkThemes.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dark
          </h3>
          <div className="flex flex-col gap-1">
            {darkThemes.map((t) => (
              <ThemeRow
                key={t.id}
                theme={t}
                isActive={t.id === themeId}
                onSelect={() => setTheme(t.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
