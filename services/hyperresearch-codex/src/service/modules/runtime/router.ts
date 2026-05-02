/**
 * @fileoverview Runtime module router for Hyperresearch Codex orchestration.
 */
import { runSyntheticHyperresearchCodexSlice } from "./runner";
import { module } from "./module";

const runSyntheticSlice = module.runSyntheticSlice.handler(async ({ context, input }) => {
  return await runSyntheticHyperresearchCodexSlice({
    ...input,
    io: context.io,
    cli: context.cli,
  });
});

export const router = module.router({
  runSyntheticSlice,
});
