import initSqlJs, { Database } from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";

const DB_KEY = "life_planner_db";
const DB_JSON_KEY = "life_planner_db_debug";

let db: Database | null = null;

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeUint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function getDB(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file) => (file.endsWith(".wasm") ? sqlWasmUrl : file),
  });

  const stored = localStorage.getItem(DB_KEY);

  if (stored) {
    try {
      const bytes = decodeBase64ToUint8Array(stored);
      db = new SQL.Database(bytes);
    } catch (error) {
      console.warn("Failed to restore SQL database from localStorage, starting fresh:", error);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  createTables();
  await saveDB();

  return db;
}

function createTables() {
  if (!db) return;

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT,
      category TEXT,
      priority TEXT,
      completed INTEGER,
      scope TEXT,
      parentId TEXT,
      dueDate TEXT,
      startTime TEXT,
      endTime TEXT,
      timerDuration INTEGER,
      notes TEXT,
      timeSpent INTEGER
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      taskId TEXT,
      title TEXT,
      completed INTEGER
    );
  `);
}

export async function saveDB() {
  if (!db) return;

  const data = db.export();
  const b64 = encodeUint8ArrayToBase64(data);

  try {
    localStorage.setItem(DB_KEY, b64);
  } catch (error) {
    console.warn("Failed to persist SQL binary database:", error);
  }

  // Also save a human-readable JSON mirror for debugging and fallback recovery
  try {
    const result = db.exec("SELECT * FROM tasks");
    if (result.length) {
      const cols = result[0].columns;
      const rows = result[0].values.map((row: any[]) => {
        const obj: any = {};
        cols.forEach((col, i) => (obj[col] = row[i]));
        return obj;
      });
      localStorage.setItem(DB_JSON_KEY, JSON.stringify(rows, null, 2));
    } else {
      localStorage.setItem(DB_JSON_KEY, "[]");
    }
  } catch (error) {
    console.warn("Failed to persist SQL JSON debug mirror:", error);
  }
}
