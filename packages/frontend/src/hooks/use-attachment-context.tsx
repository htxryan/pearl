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
import { InlineStorageAdapter } from "@/lib/storage-adapter";

interface BlobState {
  status: "loading" | "loaded" | "error";
  objectUrl?: string;
  error?: string;
}

interface AttachmentContextValue {
  blocks: Map<string, AttachmentBlock>;
  getCached: (ref: string) => BlobState | undefined;
  requestLoad: (ref: string) => void;
  onPillClick?: (ref: string) => void;
}

const AttachmentContext = createContext<AttachmentContextValue | null>(null);

interface AttachmentProviderProps {
  parsedFields: ParsedField[];
  adapter?: StorageAdapter;
  onPillClick?: (ref: string) => void;
  children: React.ReactNode;
}

export function AttachmentProvider({
  parsedFields,
  adapter,
  onPillClick,
  children,
}: AttachmentProviderProps) {
  const resolvedAdapter = useMemo(() => adapter ?? new InlineStorageAdapter(), [adapter]);

  const allBlocks = useMemo(() => {
    const merged = new Map<string, AttachmentBlock>();
    for (const pf of parsedFields) {
      for (const [ref, block] of pf.blocks) {
        if (!merged.has(ref)) merged.set(ref, block);
      }
    }
    return merged;
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
    () => ({ blocks: allBlocks, getCached, requestLoad, onPillClick }),
    [allBlocks, getCached, requestLoad, onPillClick],
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

export function useAllAttachmentRefs(): { ref: string; block: AttachmentBlock }[] {
  const ctx = useContext(AttachmentContext);
  return useMemo(() => {
    if (!ctx) return [];
    return Array.from(ctx.blocks.entries()).map(([ref, block]) => ({ ref, block }));
  }, [ctx?.blocks]);
}
