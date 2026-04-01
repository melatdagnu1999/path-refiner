// src/lib/journalImporter.ts

import { parseJournalDSL } from "@/components/JournalParser";
import { loadTasks, saveTasks } from "@/lib/taskStorage";
import { Task } from "@/types/task";

/**
 * Generate unique ID (safe for localStorage apps)
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Import tasks from DSL and persist them
 */
export async function importDSL(dslText: string): Promise<Task[]> {
  if (!dslText || !dslText.trim()) {
    return [];
  }

  // 1️⃣ Parse DSL
  const parsedTasks: Task[] = parseJournalDSL(dslText);

  if (!parsedTasks || parsedTasks.length === 0) {
    return [];
  }

  // 2️⃣ Ensure every task has an ID
  const newTasks: Task[] = parsedTasks.map((task) => ({
    ...task,
    id: task.id ?? generateId(),
  }));

  // 3️⃣ Load existing tasks
  const existingTasks = await loadTasks();

  // 4️⃣ Upsert: replace tasks with matching IDs, then add new ones
  const newTaskIds = new Set(newTasks.map((t) => t.id));
  const scopesToReplace = newTasks
    .map((t) => t.scope)
    .filter(Boolean);

  const filteredTasks = existingTasks.filter(
    (t) => !newTaskIds.has(t.id) && !scopesToReplace.includes(t.scope)
  );

  // 5️⃣ Combine
  const combinedTasks = [...filteredTasks, ...newTasks];

  // 6️⃣ Persist
  await saveTasks(combinedTasks);

  console.log("Tasks saved:", combinedTasks);

  return newTasks;
}
