# Oclif App

`oclif-app` is the executable command application kind. Its packets close the
package shell, binary and source entrypoints, Oclif discovery configuration,
and the package-owned manifest command without owning command inventory or
release orchestration. Oclif owns dispatch and extension state; Nx infers and
orders build, manifest, and release tasks.

See [[../../AUTHORITY|the repository-local authority boundary]] and
[[../oclif-command-plugin/README|the host-composed command-plugin kind]].
