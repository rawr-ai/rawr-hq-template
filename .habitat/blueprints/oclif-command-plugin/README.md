# Oclif Command Plugin

`oclif-command-plugin` is the first-party command capability package kind.
Placement under `plugins/cli/commands/*` identifies the kind; a second metadata
classification is neither required nor authoritative. Its packets close the
package and command roots, normalize installed and TypeScript discovery,
require the package-owned manifest command, and reject dependencies on another
command plugin or through mechanical package directories. TypeScript package
exports and Nx own the remaining public dependency boundary. This kind does
not own the product command inventory and does not give a command plugin its
own executable binary.

See [[../../AUTHORITY|the repository-local authority boundary]] and
[[../oclif-app/README|the executable app kind]].
