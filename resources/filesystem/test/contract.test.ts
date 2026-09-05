import { expect, test } from "bun:test";
import { FilesystemRuntimeResource } from "../runtime";

test("filesystem is one process-lifetime resource identity", () => {
  expect(FilesystemRuntimeResource.id).toBe("filesystem");
  expect(FilesystemRuntimeResource.allowedLifetimes).toEqual(["process"]);
  expect(Object.isFrozen(FilesystemRuntimeResource)).toBe(true);
});
