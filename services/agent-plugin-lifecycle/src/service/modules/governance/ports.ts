import type { ExactGitReader } from "./ports/index";

export interface GovernanceLifecycleRuntime {
  readonly git: ExactGitReader;
}

export type {
  ExactGitReader,
  GitBlobReadResult,
  GitBooleanReadResult,
  GitReadFailure,
  GitReadFailureCode,
  RepositoryInspection,
} from "./ports/index";

export type * from "./model/dto/git";
export type * from "./model/dto/primitives";
