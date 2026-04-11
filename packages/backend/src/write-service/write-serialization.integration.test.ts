import { describe, it, expect } from "vitest";
import { WriteQueue } from "./queue.js";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe("WriteQueue — Write Serialization (STPA H2)", () => {
  describe("concurrent writes are serialized", () => {
    it("executes writes strictly in enqueue order regardless of duration", async () => {
      const queue = new WriteQueue();
      const executionLog: string[] = [];

      // Enqueue 5 tasks with varying durations — fastest last
      const tasks = [
        queue.enqueue(async () => {
          await sleep(40);
          executionLog.push("A");
          return "A";
        }),
        queue.enqueue(async () => {
          await sleep(30);
          executionLog.push("B");
          return "B";
        }),
        queue.enqueue(async () => {
          await sleep(20);
          executionLog.push("C");
          return "C";
        }),
        queue.enqueue(async () => {
          await sleep(10);
          executionLog.push("D");
          return "D";
        }),
        queue.enqueue(async () => {
          executionLog.push("E");
          return "E";
        }),
      ];

      const results = await Promise.all(tasks);

      // Results correspond to enqueue order
      expect(results).toEqual(["A", "B", "C", "D", "E"]);
      // Execution happened in strict FIFO order
      expect(executionLog).toEqual(["A", "B", "C", "D", "E"]);
    });

    it("never runs two writes concurrently", async () => {
      const queue = new WriteQueue();
      let concurrency = 0;
      let maxConcurrency = 0;

      const makeTask = (id: number) =>
        queue.enqueue(async () => {
          concurrency++;
          maxConcurrency = Math.max(maxConcurrency, concurrency);
          await sleep(10);
          concurrency--;
          return id;
        });

      await Promise.all([makeTask(1), makeTask(2), makeTask(3), makeTask(4)]);

      // If serialization works, max concurrency should always be 1
      expect(maxConcurrency).toBe(1);
    });

    it("each write starts only after the previous one completes", async () => {
      const queue = new WriteQueue();
      // Use a logical ordering counter instead of wall-clock timestamps
      // to avoid flaky failures from timer granularity on slow/loaded machines.
      let counter = 0;
      const events: Array<{ id: number; startOrder: number; endOrder: number }> = [];

      const makeTask = (id: number, duration: number) =>
        queue.enqueue(async () => {
          const startOrder = counter++;
          await sleep(duration);
          const endOrder = counter++;
          events.push({ id, startOrder, endOrder });
          return id;
        });

      await Promise.all([makeTask(1, 30), makeTask(2, 20), makeTask(3, 10)]);

      // Each task's start must come after the previous task's end
      for (let i = 1; i < events.length; i++) {
        expect(events[i].startOrder).toBeGreaterThan(events[i - 1].endOrder);
      }
    });
  });

  describe("error isolation", () => {
    it("error in one write does not block subsequent writes", async () => {
      const queue = new WriteQueue();
      const executionLog: string[] = [];

      const p1 = queue.enqueue(async () => {
        executionLog.push("before-error");
        throw new Error("Write failed");
      });

      const p2 = queue.enqueue(async () => {
        executionLog.push("after-error");
        return "recovered";
      });

      const p3 = queue.enqueue(async () => {
        executionLog.push("third");
        return "third-ok";
      });

      await expect(p1).rejects.toThrow("Write failed");
      expect(await p2).toBe("recovered");
      expect(await p3).toBe("third-ok");

      expect(executionLog).toEqual(["before-error", "after-error", "third"]);
    });

    it("multiple consecutive errors do not corrupt the queue", async () => {
      const queue = new WriteQueue();

      const p1 = queue.enqueue(async () => {
        throw new Error("fail-1");
      });

      const p2 = queue.enqueue(async () => {
        throw new Error("fail-2");
      });

      const p3 = queue.enqueue(async () => {
        return "success";
      });

      await expect(p1).rejects.toThrow("fail-1");
      await expect(p2).rejects.toThrow("fail-2");
      expect(await p3).toBe("success");
    });

    it("error preserves the correct rejection for each caller", async () => {
      const queue = new WriteQueue();

      const p1 = queue.enqueue(async () => {
        throw new Error("error-alpha");
      });

      const p2 = queue.enqueue(async () => {
        throw new Error("error-beta");
      });

      // Each promise should reject with its own specific error
      await expect(p1).rejects.toThrow("error-alpha");
      await expect(p2).rejects.toThrow("error-beta");
    });
  });

  describe("pending count accuracy", () => {
    it("reports correct pending count during execution", async () => {
      const queue = new WriteQueue();
      const pendingSnapshots: number[] = [];

      let resolveFirst!: () => void;
      const blocker = new Promise<void>((r) => {
        resolveFirst = r;
      });

      // First task will block
      const p1 = queue.enqueue(async () => {
        await blocker;
        return 1;
      });

      // Give drain loop time to pick up p1
      await sleep(10);

      // Enqueue more tasks while p1 is running
      const p2 = queue.enqueue(async () => {
        pendingSnapshots.push(queue.pending);
        return 2;
      });
      const p3 = queue.enqueue(async () => {
        pendingSnapshots.push(queue.pending);
        return 3;
      });
      const p4 = queue.enqueue(async () => {
        pendingSnapshots.push(queue.pending);
        return 4;
      });

      // While p1 is blocked, p2/p3/p4 are queued
      expect(queue.pending).toBe(3);

      // Release the blocker
      resolveFirst();
      await Promise.all([p1, p2, p3, p4]);

      // After drain, pending should be 0
      expect(queue.pending).toBe(0);

      // Each task should have seen decreasing pending count
      // p2 runs, sees p3+p4 pending = 2; p3 runs, sees p4 pending = 1; p4 runs, sees 0
      expect(pendingSnapshots).toEqual([2, 1, 0]);
    });

    it("pending count is 0 when queue is idle", () => {
      const queue = new WriteQueue();
      expect(queue.pending).toBe(0);
    });

    it("pending count returns to 0 after all writes complete", async () => {
      const queue = new WriteQueue();

      await Promise.all([
        queue.enqueue(async () => "a"),
        queue.enqueue(async () => "b"),
        queue.enqueue(async () => "c"),
      ]);

      expect(queue.pending).toBe(0);
    });

    it("pending count returns to 0 after errors", async () => {
      const queue = new WriteQueue();

      const p1 = queue.enqueue(async () => {
        throw new Error("oops");
      });
      const p2 = queue.enqueue(async () => "ok");

      await p1.catch(() => {}); // swallow
      await p2;

      expect(queue.pending).toBe(0);
    });
  });

  describe("result forwarding", () => {
    it("returns the correct result type for each enqueued operation", async () => {
      const queue = new WriteQueue();

      const stringResult = await queue.enqueue(async () => "hello");
      const numberResult = await queue.enqueue(async () => 42);
      const objectResult = await queue.enqueue(async () => ({ key: "value" }));
      const arrayResult = await queue.enqueue(async () => [1, 2, 3]);

      expect(stringResult).toBe("hello");
      expect(numberResult).toBe(42);
      expect(objectResult).toEqual({ key: "value" });
      expect(arrayResult).toEqual([1, 2, 3]);
    });

    it("concurrent enqueues resolve with their own results", async () => {
      const queue = new WriteQueue();

      const [r1, r2, r3] = await Promise.all([
        queue.enqueue(async () => {
          await sleep(20);
          return { id: 1, status: "created" };
        }),
        queue.enqueue(async () => {
          await sleep(10);
          return { id: 2, status: "updated" };
        }),
        queue.enqueue(async () => {
          return { id: 3, status: "deleted" };
        }),
      ]);

      expect(r1).toEqual({ id: 1, status: "created" });
      expect(r2).toEqual({ id: 2, status: "updated" });
      expect(r3).toEqual({ id: 3, status: "deleted" });
    });
  });
});
