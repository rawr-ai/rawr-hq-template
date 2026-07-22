import { bindVerifiedControllerReentryAuthority } from "@rawr/core";
import { createGuardedExternalConfiguration } from "../external-extensions/bootstrap";
import { NativePluginSubprocessPort } from "../external-extensions/native-subprocess";
import { NodeExternalExtensionPreparationPort } from "../external-extensions/node-preparation";
import { ExternalExtensionService } from "../external-extensions/service";
import { reservedSurfaceFromControllerManifest } from "./reserved-surface";
import { type ControllerRuntimeContext, restoreControllerOperatorContext } from "./runtime-context";

export async function prepareControllerInvocation(input: {
  argv: readonly string[];
  context: ControllerRuntimeContext;
}) {
  bindVerifiedControllerReentryAuthority({
    runtimePath: input.context.runtimePath,
    entryPath: input.context.entryPath,
    releaseRoot: input.context.releaseRoot,
    dataRoot: input.context.dataRoot,
    controllerDigest: input.context.digest,
    operatorCwd: input.context.operator.cwd,
    operatorHome: input.context.operator.home,
    operatorConfigHome: input.context.operator.xdgConfigHome,
  });
  restoreControllerOperatorContext(input.context.operator);
  const reserved = reservedSurfaceFromControllerManifest(input.context.manifest);
  return await createGuardedExternalConfiguration({
    argv: input.argv,
    cliRoot: input.context.cliRoot,
    reserved,
    expectedDataDir: input.context.dataRoot,
    createRuntime: ({ base, state }) =>
      new ExternalExtensionService(
        state,
        new NodeExternalExtensionPreparationPort(reserved),
        new NativePluginSubprocessPort(input.context, base.dataDir)
      ),
  });
}
