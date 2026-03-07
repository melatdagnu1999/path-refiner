import { Task, SubTask } from "@/types/task";
import { getDB, saveDB } from "./db";

// ===== LOAD =====
export async function loadTasks(): Promise<Task[]> {
  try {
    const db = await getDB();
    const result = db.exec("SELECT * FROM tasks");
    if (!result.length || !result[0] || !result[0].columns) return [];

    const cols = result[0].columns;
    const rows = result[0].values || [];

    const tasks: Task[] = rows.map((row: any[]) => {
      const obj: any = {};
      if (cols && Array.isArray(cols)) {
        cols.forEach((col, i) => (obj[col] = row[i]));
      }

      // Load subtasks for this task safely using parameterized query
      let subTasks: SubTask[] = [];
      try {
        const stmt = db.prepare("SELECT * FROM subtasks WHERE taskId = ?");
        stmt.bind([obj.id]);
        while (stmt.step()) {
          const subRow = stmt.getAsObject();
          subTasks.push({
            id: String(subRow.id || ""),
            title: String(subRow.title || ""),
            completed: !!subRow.completed,
          });
        }
        stmt.free();
      } catch {
        // subtasks table might not exist yet
      }

      return {
        id: obj.id,
        title: obj.title || "",
        category: obj.category || "work",
        priority: obj.priority || "medium",
        completed: !!obj.completed,
        scope: obj.scope || "day",
        parentId: obj.parentId || undefined,
        dueDate: obj.dueDate ? new Date(obj.dueDate) : new Date(),
        startTime: obj.startTime || undefined,
        endTime: obj.endTime || undefined,
        timerDuration: obj.timerDuration || undefined,
        notes: obj.notes || undefined,
        timeSpent: obj.timeSpent || 0,
        subTasks,
      };
    });

    return tasks;
  } catch (error) {
    console.error("Failed to load tasks:", error);
    // Attempt to recover from JSON debug mirror
    try {
      const jsonMirror = localStorage.getItem("life_planner_db_debug");
      if (jsonMirror) {
        const parsed = JSON.parse(jsonMirror);
        if (Array.isArray(parsed)) {
          return parsed.map((obj: any) => ({
            id: obj.id,
            title: obj.title || "",
            category: obj.category || "work",
            priority: obj.priority || "medium",
            completed: !!obj.completed,
            scope: obj.scope || "day",
            parentId: obj.parentId || undefined,
            dueDate: obj.dueDate ? new Date(obj.dueDate) : new Date(),
            startTime: obj.startTime || undefined,
            endTime: obj.endTime || undefined,
            timerDuration: obj.timerDuration || undefined,
            notes: obj.notes || undefined,
            timeSpent: obj.timeSpent || 0,
            subTasks: [],
          }));
        }
      }
    } catch {
      // total fallback
    }
    return [];
  }
}

// ===== SAVE (overwrite all) =====
export async function saveTasks(tasks: Task[]): Promise<void> {
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
          t.dueDate instanceof Date ? t.dueDate.toISOString() : t.dueDate,
          t.startTime || null,
          t.endTime || null,
          t.timerDuration || null,
          t.notes || null,
          t.timeSpent || 0,
        ]
      );

      for (const st of t.subTasks) {
        db.run(
          `INSERT INTO subtasks (id, taskId, title, completed) VALUES (?, ?, ?, ?)`,
          [st.id, t.id, st.title, st.completed ? 1 : 0]
        );
      }
    }

    await saveDB();
  } catch (error) {
    console.error("Failed to save tasks:", error);
  }
}

// ===== DELETE SINGLE TASK =====
export async function deleteTask(taskId: string): Promise<void> {
  try {
    const db = await getDB();
    db.run("DELETE FROM subtasks WHERE taskId = ?", [taskId]);
    db.run("DELETE FROM tasks WHERE id = ?", [taskId]);
    await saveDB();
  } catch (error) {
    console.error("Failed to delete task:", error);
  }
}
