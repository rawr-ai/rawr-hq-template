import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { runProviderTest as providerTestEffect } from "../../../src/service/modules/providers/router/test.router";
import {
  FakeNativeProviders,
  FakeSelectedContentResolver,
  fakeNativeSession,
  selectedContent,
  selectedContentWithAliases,
  testRequest,
} from "./fixture";

const runProviderTest = (...args: Parameters<typeof providerTestEffect>) =>
  Effect.runPromise(providerTestEffect(...args));

describe("provider disposable-home test", () => {
  it("preserves omitted managed members in targeted mode", async () => {
    const content = selectedContent(
      ["cognition"],
      {
        kind: "local",
        root: testRequest.contentWorkspace.locator,
      },
      "targeted"
    );
    const target = testRequest.targets[0];
    const session = fakeNativeSession({ target, content, omitted: ["docs"] });
    const result = await runProviderTest(
      {
        ...testRequest,
        mode: { kind: "targeted", pluginIds: [content.members[0]!.pluginId] },
      },
      {
        selectedContent: new FakeSelectedContentResolver({ workspace: [content] }),
        nativeProviders: new FakeNativeProviders([session]),
      }
    );
    expect(result.classification).toBe("Changed");
    expect(session.hasPlugin("cognition")).toBe(true);
    expect(session.hasPlugin("docs")).toBe(true);
    expect(session.mutationCalls()).not.toContain("mutate:plugin-remove:docs@rawr-hq");
  });

  it("preserves omitted managed members in complete-set mode", async () => {
    const content = selectedContent(["cognition"], {
      kind: "local",
      root: testRequest.contentWorkspace.locator,
    });
    const target = testRequest.targets[0];
    const session = fakeNativeSession({ target, content, omitted: ["docs"] });
    const result = await runProviderTest(
      { ...testRequest, mode: { kind: "complete-set" } },
      {
        selectedContent: new FakeSelectedContentResolver({ workspace: [content] }),
        nativeProviders: new FakeNativeProviders([session]),
      }
    );

    expect(result.classification).toBe("Changed");
    expect(session.hasPlugin("cognition")).toBe(true);
    expect(session.hasPlugin("docs")).toBe(true);
    expect(session.mutationCalls()).not.toContain("mutate:plugin-remove:docs@rawr-hq");
  });

  it("preserves alias-shaped managed residue in a disposable home", async () => {
    const content = selectedContentWithAliases(
      ["cognition"],
      { cognition: ["cog"] },
      { kind: "local", root: testRequest.contentWorkspace.locator }
    );
    const target = testRequest.targets[0];
    const session = fakeNativeSession({
      target,
      content,
      installed: ["cognition"],
      omitted: ["cog"],
    });

    const result = await runProviderTest(
      { ...testRequest, mode: { kind: "complete-set" } },
      {
        selectedContent: new FakeSelectedContentResolver({ workspace: [content] }),
        nativeProviders: new FakeNativeProviders([session]),
      }
    );

    expect(result.classification).toBe("Converged");
    expect(session.hasPluginObservation("cog")).toBe(true);
    expect(session.mutationCalls()).not.toContain("mutate:plugin-remove:cog@rawr-hq");
  });
});
