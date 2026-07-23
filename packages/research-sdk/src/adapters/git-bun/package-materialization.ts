import { lstat, readdir, readlink, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import type { DigestIdentity } from "../../contracts/index.js";
import {
  invalidInput,
  isAtOrBelow,
  normalizePortablePath,
  sha256Digest,
  sha256Portable,
} from "./internal.js";

type MaterializationEntry =
  | {
      readonly path: string;
      readonly kind: "Directory";
    }
  | {
      readonly path: string;
      readonly kind: "RegularFile";
      readonly mode: "Executable" | "NonExecutable";
      readonly byteLength: number;
      readonly digest: DigestIdentity;
    }
  | {
      readonly path: string;
      readonly kind: "SymbolicLink";
      readonly linkText: string;
      readonly target: string;
    };

export async function digestPackageMaterializationSurface(
  workspaceRoot: string,
  packageRoot: string
): Promise<DigestIdentity> {
  const packageNodeModules = join(packageRoot, "node_modules");
  const installStore = join(workspaceRoot, "node_modules", ".bun");
  const containers = await collectInstallContainers(
    packageNodeModules,
    installStore,
    "derive-runtime-graph"
  );
  const entries: MaterializationEntry[] = [];
  await collectMaterializationEntries(
    packageNodeModules,
    "package-node-modules",
    installStore,
    entries,
    ".bun"
  );
  for (const container of containers) {
    const containerPath = portableRelative(installStore, container);
    await collectMaterializationEntries(
      container,
      `install-store/${containerPath}`,
      installStore,
      entries
    );
  }
  entries.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  return sha256Portable("research-sdk.package-materialization-surface.v1", entries);
}

export async function collectInstallContainers(
  packageNodeModules: string,
  installStore: string,
  operation: string
): Promise<readonly string[]> {
  const pending = [packageNodeModules];
  const scanned = new Set<string>();
  const containers = new Set<string>();
  while (pending.length > 0) {
    const root = pending.shift();
    if (root === undefined || scanned.has(root)) {
      continue;
    }
    scanned.add(root);
    for (const linkPath of await symlinksBelow(
      root,
      root === packageNodeModules ? ".bun" : undefined
    )) {
      const target = await realpath(linkPath);
      const targetRelativeToStore = relative(installStore, target);
      const [containerName] = targetRelativeToStore.split(sep);
      if (
        target === installStore ||
        !isAtOrBelow(target, installStore) ||
        containerName === undefined ||
        containerName.length === 0 ||
        resolve(installStore, containerName) === installStore
      ) {
        throw invalidInput(operation, "A package dependency link escapes the owner install store.");
      }
      const container = resolve(installStore, containerName);
      if (!containers.has(container)) {
        const stat = await lstat(container);
        if (
          !stat.isDirectory() ||
          stat.isSymbolicLink() ||
          (await realpath(container)) !== container
        ) {
          throw invalidInput(operation, "A package dependency install container is not ordinary.");
        }
        containers.add(container);
        pending.push(container);
      }
    }
  }
  return [...containers].sort();
}

export async function symlinksBelow(
  root: string,
  skippedRootEntry?: string
): Promise<readonly string[]> {
  const links: string[] = [];
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (directory === root && entry.name === skippedRootEntry) {
        continue;
      }
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        links.push(path);
      } else if (entry.isDirectory()) {
        await walk(path);
      }
    }
  };
  await walk(root);
  return links;
}

async function collectMaterializationEntries(
  root: string,
  logicalRoot: string,
  installStore: string,
  entries: MaterializationEntry[],
  skippedRootEntry?: string
): Promise<void> {
  const canonicalRoot = await realpath(root);
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (directory === root && entry.name === skippedRootEntry) {
        continue;
      }
      const path = join(directory, entry.name);
      const portablePath = `${logicalRoot}/${portableRelative(canonicalRoot, path)}`;
      const stat = await lstat(path);
      if (stat.isDirectory() && !stat.isSymbolicLink()) {
        entries.push({ path: portablePath, kind: "Directory" });
        await walk(path);
        continue;
      }
      if (stat.isFile() && !stat.isSymbolicLink()) {
        const bytes = await Bun.file(path).bytes();
        entries.push({
          path: portablePath,
          kind: "RegularFile",
          mode: (stat.mode & 0o111) === 0 ? "NonExecutable" : "Executable",
          byteLength: bytes.byteLength,
          digest: sha256Digest("research-sdk.package-materialization-file.v1", bytes),
        });
        continue;
      }
      if (stat.isSymbolicLink()) {
        const linkText = await readlink(path);
        const target = await realpath(path);
        if (isAbsolute(linkText) || target === installStore || !isAtOrBelow(target, installStore)) {
          throw invalidInput(
            "derive-runtime-graph",
            "A package materialization link escapes the owner install store."
          );
        }
        entries.push({
          path: portablePath,
          kind: "SymbolicLink",
          linkText,
          target: portableRelative(installStore, target),
        });
        continue;
      }
      throw invalidInput(
        "derive-runtime-graph",
        "The package materialization surface contains unsupported filesystem content."
      );
    }
  };
  await walk(canonicalRoot);
}

function portableRelative(root: string, path: string): string {
  const portable = normalizePortablePath(relative(root, path).split(sep).join("/"));
  if (portable === undefined || portable.length === 0) {
    throw invalidInput(
      "derive-runtime-graph",
      "A package materialization path is outside its admitted root."
    );
  }
  return portable;
}
