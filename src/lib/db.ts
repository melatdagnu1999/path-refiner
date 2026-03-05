import initSqlJs, { Database } from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";

const DB_KEY = "life_planner_db";

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
    const bytes = decodeBase64ToUint8Array(stored);
    db = new SQL.Database(bytes);
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
  localStorage.setItem(DB_KEY, b64);
}
