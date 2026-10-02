import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

try {
  const schemaUrl = new URL('./schema.sql', import.meta.url);
  const schema = await readFile(fileURLToPath(schemaUrl), 'utf8');
  await pool.query(schema);
  console.log('Database schema is ready.');
} finally {
  await pool.end();
}