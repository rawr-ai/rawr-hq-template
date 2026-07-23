import { describe, expect, it } from "vitest";

import { runProviderTest } from "../../../src/service/modules/providers/router/test.router";
import {
  FakeNativeSession,
  FakeNativeSessions,
  FakeSelectedContentResolver,
  selectedContent,
  selectedContentWithAliases,
  testRequest,
} from "./fixture";

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
    const session = new FakeNativeSession({ target, content, omitted: ["docs"] });
    const result = await runProviderTest(
      {
        ...testRequest,
        mode: { kind: "targeted", pluginIds: [content.members[0]!.pluginId] },
      },
      {
        selectedContent: new FakeSelectedContentResolver({ workspace: [content] }),
        nativeSessions: new FakeNativeSessions([session]),
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
    const session = new FakeNativeSession({ target, content, omitted: ["docs"] });
    const result = await runProviderTest(
      { ...testRequest, mode: { kind: "complete-set" } },
      {
        selectedContent: new FakeSelectedContentResolver({ workspace: [content] }),
        nativeSessions: new FakeNativeSessions([session]),
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
    const session = new FakeNativeSession({
      target,
      content,
      installed: ["cognition"],
      omitted: ["cog"],
    });

    const result = await runProviderTest(
      { ...testRequest, mode: { kind: "complete-set" } },
      {
        selectedContent: new FakeSelectedContentResolver({ workspace: [content] }),
        nativeSessions: new FakeNativeSessions([session]),
      }
    );

    expect(result.classification).toBe("Converged");
    expect(session.hasPluginObservation("cog")).toBe(true);
    expect(session.mutationCalls()).not.toContain("mutate:plugin-remove:cog@rawr-hq");
  });
});
