import { lstatSync } from "node:fs";
import { join } from "node:path";
import type { Tree } from "@nx/devkit";

/** A generator-owned destination, already qualified for its particular output. */
export interface VerifiedDestination {
  readonly root: string;
}

/** Exact source bytes, with an optional preimage for an intentional registration update. */
export interface QualifiedWrite {
  readonly path: string;
  readonly contents: string | Buffer;
  readonly before?: string | Buffer;
}

/** Validate the whole plan before staging; native Nx alone publishes the supplied Tree. */
export function stageVerifiedWrites(
  tree: Tree,
  destination: VerifiedDestination,
  writes: readonly QualifiedWrite[]
): { readonly status: "staged" | "converged"; readonly paths: readonly string[] } {
  assertRelativePath(destination.root, true);
  const plan = writes
    .map((write) => {
      assertRelativePath(write.path, false);
      return {
        path: destination.root ? `${destination.root}/${write.path}` : write.path,
        contents: Buffer.from(write.contents),
        before: write.before === undefined ? undefined : Buffer.from(write.before),
      };
    })
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));

  const paths = new Set<string>();
  for (const write of plan) {
    const key = write.path.toLowerCase();
    if (paths.has(key)) throw new Error(`Duplicate qualified output path: ${write.path}`);
    paths.add(key);
  }
  for (const write of plan) {
    const segments = write.path.split("/");
    for (let depth = 1; depth < segments.length; depth++) {
      const ancestor = segments.slice(0, depth).join("/");
      if (paths.has(ancestor.toLowerCase())) {
        throw new Error(`Qualified output is also a parent path: ${ancestor}`);
      }
    }
    assertExistingPaths(tree, write.path);
  }

  const changes: typeof plan = [];
  for (const write of plan) {
    const current = tree.read(write.path);
    if (current?.equals(write.contents)) continue;
    if (write.before === undefined ? current !== null : !current?.equals(write.before)) {
      throw new Error(`Qualified output has divergent bytes: ${write.path}`);
    }
    changes.push(write);
  }

  // A staging error propagates to Nx, preventing flush. Disk flush is not a transaction.
  for (const write of changes) tree.write(write.path, write.contents);
  return {
    status: changes.length === 0 ? "converged" : "staged",
    paths: plan.map((write) => write.path),
  };
}

function assertRelativePath(path: string, allowRoot: boolean): void {
  if (allowRoot && path === "") return;
  const segments = path.split("/");
  if (
    path.includes("\\") ||
    path.includes(":") ||
    /[\u0000-\u001f<>"|?*]/.test(path) ||
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        /[. ]$/.test(segment) ||
        /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment)
    )
  ) {
    throw new Error(`Qualified output requires a portable relative path: ${path}`);
  }
}

function assertExistingPaths(tree: Tree, path: string): void {
  const segments = path.split("/");
  for (let depth = 1; depth <= segments.length; depth++) {
    const current = segments.slice(0, depth).join("/");
    const isOutput = depth === segments.length;
    const disk = lstatSync(join(tree.root, current), { throwIfNoEntry: false });
    if (
      disk?.isSymbolicLink() ||
      (disk !== undefined && (isOutput ? !disk.isFile() : !disk.isDirectory())) ||
      (isOutput ? tree.exists(current) && !tree.isFile(current) : tree.isFile(current))
    ) {
      throw new Error(`Qualified output has an unsafe existing path: ${current}`);
    }
    const parent = segments.slice(0, depth - 1).join("/");
    const segment = segments[depth - 1];
    if (
      tree
        .children(parent)
        .some((child) => child !== segment && child.toLowerCase() === segment.toLowerCase())
    ) {
      throw new Error(`Qualified output has an ambiguous path spelling: ${current}`);
    }
  }
}
