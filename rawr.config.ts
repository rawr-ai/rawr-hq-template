const config = {
  version: 1 as const,
  plugins: {
    defaultRiskTolerance: "balanced" as const,
  },
  journal: {
    semantic: {
      candidateLimit: 200,
    },
  },
};

export default config;

