import { createServer } from "vite";
import { resolve } from "node:path";

const server = await createServer({
  configFile: resolve("apps/web/vite.config.ts"),
  root: resolve("apps/web"),
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
});

await server.listen();
console.log("E2E web server listening on 127.0.0.1:5173");

const stop = async () => {
  await server.close();
  process.exit(0);
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
