# Child-Process Resource

Own the exact native Effect ChildProcessSpawner capability, not a process runner,
command policy or platform-service bag. Child effects keep their native Scope
requirement. The composing app selects this resource independently; commands
supply their own executable, argv, cwd, streams and cancellation policy.

Runtime declarations use public SDK subpaths and the selected provider depends
on the existing exact filesystem resource. Do not add a ManagedRuntime, retained
root Scope, child registry, Promise executor or synthetic exit/signal protocol.
Native operation scopes own process settlement; resource release is stateless.

Run resource/provider TypeScript and focused native argv, stream and interruption
tests. Never use a real repository, user home or remote mutation as a fixture.
