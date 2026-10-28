// Production server for kcpersonal.
//
// `next start` can only listen on a TCP port. On the shared server the app
// listens on a unix socket instead, so only Apache can reach it and no other
// user can take over its address. See docs/drift.md.
//
//   SOCKET_PATH=/run/kcpersonal/kcpersonal.sock  listen on a unix socket
//   PORT=3000 (default)                          otherwise listen on 127.0.0.1
//
// Development still uses `npm run dev` (next dev).
import { chmodSync, existsSync, lstatSync, unlinkSync } from "node:fs";
import { createServer } from "node:http";
import next from "next";
import { Agent, buildConnector, setGlobalDispatcher } from "undici";

const socketPath = process.env.SOCKET_PATH;
const port = Number(process.env.PORT || 3000);

// When a server action redirects, Next.js fetches the target page from its
// own server and forwards the visitor's cookies with that request. By default
// it assumes 127.0.0.1:3000, which on a shared server could be another
// customer's app. Point it at this server instead. `next start` sets the same
// variable; it is private to Next.js, so check this after Next.js upgrades.
const INTERNAL_HOST = "kcpersonal.internal";
if (socketPath) {
  process.env.__NEXT_PRIVATE_ORIGIN = `http://${INTERNAL_HOST}`;
  const connectDefault = buildConnector({});
  const connectSocket = buildConnector({ socketPath });
  // Only requests to INTERNAL_HOST go to the socket; all other fetches are
  // unaffected.
  setGlobalDispatcher(
    new Agent({
      connect: (options, callback) =>
        options.hostname === INTERNAL_HOST
          ? connectSocket(options, callback)
          : connectDefault(options, callback),
    }),
  );
} else {
  process.env.__NEXT_PRIVATE_ORIGIN = `http://127.0.0.1:${port}`;
}

const app = next({ dev: false, dir: process.cwd() });
const handle = app.getRequestHandler();
await app.prepare();

const server = createServer((req, res) => handle(req, res));

function removeStaleSocket() {
  if (socketPath && existsSync(socketPath) && lstatSync(socketPath).isSocket()) {
    unlinkSync(socketPath);
  }
}

if (socketPath) {
  removeStaleSocket();
  server.listen(socketPath, () => {
    // Access is limited by the directory the socket lives in, which only the
    // app user and the web server can enter.
    chmodSync(socketPath, 0o666);
    console.log(`kcpersonal listening on unix:${socketPath}`);
  });
} else {
  server.listen(port, "127.0.0.1", () => {
    console.log(`kcpersonal listening on http://127.0.0.1:${port}`);
  });
}

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    removeStaleSocket();
    process.exit(0);
  });
  // Do not hang on keep-alive connections.
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
