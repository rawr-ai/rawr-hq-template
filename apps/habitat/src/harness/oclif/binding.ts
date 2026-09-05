import type { OclifCommandSource, OclifParsedInput } from "@habitat-ai/sdk/plugins/cli/oclif";
import type { ExecutionDescriptorRef } from "@habitat-ai/sdk/runtime/derivation";
import { Config, type Hook, type Interfaces } from "@oclif/core";

export type CliExecutionRef = Extract<ExecutionDescriptorRef, { boundary: "plugin.cli-command" }>;

export interface OclifRuntimeBinding {
  readonly presentation: boolean;
  invoke(
    ref: CliExecutionRef,
    source: OclifCommandSource,
    input: OclifParsedInput
  ): Promise<unknown>;
  onFinally(error: Error | undefined): void;
}

export type OclifLoadOptions = Interfaces.Options & {
  readonly habitatRuntime: OclifRuntimeBinding;
};

export function readOclifBinding(config: unknown): OclifRuntimeBinding {
  if (!(config instanceof Config) || !("habitatRuntime" in config.options)) {
    throw new TypeError("Native Oclif dispatch has no selected Habitat process binding.");
  }
  const value = config.options.habitatRuntime;
  if (
    typeof value !== "object" ||
    value === null ||
    !("invoke" in value) ||
    typeof value.invoke !== "function"
  ) {
    throw new TypeError("Native Oclif dispatch has an invalid Habitat process binding.");
  }
  return value as OclifRuntimeBinding;
}

/** Native finally owns completion evidence only; waiting for process stop here would deadlock. */
export const FINALLY_HOOK: Hook.Finally = async function ({ config, error }) {
  readOclifBinding(config).onFinally(error);
};

export function sameCliRef(left: CliExecutionRef, right: CliExecutionRef): boolean {
  return (
    left.kind === right.kind &&
    left.boundary === right.boundary &&
    left.executionId === right.executionId &&
    left.ownerId === right.ownerId &&
    left.commandId === right.commandId
  );
}
