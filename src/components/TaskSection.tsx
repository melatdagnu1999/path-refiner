import { useState } from "react";
import { Task, TaskScope, Category, CATEGORIES } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp, Edit2, Check, X, GitBranch } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const NEXT_SCOPE: Record<TaskScope, TaskScope | null> = {
  year: "month",
  month: "week",
  week: "day",
  day: null,
};

const SCOPE_ICONS: Record<string, string> = { year: "🗓️", month: "📅", week: "📆", day: "📋" };

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
  onUpdateTask?: (task: Task) => void;
}

export function TaskSection({
  title, icon, scope, tasks, allTasks,
  onToggleTask, onToggleSubTask, onAddTask, onDeleteTask, onUpdateTask,
}: TaskSectionProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("class");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newDate, setNewDate] = useState<Date | undefined>(new Date());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [addingBreakdownFor, setAddingBreakdownFor] = useState<string | null>(null);
  const [bdTitle, setBdTitle] = useState("");
  const [bdDate, setBdDate] = useState<Date | undefined>(new Date());
  const [bdCategory, setBdCategory] = useState<Category>("class");

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

    onAddTask({
      id: crypto.randomUUID(), title: newTitle.trim(), category: newCategory,
      priority: newPriority, completed: false, scope, subTasks: [], dueDate,
    });
    setNewTitle("");
    setAdding(false);
  };

  const handleAddBreakdown = (parentTask: Task) => {
    const childScope = NEXT_SCOPE[parentTask.scope];
    if (!childScope || !bdTitle.trim()) return;
    let dueDate = bdDate || new Date();
    if (childScope === "month") dueDate = startOfMonth(dueDate);
    if (childScope === "week") dueDate = startOfWeek(dueDate, { weekStartsOn: 1 });

    onAddTask({
      id: crypto.randomUUID(), title: bdTitle.trim(), category: bdCategory,
      priority: parentTask.priority, completed: false, scope: childScope,
      parentId: parentTask.id, subTasks: [], dueDate,
    });
    setBdTitle("");
    setAddingBreakdownFor(null);
  };

  const saveEdit = (task: Task) => {
    onUpdateTask?.({ ...task, title: editTitle });
    setEditingId(null);
  };

  const dateLabel = (s: TaskScope) => {
    if (s === "month") return "Month";
    if (s === "week") return "Week of";
    if (s === "day") return "Date";
    return "Year";
  };

  const renderBreakdownTree = (parentId: string, depth: number = 0): React.ReactNode => {
    const children = getBreakdowns(parentId);
    if (children.length === 0) return null;

    return (
      <div className={`pl-4 mt-1 space-y-1 border-l-2 border-border`}>
        {children.map((bd) => {
          const childScope = NEXT_SCOPE[bd.scope];
          const hasChildren = allTasks.some((t) => t.parentId === bd.id);
          const isExpanded = expandedTasks.has(bd.id);
          return (
            <div key={bd.id}>
              <div className="flex items-center gap-2 text-xs py-1">
                <span>{SCOPE_ICONS[bd.scope] || "•"}</span>
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{bd.scope}</span>
                <Checkbox checked={bd.completed} onCheckedChange={() => onToggleTask(bd.id)} className="h-3 w-3" />
                <span className={bd.completed ? "line-through text-muted-foreground" : "text-foreground"}>
                  {bd.title}
                </span>
                {bd.dueDate && (
                  <span className="text-[10px] text-muted-foreground">{format(bd.dueDate, "MMM d")}</span>
                )}
                {hasChildren && (
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => toggleExpand(bd.id)}>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                )}
                {childScope && (
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" onClick={() => {
                    setAddingBreakdownFor(bd.id);
                    setBdCategory(bd.category);
                  }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => onDeleteTask(bd.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {addingBreakdownFor === bd.id && (
                <div className="flex gap-1 items-center ml-6 my-1">
                  <Input placeholder={`${NEXT_SCOPE[bd.scope]} task...`} value={bdTitle} onChange={(e) => setBdTitle(e.target.value)}
                    className="h-6 text-xs flex-1" autoFocus onKeyDown={(e) => e.key === "Enter" && handleAddBreakdown(bd)} />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-1.5">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {bdDate ? format(bdDate, "MMM d") : "Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={bdDate} onSelect={setBdDate} className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                  <Button size="sm" className="h-6 text-xs px-2" onClick={() => handleAddBreakdown(bd)}>Add</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs px-1" onClick={() => setAddingBreakdownFor(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {isExpanded && renderBreakdownTree(bd.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

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
                      {newDate ? format(newDate, scope === "month" ? "MMM yyyy" : "MMM d, yyyy") : dateLabel(scope)}
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
          const hasBreakdowns = allTasks.some((t) => t.parentId === task.id);
          const isExpanded = expandedTasks.has(task.id);
          const isEditing = editingId === task.id;
          const childScope = NEXT_SCOPE[scope];

          return (
            <div key={task.id} className="space-y-1">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 text-sm"
                        onKeyDown={(e) => e.key === "Enter" && saveEdit(task)} />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(task)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <TaskCard task={task} onToggleTask={onToggleTask} onToggleSubTask={onToggleSubTask} />
                  )}
                </div>
                <div className="flex flex-col gap-1 mt-2">
                  {onUpdateTask && !isEditing && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => { setEditingId(task.id); setEditTitle(task.title); }}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {childScope && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                      title={`Add ${childScope} breakdown`}
                      onClick={() => { setAddingBreakdownFor(task.id); setBdCategory(task.category); }}>
                      <GitBranch className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {hasBreakdowns && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => toggleExpand(task.id)}>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDeleteTask(task.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Add breakdown form */}
              {addingBreakdownFor === task.id && childScope && (
                <div className="flex gap-2 items-center ml-6 p-2 bg-muted/30 rounded border border-border">
                  <span className="text-xs text-muted-foreground">{SCOPE_ICONS[childScope]}</span>
                  <Input placeholder={`${childScope} breakdown...`} value={bdTitle} onChange={(e) => setBdTitle(e.target.value)}
                    className="h-7 text-xs flex-1" autoFocus onKeyDown={(e) => e.key === "Enter" && handleAddBreakdown(task)} />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {bdDate ? format(bdDate, childScope === "month" ? "MMM yyyy" : "MMM d") : "Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={bdDate} onSelect={setBdDate} className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                  <Select value={bdCategory} onValueChange={(v) => setBdCategory(v as Category)}>
                    <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORIES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-7 text-xs" onClick={() => handleAddBreakdown(task)}>Add</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingBreakdownFor(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Recursive breakdown tree */}
              {isExpanded && renderBreakdownTree(task.id)}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
