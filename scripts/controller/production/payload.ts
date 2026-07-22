import { lstat, readdir, readlink, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import type { ControllerPayloadSource } from "../materialize.ts";

function contained(root: string, candidate: string): boolean {
  const offset = relative(root, candidate);
  return (
    offset === "" || (offset !== ".." && !offset.startsWith(`..${sep}`) && !isAbsolute(offset))
  );
}

function releasePath(root: string, path: string): string {
  const value = relative(root, path).split(sep).join("/");
  if (!value || value === ".." || value.startsWith("../") || isAbsolute(value)) {
    throw new Error(`payload path escapes staging root: ${path}`);
  }
  return value;
}

export async function createExactPayloadSourcePlan(
  payloadRootInput: string
): Promise<readonly ControllerPayloadSource[]> {
  const payloadRoot = await realpath(payloadRootInput);
  const sources: ControllerPayloadSource[] = [];
  const inodes = new Set<string>();

  const visit = async (directory: string): Promise<void> => {
    const children = await readdir(directory, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name));
    for (const child of children) {
      const path = join(directory, child.name);
      const destination = releasePath(payloadRoot, path);
      if (/(?:^|\/)node_modules\/inngest(?:\/|$)/u.test(destination)) {
        throw new Error(`protected runtime dependency entered production payload: ${destination}`);
      }
      const status = await lstat(path);
      if (child.isDirectory()) {
        await visit(path);
      } else if (child.isFile()) {
        if (status.nlink !== 1)
          throw new Error(`production payload source has shared inode: ${path}`);
        const inode = `${String(status.dev)}:${String(status.ino)}`;
        if (inodes.has(inode))
          throw new Error(`production payload source aliases an inode: ${path}`);
        inodes.add(inode);
        sources.push(
          Object.freeze({
            kind: "file",
            sourcePath: path,
            releasePath: destination,
            mode: status.mode & 0o777,
          })
        );
      } else if (child.isSymbolicLink()) {
        const rawTarget = await readlink(path);
        const targetPath = resolve(directory, rawTarget);
        if (!contained(payloadRoot, targetPath)) {
          throw new Error(`production payload link escapes staging root: ${path}`);
        }
        await realpath(path);
        sources.push(
          Object.freeze({
            kind: "link",
            releasePath: destination,
            target: releasePath(payloadRoot, targetPath),
          })
        );
      } else {
        throw new Error(`unsupported production payload entry: ${path}`);
      }
    }
  };

  await visit(payloadRoot);
  return Object.freeze(sources);
}
