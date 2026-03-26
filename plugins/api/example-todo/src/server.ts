import { exampleTodoApiPlugin } from "./plugin";
export {
  type ExampleTodoApiContext,
  type ExampleTodoClientResolver,
} from "./context";
export { createExampleTodoApiRouter, type ExampleTodoApiRouter } from "./router";
export {
  exampleTodoApiPlugin,
  type ExampleTodoApiPluginBound,
  type ExampleTodoApiPluginRegistration,
} from "./plugin";

/** @deprecated Temporary compatibility shim; import `exampleTodoApiPlugin` from `./plugin` instead. */
export function registerExampleTodoApiPlugin() {
  return exampleTodoApiPlugin;
}
