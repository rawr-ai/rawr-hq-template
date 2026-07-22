export type ControllerPackageRole =
  | "cli-root"
  | "command-module"
  | "help-module"
  | "native-external-manager";

export type ControllerCommandPackageClassification =
  | {
      readonly disposition: "controller-member";
      readonly packageId: string;
      readonly source: "workspace" | "dependency";
      readonly sourceRoot: string;
      readonly commandManifestInput: string;
      readonly role: ControllerPackageRole;
      readonly discoverCommands: boolean;
    }
  | {
      readonly disposition: "external-fixture";
      readonly packageId: string;
      readonly source: "workspace";
      readonly sourceRoot: string;
      readonly commandManifestInput: string;
    };

export const controllerCommandPackages = [
  {
    disposition: "controller-member",
    packageId: "@rawr/cli",
    source: "workspace",
    sourceRoot: "apps/cli",
    commandManifestInput: "apps/cli/package.json#oclif.commands",
    role: "cli-root",
    discoverCommands: true,
  },
  {
    disposition: "controller-member",
    packageId: "@oclif/plugin-help",
    source: "dependency",
    sourceRoot: "node_modules/@oclif/plugin-help",
    commandManifestInput: "node_modules/@oclif/plugin-help/package.json#oclif.commands",
    role: "help-module",
    discoverCommands: true,
  },
  {
    disposition: "controller-member",
    packageId: "@oclif/plugin-plugins",
    source: "dependency",
    sourceRoot: "node_modules/@oclif/plugin-plugins",
    commandManifestInput: "node_modules/@oclif/plugin-plugins/package.json#exports.commands",
    role: "native-external-manager",
    discoverCommands: false,
  },
  {
    disposition: "controller-member",
    packageId: "@rawr/plugin-devops",
    source: "workspace",
    sourceRoot: "plugins/cli/commands/devops",
    commandManifestInput: "plugins/cli/commands/devops/package.json#oclif.commands",
    role: "command-module",
    discoverCommands: true,
  },
  {
    disposition: "controller-member",
    packageId: "@rawr/plugin-hyperresearch",
    source: "workspace",
    sourceRoot: "plugins/cli/commands/hyperresearch",
    commandManifestInput: "plugins/cli/commands/hyperresearch/package.json#oclif.commands",
    role: "command-module",
    discoverCommands: true,
  },
  {
    disposition: "controller-member",
    packageId: "@rawr/plugin-session-tools",
    source: "workspace",
    sourceRoot: "plugins/cli/commands/session-tools",
    commandManifestInput: "plugins/cli/commands/session-tools/package.json#oclif.commands",
    role: "command-module",
    discoverCommands: true,
  },
  {
    disposition: "controller-member",
    packageId: "@rawr/plugin-chatgpt-corpus",
    source: "workspace",
    sourceRoot: "plugins/cli/commands/chatgpt-corpus",
    commandManifestInput: "plugins/cli/commands/chatgpt-corpus/package.json#oclif.commands",
    role: "command-module",
    discoverCommands: true,
  },
  {
    disposition: "external-fixture",
    packageId: "@rawr/plugin-hello",
    source: "workspace",
    sourceRoot: "plugins/cli/commands/hello",
    commandManifestInput: "plugins/cli/commands/hello/package.json#oclif.commands",
  },
] as const satisfies readonly ControllerCommandPackageClassification[];

export function assertControllerClassification(
  rows: readonly ControllerCommandPackageClassification[] = controllerCommandPackages
): void {
  const seen = new Set<string>();

  for (const row of rows) {
    if (seen.has(row.packageId)) {
      throw new Error(`CONTROLLER_CLASSIFICATION_DUPLICATE:${row.packageId}`);
    }
    seen.add(row.packageId);

    if (!row.packageId.startsWith("@") || !row.packageId.includes("/")) {
      throw new Error(`CONTROLLER_CLASSIFICATION_INVALID_PACKAGE:${row.packageId}`);
    }
    if (row.sourceRoot.startsWith("/") || row.sourceRoot.split("/").includes("..")) {
      throw new Error(`CONTROLLER_CLASSIFICATION_INVALID_ROOT:${row.packageId}`);
    }
  }
}

export function controllerMemberIds(): ReadonlySet<string> {
  return new Set(
    controllerCommandPackages
      .filter((row) => row.disposition === "controller-member")
      .map((row) => row.packageId)
  );
}

export function externalFixtureIds(): ReadonlySet<string> {
  return new Set(
    controllerCommandPackages
      .filter((row) => row.disposition === "external-fixture")
      .map((row) => row.packageId)
  );
}
