import { useState } from "react";
import { Task, SCOPE_LABELS, TaskScope, Category, CATEGORIES } from "@/types/task";
import { TaskSection } from "@/components/TaskSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Inbox, Trash2, X } from "lucide-react";

interface TodoProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (task: Task) => void;
}

const SCOPES: TaskScope[] = ["year", "month", "week", "day"];

function getRootTasksForScope(allTasks: Task[], scope: TaskScope): Task[] {
  return allTasks.filter((t) => {
    if (t.scope !== scope) return false;
    if (!t.parentId) return true;
    const parent = allTasks.find((p) => p.id === t.parentId);
    return !parent || parent.scope !== scope;
  });
}

// Unplanned tasks: tasks tagged as "unplanned" via notes field
function getUnplannedTasks(allTasks: Task[]): Task[] {
  return allTasks.filter((t) => t.notes === "__unplanned__");
}

function getPlannedTasks(allTasks: Task[]): Task[] {
  return allTasks.filter((t) => t.notes !== "__unplanned__");
}

export default function Todo({ tasks, onToggleTask, onToggleSubTask, onAddTask, onDeleteTask, onUpdateTask }: TodoProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("personal");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");

  const unplanned = getUnplannedTasks(tasks);
  const planned = getPlannedTasks(tasks);

  const handleAddUnplanned = () => {
    if (!newTitle.trim()) return;
    onAddTask({
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      completed: false,
      scope: "day",
      subTasks: [],
      dueDate: new Date(),
      notes: "__unplanned__",
    });
    setNewTitle("");
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      {/* Unplanned Tasks Inbox */}
      <Card className="border-dashed border-2 border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" />
              Unplanned Inbox
              <span className="text-sm font-normal text-muted-foreground">{unplanned.length} items</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setAdding(!adding)} className="gap-1">
              <Plus className="h-4 w-4" /> Quick Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Dump tasks here without planning. AI will detect these and suggest where to place them during your next planning session.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {adding && (
            <div className="flex gap-2 items-center flex-wrap p-2 bg-muted/50 rounded-lg border border-border">
              <Input
                placeholder="Quick task idea..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddUnplanned()}
                className="flex-1 min-w-[150px] h-8 text-sm"
                autoFocus
              />
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as Category)}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as "low" | "medium" | "high")}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8" onClick={handleAddUnplanned}>Add</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setAdding(false)}><X className="h-4 w-4" /></Button>
            </div>
          )}

          {unplanned.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No unplanned tasks. Click "Quick Add" to dump ideas here.
            </p>
          )}

          {unplanned.map((task) => {
            const catInfo = CATEGORIES[task.category];
            return (
              <div key={task.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/30 transition-colors">
                <Checkbox checked={task.completed} onCheckedChange={() => onToggleTask(task.id)} />
                <span className="text-sm">{catInfo.icon}</span>
                <span className={`text-sm flex-1 ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {task.title}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  task.priority === "high" ? "bg-destructive/10 text-destructive" :
                  task.priority === "medium" ? "bg-warning/10 text-warning" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {task.priority}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDeleteTask(task.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Planned tasks by scope */}
      {SCOPES.map((scope) => (
        <TaskSection
          key={scope}
          title={`${SCOPE_LABELS[scope].label} Todos`}
          icon={SCOPE_LABELS[scope].icon}
          scope={scope}
          tasks={getRootTasksForScope(planned, scope)}
          allTasks={planned}
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
