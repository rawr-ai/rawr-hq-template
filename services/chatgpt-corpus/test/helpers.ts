import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { CreateClientOptions } from "../src/client";
import type {
  RawSourceMaterials,
  WorkspaceArtifactBundle,
  WorkspaceStore,
  WorkspaceTemplate,
} from "../src/orpc/ports/workspace-store";
import { FIXTURE_SOURCE_MATERIALS } from "./fixture-data";

type WorkspaceState = {
  createdEntries: Set<string>;
  files: Map<string, string>;
  sourceMaterials: RawSourceMaterials;
  artifactBundle?: WorkspaceArtifactBundle;
};

function cloneSourceMaterials(materials: RawSourceMaterials): RawSourceMaterials {
  return {
    conversations: materials.conversations.map((entry) => ({ ...entry })),
    documents: materials.documents.map((entry) => ({ ...entry })),
  };
}

class MemoryWorkspaceStore implements WorkspaceStore {
  private readonly states = new Map<string, WorkspaceState>();

  private getState(workspaceRef: string): WorkspaceState {
    const existing = this.states.get(workspaceRef);
    if (existing) return existing;
    const state: WorkspaceState = {
      createdEntries: new Set<string>(),
      files: new Map<string, string>(),
      sourceMaterials: { conversations: [], documents: [] },
    };
    this.states.set(workspaceRef, state);
    return state;
  }

  seedSourceMaterials(workspaceRef: string, materials: RawSourceMaterials) {
    const state = this.getState(workspaceRef);
    state.sourceMaterials = cloneSourceMaterials(materials);
  }

  getFileContents(workspaceRef: string, relativePath: string): string | undefined {
    return this.getState(workspaceRef).files.get(relativePath);
  }

  getArtifactBundle(workspaceRef: string): WorkspaceArtifactBundle | undefined {
    return this.getState(workspaceRef).artifactBundle;
  }

  async scaffoldWorkspace(input: {
    workspaceRef: string;
    template: WorkspaceTemplate;
  }) {
    const state = this.getState(input.workspaceRef);
    const createdEntries: string[] = [];
    const existingEntries: string[] = [];

    for (const directory of input.template.requiredDirectories) {
      if (state.createdEntries.has(directory)) existingEntries.push(directory);
      else {
        state.createdEntries.add(directory);
        createdEntries.push(directory);
      }
    }

    for (const file of input.template.managedFiles) {
      const exists = state.files.has(file.relativePath);
      state.files.set(file.relativePath, file.contents);
      if (exists) existingEntries.push(file.relativePath);
      else createdEntries.push(file.relativePath);
    }

    return { createdEntries, existingEntries };
  }

  async readSourceMaterials(input: { workspaceRef: string }) {
    return cloneSourceMaterials(this.getState(input.workspaceRef).sourceMaterials);
  }

  async writeArtifactBundle(input: { workspaceRef: string; bundle: WorkspaceArtifactBundle }) {
    const state = this.getState(input.workspaceRef);
    state.artifactBundle = {
      outputDirectories: [...input.bundle.outputDirectories],
      files: input.bundle.files.map((file) => ({ ...file })),
    };
    for (const file of input.bundle.files) {
      state.files.set(file.relativePath, file.contents);
    }

    return {
      writtenEntries: input.bundle.files.map(({ fileId, relativePath }) => ({
        fileId,
        relativePath,
      })),
    };
  }
}

export function createMemoryWorkspaceStore() {
  return new MemoryWorkspaceStore();
}

export function createClientOptions(workspaceStore: WorkspaceStore, workspaceRef = "workspace://test"): CreateClientOptions {
  return {
    deps: {
      logger: createEmbeddedPlaceholderLoggerAdapter(),
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
      workspaceStore,
    },
    scope: {
      workspaceRef,
    },
    config: {},
  };
}

export function createInvocation(traceId = "trace-chatgpt-corpus") {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}

export function seedFixtureWorkspace(workspaceStore: MemoryWorkspaceStore, workspaceRef = "workspace://fixture") {
  workspaceStore.seedSourceMaterials(workspaceRef, FIXTURE_SOURCE_MATERIALS);
}
