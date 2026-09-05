import { test } from "bun:test";
import { assertNativeRuntimeImportLaw } from "./runtime-law-fixture";

test("app v2 resolves independently with closed runtime selection topology", async () => {
  await assertNativeRuntimeImportLaw({
    owner: "app",
    version: 2,
    rule: "app_v2_structure",
    allowed: {
      "owner/package.json": "{}",
      "owner/tsconfig.json": "{}",
      "owner/proof.app.ts": "export {};",
      "owner/cli.ts": "export {};",
      "owner/src/index.ts": "export {};",
      "owner/runtime/processes.ts": "export {};",
      "owner/runtime/profiles/local.ts": "export {};",
    },
    forbidden: {
      "owner/rogue.json": "{}",
      "owner/runtime/rogue.json": "{}",
    },
  });
}, 60_000);

test("CLI topic has a positive package and command grammar", async () => {
  await assertNativeRuntimeImportLaw({
    owner: "plugin-cli-topic",
    version: 1,
    rule: "plugin_cli_topic_v1_structure",
    allowed: {
      "owner/AGENTS.md": "# Topic",
      "owner/package.json": "{}",
      "owner/tsconfig.json": "{}",
      "owner/tsconfig.build.json": "{}",
      "owner/src/index.ts": "export {};",
      "owner/src/services.ts": "export {};",
      "owner/src/commands/check.ts": "export {};",
    },
    forbidden: {
      "owner/rogue.json": "{}",
      "owner/src/acquisition.json": "{}",
    },
  });
}, 60_000);

test("app selection law accepts SDK declarations and refuses reconstructed selection", async () => {
  await assertNativeRuntimeImportLaw({
    owner: "app",
    version: 2,
    rule: "app_v2_selection",
    allowed: {
      "owner/proof.app.ts":
        'import { defineApp } from "@habitat-ai/sdk/app"; export const app = defineApp({});',
      "owner/runtime/processes.ts":
        'import { defineProcessCatalog } from "@habitat-ai/sdk/app"; export const processes = defineProcessCatalog({});',
      "owner/runtime/profiles/local.ts":
        'import { defineRuntimeProfile as profile } from "@habitat-ai/sdk/runtime/profiles"; export const local = profile({});',
      "owner/cli.ts":
        'import { defineEntrypoint } from "@habitat-ai/sdk/app"; export const entrypoint = defineEntrypoint({});',
      "owner/src/native.ts": 'import { native } from "resource/providers/native";',
    },
    forbidden: {
      "owner/proof.app.ts": "export const app = {};",
      "owner/runtime/processes.ts": "export const processes = {};",
      "owner/runtime/profiles/local.ts":
        'import { defineRuntimeProfile } from "lookalike"; export const local = defineRuntimeProfile({});',
      "owner/cli.ts":
        'import { defineEntrypoint } from "@habitat-ai/sdk/app"; export const entrypoint = defineEntrypoint({}); void import("resource/providers/native");',
    },
  });
}, 60_000);

test("CLI topic law accepts typed projections and rejects selection and acquisition imports", async () => {
  await assertNativeRuntimeImportLaw({
    owner: "plugin-cli-topic",
    version: 1,
    rule: "plugin_cli_topic_v1_boundary",
    allowed: {
      "owner/src/index.ts":
        'import { defineCliTopicPlugin } from "@habitat-ai/sdk/plugins/cli"; export const createPlugin = defineCliTopicPlugin.factory()({commands: []});',
      "owner/src/services.ts":
        'import { useService } from "@habitat-ai/sdk/plugins/cli"; import { contract } from "resource/contract";',
      "owner/src/commands/check.ts":
        'import { Effect } from "effect"; import { Command } from "host/contract"; const example = "resource/providers/native"; void import("host", {with: {note: "@habitat-ai/sdk/app"}});',
      "owner/test/fixture.ts": 'import { startApp } from "@habitat-ai/sdk/app";',
    },
    forbidden: {
      "owner/src/index.ts": "export const createPlugin = () => ({});",
      "owner/src/commands/start.ts": 'import { startApp } from "@habitat-ai/sdk/app";',
      "owner/src/commands/profile.ts": 'export * from "@habitat-ai/sdk/runtime/profiles";',
      "owner/src/commands/provider.ts": 'void import("resource/providers/native");',
      "owner/src/commands/private.ts": 'require("../../runtime/process-runtime/src/index");',
    },
  });
}, 60_000);
