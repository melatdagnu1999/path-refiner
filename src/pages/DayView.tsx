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
import { DailyAdvice } from "@/components/DailyAdvice";
import { GoogleCalendarSync } from "@/components/GoogleCalendarSync";
import { format, isSameDay, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Clock, Edit2, Check, X } from "lucide-react";

interface DayViewProps {
  tasks: Task[];
  allTasks: Task[];
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
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState<Category>("class");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("class");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newTimer, setNewTimer] = useState("30");

  // Get all daily tasks for today
  const allDayTasks = tasks.filter(
    (t) => t.scope === "day" && t.dueDate && isSameDay(new Date(t.dueDate), selectedDate)
  );

  // Group by parent weekly task
  const weeklyParentIds = new Set<string>();
  allDayTasks.forEach((t) => {
    if (t.parentId) {
      const parent = tasks.find((p) => p.id === t.parentId);
      if (parent && parent.scope === "week") {
        weeklyParentIds.add(parent.id);
      }
    }
  });

  const weeklyParents = tasks.filter((t) => weeklyParentIds.has(t.id));
  const getChildrenOfWeekly = (weeklyId: string) =>
    allDayTasks
      .filter((t) => t.parentId === weeklyId)
      .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));

  const standaloneTasks = allDayTasks.filter((t) => {
    if (!t.parentId) return true;
    const parent = tasks.find((p) => p.id === t.parentId);
    return !parent || parent.scope !== "week";
  });

  const allLeafTasks = [
    ...standaloneTasks,
    ...weeklyParents.flatMap((wp) => getChildrenOfWeekly(wp.id)),
  ];

  const completed = allLeafTasks.filter((t) => t.completed).length;
  const progress = allLeafTasks.length > 0 ? (completed / allLeafTasks.length) * 100 : 0;
  const totalTimeSpent = allLeafTasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const timerVal = parseInt(newTimer, 10) || 30;
    onAddTask({
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      completed: false,
      scope: "day",
      subTasks: [],
      dueDate: selectedDate,
      startTime: newStart,
      endTime: newEnd,
      timerDuration: timerVal,
    });
    setNewTitle("");
    setAdding(false);
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditStart(task.startTime || "");
    setEditEnd(task.endTime || "");
    setEditDate(task.dueDate ? format(task.dueDate, "yyyy-MM-dd") : format(selectedDate, "yyyy-MM-dd"));
    setEditCategory(task.category);
    setEditPriority(task.priority);
  };

  const saveEdit = (task: Task) => {
    const startTime = editStart || undefined;
    const endTime = editEnd || undefined;
    let timerDuration = task.timerDuration;
    if (startTime && endTime) {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      let mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins <= 0) mins += 24 * 60;
      timerDuration = mins;
    }
    onUpdateTask({
      ...task,
      title: editTitle.trim() || task.title,
      startTime,
      endTime,
      timerDuration,
      dueDate: editDate ? new Date(`${editDate}T00:00:00`) : task.dueDate,
      category: editCategory,
      priority: editPriority,
    });
    setEditingId(null);
  };

  const renderTaskRow = (task: Task) => {
    const catInfo = CATEGORIES[task.category];
    const isEditing = editingId === task.id;

    return (
      <Card key={task.id} className={`transition-all ${task.completed ? "opacity-60" : ""}`}>
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-24 text-center">
              {isEditing ? (
                <div className="space-y-1">
                  <Input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="text-xs h-7" />
                  <Input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="text-xs h-7" />
                </div>
              ) : task.startTime && task.endTime ? (
                <div className="bg-primary/10 rounded-md px-2 py-1">
                  <div className="text-sm font-semibold text-primary">{task.startTime}</div>
                  <div className="text-[10px] text-muted-foreground">to {task.endTime}</div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No time</div>
              )}
            </div>

            <Checkbox checked={task.completed} onCheckedChange={() => onToggleTask(task.id)} className="mt-1" />

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-2">
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-7 text-sm" />
                  <div className="flex flex-wrap gap-2">
                    <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-7 w-40 text-xs" />
                    <Select value={editCategory} onValueChange={(v) => setEditCategory(v as Category)}>
                      <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORIES).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={editPriority} onValueChange={(v) => setEditPriority(v as "low" | "medium" | "high")}>
                      <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(task)}><Check className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg">{catInfo.icon}</span>
                  <span className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {task.title}
                  </span>
                  <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                  {task.timerDuration && (
                    <span className="text-[10px] text-muted-foreground">({task.timerDuration}m)</span>
                  )}
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
              <span className="font-semibold">{completed}/{allLeafTasks.length} completed</span>
            </div>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

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
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as "low" | "medium" | "high")}>
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

      {/* Tasks grouped by weekly parent */}
      {weeklyParents.map((wp) => {
        const children = getChildrenOfWeekly(wp.id);
        if (children.length === 0) return null;
        const childCompleted = children.filter((c) => c.completed).length;

        return (
          <div key={wp.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">{CATEGORIES[wp.category].icon}</span>
              <h3 className="text-sm font-medium text-foreground">{wp.title}</h3>
              <span className="text-xs text-muted-foreground ml-auto">{childCompleted}/{children.length}</span>
            </div>
            <div className="space-y-2 pl-2 border-l-2 border-border">
              {children.map((task) => renderTaskRow(task))}
            </div>
          </div>
        );
      })}

      {/* Standalone tasks */}
      {standaloneTasks.length > 0 && weeklyParents.length > 0 && (
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
