// @ts-expect-error The Dev service has no bare-root public face.
import * as retiredRootSurface from "@rawr/dev";
// @ts-expect-error The executable router remains private behind client construction.
import type { Router } from "@rawr/dev/client";
import {
  type Client,
  type Config,
  type Contract,
  type CreateClientOptions,
  contract,
  createClient,
  type Deps,
  type DevClockResource,
  type DevCommandStep,
  type DevDirEntry,
  type DevExecResult,
  type DevFileStat,
  type DevFileSystemResource,
  type DevIssue,
  type DevopsAction,
  type DevPathResource,
  type DevPreflight,
  type DevProcessResource,
  type DevResources,
  type RepoSyncUpstreamInput,
  type RepoSyncUpstreamResult,
  type Scope,
  type ScratchPolicyCheck,
  type ScratchPolicyInput,
  type StackDoctorInput,
  type StackDoctorResult,
  type StackDrainInput,
  type StackDrainResult,
  type WorktreeCleanupInput,
  type WorktreeCleanupResult,
} from "@rawr/dev/client";
// @ts-expect-error Dev host types are exposed through the client, not a parallel facade.
import * as retiredResourcesSurface from "@rawr/dev/resources";
// @ts-expect-error The executable router is not a public package axis.
import * as retiredRouterSurface from "@rawr/dev/router";
// @ts-expect-error The contract is re-exported only through the client face.
import * as retiredContractSurface from "@rawr/dev/service/contract";
// @ts-expect-error Dev DTOs are exposed through the client, not a parallel facade.
import * as retiredTypesSurface from "@rawr/dev/types";

type PreservedTypeSurface = {
  client: Client;
  config: Config;
  contract: Contract;
  createClientOptions: CreateClientOptions;
  deps: Deps;
  devClockResource: DevClockResource;
  devCommandStep: DevCommandStep;
  devDirEntry: DevDirEntry;
  devExecResult: DevExecResult;
  devFileStat: DevFileStat;
  devFileSystemResource: DevFileSystemResource;
  devIssue: DevIssue;
  devopsAction: DevopsAction;
  devPathResource: DevPathResource;
  devPreflight: DevPreflight;
  devProcessResource: DevProcessResource;
  devResources: DevResources;
  repoSyncUpstreamInput: RepoSyncUpstreamInput;
  repoSyncUpstreamResult: RepoSyncUpstreamResult;
  scope: Scope;
  scratchPolicyCheck: ScratchPolicyCheck;
  scratchPolicyInput: ScratchPolicyInput;
  stackDoctorInput: StackDoctorInput;
  stackDoctorResult: StackDoctorResult;
  stackDrainInput: StackDrainInput;
  stackDrainResult: StackDrainResult;
  worktreeCleanupInput: WorktreeCleanupInput;
  worktreeCleanupResult: WorktreeCleanupResult;
};

declare const preservedTypeSurface: PreservedTypeSurface;
void preservedTypeSurface;

const publicContract: Contract = contract;
void publicContract;

const constructPublicClient: (options: CreateClientOptions) => Client = createClient;
void constructPublicClient;

void retiredRootSurface;
void retiredResourcesSurface;
void retiredRouterSurface;
void retiredContractSurface;
void retiredTypesSurface;
