import { expect, test } from "bun:test";

import { readRuntimeDerivationHandoff } from "../src/index";
import { asyncSourceFixture } from "./helpers/async-source-fixture";

test("selected async sources retain exact native declarations and prederived occurrence refs cold", () => {
  const { derivation, calls, workflow, schedule, consumer, shared, membershipOnly } =
    asyncSourceFixture();
  const sources = readRuntimeDerivationHandoff(derivation).asyncSources;
  expect(sources).toHaveLength(3);
  const sharedRefs = new Set<string>();
  for (const [id, source] of sources) {
    const surface = derivation.graph.surfaceRuntimePlans.find((item) => item.surfacePlanId === id);
    if (surface === undefined) throw new Error("Missing selected async surface.");
    expect(surface?.surface).toBe(source.kind);
    expect(Object.isFrozen(source)).toBe(true);
    expect(Object.isFrozen(source.declarations)).toBe(true);
    for (const declaration of source.declarations) {
      const authored =
        declaration.kind === "async.workflow"
          ? workflow
          : declaration.kind === "async.schedule"
            ? schedule
            : consumer;
      expect(declaration.id).toBe(authored.id);
      expect(declaration.run).toBe(authored.run);
      expect(declaration.options).toBe(authored.options);
      expect(Object.isFrozen(declaration)).toBe(true);
      expect(Object.isFrozen(declaration.descriptorReferences)).toBe(true);
      for (const [descriptor, ref] of declaration.descriptorReferences) {
        expect(descriptor === shared || descriptor === membershipOnly).toBe(true);
        expect(ref.ownerId).toBe(surface.pluginOwnerId);
        expect(derivation.executionDescriptorTable.get(ref).executionId).toBe(ref.executionId);
        expect(surface?.executionDescriptorRefs).toContainEqual(ref);
        if (descriptor === shared) sharedRefs.add(ref.executionId);
      }
      if (declaration.kind === "async.workflow") {
        expect(declaration.inputSchema).toBe(workflow.inputSchema);
        expect(declaration.eventName).toBe("shared/event");
        expect(declaration.options?.onFailure).toBe(workflow.options?.onFailure);
      }
      if (declaration.kind === "async.consumer") {
        expect(declaration.eventSchema).toBe(consumer.eventSchema);
        expect(declaration.eventName).toBe(workflow.eventName);
      }
      if (declaration.kind === "async.schedule") expect(declaration.cron).toBe(schedule.cron);
    }
  }
  expect(sharedRefs.size).toBe(3);
  expect(Object.isFrozen(sources)).toBe(true);
  expect(sources.every(Object.isFrozen)).toBe(true);
  expect(Object.keys(derivation)).not.toContain("asyncSources");
  expect(JSON.stringify(derivation)).not.toContain("descriptorReferences");
  expect(JSON.stringify(derivation.portableArtifact)).not.toContain("shared/event");
  expect(calls).toEqual({ run: 0, effect: 0, decode: 0, failure: 0 });
});
