import { useState, useCallback } from "react";

const STORAGE_KEY = "beads-gui-onboarding-complete";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  tip: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Beads",
    description: "A fast, keyboard-driven issue tracker. Let's show you around.",
    tip: "This will only take a moment.",
  },
  {
    id: "views",
    title: "Three ways to see your work",
    description: "Switch between List, Board, and Graph views using the sidebar or keys 1, 2, 3.",
    tip: "Each view shares the same data — changes sync instantly.",
  },
  {
    id: "command-palette",
    title: "Command palette",
    description: "Press Cmd+K (or Ctrl+K) to search issues and run commands from anywhere.",
    tip: "Type an issue ID or title to jump to it instantly.",
  },
  {
    id: "keyboard",
    title: "Keyboard shortcuts",
    description: "Press ? to see all available shortcuts. Use j/k to navigate, Enter to open.",
    tip: "Beads is designed for keyboard-first workflows.",
  },
  {
    id: "create",
    title: "Create your first issue",
    description: "Use the quick-add bar above the list, or press Cmd+K and choose Create Issue.",
    tip: "You're all set! Dismiss this to get started.",
  },
];

function isOnboardingComplete(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function markOnboardingComplete() {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Silently fail
  }
}

export function OnboardingBanner() {
  const [complete, setComplete] = useState(isOnboardingComplete);
  const [step, setStep] = useState(0);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      markOnboardingComplete();
      setComplete(true);
    }
  }, [step]);

  const handleDismiss = useCallback(() => {
    markOnboardingComplete();
    setComplete(true);
  }, []);

  if (complete) return null;

  const current = STEPS[step];

  return (
    <div className="mx-4 mt-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            {current.title}
          </h3>
          <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
            {current.description}
          </p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
            {current.tip}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDismiss}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {step < STEPS.length - 1 ? "Next" : "Get started"}
          </button>
        </div>
      </div>
      {/* Progress dots */}
      <div className="flex gap-1 mt-3">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full flex-1 ${i <= step ? "bg-blue-500" : "bg-blue-200 dark:bg-blue-800"}`}
          />
        ))}
      </div>
    </div>
  );
}
