/**
 * Serialized write queue — STPA H2: prevent self-racing.
 * All bd CLI writes go through this single queue so only one
 * CLI process runs at a time.
 */
export class WriteQueue {
  private queue: Array<() => Promise<void>> = [];
  private running = false;

  /**
   * Enqueue a write operation. Returns a promise that resolves
   * with the result when the operation completes.
   */
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      void this.drain();
    });
  }

  get pending(): number {
    return this.queue.length;
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
    }

    this.running = false;
  }
}
