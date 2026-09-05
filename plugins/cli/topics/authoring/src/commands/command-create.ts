import { Effect } from "@habitat-ai/sdk/effect";
import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { Args, Flags } from "@oclif/core";
import { Effect as NativeEffect } from "effect";
import type { AuthoringOptions } from "../options.js";

const args = { topic: Args.string({ required: true }), name: Args.string({ required: true }) };
const flags = {
  "dry-run": Flags.boolean({ default: false }),
};

/** Projects one official command request without executing during plugin construction. */
export function createCommandCreateCommand(run: AuthoringOptions["runCliCommandGenerator"]) {
  return createOclifCommand({
    id: "cli:command:create",
    description: "Create an official Habitat command",
    args,
    flags,
    effect(context: OclifCommandContext<typeof args, typeof flags>) {
      // Native filesystem publication cannot be cancelled once the runner has started.
      return NativeEffect.uninterruptible(
        Effect.tryPromise({
          try: () =>
            run(
              { topic: context.args.topic, name: context.args.name },
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
