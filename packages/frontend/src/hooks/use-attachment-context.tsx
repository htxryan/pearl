import type { AttachmentBlock, ParsedField } from "@pearl/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { StorageAdapter } from "@/lib/storage-adapter";
import { InlineStorageAdapter, LocalStorageAdapter } from "@/lib/storage-adapter";

interface BlobState {
  status: "loading" | "loaded" | "error";
  objectUrl?: string;
  error?: string;
}

/** A parsed field tagged with a human-readable source label (e.g. "Description", "Comment #2"). */
export interface LabeledParsedField {
  parsed: ParsedField;
  sourceLabel?: string;
}

interface AttachmentContextValue {
  blocks: Map<string, AttachmentBlock>;
  sourceLabels: Map<string, string>;
  getCached: (ref: string) => BlobState | undefined;
  requestLoad: (ref: string) => void;
  onPillClick?: (ref: string) => void;
}

const AttachmentContext = createContext<AttachmentContextValue | null>(null);

interface AttachmentProviderProps {
  parsedFields: (LabeledParsedField | ParsedField)[];
  adapter?: StorageAdapter;
  onPillClick?: (ref: string) => void;
  children: React.ReactNode;
}

function isLabeled(f: LabeledParsedField | ParsedField): f is LabeledParsedField {
  return "parsed" in f && "blocks" in f.parsed;
}

export function AttachmentProvider({
  parsedFields,
  adapter,
  onPillClick,
  children,
}: AttachmentProviderProps) {
  const inlineAdapter = useMemo(() => new InlineStorageAdapter(), []);
  const localAdapter = useMemo(() => new LocalStorageAdapter(), []);
  const resolvedAdapter = useMemo<StorageAdapter>(
    () =>
      adapter ??
      ({
        mode: "inline",
        store: (encoded: Parameters<StorageAdapter["store"]>[0]) => inlineAdapter.store(encoded),
        load: (block: AttachmentBlock) =>
          block.type === "local" ? localAdapter.load(block) : inlineAdapter.load(block),
      } as unknown as StorageAdapter),
    [adapter, inlineAdapter, localAdapter],
  );

  const { allBlocks, sourceLabels } = useMemo(() => {
    const blocks = new Map<string, AttachmentBlock>();
    const labels = new Map<string, string>();
    for (const field of parsedFields) {
      const parsed = isLabeled(field) ? field.parsed : field;
      const label = isLabeled(field) ? field.sourceLabel : undefined;
      for (const [ref, block] of parsed.blocks) {
        if (!blocks.has(ref)) {
          blocks.set(ref, block);
          if (label) labels.set(ref, label);
        }
      }
    }
    return { allBlocks: blocks, sourceLabels: labels };
  }, [parsedFields]);

  const [blobCache, setBlobCache] = useState<Map<string, BlobState>>(new Map());
  const objectUrlsRef = useRef<Map<string, string>>(new Map());
  const pendingRef = useRef(new Set<string>());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const urls = objectUrlsRef.current;
    return () => {
      mountedRef.current = false;
      for (const url of urls.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  // When allBlocks changes, retry refs that previously failed due to missing blocks
  useEffect(() => {
    const currentRefs = new Set(allBlocks.keys());
    const staleUrls: string[] = [];

    for (const [ref, url] of objectUrlsRef.current) {
      if (!currentRefs.has(ref)) {
        staleUrls.push(url);
        objectUrlsRef.current.delete(ref);
      }
    }
    for (const url of staleUrls) {
      URL.revokeObjectURL(url);
    }

    // Clear pending refs for removed blocks
    for (const ref of pendingRef.current) {
      if (!currentRefs.has(ref)) {
        pendingRef.current.delete(ref);
      }
    }

    // Clear error entries for refs whose blocks are now available so useAttachmentBlob re-triggers
    const refsToRetry: string[] = [];
    setBlobCache((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const [ref, state] of prev) {
        if (!currentRefs.has(ref)) {
          next.delete(ref);
          changed = true;
        } else if (state.status === "error" && allBlocks.has(ref)) {
          next.delete(ref);
          refsToRetry.push(ref);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    // Clean up pending tracking for retried refs (outside updater to avoid side effects)
    for (const ref of refsToRetry) {
      pendingRef.current.delete(ref);
    }
  }, [allBlocks]);

  const loadBlob = useCallback(
    async (ref: string) => {
      const block = allBlocks.get(ref);
      if (!block) {
        setBlobCache((prev) => {
          const next = new Map(prev);
          next.set(ref, { status: "error", error: "No attachment block found" });
          return next;
        });
        pendingRef.current.delete(ref);
        return;
      }

      try {
        const blob = await resolvedAdapter.load(block);
        if (!mountedRef.current) return;
        const objectUrl = URL.createObjectURL(blob);
        objectUrlsRef.current.set(ref, objectUrl);
        setBlobCache((prev) => {
          const next = new Map(prev);
          next.set(ref, { status: "loaded", objectUrl });
          return next;
        });
      } catch (err) {
        if (!mountedRef.current) return;
        setBlobCache((prev) => {
          const next = new Map(prev);
          next.set(ref, {
            status: "error",
            error: err instanceof Error ? err.message : "Load failed",
          });
          return next;
        });
        pendingRef.current.delete(ref);
      }
    },
    [allBlocks, resolvedAdapter],
  );

  const requestLoad = useCallback(
    (ref: string) => {
      if (pendingRef.current.has(ref)) return;
      pendingRef.current.add(ref);
      loadBlob(ref);
    },
    [loadBlob],
  );

  const getCached = useCallback(
    (ref: string): BlobState | undefined => blobCache.get(ref),
    [blobCache],
  );

  const value = useMemo(
    () => ({ blocks: allBlocks, sourceLabels, getCached, requestLoad, onPillClick }),
    [allBlocks, sourceLabels, getCached, requestLoad, onPillClick],
  );

  return <AttachmentContext.Provider value={value}>{children}</AttachmentContext.Provider>;
}

const LOADING_BLOB: BlobState = { status: "loading" };
const NO_CTX_BLOB: BlobState = { status: "error", error: "No attachment context" };

export function useAttachmentBlob(ref: string): BlobState {
  const ctx = useContext(AttachmentContext);

  useEffect(() => {
    if (ctx && !ctx.getCached(ref)) {
      ctx.requestLoad(ref);
    }
  }, [ctx, ref]);

  if (!ctx) return NO_CTX_BLOB;
  return ctx.getCached(ref) ?? LOADING_BLOB;
}

export function useAttachmentClick(): ((ref: string) => void) | undefined {
  const ctx = useContext(AttachmentContext);
  return ctx?.onPillClick;
}

export function useAttachmentCacheCheck(): (
  ref: string,
) => "loading" | "loaded" | "error" | undefined {
  const ctx = useContext(AttachmentContext);
  return useCallback((ref: string) => ctx?.getCached(ref)?.status, [ctx]);
}

export function useAttachmentSourceLabel(ref: string): string | undefined {
  const ctx = useContext(AttachmentContext);
  return ctx?.sourceLabels.get(ref);
}

export function useAllAttachmentRefs(): {
  ref: string;
  block: AttachmentBlock;
  sourceLabel?: string;
}[] {
  const ctx = useContext(AttachmentContext);
  return useMemo(() => {
    if (!ctx) return [];
    return Array.from(ctx.blocks.entries()).map(([ref, block]) => ({
      ref,
      block,
      sourceLabel: ctx.sourceLabels.get(ref),
    }));
  }, [ctx?.blocks, ctx?.sourceLabels]);
}
