import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { checkFlags } from "../flags.js";
import { cleanWorkspace, locator, releaseMode, required, stagedWorkspace } from "../input.js";
import { present } from "../output.js";
import type { services } from "../services.js";

/** Projects the seven closed native check modes into one owning lifecycle procedure each. */
export const checkCommand = createOclifCommand({
  id: "agent:plugins:check",
  description: "Check explicit agent-plugin release, repository or channel data",
  args: {},
  flags: checkFlags,
  effect: function* ({
    flags,
    clients,
  }: OclifCommandContext<{}, typeof checkFlags, typeof services>) {
    const client = clients.lifecycle.withInvocation({ invocation: undefined });
    const json = flags.json === true;
    const mode = required(flags.mode);
    switch (mode.kind) {
      case "release":
        return {
          operation: "releases.check" as const,
          json,
          result: yield* client.releases.check({
            contentWorkspace: cleanWorkspace(flags),
            mode: releaseMode(flags),
          }),
        };
      case "repository-staged":
        return {
          operation: "releases.checkRepository" as const,
          json,
          result: yield* client.releases.checkRepository({
            kind: "staged",
            contentWorkspace: stagedWorkspace(flags),
          }),
        };
      case "repository-clean":
        return {
          operation: "releases.checkRepository" as const,
          json,
          result: yield* client.releases.checkRepository({
            kind: "clean",
            contentWorkspace: cleanWorkspace(flags),
          }),
        };
      case "release-input-record":
        return {
          operation: "releases.releaseInputRecord" as const,
          json,
          result: yield* client.releases.releaseInputRecord(mode.input),
        };
      case "release-input-refresh":
        return {
          operation: "releases.refreshReleaseInput" as const,
          json,
          result: yield* client.releases.refreshReleaseInput({
            contentWorkspace: stagedWorkspace(flags),
            memberIds: required(flags.member),
          }),
        };
      case "current-main-record":
        return {
          operation: "governance.currentMainRecord" as const,
          json,
          result: yield* client.governance.currentMainRecord(
            required(flags["current-main-body-json"] ?? flags["current-main-record-json"])
          ),
        };
      case "current-main-selection":
        return {
          operation: "governance.currentMainSelection" as const,
          json,
          result: yield* client.governance.currentMainSelection({ locator: locator(flags) }),
        };
    }
  },
  async present(outcome, command) {
    await present(outcome, command);
  },
});
