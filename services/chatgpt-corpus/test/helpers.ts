import fs from "node:fs/promises";
import path from "node:path";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { CreateClientOptions } from "../src/client";

const FIXTURES_ROOT = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "fixtures",
);

export function createClientOptions(): CreateClientOptions {
  return {
    deps: {
      logger: createEmbeddedPlaceholderLoggerAdapter(),
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    },
    scope: {},
    config: {},
  };
}

export function createInvocation(traceId = "trace-chatgpt-corpus") {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}

export async function copyFixtureWorkspace(workspaceRoot: string): Promise<void> {
  await fs.mkdir(path.join(workspaceRoot, "source-material", "conversations", "raw-json"), {
    recursive: true,
  });
  await fs.mkdir(path.join(workspaceRoot, "work", "docs", "source"), {
    recursive: true,
  });

  await fs.cp(path.join(FIXTURES_ROOT, "raw-json"), path.join(workspaceRoot, "source-material", "conversations", "raw-json"), {
    recursive: true,
  });
  await fs.cp(path.join(FIXTURES_ROOT, "docs"), path.join(workspaceRoot, "work", "docs", "source"), {
    recursive: true,
  });
}
