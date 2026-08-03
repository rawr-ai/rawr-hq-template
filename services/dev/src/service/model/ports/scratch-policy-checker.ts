import type { ScratchPolicyCheck, ScratchPolicyInput } from "../dto/scratch-policy.dto";

/** Ready service capability that observes and evaluates one scratch-policy request. */
export type ScratchPolicyChecker = (request?: ScratchPolicyInput) => Promise<ScratchPolicyCheck>;
