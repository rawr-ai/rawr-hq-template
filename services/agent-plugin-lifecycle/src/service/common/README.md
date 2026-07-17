# Agent Plugin Lifecycle Common

This directory contains only semantics or abstract ports shared by more than one lifecycle module. Module-local state machines, repositories, adapters, and helpers remain under their owning module.

Controller undo storage and replay are not service concerns. Mutating modules can only contribute a closed inverse action through a controller-supplied write-only port.
