import fs from "node:fs/promises";
import path from "node:path";

import {
  NodeQualifiedWritePort,
  executeAuthoringPlan,
  rejectedAuthoringResult,
  verifiedDestinationRoot,
  type AuthoringExecutionResult,
  type QualifiedWritePort,
  type VerifiedDestinationRoot,
} from "../shared";
import type { ExternalExtensionAuthoringRequest } from "./request";
import { externalExtensionWritePlan } from "./template";

export type ExternalExtensionDestinationVerifier = (
  destination: string,
  operatorCwd: string
) => Promise<VerifiedDestinationRoot>;

export async function authorExternalExtension(
  request: ExternalExtensionAuthoringRequest,
  dependencies: Readonly<{
    verifyDestination?: ExternalExtensionDestinationVerifier;
    port?: QualifiedWritePort;
  }> = {}
): Promise<AuthoringExecutionResult> {
  try {
    const root = await (dependencies.verifyDestination ?? verifyExternalExtensionDestination)(
      request.destination,
      request.operatorCwd
    );
    return await executeAuthoringPlan({
      plan: externalExtensionWritePlan(root, request),
      dryRun: request.dryRun,
      port: dependencies.port ?? new NodeQualifiedWritePort(),
    });
  } catch (error) {
    return rejectedAuthoringResult([
      Object.freeze({
        code: "INVALID_DESTINATION",
        path: "destination",
        message: errorMessage(error),
      }),
    ]);
  }
}

export async function verifyExternalExtensionDestination(
  destination: string,
  operatorCwd: string
): Promise<VerifiedDestinationRoot> {
  const root = path.resolve(destination);
  const baseline = deepestCommonAncestor(path.resolve(operatorCwd), root);
  const canonicalBaseline = await fs.realpath(baseline);
  let existingAncestor = root;
  while (true) {
    try {
      const stat = await fs.lstat(existingAncestor);
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new Error(
          "Extension destination must not cross a non-directory or symbolic-link ancestor"
        );
      }
      break;
    } catch (error) {
      if (!isMissing(error)) throw error;
      const parent = path.dirname(existingAncestor);
      if (parent === existingAncestor) throw error;
      existingAncestor = parent;
    }
  }

  const canonicalAncestor = await fs.realpath(existingAncestor);
  const expectedAncestor = path.resolve(
    canonicalBaseline,
    path.relative(baseline, existingAncestor)
  );
  if (canonicalAncestor !== expectedAncestor) {
    throw new Error(
      "Extension destination must use a canonical path without symbolic-link ancestors"
    );
  }
  return verifiedDestinationRoot(path.resolve(canonicalBaseline, path.relative(baseline, root)));
}

function deepestCommonAncestor(left: string, right: string): string {
  let candidate = left;
  while (!contains(candidate, right)) {
    const parent = path.dirname(candidate);
    if (parent === candidate) return parent;
    candidate = parent;
  }
  return candidate;
}

function contains(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
