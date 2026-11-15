const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

/** Runs `fn` with exponential backoff (1s, 2s, …). Sleep is injectable for tests. */
export async function withRetries<T>(
  fn: (attempt: number) => Promise<T>,
  opts: { attempts?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const doSleep = opts.sleep ?? sleep;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      if (attempt >= attempts) throw e;
      await doSleep(1000 * 2 ** (attempt - 1));
    }
  }
}
