import type { FileSystem, Path } from "effect";
/** Ready host capabilities; operation scopes own opened handles. */
export interface FilesystemResource {
  readonly fileSystem: FileSystem.FileSystem;
  readonly path: Path.Path;
}
