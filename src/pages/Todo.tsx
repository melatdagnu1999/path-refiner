import { Task, SCOPE_LABELS, TaskScope } from "@/types/task";
import { TaskSection } from "@/components/TaskSection";

interface TodoProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const SCOPES: TaskScope[] = ["year", "month", "week", "day"];

export default function Todo({ tasks, onToggleTask, onToggleSubTask, onAddTask, onDeleteTask }: TodoProps) {
  const grouped = {
    year: tasks.filter((t) => t.scope === "year"),
    month: tasks.filter((t) => t.scope === "month"),
    week: tasks.filter((t) => t.scope === "week"),
    day: tasks.filter((t) => t.scope === "day"),
  };

  return (
    <div className="space-y-6">
      {SCOPES.map((scope) => (
        <TaskSection
          key={scope}
          title={`${SCOPE_LABELS[scope].label} Todos`}
          icon={SCOPE_LABELS[scope].icon}
          scope={scope}
          tasks={grouped[scope]}
          onToggleTask={onToggleTask}
          onToggleSubTask={onToggleSubTask}
          onAddTask={onAddTask}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </div>
  );
}
