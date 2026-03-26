import { stateApiPlugin } from "./plugin";
export {
  type StateApiContext,
  type StateClientResolver,
} from "./context";
export { createStateRouter, type StateApiRouter } from "./router";
export {
  stateApiPlugin,
  type StateApiPluginBound,
  type StateApiPluginRegistration,
} from "./plugin";

/** @deprecated Temporary compatibility shim; import `stateApiPlugin` from `./plugin` instead. */
export function registerStateApiPlugin() {
  return stateApiPlugin;
}
