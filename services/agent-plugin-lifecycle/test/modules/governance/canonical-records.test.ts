import { describe, expect, it } from "vitest";

import {
  canonicalSerializeAcceptanceEvidence,
  canonicalSerializeAcceptanceRequest,
  canonicalSerializeCurrentMainRecord,
  canonicalSerializeLifecyclePolicy,
  canonicalSerializePromotionAttestation,
  createAcceptanceEvidence,
  createAcceptanceRequest,
  createMechanicalEvidenceHandle,
  createMechanicalEvidenceObservation,
  decodeAcceptanceEvidence,
  decodeAcceptanceRequest,
  decodeCurrentMainRecord,
  decodeLifecyclePolicy,
  decodePromotionAttestation,
} from "../../../src/service/modules/governance/model";
import { digest, mustPromotion, promotionFixture } from "./fixtures";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe("bounded canonical promotion records", () => {
  it("canonicalizes projection and evidence permutations to one request digest", () => {
    const fixture = promotionFixture();
    const reversed = mustPromotion(createAcceptanceRequest({
      ...fixture.request.body,
      projections: [...fixture.request.body.projections].reverse(),
      evidence: [...fixture.request.body.evidence].reverse(),
    }));

    expect(reversed.requestDigest).toBe(fixture.request.requestDigest);
    expect(canonicalSerializeAcceptanceRequest(reversed)).toEqual(
      canonicalSerializeAcceptanceRequest(fixture.request),
    );
  });

  it("rejects duplicate provider bindings even when their claimed digests differ", () => {
    const fixture = promotionFixture();
    const duplicateProvider = {
      ...fixture.projections[0],
      projectionDigest: digest("ap1_", "f"),
    };

    const result = createAcceptanceRequest({
      ...fixture.request.body,
      projections: [fixture.projections[0], duplicateProvider],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.some((entry) => entry.code === "DUPLICATE_BINDING")).toBe(true);
  });

  it("rejects missing, extra, and oversized bindings", () => {
    const fixture = promotionFixture();
    expect(createAcceptanceRequest({ ...fixture.request.body, evidence: [] }).ok).toBe(false);
    expect(createAcceptanceRequest({ ...fixture.request.body, unexpectedAuthority: true }).ok).toBe(false);

    const tooManyHandles = Array.from({ length: 129 }, (_, index) => mustPromotion(
      createMechanicalEvidenceHandle({
        protocol: "agent-plugin-mechanical-evidence/v1",
        digest: `me1_${index.toString(16).padStart(64, "0")}`,
        byteLength: 1,
      }),
    ));
    const oversized = createAcceptanceRequest({ ...fixture.request.body, evidence: tooManyHandles });
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) expect(oversized.issues.some((entry) => entry.code === "COUNT_LIMIT_EXCEEDED")).toBe(true);
  });

  it("persists one explicit GitHub pull request without admitting ambient revision inference", () => {
    const fixture = promotionFixture();
    expect(fixture.request.body.hostedApproval).toEqual({
      provider: "github",
      pullRequest: 42,
    });
    const anotherPullRequest = createAcceptanceRequest({
      ...fixture.request.body,
      hostedApproval: { provider: "github", pullRequest: 43 },
    });
    expect(anotherPullRequest.ok).toBe(true);
    if (anotherPullRequest.ok) {
      expect(anotherPullRequest.value.requestDigest).not.toBe(fixture.request.requestDigest);
    }
    expect(createAcceptanceRequest({
      ...fixture.request.body,
      hostedApproval: { provider: "graphite", pullRequest: 42 },
    }).ok).toBe(false);
    expect(createAcceptanceRequest({
      ...fixture.request.body,
      hostedApproval: { provider: "github", pullRequest: 0 },
    }).ok).toBe(false);
    expect(createAcceptanceRequest({
      ...fixture.request.body,
      hostedApproval: {
        provider: "github",
        pullRequest: 42,
        revision: fixture.acceptanceObject.commit,
      },
    }).ok).toBe(false);
  });

  it("rejects the superseded acceptance-request v1 envelope", () => {
    const fixture = promotionFixture();
    expect(createAcceptanceRequest({
      ...fixture.request.body,
      schemaVersion: 1,
    }).ok).toBe(false);
  });

  it("rejects altered and noncanonical request bytes", () => {
    const fixture = promotionFixture();
    const wire = JSON.parse(decoder.decode(canonicalSerializeAcceptanceRequest(fixture.request))) as {
      body: { evaluationProfile: string; evidence: unknown[] };
    };
    wire.body.evaluationProfile = "another-evaluation-v1";
    const altered = encoder.encode(`${JSON.stringify(wire)}\n`);
    expect(decodeAcceptanceRequest(altered).ok).toBe(false);

    const reordered = JSON.parse(decoder.decode(canonicalSerializeAcceptanceRequest(fixture.request))) as {
      body: { evidence: unknown[] };
    };
    reordered.body.evidence.reverse();
    expect(decodeAcceptanceRequest(encoder.encode(`${JSON.stringify(reordered)}\n`)).ok).toBe(false);
  });

  it("requires the exact independent issuer protocol", () => {
    const fixture = promotionFixture();
    const result = createAcceptanceEvidence({
      ...fixture.acceptance.body,
      issuerProtocol: "ordinary-worker/v1",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects noncanonical and duplicate verified target-fact ordering", () => {
    const fixture = promotionFixture();
    const targets = [
      ...fixture.observations[0]!.targets,
      ...fixture.observations[1]!.targets,
    ];
    const base = {
      handle: fixture.handles[0],
      releaseSetDigest: fixture.request.body.releaseSetDigest,
      projections: fixture.projections,
      evaluationProfile: fixture.request.body.evaluationProfile,
    };

    expect(createMechanicalEvidenceObservation({ ...base, targets: [...targets].reverse() }).ok).toBe(false);
    expect(createMechanicalEvidenceObservation({ ...base, targets: [targets[0], targets[0]] }).ok).toBe(false);
  });

  it("round-trips every canonical governance record with its digest intact", () => {
    const fixture = promotionFixture();
    const records = [
      decodeLifecyclePolicy(canonicalSerializeLifecyclePolicy(fixture.policy)),
      decodeAcceptanceRequest(canonicalSerializeAcceptanceRequest(fixture.request)),
      decodeAcceptanceEvidence(canonicalSerializeAcceptanceEvidence(fixture.acceptance)),
      decodePromotionAttestation(canonicalSerializePromotionAttestation(fixture.promotion)),
      decodeCurrentMainRecord(canonicalSerializeCurrentMainRecord(fixture.currentMain)),
    ];
    expect(records.every((result) => result.ok)).toBe(true);
  });
});
