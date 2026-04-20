/**
 * Normalizes repository paths for lifecycle comparisons and report payloads.
 */
export function toPosix(p: string): string {
  return p.replace(/\\\\/g, "/");
}

/**
 * Cross-platform absolute-path check used before resolving user targets.
 */
export function isAbsolutePath(input: string): boolean {
  return input.startsWith("/") || /^[A-Za-z]:[\\\\/]/.test(input);
}

/**
 * Computes a stable relative path for lifecycle reports.
 */
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

/**
 * Deduplicates path lists before service policy evaluates evidence.
 */
export function uniqSorted(items: string[]): string[] {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}

/**
 * Detects test files for lifecycle evidence without tying policy to one runner.
 */
export function isTestFile(file: string): boolean {
  return /(^|\/)(test|tests)\//.test(file) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file);
}

/**
 * Detects documentation evidence for plugin lifecycle completion.
 */
export function isDocFile(file: string): boolean {
  return file.endsWith(".md") || file === "README" || file.endsWith("/README") || file.endsWith("/README.md") || file.startsWith("docs/");
}

/**
 * Treats anything outside docs/tests as implementation evidence.
 */
export function isCodeFile(file: string): boolean {
  return !isTestFile(file) && !isDocFile(file);
}
