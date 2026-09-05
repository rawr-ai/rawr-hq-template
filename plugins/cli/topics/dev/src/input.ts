import type { Client } from "@habitat-ai/dev-service/client";

type MutationInput = Parameters<Client["stack"]["drain"]>[0];

/** Cwd is an invocation locator, not a discovered or cached repository root. */
export function repositoryPath(flags: { readonly repository?: string }): string {
  return flags.repository ?? process.cwd();
}

/** Adapts native controls without inspecting files or duplicating service admission. */
export function mutationInput(flags: {
  readonly repository?: string;
  readonly apply?: boolean;
  readonly "dry-run"?: boolean;
  readonly "scratch-file"?: readonly string[];
  readonly "scratch-mode"?: "warn" | "block";
}): MutationInput {
  const files = flags["scratch-file"];
  const mode = flags["scratch-mode"];
  return {
    repositoryPath: repositoryPath(flags),
    apply: flags.apply === true && flags["dry-run"] !== true,
    ...(files === undefined
      ? {}
      : { scratch: { files: [...files], ...(mode === undefined ? {} : { mode }) } }),
  };
}
