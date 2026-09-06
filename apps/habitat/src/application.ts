import { type Client, contract } from "@habitat-ai/catalog-service/client";
import { runHabitatProcess } from "../cli.js";
import { runtimeSources } from "../runtime/sources.js";
import { sourceBundle } from "./oclif.js";

/** Inputs fixed by one Habitat process activation. */
export type ExecuteHabitatOptions = Readonly<{
  appRoot: string;
  workspaceRoot: string;
  args?: readonly string[];
  development?: boolean;
}>;

/** Run one app-selected process; the native host owns dispatch and finalization. */
export function executeHabitat(input: ExecuteHabitatOptions): Promise<unknown> {
  return runHabitatProcess({
    ...input,
    sources: () => runtimeSources(input.appRoot, input.workspaceRoot),
    sourceBundle,
    terminal: true,
  });
}

/** A bounded native invocation returns only validated data, never an escaped managed client. */
export async function resolveCatalogForWorkspace(
  input: Omit<ExecuteHabitatOptions, "args">
): Promise<Awaited<ReturnType<Client["catalog"]["resolve"]>>> {
  const value = await runHabitatProcess({
    ...input,
    args: ["resolve"],
    sources: () => runtimeSources(input.appRoot, input.workspaceRoot),
    sourceBundle,
    terminal: false,
  });
  const schemas = contract.catalog.resolve["~orpc"].outputSchemas;
  if (schemas?.length !== 1 || schemas[0] === undefined)
    throw new TypeError("Catalog resolve must declare its output schema.");
  const result = await schemas[0]["~standard"].validate(value);
  if (result.issues !== undefined)
    throw new TypeError("Native catalog invocation returned an invalid result.");
  return result.value;
}
