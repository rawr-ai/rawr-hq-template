import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { CreateClientOptions } from "../src/client";
import type { Service } from "../src/service/base";
import type {
  HyperresearchCliOperation,
  HyperresearchCliResult,
} from "../src/types";
import type {
  HyperresearchCliBackend,
  HyperresearchCodexIO,
} from "../src/service/shared/resources";

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export function createNodeTestIO(): HyperresearchCodexIO {
  return {
    now: () => new Date().toISOString(),
    randomId: (prefix) => `${prefix}-${crypto.randomUUID()}`,
    join: (...parts) => path.join(...parts),
    dirname: (filePath) => path.dirname(filePath),
    ensureDir: async (dirPath) => {
      await fs.mkdir(dirPath, { recursive: true });
    },
    pathExists,
    readTextFile: async (filePath) => {
      try {
        return await fs.readFile(filePath, "utf8");
      } catch {
        return null;
      }
    },
    writeTextFile: async (filePath, content) => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, "utf8");
    },
    readJsonFile: async <T>(filePath: string) => {
      try {
        return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
      } catch {
        return null;
      }
    },
    writeJsonFile: async (filePath, data) => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    },
    sha256: (content) => crypto.createHash("sha256").update(content).digest("hex"),
  };
}

export class RecordingCli implements HyperresearchCliBackend {
  readonly calls: Array<{ operation: HyperresearchCliOperation; args: string[]; cwd: string }> = [];

  constructor(private readonly result: HyperresearchCliResult = {
    exitCode: 0,
    stdout: JSON.stringify({ ok: true }),
  }) {}

  async run(input: { operation: HyperresearchCliOperation; args: string[]; cwd: string }) {
    this.calls.push(input);
    return this.result;
  }
}

export function createClientOptions(input: {
  repoRoot?: string;
  io?: HyperresearchCodexIO;
  cli?: HyperresearchCliBackend;
} = {}): CreateClientOptions {
  const deps: Service["Deps"] = {
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    io: input.io ?? createNodeTestIO(),
    cli: input.cli ?? new RecordingCli(),
  };

  return {
    deps,
    scope: {
      repoRoot: input.repoRoot ?? "/tmp/workspace",
    },
    config: {},
  };
}

export function invocation(traceId = "test-trace") {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  };
}
