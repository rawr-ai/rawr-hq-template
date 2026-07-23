import { constants } from "node:fs";
import { lstat, readFile } from "node:fs/promises";

import {
  atomicWriteFile,
  type AtomicWriteObserver,
  type AtomicWriteResult,
} from "./lib/filesystem.ts";
import { CONTROLLER_SELECTION_BYTES } from "@rawr/controller-release";

export type ControllerSelectorObservation =
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "invalid"; reason: "not-regular" | "shared-inode" | "wrong-size" }>
  | Readonly<{ kind: "regular"; bytes: Uint8Array }>;

export interface ControllerSelectorStore {
  read(path: string): Promise<ControllerSelectorObservation>;
  replace(containmentRoot: string, path: string, bytes: Uint8Array): Promise<AtomicWriteResult>;
}

export function createNodeControllerSelectorStore(
  observe?: AtomicWriteObserver
): ControllerSelectorStore {
  return Object.freeze({
    async read(path: string) {
      try {
        const status = await lstat(path);
        if (!status.isFile()) return Object.freeze({ kind: "invalid", reason: "not-regular" });
        if (status.nlink !== 1) return Object.freeze({ kind: "invalid", reason: "shared-inode" });
        if (status.size !== CONTROLLER_SELECTION_BYTES) {
          return Object.freeze({ kind: "invalid", reason: "wrong-size" });
        }
        return Object.freeze({ kind: "regular", bytes: new Uint8Array(await readFile(path)) });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return Object.freeze({ kind: "missing" });
        }
        throw error;
      }
    },

    async replace(containmentRoot: string, path: string, bytes: Uint8Array) {
      return await atomicWriteFile(
        containmentRoot,
        path,
        bytes,
        constants.S_IRUSR | constants.S_IWUSR,
        observe
      );
    },
  });
}

export const nodeControllerSelectorStore: ControllerSelectorStore =
  createNodeControllerSelectorStore();
