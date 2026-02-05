import { Command, Flags } from "@oclif/core";

export type RawrBaseFlags = {
  json: boolean;
  dryRun: boolean;
  yes: boolean;
};

export type RawrError = {
  message: string;
  code?: string;
  details?: unknown;
};

export type RawrResult<TData = unknown> =
  | {
      ok: true;
      data?: TData;
      warnings?: string[];
      meta?: Record<string, unknown>;
    }
  | {
      ok: false;
      error: RawrError;
      meta?: Record<string, unknown>;
    };

export abstract class RawrCommand extends Command {
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

  protected rawrBaseFlags: RawrBaseFlags | undefined;

  protected async parseRawr<T extends typeof RawrCommand>(command: T) {
    const parsed = (await this.parse(command)) as {
      args: Record<string, unknown>;
      flags: Record<string, unknown>;
    };

    this.rawrBaseFlags = RawrCommand.extractBaseFlags(parsed.flags);
    return parsed;
  }

  protected ok<TData>(data?: TData, meta?: Record<string, unknown>): RawrResult<TData> {
    return { ok: true, data, meta };
  }

  protected fail(
    message: string,
    opts?: { code?: string; details?: unknown; meta?: Record<string, unknown> },
  ): RawrResult<never> {
    return {
      ok: false,
      error: { message, code: opts?.code, details: opts?.details },
      meta: opts?.meta,
    };
  }

  protected outputResult<TData>(
    result: RawrResult<TData>,
    opts?: { flags?: RawrBaseFlags; human?: (result: RawrResult<TData>) => void },
  ): void {
    const flags = opts?.flags ?? this.rawrBaseFlags ?? { json: false, dryRun: false, yes: false };

    if (flags.json) {
      this.log(JSON.stringify(result, null, 2));
      return;
    }

    if (opts?.human) return opts.human(result);

    if (result.ok) this.log("ok");
    else this.log(`error: ${result.error.message}`);
  }

  static extractBaseFlags(flags: Record<string, unknown>): RawrBaseFlags {
    const json = Boolean(flags.json);
    const dryRun = Boolean((flags as Record<string, unknown>)["dry-run"] ?? (flags as any).dryRun);
    const yes = Boolean(flags.yes);
    return { json, dryRun, yes };
  }
}
