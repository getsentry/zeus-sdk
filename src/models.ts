/** A build artifact uploaded to Zeus. */
export interface Artifact {
  /** Download URL for the artifact file. */
  download_url: string;
}

/** A build on CI. */
export interface Build {
  id: string;
}

/** The status of a job or build on Zeus. */
export enum JobStatus {
  /** The job or build is still running. */
  PENDING = 'pending',
  /** The job or build has succeeded. */
  PASSED = 'passed',
  /** The job or build has failed. */
  FAILED = 'failed',
}

/** A job on CI. */
export interface Job {
  id: string;
}
