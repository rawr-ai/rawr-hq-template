import { type FsTree, flushChanges } from "nx/src/generators/tree.js";

export interface GeneratorPublicationOptions {
  readonly dryRun?: boolean;
}

export interface GeneratorPublicationResult {
  readonly status: "created" | "converged" | "dry-run";
  readonly paths: readonly string[];
}

/** Publish an already staged native Tree; a failed flush may leave a written prefix. */
export function publishGeneratorTree(
  tree: FsTree,
  options: GeneratorPublicationOptions = {}
): GeneratorPublicationResult {
  tree.lock();
  const changes = tree.listChanges();
  if (!options.dryRun) flushChanges(tree.root, changes);
  return Object.freeze({
    status: options.dryRun ? "dry-run" : changes.length === 0 ? "converged" : "created",
    paths: Object.freeze(changes.map((change) => change.path)),
  });
}
