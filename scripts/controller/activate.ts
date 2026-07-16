import { constants } from "node:fs";
import { lstat, realpath } from "node:fs/promises";
import { join } from "node:path";

import {
  createControllerSelection,
  planControllerSelection,
  type ControllerIssue,
} from "@rawr/controller-release";

import {
  assertAbsolutePath,
  assertCanonicalContainedParent,
} from "./lib/filesystem.ts";
import {
  CONTROLLER_ENTRY_PATH,
  CONTROLLER_DEPENDENCY_LOCK_PATH,
  CONTROLLER_RUNTIME_LICENSE_PATH,
  CONTROLLER_RUNTIME_PATH,
  controllerReleasePath,
  controllerSelectorPath,
} from "./layout.ts";
import {
  nodeControllerSelectorStore,
  type ControllerSelectorStore,
} from "./selector-store.ts";

export type ControllerActivationResult = Readonly<{
  kind: "activated" | "converged";
  controllerDigest: string;
  releaseRoot: string;
  selectorPath: string;
  replaced: "missing" | "invalid" | "different" | null;
  selectorDurability: "unchanged" | "confirmed" | "unconfirmed";
}>;

export type ControllerActivationInspection = Readonly<{
  kind: "converged" | "replacement-required";
  controllerDigest: string;
  releaseRoot: string;
  selectorPath: string;
  replaced: "missing" | "invalid" | "different" | null;
}>;

type ControllerActivationPlan =
  | Readonly<{
      kind: "converged";
      controllerDigest: string;
      releaseRoot: string;
      selectorPath: string;
      replaced: null;
    }>
  | Readonly<{
      kind: "replacement-required";
      controllerDigest: string;
      releaseRoot: string;
      selectorPath: string;
      replaced: "missing" | "invalid" | "different";
      bytes: Uint8Array;
    }>;

function describeIssues(issues: readonly ControllerIssue[]): string {
  return issues.map((entry) => `${entry.path}: ${entry.message}`).join("; ");
}

async function verifyRequiredReleaseFiles(releaseRoot: string): Promise<void> {
  const releaseStatus = await lstat(releaseRoot);
  if (!releaseStatus.isDirectory()) {
    throw new Error(`controller release root is not a directory: ${releaseRoot}`);
  }

  const runtimePath = join(releaseRoot, CONTROLLER_RUNTIME_PATH);
  const runtimeStatus = await lstat(runtimePath);
  if (!runtimeStatus.isFile() || (runtimeStatus.mode & constants.S_IXUSR) === 0) {
    throw new Error(`controller runtime is not an executable file: ${runtimePath}`);
  }

  const entryPath = join(releaseRoot, CONTROLLER_ENTRY_PATH);
  const entryStatus = await lstat(entryPath);
  if (!entryStatus.isFile()) {
    throw new Error(`controller entry is not a regular file: ${entryPath}`);
  }

  const licensePath = join(releaseRoot, CONTROLLER_RUNTIME_LICENSE_PATH);
  const licenseStatus = await lstat(licensePath);
  if (!licenseStatus.isFile()) {
    throw new Error(`controller runtime license is not a regular file: ${licensePath}`);
  }

  const dependencyLockPath = join(releaseRoot, CONTROLLER_DEPENDENCY_LOCK_PATH);
  const dependencyLockStatus = await lstat(dependencyLockPath);
  if (!dependencyLockStatus.isFile()) {
    throw new Error(`controller dependency lock is not a regular file: ${dependencyLockPath}`);
  }
}

async function inspectControllerActivationPlan(options: {
  dataRoot: string;
  controllerDigest: string;
  verifyRelease: (releaseRoot: string, expectedDigest: string) => Promise<void>;
  selectorStore?: ControllerSelectorStore;
}): Promise<ControllerActivationPlan> {
  assertAbsolutePath(options.dataRoot, "controller data root");
  const dataRoot = await realpath(options.dataRoot);
  const candidate = createControllerSelection(options.controllerDigest);
  if (!candidate.ok) {
    throw new Error(`invalid controller selection: ${describeIssues(candidate.issues)}`);
  }

  const releaseRoot = controllerReleasePath(
    dataRoot,
    candidate.value.controllerDigest,
  );
  await assertCanonicalContainedParent(
    dataRoot,
    releaseRoot,
    "controller release",
  );
  await verifyRequiredReleaseFiles(releaseRoot);
  await options.verifyRelease(releaseRoot, candidate.value.controllerDigest);

  const selectorPath = controllerSelectorPath(dataRoot);
  await assertCanonicalContainedParent(
    dataRoot,
    selectorPath,
    "controller selector",
  );
  const selectorStore = options.selectorStore ?? nodeControllerSelectorStore;
  const current = await selectorStore.read(selectorPath);
  const currentBytes = current.kind === "regular"
    ? current.bytes
    : current.kind === "missing"
      ? null
      : new Uint8Array();
  const selectionPlan = planControllerSelection(currentBytes, candidate.value);
  if (selectionPlan.kind === "converged") {
    return Object.freeze({
      kind: "converged",
      controllerDigest: candidate.value.controllerDigest,
      releaseRoot,
      selectorPath,
      replaced: null,
    });
  }

  return Object.freeze({
    kind: "replacement-required",
    controllerDigest: candidate.value.controllerDigest,
    releaseRoot,
    selectorPath,
    replaced: selectionPlan.reason,
    bytes: selectionPlan.bytes,
  });
}

export async function inspectControllerActivation(options: {
  dataRoot: string;
  controllerDigest: string;
  verifyRelease: (releaseRoot: string, expectedDigest: string) => Promise<void>;
  selectorStore?: ControllerSelectorStore;
}): Promise<ControllerActivationInspection> {
  const plan = await inspectControllerActivationPlan(options);
  return Object.freeze({
    kind: plan.kind,
    controllerDigest: plan.controllerDigest,
    releaseRoot: plan.releaseRoot,
    selectorPath: plan.selectorPath,
    replaced: plan.replaced,
  });
}

export async function activateControllerRelease(options: {
  dataRoot: string;
  controllerDigest: string;
  verifyRelease: (releaseRoot: string, expectedDigest: string) => Promise<void>;
  selectorStore?: ControllerSelectorStore;
}): Promise<ControllerActivationResult> {
  const selectorStore = options.selectorStore ?? nodeControllerSelectorStore;
  const plan = await inspectControllerActivationPlan({ ...options, selectorStore });
  if (plan.kind === "converged") {
    return Object.freeze({
      kind: "converged",
      controllerDigest: plan.controllerDigest,
      releaseRoot: plan.releaseRoot,
      selectorPath: plan.selectorPath,
      replaced: null,
      selectorDurability: "unchanged",
    });
  }

  const dataRoot = await realpath(options.dataRoot);
  const replacement = await selectorStore.replace(dataRoot, plan.selectorPath, plan.bytes);
  return Object.freeze({
    kind: "activated",
    controllerDigest: plan.controllerDigest,
    releaseRoot: plan.releaseRoot,
    selectorPath: plan.selectorPath,
    replaced: plan.replaced,
    selectorDurability: replacement.durability,
  });
}
