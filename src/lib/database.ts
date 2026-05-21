import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

export type GenerationMode = "image" | "video";
export type StoredGenerationStatus = "GENERATING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAIL";

export type GenerationRecord = {
  id: string;
  mode: GenerationMode;
  prompt: string;
  status: StoredGenerationStatus;
  resultUrl: string | null;
  remoteUrl: string | null;
  localPath: string | null;
  providerTaskId: string | null;
  error: string | null;
  size: string | null;
  ratio: string | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
};

type DatabaseSync = {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...values: unknown[]): unknown;
    all(...values: unknown[]): unknown[];
    run(...values: unknown[]): unknown;
  };
};

let db: DatabaseSync | null = null;
let initialized = false;

function resolveDatabasePath() {
  const url = process.env.DATABASE_URL || "file:./data/app.db";
  const rawPath = url.startsWith("file:") ? url.slice("file:".length) : url;

  return path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), rawPath);
}

function getDatabase() {
  if (db) {
    return db;
  }

  const databasePath = resolveDatabasePath();
  const databaseDir = path.dirname(databasePath);

  if (!existsSync(databaseDir)) {
    mkdirSync(databaseDir, { recursive: true });
  }

  const require = createRequire(import.meta.url);
  const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: new (filename: string) => DatabaseSync };
  db = new DatabaseSync(databasePath);

  return db;
}

export function ensureDatabase() {
  if (initialized) {
    return;
  }

  getDatabase().exec(`
    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL,
      result_url TEXT,
      remote_url TEXT,
      local_path TEXT,
      provider_task_id TEXT,
      error TEXT,
      size TEXT,
      ratio TEXT,
      model TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS generations_created_at_idx ON generations(created_at);
    CREATE INDEX IF NOT EXISTS generations_provider_task_id_idx ON generations(provider_task_id);
  `);
  addColumnIfMissing("generations", "remote_url", "TEXT");
  addColumnIfMissing("generations", "local_path", "TEXT");
  initialized = true;
}

function addColumnIfMissing(tableName: string, columnName: string, columnType: string) {
  const rows = getDatabase().prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;

  if (!rows.some((row) => row.name === columnName)) {
    getDatabase().exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
  }
}

function mapGeneration(row: any): GenerationRecord {
  return {
    id: row.id,
    mode: row.mode,
    prompt: row.prompt,
    status: row.status,
    resultUrl: row.result_url,
    remoteUrl: row.remote_url,
    localPath: row.local_path,
    providerTaskId: row.provider_task_id,
    error: row.error,
    size: row.size,
    ratio: row.ratio,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createGeneration(input: {
  mode: GenerationMode;
  prompt: string;
  status: StoredGenerationStatus;
  resultUrl?: string | null;
  remoteUrl?: string | null;
  localPath?: string | null;
  providerTaskId?: string | null;
  error?: string | null;
  size?: string | null;
  ratio?: string | null;
  model?: string | null;
}) {
  ensureDatabase();

  const id = randomUUID();
  getDatabase()
    .prepare(
      `INSERT INTO generations (
        id, mode, prompt, status, result_url, remote_url, local_path, provider_task_id, error, size, ratio, model
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.mode,
      input.prompt,
      input.status,
      input.resultUrl ?? null,
      input.remoteUrl ?? null,
      input.localPath ?? null,
      input.providerTaskId ?? null,
      input.error ?? null,
      input.size ?? null,
      input.ratio ?? null,
      input.model ?? null
    );

  return getGeneration(id);
}

export function getGeneration(id: string) {
  ensureDatabase();

  const row = getDatabase().prepare("SELECT * FROM generations WHERE id = ?").get(id);

  return row ? mapGeneration(row) : null;
}

export function listGenerations(limit = 80) {
  ensureDatabase();

  return getDatabase()
    .prepare("SELECT * FROM generations ORDER BY datetime(created_at) DESC, id DESC LIMIT ?")
    .all(Math.max(1, Math.min(limit, 200)))
    .map(mapGeneration);
}

export function updateGeneration(
  id: string,
  input: Partial<Pick<GenerationRecord, "status" | "resultUrl" | "providerTaskId" | "error" | "size" | "ratio" | "model">>
    & Partial<Pick<GenerationRecord, "remoteUrl" | "localPath">>
) {
  ensureDatabase();

  const existing = getGeneration(id);

  if (!existing) {
    return null;
  }

  getDatabase()
    .prepare(
      `UPDATE generations
       SET status = ?, result_url = ?, remote_url = ?, local_path = ?, provider_task_id = ?, error = ?, size = ?, ratio = ?, model = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(
      input.status ?? existing.status,
      input.resultUrl ?? existing.resultUrl,
      input.remoteUrl ?? existing.remoteUrl,
      input.localPath ?? existing.localPath,
      input.providerTaskId ?? existing.providerTaskId,
      input.error ?? existing.error,
      input.size ?? existing.size,
      input.ratio ?? existing.ratio,
      input.model ?? existing.model,
      id
    );

  return getGeneration(id);
}

export function updateGenerationByTaskId(
  providerTaskId: string,
  input: Partial<Pick<GenerationRecord, "status" | "resultUrl" | "error" | "ratio" | "model">>
    & Partial<Pick<GenerationRecord, "remoteUrl" | "localPath">>
) {
  ensureDatabase();

  const row = getDatabase().prepare("SELECT * FROM generations WHERE provider_task_id = ?").get(providerTaskId);
  const existing = row ? mapGeneration(row) : null;

  if (!existing) {
    return null;
  }

  return updateGeneration(existing.id, input);
}

export function deleteGeneration(id: string) {
  ensureDatabase();

  getDatabase().prepare("DELETE FROM generations WHERE id = ?").run(id);
}
