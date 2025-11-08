import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Task, CATEGORIES } from "@/types/task";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface TaskCardProps {
  task: Task;
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
}

export function TaskCard({ task, onToggleTask, onToggleSubTask }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const category = CATEGORIES[task.category];
  const completedSubTasks = task.subTasks.filter(st => st.completed).length;
  const progress = task.subTasks.length > 0 
    ? (completedSubTasks / task.subTasks.length) * 100 
    : task.completed ? 100 : 0;

  const priorityColors = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-warning/20 text-warning',
    high: 'bg-destructive/20 text-destructive'
  };

  return (
    <div className="bg-card rounded-lg border border-border p-3 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start gap-2">
        <Checkbox 
          checked={task.completed}
          onCheckedChange={() => onToggleTask(task.id)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{category.icon}</span>
            <h3 className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {task.title}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
            {task.subTasks.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {completedSubTasks}/{task.subTasks.length} subtasks
              </span>
            )}
          </div>

          {task.subTasks.length > 0 && (
            <>
              <div className="w-full bg-muted rounded-full h-1.5 mb-2">
                <div 
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {expanded ? 'Hide' : 'Show'} subtasks
              </button>

              {expanded && (
                <div className="mt-2 space-y-2 pl-4 border-l-2 border-border">
                  {task.subTasks.map(subTask => (
                    <div key={subTask.id} className="flex items-center gap-2">
                      <Checkbox 
                        checked={subTask.completed}
                        onCheckedChange={() => onToggleSubTask(task.id, subTask.id)}
                      />
                      <span className={`text-sm ${subTask.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {subTask.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
