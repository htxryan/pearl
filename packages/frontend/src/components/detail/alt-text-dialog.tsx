import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface AltTextDialogProps {
  isOpen: boolean;
  fileName: string;
  onSubmit: (altText: string) => void;
  onSkip: () => void;
}

export function AltTextDialog({ isOpen, fileName, onSubmit, onSkip }: AltTextDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      setValue("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen, fileName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(value.trim());
  };

  return (
    <Dialog isOpen={isOpen} onClose={onSkip} size="sm">
      <form onSubmit={handleSubmit} className="p-6 animate-modal-enter">
        <h2 className="text-lg font-semibold">Add alt text</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe this image for accessibility ({fileName}).
        </p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Screenshot of the login page"
          className="mt-3 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Alt text for image"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onSkip}>
            Skip
          </Button>
          <Button type="submit">Insert</Button>
        </div>
      </form>
    </Dialog>
  );
}
