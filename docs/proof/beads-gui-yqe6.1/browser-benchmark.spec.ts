/**
 * Gate 2 Benchmark: 10 × 1MB inline base64 images — browser memory & UI-thread test
 *
 * Verifies that a browser can render 10 × ~1MB inline base64 images without
 * blocking the UI thread for more than 200ms.
 *
 * Run:
 *   npx playwright test docs/proof/beads-gui-yqe6.1/browser-benchmark.spec.ts --project=bench-chromium
 */
import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";

/** Spin up a throwaway HTTP server that serves a single HTML page. */
function serveHtml(html: string): Promise<{ server: Server; url: string }> {
	return new Promise((resolve) => {
		const server = createServer((_req, res) => {
			res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
			res.end(html);
		});
		server.listen(0, "127.0.0.1", () => {
			const addr = server.address();
			if (typeof addr === "object" && addr) {
				resolve({ server, url: `http://127.0.0.1:${addr.port}` });
			}
		});
	});
}

const PAGE_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Gate 2 Benchmark</title></head>
<body>
<div id="status">generating…</div>
<div id="container"></div>
<script>
(async () => {
  const TARGET_COUNT = 10;
  const CANVAS_SIZE = 1024;          // 1024×1024 RGBA ≈ 4 MB raw; PNG compresses to ~4.5 MB per image

  const yieldToEventLoop = () => new Promise(r => setTimeout(r, 0));

  const container = document.getElementById('container');
  const status    = document.getElementById('status');

  // ── Phase 1: generate data URLs one-at-a-time, yielding between each ──
  // This is test setup — we yield so generation doesn't create long tasks.
  const dataUrls = [];
  const genStart = performance.now();
  for (let i = 0; i < TARGET_COUNT; i++) {
    const c   = document.createElement('canvas');
    c.width   = CANVAS_SIZE;
    c.height  = CANVAS_SIZE;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    // Fill with pseudo-random bytes — fast PRNG (xorshift)
    let seed = (i + 1) * 0xDEADBEEF;
    for (let j = 0; j < img.data.length; j += 4) {
      seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5;
      img.data[j]     = seed & 0xFF;
      img.data[j + 1] = (seed >> 8) & 0xFF;
      img.data[j + 2] = (seed >> 16) & 0xFF;
      img.data[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    dataUrls.push(c.toDataURL('image/png'));
    await yieldToEventLoop();  // break up generation into separate tasks
  }
  const genMs = performance.now() - genStart;

  // ── Flush any lingering long tasks from generation ──
  await yieldToEventLoop();
  await yieldToEventLoop();

  // ── Start long-task observer NOW — only captures rendering phase ──
  const renderLongTasks = [];
  try {
    const obs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        renderLongTasks.push({ duration: e.duration, startTime: e.startTime });
      }
    });
    obs.observe({ type: 'longtask', buffered: false });
  } catch (_) {
    // longtask observer not supported
  }

  // ── Phase 2: insert ALL <img> elements into the DOM at once ──
  // This is the realistic scenario: the DOM already has inline base64 src attributes.
  const renderStart = performance.now();
  const loadPromises = dataUrls.map((url, i) => {
    return new Promise((resolve) => {
      const el = document.createElement('img');
      el.width = 256;
      el.height = 256;
      el.onload = () => resolve(i);
      el.onerror = () => resolve(i);
      el.src = url;
      container.appendChild(el);
    });
  });
  await Promise.all(loadPromises);
  const renderMs = performance.now() - renderStart;

  // ── Phase 3: responsiveness probes — 5 consecutive setTimeout round-trips ──
  const probeDelays = [];
  for (let p = 0; p < 5; p++) {
    const t0 = performance.now();
    await new Promise(r => setTimeout(r, 0));
    probeDelays.push(performance.now() - t0);
  }
  const maxProbeMs = Math.max(...probeDelays);

  // ── Collect memory (Chrome-only) ──
  let memoryMB = null;
  if (performance.memory) {
    memoryMB = {
      usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
    };
  }

  // ── Compute data-URL sizes ──
  const totalDataUrlBytes = dataUrls.reduce((s, u) => s + u.length, 0);

  // ── Publish results ──
  window.__benchmarkResults = {
    imageCount: TARGET_COUNT,
    canvasSize: CANVAS_SIZE,
    totalDataUrlMB: (totalDataUrlBytes / 1024 / 1024).toFixed(2),
    generationMs: genMs.toFixed(1),
    renderMs: renderMs.toFixed(1),
    maxResponsiveProbeMs: maxProbeMs.toFixed(2),
    probeDelays: probeDelays.map(d => d.toFixed(2)),
    renderLongTasks,
    maxRenderLongTaskMs: renderLongTasks.length
      ? Math.max(...renderLongTasks.map(t => t.duration)).toFixed(1)
      : 0,
    memoryMB,
  };

  status.textContent = 'done';
})();
</script>
</body>
</html>`;

test("Gate 2 — 10 × ~1MB inline base64 images render without >200ms thread block", async ({
	page,
	browserName,
}) => {
	test.setTimeout(120_000); // generous timeout for image generation

	const { server, url } = await serveHtml(PAGE_HTML);

	try {
		// Enable performance.memory (Chrome flag)
		await page.goto(url, { waitUntil: "domcontentloaded" });

		// Wait for benchmark to finish
		await page.waitForFunction(() => document.getElementById("status")?.textContent === "done", {
			timeout: 90_000,
		});

		// Retrieve results
		const results: {
			imageCount: number;
			canvasSize: number;
			totalDataUrlMB: string;
			generationMs: string;
			renderMs: string;
			maxResponsiveProbeMs: string;
			probeDelays: string[];
			renderLongTasks: { duration: number; startTime: number }[];
			maxRenderLongTaskMs: number | string;
			memoryMB: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } | null;
		} = await page.evaluate(() => (window as any).__benchmarkResults);

		// ── Report ──
		console.log("\n╔══════════════════════════════════════════════════════════╗");
		console.log("║           Gate 2 — Browser Memory Benchmark             ║");
		console.log("╠══════════════════════════════════════════════════════════╣");
		console.log(`║  Browser             : ${browserName.padEnd(34)}║`);
		console.log(`║  Images              : ${String(results.imageCount).padEnd(34)}║`);
		console.log(`║  Canvas size         : ${`${results.canvasSize}x${results.canvasSize}`.padEnd(34)}║`);
		console.log(`║  Total data-URL size : ${`${results.totalDataUrlMB} MB`.padEnd(34)}║`);
		console.log("╠══════════════════════════════════════════════════════════╣");
		console.log(`║  Generation time     : ${`${results.generationMs} ms (setup, not measured)`.padEnd(34)}║`);
		console.log(`║  Render time         : ${`${results.renderMs} ms`.padEnd(34)}║`);
		console.log(`║  Max responsive probe: ${`${results.maxResponsiveProbeMs} ms`.padEnd(34)}║`);
		console.log(`║  Probe delays        : ${`[${results.probeDelays.join(", ")}] ms`.padEnd(34)}║`);
		console.log(`║  Render long tasks   : ${String(results.renderLongTasks.length).padEnd(34)}║`);
		console.log(`║  Max render long-task: ${`${results.maxRenderLongTaskMs} ms`.padEnd(34)}║`);
		if (results.memoryMB) {
			console.log(`║  JS heap used        : ${`${results.memoryMB.usedJSHeapSize} MB`.padEnd(34)}║`);
			console.log(`║  JS heap total       : ${`${results.memoryMB.totalJSHeapSize} MB`.padEnd(34)}║`);
			console.log(`║  JS heap limit       : ${`${results.memoryMB.jsHeapSizeLimit} MB`.padEnd(34)}║`);
		} else {
			console.log(`║  JS heap             : ${"(not available)".padEnd(34)}║`);
		}

		// ── Gate 2 criterion: max single task ≤ 200 ms during rendering ──
		const maxTask = Number(results.maxRenderLongTaskMs);
		const pass = maxTask <= 200;
		const verdict = pass ? "PASS" : "FAIL";
		console.log("╠══════════════════════════════════════════════════════════╣");
		console.log(`║  Gate 2 verdict      : ${verdict.padEnd(34)}║`);
		console.log("╚══════════════════════════════════════════════════════════╝\n");

		// Hard assertion
		expect(
			maxTask,
			`Max render-phase long-task duration (${maxTask} ms) must not exceed 200 ms`,
		).toBeLessThanOrEqual(200);
	} finally {
		server.close();
	}
});
