import { createHash } from "node:crypto";
import path from "node:path";

import type {
  CandidateInspection,
  QuarantineCode,
  QuarantinedExternalExtension,
  ReservedControllerSurface,
  StaticExternalExtension,
} from "./model";
import { parseCommandManifest, parsePackageManifest } from "./manifest-parser";
import { findReservedSurfaceCollisions } from "./reserved-surface";
import type { StaticEvidencePort, StaticEvidenceResult } from "./static-evidence";

type StaticManifestInput = {
  root: string;
  expectedPackageId?: string;
  reserved: ReservedControllerSurface;
  evidence: StaticEvidencePort;
};

export async function inspectStaticExternalExtension(
  input: StaticManifestInput
): Promise<CandidateInspection> {
  const canonicalRootResult = await input.evidence.canonicalPath(input.root);
  if (!canonicalRootResult.ok) {
    return rejected(
      input.expectedPackageId ?? input.root,
      input.root,
      canonicalRootResult.error.kind === "missing" ? "root-missing" : "root-unreadable",
      canonicalRootResult.error.message
    );
  }

  const canonicalRoot = canonicalRootResult.value;
  const packageEvidence = await readContainedFile(canonicalRoot, ["package.json"], input.evidence);
  if (!packageEvidence.ok) {
    return rejected(
      input.expectedPackageId ?? input.root,
      canonicalRoot,
      packageEvidence.error.kind === "missing"
        ? "package-manifest-missing"
        : "package-manifest-malformed",
      packageEvidence.error.message
    );
  }

  const parsedPackage = parsePackageManifest(packageEvidence.value.text);
  if (!parsedPackage.ok) {
    return rejected(
      input.expectedPackageId ?? input.root,
      canonicalRoot,
      parsedPackage.code,
      parsedPackage.reason
    );
  }
  if (input.expectedPackageId && parsedPackage.value.packageId !== input.expectedPackageId) {
    return rejected(
      input.expectedPackageId,
      canonicalRoot,
      "package-identity-mismatch",
      `Registry identity ${input.expectedPackageId} does not match package ${parsedPackage.value.packageId}`
    );
  }

  const commandEvidence = await readContainedFile(
    canonicalRoot,
    ["oclif.manifest.json"],
    input.evidence
  );
  if (!commandEvidence.ok) {
    return rejected(
      parsedPackage.value.packageId,
      canonicalRoot,
      commandEvidence.error.kind === "missing"
        ? "command-manifest-missing"
        : "command-manifest-malformed",
      commandEvidence.error.message
    );
  }

  const parsedCommands = parseCommandManifest(commandEvidence.value.text);
  if (!parsedCommands.ok) {
    return rejected(
      parsedPackage.value.packageId,
      canonicalRoot,
      parsedCommands.code,
      parsedCommands.reason
    );
  }
  if (parsedCommands.value.version !== parsedPackage.value.version) {
    return rejected(
      parsedPackage.value.packageId,
      canonicalRoot,
      "command-manifest-version-mismatch",
      `Static command manifest version ${parsedCommands.value.version} does not match package version ${parsedPackage.value.version}`
    );
  }

  const commandRoot = await inspectContainedDirectory(
    canonicalRoot,
    parsedPackage.value.commandRoot,
    input.evidence
  );
  if (!commandRoot.ok) {
    return rejected(
      parsedPackage.value.packageId,
      canonicalRoot,
      "package-manifest-malformed",
      commandRoot.error.message
    );
  }

  const declaredFiles = [
    ...parsedCommands.value.commands.map((command) => ({
      label: `command ${command.id}`,
      relativePath: command.relativePath,
    })),
    ...parsedPackage.value.hooks.map((hook) => ({
      label: `hook ${hook.event}`,
      relativePath: hook.target,
    })),
  ];
  for (const declaration of declaredFiles) {
    if (
      declaration.label.startsWith("command ") &&
      !hasPathPrefix(declaration.relativePath, parsedPackage.value.commandRoot)
    ) {
      return rejected(
        parsedPackage.value.packageId,
        canonicalRoot,
        "command-manifest-malformed",
        `${declaration.label}: Declared command is outside package oclif.commands`
      );
    }
    const file = await inspectContainedFile(
      canonicalRoot,
      declaration.relativePath,
      input.evidence
    );
    if (!file.ok) {
      return rejected(
        parsedPackage.value.packageId,
        canonicalRoot,
        file.error.kind === "outside" ? "command-module-outside-root" : "command-module-missing",
        `${declaration.label}: ${file.error.message}`
      );
    }
  }

  const extension: StaticExternalExtension = {
    packageId: parsedPackage.value.packageId,
    version: parsedPackage.value.version,
    root: path.resolve(input.root),
    canonicalRoot,
    fingerprint: staticFingerprint(packageEvidence.value.text, commandEvidence.value.text),
    moduleType: parsedPackage.value.moduleType,
    commandRoot: parsedPackage.value.commandRoot,
    topics: parsedPackage.value.topics,
    commands: parsedCommands.value.commands,
    hooks: parsedPackage.value.hooks.map((hook) => hook.event).sort(),
    hookManifests: parsedPackage.value.hooks.map((hook) => ({
      event: hook.event,
      identifier: hook.identifier,
      target: hook.target,
    })),
  };
  const collisions = findReservedSurfaceCollisions(extension, input.reserved);
  if (collisions.length > 0) {
    return {
      accepted: false,
      quarantine: {
        identity: extension.packageId,
        root: canonicalRoot,
        reason: {
          code: "reserved-surface-collision",
          message: "Extension claims controller-reserved identity",
          collisions,
        },
      },
    };
  }

  return { accepted: true, extension };
}

async function inspectContainedDirectory(
  canonicalRoot: string,
  relativePath: readonly string[],
  evidence: StaticEvidencePort
): Promise<
  | { ok: true; value: string }
  | { ok: false; error: { kind: "missing" | "unreadable" | "outside"; message: string } }
> {
  const lexicalPath = path.resolve(canonicalRoot, ...relativePath);
  if (!isContained(canonicalRoot, lexicalPath)) {
    return {
      ok: false,
      error: { kind: "outside", message: "Command root escapes extension root" },
    };
  }
  const canonical = await evidence.canonicalPath(lexicalPath);
  if (!canonical.ok) return canonical;
  if (!isContained(canonicalRoot, canonical.value)) {
    return {
      ok: false,
      error: { kind: "outside", message: "Command root resolves outside extension root" },
    };
  }
  const directory = await evidence.isDirectory(canonical.value);
  if (!directory.ok) return directory;
  return directory.value
    ? { ok: true, value: canonical.value }
    : { ok: false, error: { kind: "missing", message: "Command root is not a directory" } };
}

async function readContainedFile(
  canonicalRoot: string,
  relativePath: readonly string[],
  evidence: StaticEvidencePort
): Promise<StaticEvidenceResult<{ path: string; text: string }>> {
  const inspected = await inspectContainedFile(canonicalRoot, relativePath, evidence);
  if (!inspected.ok) {
    return {
      ok: false,
      error: {
        kind: inspected.error.kind === "missing" ? "missing" : "unreadable",
        message: inspected.error.message,
      },
    };
  }
  const text = await evidence.readText(inspected.value);
  if (!text.ok) return text;
  return { ok: true, value: { path: inspected.value, text: text.value } };
}

async function inspectContainedFile(
  canonicalRoot: string,
  relativePath: readonly string[],
  evidence: StaticEvidencePort
): Promise<
  | { ok: true; value: string }
  | { ok: false; error: { kind: "missing" | "unreadable" | "outside"; message: string } }
> {
  const lexicalPath = path.resolve(canonicalRoot, ...relativePath);
  if (!isContained(canonicalRoot, lexicalPath)) {
    return {
      ok: false,
      error: { kind: "outside", message: "Declared path escapes extension root" },
    };
  }
  const canonical = await evidence.canonicalPath(lexicalPath);
  if (!canonical.ok) return canonical;
  if (!isContained(canonicalRoot, canonical.value)) {
    return {
      ok: false,
      error: { kind: "outside", message: "Declared path resolves outside extension root" },
    };
  }
  const file = await evidence.isFile(canonical.value);
  if (!file.ok) return file;
  if (!file.value) {
    return { ok: false, error: { kind: "missing", message: "Declared path is not a file" } };
  }
  return { ok: true, value: canonical.value };
}

function isContained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function hasPathPrefix(pathSegments: readonly string[], prefix: readonly string[]): boolean {
  return (
    pathSegments.length > prefix.length &&
    prefix.every((segment, index) => pathSegments[index] === segment)
  );
}

function rejected(
  identity: string,
  root: string | undefined,
  code: QuarantineCode,
  message: string
): CandidateInspection {
  const quarantine: QuarantinedExternalExtension = {
    identity,
    ...(root ? { root } : {}),
    reason: { code, message },
  };
  return { accepted: false, quarantine };
}

function staticFingerprint(packageManifest: string, commandManifest: string): string {
  return createHash("sha256")
    .update(packageManifest)
    .update("\0")
    .update(commandManifest)
    .digest("hex");
}
