import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer as createHttpServer } from "node:http";
import { createServer as createFtpServer, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import type { Readable } from "node:stream";
import { text } from "node:stream/consumers";
import { describe, expect, it, vi } from "vitest";

// Exercise the legacy callers patched for minimatch's named export.
const rootRequire = createRequire(import.meta.url);
const firebaseRequire = createRequire(
  rootRequire.resolve("firebase-tools/package.json"),
);
const { readdirRecursive } = firebaseRequire("./lib/fsAsync.js") as {
  readdirRecursive: (options: {
    path: string;
    ignoreStrings: string[];
  }) => Promise<{ name: string }[]>;
};
const superstaticRequire = createRequire(
  firebaseRequire.resolve("superstatic/package.json"),
);
const { configMatcher } = superstaticRequire("./lib/utils/patterns.js") as {
  configMatcher: (
    path: string,
    config: { source?: string; glob?: string; regex?: string },
  ) => boolean;
};

describe("Firebase dependency compatibility", () => {
  it("filters nested and hidden files when preparing an upload", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "almostyellow-dependencies-"),
    );
    try {
      await mkdir(join(directory, "nested"));
      await Promise.all(
        ["index.html", ".env", "nested/keep.txt", "nested/private.log"].map(
          (file) => writeFile(join(directory, file), "test"),
        ),
      );

      const files = await readdirRecursive({
        path: directory,
        ignoreStrings: ["*.log", ".env"],
      });

      expect(
        files.map((file) => relative(directory, file.name)).sort(),
      ).toEqual(["index.html", join("nested", "keep.txt")].sort());
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("matches hosting rewrite, redirect and header patterns", () => {
    expect(configMatcher("/games/cards", { source: "/games/**" })).toBe(true);
    expect(configMatcher("/films", { source: "/games/**" })).toBe(false);
    expect(configMatcher("/assets/main.js", { glob: "**/*.js" })).toBe(true);
    expect(configMatcher("/.env", { source: "**" })).toBe(false);
    expect(configMatcher("/films", { regex: "^/films$" })).toBe(true);
  });
});

const lighthouseRequire = createRequire(
  rootRequire.resolve("@lhci/cli/package.json"),
);
const proxyRequire = createRequire(lighthouseRequire.resolve("proxy-agent"));
const pacRequire = createRequire(proxyRequire.resolve("pac-proxy-agent"));
const uriRequire = createRequire(pacRequire.resolve("get-uri"));

async function listen(server: ReturnType<typeof createFtpServer>) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("The test server did not bind to a local port.");
  return address.port;
}

describe("Lighthouse dependency compatibility", () => {
  it("fetches through LHCI's proxy wrapper while respecting the localhost bypass", async () => {
    const server = createHttpServer((_request, response) => {
      response.end("health check");
    });
    try {
      const port = await listen(server);
      vi.stubEnv("HTTP_PROXY", "http://127.0.0.1:1");
      vi.stubEnv("NO_PROXY", "127.0.0.1");
      const fetch = lighthouseRequire("./src/fetch.js") as (
        url: string,
      ) => Promise<{ text: () => Promise<string> }>;
      const response = await fetch(`http://127.0.0.1:${port.toString()}`);
      expect(await response.text()).toBe("health check");
    } finally {
      vi.unstubAllEnvs();
      server.closeAllConnections();
      await server[Symbol.asyncDispose]();
    }
  });

  it("reads an FTP proxy file through get-uri's listing fallback and patched client", async () => {
    const content = 'function FindProxyForURL() { return "DIRECT"; }\n';
    const sockets = new Set<Socket>();
    const commands: string[] = [];
    const socketErrors: Error[] = [];
    let dataSocket: Socket | undefined;
    const track = (socket: Socket) => {
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
      socket.on("error", (error: NodeJS.ErrnoException) => {
        // basic-ftp sends QUIT and destroys its socket without waiting for a reply.
        if (error.code !== "ECONNRESET") socketErrors.push(error);
      });
    };
    const dataServer = createFtpServer((socket) => {
      track(socket);
      dataSocket = socket;
    });
    const dataPort = await listen(dataServer);
    const disconnected = Promise.withResolvers<undefined>();
    const server = createFtpServer((socket) => {
      track(socket);
      socket.once("close", () => {
        disconnected.resolve(undefined);
      });
      socket.setEncoding("utf8");
      socket.write("220 Local test FTP server\r\n");
      let pending = "";
      socket.on("data", (chunk: string) => {
        pending += chunk;
        let end: number;
        while ((end = pending.indexOf("\r\n")) !== -1) {
          const command = pending.slice(0, end);
          pending = pending.slice(end + 2);
          commands.push(command);
          if (command === "QUIT") socket.end();
          else if (command.startsWith("USER "))
            socket.write("331 Password\r\n");
          else if (command.startsWith("PASS "))
            socket.write("230 Logged in\r\n");
          else if (command === "FEAT")
            socket.write(
              "211-Features\r\n MLST type*;size*;modify*;\r\n211 End\r\n",
            );
          // Force get-uri to obtain the modification date from a directory listing.
          else if (command.startsWith("MDTM "))
            socket.write("502 Unsupported\r\n");
          else if (command === "EPSV")
            socket.write(`229 Passive mode (|||${dataPort.toString()}|)\r\n`);
          else if (command.startsWith("MLSD ") || command.startsWith("RETR ")) {
            if (!dataSocket) {
              socket.write("425 No data connection\r\n");
              continue;
            }
            socket.write("150 Sending data\r\n");
            const body = command.startsWith("MLSD ")
              ? `size=${content.length.toString()};type=file;modify=20260101000000; health.pac\r\n`
              : content;
            dataSocket.end(body, () => socket.write("226 Complete\r\n"));
            dataSocket = undefined;
          } else socket.write("200 OK\r\n");
        }
      });
    });
    try {
      const port = await listen(server);
      const { getUri } = uriRequire("get-uri") as {
        getUri: (url: string) => Promise<Readable & { lastModified?: Date }>;
      };
      const stream = await getUri(
        `ftp://127.0.0.1:${port.toString()}/health.pac`,
      );
      expect(await text(stream)).toBe(content);
      await disconnected.promise;
      expect(stream.lastModified).toBeInstanceOf(Date);
      expect(commands).toContain("MDTM /health.pac");
      expect(commands).toContain("MLSD /");
      expect(commands).toContain("RETR /health.pac");
      expect(socketErrors).toEqual([]);
    } finally {
      for (const socket of sockets) socket.destroy();
      await Promise.all([
        server[Symbol.asyncDispose](),
        dataServer[Symbol.asyncDispose](),
      ]);
    }
  });
});
