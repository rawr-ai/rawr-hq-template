#!/usr/bin/env node

// Source checkouts are locators and build inputs, never controller authority.
console.error("CONTROLLER_RELEASE_REQUIRED: invoke the installed Template controller");
process.exitCode = 78;
