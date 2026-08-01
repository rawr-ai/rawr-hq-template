import type { RuleEvaluationResource } from "@habitat-ai/resource-rule-evaluation";
import type { SourceInventoryResource } from "@habitat-ai/resource-source-inventory";
import type { FileSystem, Path } from "effect";

type EmptyContextLane = Readonly<Record<PropertyKey, never>>;

/** One app-selected policy-pack installation admitted by the service. */
export type SelectedPolicyPack = {
  readonly name: string;
  readonly packageJsonPath: string;
  readonly manifestPath: string;
};

/** Host and invocation lanes admitted by the Habitat catalog boundary. */
export type Context = {
  readonly deps: {
    readonly fileSystem: FileSystem.FileSystem;
    readonly path: Path.Path;
    readonly ruleEvaluation: RuleEvaluationResource<never>;
    readonly sourceInventory: SourceInventoryResource<never>;
  };
  readonly scope: {
    readonly workspaceRoot: string;
  };
  readonly config: {
    readonly policyPack: SelectedPolicyPack;
  };
  readonly invocation: EmptyContextLane;
  readonly provided: EmptyContextLane;
};
