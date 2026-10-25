import { neonConfig } from "@neondatabase/serverless";

// @vercel/postgres talks to Neon over HTTP and WebSockets, which a plain
// Postgres does not speak. When POSTGRES_URL points at localhost (the Docker
// test database in docker-compose.test.yml) send queries through the local
// Neon proxy instead. Production connection strings never match, so are
// unaffected.
const connectionString = process.env.POSTGRES_URL;
if (connectionString && new URL(connectionString).hostname === "localhost") {
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
  neonConfig.wsProxy = (host) => `${host}:4444/v2`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

export { db, sql } from "@vercel/postgres";
