import type { HabitatClient } from "@habitat-ai/sdk";
import { type Config, Errors } from "@oclif/core";

const HABITAT_CLIENT = "habitatClient";

/** Oclif load options carrying the ready Habitat client selected by the app. */
export type HabitatOclifLoadOptions = Config["options"] & {
  readonly habitatClient: HabitatClient;
};

/** Adds the app-owned Habitat client to one native Oclif configuration. */
export function bindHabitatClient(
  options: Config["options"],
  client: HabitatClient
): HabitatOclifLoadOptions {
  return Object.freeze({ ...options, [HABITAT_CLIENT]: client });
}

/** Reads the ready Habitat client from the current native Oclif configuration. */
export function habitatClientFrom(config: Config): HabitatClient {
  if (!hasHabitatClient(config.options)) {
    throw new Errors.CLIError("The Habitat app did not supply its service binding.");
  }
  return config.options.habitatClient;
}

function hasHabitatClient(options: Config["options"]): options is HabitatOclifLoadOptions {
  return HABITAT_CLIENT in options && options.habitatClient !== undefined;
}
