import {
  type AppRole,
  defineApp,
  defineEntrypoint,
  defineProcessCatalog,
  defineRuntimeProfile,
  type PluginDefinition,
  type ProviderSelection,
} from "../../../definition/src/index";
import { deriveRuntimeArtifacts } from "../../src/index";

export function deriveServerFixture(
  plugins: readonly PluginDefinition[],
  roles: readonly AppRole[] = ["server"],
  providers: readonly ProviderSelection[] = []
) {
  const app = defineApp({ id: "server-source-fixture", plugins });
  const profile = defineRuntimeProfile({ id: "server-source-profile", providers });
  const process = defineProcessCatalog({ main: { id: "server-source-process", roles } }).main;
  const entrypoint = defineEntrypoint({
    id: "server-source-entrypoint",
    app,
    process,
    profile,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "server-source-entrypoint",
      deployment: "test",
      source: "server-source-fixture",
    },
  });
  return deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
}
