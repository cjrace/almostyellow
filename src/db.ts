import { neonConfig } from "@neondatabase/serverless";

function isLocalhost(connectionString: string | undefined) {
  if (!connectionString) return false;
  try {
    return new URL(connectionString).hostname === "localhost";
  } catch {
    return false;
  }
}

// @vercel/postgres talks to Neon over HTTP and WebSockets, which a plain
// Postgres does not speak. When POSTGRES_URL points at localhost (the Docker
// test database in docker-compose.test.yml) send queries through the local
// Neon proxy instead. Production connection strings never match, so are
// unaffected, and a malformed one is left for the driver to report.
if (isLocalhost(process.env.POSTGRES_URL)) {
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
  neonConfig.wsProxy = (host) => `${host}:4444/v2`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

export { db, sql } from "@vercel/postgres";
