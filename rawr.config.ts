const config = {
  version: 1 as const,
  plugins: {
    defaultRiskTolerance: "balanced" as const,
    channels: {
      workspace: {
        enabled: true,
      },
      external: {
        enabled: false,
      },
    },
  },
  journal: {
    semantic: {
      candidateLimit: 200,
    },
  },
};

export default config;
