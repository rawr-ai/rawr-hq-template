# Repository Operations

Own explicit fast-forward updates of the current checkout. Native Git owns
fetch/fast-forward behavior; this module never creates an integration branch,
prunes unrelated remotes, changes Graphite ancestry or promises rollback.
Validate upstream selection and admission before the one native pull.
