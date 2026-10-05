/**
 * Creates a signal for a request that should stop after a time limit, or
 * sooner if the caller cancels it.
 * @param {number} timeoutMs - The time limit in milliseconds.
 * @param {AbortSignal} [signal] - The caller's signal, if it can cancel the request.
 * @returns The signal to pass to fetch, and a function to call once the request has settled.
 */
export const createRequestSignal = (timeoutMs: number, signal?: AbortSignal) => {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, timeoutMs);

  if (signal?.aborted) {
    abort();
  } else {
    signal?.addEventListener("abort", abort);
  }

  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    },
  };
};

/**
 * Checks whether an error is a cancelled request rather than a failure.
 */
export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";
