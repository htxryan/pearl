import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useAllAttachmentRefs,
  useAttachmentBlob,
  useAttachmentCacheCheck,
} from "@/hooks/use-attachment-context";

interface LightboxProps {
  activeRef: string | null;
  onClose: () => void;
}

export function Lightbox({ activeRef, onClose }: LightboxProps) {
  const allRefs = useAllAttachmentRefs();
  const refs = useMemo(() => allRefs.map((a) => a.ref), [allRefs]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const triggerRef = useRef<Element | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const checkCache = useAttachmentCacheCheck();

  const isOpen = activeRef !== null && refs.length > 0;

  useEffect(() => {
    if (!isOpen) return;
    const idx = refs.indexOf(activeRef);
    setCurrentIndex(idx >= 0 ? idx : 0);
  }, [activeRef, refs, isOpen]);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
    }
    return () => {
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [isOpen]);

  const navigateBy = useCallback(
    (delta: number) => {
      setCurrentIndex((prev) => {
        for (let i = 1; i <= refs.length; i++) {
          const candidate = (prev + delta * i + refs.length * i) % refs.length;
          if (candidate === prev) return prev;
          const status = checkCache(refs[candidate]);
          if (status !== "error") return candidate;
        }
        return prev;
      });
    },
    [refs, checkCache],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "ArrowRight":
          e.preventDefault();
          navigateBy(1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          navigateBy(-1);
          break;
        case "Home":
          e.preventDefault();
          setCurrentIndex(0);
          break;
        case "End":
          e.preventDefault();
          setCurrentIndex(refs.length - 1);
          break;
      }
    },
    [onClose, navigateBy, refs.length],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) return null;

  const currentRef = refs[currentIndex];

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-label="Image viewer"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center outline-none"
    >
      {/* Backdrop */}
      <div
        data-testid="lightbox-backdrop"
        className="absolute inset-0 bg-black/80 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 max-w-[90vw] max-h-[90vh]">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-2 -right-2 z-20 h-8 w-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
        >
          <CloseIcon />
        </button>

        {/* Image */}
        <LightboxImage ref_={currentRef} />

        {/* Controls bar */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigateBy(-1)}
            aria-label="Previous image"
            className="h-10 w-10 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
          >
            <ChevronLeftIcon />
          </button>

          <span className="text-sm text-white font-medium tabular-nums select-none">
            {currentIndex + 1} of {refs.length}
          </span>

          <button
            type="button"
            onClick={() => navigateBy(1)}
            aria-label="Next image"
            className="h-10 w-10 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {/* Screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        Image {currentIndex + 1} of {refs.length}
      </div>
    </div>,
    document.body,
  );
}

function LightboxImage({ ref_ }: { ref_: string }) {
  const { status, objectUrl, error } = useAttachmentBlob(ref_);

  if (status === "loading") {
    return (
      <div className="w-64 h-64 rounded-lg bg-white/10 flex items-center justify-center animate-pulse motion-reduce:animate-none">
        <span className="text-white/50 text-sm">Loading...</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="w-64 h-64 rounded-lg bg-white/10 border border-white/20 flex flex-col items-center justify-center gap-2">
        <BrokenImageIcon />
        <span className="text-white/70 text-sm font-mono">{ref_.slice(0, 8)}</span>
        <span className="text-white/50 text-xs">{error ?? "Load failed"}</span>
      </div>
    );
  }

  return (
    <img
      src={objectUrl}
      alt={`Attachment ${ref_.slice(0, 8)}`}
      className="max-w-[85vw] max-h-[75vh] rounded-lg object-contain motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150 select-none"
      draggable={false}
    />
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M10 3l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrokenImageIcon() {
  return (
    <svg
      className="h-8 w-8 text-white/40"
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
