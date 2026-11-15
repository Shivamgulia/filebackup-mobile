import * as api from '../src/api';

jest.mock('expo-secure-store', () => {
  let stored: string | null = null;
  return {
    setItemAsync: jest.fn(async (_k: string, v: string) => {
      stored = v;
    }),
    getItemAsync: jest.fn(async () => stored),
    deleteItemAsync: jest.fn(async () => {
      stored = null;
    }),
  };
});

const fetchMock = jest.fn();
declare const global: any;
(global as any).fetch = fetchMock;

const ok = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
  text: async () => body,
});

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => ok({ token: 'token1' }));
});

describe('api login', () => {
  it('sends the typed username/password, not stale module state', async () => {
    await api.login('http://s', 'u', 'p');
    const loginCall = fetchMock.mock.calls[0];
    expect(loginCall[0]).toBe('http://s/api/auth/login');
    expect(JSON.parse(String(loginCall[1].body))).toEqual({ username: 'u', password: 'p' });
  });

  it('reports invalid credentials on 401', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(api.login('http://s', 'u', 'bad')).rejects.toThrow('Invalid username or password');
  });
});

describe('apiFetch', () => {
  it('retries once after a 401 by re-logging in', async () => {
    await api.login('http://s', 'u', 'p');
    fetchMock.mockClear();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce(ok({ token: 'token2' }))
      .mockResolvedValueOnce(ok('healthy'));

    const res = await api.apiFetch('/api/health');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('healthy');
    // 401 → re-login → retry
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://s/api/auth/login', expect.anything());
    const reloginBody = JSON.parse(String(fetchMock.mock.calls[1][1].body));
    expect(reloginBody).toEqual({ username: 'u', password: 'p' });
  });
});
