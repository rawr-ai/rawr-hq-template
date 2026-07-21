# Agent Plugin Lifecycle Common

The lifecycle service composes exactly five capability modules: releases,
vendors, packaging, providers, and governance. The root context carries ready
host dependencies into those modules; procedure handlers own domain
transitions. This directory contains only provider-neutral contracts consumed
by more than one module. Module-local models, repositories, adapters, and
helpers remain under their owning module.
