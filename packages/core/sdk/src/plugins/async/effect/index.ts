import {
  type AsyncStepBridgeContext,
  type AsyncStepMembership,
  type AsyncStepRunner,
  readAsyncStepBridge,
} from "../../../../../runtime/definition/src/async-context";

export type {
  AsyncStepBridgeContext as AsyncStepBridgeInput,
  AsyncStepResult,
  AsyncStepRunner as AsyncStepEffectFacade,
} from "../../../../../runtime/definition/src/async-context";
export type {
  AsyncStepEffectDescriptor,
  AsyncStepExecutionContext,
} from "../../../../../runtime/definition/src/execution";
export { defineAsyncStepEffect } from "../../../../../runtime/definition/src/execution";

export function stepEffect<TSteps extends AsyncStepMembership>(
  context: AsyncStepBridgeContext<TSteps>
): AsyncStepRunner<TSteps> {
  return readAsyncStepBridge(context);
}
