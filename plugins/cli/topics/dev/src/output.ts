import type { Contract } from "@habitat-ai/dev-service/client";
import type { Command } from "@oclif/core";
import type { InferRouterContractOutputs } from "@orpc/contract";

type Results = InferRouterContractOutputs<Contract>;
type ByOperation = {
  "repo.syncUpstream": Results["repo"]["syncUpstream"];
  "stack.doctor": Results["stack"]["doctor"];
  "stack.drain": Results["stack"]["drain"];
  "worktree.cleanup": Results["worktree"]["cleanup"];
};

/** One exact service outcome with command-local presentation controls. */
export type DevOutcome = {
  [K in keyof ByOperation]: {
    readonly operation: K;
    readonly result: ByOperation[K];
    readonly json: boolean;
  } & (K extends "stack.doctor" ? { readonly noFail: boolean } : {});
}[keyof ByOperation];

/** A Requested result confirms only native request acceptance, not remote completion. */
export function exitCode(outcome: DevOutcome): 0 | 1 {
  switch (outcome.operation) {
    case "repo.syncUpstream":
      return outcome.result.kind === "Planned" || outcome.result.kind === "Updated" ? 0 : 1;
    case "stack.doctor":
      return outcome.result.kind === "Healthy" ||
        (outcome.result.kind === "NeedsAttention" && outcome.noFail)
        ? 0
        : 1;
    case "stack.drain":
      return outcome.result.kind === "Planned" || outcome.result.kind === "Requested" ? 0 : 1;
    case "worktree.cleanup":
      return outcome.result.kind === "Planned" || outcome.result.kind === "Applied" ? 0 : 1;
  }
}

/** Keeps the full plan, attempted prefix, issues, and native observations visible. */
export function formatOutcome(outcome: DevOutcome): string {
  const record = `${JSON.stringify({ operation: outcome.operation, result: outcome.result }, null, outcome.json ? undefined : 2)}\n`;
  return !outcome.json && outcome.operation === "stack.drain" && outcome.result.kind === "Requested"
    ? `Native merge job requested. Completion is not verified.\n${record}`
    : record;
}

/** Native stdout settlement precedes the command's exit classification. */
export async function present(outcome: DevOutcome, command: Command): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    process.stdout.write(formatOutcome(outcome), (error) => (error ? reject(error) : resolve()))
  );
  const code = exitCode(outcome);
  if (code !== 0) command.exit(code);
}
