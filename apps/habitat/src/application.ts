import { bindHabitatClient } from "@habitat-ai/plugin-cli/binding";
import { execute, settings } from "@oclif/core";
import { createHabitatClientForWorkspace } from "./composition.js";

/** Inputs fixed by one Habitat process activation. */
export type ExecuteHabitatOptions = Readonly<{
  appRoot: string;
  workspaceRoot: string;
  args?: string[];
  development?: boolean;
}>;

/**
 * Runs one native Oclif invocation over the app-selected Habitat client.
 *
 * Oclif owns command discovery and dispatch; this boundary supplies only the
 * ready workspace client required by the Habitat command plugin.
 */
export async function executeHabitat({
  appRoot,
  workspaceRoot,
  args,
  development,
}: ExecuteHabitatOptions): Promise<unknown> {
  settings.enableAutoTranspile = development === true;
  const client = await createHabitatClientForWorkspace(workspaceRoot);
  return execute({
    ...(args === undefined ? {} : { args }),
    ...(development === undefined ? {} : { development }),
    loadOptions: bindHabitatClient({ root: appRoot }, client),
  });
}
