const INVENTORY_PATH = "tools/architecture-inventory/slice-0-first-cohort.json";

const INVENTORY = {
  projects: {
    "rawr-hq-template": {
      config: "package.json",
      tags: ["migration-slice:structural-tranche"],
      targets: [
        "sync:check",
        "architecture:gates:permanent",
        "observability:gate:telemetry-core",
        "observability:gate:host-metrics",
        "observability:gate:logging",
        "runtime:gate:hq-lifecycle",
      ],
    },
    "@rawr/server": {
      config: "apps/server/package.json",
      tags: ["type:app", "app:hq", "role:server", "migration-slice:structural-tranche"],
      targets: ["sync", "structural"],
    },
    "@rawr/cli": {
      config: "apps/cli/package.json",
      tags: ["type:app", "app:hq", "role:cli", "migration-slice:structural-tranche"],
      targets: ["sync", "structural"],
    },
    "@rawr/plugin-workspace": {
      config: "packages/plugin-workspace/package.json",
      tags: ["type:package", "migration-slice:structural-tranche", "role:support", "surface:plugin-workspace"],
      targets: ["sync", "structural"],
    },
    "@rawr/plugin-plugins": {
      config: "plugins/cli/plugins/package.json",
      tags: ["type:plugin", "migration-slice:structural-tranche"],
      targets: ["sync", "structural"],
    },
    "plugin-server-api-example-todo": {
      config: "plugins/server/api/example-todo/project.json",
      tags: [
        "type:plugin",
        "migration-slice:structural-tranche",
        "role:server",
        "surface:api",
        "capability:example-todo",
      ],
      targets: ["sync", "structural"],
    },
    "plugin-server-api-state": {
      config: "plugins/server/api/state/project.json",
      tags: [
        "type:plugin",
        "migration-slice:structural-tranche",
        "role:server",
        "surface:api",
        "capability:state",
      ],
      targets: ["sync", "structural"],
    },
    "eslint-fixtures": {
      config: "tools/eslint-fixtures/project.json",
      tags: ["type:package", "migration-slice:structural-tranche"],
      targets: ["sync", "structural"],
    },
  },
};

module.exports = async function syncSlice0Inventory(tree) {
  const nextContents = `${JSON.stringify(INVENTORY, null, 2)}\n`;
  const currentContents = tree.exists(INVENTORY_PATH) ? tree.read(INVENTORY_PATH).toString("utf8") : null;

  if (currentContents !== nextContents) {
    tree.write(INVENTORY_PATH, nextContents);
  }

  return {
    outOfSyncMessage: "The Node 1 first-cohort inventory is out of sync.",
    outOfSyncDetails: [`Expected ${INVENTORY_PATH} to match the checked-in Slice 0 ownership contract.`],
  };
};
