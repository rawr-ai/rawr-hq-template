import {
  defineServicePackage,
  type InferConfig,
  type InferDeps,
  type InferScope,
  type ServicePackageBoundary,
} from "@rawr/hq-sdk/boundary";
import { router } from "./router";
import type {
  ConsolidateWorkspaceResult as ConsolidateWorkspaceResultValue,
  InitWorkspaceResult as InitWorkspaceResultValue,
} from "./service/modules/corpus/types";

const servicePackage = defineServicePackage(router);

export type Deps = InferDeps<typeof router>;
export type Scope = InferScope<typeof router>;
export type Config = InferConfig<typeof router>;
export type CreateClientOptions = ServicePackageBoundary<typeof router>;

export type InitWorkspaceInput = {
  workspaceRoot: string;
};

export type ConsolidateWorkspaceInput = {
  workspaceRoot: string;
};

export type InitWorkspaceResult = InitWorkspaceResultValue;
export type ConsolidateWorkspaceResult = ConsolidateWorkspaceResultValue;

export function createClient(boundary: CreateClientOptions) {
  return servicePackage.createClient(boundary);
}

export type Client = ReturnType<typeof createClient>;
