export interface AuthoringReceipt {
  readonly status: "created" | "converged" | "dry-run";
  readonly paths: readonly string[];
}

export interface AuthoringRunOptions {
  readonly dryRun?: boolean;
}

export interface CliCommandRequest {
  readonly topic: string;
  readonly name: string;
}

export interface CliExtensionRequest {
  readonly id: string;
  readonly destination: string;
}

export interface AuthoringOptions {
  readonly runCliCommandGenerator: (
    request: CliCommandRequest,
    options: AuthoringRunOptions
  ) => AuthoringReceipt | Promise<AuthoringReceipt>;
  readonly runCliExtensionGenerator: (
    request: CliExtensionRequest,
    options: AuthoringRunOptions
  ) => AuthoringReceipt | Promise<AuthoringReceipt>;
}
