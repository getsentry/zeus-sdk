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

  /**
   * Creates a new API client.
   *
   * @param options Optional configuration parameters for the client.
   */
  public constructor(options?: Options) {
    this.transport = new Transport(options);
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
}
