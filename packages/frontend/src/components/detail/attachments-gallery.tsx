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
const ROW_HEIGHT = 160;
const GAP = 12;

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
      className="max-h-[600px] overflow-auto"
      role="list"
      aria-label="Attachment thumbnails"
    >
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIdx = virtualRow.index * COLUMN_COUNT;
          const rowRefs = refs.slice(startIdx, startIdx + COLUMN_COUNT);

          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 right-0 flex gap-3"
              style={{
                height: `${ROW_HEIGHT}px`,
                top: `${virtualRow.start}px`,
              }}
              role="presentation"
            >
              {rowRefs.map((ref) => (
                <GalleryThumbnail key={ref} ref_={ref} onClick={onThumbnailClick} />
              ))}
              {/* Filler cells to keep the last row's tiles at the correct width */}
              {rowRefs.length < COLUMN_COUNT &&
                Array.from({ length: COLUMN_COUNT - rowRefs.length }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: filler cells have no stable id
                  <div key={`filler-${virtualRow.key}-${i}`} className="flex-1 min-w-0" />
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
        role="listitem"
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
      className="group relative flex-1 min-w-0 rounded-xl overflow-hidden cursor-pointer bg-muted/40 ring-1 ring-border shadow-sm hover:shadow-md hover:ring-primary/40 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      aria-label={`Attachment ${ref_.slice(0, 8)}`}
    >
      {!isVisible || status === "loading" ? (
        <div className="h-full w-full animate-pulse motion-reduce:animate-none bg-muted" />
      ) : objectUrl ? (
        <>
          <img
            src={objectUrl}
            alt={`Attachment ${ref_.slice(0, 8)}`}
            className="h-full w-full object-cover transition-[transform,opacity] duration-300 motion-reduce:transition-none group-hover:scale-[1.03]"
            loading="lazy"
          />
          {/* Hover overlay with expand hint */}
          <span
            className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 motion-reduce:transition-none"
            aria-hidden="true"
          />
          <span
            className="absolute bottom-2 right-2 rounded-full bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 motion-reduce:transition-none"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 16 16"
              className="inline-block h-3 w-3 mr-0.5 align-[-2px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" strokeLinecap="round" />
            </svg>
            Open
          </span>
        </>
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
