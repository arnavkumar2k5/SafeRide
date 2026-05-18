import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("connect", (client) => {
  client.query("SET search_path TO public").catch((error) => {
    console.error("Failed to set database search path:", error);
  });
});

export default pool;
