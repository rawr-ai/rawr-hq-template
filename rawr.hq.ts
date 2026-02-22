export const rawrHqManifest = {
  workflows: {
    capabilities: {
      coordination: {
        pathPrefix: "/coordination",
      },
    },
  },
} as const;

export type RawrHqManifest = typeof rawrHqManifest;
