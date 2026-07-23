import type { ControllerPayloadManifest } from "@rawr/controller-release";

import { createReservedControllerSurface } from "../external-extensions/reserved-surface";
import type { ReservedControllerSurface } from "../external-extensions/model";

export function reservedSurfaceFromControllerManifest(
  manifest: ControllerPayloadManifest
): ReservedControllerSurface {
  return createReservedControllerSurface({
    packageIds: manifest.officialMembers.map((member) => member.packageId),
    commandIds: manifest.officialMembers.flatMap((member) => member.commandIds),
    topics: manifest.officialMembers.flatMap((member) => member.topics),
    aliases: manifest.officialMembers.flatMap((member) => member.aliases),
    hiddenAliases: manifest.officialMembers.flatMap((member) => member.hiddenAliases),
    hooks: manifest.officialMembers.flatMap((member) => member.hooks),
  });
}
