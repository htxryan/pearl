import { describe, expect, it } from "vitest";
import { WriteQueue } from "./queue.js";

describe("WriteQueue", () => {
  it("executes tasks sequentially", async () => {
    const queue = new WriteQueue();
    const order: number[] = [];

    const p1 = queue.enqueue(async () => {
      await sleep(50);
      order.push(1);
      return "a";
    });

    const p2 = queue.enqueue(async () => {
      await sleep(10);
      order.push(2);
      return "b";
    });

    const p3 = queue.enqueue(async () => {
      order.push(3);
      return "c";
    });

    const results = await Promise.all([p1, p2, p3]);

    expect(results).toEqual(["a", "b", "c"]);
    // Must execute in enqueue order, not by speed
    expect(order).toEqual([1, 2, 3]);
  });

  it("propagates errors without blocking the queue", async () => {
    const queue = new WriteQueue();

    const p1 = queue.enqueue(async () => {
      throw new Error("fail");
    });

    const p2 = queue.enqueue(async () => {
      return "ok";
    });

    await expect(p1).rejects.toThrow("fail");
    expect(await p2).toBe("ok");
  });

  it("reports pending count", async () => {
    const queue = new WriteQueue();
    let resolveFirst: () => void;
    const blocker = new Promise<void>((r) => {
      resolveFirst = r;
    });

    const p1 = queue.enqueue(async () => {
      await blocker;
      return 1;
    });

    // Give the drain loop time to start p1
    await sleep(10);

    queue.enqueue(async () => 2);
    queue.enqueue(async () => 3);

    // p1 is running, 2 and 3 are pending
    expect(queue.pending).toBe(2);

    resolveFirst!();
    await p1;
    // Let remaining drain
    await sleep(20);
    expect(queue.pending).toBe(0);
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
