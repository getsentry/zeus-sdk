/** Generic status for builds, jobs or artifacts. */
export enum Status {
  /** No status is known. */
  UNKNOWN = 'unknown',
  /** The entity is queued for execution or processing. */
  QUEUED = 'queued',
  /** The entity is currently being processed. */
  PROGRESS = 'in_progress',
  /** Execution has finished and processing is complete. */
  FINISHED = 'finished',
  /** Execution has finished, but results are still being collected. */
  COLLECTING = 'collecting_results',
  /** Only for artifacts: The artifact is no longer available for download. */
  EXPIRED = 'expired',
}

/** Result of a finished job or build. */
export enum Result {
  /** No result is known. */
  UNKNOWN = 'unknown',
  /** The job or build was aborted. */
  ABORTED = 'aborted',
  /** The job or build has passed successfully. */
  PASSED = 'passed',
  /** The job or build did not execute. */
  SKIPPED = 'skipped',
  /** The job or build exited with an unexpected error. */
  ERRORED = 'errored',
  /** The job or build failed (likely in tests). */
  FAILED = 'failed',
}

/** A build artifact uploaded to Zeus. */
export interface Artifact {
  /** Unique identifier of the artifact in Zeus. */
  id: string;
  /** File name used for downloading the file. */
  name: string;
  /** File mime type. Does not use valid IETF RFC 6838 types currently. */
  type: string;
  /** Fully qualified download URL for the artifact file. */
  download_url: string;
  /** Processing status of this artifact. */
  status: Status;
  /** ISO timestamp of the creation date. */
  created_at?: string;
  /** ISO timestamp of the last update. */
  updated_at?: string;
  /** ISO timestamp when processing has started. */
  started_at?: string;
  /** ISO timestamp when processing has finished. */
  finished_at?: string;
}

/** The author of a source or revision. */
export interface Author {
  /** Unique author identifier. */
  id: string;
  /** Display name of the author. */
  name: string;
  /** Optional email address. */
  email?: string;
}

/** Source revision that is the base for a build. */
export interface Revision {
  /** Unique revision identifier. */
  id: string;
  /** VCS revision identifier, usually a unique number or hash. */
  sha: string;
  /** The author's message attached to this revision. */
  message: string;
  /** Author of this revision. */
  author: Author;
  /** ISO timestamp when this revision was added to Zeus. */
  created_at: string;
  /** ISO timestamp when this revision was created by the author. */
  committed_at?: string;
}

/** A commit or patch that triggers a build. */
export interface Source {
  /** Unique source identifier. */
  id: string;
  /** The source revision (e.g. VCS commit). */
  revision: Revision;
  /** The author of this source. */
  author: Author;
  /** ISO timestamp when this source was added to Zeus. */
  created_at: string;
}

/** Aggregated revision information as returned by revisions API */
export interface RevisionInfo {
  /** Unique revision identifier. */
  id: string;
  /** Source information for the given revision. */
  source: Source;
  /** Revision status. */
  status: Status;
  /** Revision result. */
  result: Result;
  /** Human readable display label of the revision. */
  label: string;
  /** ISO timestamp when this source was added to Zeus. */
  created_at: string;
  /** ISO timestamp when the first build for the revision started. */
  started_at?: string;
  /** ISO timestamp when the last build for the revision finished. */
  finished_at?: string;
  /** Aggregate statistics of revision builds. */
  stats: Stats;
}

/** Code coverage statistics. */
export interface CoverageStats {
  /** The total number of source lines covered by tests. */
  lines_covered: number;
  /** The total number of source lines not covered by tests. */
  lines_uncovered: number;
  /** The number of changed source lines covered by tests. */
  diff_lines_covered: number;
  /** The number of changed source lines not covered by tests. */
  diff_lines_uncovered: number;
}

/** Test statistics. */
export interface TestStats {
  /** Total number of tests executed. */
  count: number;
  /** Total number of failed tests. */
  failures: number;
  /** Test duration in seconds. */
  duration: number;
  /** Deduplicated number of tests executed. */
  count_unique: number;
  /** Deduplicated number of failed tests. */
  failures_unique: number;
}

/** Source code style statistics. */
export interface StyleStats {
  /** Number of style violations in the code base. */
  count: number;
}

/** Webpack asset statistics. */
export interface WebpackStats {
  /** The aggregate size of all assets in bytes. */
  total_asset_size: number;
}

/** Build or Job statistics computed by processing artifacts. */
export interface Stats {
  coverage: CoverageStats;
  tests: TestStats;
  style_violations: StyleStats;
  webpack: WebpackStats;
}

/** A build on CI. */
export interface Build {
  /** Unique build identifier. */
  id: string;
  /** Build number assigned by Zeus, unique to this project. */
  number: number;
  /** Human readable display label of the build. */
  label: string;
  /** Identifier of the CI provider. */
  provider: string;
  /** The build identifier in the provider CI system. */
  external_id: string;
  /** Fully qualified URL to the build on the provider. */
  url: string;
  /** Build status. */
  status: Status;
  /** Build result. */
  result: Result;
  /** Reference to the code that has been built (VCS commit or patch). */
  source?: Source;
  /** Aggregate statistics of build results. */
  stats?: Stats;
  /** ISO timestamp when the build was created (queued). */
  created_at: string;
  /** ISO timestamp when the first job of the build started. */
  started_at?: string;
  /** ISO timestamp when all jobs of the build have finished. */
  finished_at?: string;
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

/** Details to a failed job. */
export interface Failure {
  /** Human readable failure description. */
  reason: string;
}

/** A job on CI. */
export interface Job {
  /** Unique job identifier */
  id: string;
  /** Job number assigned by Zeus, scoped to its build. */
  number: number;
  /** Human readable display label of the job. */
  label: string;
  /** Identifier of the CI provider. */
  provider: string;
  /** The job identifier in the provider CI system. */
  external_id: string;
  /** Fully qualified URL to the job on the provider. */
  url: string;
  /** Whether this job is allowed failure. */
  allow_failure: boolean;
  /** Job status. */
  status: Status;
  /** Job result. */
  result: Result;
  /** Aggregate statistics of job results. */
  stats?: Stats;
  /** Failure details if this job failed. */
  failures: Failure[];
  /** ISO timestamp when the job was created (queued). */
  created_at: string;
  /** ISO timestamp when the job was last updated created. */
  updated_at?: string;
  /** ISO timestamp when the job started executing. */
  started_at?: string;
  /** ISO timestamp when job has finished executing. */
  finished_at?: string;
}
