/** Delivery receipts affect the next turn's context; telemetry never does.
 * Keep both ordered, but with independent queues and a bounded metric backlog. */
export class VoicePersistence {
  private receipts: Promise<unknown> = Promise.resolve();
  private metrics: Promise<unknown> = Promise.resolve();
  private pendingMetrics = 0;

  constructor(
    private onError: (kind: "receipt" | "metric", error: unknown) => void,
  ) {}

  receipt(work: () => Promise<unknown>) {
    this.receipts = this.receipts
      .then(work)
      .catch((error) => this.onError("receipt", error));
  }

  metric(work: () => Promise<unknown>) {
    if (this.pendingMetrics >= 32) return;
    this.pendingMetrics++;
    this.metrics = this.metrics
      .then(work)
      .catch((error) => this.onError("metric", error))
      .finally(() => {
        this.pendingMetrics--;
      });
  }

  beforeTurn() {
    return this.receipts;
  }
}
