/**
 * @fileoverview Runtime module router for Hyperresearch Codex orchestration.
 */
import { runSyntheticHyperresearchCodexSlice } from "./runner";
import {
  advanceV8HyperresearchRun,
  inspectV8HyperresearchRun,
  startV8HyperresearchRun,
  validateV8HyperresearchRun,
} from "./v8-runner";
import { module } from "./module";

const runSyntheticSlice = module.runSyntheticSlice.handler(async ({ context, input }) => {
  return await runSyntheticHyperresearchCodexSlice(input, {
    io: context.io,
    cli: context.cli,
  });
});

const startV8Run = module.startV8Run.handler(async ({ context, input }) => {
  return await startV8HyperresearchRun(input, {
    io: context.io,
    cli: context.cli,
  });
});

const advanceV8Run = module.advanceV8Run.handler(async ({ context, input }) => {
  return await advanceV8HyperresearchRun(input, {
    io: context.io,
    cli: context.cli,
  });
});

const inspectV8Run = module.inspectV8Run.handler(async ({ context, input }) => {
  return await inspectV8HyperresearchRun(input, {
    io: context.io,
  });
});

const validateV8Run = module.validateV8Run.handler(async ({ context, input }) => {
  return await validateV8HyperresearchRun(input, {
    io: context.io,
  });
});

export const router = module.router({
  runSyntheticSlice,
  startV8Run,
  advanceV8Run,
  inspectV8Run,
  validateV8Run,
});
