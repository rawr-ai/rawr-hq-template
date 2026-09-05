import type { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner";

/** Native process capabilities; each spawned child belongs to its caller's Effect scope. */
export type ChildProcessResource = ChildProcessSpawner["Service"];
