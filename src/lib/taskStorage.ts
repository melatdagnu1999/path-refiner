import { Task, SubTask } from "@/types/task";
import { getDB, saveDB } from "./db";

const TASKS_JSON_KEY = "life_planner_tasks_json_v1";
const LEGACY_DEBUG_KEY = "life_planner_db_debug";

function toSafeDate(value: unknown): Date {
  const date = value ? new Date(String(value)) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toSubTask(raw: any): SubTask {
  return {
    id: String(raw?.id ?? ""),
    title: String(raw?.title ?? ""),
    completed: raw?.completed === true || Number(raw?.completed ?? 0) === 1,
  };
}

function toTask(raw: any): Task {
  return {
    id: String(raw?.id ?? ""),
    title: String(raw?.title ?? ""),
    category: (raw?.category || "work") as Task["category"],
    priority: (raw?.priority || "medium") as Task["priority"],
    completed: raw?.completed === true || Number(raw?.completed ?? 0) === 1,
    scope: (raw?.scope || "day") as Task["scope"],
    parentId: raw?.parentId || undefined,
    dueDate: toSafeDate(raw?.dueDate),
    startTime: raw?.startTime || undefined,
    endTime: raw?.endTime || undefined,
    timerDuration: raw?.timerDuration ? Number(raw.timerDuration) : undefined,
    notes: raw?.notes || undefined,
    timeSpent: Number(raw?.timeSpent ?? 0),
    subTasks: Array.isArray(raw?.subTasks) ? raw.subTasks.map(toSubTask) : [],
  };
}

function readJsonTasks(key: string): Task[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    return parsed.map(toTask);
  } catch {
    return null;
  }
}

function writeJsonTasks(tasks: Task[]): void {
  try {
    const serializable = tasks.map((task) => {
      const date = task.dueDate instanceof Date ? task.dueDate : toSafeDate(task.dueDate);

      return {
        ...task,
        dueDate: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
      };
    });

    localStorage.setItem(TASKS_JSON_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.warn("Failed to write JSON task backup:", error);
  }
}

// ===== LOAD =====
export async function loadTasks(): Promise<Task[]> {
  const jsonBackup = readJsonTasks(TASKS_JSON_KEY);

  try {
    const db = await getDB();
    const result = db.exec("SELECT * FROM tasks");
    if (!result.length || !result[0] || !result[0].columns) {
      return jsonBackup ?? [];
    }

    const cols = result[0].columns;
    const rows = result[0].values || [];

    const tasks: Task[] = rows.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((col, i) => (obj[col] = row[i]));

      const subTasks: SubTask[] = [];
      let stmt: any;

      try {
        stmt = db.prepare("SELECT * FROM subtasks WHERE taskId = ?");
        stmt.bind([obj.id]);

        while (stmt.step()) {
          subTasks.push(toSubTask(stmt.getAsObject()));
        }
      } catch {
        // subtasks table might not exist yet
      } finally {
        stmt?.free?.();
      }

      return {
        ...toTask(obj),
        subTasks,
      };
    });

    if (!tasks.length && jsonBackup?.length) {
      return jsonBackup;
    }

    writeJsonTasks(tasks);
    return tasks;
  } catch (error) {
    console.error("Failed to load tasks:", error);

    const legacyDebugBackup = readJsonTasks(LEGACY_DEBUG_KEY);
    return jsonBackup ?? legacyDebugBackup ?? [];
  }
}

// ===== SAVE (overwrite all) =====
export async function saveTasks(tasks: Task[]): Promise<void> {
  // Always keep a plain JSON backup for mobile reliability
  writeJsonTasks(tasks);

  try {
    const db = await getDB();
    db.run("DELETE FROM tasks");
    db.run("DELETE FROM subtasks");

    for (const t of tasks) {
      db.run(
        `INSERT INTO tasks (id, title, category, priority, completed, scope, parentId, dueDate, startTime, endTime, timerDuration, notes, timeSpent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.id,
          t.title,
          t.category,
          t.priority,
          t.completed ? 1 : 0,
          t.scope,
          t.parentId || null,
          t.dueDate instanceof Date ? t.dueDate.toISOString() : toSafeDate(t.dueDate).toISOString(),
          t.startTime || null,
          t.endTime || null,
          t.timerDuration || null,
          t.notes || null,
          t.timeSpent || 0,
        ]
      );

      for (const st of t.subTasks) {
        db.run(`INSERT INTO subtasks (id, taskId, title, completed) VALUES (?, ?, ?, ?)`, [
          st.id,
          t.id,
          st.title,
          st.completed ? 1 : 0,
        ]);
      }
    }

    await saveDB();
  } catch (error) {
    console.error("Failed to save tasks:", error);
  }
}

// ===== DELETE SINGLE TASK =====
export async function deleteTask(taskId: string): Promise<void> {
  const jsonTasks = readJsonTasks(TASKS_JSON_KEY);
  if (jsonTasks) {
    writeJsonTasks(jsonTasks.filter((task) => task.id !== taskId));
  }

  try {
    const db = await getDB();
    db.run("DELETE FROM subtasks WHERE taskId = ?", [taskId]);
    db.run("DELETE FROM tasks WHERE id = ?", [taskId]);
    await saveDB();
  } catch (error) {
    console.error("Failed to delete task:", error);
  }
}
