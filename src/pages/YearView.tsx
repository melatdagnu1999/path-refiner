import { useState } from "react";
import { Task, CATEGORIES, Category } from "@/types/task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Edit2, Check, X, ChevronDown, ChevronUp, GitBranch, Trash2, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface YearViewProps {
  tasks: Task[];
  selectedYear: number;
  onSetYear: (year: number) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function YearView({ tasks, selectedYear, onSetYear, onToggleTask, onAddTask, onUpdateTask, onDeleteTask }: YearViewProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("class");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [addingBreakdownFor, setAddingBreakdownFor] = useState<string | null>(null);
  const [bdTitle, setBdTitle] = useState("");
  const [bdDate, setBdDate] = useState<Date | undefined>(new Date());
  const [bdScope, setBdScope] = useState<"month" | "week" | "day">("month");

  const yearTasks = tasks.filter((t) => t.scope === "year" && t.dueDate?.getFullYear() === selectedYear);

  const categories = Object.keys(CATEGORIES) as Category[];
  const grouped = categories
    .map((cat) => ({ category: cat, info: CATEGORIES[cat], tasks: yearTasks.filter((t) => t.category === cat) }))
    .filter((g) => g.tasks.length > 0);

  const completed = yearTasks.filter((t) => t.completed).length;
  const progress = yearTasks.length > 0 ? (completed / yearTasks.length) * 100 : 0;

  const toggleExpand = (id: string) => {
    const next = new Set(expandedGoals);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedGoals(next);
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAddTask({
      id: crypto.randomUUID(), title: newTitle.trim(), category: newCategory,
      priority: newPriority, completed: false, scope: "year", subTasks: [],
      dueDate: new Date(selectedYear, 11, 31),
    });
    setNewTitle("");
    setAdding(false);
  };

  const saveEdit = (task: Task) => {
    onUpdateTask({ ...task, title: editTitle });
    setEditingId(null);
  };

  const handleAddBreakdown = (parentTask: Task) => {
    if (!bdTitle.trim()) return;
    let dueDate = bdDate || new Date();
    if (bdScope === "month") dueDate = startOfMonth(dueDate);
    if (bdScope === "week") dueDate = startOfWeek(dueDate, { weekStartsOn: 1 });
    onAddTask({
      id: crypto.randomUUID(), title: bdTitle.trim(), category: parentTask.category,
      priority: parentTask.priority, completed: false, scope: bdScope,
      parentId: parentTask.id, subTasks: [], dueDate,
    });
    setBdTitle("");
    setAddingBreakdownFor(null);
  };

  const renderBreakdownTree = (parentId: string, depth: number = 0): React.ReactNode => {
    const children = tasks.filter((t) => t.parentId === parentId);
    if (children.length === 0) return null;
    const scopeIcon: Record<string, string> = { month: "📅", week: "📆", day: "📋" };
    const nextScope: Record<string, "month" | "week" | "day" | null> = { month: "week", week: "day", day: null };

    return (
      <div className="pl-4 mt-1 space-y-1 border-l-2 border-border">
        {children.map((bd) => {
          const hasChildren = tasks.some((t) => t.parentId === bd.id);
          const isExpanded = expandedGoals.has(bd.id);
          const childScope = nextScope[bd.scope];
          return (
            <div key={bd.id}>
              <div className="flex items-center gap-2 text-xs py-0.5">
                <span>{scopeIcon[bd.scope] || "•"}</span>
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{bd.scope}</span>
                <Checkbox checked={bd.completed} onCheckedChange={() => onToggleTask(bd.id)} className="h-3 w-3" />
                <span className={bd.completed ? "line-through text-muted-foreground" : "text-foreground"}>{bd.title}</span>
                {bd.dueDate && <span className="text-[10px] text-muted-foreground">{format(bd.dueDate, "MMM d")}</span>}
                {hasChildren && (
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => toggleExpand(bd.id)}>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                )}
                {childScope && (
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" onClick={() => {
                    setAddingBreakdownFor(bd.id);
                    setBdScope(childScope);
                  }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => onDeleteTask(bd.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {addingBreakdownFor === bd.id && childScope && (
                <div className="flex gap-1 items-center ml-6 my-1">
                  <Input placeholder={`${childScope} task...`} value={bdTitle} onChange={(e) => setBdTitle(e.target.value)}
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
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setAddingBreakdownFor(null)}>
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
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => onSetYear(selectedYear - 1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-xl">🗓️ {selectedYear} Goals</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => onSetYear(selectedYear + 1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-2 text-sm">
            <span>Progress</span>
            <span className="font-semibold">{completed}/{yearTasks.length} completed</span>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="sm" className="gap-1" onClick={() => setAdding(!adding)}>
          <Plus className="h-4 w-4" /> Add Goal
        </Button>
      </div>

      {adding && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Yearly goal..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} autoFocus />
            <div className="flex gap-2">
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as Category)}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as any)}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAdd}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {grouped.length === 0 && !adding && (
        <p className="text-center text-muted-foreground py-8">No yearly goals for {selectedYear}.</p>
      )}

      {grouped.map(({ category, info, tasks: catTasks }) => (
        <Card key={category}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span>{info.icon}</span> {info.label}
              <span className="text-sm font-normal text-muted-foreground">
                {catTasks.filter((t) => t.completed).length}/{catTasks.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {catTasks.map((task) => {
              const isEditing = editingId === task.id;
              const isExpanded = expandedGoals.has(task.id);
              const hasBreakdowns = tasks.some((t) => t.parentId === task.id);
              return (
                <div key={task.id} className="space-y-1">
                  <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                    <Checkbox checked={task.completed} onCheckedChange={() => onToggleTask(task.id)} />
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-7 text-sm" />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(task)}><Check className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ) : (
                      <>
                        <span className={`flex-1 text-sm ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {task.title}
                        </span>
                        <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(task.id); setEditTitle(task.title); }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Add breakdown"
                          onClick={() => { setAddingBreakdownFor(task.id); setBdScope("month"); setBdDate(new Date()); }}>
                          <GitBranch className="h-3 w-3" />
                        </Button>
                        {hasBreakdowns && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(task.id)}>
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDeleteTask(task.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>

                  {addingBreakdownFor === task.id && (
                    <div className="flex gap-2 items-center ml-8 p-2 bg-muted/30 rounded border border-border">
                      <Select value={bdScope} onValueChange={(v) => setBdScope(v as any)}>
                        <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">Monthly</SelectItem>
                          <SelectItem value="week">Weekly</SelectItem>
                          <SelectItem value="day">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Breakdown title..." value={bdTitle} onChange={(e) => setBdTitle(e.target.value)}
                        className="h-7 text-xs flex-1" autoFocus onKeyDown={(e) => e.key === "Enter" && handleAddBreakdown(task)} />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {bdDate ? format(bdDate, bdScope === "month" ? "MMM yyyy" : "MMM d") : "Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={bdDate} onSelect={setBdDate} className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                      <Button size="sm" className="h-7 text-xs" onClick={() => handleAddBreakdown(task)}>Add</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingBreakdownFor(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {isExpanded && renderBreakdownTree(task.id)}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
