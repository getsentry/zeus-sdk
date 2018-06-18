import fetch, { RequestInit, Response } from 'node-fetch';

/**
 * Request options.
 *
 * As opposed to the default fetch options, this interface only permits headers
 * to be passed as object. This is needed as headers are preprocessed by the
 * request utility.
 */
export type RequestOptions = {
  [P in keyof RequestInit]: P extends 'headers'
    ? Record<string, string>
    : RequestInit[P]
};

export { Response };

/**
 * Parses an error message from the given response.
 *
 * First, this function tries to parse an error message from the response body.
 * If this does not work, it falls back to the HTTP status text.
 *
 * @param response A fetch Response object.
 * @returns A promise that resolves the error.
 */
async function parseError(response: Response): Promise<Error> {
  try {
    const { message } = (await response.json()) as { message?: string };
    return new Error(message || `${response.status} ${response.statusText}`);
  } catch (e) {
    return new Error(`${response.status} ${response.statusText}`);
  }
}

/**
 * Performs an AJAX request to the given url with the specified options using
 * fetch.
 *
 * After the request has finished, the result is parsed and checked for errors.
 * In case of an error, the response message is thrown as an error. On success,
 * the response object is passed into the promise.
 *
 * @param url The destination of the AJAX call.
 * @param options Options to the fetch call.
 * @returns A Promise to the parsed response body.
 */
export async function request(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw await parseError(response);
  }
  return response;
}
