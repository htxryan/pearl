import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAllAttachmentRefs, useAttachmentBlob } from "@/hooks/use-attachment-context";

interface AttachmentsGalleryProps {
  onThumbnailClick?: (ref: string) => void;
}

export function AttachmentsGallery({ onThumbnailClick }: AttachmentsGalleryProps) {
  const attachments = useAllAttachmentRefs();

  if (attachments.length === 0) return null;

  return (
    <section>
      <h2 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3">
        Attachments ({attachments.length})
      </h2>
      <GalleryGrid refs={attachments.map((a) => a.ref)} onThumbnailClick={onThumbnailClick} />
    </section>
  );
}

const COLUMN_COUNT = 4;
const ROW_HEIGHT = 120;
const GAP = 8;

function GalleryGrid({
  refs,
  onThumbnailClick,
}: {
  refs: string[];
  onThumbnailClick?: (ref: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(refs.length / COLUMN_COUNT);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT + GAP,
    overscan: 2,
  });

  return (
    <div
      ref={parentRef}
      className="max-h-[480px] overflow-auto rounded-lg border border-border"
      role="grid"
      aria-label="Attachment thumbnails"
    >
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIdx = virtualRow.index * COLUMN_COUNT;
          const rowRefs = refs.slice(startIdx, startIdx + COLUMN_COUNT);

          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 right-0 flex gap-2 px-2"
              style={{
                height: `${ROW_HEIGHT}px`,
                top: `${virtualRow.start}px`,
              }}
              role="row"
            >
              {rowRefs.map((ref) => (
                <GalleryThumbnail key={ref} ref_={ref} onClick={onThumbnailClick} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GalleryThumbnail({ ref_, onClick }: { ref_: string; onClick?: (ref: string) => void }) {
  const { status, objectUrl, error } = useAttachmentBlob(ref_);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleClick = useCallback(() => {
    onClick?.(ref_);
  }, [ref_, onClick]);

  if (status === "error") {
    return (
      <div
        className="flex-1 min-w-0 rounded-md border border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-1 p-2"
        role="gridcell"
      >
        <BrokenImageIcon />
        <span className="text-xs text-destructive font-mono truncate max-w-full">
          {ref_.slice(0, 8)}
        </span>
        <span className="text-[10px] text-destructive/70 truncate max-w-full">
          {error ?? "Load failed"}
        </span>
      </div>
    );
  }

  return (
    <button
      ref={elementRef}
      type="button"
      onClick={handleClick}
      className="flex-1 min-w-0 rounded-md border border-border bg-muted/30 overflow-hidden cursor-pointer hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
      role="gridcell"
      aria-label={`Attachment ${ref_.slice(0, 8)}`}
    >
      {!isVisible || status === "loading" ? (
        <div className="h-full w-full animate-pulse motion-reduce:animate-none bg-muted" />
      ) : objectUrl ? (
        <img
          src={objectUrl}
          alt={`Attachment ${ref_.slice(0, 8)}`}
          className="h-full w-full object-cover transition-opacity duration-200 motion-reduce:transition-none"
          loading="lazy"
        />
      ) : (
        <div className="h-full w-full bg-muted flex items-center justify-center">
          <span className="text-xs text-muted-foreground font-mono">{ref_.slice(0, 8)}</span>
        </div>
      )}
    </button>
  );
}

function BrokenImageIcon() {
  return (
    <svg
      className="h-6 w-6 text-destructive/50"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M4 5l8 6M12 5l-8 6" strokeLinecap="round" />
    </svg>
  );
}
