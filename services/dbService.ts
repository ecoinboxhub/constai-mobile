import * as SQLite from "expo-sqlite";
import { SyncQueueItem } from "../shared/types";

// Stable Expo SQLite modern synchronous database opener
const DB_NAME = "constai_offline.db";

export async function getDbConnection() {
  return await SQLite.openDatabaseAsync(DB_NAME);
}

export async function initOfflineDatabase() {
  const db = await getDbConnection();
  
  // Enable foreign keys
  await db.execAsync("PRAGMA foreign_keys = ON;");

  // Create Projects cache table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      contractor_name TEXT NOT NULL,
      location TEXT NOT NULL,
      state TEXT,
      lga TEXT,
      project_type TEXT NOT NULL,
      project_status TEXT NOT NULL,
      budget_allocated REAL,
      budget_spent REAL,
      workforce_count INTEGER,
      equipment_count INTEGER,
      material_cost REAL,
      completion_percentage REAL,
      weather_delay_days INTEGER,
      safety_incidents INTEGER,
      inspection_score REAL,
      task_completion_rate REAL,
      daily_progress_rate REAL,
      delay_status TEXT,
      risk_level TEXT,
      company_id INTEGER,
      created_at TEXT
    );
  `);

  // Create Tasks table (Offline-first tasks tracking)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      assigned_to TEXT,
      status TEXT CHECK(status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
      due_date TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  // Create Inspections table (Inspections logs with GPS geotags)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      inspector TEXT NOT NULL,
      score REAL NOT NULL,
      notes TEXT,
      gps_latitude REAL,
      gps_longitude REAL,
      created_at TEXT
    );
  `);

  // Create Uploads queue table (Pending image/document uploads)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_uri TEXT NOT NULL,
      file_type TEXT NOT NULL,
      is_uploaded INTEGER DEFAULT 0, -- Boolean: 0 = false, 1 = true
      created_at TEXT
    );
  `);

  // Create Sync Queue table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_uuid TEXT UNIQUE NOT NULL,
      table_name TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('INSERT', 'UPDATE', 'DELETE')),
      payload TEXT NOT NULL, -- JSON serialized row data
      is_dirty INTEGER DEFAULT 1, -- Boolean: 0 = synced, 1 = dirty
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("Local SQLite offline database initialized successfully.");
}

// Sync Queue Helpers
export async function queueSyncItem(item: Omit<SyncQueueItem, "id" | "is_dirty" | "created_at">) {
  const db = await getDbConnection();
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_queue (client_uuid, table_name, action, payload, is_dirty) 
     VALUES (?, ?, ?, ?, 1);`,
    [item.client_uuid, item.table_name, item.action, item.payload]
  );
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await getDbConnection();
  const rows = await db.getAllAsync<SyncQueueItem>(
    "SELECT * FROM sync_queue WHERE is_dirty = 1 ORDER BY id ASC;"
  );
  return rows;
}

export async function markSyncItemCompleted(client_uuid: string) {
  const db = await getDbConnection();
  await db.runAsync(
    "UPDATE sync_queue SET is_dirty = 0 WHERE client_uuid = ?;",
    [client_uuid]
  );
}

export async function clearSyncedItems() {
  const db = await getDbConnection();
  await db.runAsync("DELETE FROM sync_queue WHERE is_dirty = 0;");
}
