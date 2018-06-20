import { existsSync, lstatSync } from 'fs';
import { Transport } from '../__mocks__/transport';
import { Artifact, JobStatus, Status } from '../models';

// Mock the transport module and make sure we've imported the same instance.
// The name must start with "mock", to bypass jest's module factory protection.
const mockTransport = Transport;
jest.mock('../transport', () => ({ Transport: mockTransport }));
jest.mock('fs');

import { BuildOptions, Client, JobOptions, UploadOptions } from '../client';

const existsSyncMock = existsSync as jest.Mock<typeof existsSync>;
const lstatSyncMock = lstatSync as jest.Mock<typeof lstatSync>;

describe('Client', () => {
  const env = { ...process.env };
  let client: Client;

  beforeEach(() => {
    process.env.ZEUS_HOOK_BASE = 'https://example.org/hooks/feedbeef/';
    client = new Client();
  });

  afterEach(() => {
    process.env = { ...env };
  });

  describe('uploadArtifact', () => {
    let params: UploadOptions;

    beforeEach(() => {
      params = {
        build: '12345',
        file: 'FILE_DATA',
        job: '54321',
      };
    });

    test('uploads a file without explicit type', async () => {
      await client.uploadArtifact(params);
      expect(mockTransport.instance.postForm).toMatchSnapshot();
    });

    test('uploads a file with explicit type', async () => {
      params.type = 'text/plain';
      await client.uploadArtifact(params);
      expect(mockTransport.instance.postForm).toMatchSnapshot();
    });

    test('uploads a file with explicit name', async () => {
      params.name = 'renamed.json';
      await client.uploadArtifact(params);
      expect(mockTransport.instance.postForm).toMatchSnapshot();
    });

    test('accepts ZEUS_HOOK_BASE without trailing slash', async () => {
      process.env.ZEUS_HOOK_BASE = 'https://example.org/hooks/feedbeef';
      await client.uploadArtifact(params);
      expect(mockTransport.instance.postForm).toMatchSnapshot();
    });

    test('resolves the server response', async () => {
      const data = { id: 4711, download_url: '/foo/bar' };
      mockTransport.instance.postForm.mockReturnValue(Promise.resolve(data));
      const response = await client.uploadArtifact(params);
      expect(response).toEqual(data);
    });

    test('rejects without parameters', async () => {
      try {
        await client.uploadArtifact(undefined as any);
      } catch (e) {
        // This should probably become an error message at some point
        expect((e as Error).toString()).toMatch(/options/i);
      }
    });

    test('rejects without ZEUS_HOOK_BASE', async () => {
      delete process.env.ZEUS_HOOK_BASE;
      try {
        await client.uploadArtifact(params);
      } catch (e) {
        expect((e as Error).toString()).toMatch('ZEUS_HOOK_BASE');
      }
    });

    test('rejects an invalid ZEUS_HOOK_BASE', async () => {
      process.env.ZEUS_HOOK_BASE = '///';
      try {
        await client.uploadArtifact(params);
      } catch (e) {
        expect((e as Error).toString()).toMatch(/invalid url/i);
      }
    });

    test('rejects without the build parameter', async () => {
      delete params.build;
      try {
        await client.uploadArtifact(params);
      } catch (e) {
        expect((e as Error).toString()).toMatch(/build/i);
      }
    });

    test('rejects without the job parameter', async () => {
      delete params.job;
      try {
        await client.uploadArtifact(params);
      } catch (e) {
        expect((e as Error).toString()).toMatch(/job/i);
      }
    });

    test('rejects without the file parameter', async () => {
      delete params.file;
      try {
        await client.uploadArtifact(params);
      } catch (e) {
        expect((e as Error).toString()).toMatch(/file/i);
      }
    });
  });

  describe('createOrUpdateBuild', () => {
    let params: BuildOptions;

    beforeEach(() => {
      params = {
        build: '1234',
        url: 'https://ci/build/1234',
      };
    });

    test('resolves the server response', async () => {
      const data = { id: '1234' };
      mockTransport.instance.requestJson.mockReturnValue(data);
      const response = await client.createOrUpdateBuild(params);
      expect(response).toEqual(data);
    });

    test('rejects without the build parameter', async () => {
      delete params.build;
      try {
        await client.createOrUpdateBuild(params);
      } catch (e) {
        expect((e as Error).toString()).toMatch(/build id/i);
      }
    });

    test('rejects without ZEUS_HOOK_BASE', async () => {
      delete process.env.ZEUS_HOOK_BASE;
      try {
        await client.createOrUpdateBuild(params);
      } catch (e) {
        expect((e as Error).toString()).toMatch('ZEUS_HOOK_BASE');
      }
    });

    test('passes build label properly', async () => {
      params.buildLabel = 'new build label';
      await client.createOrUpdateBuild(params);
      expect(mockTransport.instance.requestJson).toMatchSnapshot();
    });

    test('strips invalid build attributes', async () => {
      const options = { ...params, invalidAttribute: 'test' };
      await client.createOrUpdateBuild(options);
      expect(mockTransport.instance.requestJson).toMatchSnapshot();
    });
  });

  describe('createOrUpdateJob', () => {
    let params: JobOptions;

    beforeEach(() => {
      params = {
        build: '1234',
        job: '2345',
        url: 'https://ci/build/1234',
      };
    });

    test('resolves the server response', async () => {
      const data = { id: '1234' };
      mockTransport.instance.requestJson.mockReturnValue(data);
      const response = await client.createOrUpdateJob(params);
      expect(response).toEqual(data);
    });

    test('rejects without ZEUS_HOOK_BASE', async () => {
      delete process.env.ZEUS_HOOK_BASE;
      try {
        await client.createOrUpdateJob(params);
      } catch (e) {
        expect((e as Error).toString()).toMatch('ZEUS_HOOK_BASE');
      }
    });

    test('rejects an invalid ZEUS_HOOK_BASE', async () => {
      process.env.ZEUS_HOOK_BASE = '///';
      try {
        await client.createOrUpdateJob(params);
      } catch (e) {
        expect((e as Error).toString()).toMatch(/invalid url/i);
      }
    });

    test('rejects without the job parameter', async () => {
      delete params.job;
      try {
        await client.createOrUpdateJob(params);
      } catch (e) {
        expect((e as Error).toString()).toMatch(/job id/i);
      }
    });

    test('rejects with invalid job status', async () => {
      params.status = 'invalid-status' as JobStatus;
      try {
        await client.createOrUpdateJob(params);
      } catch (e) {
        expect((e as Error).toString()).toMatch(params.status);
      }
    });

    test('sets the "pending" status', async () => {
      params.status = JobStatus.PENDING;
      await client.createOrUpdateJob(params);
      expect(mockTransport.instance.requestJson).toMatchSnapshot();
    });

    test('sets the "passed" status', async () => {
      params.status = JobStatus.PASSED;
      await client.createOrUpdateJob(params);
      expect(mockTransport.instance.requestJson).toMatchSnapshot();
    });

    test('sets the "failed" status', async () => {
      params.status = JobStatus.FAILED;
      await client.createOrUpdateJob(params);
      expect(mockTransport.instance.requestJson).toMatchSnapshot();
    });

    test('passes job label properly', async () => {
      params.jobLabel = 'new job label';
      await client.createOrUpdateJob(params);
      expect(mockTransport.instance.requestJson).toMatchSnapshot();
    });

    test('strips invalid job attributes', async () => {
      (params as any).invalidAttribute = 'test';
      await client.createOrUpdateJob(params);
      expect(mockTransport.instance.requestJson).toMatchSnapshot();
    });
  });

  describe('getUrl', () => {
    test('calls getUrl from transport', async () => {
      const path = '/build/test';
      client.getUrl(path);
      expect(mockTransport.instance.getUrl).toBeCalledWith(path);
    });
  });

  describe('listFiles', () => {
    const owner = 'getsentry';
    const repo = 'craft';
    beforeEach(() => {
      client = new Client({ owner, repo });
    });

    test('listFilesForRevision calls correct URL', async () => {
      const sha = '8c99609eeed9dc3297728411b9306e2c3786e127';
      const expectedUrl = `/api/repos/gh/getsentry/craft/revisions/${sha}/artifacts`;
      await client.listArtifactsForRevision(owner, repo, sha);
      expect(mockTransport.instance.request).toBeCalledWith(expectedUrl);
    });

    test('listFilesForBuild calls correct URL', async () => {
      const buildNumber = 123;
      const expectedUrl = `/api/repos/gh/getsentry/craft/builds/${buildNumber}/artifacts`;
      await client.listArtifactsForBuild(owner, repo, buildNumber);
      expect(mockTransport.instance.request).toBeCalledWith(expectedUrl);
    });

    test('listFilesForJob calls correct URL', async () => {
      const buildNumber = 123;
      const jobNumber = 234;
      const expectedUrl = `/api/repos/gh/getsentry/craft/builds/${buildNumber}/jobs/${jobNumber}/artifacts`;
      await client.listArtifactsForJob(owner, repo, buildNumber, jobNumber);
      expect(mockTransport.instance.request).toBeCalledWith(expectedUrl);
    });
  });

  describe('downloadArtifact', () => {
    const defaultDirectory = '/downloads';
    const fileName = 'file.txt';
    const artifact: Artifact = {
      download_url: 'http://zeus/download/file.txt',
      id: '123',
      name: fileName,
      status: Status.UNKNOWN,
      type: 'text/plain',
    };
    beforeEach(() => {
      client = new Client({ defaultDirectory });
    });

    test('saves artifact to a file', async () => {
      expect.assertions(1);
      mockTransport.instance.requestRaw.mockImplementation(() => ({
        body: {
          on: jest.fn(),
          pipe: jest.fn(),
        },
      }));

      // tslint:disable-next-line
      existsSyncMock.mockReturnValue(true);
      lstatSyncMock.mockReturnValue({ isDirectory: () => true });

      const filePath = await client.downloadArtifact(artifact);

      expect(filePath).toBe(`${defaultDirectory}/${fileName}`);
    });

    test('returns error if downloadDirectory is not provided', async () => {
      expect.assertions(1);
      client = new Client();
      expect(client.downloadArtifact(artifact)).rejects.toThrowError(
        /directory not specified/i
      );
    });
  });
});
