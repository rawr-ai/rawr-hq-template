import { parseContentDigest } from "../../shared/release/primitives";
import type { CanonicalJsonValue } from "../dto/canonical-json";
import { MAX_CANONICAL_ID_BYTES } from "../dto/release-identity";
import { MAX_PROVENANCE_BINDINGS, type ProvenanceBinding } from "../dto/release-input";
import type { ReleaseIssue } from "../dto/release-issue";
import { compareCanonicalText } from "./canonical-text-ordering";
import { parseOwnershipIdentity } from "./release-identity";
import { releaseIssue } from "./release-issue";
import { collectReleaseResult } from "./release-result";
import {
  admitClosedRecordForTraversal,
  parseBoundedArray,
  parseCanonicalString,
} from "./release-value-admission";

/**
 * Admits one provenance collection before it contributes to release identity.
 *
 * Canonical ordering, duplicate refusal, and freezing keep release-input,
 * individual-release, and complete-set records deterministic from the same
 * declared bindings.
 */
export function parseProvenanceBindings(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): readonly ProvenanceBinding[] | undefined {
  const values = parseBoundedArray(input, path, MAX_PROVENANCE_BINDINGS, issues);
  if (values === undefined) return undefined;
  const bindings: ProvenanceBinding[] = [];
  values.forEach((candidate, index) => {
    const bindingPath = `${path}[${index}]`;
    if (
      !admitClosedRecordForTraversal(
        candidate,
        ["contentDigest", "id", "protocol"],
        bindingPath,
        issues
      )
    )
      return;
    const id = collectReleaseResult(
      parseOwnershipIdentity(candidate.id, `${bindingPath}.id`),
      issues
    );
    const protocol = parseCanonicalString(candidate.protocol, `${bindingPath}.protocol`, issues, {
      maxBytes: MAX_CANONICAL_ID_BYTES,
      pattern: /^[a-z0-9][a-z0-9._:@/-]*$/u,
    });
    const digest = collectReleaseResult(
      parseContentDigest(candidate.contentDigest, `${bindingPath}.contentDigest`),
      issues
    );
    if (id !== undefined && protocol !== undefined && digest !== undefined) {
      bindings.push(Object.freeze({ id, protocol, contentDigest: digest }));
    }
  });
  bindings.sort(compareBindings);
  for (let index = 1; index < bindings.length; index += 1) {
    if (bindings[index - 1]!.id === bindings[index]!.id) {
      issues.push(
        releaseIssue(
          "DUPLICATE_VALUE",
          path,
          `Duplicate provenance binding: ${bindings[index]!.id}`
        )
      );
    }
  }
  return Object.freeze(bindings);
}

/** Projects an admitted binding for canonical release-record encoding. */
export function provenanceBindingValue(binding: ProvenanceBinding): CanonicalJsonValue {
  return {
    id: binding.id,
    protocol: binding.protocol,
    contentDigest: binding.contentDigest,
  };
}

function compareBindings(left: ProvenanceBinding, right: ProvenanceBinding): number {
  return (
    compareCanonicalText(left.id, right.id) ||
    compareCanonicalText(left.protocol, right.protocol) ||
    compareCanonicalText(left.contentDigest, right.contentDigest)
  );
}
