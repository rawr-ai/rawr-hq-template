export function toPosix(p: string): string {
  return p.replace(/\\\\/g, "/");
}

export function relativePath(from: string, to: string): string {
  const fromParts = toPosix(from).split("/").filter(Boolean);
  const toParts = toPosix(to).split("/").filter(Boolean);
  let shared = 0;
  while (shared < fromParts.length && shared < toParts.length && fromParts[shared] === toParts[shared]) shared += 1;
  return [
    ...new Array(Math.max(0, fromParts.length - shared)).fill(".."),
    ...toParts.slice(shared),
  ].join("/");
}

export function packageDirName(absPath: string): string {
  return toPosix(absPath).split("/").filter(Boolean).at(-1) ?? absPath;
}
