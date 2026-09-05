import { Context, Effect, Option, PlatformError } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { contract, createClient, definition, serviceRuntimeExport } from "../../../src/client";
import { createFixture, type Fixture } from "../../support/service/fixture";

const fixtures: Fixture[] = [];
afterEach(async () => {
  for (const fixture of fixtures.splice(0)) await fixture.cleanup();
});
async function setup() {
  const fixture = await createFixture();
  fixtures.push(fixture);
  return fixture;
}

describe("sealed development service", () => {
  it("exposes exactly four contracts and cold native dependency identities", () => {
    expect(Object.keys(contract)).toEqual(["repo", "stack", "worktree"]);
    expect(Object.keys(contract.repo)).toEqual(["syncUpstream"]);
    expect(Object.keys(contract.stack)).toEqual(["doctor", "drain"]);
    expect(Object.keys(contract.worktree)).toEqual(["cleanup"]);
    expect(definition.id).toBe("habitat.dev");
    expect(serviceRuntimeExport).toBeDefined();
  });

  it("rejects incomplete and retired input through the native service schema before filesystem or child operations", async () => {
    const fixture = await setup();
    let reads = 0;
    const client = createClient({
      ...fixture.options,
      deps: {
        ...fixture.options.deps,
        filesystem: {
          ...fixture.options.deps.filesystem,
          fileSystem: {
            ...fixture.options.deps.filesystem.fileSystem,
            realPath: () => {
              reads += 1;
              return Effect.die("unexpected filesystem operation");
            },
          },
        },
      },
    });
    await expect(
      client.repo.syncUpstream(
        // @ts-expect-error A remote cannot be supplied without its branch.
        { repositoryPath: fixture.repositoryPath, upstream: { remote: "origin" } }
      )
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      client.stack.drain(
        // @ts-expect-error Native request-only drain has no old cycle or finalize surface.
        { repositoryPath: fixture.repositoryPath, phase: "finalize" }
      )
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      client.worktree.cleanup(
        // @ts-expect-error An explicit protected trunk is mandatory.
        { repositoryPath: fixture.repositoryPath, prefix: "wt-" }
      )
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      client.repo.syncUpstream({ repositoryPath: fixture.repositoryPath, scratch: { files: [] } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      client.repo.syncUpstream({
        repositoryPath: fixture.repositoryPath,
        upstream: { remote: "origin\0other", branch: "trunk" },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(client.stack.doctor({ repositoryPath: "invalid\0path" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(reads).toBe(0);
    expect(fixture.calls).toEqual([]);
  });

  it("passes the caller's actual native Effect context without manufacturing a separate runtime", async () => {
    const fixture = await setup();
    class Invocation extends Context.Service<Invocation, string>()("dev-test/invocation") {}
    const observed: string[] = [];
    const realPath = fixture.options.deps.filesystem.fileSystem.realPath;
    const client = createClient({
      ...fixture.options,
      deps: {
        ...fixture.options.deps,
        filesystem: {
          ...fixture.options.deps.filesystem,
          fileSystem: {
            ...fixture.options.deps.filesystem.fileSystem,
            realPath: (path) =>
              Effect.gen(function* () {
                const context = yield* Effect.context<never>();
                observed.push(Option.getOrThrow(Context.getOption(context, Invocation)));
                return yield* realPath(path);
              }),
          },
        },
      },
    });
    await client.repo.syncUpstream(
      { repositoryPath: fixture.repositoryPath },
      {
        context: { "effect/context": Context.make(Invocation, "actual-caller") },
      }
    );
    expect(observed).toEqual(["actual-caller", "actual-caller"]);
  });

  it("does not observe absent scratch policy and preserves selected-file permission failure", async () => {
    const fixture = await setup();
    let stats = 0;
    const client = createClient({
      ...fixture.options,
      deps: {
        ...fixture.options.deps,
        filesystem: {
          ...fixture.options.deps.filesystem,
          fileSystem: {
            ...fixture.options.deps.filesystem.fileSystem,
            stat: (path) => {
              stats += 1;
              return Effect.fail(
                PlatformError.systemError({
                  module: "FileSystem",
                  method: "stat",
                  _tag: "PermissionDenied",
                  pathOrDescriptor: path,
                })
              );
            },
          },
        },
      },
    });
    const off = await client.repo.syncUpstream({ repositoryPath: fixture.repositoryPath });
    expect(off.scratch).toBeNull();
    expect(stats).toBe(0);
    const failure = await client.repo.syncUpstream({
      repositoryPath: fixture.repositoryPath,
      apply: true,
      scratch: { files: ["selected.md"] },
    });
    expect(failure.kind).toBe("Failed");
    expect(failure.issues.some((entry) => entry.code === "ScratchObservationFailed")).toBe(true);
    expect(failure.scratch?.files).toEqual([]);
    expect(stats).toBe(1);
    expect(fixture.calls.some((call) => call.args[0] === "pull")).toBe(false);
  });
});
