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

  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      for (const url of urls.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  // Clean up removed refs when allBlocks changes
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

    pendingRef.current = new Set([...pendingRef.current].filter((r) => currentRefs.has(r)));
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
        return;
      }

      try {
        const blob = await resolvedAdapter.load(block);
        const objectUrl = URL.createObjectURL(blob);
        objectUrlsRef.current.set(ref, objectUrl);
        setBlobCache((prev) => {
          const next = new Map(prev);
          next.set(ref, { status: "loaded", objectUrl });
          return next;
        });
      } catch (err) {
        setBlobCache((prev) => {
          const next = new Map(prev);
          next.set(ref, {
            status: "error",
            error: err instanceof Error ? err.message : "Load failed",
          });
          return next;
        });
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

export function useAllAttachmentRefs(): { ref: string; block: AttachmentBlock }[] {
  const ctx = useContext(AttachmentContext);
  if (!ctx) return [];
  return Array.from(ctx.blocks.entries()).map(([ref, block]) => ({ ref, block }));
}
