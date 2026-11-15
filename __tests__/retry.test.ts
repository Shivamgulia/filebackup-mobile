import { withRetries } from '../src/retry';

describe('withRetries', () => {
  const instantSleep = () => Promise.resolve();

  it('succeeds after transient failures and retries with backoff', async () => {
    const delays: number[] = [];
    const sleep = async (ms: number) => {
      delays.push(ms);
    };

    let calls = 0;
    const result = await withRetries(
      async () => {
        calls++;
        if (calls < 3) throw new Error('boom');
        return 'ok';
      },
      { attempts: 3, sleep },
    );

    expect(result).toBe('ok');
    expect(calls).toBe(3);
    expect(delays).toEqual([1000, 2000]); // exponential backoff
  });

  it('gives up after the attempt limit and rethrows the last error', async () => {
    let calls = 0;
    await expect(
      withRetries(
        async () => {
          calls++;
          throw new Error(`fail-${calls}`);
        },
        { attempts: 2, sleep: instantSleep },
      ),
    ).rejects.toThrow('fail-2');
    expect(calls).toBe(2);
  });

  it('does not sleep when the first attempt succeeds', async () => {
    let slept = 0;
    const result = await withRetries(async () => 'ok', {
      attempts: 3,
      sleep: async () => {
        slept++;
      },
    });
    expect(result).toBe('ok');
    expect(slept).toBe(0);
  });
});
