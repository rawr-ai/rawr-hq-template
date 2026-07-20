import { RawrCommand } from "@rawr/core";

import { AgentPluginLifecycleCommand } from "../../../lib/agent-plugins/commands/command";
import {
  checkModeFlag,
  currentMainBodyJsonFlag,
  currentMainEnvelopeJsonFlag,
  gitExecutableFlag,
  releaseMemberFlag,
  releaseWorkspaceFlags,
} from "../../../lib/agent-plugins/commands/flags";
import {
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  parseCheckOperationRequest,
} from "../../../lib/agent-plugins/commands/input";

export default class AgentPluginsCheck extends AgentPluginLifecycleCommand {
  static description = "Check curated release or repository data without publishing it";

  static flags = {
    json: RawrCommand.baseFlags.json,
    mode: checkModeFlag,
    "current-main-body-json": currentMainBodyJsonFlag,
    "current-main-envelope-json": currentMainEnvelopeJsonFlag,
    ...releaseWorkspaceFlags,
    member: releaseMemberFlag,
    "git-executable": gitExecutableFlag,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(AgentPluginsCheck);
    const releaseInputRecord = flags.mode === "release-input-record"
      ? await readReleaseInputRecordStdin({
        chunks: process.stdin,
        isTTY: process.stdin.isTTY,
      })
      : undefined;
    if (releaseInputRecord !== undefined && !releaseInputRecord.ok) {
      this.rejectInput(releaseInputRecord.message, RawrCommand.extractBaseFlags(flags));
      return;
    }
    const request = this.parseInput(
      flags,
      (inputFlags) => parseCheckOperationRequest(inputFlags, releaseInputRecord?.bytes),
    );
    if (request === undefined) return;
    await this.project(request, flags, {
      git: request.operation === "releases.check"
        || request.operation === "releases.checkRepository"
        || request.operation === "releases.refreshReleaseInput"
        || request.operation === "governance.currentMainSelection",
    });
  }
}

type ReleaseInputRecordStdin =
  | Readonly<{ ok: true; bytes: Uint8Array }>
  | Readonly<{ ok: false; message: string }>;

export async function readReleaseInputRecordStdin(input: Readonly<{
  chunks: AsyncIterable<unknown>;
  isTTY: boolean | undefined;
}>): Promise<ReleaseInputRecordStdin> {
  if (input.isTTY === true) {
    return Object.freeze({
      ok: false,
      message: "--mode release-input-record requires piped stdin; terminal stdin is not admitted",
    });
  }

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  for await (const chunk of input.chunks) {
    if (!(chunk instanceof Uint8Array)) {
      return Object.freeze({
        ok: false,
        message: "--mode release-input-record stdin must contain bytes",
      });
    }
    if (chunk.byteLength > MAX_RELEASE_INPUT_ENVELOPE_BYTES - byteLength) {
      return Object.freeze({
        ok: false,
        message: `--mode release-input-record stdin exceeds ${MAX_RELEASE_INPUT_ENVELOPE_BYTES} bytes`,
      });
    }
    chunks.push(chunk);
    byteLength += chunk.byteLength;
  }

  if (byteLength === 0) {
    return Object.freeze({
      ok: false,
      message: "--mode release-input-record requires nonempty stdin",
    });
  }
  return Object.freeze({
    ok: true,
    bytes: Buffer.concat(chunks, byteLength),
  });
}
