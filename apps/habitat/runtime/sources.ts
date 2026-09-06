import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import type { StartAppOptions } from "@habitat-ai/sdk/app";

const require = createRequire(import.meta.url);

/** Deployment locators and caller input are explicit values, not a cached provider acquisition. */
export function runtimeSources(appRoot: string, workspaceRoot: string): StartAppOptions["sources"] {
  const timeoutInput = process.env.HABITAT_COMMAND_TIMEOUT_MS;
  const timeoutMs = timeoutInput === undefined ? 600_000 : Number(timeoutInput);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600_000) {
    throw new TypeError("HABITAT_COMMAND_TIMEOUT_MS must be an integer from 1 through 600000.");
  }
  const gritEntrypoint = require.resolve("@getgrit/cli/run-grit.js");
  return {
    appRoot,
    memory: {
      "habitat.catalog.scope": { workspaceRoot: resolve(workspaceRoot) },
      "habitat.catalog.config": {
        policyPack: {
          name: "@habitat-ai/sdk",
          packageJsonPath: require.resolve("@habitat-ai/sdk/package.json"),
          manifestPath: require.resolve("@habitat-ai/sdk/habitat-pack.json"),
        },
      },
      "habitat.source-inventory": {},
      "habitat.telemetry": telemetryConfiguration(),
      "habitat.rule-evaluation": {
        command: process.platform === "win32" ? "node" : gritEntrypoint,
        args: process.platform === "win32" ? [gritEntrypoint] : [],
        timeoutMs,
      },
    },
  };
}

function telemetryConfiguration(): unknown {
  const raw = process.env.HABITAT_TELEMETRY;
  let value: unknown = { enabled: false };
  if (raw !== undefined) {
    try {
      value = JSON.parse(raw);
    } catch {
      throw new TypeError("HABITAT_TELEMETRY must contain valid JSON.");
    }
  }
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    "processIdentity" in value
  ) {
    throw new TypeError(
      "HABITAT_TELEMETRY must be a provider configuration without processIdentity."
    );
  }
  // The provider validates its own configuration; deployment identity belongs to the app.
  return {
    ...value,
    processIdentity: {
      serviceName: "habitat",
      processRole: "cli",
      deploymentEnvironment: "local",
      processInstanceId: randomUUID(),
    },
  };
}
