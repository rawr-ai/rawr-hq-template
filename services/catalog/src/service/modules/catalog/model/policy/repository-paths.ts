/** Directory segments excluded from repository authority and compatibility Grit subjects. */
export const excludedRepositoryDirectorySegments: ReadonlySet<string> = new Set([
  ".git",
  ".nx",
  ".semantica",
  ".turbo",
  ".venv",
  "build",
  "coverage",
  "dist",
  "generated",
  "node_modules",
  "vendor",
]);
