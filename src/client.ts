import { createWriteStream } from 'fs';
import { join } from 'path';
import { URL } from 'whatwg-url';
import { Artifact, Build, Job, JobStatus, Result, Status } from './models';
import { FormField, Options, Transport } from './transport';
import { getHookBase, sanitizeURL } from './utils';

/** Default URL of the Zeus server. */
export const DEFAULT_URL = 'https://zeus.ci/';

/** Options passed to `Client.uploadArtifact`. */
export interface UploadOptions {
  /** The build identifier. */
  build: string;
  /** The job identifier. */
  job: string;
  /** An artifact file to upload. */
  file: string | Buffer;
  /** Optional MIME type of the artifact file. */
  type?: string;
  /** Optional name of the artifcat file. */
  name?: string;
}

/** Options passed to `Client.createOrUpdateBuild`. */
export interface BuildOptions {
  /** The build identifier. */
  build: string;
  /** Display label for this build. If empty, Zeus will infer one. */
  buildLabel?: string;
  /** Fully qualified URL to the build on the CI system. */
  url?: string;
  /** Reference to the VCS commit triggering the build. */
  ref?: string;
}

/** Options passed to `Client.createOrUpdateJob`. */
export interface JobOptions {
  /** The job identifier. */
  job: string;
  /** The build identifier. */
  build: string;
  /** Display label for this job. If empty, Zeus will infer one. */
  jobLabel?: string;
  /** Job resolution status. */
  status?: JobStatus;
  /** Fully qualified URL to the job on the CI system. */
  url?: string;
  /** Reference to the VCS commit triggering the build. */
  ref?: string;
}

/**
 * Zeus API client.
 */
export class Client {
  /** Internal transport used to send requests to Zeus. */
  private readonly transport: Transport;
  public readonly owner: string;
  public readonly repo: string;
  public readonly downloadDirectory: string;

  /**
   * Creates a new API client.
   *
   * @param options Optional configuration parameters for the client.
   */
  public constructor(options: Options = {}) {
    this.transport = new Transport(options);
    this.owner = options.owner || '';
    this.repo = options.repo || '';
    this.downloadDirectory = options.downloadDirectory || '';
  }

  /**
   * Uploads one or more build artifacts for a given build job.
   *
   * @param options Parameters for the upload request.
   * @returns The parsed server response.
   */
  public async uploadArtifact(options: UploadOptions): Promise<Artifact> {
    const base = getHookBase();
    if (!options) {
      throw new Error('Missing upload options');
    } else if (!options.build) {
      throw new Error('Missing build identifier');
    } else if (!options.job) {
      throw new Error('Missing job identifier');
    } else if (!options.file) {
      throw new Error('Missing file parameter');
    }

    const url = new URL(
      `builds/${options.build}/jobs/${options.job}/artifacts`,
      sanitizeURL(base)
    ).toString();

    return this.transport.postForm<Artifact>(url, {
      file: [options.file, options.name] as FormField,
      type: options.type,
    });
  }

  /**
   * Creates or updates the remote build object.
   *
   * @param options Parameters for the build.
   * @returns The parsed server response.
   */
  public async createOrUpdateBuild(options: BuildOptions): Promise<Build> {
    const base = getHookBase();
    if (!options.build) {
      throw new Error('Missing build ID');
    }

    const url = new URL(
      `builds/${options.build}`,
      sanitizeURL(base)
    ).toString();

    return this.transport.requestJson<Build>(url, {
      body: {
        label: options.buildLabel,
        ref: options.ref,
        url: options.url,
      },
      method: 'POST',
    });
  }

  /**
   * Creates or updates the remote job object.
   *
   * @param options Parameters for the job.
   * @returns The parsed server response.
   */
  public async createOrUpdateJob(options: JobOptions): Promise<Job> {
    const base = getHookBase();
    if (!options.job) {
      throw new Error('Missing job ID');
    }

    // Deal with statuses. Zeus has knowledge about both 'result' and
    // 'status' for every job, but to make it easier for end user we'll
    // allow to specify only a handful of unified 'statuses'.
    let status: string | undefined;
    let result: string | undefined;

    switch (options.status) {
      case JobStatus.PENDING:
        status = Status.PROGRESS;
        result = Result.UNKNOWN;
        break;
      case JobStatus.PASSED:
        status = Status.FINISHED;
        result = Result.PASSED;
        break;
      case JobStatus.FAILED:
        status = Status.FINISHED;
        result = Result.FAILED;
        break;
      case undefined:
        break;
      default:
        throw new Error(`Invalid job status: "${options.status}"`);
    }

    const url = new URL(
      `builds/${options.build}/jobs/${options.job}`,
      sanitizeURL(base)
    ).toString();

    return this.transport.requestJson<Job>(url, {
      body: {
        label: options.jobLabel,
        ref: options.ref,
        result,
        status,
        url: options.url,
      },
      method: 'POST',
    });
  }

  /**
   * Computes the absolute URL of an endpoint specified by the given path.
   *
   * @param path Path to an endpoint.
   * @returns The absolute URL to the endpoint.
   */
  public getUrl(path: string = ''): string {
    return this.transport.getUrl(path);
  }

  /**
   * Downloads a file from the store
   *
   * The file is placed in the download directory. If the file does not exist,
   * an error is thrown.
   *
   * @param file A file object to download
   * @returns Absolute path to the local copy of the file
   * @async
   */
  public async downloadArtifact(file: Artifact): Promise<string> {
    if (!this.downloadDirectory) {
      throw new Error('Download directory not specified');
    }

    const url = this.getUrl(file.download_url);
    const localFile = join(this.downloadDirectory, file.name);
    const fileResponse = await this.transport.requestRaw(url);
    return new Promise<string>((resolve, reject) => {
      const dest = createWriteStream(localFile);
      fileResponse.body.pipe(dest);
      fileResponse.body.on('error', err => {
        reject(err);
      });
      dest.on('finish', () => {
        resolve(localFile);
      });
      dest.on('error', err => {
        reject(err);
      });
    });
  }

  /**
   * Downloads a list of files from the store
   *
   * The files are placed in the download directory. If one of the files
   * does not exist, an error is thrown. Use {@link listFilesForRevision},
   * {@link listFilesForJob}, and {@link listFilesForBuild} to retrieve
   * available files.
   *
   * @param files A list of files to download
   * @returns Absolute paths to local copies of all files
   * @async
   */
  public async downloadFiles(files: Artifact[]): Promise<string[]> {
    return Promise.all(files.map(file => this.downloadArtifact(file)));
  }

  /**
   * Retrieves a list of files stored for the commit
   *
   * @returns A list of file objects
   * @async
   */
  public async listFilesForRevision(sha: string): Promise<Artifact[]> {
    const url = `/api/repos/gh/${this.owner}/${
      this.repo
    }/revisions/${sha}/artifacts`;
    return this.transport.request<Artifact[]>(url);
  }

  /**
   * Retrieves a list of files stored for the build
   *
   * @returns A list of file objects
   * @async
   */
  public async listFilesForBuild(buildNumber: number): Promise<Artifact[]> {
    const url = `/api/repos/gh/${this.owner}/${
      this.repo
    }/builds/${buildNumber}/artifacts`;
    return this.transport.request<Artifact[]>(url);
  }

  /**
   * Retrieves a list of files stored for the job
   *
   * @returns A list of file objects
   * @async
   */
  public async listFilesForJob(
    buildNumber: number,
    jobNumber: number
  ): Promise<Artifact[]> {
    const url = `/api/repos/gh/${this.owner}/${
      this.repo
    }/builds/${buildNumber}/jobs/${jobNumber}/artifacts`;
    return this.transport.request<Artifact[]>(url);
  }

  /**
   * Downloads all files stored for the revision
   *
   * Retrieves the full list of artifacts from Zeus and stores them in the
   * download directory.
   *
   * @returns Absolute paths to local copies of all files
   * @async
   */
  public async downloadAllForRevision(sha: string): Promise<string[]> {
    const files = await this.listFilesForRevision(sha);
    return this.downloadFiles(files);
  }

  /**
   * Downloads all files stored for the build
   *
   * Retrieves the full list of artifacts from Zeus for the given build and
   * stores them in the download directory.
   *
   * @returns Absolute paths to local copies of all files
   * @async
   */
  public async downloadAllForBuild(buildNumber: number): Promise<string[]> {
    const files = await this.listFilesForBuild(buildNumber);
    return this.downloadFiles(files);
  }

  /**
   * Downloads all files stored for the job
   *
   * Retrieves the full list of artifacts from Zeus for the given job and
   * stores them in the download directory.
   *
   * @returns Absolute paths to local copies of all files
   * @async
   */
  public async downloadAllForJob(
    buildNumber: number,
    jobNumber: number
  ): Promise<string[]> {
    const files = await this.listFilesForJob(buildNumber, jobNumber);
    return this.downloadFiles(files);
  }
}
