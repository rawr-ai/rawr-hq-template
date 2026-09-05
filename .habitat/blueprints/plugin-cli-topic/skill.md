---
name: habitat-cli-topic-frame
description: Project existing service capability into an explicitly selected CLI topic.
---

# CLI Topic

A topic is a private or published ordinary package at
`plugins/cli/topics/<topic>`. Its index exports the SDK
`defineCliTopicPlugin.factory()` declaration, `services.ts` declares complete
service uses, and `commands/**` owns command descriptors and native command
projections. Membership is explicit; filesystem discovery is not service or
plugin selection.

The topic neither starts an app nor acquires resources. Import-safe native host
contracts are allowed; this law does not choose a bundler arrangement or require
a particular host package. Native dispatch/lifetime, exact descriptor membership,
and managed execution remain the host and SDK's tested contracts.
