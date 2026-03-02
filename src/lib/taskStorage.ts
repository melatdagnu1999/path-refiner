import { Task } from "@/types/task";

const STORAGE_KEY = "life-balance-tasks";

// ===== LOAD =====
export async function loadTasks(): Promise<Task[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return parsed.map((t: any) => ({
      ...t,
      dueDate: new Date(t.dueDate),
      subTasks: t.subTasks || [],
      timeSpent: t.timeSpent || 0,
      progress: t.progress || 0,
    }));
  } catch (error) {
    console.error("Failed to load tasks:", error);
    return [];
  }
}

// ===== SAVE (overwrite all) =====
export async function saveTasks(tasks: Task[]): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Failed to save tasks:", error);
  }
}

// ===== DELETE SINGLE TASK =====
export async function deleteTask(taskId: string): Promise<void> {
  try {
    const tasks = await loadTasks();
    const updated = tasks.filter((t) => t.id !== taskId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to delete task:", error);
  }
}
