import fs from "node:fs/promises";
import path from "node:path";

import type {
  QualifiedWriteInspection,
  QualifiedWritePort,
  QualifiedWritePublication,
} from "./executor";
import type { QualifiedWrite, VerifiedDestinationRoot } from "./model";

export class NodeQualifiedWritePort implements QualifiedWritePort {
  async inspect(
    root: VerifiedDestinationRoot,
    write: QualifiedWrite,
  ): Promise<QualifiedWriteInspection> {
    const target = resolveTarget(root, write);
    const parentConflict = await inspectExistingParentDirectories(root, target);
    if (parentConflict) return parentConflict;
    try {
      const stat = await fs.lstat(target);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        return Object.freeze({ kind: "Conflict", message: "Planned path exists but is not a regular file" });
      }
      const bytes = await fs.readFile(target);
      return equalBytes(bytes, write.bytes)
        ? Object.freeze({ kind: "Exact" })
        : Object.freeze({ kind: "Conflict", message: "Planned path contains divergent bytes" });
    } catch (error) {
      if (isMissing(error)) return Object.freeze({ kind: "Missing" });
      throw error;
    }
  }

  async publish(
    root: VerifiedDestinationRoot,
    write: QualifiedWrite,
  ): Promise<QualifiedWritePublication> {
    const target = resolveTarget(root, write);
    try {
      await ensureDestinationDirectories(root, target);
      await fs.writeFile(target, write.bytes, { flag: "wx" });
      return Object.freeze({ kind: "Published" });
    } catch (error) {
      return Object.freeze({ kind: "Failed", message: errorMessage(error) });
    }
  }
}

async function inspectExistingParentDirectories(
  root: VerifiedDestinationRoot,
  target: string,
): Promise<QualifiedWriteInspection | undefined> {
  for (const directory of parentDirectories(root, target)) {
    try {
      const stat = await fs.lstat(directory);
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        return Object.freeze({
          kind: "Conflict",
          message: "Planned path crosses a non-directory or symbolic-link parent",
        });
      }
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw error;
    }
  }
  return undefined;
}

async function ensureDestinationDirectories(
  root: VerifiedDestinationRoot,
  target: string,
): Promise<void> {
  await fs.mkdir(root, { recursive: true });
  for (const directory of parentDirectories(root, target)) {
    try {
      await fs.mkdir(directory);
    } catch (error) {
      if (!isAlreadyExists(error)) throw error;
    }
    const stat = await fs.lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error("Planned path crosses a non-directory or symbolic-link parent");
    }
  }
}

function parentDirectories(root: VerifiedDestinationRoot, target: string): readonly string[] {
  const parent = path.dirname(target);
  const relative = path.relative(root, parent);
  if (relative === "") return Object.freeze([root]);
  const directories: string[] = [root];
  let current = root as string;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    directories.push(current);
  }
  return Object.freeze(directories);
}

function resolveTarget(root: VerifiedDestinationRoot, write: QualifiedWrite): string {
  const target = path.resolve(root, ...write.relativePath.split("/"));
  const relative = path.relative(root, target);
  if (
    relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    throw new Error("Qualified authoring path escapes its verified destination");
  }
  return target;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isAlreadyExists(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
