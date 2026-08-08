import { Command, Flags } from "@oclif/core";
import { writeJsonResult } from "./lib/output.js";

/** Normalized values for the shared machine-output and mutation-control flags. */
export type HabitatBaseFlags = {
  json: boolean;
  dryRun: boolean;
  yes: boolean;
};

/** Structured command failure rendered consistently for machine and human callers. */
export type HabitatError = {
  message: string;
  code?: string;
  details?: unknown;
};

/** Stable success-or-failure envelope returned by Habitat command projections. */
export type HabitatResult<TData = unknown> =
  | {
      ok: true;
      data?: TData;
      warnings?: string[];
      meta?: Record<string, unknown>;
    }
  | {
      ok: false;
      error: HabitatError;
      meta?: Record<string, unknown>;
    };

/** Shared result and output contract for native Oclif command projections. */
export abstract class HabitatCommand extends Command {
  static baseFlags = {
    json: Flags.boolean({ description: "Output machine-readable JSON" }),
    "dry-run": Flags.boolean({
      description: "Print actions without making any changes",
    }),
    yes: Flags.boolean({
      char: "y",
      description: "Assume yes for prompts/confirmation",
    }),
  } as const;

  protected ok<TData>(
    data?: TData,
    meta?: Record<string, unknown>,
    warnings?: string[]
  ): HabitatResult<TData> {
    return { ok: true, data, meta, warnings };
  }

  protected fail(
    message: string,
    options?: { code?: string; details?: unknown; meta?: Record<string, unknown> }
  ): HabitatResult<never> {
    return {
      ok: false,
      error: { message, code: options?.code, details: options?.details },
      meta: options?.meta,
    };
  }

  /** Renders one result through the selected machine or human output channel. */
  protected async outputResult<TData>(
    result: HabitatResult<TData>,
    options?: {
      flags?: HabitatBaseFlags;
      human?: (result: HabitatResult<TData>) => void;
    }
  ): Promise<void> {
    const flags = options?.flags ?? { json: false, dryRun: false, yes: false };

    if (flags.json) {
      await writeJsonResult(result);
      return;
    }

    if (options?.human) {
      options.human(result);
      return;
    }

    this.log(result.ok ? "ok" : `error: ${result.error.message}`);
  }

  static extractBaseFlags(flags: Record<string, unknown>): HabitatBaseFlags {
    return {
      json: Boolean(flags.json),
      dryRun: Boolean(flags["dry-run"] ?? flags.dryRun),
      yes: Boolean(flags.yes),
    };
  }
}
