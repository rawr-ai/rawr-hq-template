import { bootstrapServer } from "./bootstrap";

const { app, config } = await bootstrapServer();
app.listen(config.port);

// eslint-disable-next-line no-console
console.log(`@rawr/server listening on ${config.baseUrl}`);
