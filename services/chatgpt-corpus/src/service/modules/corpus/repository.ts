import fs from "node:fs/promises";
import path from "node:path";
import type { CorpusWorkspacePaths } from "./types";

export function createRepository(paths: CorpusWorkspacePaths) {
  return {
    paths,

    async ensureDirectory(dirPath: string): Promise<"created" | "existing"> {
      try {
        await fs.mkdir(dirPath, { recursive: false });
        return "created";
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === "ENOENT") {
          await fs.mkdir(dirPath, { recursive: true });
          return "created";
        }
        if (err.code === "EEXIST") {
          return "existing";
        }
        throw error;
      }
    },

    async writeFileIfChanged(filePath: string, contents: string): Promise<"created" | "existing"> {
      try {
        const existing = await fs.readFile(filePath, "utf8");
        if (existing === contents) {
          return "existing";
        }
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code !== "ENOENT") throw error;
      }

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, contents, "utf8");
      return "created";
    },

    async listFiles(dirPath: string, extension: string): Promise<string[]> {
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
    },

    async readText(filePath: string): Promise<string> {
      return fs.readFile(filePath, "utf8");
    },

    async readBytes(filePath: string): Promise<Buffer> {
      return fs.readFile(filePath);
    },

    async stat(filePath: string) {
      return fs.stat(filePath);
    },

    async ensureGeneratedDirectories(): Promise<void> {
      await fs.mkdir(paths.normalizedDir, { recursive: true });
      await fs.mkdir(paths.reportsDir, { recursive: true });
    },

    async writeJson(filePath: string, payload: unknown): Promise<void> {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    },

    async writeMarkdown(filePath: string, text: string): Promise<void> {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `${text.trimEnd()}\n`, "utf8");
    },
  };
}
