import { defineRuntimeProfile, providerSelection } from "@habitat-ai/sdk/runtime/profiles";
import {
  clientProvider,
  FileResource,
  fileProvider,
  InngestResource,
} from "../../src/resources.js";

const providers = [
  providerSelection({
    resource: FileResource,
    provider: fileProvider,
    config: { kind: "runtime.config", key: "lease" },
  }),
  providerSelection({
    resource: InngestResource,
    provider: clientProvider,
    config: { kind: "runtime.config", key: "client" },
  }),
];
export const serverProfile = defineRuntimeProfile({
  id: "server-local",
  providers,
  configSources: [{ kind: "test" }],
  harnesses: ["isolation-server"],
});
export const asyncProfile = defineRuntimeProfile({
  id: "async-local",
  providers,
  configSources: [{ kind: "test" }],
  harnesses: ["isolation-async"],
});
