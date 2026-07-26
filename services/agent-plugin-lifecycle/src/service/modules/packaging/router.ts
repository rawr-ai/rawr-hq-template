import { packageAgentPlugin } from "./router/package.router";

/** Composes the completed packaging operation leaf for the service root router. */
export const router = {
  package: packageAgentPlugin,
};
