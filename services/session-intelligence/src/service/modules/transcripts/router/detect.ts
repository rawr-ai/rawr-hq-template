import { detectSessionFormat } from "../../../model/policy";
import { module } from "../module";

/** Detects the provider-native grammar of one session record. */
export const detect = module.detect.handler(async ({ context, input }) => ({
  source: await detectSessionFormat(context.sourceRuntime, input.path),
}));
