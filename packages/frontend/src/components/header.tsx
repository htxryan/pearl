import { useTheme } from "@/hooks/use-theme";
import { getAllThemes } from "@/themes";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";

export function Header() {
  const { theme, themeId, setTheme } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close picker on outside click or Escape
  useEffect(() => {
    if (!pickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setPickerOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [pickerOpen]);

  const themes = getAllThemes();

  return (
    <header className="flex h-14 items-center justify-between bg-muted/30 px-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Press{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
            {navigator.platform?.includes("Mac") ? "⌘K" : "Ctrl+K"}
          </kbd>{" "}
          for command palette
        </span>
      </div>
      <div className="relative flex items-center gap-2">
        <Button
          ref={buttonRef}
          variant="ghost"
          size="icon"
          aria-label="Change theme"
          aria-expanded={pickerOpen}
          aria-haspopup="listbox"
          onClick={() => setPickerOpen((v) => !v)}
        >
          {theme.colorScheme === "dark" ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </Button>

        {pickerOpen && (
          <div
            ref={pickerRef}
            role="listbox"
            aria-label="Select theme"
            className="absolute right-0 top-full mt-1 z-50 w-56 max-h-80 overflow-auto rounded-lg border border-border bg-background shadow-lg"
          >
            {themes.map((t) => (
              <button
                key={t.id}
                role="option"
                aria-selected={t.id === themeId}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${t.id === themeId ? "bg-accent text-accent-foreground" : ""}`}
                onClick={() => {
                  setTheme(t.id);
                  setPickerOpen(false);
                }}
              >
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: t.colors.background }}
                />
                <span className="truncate">{t.name}</span>
                {t.id === themeId && (
                  <svg className="ml-auto h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
