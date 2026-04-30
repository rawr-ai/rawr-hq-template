import { defineService } from "@rawr/sdk/service";
import { RuntimeSchema } from "@rawr/sdk/runtime/schema";

export const FoundryProofService = defineService({
  id: "foundry-proof",
  config: RuntimeSchema.struct(
    {
      prefix: RuntimeSchema.string({ id: "foundry-proof.config.prefix" }),
    },
    { id: "foundry-proof.config" },
  ),
  metadataDefaults: {
    capability: "foundry-proof",
    generatedBy: "capability-foundry",
  },
});

export interface FoundryProofPingInput {
  readonly message: string;
}

export interface FoundryProofPingOutput {
  readonly ok: true;
  readonly capability: "foundry-proof";
  readonly message: string;
}

export function createFoundryProofClient(input: { readonly prefix?: string } = {}) {
  const prefix = input.prefix ?? "foundry-proof";
  return {
    ping(request: FoundryProofPingInput): FoundryProofPingOutput {
      return {
        ok: true,
        capability: "foundry-proof",
        message: `${prefix}:${request.message}`,
      };
    },
  };
}

export type FoundryProofClient = ReturnType<typeof createFoundryProofClient>;
