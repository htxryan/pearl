import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CheckIcon, TrashIcon, XIcon } from "@/components/ui/icons";

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  isPending?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "destructive",
  isPending = false,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <Dialog isOpen={isOpen} onClose={onCancel} size="sm">
      <div className="p-6 animate-modal-enter">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            ref={cancelRef}
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
            className="gap-1.5"
          >
            <XIcon />
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={isPending} className="gap-1.5">
            {variant === "destructive" ? <TrashIcon /> : <CheckIcon />}
            {isPending ? "..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
