import { bootstrapServer } from "./bootstrap";

const { app, config } = await bootstrapServer();
app.listen(config.port);

console.log(`@rawr/server listening on ${config.baseUrl}`);
