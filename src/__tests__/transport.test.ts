import { Response } from 'node-fetch';
import { request } from '../request';
import { DEFAULT_URL, FormField, Transport } from '../transport';
import { noop, noopLogger } from '../utils';

jest.mock('../request');

const requestMock: jest.Mock<typeof request> = request as any;
const defaultTransportOptions = {
  logger: noopLogger,
};

describe('Transport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestMock.mockReturnValue(
      Promise.resolve(new Response(JSON.stringify({ some: 'data' })))
    );

    // This causes some issues in Node 9.4.0 inside jest
    console.debug = noop;
  });

  describe('constructor', () => {
    const env = { ...process.env };

    afterEach(() => {
      process.env = { ...env };
    });

    test('initializes with the default URL', () => {
      const transport = new Transport(defaultTransportOptions);
      expect(transport.getUrl()).toBe(DEFAULT_URL);
    });

    test('reads from the ZEUS_URL environment variable', () => {
      const url = 'https://example.org/';
      process.env.ZEUS_URL = url;
      const transport = new Transport(defaultTransportOptions);
      expect(transport.getUrl()).toBe(url);
    });

    test('reads from the url option', () => {
      const url = 'https://example.org/';
      process.env.ZEUS_URL = 'invalid';
      const transport = new Transport({ ...defaultTransportOptions, url });
      expect(transport.getUrl()).toBe(url);
    });

    test('ensures a valid base URL', () => {
      const url = 'https://example.org/path';
      const transport = new Transport({ url });
      expect(transport.getUrl()).toBe(`${url}/`);
    });

    test('fails with an invalid URL', () => {
      const url = 'https://';
      expect(() => new Transport({ url })).toThrow(/valid URL/);
    });

    test('initializes with an empty token', () => {
      const transport = new Transport(defaultTransportOptions);
      expect(transport.getToken()).toBeUndefined();
    });

    test('reads from the ZEUS_TOKEN environment variable', () => {
      const token = 'zeus-u-1234567890';
      process.env.ZEUS_TOKEN = token;
      const transport = new Transport(defaultTransportOptions);
      expect(transport.getToken()).toBe(token);
    });

    test('reads from the token option', () => {
      const token = 'zeus-u-1234567890';
      process.env.ZEUS_TOKEN = 'invalid';
      const transport = new Transport({ ...defaultTransportOptions, token });
      expect(transport.getToken()).toBe(token);
    });
  });

  describe('request', () => {
    test('issues a request without options', async () => {
      const transport = new Transport(defaultTransportOptions);
      await transport.request('something');
      expect(requestMock).toMatchSnapshot();
    });

    test('resolves the response value', async () => {
      const transport = new Transport(defaultTransportOptions);
      const response = await transport.request('something');
      expect(response).toEqual({ some: 'data' });
    });

    test('accepts options', async () => {
      const options = { method: 'POST', body: '{"some":"data"}' };
      const transport = new Transport(defaultTransportOptions);
      await transport.request('something', options);
      expect(requestMock).toMatchSnapshot();
    });

    test('accepts absolute URLs', async () => {
      const transport = new Transport(defaultTransportOptions);
      await transport.request('http://example.org');
      expect(requestMock).toMatchSnapshot();
    });

    test('adds the Authorization token header', async () => {
      const headers = { Accept: 'application/json' };
      const token = 'zeus-u-1234567890';

      const transport = new Transport({ ...defaultTransportOptions, token });
      await transport.request('something', { headers });
      expect(requestMock).toMatchSnapshot();
    });

    test('accepts Authorization header overrides', async () => {
      const headers = { Authorization: 'custom' };
      const token = 'zeus-u-1234567890';

      const transport = new Transport({ ...defaultTransportOptions, token });
      await transport.request('something', { headers });
      expect(requestMock).toMatchSnapshot();
    });

    test('rejects invalid URLs', async () => {
      const transport = new Transport(defaultTransportOptions);
      try {
        await transport.request('///');
      } catch (e) {
        expect((e as Error).toString()).toMatch(/invalid url/i);
      }
    });

    test('resolves the parsed JSON result for status 200', async () => {
      const transport = new Transport(defaultTransportOptions);
      requestMock.mockImplementation(() => {
        const resp = new Response(JSON.stringify({ some: 'data' }));
        return Promise.resolve(resp);
      });

      const response = await transport.request('something');
      expect(response).toEqual({ some: 'data' });
    });

    test('resolves undefined for status 204', async () => {
      const transport = new Transport(defaultTransportOptions);

      requestMock.mockImplementation(
        async () =>
          new Response(JSON.stringify({ some: 'data' }), {
            status: 204,
          })
      );

      const response = await transport.request('something');
      expect(response).toBeUndefined();
    });
  });

  describe('requestJson', () => {
    let transport: Transport;

    beforeEach(() => {
      transport = new Transport(defaultTransportOptions);
    });

    test('serializes a JSON payload into the request', async () => {
      const options = {
        body: {
          a: [1, 2],
          b: 'c',
        },
        method: 'POST',
      };

      await transport.requestJson('something', options);
      expect(requestMock).toMatchSnapshot();
    });

    test('defaults to an empty body object', async () => {
      const options = {
        body: undefined,
        method: 'POST',
      };

      await transport.requestJson('something', options);
      expect(requestMock).toMatchSnapshot();
    });

    test('skips null and undefined keys', async () => {
      const options = {
        // tslint:disable-next-line:no-null-keyword
        body: { some: 'data', a: null, b: undefined },
        method: 'POST',
      };

      await transport.requestJson('something', options);
      expect(requestMock).toMatchSnapshot();
    });

    test('merges headers into the request', async () => {
      const options = {
        body: {
          a: [1, 2],
          b: 'c',
        },
        headers: {
          'X-Test': 'foo bar',
        },
        method: 'POST',
      };

      await transport.requestJson('something', options);
      expect(requestMock).toMatchSnapshot();
    });
  });

  describe('postForm', () => {
    let transport: Transport;

    beforeEach(() => {
      transport = new Transport(defaultTransportOptions);
    });

    test('calls request with a form data and correct headers', async () => {
      const data = { some: 'data' };
      await transport.postForm('something', data);
      expect(requestMock).toMatchSnapshot();
    });

    test('does not include null or undefined values', async () => {
      // tslint:disable-next-line:no-null-keyword
      const data = { some: 'data', a: null, b: undefined };
      await transport.postForm('something', data);
      expect(requestMock).toMatchSnapshot();
    });

    test('passes append options to FormData', async () => {
      const data = {
        some: ['data', { filename: 'other' }] as FormField,
      };

      await transport.postForm('something', data);
      expect(requestMock).toMatchSnapshot();
    });
  });
});
