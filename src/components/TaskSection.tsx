import { useState } from "react";
import { Task, TaskScope, Category, CATEGORIES } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp, Edit2, Check, X, GitBranch } from "lucide-react";
import { TaskGuidance } from "./TaskGuidance";
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
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("10:00");
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editCategory, setEditCategory] = useState<Category>("class");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("medium");
  const [addingBreakdownFor, setAddingBreakdownFor] = useState<string | null>(null);
  const [bdTitle, setBdTitle] = useState("");
  const [bdDate, setBdDate] = useState<Date | undefined>(new Date());
  const [bdCategory, setBdCategory] = useState<Category>("class");
  const [bdStartTime, setBdStartTime] = useState("09:00");
  const [bdEndTime, setBdEndTime] = useState("10:00");

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

    if (scope === "day") {
      task.startTime = newStartTime;
      task.endTime = newEndTime;
      const [sh, sm] = newStartTime.split(":").map(Number);
      const [eh, em] = newEndTime.split(":").map(Number);
      let mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins <= 0) mins += 24 * 60;
      task.timerDuration = mins;
    }

    onAddTask(task);
    setNewTitle("");
    setAdding(false);
  };

  const handleAddBreakdown = (parentTask: Task) => {
    const childScope = NEXT_SCOPE[parentTask.scope];
    if (!childScope || !bdTitle.trim()) return;
    let dueDate = bdDate || new Date();
    if (childScope === "month") dueDate = startOfMonth(dueDate);
    if (childScope === "week") dueDate = startOfWeek(dueDate, { weekStartsOn: 1 });

    const task: Task = {
      id: crypto.randomUUID(), title: bdTitle.trim(), category: bdCategory,
      priority: parentTask.priority, completed: false, scope: childScope,
      parentId: parentTask.id, subTasks: [], dueDate,
    };

    if (childScope === "day") {
      task.startTime = bdStartTime;
      task.endTime = bdEndTime;
      const [sh, sm] = bdStartTime.split(":").map(Number);
      const [eh, em] = bdEndTime.split(":").map(Number);
      let mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins <= 0) mins += 24 * 60;
      task.timerDuration = mins;
    }

    onAddTask(task);
    setBdTitle("");
    setAddingBreakdownFor(null);
  };

  const saveEdit = (task: Task) => {
    const updated: Task = {
      ...task,
      title: editTitle.trim() || task.title,
      category: editCategory,
      priority: editPriority,
    };
    if (editDate) updated.dueDate = editDate;
    if (task.scope === "day" || task.startTime) {
      updated.startTime = editStartTime || undefined;
      updated.endTime = editEndTime || undefined;
      if (updated.startTime && updated.endTime) {
        const [sh, sm] = updated.startTime.split(":").map(Number);
        const [eh, em] = updated.endTime.split(":").map(Number);
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins <= 0) mins += 24 * 60;
        updated.timerDuration = mins;
      }
    }
    onUpdateTask?.(updated);
    setEditingId(null);
  };

  const startEditItem = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditStartTime(task.startTime || "");
    setEditEndTime(task.endTime || "");
    setEditDate(task.dueDate ? new Date(task.dueDate) : new Date());
    setEditCategory(task.category);
    setEditPriority(task.priority);
  };

  const renderDatePicker = (
    selectedDate: Date | undefined,
    onSelect: (d: Date | undefined) => void,
    targetScope: TaskScope,
    startTime?: string,
    endTime?: string,
    onStartTimeChange?: (v: string) => void,
    onEndTimeChange?: (v: string) => void
  ) => (
    <div className="flex gap-1 items-center">
      {targetScope === "week" ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {selectedDate ? `Week of ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "MMM d")}` : "Pick week"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && onSelect(startOfWeek(d, { weekStartsOn: 1 }))}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {selectedDate ? format(selectedDate, targetScope === "month" ? "MMM yyyy" : "MMM d") : "Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={selectedDate} onSelect={onSelect} className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
      )}
      {targetScope === "day" && onStartTimeChange && onEndTimeChange && (
        <>
          <Input type="time" value={startTime || ""} onChange={(e) => onStartTimeChange(e.target.value)} className="h-7 w-24 text-xs" />
          <span className="text-xs text-muted-foreground">-</span>
          <Input type="time" value={endTime || ""} onChange={(e) => onEndTimeChange(e.target.value)} className="h-7 w-24 text-xs" />
        </>
      )}
    </div>
  );

  const renderBreakdownTree = (parentId: string, depth: number = 0): React.ReactNode => {
    const children = getBreakdowns(parentId);
    if (children.length === 0) return null;

    return (
      <div className={`pl-4 mt-1 space-y-1 border-l-2 border-border`}>
        {children.map((bd) => {
          const childScope = NEXT_SCOPE[bd.scope];
          const hasChildren = allTasks.some((t) => t.parentId === bd.id);
          const isExpanded = expandedTasks.has(bd.id);
          const isEditing = editingId === bd.id;

          return (
            <div key={bd.id}>
              <div className="flex items-center gap-2 text-xs py-1 flex-wrap">
                <span>{SCOPE_ICONS[bd.scope] || "•"}</span>
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{bd.scope}</span>
                <Checkbox checked={bd.completed} onCheckedChange={() => onToggleTask(bd.id)} className="h-3 w-3" />

                {isEditing ? (
                  <div className="flex items-center gap-1 flex-1 flex-wrap">
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                      className="h-6 text-xs flex-1 min-w-[120px]" onKeyDown={(e) => e.key === "Enter" && saveEdit(bd)} />
                    {(bd.scope === "day" || bd.startTime) && (
                      <>
                        <Input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="h-6 w-20 text-xs" />
                        <Input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="h-6 w-20 text-xs" />
                      </>
                    )}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-6 text-[10px] px-2">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {editDate ? format(editDate, "MMM d") : "Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={editDate} onSelect={setEditDate} className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                    <Select value={editCategory} onValueChange={(v) => setEditCategory(v as Category)}>
                      <SelectTrigger className="h-6 w-24 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORIES).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={editPriority} onValueChange={(v) => setEditPriority(v as "low" | "medium" | "high")}>
                      <SelectTrigger className="h-6 w-20 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => saveEdit(bd)}><Check className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                  </div>
                ) : (
                  <>
                    <span className={bd.completed ? "line-through text-muted-foreground" : "text-foreground"}>
                      {bd.title}
                    </span>
                    {bd.startTime && (
                      <span className="text-[10px] text-muted-foreground">{bd.startTime}-{bd.endTime}</span>
                    )}
                    {bd.dueDate && (
                      <span className="text-[10px] text-muted-foreground">{format(bd.dueDate, "MMM d")}</span>
                    )}
                    {bd.timerDuration && (
                      <span className="text-[10px] text-muted-foreground">({bd.timerDuration}m)</span>
                    )}
                  </>
                )}

                {!isEditing && (
                  <>
                    {hasChildren && (
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => toggleExpand(bd.id)}>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" onClick={() => startEditItem(bd)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
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
                  </>
                )}
              </div>

              {addingBreakdownFor === bd.id && childScope && (
                <div className="flex gap-1 items-center ml-6 my-1 flex-wrap">
                  <Input placeholder={`${childScope} task...`} value={bdTitle} onChange={(e) => setBdTitle(e.target.value)}
                    className="h-6 text-xs flex-1 min-w-[120px]" autoFocus onKeyDown={(e) => e.key === "Enter" && handleAddBreakdown(bd)} />
                  {renderDatePicker(
                    bdDate, setBdDate, childScope,
                    bdStartTime, bdEndTime, setBdStartTime, setBdEndTime
                  )}
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
              {(scope === "month" || scope === "week" || scope === "day") &&
                renderDatePicker(
                  newDate, setNewDate, scope,
                  newStartTime, newEndTime, setNewStartTime, setNewEndTime
                )
              }
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
                    <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border flex-wrap">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 text-sm flex-1"
                        onKeyDown={(e) => e.key === "Enter" && saveEdit(task)} />
                      {(task.scope === "day" || task.startTime) && (
                        <>
                          <Input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="h-8 w-28 text-sm" />
                          <Input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="h-8 w-28 text-sm" />
                        </>
                      )}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {editDate ? format(editDate, "MMM d") : "Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={editDate} onSelect={setEditDate} className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                      <Select value={editCategory} onValueChange={(v) => setEditCategory(v as Category)}>
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORIES).map(([key, val]) => (
                            <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={editPriority} onValueChange={(v) => setEditPriority(v as "low" | "medium" | "high")}>
                        <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => startEditItem(task)}>
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

              {addingBreakdownFor === task.id && childScope && (
                <div className="flex gap-2 items-center ml-6 p-2 bg-muted/30 rounded border border-border flex-wrap">
                  <span className="text-xs text-muted-foreground">{SCOPE_ICONS[childScope]}</span>
                  <Input placeholder={`${childScope} breakdown...`} value={bdTitle} onChange={(e) => setBdTitle(e.target.value)}
                    className="h-7 text-xs flex-1 min-w-[120px]" autoFocus onKeyDown={(e) => e.key === "Enter" && handleAddBreakdown(task)} />
                  {renderDatePicker(
                    bdDate, setBdDate, childScope,
                    bdStartTime, bdEndTime, setBdStartTime, setBdEndTime
                  )}
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

              {isExpanded && renderBreakdownTree(task.id)}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
