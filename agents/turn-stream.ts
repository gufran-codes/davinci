import { ReadableStream } from "node:stream/web";

/** LiveKit must receive its stream before network work starts, so cancelling
 * inference can abort both the HTTP request and upstream model generation. */
export class VoiceTurnStreams {
  private active?: AbortController;
  private revision = 0;
  get epoch() { return this.revision; }
  cancel() {
    this.revision++;
    this.active?.abort();
    this.active = undefined;
  }
  create(
    run: (signal: AbortSignal, emit: (text: string) => void) => Promise<void>,
    onError: (error: unknown) => void,
  ) {
    this.cancel();
    const controller = new AbortController();
    this.active = controller;
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(60_000)]);
    let readerCancelled = false;
    return new ReadableStream<string>({
      start: (output) => {
        void run(signal, (text) => {
          signal.throwIfAborted();
          if (text) output.enqueue(text);
        }).catch((error) => {
          if (!controller.signal.aborted) onError(error);
        }).finally(() => {
          if (this.active === controller) this.active = undefined;
          if (!readerCancelled) output.close();
        });
      },
      cancel: () => { readerCancelled = true; controller.abort(); },
    });
  }
}
