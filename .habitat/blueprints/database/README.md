# Database

`database` is an optional persistence boundary owned by one standalone
service. Its closed topology admits only owner-issued SQL migrations, atomic
store implementations, and optional atomic physical-schema leaves under
`src/service/db`. Migrations own physical evolution. Domain entities remain
in the service or module model; DTOs remain operation or boundary projections.
Stores may map persisted records into entities when the domain models
continuing identity, or return value and snapshot projections. Entity
declarations never import database types or stores. A `schema` directory exists
only when the selected database technology needs a separate physical mapping.
The same packet's closed-empty placement scopes reject tracked
database content under a standalone module, embedded API service root, or
embedded API module.

External database acquisition remains resource/provider-owned. Direct named
service-root middleware translates a ready context dependency into store
capabilities; production modules and handlers consume those capabilities from
inherited oRPC context rather than importing database source. Owner-local
package proof may import a private store inside the existing service test
boundary; that access neither publishes the store nor changes the production
context funnel.

The app-owned candidate-binding database remains an explicit integration-state
niche outside this reusable service database kind.

See [[skill|the service database frame]],
[[../service/README|the service blueprint]], and
[[../../AUTHORITY|the repository-local authority boundary]].
