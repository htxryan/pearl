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
  getBlob: (ref: string) => BlobState;
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
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

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

      setBlobCache((prev) => {
        const next = new Map(prev);
        next.set(ref, { status: "loading" });
        return next;
      });

      try {
        const blob = await resolvedAdapter.load(block);
        const objectUrl = URL.createObjectURL(blob);
        objectUrlsRef.current.push(objectUrl);
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

  const loadedRefsRef = useRef(new Set<string>());

  const getBlob = useCallback(
    (ref: string): BlobState => {
      const cached = blobCache.get(ref);
      if (cached) return cached;

      if (!loadedRefsRef.current.has(ref)) {
        loadedRefsRef.current.add(ref);
        loadBlob(ref);
      }

      return { status: "loading" };
    },
    [blobCache, loadBlob],
  );

  const value = useMemo(
    () => ({ blocks: allBlocks, getBlob, onPillClick }),
    [allBlocks, getBlob, onPillClick],
  );

  return <AttachmentContext.Provider value={value}>{children}</AttachmentContext.Provider>;
}

const EMPTY_BLOB: BlobState = { status: "loading" };
const NO_BLOCK_BLOB: BlobState = { status: "error", error: "No attachment context" };

export function useAttachmentBlob(ref: string): BlobState {
  const ctx = useContext(AttachmentContext);
  if (!ctx) return NO_BLOCK_BLOB;
  return ctx.getBlob(ref) ?? EMPTY_BLOB;
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
