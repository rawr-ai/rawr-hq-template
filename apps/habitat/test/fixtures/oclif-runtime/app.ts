import { appendFileSync, closeSync, existsSync, fstatSync, openSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineApp, defineEntrypoint, defineProcessCatalog } from "@habitat-ai/sdk/app";
import { defineCliTopicPlugin } from "@habitat-ai/sdk/plugins/cli";
import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { deriveRuntimeArtifacts } from "@habitat-ai/sdk/runtime/derivation";
import { defineRuntimeProfile, providerSelection } from "@habitat-ai/sdk/runtime/profiles";
import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import { providerFx } from "@habitat-ai/sdk/runtime/providers/effect";
import { defineRuntimeResource, requireResource } from "@habitat-ai/sdk/runtime/resources";
import { Args, Errors, Flags, type Hook } from "@oclif/core";
import { Effect } from "effect";
import {
  createOclifSourceBundle,
  FINALLY_HOOK as nativeFinally,
  writeJsonResult,
} from "../../../dist/host.js";

export const appRoot = fileURLToPath(new URL(".", import.meta.url));

export function record(name: string): void {
  const path = process.env.HABITAT_FIXTURE_TRACE;
  if (path !== undefined) appendFileSync(path, `${name}\n`);
}

function leasePath(): string {
  const root = process.env.HABITAT_FIXTURE_DATA;
  if (root === undefined) throw new TypeError("Missing native fixture directory.");
  return join(root, "lease");
}

const file = defineRuntimeResource<"oclif.file", number>({
  id: "oclif.file",
  title: "Native CLI file",
  purpose: "Prove native completion precedes provider release",
});
const required = requireResource({ resource: file, reason: "Native command fixture" });
const provider = defineRuntimeProvider({
  id: "oclif.file-provider",
  title: "Native CLI file provider",
  provides: file,
  requires: [],
  build() {
    record("build");
    return providerFx.acquireRelease({
      acquire: Effect.sync(() => {
        const fd = openSync(leasePath(), "wx");
        record("acquire");
        return fd;
      }),
      release: (fd) =>
        Effect.sync(() => {
          closeSync(fd);
          unlinkSync(leasePath());
          record("release");
        }),
    });
  },
});
const args = {
  mode: Args.string({ required: true, options: ["success", "failure", "wait"] }),
};
const flags = {
  count: Flags.integer({ default: 1 }),
};
const command = createOclifCommand({
  id: "probe",
  summary: "Exercise one selected native command",
  aliases: ["native-probe"],
  args,
  flags,
  effect(context: OclifCommandContext<typeof args, typeof flags>) {
    return Effect.gen(function* () {
      if (!fstatSync(context.resources.get(required)).isFile()) throw new TypeError("Not a file.");
      record("body");
      if (context.args.mode === "failure") {
        return yield* Effect.fail(new Errors.CLIError("PRIMARY_COMMAND_FAILURE", { exit: 2 }));
      }
      if (context.args.mode === "wait") {
        yield* Effect.sleep("1 minute").pipe(
          Effect.ensuring(
            Effect.promise(async () => {
              await new Promise((resolve) => setTimeout(resolve, 20));
              record("effect.cleanup");
            })
          )
        );
      }
      return { count: context.flags.count, mode: context.args.mode, output: "x".repeat(70_000) };
    });
  },
  async present(value) {
    record("present");
    await writeJsonResult(value);
  },
});
const plugin = defineCliTopicPlugin.factory()({
  capability: "native-fixture",
  services: {},
  resourceRequirements: [required],
  commands: [command],
})();
const app = defineApp({ id: "native-oclif-fixture", plugins: [plugin] });
const profile = defineRuntimeProfile({
  id: "native-fixture",
  providers: [providerSelection({ resource: file, provider })],
  harnesses: ["native.oclif"],
});
const processSpec = defineProcessCatalog({ cli: { id: "native.cli", roles: ["cli"] } }).cli;
export const entrypoint = defineEntrypoint({
  id: "native.entrypoint",
  app,
  profile,
  process: processSpec,
  identity: {
    app: app.id,
    process: processSpec.id,
    entrypoint: "native.entrypoint",
    deployment: "test",
    source: "native-oclif-fixture",
  },
});
export const sourceBundle = createOclifSourceBundle(
  deriveRuntimeArtifacts({
    entrypoint,
    profileId: profile.id,
  })
);
export const COMMANDS = sourceBundle.COMMANDS;

export const FINALLY_HOOK: Hook.Finally = async function (options) {
  if (!existsSync(leasePath())) throw new TypeError("Provider released before native finally.");
  record("finally.lease-open");
  await nativeFinally.call(this, options);
  if (process.env.HABITAT_FIXTURE_FINALLY_FAIL === "1") {
    throw new Errors.CLIError("SECONDARY_FINALLY_FAILURE", { exit: 7 });
  }
};
