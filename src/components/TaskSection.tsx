import { useState } from "react";
import { Task, TaskScope, Category, CATEGORIES } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

interface TaskSectionProps {
  title: string;
  icon: string;
  scope: TaskScope;
  tasks: Task[];
  allTasks: Task[];
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export function TaskSection({
  title, icon, scope, tasks, allTasks,
  onToggleTask, onToggleSubTask, onAddTask, onDeleteTask,
}: TaskSectionProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("class");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newDate, setNewDate] = useState<Date | undefined>(new Date());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const completed = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;

  const getBreakdowns = (parentId: string) => allTasks.filter((t) => t.parentId === parentId);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedTasks);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedTasks(next);
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    let dueDate = newDate || new Date();
    if (scope === "month") dueDate = startOfMonth(dueDate);
    if (scope === "week") dueDate = startOfWeek(dueDate, { weekStartsOn: 1 });

    const task: Task = {
      id: crypto.randomUUID(), title: newTitle.trim(), category: newCategory,
      priority: newPriority, completed: false, scope, subTasks: [], dueDate,
    };
    onAddTask(task);
    setNewTitle("");
    setAdding(false);
  };

  const dateLabel = () => {
    if (scope === "month") return "Month";
    if (scope === "week") return "Week of";
    if (scope === "day") return "Date";
    return "Year";
  };

  const scopeIcon: Record<string, string> = { month: "📅", week: "📆", day: "📋" };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>{icon}</span> {title}
            <span className="text-sm font-normal text-muted-foreground">{completed}/{tasks.length}</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setAdding(!adding)} className="gap-1">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {tasks.length > 0 && <Progress value={progress} className="h-1.5 mt-2" />}
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg border border-border">
            <Input placeholder="Task title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} autoFocus />
            <div className="flex gap-2 flex-wrap items-end">
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as Category)}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as "low" | "medium" | "high")}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              {(scope === "month" || scope === "week" || scope === "day") && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[180px] justify-start text-left text-sm", !newDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newDate ? format(newDate, scope === "month" ? "MMM yyyy" : "MMM d, yyyy") : dateLabel()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={newDate} onSelect={setNewDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              )}
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

        {tasks.map((task) => {
          const breakdowns = getBreakdowns(task.id);
          const hasBreakdowns = breakdowns.length > 0;
          const isExpanded = expandedTasks.has(task.id);
          return (
            <div key={task.id} className="space-y-1">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <TaskCard task={task} onToggleTask={onToggleTask} onToggleSubTask={onToggleSubTask} />
                </div>
                {hasBreakdowns && (
                  <Button variant="ghost" size="icon" className="mt-2 text-muted-foreground" onClick={() => toggleExpand(task.id)}>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="mt-2 text-muted-foreground hover:text-destructive" onClick={() => onDeleteTask(task.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {/* Breakdown tree */}
              {isExpanded && breakdowns.length > 0 && (
                <div className="pl-6 border-l-2 border-border ml-4 space-y-1">
                  {breakdowns.map((bd) => (
                    <div key={bd.id} className="flex items-center gap-2 text-xs py-1">
                      <span>{scopeIcon[bd.scope] || "•"}</span>
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{bd.scope}</span>
                      <span className={bd.completed ? "line-through text-muted-foreground" : "text-foreground"}>
                        {bd.title}
                      </span>
                      {bd.dueDate && (
                        <span className="text-[10px] text-muted-foreground">{format(bd.dueDate, "MMM d")}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
