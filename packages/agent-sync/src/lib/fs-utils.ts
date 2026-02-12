import fs from "node:fs/promises";
import path from "node:path";

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
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

export async function filesIdentical(a: string, b: string): Promise<boolean> {
  const [aExists, bExists] = await Promise.all([pathExists(a), pathExists(b)]);
  if (!aExists || !bExists) return false;

  const [aBuf, bBuf] = await Promise.all([fs.readFile(a), fs.readFile(b)]);
  return aBuf.equals(bBuf);
}

const DEFAULT_SKIP_DIRS = new Set(["__pycache__"]);
const DEFAULT_SKIP_FILES = new Set([".DS_Store"]);
const DEFAULT_SKIP_SUFFIXES = new Set([".pyc"]);

export async function listFilesRecursive(root: string): Promise<string[]> {
  const out: string[] = [];

  async function walk(absDir: string): Promise<void> {
    const dirents = await fs.readdir(absDir, { withFileTypes: true });
    for (const dirent of dirents) {
      const abs = path.join(absDir, dirent.name);
      if (dirent.isDirectory()) {
        if (DEFAULT_SKIP_DIRS.has(dirent.name)) continue;
        await walk(abs);
        continue;
      }
      if (!dirent.isFile()) continue;
      if (DEFAULT_SKIP_FILES.has(dirent.name)) continue;
      if (DEFAULT_SKIP_SUFFIXES.has(path.extname(dirent.name))) continue;
      out.push(abs);
    }
  }

  if (!(await pathExists(root))) return out;
  await walk(root);
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export async function dirsIdentical(a: string, b: string): Promise<boolean> {
  const [aExists, bExists] = await Promise.all([pathExists(a), pathExists(b)]);
  if (!aExists || !bExists) return false;

  const [aFiles, bFiles] = await Promise.all([listFilesRecursive(a), listFilesRecursive(b)]);
  const aRel = aFiles.map((f) => path.relative(a, f));
  const bRel = bFiles.map((f) => path.relative(b, f));
  if (JSON.stringify(aRel) !== JSON.stringify(bRel)) return false;

  for (let i = 0; i < aRel.length; i += 1) {
    const same = await filesIdentical(path.join(a, aRel[i]), path.join(b, bRel[i]));
    if (!same) return false;
  }

  return true;
}

export async function copyDirTree(srcDir: string, destDir: string): Promise<void> {
  const files = await listFilesRecursive(srcDir);
  for (const srcFile of files) {
    const rel = path.relative(srcDir, srcFile);
    const destFile = path.join(destDir, rel);
    await fs.mkdir(path.dirname(destFile), { recursive: true });
    await fs.copyFile(srcFile, destFile);
  }
}
