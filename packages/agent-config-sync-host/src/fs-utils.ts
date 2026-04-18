import fs from "node:fs/promises";
import path from "node:path";

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function filesIdentical(leftPath: string, rightPath: string): Promise<boolean> {
  const [leftExists, rightExists] = await Promise.all([
    pathExists(leftPath),
    pathExists(rightPath),
  ]);
  if (!leftExists || !rightExists) return false;

  const [leftBuffer, rightBuffer] = await Promise.all([
    fs.readFile(leftPath),
    fs.readFile(rightPath),
  ]);
  return leftBuffer.equals(rightBuffer);
}

const DEFAULT_SKIP_DIRS = new Set(["__pycache__"]);
const DEFAULT_SKIP_FILES = new Set([".DS_Store"]);
const DEFAULT_SKIP_SUFFIXES = new Set([".pyc"]);

export async function listFilesRecursive(rootPath: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(absDir: string): Promise<void> {
    const dirents = await fs.readdir(absDir, { withFileTypes: true });
    for (const dirent of dirents) {
      const absPath = path.join(absDir, dirent.name);
      if (dirent.isDirectory()) {
        if (DEFAULT_SKIP_DIRS.has(dirent.name)) continue;
        await walk(absPath);
        continue;
      }
      if (!dirent.isFile()) continue;
      if (DEFAULT_SKIP_FILES.has(dirent.name)) continue;
      if (DEFAULT_SKIP_SUFFIXES.has(path.extname(dirent.name))) continue;
      files.push(absPath);
    }
  }

  if (!(await pathExists(rootPath))) return files;
  await walk(rootPath);
  files.sort((a, b) => a.localeCompare(b));
  return files;
}

export async function dirsIdentical(leftPath: string, rightPath: string): Promise<boolean> {
  const [leftExists, rightExists] = await Promise.all([
    pathExists(leftPath),
    pathExists(rightPath),
  ]);
  if (!leftExists || !rightExists) return false;

  const [leftFiles, rightFiles] = await Promise.all([
    listFilesRecursive(leftPath),
    listFilesRecursive(rightPath),
  ]);
  const leftRelative = leftFiles.map((filePath) => path.relative(leftPath, filePath));
  const rightRelative = rightFiles.map((filePath) => path.relative(rightPath, filePath));
  if (JSON.stringify(leftRelative) !== JSON.stringify(rightRelative)) return false;

  for (let index = 0; index < leftRelative.length; index += 1) {
    const identical = await filesIdentical(
      path.join(leftPath, leftRelative[index]),
      path.join(rightPath, rightRelative[index]),
    );
    if (!identical) return false;
  }

  return true;
}

export async function copyDirTree(sourceDir: string, destinationDir: string): Promise<void> {
  const files = await listFilesRecursive(sourceDir);
  for (const sourceFile of files) {
    const relativePath = path.relative(sourceDir, sourceFile);
    const destinationFile = path.join(destinationDir, relativePath);
    await fs.mkdir(path.dirname(destinationFile), { recursive: true });
    await fs.copyFile(sourceFile, destinationFile);
  }
}
