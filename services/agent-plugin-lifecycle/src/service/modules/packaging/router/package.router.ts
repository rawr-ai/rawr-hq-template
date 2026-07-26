import { Effect } from "effect";

import { deriveReleaseSelection } from "#agent-plugin-lifecycle-service/model/policy/release-derivation";
import { COWORK_PACKAGE_FORMAT } from "../model/dto/packaging-lifecycle";
import { coworkV1PackageDigest, createCoworkV1ArchiveRequest } from "../model/helpers/cowork-v1";
import { priorOutputObservationLimit } from "../model/policy/package-output";
import {
  createPackagingFailure,
  externalErrorDetail,
  externalErrorMessage,
  mapPackageOutputFailure,
  packagedReleaseIdentity,
  rejectedPackagingResult,
  sourceIssueMessage,
} from "../model/policy/package-result";
import { module } from "../module";

/**
 * @purpose Render and publish one deterministic package from exact reviewed content.
 * @capability Consume the module-provided clean source and package-output ports.
 * @behavior Inspect, derive, encode, revalidate, publish, and classify one closed result.
 * @relation Keep Packaging's transition inside its authored router rather than model policy.
 */
export const router = {
  package: module.package.effect(({ context, input: request }) =>
    Effect.gen(function* () {
      const inspectedAttempt = yield* Effect.result(
        context.source.inspect(request.contentWorkspace)
      );
      if (inspectedAttempt._tag === "Failure") {
        return rejectedPackagingResult(
          createPackagingFailure(
            "SourceReadFailed",
            "source-inspect",
            `Content source inspection failed without a closed result: ${externalErrorMessage(
              inspectedAttempt.failure
            )}`
          )
        );
      }
      const inspected = inspectedAttempt.success;
      if (inspected.kind === "Ineligible") {
        return rejectedPackagingResult(
          createPackagingFailure(
            "SourceIneligible",
            "source-inspect",
            sourceIssueMessage(inspected.issues)
          )
        );
      }

      const derivation = deriveReleaseSelection(inspected.snapshot, request.mode);
      if (!derivation.ok) {
        return rejectedPackagingResult(
          createPackagingFailure(
            "ReleaseConstructionFailed",
            "release-construct",
            "ReleaseConstruction"
          )
        );
      }

      const encodedAttempt = yield* Effect.result(
        Effect.tryPromise({
          try: () =>
            context.packageOutput.encodeCoworkV1(createCoworkV1ArchiveRequest(derivation.value)),
          catch: (cause) => cause,
        })
      );
      if (encodedAttempt._tag === "Failure") {
        return rejectedPackagingResult(
          createPackagingFailure(
            "PackageRenderFailed",
            "package-render",
            `Cowork v1 rendering failed: ${externalErrorDetail(encodedAttempt.failure)}`
          )
        );
      }
      const bytes = encodedAttempt.success;

      const revalidatedAttempt = yield* Effect.result(
        context.source.revalidate(request.contentWorkspace, inspected.snapshot.eligibilityBinding)
      );
      if (revalidatedAttempt._tag === "Failure") {
        return rejectedPackagingResult(
          createPackagingFailure(
            "SourceReadFailed",
            "source-revalidate",
            `Content source revalidation failed without a closed result: ${externalErrorMessage(
              revalidatedAttempt.failure
            )}`
          )
        );
      }
      const revalidated = revalidatedAttempt.success;
      if (revalidated.kind === "Ineligible") {
        return rejectedPackagingResult(
          createPackagingFailure(
            "SourceIneligible",
            "source-revalidate",
            sourceIssueMessage(revalidated.issues)
          )
        );
      }

      const packageDigest = coworkV1PackageDigest(bytes);
      const identity = {
        repositoryIdentity: inspected.snapshot.repositoryIdentity,
        sourceCommit: inspected.snapshot.sourceCommit,
        sourceTree: inspected.snapshot.sourceTree,
        release: packagedReleaseIdentity(derivation.value),
        format: COWORK_PACKAGE_FORMAT,
        outputPath: request.outputPath,
        packageDigest,
      } as const;
      const outputAttempt = yield* Effect.result(
        Effect.uninterruptible(
          Effect.tryPromise({
            try: () =>
              context.packageOutput.publish({
                outputPath: request.outputPath,
                bytes: new Uint8Array(bytes),
                maxPriorOutputBytes: priorOutputObservationLimit(bytes.byteLength),
              }),
            catch: (cause) => cause,
          })
        )
      );
      if (outputAttempt._tag === "Failure") {
        return {
          kind: "OutputUnsettled",
          primaryFailure: createPackagingFailure(
            "OutputVerifyFailed",
            "output-port",
            `Atomic output port failed without a closed result: ${externalErrorDetail(
              outputAttempt.failure
            )}`
          ),
          ...identity,
        };
      }
      const output = outputAttempt.success;
      switch (output.kind) {
        case "RejectedBeforeOutputMutation":
          return {
            kind: output.kind,
            primaryFailure: mapPackageOutputFailure(output.primaryFailure),
            ...(output.cleanupFailure === undefined
              ? {}
              : { cleanupFailure: mapPackageOutputFailure(output.cleanupFailure, true) }),
          };
        case "ReadOnlyConverged":
          return { kind: output.kind, ...identity };
        case "OutputReplacedVerified":
          return { kind: output.kind, priorOutput: output.priorOutput, ...identity };
        case "OutputUnsettled":
          return {
            kind: output.kind,
            primaryFailure: mapPackageOutputFailure(output.primaryFailure),
            ...(output.cleanupFailure === undefined
              ? {}
              : { cleanupFailure: mapPackageOutputFailure(output.cleanupFailure, true) }),
            ...identity,
          };
      }
    })
  ),
};
