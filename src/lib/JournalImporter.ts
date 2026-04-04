import { parseJournalDSL } from "@/components/JournalParser";
import { loadTasks, saveTasks } from "@/lib/taskStorage";
import { Task } from "@/types/task";

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeDate(value: Date | string | undefined): string {
  if (!value) return "";
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function taskSignature(task: Pick<Task, "scope" | "title" | "category" | "dueDate" | "startTime" | "endTime">): string {
  return [
    task.scope,
    normalizeText(task.title),
    task.category,
    normalizeDate(task.dueDate),
    task.startTime ?? "",
    task.endTime ?? "",
  ].join("::");
}

function dedupeTasks(tasks: Task[]): Task[] {
  const deduped: Task[] = [];
  const indexById = new Map<string, number>();
  const indexBySignature = new Map<string, number>();

  for (const task of tasks) {
    const ensuredTask: Task = {
      ...task,
      id: task.id ?? generateId(),
    };

    const signature = taskSignature(ensuredTask);
    const existingIndexById = indexById.get(ensuredTask.id);
    const existingIndexBySignature = indexBySignature.get(signature);
    const replaceIndex =
      typeof existingIndexById === "number"
        ? existingIndexById
        : existingIndexBySignature;

    if (typeof replaceIndex === "number") {
      deduped[replaceIndex] = ensuredTask;
      indexById.set(ensuredTask.id, replaceIndex);
      indexBySignature.set(signature, replaceIndex);
      continue;
    }

    const nextIndex = deduped.push(ensuredTask) - 1;
    indexById.set(ensuredTask.id, nextIndex);
    indexBySignature.set(signature, nextIndex);
  }

  return deduped;
}

function mergeTasksKeepingLatest(existingTask: Task, incomingTask: Task): Task {
  return {
    ...existingTask,
    ...incomingTask,
    subTasks: incomingTask.subTasks,
  };
}

export async function importDSL(dslText: string): Promise<Task[]> {
  if (!dslText || !dslText.trim()) {
    return [];
  }

  const { tasks: parsedTasks } = parseJournalDSL(dslText);

  if (!parsedTasks || parsedTasks.length === 0) {
    return [];
  }

  const newTasks = dedupeTasks(parsedTasks);
  const existingTasks = await loadTasks();

  const newTaskIds = new Set(newTasks.map((task) => task.id));
  const newTaskSignatures = new Set(newTasks.map((task) => taskSignature(task)));

  const existingById = new Map(existingTasks.map((task) => [task.id, task]));
  const existingBySignature = new Map(existingTasks.map((task) => [taskSignature(task), task]));

  const untouchedExistingTasks = existingTasks.filter((task) => {
    const hasMatchingId = newTaskIds.has(task.id);
    const hasMatchingSignature = newTaskSignatures.has(taskSignature(task));
    return !hasMatchingId && !hasMatchingSignature;
  });

  const mergedIncomingTasks = newTasks.map((task) => {
    const existingMatch = existingById.get(task.id) ?? existingBySignature.get(taskSignature(task));
    return existingMatch ? mergeTasksKeepingLatest(existingMatch, task) : task;
  });

  const combinedTasks = dedupeTasks([...untouchedExistingTasks, ...mergedIncomingTasks]);

  await saveTasks(combinedTasks);

  return newTasks;
}
