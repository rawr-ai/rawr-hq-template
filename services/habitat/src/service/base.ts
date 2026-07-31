import type { RuleEvaluationResource } from "@habitat/resource-rule-evaluation";
import type { FileSystem, Path } from "effect";

type EmptyContextLane = Readonly<Record<PropertyKey, never>>;

/** Host and invocation lanes admitted by the Habitat catalog boundary. */
export type Context = {
  readonly deps: {
    readonly fileSystem: FileSystem.FileSystem;
    readonly path: Path.Path;
    readonly ruleEvaluation: RuleEvaluationResource<never>;
  };
  readonly scope: {
    readonly workspaceRoot: string;
  };
  readonly config: EmptyContextLane;
  readonly invocation: EmptyContextLane;
  readonly provided: EmptyContextLane;
};
