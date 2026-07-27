# Database

`database` is an optional persistence boundary owned by one standalone
service. Its closed topology admits only owner-issued SQL migrations, named
schema leaves, and store implementations under `src/service/db`. The same
packet's closed-empty placement scopes reject tracked database content under a
standalone module, embedded API service root, or embedded API module.

External database acquisition remains resource/provider-owned. Service-root
middleware translates a ready context dependency into store capabilities;
modules and handlers consume those capabilities from inherited oRPC context
rather than importing database source.

See [[skill|Service Database Frame]], [[../service/README|Service]], and
[[../../AUTHORITY|the repository-local authority boundary]].
