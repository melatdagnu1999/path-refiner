import { useState } from "react";
import { Task, CATEGORIES, Category } from "@/types/task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskTimer } from "@/components/TaskTimer";
import { format, isSameDay, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Clock, Edit2, Check, X, ChevronDown, ChevronUp } from "lucide-react";

interface DayViewProps {
  tasks: Task[];
  selectedDate: Date;
  onSetDate: (date: Date) => void;
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onRecordTime: (taskId: string, minutes: number) => void;
}

export default function DayView({ tasks, selectedDate, onSetDate, onToggleTask, onToggleSubTask, onAddTask, onUpdateTask, onRecordTime }: DayViewProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("class");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newTimer, setNewTimer] = useState("30");
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());

  // Get all day tasks for this date

const allDayTasks = tasks.filter(
  (t) =>
    t.scope === "day" &&
    t.dueDate &&
    isSameDay(new Date(t.dueDate), selectedDate)
);
  // Separate: container tasks (parent is a week task) vs standalone leaf tasks
  const containerTasks = allDayTasks.filter((t) => {
    if (!t.parentId) return false;
    const parent = tasks.find((p) => p.id === t.parentId);
    return parent && parent.scope === "week";
  });

  // Standalone tasks: day tasks with no parentId, or parent is not a day/week task
  const standaloneTasks = allDayTasks.filter((t) => {
    if (!t.parentId) return true;
    const parent = tasks.find((p) => p.id === t.parentId);
    // Not a child of a day container
    return !parent || (parent.scope !== "day" && parent.scope !== "week");
  });

  // Children of a container
  const getChildTasks = (containerId: string) =>
    allDayTasks
      .filter((t) => t.parentId === containerId)
      .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));

  // All leaf tasks (standalone + children of containers) for progress
  const leafTasks = [
    ...standaloneTasks,
    ...containerTasks.flatMap((c) => getChildTasks(c.id)),
  ];
  const completed = leafTasks.filter((t) => t.completed).length;
  const progress = leafTasks.length > 0 ? (completed / leafTasks.length) * 100 : 0;
  const totalTimeSpent = leafTasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0);

  const toggleContainer = (id: string) => {
    const next = new Set(expandedContainers);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedContainers(next);
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAddTask({
      id: crypto.randomUUID(), title: newTitle.trim(), category: newCategory,
      priority: newPriority, completed: false, scope: "day", subTasks: [],
      dueDate: selectedDate, startTime: newStart, endTime: newEnd,
      timerDuration: parseInt(newTimer) || 30,
    });
    setNewTitle("");
    setAdding(false);
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditStart(task.startTime || "");
    setEditEnd(task.endTime || "");
  };

  const saveEdit = (task: Task) => {
    onUpdateTask({ ...task, title: editTitle, startTime: editStart, endTime: editEnd });
    setEditingId(null);
  };

  const renderTaskRow = (task: Task) => {
    const catInfo = CATEGORIES[task.category];
    const isEditing = editingId === task.id;
    return (
      <Card key={task.id} className={`transition-all ${task.completed ? "opacity-60" : ""}`}>
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-3">
            {/* Time column */}
            <div className="flex-shrink-0 w-24 text-center">
              {isEditing ? (
                <div className="space-y-1">
                  <Input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="text-xs h-7" />
                  <Input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="text-xs h-7" />
                </div>
              ) : (
                <>
                  {task.startTime && task.endTime ? (
                    <div className="bg-primary/10 rounded-md px-2 py-1">
                      <div className="text-sm font-semibold text-primary">{task.startTime}</div>
                      <div className="text-[10px] text-muted-foreground">to {task.endTime}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No time</div>
                  )}
                </>
              )}
            </div>

            <Checkbox checked={task.completed} onCheckedChange={() => onToggleTask(task.id)} className="mt-1" />
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-7 text-sm" />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(task)}><Check className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg">{catInfo.icon}</span>
                  <span className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {task.title}
                  </span>
                  <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => startEdit(task)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {task.subTasks.length > 0 && (
                <div className="mt-2 pl-7 space-y-1 border-l-2 border-border">
                  {task.subTasks.map((st) => (
                    <div key={st.id} className="flex items-center gap-2">
                      <Checkbox checked={st.completed} onCheckedChange={() => onToggleSubTask(task.id, st.id)} className="h-3.5 w-3.5" />
                      <span className={`text-xs ${st.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{st.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {task.timeSpent != null && task.timeSpent > 0 && (
                <div className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {task.timeSpent}m recorded
                </div>
              )}
            </div>

            {task.timerDuration && !task.completed && (
              <TaskTimer
                durationMinutes={task.timerDuration}
                onComplete={(secs) => onRecordTime(task.id, Math.round(secs / 60))}
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => onSetDate(subDays(selectedDate, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-xl">📋 {format(selectedDate, "EEEE, MMMM d, yyyy")}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => onSetDate(addDays(selectedDate, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-2 text-sm">
            <span>Today's Progress</span>
            <div className="flex gap-4">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {totalTimeSpent}m tracked
              </span>
              <span className="font-semibold">{completed}/{leafTasks.length} completed</span>
            </div>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* Add task */}
      <div className="flex justify-end">
        <Button size="sm" className="gap-1" onClick={() => setAdding(!adding)}>
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      </div>

      {adding && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Task title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} autoFocus />
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <label className="text-xs text-muted-foreground">From</label>
                <Input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="w-28" />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="w-28" />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-muted-foreground">Timer (min)</label>
                <Input type="number" value={newTimer} onChange={(e) => setNewTimer(e.target.value)} className="w-20" />
              </div>
            </div>
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

      {/* Container tasks (from parsed DSL) with their children */}
      {containerTasks.map((container) => {
        const children = getChildTasks(container.id);
        const childCompleted = children.filter((c) => c.completed).length;
        const isExpanded = expandedContainers.has(container.id);

        return (
          <Card key={container.id} className="border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleContainer(container.id)}>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CardTitle className="text-sm font-medium">{container.title}</CardTitle>
                <span className="text-xs text-muted-foreground ml-auto">
                  {childCompleted}/{children.length} tasks
                </span>
              </div>
              {children.length > 0 && <Progress value={children.length > 0 ? (childCompleted / children.length) * 100 : 0} className="h-1.5 mt-1" />}
            </CardHeader>
            {isExpanded && (
              <CardContent className="space-y-2 pt-0">
                {children.map((child) => renderTaskRow(child))}
                {children.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No subtasks</p>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Standalone tasks */}
      {standaloneTasks.length > 0 && containerTasks.length > 0 && (
        <h3 className="text-sm font-medium text-muted-foreground pt-2">Other Tasks</h3>
      )}
      <div className="space-y-2">
        {standaloneTasks
          .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"))
          .map((task) => renderTaskRow(task))}
      </div>

      {allDayTasks.length === 0 && !adding && (
        <p className="text-center text-muted-foreground py-8">No tasks for this day.</p>
      )}
    </div>
  );
}
