import {
  type CreateClientOptions as CoordinationCreateClientOptions,
  createClient as createCoordinationClient,
  type Client as CoordinationClient,
} from "../client";
import type { BaseDeps } from "@rawr/hq-sdk";

export type Deps = Pick<BaseDeps, "logger" | "analytics">;
export type Scope = CoordinationCreateClientOptions["scope"];
export type Config = CoordinationCreateClientOptions["config"];
export type CreateAuthoringClientOptions = {
  deps: Deps;
  scope: Scope;
  config: Config;
};

/**
 * Create a narrow in-process client for workflow authoring by projecting the
 * canonical coordination client to its `workflows` subtree.
 */
export function createAuthoringClient(boundary: CreateAuthoringClientOptions) {
  return createCoordinationClient(boundary as CoordinationCreateClientOptions).workflows;
}

export type AuthoringClient = CoordinationClient["workflows"];
