import type {
  ArtifactReader,
  ArtifactStore,
} from "../../../../model/dependencies/releases";

/** Selects the read-only artifact capability admitted to export handlers. */
export function selectArtifactReader(store: ArtifactStore): ArtifactReader {
  return Object.freeze({
    read: (ref: Parameters<ArtifactReader["read"]>[0]) => store.read(ref),
  });
}
