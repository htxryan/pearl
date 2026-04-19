import type { ParsedField } from "@pearl/shared";
import { hasAttachmentSyntax, parseField } from "@pearl/shared";
import { useEffect, useRef, useState } from "react";

const WORKER_THRESHOLD = 256 * 1024;
const WORKER_TIMEOUT_MS = 10_000;
const HEARTBEAT_INTERVAL_MS = 2_000;
const HEARTBEAT_TIMEOUT_MS = 5_000;

interface ParseFieldResult {
  parsed: ParsedField | null;
  isParsing: boolean;
  error?: string;
}

const EMPTY_PARSED: ParsedField = {
  prose: "",
  blocks: new Map(),
  refsInProse: [],
  broken: [],
};

export function useParseField(text: string | undefined | null): ParseFieldResult {
  const [result, setResult] = useState<ParseFieldResult>({ parsed: null, isParsing: false });
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const lastPongRef = useRef<number>(0);

  useEffect(() => {
    if (!text || !hasAttachmentSyntax(text)) {
      setResult({ parsed: text ? { ...EMPTY_PARSED, prose: text } : null, isParsing: false });
      return;
    }

    if (text.length < WORKER_THRESHOLD || typeof Worker === "undefined") {
      try {
        const parsed = parseField(text);
        setResult({ parsed, isParsing: false });
      } catch (err) {
        setResult({
          parsed: null,
          isParsing: false,
          error: err instanceof Error ? err.message : "Parse failed",
        });
      }
      return;
    }

    setResult({ parsed: null, isParsing: true });

    try {
      const worker = new Worker(new URL("@pearl/shared/attachment-worker", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;
      lastPongRef.current = Date.now();

      worker.onmessage = (e: MessageEvent) => {
        if (e.data?.type === "pong") {
          lastPongRef.current = Date.now();
          return;
        }

        cleanup();
        if (e.data?.error) {
          fallbackSync(text);
        } else {
          const blocks = new Map(
            e.data?.blocks instanceof Map ? e.data.blocks : Object.entries(e.data?.blocks ?? {}),
          );
          setResult({
            parsed: {
              prose: e.data.prose,
              blocks,
              refsInProse: e.data.refsInProse,
              broken: e.data.broken,
            } as ParsedField,
            isParsing: false,
          });
        }
      };

      worker.onerror = () => {
        cleanup();
        fallbackSync(text);
      };

      timeoutRef.current = setTimeout(() => {
        cleanup();
        fallbackSync(text);
      }, WORKER_TIMEOUT_MS);

      heartbeatRef.current = setInterval(() => {
        if (Date.now() - lastPongRef.current > HEARTBEAT_TIMEOUT_MS) {
          cleanup();
          fallbackSync(text);
        } else {
          worker.postMessage({ type: "ping" });
        }
      }, HEARTBEAT_INTERVAL_MS);

      worker.postMessage(text);
    } catch {
      fallbackSync(text);
    }

    function fallbackSync(t: string) {
      try {
        const parsed = parseField(t);
        setResult({ parsed, isParsing: false });
      } catch (err) {
        setResult({
          parsed: null,
          isParsing: false,
          error: err instanceof Error ? err.message : "Parse failed",
        });
      }
    }

    function cleanup() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      workerRef.current?.terminate();
      workerRef.current = null;
    }

    return cleanup;
  }, [text]);

  return result;
}
