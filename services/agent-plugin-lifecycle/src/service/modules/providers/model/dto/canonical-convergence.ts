import type { NonEmptyReadonlyArray, ProviderDeploymentIssue } from "../errors/deployment-result";
import type { ProviderMarketplaceRegistration } from "../policy/marketplace";
import type { AgentProviderProjection, CapabilityObservation } from "../policy/projection";
import type {
  NativeConfiguredExposureObservation,
  NativeProviderMutationAction,
  NativeStandaloneExposureObservation,
  ProviderInventory,
} from "../policy/state-machine";
import type { CanonicalDesiredState } from "./canonical-desired-state";
import type { ProviderTarget } from "./provider-target";

export type CanonicalNativeConvergenceStatus =
  | "BLOCKED_COLLISION"
  | "CONVERGED"
  | "DRIFTED"
  | "INCOMPATIBLE_PROVIDER";

/** Adds the desired-state refusal emitted by the next private resolver node. */
export type CanonicalConvergenceStatus = "BLOCKED_SELECTION" | CanonicalNativeConvergenceStatus;

export type CanonicalNativeMutationAction =
  | Readonly<
      Omit<
        Extract<NativeProviderMutationAction, { kind: "SetMarketplace" }>,
        "registration" | "role"
      > & {
        role: "final";
        registration: ProviderMarketplaceRegistration;
      }
    >
  | RequireActiveMarketplace<
      Extract<
        NativeProviderMutationAction,
        {
          kind: "EnableMember" | "InstallMember" | "RetireMember";
        }
      >
    >
  | Readonly<{
      kind: "RetireConfiguredExposure";
      target: ProviderTarget;
      activeMarketplace: ProviderMarketplaceRegistration;
      exposure: NativeConfiguredExposureObservation;
    }>;

type RequireActiveMarketplace<TAction> = TAction extends { activeMarketplace: unknown }
  ? Readonly<
      Omit<TAction, "activeMarketplace"> & {
        activeMarketplace: ProviderMarketplaceRegistration;
      }
    >
  : never;

export type CanonicalConvergenceStep =
  | Readonly<{ kind: "mutate"; action: CanonicalNativeMutationAction }>
  | Readonly<{
      kind: "verify-retired";
      target: ProviderTarget;
      nativeIdentity: string;
      providerSourceIdentity: string;
    }>
  | Readonly<{
      kind: "verify-configured-retired";
      target: ProviderTarget;
      exposureIdentity: string;
      providerSourceIdentity: string;
    }>
  | Readonly<{
      kind: "verify-selected" | "verify-final";
      target: ProviderTarget;
      projection: AgentProviderProjection;
    }>;

export type CanonicalVerificationStep = Exclude<
  CanonicalConvergenceStep,
  { readonly kind: "mutate" }
>;

export type CanonicalNativeObservation =
  | Readonly<{ kind: "observed"; inventory: ProviderInventory }>
  | Readonly<{
      kind: "ambiguous-provenance";
      target: ProviderTarget;
      reason: string;
    }>;

interface CanonicalConvergencePlanBase {
  readonly target: ProviderTarget;
  readonly projection: AgentProviderProjection;
}

export interface CanonicalRefusedConvergencePlan extends CanonicalConvergencePlanBase {
  readonly status: Exclude<CanonicalNativeConvergenceStatus, "CONVERGED" | "DRIFTED">;
  readonly steps: readonly [];
  readonly issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>;
}

export interface CanonicalObservedConvergencePlan extends CanonicalConvergencePlanBase {
  readonly status: Extract<CanonicalNativeConvergenceStatus, "CONVERGED" | "DRIFTED">;
  readonly steps: readonly CanonicalConvergenceStep[];
  readonly issues: readonly [];
}

export type CanonicalConvergencePlan =
  | CanonicalObservedConvergencePlan
  | CanonicalRefusedConvergencePlan;

export interface PlanCanonicalConvergenceInput {
  readonly desired: CanonicalDesiredState;
  readonly observation: CanonicalNativeObservation;
  readonly capabilities: CapabilityObservation;
}

interface CanonicalExecutionResultBase {
  readonly target: ProviderTarget;
  readonly appliedPrefix: readonly CanonicalNativeMutationAction[];
  readonly verifiedSteps: readonly CanonicalVerificationStep[];
}

export type CanonicalExecutionResult =
  | Readonly<
      CanonicalExecutionResultBase & {
        kind: "completed";
        finalInventory: ProviderInventory;
      }
    >
  | Readonly<
      CanonicalExecutionResultBase & {
        kind: "failed";
        issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>;
      }
    >
  | Readonly<
      CanonicalExecutionResultBase & {
        kind: "uncertain";
        attempted: CanonicalNativeMutationAction;
        lastKnown: "bridge-invoked" | "bridge-returned";
        issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>;
      }
    >;
