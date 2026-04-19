import { useCallback, useState } from "react";

interface ImageDropZoneProps {
  onDrop: (files: File[]) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function ImageDropZone({ onDrop, disabled, children }: ImageDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setDragCounter((c) => {
        if (c === 0) setIsDragOver(true);
        return c + 1;
      });
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setDragCounter((c) => {
        const next = c - 1;
        if (next <= 0) {
          setIsDragOver(false);
          return 0;
        }
        return next;
      });
    },
    [disabled],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setDragCounter(0);
      if (disabled) return;

      const files: File[] = [];
      const { items } = e.dataTransfer;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) onDrop(files);
    },
    [onDrop, disabled],
  );

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {isDragOver && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10 pointer-events-none"
          aria-hidden="true"
        >
          <span className="text-sm font-medium text-primary">Drop images here</span>
        </div>
      )}
    </div>
  );
}
