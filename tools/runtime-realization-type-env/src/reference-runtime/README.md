# Reference Runtime Source

Status: README-level scaffold only.

This directory is reserved for the future Phase Four Reference Runtime source
plane. It intentionally contains no runtime implementation today.

Do not add TypeScript source, package exports, Nx targets, generators, or
parent repo imports here until Phase Four is explicitly opened.

When opened, this plane may consume shared Lab source from `src/sdk/**`,
`src/spine/**`, `src/runtime/**`, `src/adapters/**`, `src/vendor/**`, and
scenario packs. It must not use Oracle implementation as runtime substrate.
