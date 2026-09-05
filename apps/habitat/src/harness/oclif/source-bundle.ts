import { type OclifCommandSource, readOclifCommandSource } from "@habitat-ai/sdk/plugins/cli/oclif";
import type { RuntimeDerivationResult } from "@habitat-ai/sdk/runtime/derivation";
import type { Command } from "@oclif/core";

import { HabitatCommand } from "../../command.js";
import { type CliExecutionRef, readOclifBinding } from "./binding.js";

const bundleIdentity = Symbol("habitat.oclif-source-bundle");

export interface OclifSourceBundle {
  readonly [bundleIdentity]: true;
  readonly entries: readonly {
    readonly ref: CliExecutionRef;
    readonly source: OclifCommandSource;
  }[];
  readonly COMMANDS: Readonly<Record<string, Command.Class>>;
}

/** Cold explicit discovery projects only the derivation owner's selected command inventory. */
export function createOclifSourceBundle(derivation: RuntimeDerivationResult): OclifSourceBundle {
  const entries = derivation.cliCommandSources
    .map(({ ref, source }) => ({
      ref: Object.freeze({ ...ref }),
      source: readOclifCommandSource(source),
    }))
    .sort((left, right) =>
      left.ref.commandId < right.ref.commandId
        ? -1
        : left.ref.commandId > right.ref.commandId
          ? 1
          : 0
    );
  const commands: Record<string, Command.Class> = Object.create(null);
  for (const entry of entries) {
    const { ref, source } = entry;
    if (Object.hasOwn(commands, ref.commandId))
      throw new TypeError("Selected CLI command IDs collide.");
    class SelectedCommand extends HabitatCommand {
      static override id = ref.commandId;
      static override args = source.args;
      static override flags = source.flags;

      async run(): Promise<unknown> {
        const binding = readOclifBinding(this.config);
        const parsed = await this.parse(this.ctor);
        const value = await binding.invoke(ref, source, { args: parsed.args, flags: parsed.flags });
        if (binding.presentation) await source.present(value, this);
        return value;
      }
    }
    Object.assign(SelectedCommand, source.metadata);
    // Oclif assigns its own plugin/id metadata to native classes during loading.
    commands[ref.commandId] = SelectedCommand;
  }
  return Object.freeze({
    [bundleIdentity]: true as const,
    entries: Object.freeze(entries.map((entry) => Object.freeze(entry))),
    COMMANDS: Object.freeze(commands),
  });
}

export function readOclifSourceBundle(value: OclifSourceBundle): OclifSourceBundle {
  if (typeof value !== "object" || value === null || value[bundleIdentity] !== true) {
    throw new TypeError("Native Oclif mounting requires its cold selected source bundle.");
  }
  return value;
}
