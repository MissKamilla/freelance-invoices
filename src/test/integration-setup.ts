import { execSync } from 'node:child_process';
import { Client } from 'pg';
import type { TestProject } from 'vitest/node';

/** Перед запуском: чиста база invoices_test з усіма міграціями. */
export default async function setup(project: TestProject) {
  const url = new URL(project.config.env.DATABASE_URL as string);
  const database = url.pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = '/postgres';

  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  await client.query(`CREATE DATABASE "${database}"`);
  await client.end();

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'pipe',
  });
}
