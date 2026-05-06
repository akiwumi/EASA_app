import fs from "fs";
import path from "path";
import { Client } from "pg";

const [, , sqlPathArg] = process.argv;

if (!sqlPathArg) {
  console.error("Usage: node scripts/run-sql-file.mjs <sql-file>");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sqlPath = path.resolve(process.cwd(), sqlPathArg);

if (!fs.existsSync(sqlPath)) {
  console.error(`SQL file not found: ${sqlPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");
const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log(
    JSON.stringify(
      {
        ok: true,
        file: sqlPath,
      },
      null,
      2,
    ),
  );
} catch (error) {
  try {
    await client.query("rollback");
  } catch {}
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
