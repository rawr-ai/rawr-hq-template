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
export const startupFailure = process.env.HABITAT_FIXTURE_STARTUP_FAIL === "1";
let bodyEntered = false;

export function record(name: string): void {
  const path = process.env.HABITAT_FIXTURE_TRACE;
  if (path !== undefined) appendFileSync(path, `${name}\n`);
}

export function dataPath(name: string): string {
  const root = process.env.HABITAT_FIXTURE_DATA;
  if (root === undefined) throw new TypeError("Missing native fixture directory.");
  return join(root, name);
}

function leasePath(): string {
  return dataPath("lease");
}

export async function waitForStartupGate(): Promise<void> {
  record("gate.wait");
  while (!existsSync(dataPath("gate-open"))) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  record("gate.open");
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
      acquire: Effect.promise(async () => {
        if (process.env.HABITAT_FIXTURE_ACQUIRE_GATE === "1") await waitForStartupGate();
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
  mode: Args.string({
    required: true,
    ignoreStdin: true,
    options: ["success", "failure", "wait"],
    async parse(value) {
      record("parse");
      return value;
    },
  }),
};

interface StdinPayload {
  readonly message: string;
  readonly byteLength: number;
  readonly hex: string;
}

const stdinPayload = Flags.custom<StdinPayload>({
  allowStdin: false,
  async parse(value) {
    if (value !== "-") throw new Errors.CLIError("STDIN_MARKER_REQUIRED", { exit: 2 });
    record("stdin.read");
    const chunks: Buffer[] = [];
    let byteLength = 0;
    // The native parser owns this invocation; its text trimming and global stdin cache do not.
    for await (const chunk of process.stdin) {
      if (!Buffer.isBuffer(chunk)) throw new TypeError("Expected native stdin bytes.");
      byteLength += chunk.length;
      if (byteLength > 128) throw new Errors.CLIError("STDIN_BYTE_LIMIT", { exit: 2 });
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Errors.CLIError("INVALID_STDIN_UTF8", { exit: 2 });
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Errors.CLIError("INVALID_STDIN_JSON", { exit: 2 });
    }
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("message" in payload) ||
      typeof payload.message !== "string"
    ) {
      throw new Errors.CLIError("INVALID_STDIN_PAYLOAD", { exit: 2 });
    }
    return { message: payload.message, byteLength, hex: bytes.toString("hex") };
  },
});
const flags = {
  count: Flags.integer({ default: 1 }),
  operation: Flags.string({
    options: ["inspect", "apply"],
    default: "inspect",
    relationships: [
      {
        type: "all",
        flags: [{ name: "confirm", when: async (flags) => flags.operation === "apply" }],
      },
    ],
  }),
  confirm: Flags.boolean(),
  input: stdinPayload(),
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
      bodyEntered = true;
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
      return {
        count: context.flags.count,
        mode: context.args.mode,
        operation: context.flags.operation,
        input: context.flags.input,
        output: "x".repeat(70_000),
      };
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
  harnesses: ["native.oclif", ...(startupFailure ? ["native.zz-after"] : [])],
});
const processSpec = defineProcessCatalog({
  cli: { id: "native.cli", roles: ["cli"] },
}).cli;
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
  const leaseOpen = existsSync(leasePath());
  if (bodyEntered && !leaseOpen) throw new TypeError("Provider released before native finally.");
  record(leaseOpen ? "finally.lease-open" : "finally.no-lease");
  await nativeFinally.call(this, options);
  if (process.env.HABITAT_FIXTURE_FINALLY_FAIL === "1") {
    throw new Errors.CLIError("SECONDARY_FINALLY_FAILURE", { exit: 7 });
  }
};
