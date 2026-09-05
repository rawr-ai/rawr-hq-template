# Native Child-Process Provider

Build only NodeChildProcessSpawner.layer from the acquired filesystem resource's
exact native FileSystem and Path values. Factory/build planning remains cold;
acquisition captures capabilities but starts no child and retains no root Scope.
Return the exact native service rather than wrapping its methods. Each caller's
Effect scope owns actual child handles, streams and native termination settlement.

Runtime authoring imports public SDK subpaths. Keep the SDK external in the
composing application distribution and reuse the existing filesystem identity.
