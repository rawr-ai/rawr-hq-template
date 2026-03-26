import { coordinationApiPlugin } from "./plugin";
export {
  createCoordinationApiRouter,
  type CoordinationApiContext,
  type CoordinationWorkflowClientResolver,
  type CoordinationApiRouter,
} from "./router";
export {
  coordinationApiPlugin,
  type CoordinationApiPluginBound,
  type CoordinationApiPluginRegistration,
} from "./plugin";

/** @deprecated Temporary compatibility shim; import `coordinationApiPlugin` from `./plugin` instead. */
export function registerCoordinationApiPlugin() {
  return coordinationApiPlugin;
}
