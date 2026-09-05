# Filesystem Resource

Own the narrow ready native filesystem/path capability contract. This private
package does not own catalog semantics, workspace selection or a runtime.
Runtime identity uses public SDK authoring and remains in the composing SDK
realm. The selected provider captures native services once; operation scopes
own opened handles. Do not add a general platform-service bag or Path lifetime.

Run resource/provider TypeScript, build and focused native operation tests.
