import { createResourceArtifactStore } from "@rawr/agent-plugin-lifecycle/bindings/releases";
import type { ArtifactStore } from "@rawr/agent-plugin-lifecycle/ports/releases";

// @ts-expect-error Runtime factories are available only through an exact binding facade.
import { createResourceArtifactStore as portFactory } from "@rawr/agent-plugin-lifecycle/ports/releases";
// @ts-expect-error Service-private module internals are not package exports.
import type { BuildResult } from "@rawr/agent-plugin-lifecycle/service/modules/releases/model/dto/release-lifecycle";
// @ts-expect-error Source-tree paths are locators, not public package identities.
import type { ReleaseLifecycleRuntime } from "@rawr/agent-plugin-lifecycle/src/service/modules/releases/ports";

declare const store: ArtifactStore;
void store;
void createResourceArtifactStore;
void portFactory;
declare const buildResult: BuildResult;
void buildResult;
