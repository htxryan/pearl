import { forwardRef, type ReactNode, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

type DialogSize = "sm" | "md" | "lg";

const sizeStyles: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  size?: DialogSize;
  children: ReactNode;
  className?: string;
  onCancel?: (e: React.SyntheticEvent<HTMLDialogElement>) => void;
}

export interface DialogRef {
  element: HTMLDialogElement | null;
}

export const Dialog = forwardRef<DialogRef, DialogProps>(
  ({ isOpen, onClose, size = "sm", children, className, onCancel }, ref) => {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useImperativeHandle(ref, () => ({
      get element() {
        return dialogRef.current;
      },
    }));

    useEffect(() => {
      const el = dialogRef.current;
      if (!el) return;
      if (isOpen) {
        el.showModal();
      } else if (el.open) {
        el.close();
      }
    }, [isOpen]);

    return (
      <dialog
        ref={dialogRef}
        aria-modal="true"
        className={cn(
          "fixed inset-0 z-50 m-auto w-full rounded-xl border border-border bg-background text-foreground p-0 shadow-xl backdrop:bg-black/50",
          sizeStyles[size],
          className,
        )}
        onClose={onClose}
        onCancel={onCancel}
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            onClose();
          }
        }}
      >
        {isOpen ? children : null}
      </dialog>
    );
  },
);

Dialog.displayName = "Dialog";
