import { Effect } from "@habitat-ai/sdk/effect";
import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { Args, Flags } from "@oclif/core";
import { Effect as NativeEffect } from "effect";
import type { AuthoringOptions } from "../options.js";

const args = { id: Args.string({ required: true }) };
const flags = {
  destination: Flags.string({ required: true }),
  "dry-run": Flags.boolean({ default: false }),
};

/** Projects one standalone extension request without executing during plugin construction. */
export function createExtensionCreateCommand(run: AuthoringOptions["runCliExtensionGenerator"]) {
  return createOclifCommand({
    id: "cli:extension:create",
    description: "Create a standalone Oclif extension",
    args,
    flags,
    effect(context: OclifCommandContext<typeof args, typeof flags>) {
      // Keep the invocation alive until native publication or its original failure settles.
      return NativeEffect.uninterruptible(
        Effect.tryPromise({
          try: () =>
            run(
              { id: context.args.id, destination: context.flags.destination },
              { dryRun: context.flags["dry-run"] }
            ),
          catch: (error) => error,
        })
      );
    },
    present(receipt, command) {
      command.log(JSON.stringify(receipt));
    },
  });
}
