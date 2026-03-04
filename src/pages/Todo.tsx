import { Task, SCOPE_LABELS, TaskScope } from "@/types/task";
import { TaskSection } from "@/components/TaskSection";

interface TodoProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (task: Task) => void;
}

const SCOPES: TaskScope[] = ["year", "month", "week", "day"];

/**
 * Only show tasks at the top level of each scope section
 * if their parent belongs to a DIFFERENT (higher) scope or they have no parent.
 * This prevents subtasks from appearing both as top-level items AND in the breakdown tree.
 */
function getRootTasksForScope(allTasks: Task[], scope: TaskScope): Task[] {
  return allTasks.filter((t) => {
    if (t.scope !== scope) return false;
    if (!t.parentId) return true;
    const parent = allTasks.find((p) => p.id === t.parentId);
    // Show at top level only if parent is in a different (higher) scope
    return !parent || parent.scope !== scope;
  });
}

export default function Todo({ tasks, onToggleTask, onToggleSubTask, onAddTask, onDeleteTask, onUpdateTask }: TodoProps) {
  return (
    <div className="space-y-6">
      {SCOPES.map((scope) => (
        <TaskSection
          key={scope}
          title={`${SCOPE_LABELS[scope].label} Todos`}
          icon={SCOPE_LABELS[scope].icon}
          scope={scope}
          tasks={getRootTasksForScope(tasks, scope)}
          allTasks={tasks}
          onToggleTask={onToggleTask}
          onToggleSubTask={onToggleSubTask}
          onAddTask={onAddTask}
          onDeleteTask={onDeleteTask}
          onUpdateTask={onUpdateTask}
        />
      ))}
    </div>
  );
}
