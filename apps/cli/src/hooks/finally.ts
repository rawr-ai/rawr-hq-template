import type { Hook } from "@oclif/core";

import { classifyRawrCliCommandOutcome } from "../command-telemetry.js";
import { readRawrCliCommandTelemetry } from "../process-telemetry.js";

/** Finalizes the admitted command event for every native Oclif terminal path. */
const finallyHook: Hook.Finally = async ({ error }) => {
  await readRawrCliCommandTelemetry()?.finish(classifyRawrCliCommandOutcome(error));
};

export default finallyHook;
