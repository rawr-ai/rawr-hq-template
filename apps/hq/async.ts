import { createRawrHqManifest, type RawrHqManifest } from "./rawr.hq";

/** The app-owned selection record for the intentionally unhosted async role. */
export type RawrHqAsyncReservation = Readonly<{
  manifest: RawrHqManifest;
  role: "async";
  status: "reserved";
  workflows: readonly string[];
  schedules: readonly string[];
}>;

/**
 * Selects the reserved HQ async role without constructing a runtime host.
 */
export function selectRawrHqAsyncRole(): RawrHqAsyncReservation {
  const manifest = createRawrHqManifest();

  return {
    manifest,
    role: "async",
    status: "reserved",
    workflows: Object.keys(manifest.roles.async.workflows),
    schedules: Object.keys(manifest.roles.async.schedules),
  };
}

if (import.meta.main) {
  console.log("@rawr/hq-app async role remains reserved");
}
