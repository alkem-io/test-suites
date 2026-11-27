// lib-snapshot.mjs: every kit script that can write through the application calls needSnapshot(tag) first.
// It reads which database the local server serves (the DATABASE_NAME line of the server .env, nothing else of that
// file) and runs "83-snapshot.sh need": a backup is taken unless the newest one already equals the database.
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export function servedDatabase() {
  if (process.env.ALK_DB) return process.env.ALK_DB;
  const env = fs.readFileSync((process.env.SERVER_DIR || (process.env.HOME + '/repos/server')) + '/.env', 'utf8');
  const m = env.split('\n').map(l => l.match(/^\s*DATABASE_NAME=(\S+)/)).filter(Boolean).pop();
  return m ? m[1] : 'alkemio';
}
export function needSnapshot(tag) {
  const db = servedDatabase();
  if (!db.startsWith('distill_')) { console.error(`refused: the local server serves ${db}, not an experiment database`); process.exit(2); }
  console.error(execFileSync(`${HERE}/83-snapshot.sh`, ['need', db, tag]).toString().trim());
  return db;
}
