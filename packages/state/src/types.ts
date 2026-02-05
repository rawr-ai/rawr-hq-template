export type RepoState = {
  version: 1;
  plugins: {
    enabled: string[];
    disabled?: string[];
    lastUpdatedAt: string;
  };
};

