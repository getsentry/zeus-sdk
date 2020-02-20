import FormData = require('form-data');
import { Response } from 'node-fetch';
import * as util from 'util';
import { URL } from 'whatwg-url';
import { request, RequestOptions } from './request';
import { noop, sanitizeURL } from './utils';

/** Default URL of the Zeus server. */
export const DEFAULT_URL = 'https://zeus.ci/';

/** A console logger. */
export interface Logger {
  /** Logs a message with default level. */
  log(...args: any[]): void;
  /** Logs an error message. */
  error(...args: any[]): void;
  /** Logs a warning message. */
  warn(...args: any[]): void;
  /** Logs an info message. */
  info(...args: any[]): void;
  /** Logs a debug message. */
  debug?(...args: any[]): void;
}

/** Options possed to the Zeus client constructor. */
export interface Options {
  /** The URL to the Zeus server. Defaults to https://zeus.ci. */
  url?: string;
  /** Authentication token for the API. */
  token?: string;
  /** A logger with the same interface like console. */
  logger?: Logger;
}

/** Options used in `Transport.requestJson`. */
export type JsonRequestOptions = {
  [P in keyof RequestOptions]: P extends 'body'
    ? Record<string, any>
    : RequestOptions[P]
};

/** Allowed value types for form fields. */
export type FormValue = string | number | Buffer;

/** A form field specification for `Transport.postForm`. */
export type FormField = FormValue | [FormValue, FormData.AppendOptions];

/** Form fields used in `Transport.postForm`. */
export interface FormFields {
  [key: string]: FormField | null | undefined;
}

/** Internal helper class used to send requests to Zeus. */
export class Transport {
  /** The URL to the Zeus server. Defaults to https://zeus.ci. */
  private readonly url: string;
  /** Authentication token for the API. */
  private readonly token: string | undefined;
  /** A logger with the same interface like console. */
  private readonly logger: Logger;

  /**
   * Creates a new API client.
   *
   * @param options Optional parameters for the client.
   */
  public constructor(options: Options = {}) {
    this.url = sanitizeURL(options.url || process.env.ZEUS_URL || DEFAULT_URL);
    this.token = options.token || process.env.ZEUS_TOKEN || undefined;
    this.logger = options.logger || {
      error: noop,
      info: noop,
      log: noop,
      warn: noop,
    };

    if (!this.logger.debug) {
      this.logger.debug = noop;
    }
  }

  /**
   * Computes the absolute URL of an endpoint specified by the given path.
   *
   * @param path Path to an endpoint.
   * @returns The absolute URL to the endpoint.
   */
  public getUrl(path: string = ''): string {
    return new URL(path, this.url).toString();
  }

  /** Returns the token used to authenticate with Zeus. */
  public getToken(): string | undefined {
    return this.token;
  }

  /**
   * Performs an API request to the given path.
   *
   * The request is performed relative to the configured url, unless the path is
   * a fully qualified URL with protocol and host. In that case, the request is
   * performed to the path as is.
   *
   * If configured, the authorization token is added to the request headers. It
   * can be overriden by passing a value for the "Authorization" header.
   *
   * On success, the raw result is passed into the promise
   *
   * @param path The endpoint of the API call.
   * @param options Options to the `fetch` call.
   * @returns A Promise to the parsed response body.
   */
  public async requestRaw(
    path: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    const headers: Record<string, string> = { ...options.headers };
    const token = this.getToken();
    if (token !== undefined && !headers.Authorization) {
      headers.Authorization = `Bearer ${token.toLowerCase()}`;
    }

    const url = this.getUrl(path);
    return request(url, { ...options, headers }, this.logger);
  }

  /**
   * Performs an API request and converts the response to JSON.
   *
   * If configured, the authorization token is added to the request headers. It
   * can be overriden by passing a value for the "Authorization" header.
   *
   * On success, the parsed JSON result is passed into the promise. In case the
   * request fails or returns with a status code outside of the 200
   * range, an error is thrown with the response message field or status text.
   *
   * @param path The endpoint of the API call.
   * @param options Options to the `fetch` call.
   * @returns A Promise to the parsed response body.
   */
  public async request<T>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
    };

    const response = await this.requestRaw(path, { ...options, headers });
    return response.status === 204 ? undefined : response.json();
  }

  /**
   * Convert body to JSON and performs an API request to the given path.
   *
   * Null/undefined values in request body are stripped, and then the body
   * is serialized to JSON.
   *
   * @param path The endpoint of the API call.
   * @param options Options to the `fetch` call.
   * @returns A Promise to the parsed response body.
   */
  public async requestJson<T>(
    path: string,
    options: JsonRequestOptions = {}
  ): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Clear null values from body
    const body: Record<string, any> = { ...options.body };
    Object.keys(body).forEach(key => {
      if (body[key] === null || body[key] === undefined) {
        delete body[key]; // tslint:disable-line:no-dynamic-delete
      }
    });

    return this.request<T>(path, {
      ...options,
      body: JSON.stringify(body),
      headers,
    });
  }

  /**
   * Posts the given form the the specified endpoint.
   *
   * This prevents requests with chunked transfer encoding by specifying
   * Content-Length of the body explicitly. This might lead to higher resource
   * consumption while sending the request, but works around servers that do not
   * support chunked requests.
   *
   * TODO: Once Zeus server has been updated to support chunked requests, this
   * method should be removed again.
   *
   * @param path The endpoint of the API call.
   * @param data Key value pairs to be posted to the server.
   * @returns The parsed server response.
   */
  public async postForm<T>(path: string, data: FormFields): Promise<T> {
    const form = new FormData();
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        // tslint:disable-next-line:deprecation
        if (util.isArray(value)) {
          form.append(key, value[0], value[1]);
        } else {
          form.append(key, value);
        }
      }
    });

    const length = await new Promise<number>((resolve, reject) => {
      form.getLength((e, len) => {
        if (e) {
          reject(e);
        } else {
          resolve(len);
        }
      });
    });

    const headers = {
      ...form.getHeaders(),
      'Content-Length': `${length}`,
    };

    return this.request<T>(path, {
      body: form,
      headers,
      method: 'POST',
    });
  }
}
