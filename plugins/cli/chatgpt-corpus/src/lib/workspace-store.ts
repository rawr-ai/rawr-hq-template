import fs from "node:fs/promises";
import path from "node:path";
import type {
  WorkspaceArtifactBundle,
  WorkspaceStore,
} from "@rawr/chatgpt-corpus";

function toAbsolutePath(workspaceRef: string, relativePath: string): string {
  return path.join(workspaceRef, ...relativePath.split("/"));
}

function toRelativePath(workspaceRef: string, absolutePath: string): string {
  const relative = path.relative(workspaceRef, absolutePath);
  return relative.split(path.sep).join("/");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return false;
    throw error;
  }
}

async function listFiles(dirPath: string, extension: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
      .map((entry) => path.join(dirPath, entry.name))
      .sort((left, right) => left.localeCompare(right));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw error;
  }
}

async function writeManagedFile(filePath: string, contents: string): Promise<"created" | "existing"> {
  const existed = await pathExists(filePath);
  if (existed) {
    const current = await fs.readFile(filePath, "utf8");
    if (current === contents) {
      return "existing";
    }
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, "utf8");
  return existed ? "existing" : "created";
}

export function createFilesystemWorkspaceStore(): WorkspaceStore {
  return {
    async scaffoldWorkspace({ workspaceRef, template }) {
      const createdEntries: string[] = [];
      const existingEntries: string[] = [];

      for (const relativeDir of template.requiredDirectories) {
        const absoluteDir = toAbsolutePath(workspaceRef, relativeDir);
        const existed = await pathExists(absoluteDir);
        await fs.mkdir(absoluteDir, { recursive: true });
        (existed ? existingEntries : createdEntries).push(relativeDir);
      }

      for (const file of template.managedFiles) {
        const absoluteFile = toAbsolutePath(workspaceRef, file.relativePath);
        const status = await writeManagedFile(absoluteFile, file.contents);
        (status === "created" ? createdEntries : existingEntries).push(file.relativePath);
      }

      return { createdEntries, existingEntries };
    },

    async readSourceMaterials({ workspaceRef }) {
      const conversationsDir = toAbsolutePath(workspaceRef, "source-material/conversations/raw-json");
      const docsDir = toAbsolutePath(workspaceRef, "work/docs/source");
      const conversationPaths = await listFiles(conversationsDir, ".json");
      const documentPaths = await listFiles(docsDir, ".md");

      return {
        conversations: await Promise.all(
          conversationPaths.map(async (absolutePath) => ({
            relativePath: toRelativePath(workspaceRef, absolutePath),
            contents: await fs.readFile(absolutePath, "utf8"),
          })),
        ),
        documents: await Promise.all(
          documentPaths.map(async (absolutePath) => ({
            relativePath: toRelativePath(workspaceRef, absolutePath),
            contents: await fs.readFile(absolutePath, "utf8"),
          })),
        ),
      };
    },

    async writeArtifactBundle({ workspaceRef, bundle }) {
      for (const relativeDir of bundle.outputDirectories) {
        await fs.mkdir(toAbsolutePath(workspaceRef, relativeDir), { recursive: true });
      }

      for (const file of bundle.files) {
        const absoluteFile = toAbsolutePath(workspaceRef, file.relativePath);
        await fs.mkdir(path.dirname(absoluteFile), { recursive: true });
        await fs.writeFile(absoluteFile, file.contents, "utf8");
      }

      return {
        writtenEntries: bundle.files.map(({ fileId, relativePath }) => ({
          fileId,
          relativePath,
        })),
      };
    },
  };
}
