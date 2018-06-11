import fetch from 'node-fetch';
import { request } from '../request';

const fetchMock = fetch as jest.Mock<typeof fetch>;

function mockPromise<T>(value?: T, reason?: string): Promise<T> {
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      reason ? reject(reason) : resolve(value);
    });
  });
}

function mockFetch<T>(
  status: number,
  json: () => Promise<T>,
  statusText?: string
): void {
  const ok = status >= 200 && status <= 300;
  fetchMock.mockReturnValue(mockPromise({ status, ok, json, statusText }));
}

describe('request', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  test('passes all parameters to fetch', async () => {
    mockFetch(200, mockPromise);
    await request('http://example.org', {
      headers: { Authorization: 'bearer yo!' },
      method: 'POST',
    });

    expect(fetchMock).toMatchSnapshot();
  });

  test('allows Accept header overrides', async () => {
    mockFetch(200, mockPromise);
    await request('http://example.org', {
      headers: { Accept: 'text/html' },
    });

    expect(fetchMock).toMatchSnapshot();
  });

  test('resolves the parsed JSON result for status 200', async () => {
    mockFetch(200, () => mockPromise({ foo: 'bar' }));
    const response = await request('http://example.org');
    expect(response).toEqual({ foo: 'bar' });
  });

  test('resolves undefined for status 204', async () => {
    mockFetch(204, () => {
      throw new Error('should not be called');
    });

    const response = await request('http://example.org');
    expect(response).toBeUndefined();
  });

  test('throws an error containing the status text', async () => {
    mockFetch(400, () => mockPromise(undefined, 'empty'), 'BAD REQUEST');

    try {
      await request('http://example.org');
    } catch (e) {
      expect(e.toString()).toMatch('400 BAD REQUEST');
    }
  });

  test('throws an error containing the resolved error message', async () => {
    const message = 'Error message';
    mockFetch(400, () => mockPromise({ message }));

    try {
      await request('http://example.org');
    } catch (e) {
      expect(e.toString()).toMatch(message);
    }
  });

  test('falls back to the status text when parsing errors', async () => {
    mockFetch(400, () => mockPromise({}), 'BAD REQUEST');

    try {
      await request('http://example.org');
    } catch (e) {
      expect(e.toString()).toMatch('400 BAD REQUEST');
    }
  });
});
