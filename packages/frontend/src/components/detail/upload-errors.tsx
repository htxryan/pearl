import type { UploadError } from "@/hooks/use-image-upload";

interface UploadErrorsProps {
  errors: UploadError[];
  onDismiss: () => void;
}

export function UploadErrors({ errors, onDismiss }: UploadErrorsProps) {
  if (errors.length === 0) return null;

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3" role="alert">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          {errors.map((err, i) => (
            <p key={`${err.fileName}-${err.message}-${i}`} className="text-xs text-destructive">
              {err.fileName ? `${err.fileName}: ` : ""}
              {err.message}
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
          aria-label="Dismiss errors"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
