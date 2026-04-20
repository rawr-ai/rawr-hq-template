export function toPosix(p: string): string {
  return p.replace(/\\\\/g, "/");
}

export function isAbsolutePath(input: string): boolean {
  return input.startsWith("/") || /^[A-Za-z]:[\\\\/]/.test(input);
}

export function relativePath(from: string, to: string): string {
  const fromParts = toPosix(from).split("/").filter(Boolean);
  const toParts = toPosix(to).split("/").filter(Boolean);
  let shared = 0;
  while (shared < fromParts.length && shared < toParts.length && fromParts[shared] === toParts[shared]) {
    shared += 1;
  }
  return [
    ...new Array(Math.max(0, fromParts.length - shared)).fill(".."),
    ...toParts.slice(shared),
  ].join("/");
}

export function uniqSorted(items: string[]): string[] {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}

export function isTestFile(file: string): boolean {
  return /(^|\/)(test|tests)\//.test(file) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file);
}

export function isDocFile(file: string): boolean {
  return file.endsWith(".md") || file === "README" || file.endsWith("/README") || file.endsWith("/README.md") || file.startsWith("docs/");
}

export function isCodeFile(file: string): boolean {
  return !isTestFile(file) && !isDocFile(file);
}
