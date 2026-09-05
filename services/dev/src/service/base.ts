import type { ChildProcessResource } from "@habitat-ai/resource-child-process";
import type { FilesystemResource } from "@habitat-ai/resource-filesystem";

type EmptyLane = Readonly<Record<PropertyKey, never>>;

/** Ready native capabilities; repository and admission choices are operation inputs. */
export type Context = {
  readonly deps: {
    readonly filesystem: FilesystemResource;
    readonly childProcess: ChildProcessResource;
  };
  readonly scope: EmptyLane;
  readonly config: EmptyLane;
  readonly invocation: EmptyLane;
  readonly provided: EmptyLane;
};
