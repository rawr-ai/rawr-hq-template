import { expect, test } from "bun:test";

import {
  defineApp,
  defineEntrypoint,
  defineProcessCatalog,
  type ProcessDefinition,
} from "../src/app";
import { defineRuntimeProfile } from "../src/profile";
import { defineRuntimeResource, requireResource } from "../src/resource";

test("process catalogs snapshot their own demand arrays while preserving exact resource references", () => {
  const resource = defineRuntimeResource({
    id: "process-infrastructure",
    title: "Process infrastructure",
    purpose: "A process-owned capability, not a plugin dependency",
  });
  const requirement = requireResource({ resource, reason: "Selected process infrastructure" });
  const requirements = [requirement];
  const processes = defineProcessCatalog({
    cli: { id: "cli", roles: ["cli"], resourceRequirements: requirements },
    sibling: { id: "sibling", roles: ["server"] },
  });
  requirements.length = 0;

  expect(processes.cli.resourceRequirements).toEqual([requirement]);
  expect(processes.cli.resourceRequirements[0]).toBe(requirement);
  expect(processes.cli.resourceRequirements[0]?.resource).toBe(resource);
  expect(Object.isFrozen(processes.cli.resourceRequirements)).toBe(true);
  expect(processes.sibling.resourceRequirements).toEqual([]);
  expect(Object.isFrozen(processes.sibling.resourceRequirements)).toBe(true);
  expect(processes.cli.resourceRequirements).not.toBe(processes.sibling.resourceRequirements);

  const app = defineApp({ id: "process-resources", plugins: [] });
  const profile = defineRuntimeProfile({ id: "local", providers: [] });
  const entrypoint = defineEntrypoint({
    id: "main",
    app,
    profile,
    process: processes.cli,
    identity: {
      app: app.id,
      process: processes.cli.id,
      entrypoint: "main",
      deployment: "test",
      source: "definition-proof",
    },
  });
  expect(entrypoint.process).toBe(processes.cli);
  const legacyShape: ProcessDefinition = { id: "legacy", roles: ["cli"] };
  expect(legacyShape.resourceRequirements).toBeUndefined();
});

if (false) {
  defineProcessCatalog({
    cli: {
      id: "cli",
      roles: ["cli"],
      // @ts-expect-error Process demand accepts resource requirements, not resource ids.
      resourceRequirements: ["telemetry"],
    },
  });
}
