import initSqlJs, { Database } from "sql.js";

const DB_KEY = "life_planner_db";

let db: Database | null = null;

export async function getDB(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: file => `https://sql.js.org/dist/${file}`,
  });

  const stored = localStorage.getItem(DB_KEY);

  if (stored) {
    const bytes = Uint8Array.from(atob(stored), c =>
      c.charCodeAt(0)
    );
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
  const b64 = btoa(String.fromCharCode(...data));
  localStorage.setItem(DB_KEY, b64);
}
