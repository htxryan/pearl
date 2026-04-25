import { useCallback } from "react";
import { type ExternalToast, toast } from "sonner";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface AddToastInput {
  message: string;
  variant: ToastVariant;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

function mapOptions(input: Omit<AddToastInput, "variant">): ExternalToast {
  const opts: ExternalToast = {};
  if (input.duration !== undefined) opts.duration = input.duration;
  if (input.action) {
    opts.action = { label: input.action.label, onClick: input.action.onClick };
  }
  return opts;
}

export function addToast(input: AddToastInput): string | number {
  const opts = mapOptions(input);
  switch (input.variant) {
    case "success":
      return toast.success(input.message, opts);
    case "error":
      return toast.error(input.message, { duration: 5000, ...opts });
    case "warning":
      return toast.warning(input.message, opts);
    case "info":
      return toast.info(input.message, opts);
  }
}

export function dismissToast(id: string | number) {
  toast.dismiss(id);
}

export function useToasts() {
  const success = useCallback(
    (message: string, action?: AddToastInput["action"]) =>
      addToast({ message, variant: "success", action }),
    [],
  );
  const error = useCallback(
    (message: string, action?: AddToastInput["action"]) =>
      addToast({ message, variant: "error", action }),
    [],
  );
  const warning = useCallback(
    (message: string, action?: AddToastInput["action"]) =>
      addToast({ message, variant: "warning", action }),
    [],
  );
  const info = useCallback(
    (message: string, action?: AddToastInput["action"]) =>
      addToast({ message, variant: "info", action }),
    [],
  );
  const loading = useCallback(
    (message: string, opts?: ExternalToast) => toast.loading(message, opts),
    [],
  );
  const dismiss = useCallback((id?: string | number) => toast.dismiss(id), []);

  return { success, error, warning, info, loading, dismiss };
}

export { toast as sonnerToast };
