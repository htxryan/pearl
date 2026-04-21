// Web Worker entry point for off-main-thread field parsing.
// Usage: new Worker(new URL('@pearl/shared/attachment-worker', import.meta.url), { type: 'module' })

import { parseField } from "./attachment-syntax.js";

declare const self: Worker;

self.onmessage = (e: MessageEvent) => {
  if (e.data?.type === "ping") {
    self.postMessage({ type: "pong" });
    return;
  }

  try {
    const result = parseField(e.data as string);
    self.postMessage(result);
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
