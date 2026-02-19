import { useState } from "react";
import { Task, TaskScope, Category, CATEGORIES } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TaskSectionProps {
  title: string;
  icon: string;
  scope: TaskScope;
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export function TaskSection({
  title,
  icon,
  scope,
  tasks,
  onToggleTask,
  onToggleSubTask,
  onAddTask,
  onDeleteTask,
}: TaskSectionProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("class");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");

  const completed = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const task: Task = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      completed: false,
      scope,
      subTasks: [],
      dueDate: new Date(),
    };
    onAddTask(task);
    setNewTitle("");
    setAdding(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>{icon}</span> {title}
            <span className="text-sm font-normal text-muted-foreground">
              {completed}/{tasks.length}
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAdding(!adding)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        {tasks.length > 0 && <Progress value={progress} className="h-1.5 mt-2" />}
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg border border-border">
            <Input
              placeholder="Task title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <div className="flex gap-2">
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as Category)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.icon} {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as "low" | "medium" | "high")}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAdd}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {tasks.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No {title.toLowerCase()} yet. Click "Add" to create one.
          </p>
        )}

        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-2">
            <div className="flex-1">
              <TaskCard
                task={task}
                onToggleTask={onToggleTask}
                onToggleSubTask={onToggleSubTask}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="mt-2 text-muted-foreground hover:text-destructive"
              onClick={() => onDeleteTask(task.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
