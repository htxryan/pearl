import { useToasts, dismissToast, type Toast, type ToastVariant } from "@/hooks/use-toast";

const variantStyles: Record<ToastVariant, string> = {
  success: "border-green-500/30 bg-green-50 text-green-900 dark:bg-green-950/50 dark:text-green-100",
  error: "border-destructive/30 bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-100",
  warning: "border-yellow-500/30 bg-yellow-50 text-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-100",
  info: "border-blue-500/30 bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100",
};

const iconMap: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

function ToastItem({ toast }: { toast: Toast }) {
  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-right-full duration-200 ${variantStyles[toast.variant]}`}
    >
      <span className="shrink-0 text-sm font-medium">{iconMap[toast.variant]}</span>
      <span className="flex-1 text-sm">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action!.onClick();
            dismissToast(toast.id);
          }}
          className="shrink-0 rounded px-2 py-0.5 text-sm font-medium underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        className="shrink-0 rounded p-0.5 text-current opacity-60 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToasts();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
