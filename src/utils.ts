import { URL } from 'whatwg-url';
import { Logger } from './transport';

/** Noop operation. */
export function noop(): void {
  // noop
}

export const noopLogger: Logger = {
  error: noop,
  info: noop,
  log: noop,
  warn: noop,
};

/**
 * Validates the given URL and makes sure it ends with a trailing slash.
 *
 * If the URL is not valid, an Error with details is thrown.
 *
 * @param url A fully qualified URL to sanitize.
 * @returns The sanitized URL.
 */
export function sanitizeURL(url: string): string {
  let sanitized = new URL(url).toString();

  if (!sanitized.endsWith('/')) {
    sanitized += '/';
  }

  return sanitized;
}

/**
 * Extracts ZEUS_HOOK_BASE URL from the environment or raises an error.
 *
 * @returns The Zeus hook base.
 */
export function getHookBase(): string {
  const base = process.env.ZEUS_HOOK_BASE;
  if (!base) {
    throw new Error('Missing ZEUS_HOOK_BASE environment variable');
  }
  return base;
}
