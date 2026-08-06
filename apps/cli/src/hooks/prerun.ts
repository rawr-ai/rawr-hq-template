import type { Hook } from "@oclif/core";

import { readRawrCliCommandTelemetry } from "../process-telemetry.js";

/** Opens one product event only after Oclif has resolved the command class. */
const prerun: Hook.Prerun = async ({ argv, Command }) => {
  await readRawrCliCommandTelemetry()?.begin({
    argvCount: argv.length,
    commandId: Command.id,
    ...(Command.pluginName === undefined ? {} : { pluginName: Command.pluginName }),
  });
};

export default prerun;
