import { Command } from 'commander';
import fs from 'node:fs';
import { getDatabase, closeDatabase } from '@ws/core';
import type Database from 'better-sqlite3';

export interface CliContext {
  dataDir: string;
  json: boolean;
  verbose: boolean;
  db: Database.Database;
}

export function createContext(cmd: Command): CliContext {
  const opts = cmd.optsWithGlobals();
  const dataDir: string = opts.dataDir;
  const json: boolean = opts.json;
  const verbose: boolean = opts.verbose;
  fs.mkdirSync(dataDir, { recursive: true });
  const db = getDatabase(dataDir);
  return { dataDir, json, verbose, db };
}

export function cleanupContext(ctx: CliContext): void {
  closeDatabase(ctx.db);
}
