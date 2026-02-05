import { flush, handle, run } from "@oclif/core";

run(process.argv.slice(2), import.meta.url).then(() => flush()).catch(handle);

