import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import path from "node:path";
import type { CreateClientOptions } from "../src/client";
import type { Service } from "../src/service/base";
import type { DevResources } from "../src/service/common/resources";

const encoder = new TextEncoder();

export type FakeCommand = {
  command: string;
  args?: string[];
  exitCode?: number | null;
  stdout?: string;
  stderr?: string;
  throws?: Error | string;
};

function matches(candidate: FakeCommand, command: string, args: string[]): boolean {
  if (candidate.command !== command) return false;
  if (!candidate.args) return true;
  if (candidate.args.length !== args.length) return false;
  return candidate.args.every((arg, index) => arg === args[index]);
}

export function createFakeResources(input: {
  commands?: FakeCommand[];
  now?: Date;
  dirs?: Record<string, Array<{ name: string; isDirectory: boolean }>>;
} = {}): { resources: DevResources; calls: Array<{ command: string; args: string[]; cwd?: string }> } {
  const calls: Array<{ command: string; args: string[]; cwd?: string }> = [];
  return {
    calls,
    resources: {
      fs: {
        stat: async () => null,
        readDir: async (dirPath) => input.dirs?.[dirPath] ?? [],
      },
      path: {
        join: path.join,
        resolve: path.resolve,
        relative: path.relative,
        basename: path.basename,
      },
      process: {
        exec: async (command, args, opts) => {
          calls.push({ command, args, cwd: opts?.cwd });
          const found = input.commands?.find((candidate) => matches(candidate, command, args));
          if (found?.throws) throw typeof found.throws === "string" ? new Error(found.throws) : found.throws;
          return {
            exitCode: found?.exitCode ?? 0,
            signal: null,
            stdout: encoder.encode(found?.stdout ?? ""),
            stderr: encoder.encode(found?.stderr ?? ""),
            durationMs: 0,
          };
        },
        sleep: async () => {},
      },
      clock: {
        now: () => input.now ?? new Date("2026-05-08T12:34:56Z"),
      },
    },
  };
}

export function createClientOptions(input: {
  workspaceRoot?: string;
  resources?: DevResources;
} = {}): CreateClientOptions {
  const deps: Service["Deps"] = {
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    resources: input.resources ?? createFakeResources().resources,
  };
  return {
    deps,
    scope: {
      workspaceRoot: input.workspaceRoot ?? "/repo/rawr",
    },
    config: {},
  };
}
