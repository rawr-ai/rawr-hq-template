import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { Flags } from "@oclif/core";
import { cleanFlags, textFlag } from "../../flags.js";
import { required } from "../../input.js";
import { present } from "../../output.js";
import type { services } from "../../services.js";

const updateFlags = {
  json: Flags.boolean(),
  "content-workspace": cleanFlags["content-workspace"],
  "repository-identity": cleanFlags["repository-identity"],
  "content-authority": cleanFlags["content-authority"],
  "remote-url": cleanFlags["remote-url"],
  ref: cleanFlags.ref,
  "source-commit": cleanFlags["source-commit"],
  "source-tree": cleanFlags["source-tree"],
  "release-input": cleanFlags["release-input"],
  source: textFlag({ required: true, multiple: true, multipleNonGreedy: true }),
};

/** Requests reviewable updates for explicitly named, already declared vendor sources. */
export const vendorsUpdateCommand = createOclifCommand({
  id: "agent:plugins:vendors:update",
  description: "Author reviewable updates to declared vendor sources",
  args: {},
  flags: updateFlags,
  effect: function* ({
    flags,
    clients,
  }: OclifCommandContext<{}, typeof updateFlags, typeof services>) {
    return {
      operation: "vendors.update" as const,
      json: flags.json === true,
      result: yield* clients.lifecycle.withInvocation({ invocation: undefined }).vendors.update({
        contentWorkspace: {
          locator: required(flags["content-workspace"]),
          repositoryIdentity: required(flags["repository-identity"]),
          contentAuthority: required(flags["content-authority"]),
          remoteUrl: required(flags["remote-url"]),
          refName: required(flags.ref),
          sourceCommit: required(flags["source-commit"]),
          sourceTree: required(flags["source-tree"]),
          releaseInputPath: required(flags["release-input"]),
        },
        sourceIds: flags.source,
      }),
    };
  },
  async present(outcome, command) {
    await present(outcome, command);
  },
});
