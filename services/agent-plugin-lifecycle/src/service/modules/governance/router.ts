import {
  createAttestPromotion,
  createResolveCurrentMain,
  createValidateGovernedAcceptance,
  type ExactGitBlobPointer,
  type GitLocator,
} from "./internal";
import { decodeGitLocator, decodeGitPointer } from "./internal/decode";
import { module } from "./module";

const validateAcceptance = module.validateAcceptance.handler(async ({ context, input }) => {
  const decoded = decodeAcceptancePointers(input);
  if (!decoded.ok) {
    return {
      kind: "InvalidAcceptance",
      code: "INVALID_ACCEPTANCE_RECORD",
      reason: decoded.reason,
    };
  }
  return createValidateGovernedAcceptance(context.runtime)(decoded.value);
});

const attestPromotion = module.attestPromotion.handler(async ({ context, input }) => {
  const decoded = decodeAcceptancePointers(input);
  const landed = decodeGitPointer(input.landedReleaseInputObject);
  if (!decoded.ok) {
    return {
      kind: "BlockedRepository",
      state: "WRONG_GIT_OBJECT",
      reason: decoded.reason,
    };
  }
  if (!landed.ok) {
    return {
      kind: "BlockedRepository",
      state: "WRONG_GIT_OBJECT",
      reason: landed.reason,
    };
  }
  const acceptance = await createValidateGovernedAcceptance(context.runtime)(decoded.value);
  if (acceptance.kind !== "GovernedAccepted") return acceptance;
  return createAttestPromotion({ git: context.runtime.git })({
    locator: decoded.value.locator,
    acceptance: acceptance.observation,
    landedReleaseInputObject: landed.value,
  });
});

const resolveCurrentMain = module.resolveCurrentMain.handler(async ({ context, input }) => {
  const locator = decodeGitLocator(input.locator);
  if (!locator.ok) {
    return { kind: "WRONG_REPOSITORY", reason: locator.reason };
  }
  return createResolveCurrentMain(context.runtime)({ locator: locator.value });
});

function decodeAcceptancePointers(input: {
  readonly locator: Parameters<typeof decodeGitLocator>[0];
  readonly policyObject: Parameters<typeof decodeGitPointer>[0];
  readonly requestObject: Parameters<typeof decodeGitPointer>[0];
  readonly acceptanceObject: Parameters<typeof decodeGitPointer>[0];
}):
  | { readonly ok: false; readonly reason: string }
  | {
      readonly ok: true;
      readonly value: {
        readonly locator: GitLocator;
        readonly policyObject: ExactGitBlobPointer;
        readonly requestObject: ExactGitBlobPointer;
        readonly acceptanceObject: ExactGitBlobPointer;
      };
    } {
  const locator = decodeGitLocator(input.locator);
  const policyObject = decodeGitPointer(input.policyObject);
  const requestObject = decodeGitPointer(input.requestObject);
  const acceptanceObject = decodeGitPointer(input.acceptanceObject);
  if (!locator.ok || !policyObject.ok || !requestObject.ok || !acceptanceObject.ok) {
    const reasons: string[] = [];
    if (!locator.ok) reasons.push(locator.reason);
    if (!policyObject.ok) reasons.push(policyObject.reason);
    if (!requestObject.ok) reasons.push(requestObject.reason);
    if (!acceptanceObject.ok) reasons.push(acceptanceObject.reason);
    return {
      ok: false,
      reason: reasons.join("; "),
    };
  }
  return {
    ok: true,
    value: {
      locator: locator.value,
      policyObject: policyObject.value,
      requestObject: requestObject.value,
      acceptanceObject: acceptanceObject.value,
    },
  };
}

export const router = module.router({
  validateAcceptance,
  attestPromotion,
  resolveCurrentMain,
});
