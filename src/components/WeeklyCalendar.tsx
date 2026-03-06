import { useMemo, useState } from "react";
import { Task, CATEGORIES, Category } from "@/types/task";
import { format, addDays, endOfWeek, isSameDay, isWithinInterval, startOfWeek } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Check, X } from "lucide-react";

interface WeeklyCalendarProps {
  weekStart: Date;
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onUpdateTask?: (task: Task) => void;
}

const CATEGORY_ORDER: Category[] = [
  "class", "work", "career", "skill", "self-care", "church", "relationship", "fun", "personal",
];

export function WeeklyCalendar({
  weekStart,
  tasks,
  onToggleTask,
  onToggleSubTask: _onToggleSubTask,
  onUpdateTask,
}: WeeklyCalendarProps) {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState<Category>("class");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("medium");

  const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

  // All daily tasks this week
  const weekDayTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (t.scope !== "day" || !t.dueDate) return false;
        return isWithinInterval(t.dueDate, { start: weekStartDate, end: weekEndDate });
      }),
    [tasks, weekStartDate, weekEndDate]
  );

  // Weekly-scope tasks for this week
  const weeklyTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.scope === "week" &&
          isSameDay(startOfWeek(task.dueDate, { weekStartsOn: 1 }), weekStartDate)
      ),
    [tasks, weekStartDate]
  );

  // Get daily children of a weekly task
  const getDailyChildrenOfWeekly = (weeklyId: string) => {
    return weekDayTasks
      .filter((t) => t.parentId === weeklyId)
      .sort((a, b) => {
        const aDate = a.dueDate?.getTime() || 0;
        const bDate = b.dueDate?.getTime() || 0;
        if (aDate !== bDate) return aDate - bDate;
        return (a.startTime || "99:99").localeCompare(b.startTime || "99:99");
      });
  };

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditStart(task.startTime || "");
    setEditEnd(task.endTime || "");
    setEditDate(task.dueDate ? format(task.dueDate, "yyyy-MM-dd") : "");
    setEditCategory(task.category);
    setEditPriority(task.priority);
  };

  const saveEdit = (task: Task) => {
    if (!onUpdateTask) return;
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
    setEditingTaskId(null);
  };

  const renderEditRow = (task: Task) => (
    <div key={task.id} className="flex flex-wrap items-center gap-2 rounded border border-border p-2">
      <Input
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        className="h-7 text-xs flex-1 min-w-[140px]"
      />
      <Input
        type="date"
        value={editDate}
        onChange={(e) => setEditDate(e.target.value)}
        className="h-7 w-36 text-xs"
      />
      <Input
        type="time"
        value={editStart}
        onChange={(e) => setEditStart(e.target.value)}
        className="h-7 w-24 text-xs"
      />
      <Input
        type="time"
        value={editEnd}
        onChange={(e) => setEditEnd(e.target.value)}
        className="h-7 w-24 text-xs"
      />
      <Select value={editCategory} onValueChange={(v) => setEditCategory(v as Category)}>
        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
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
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(task)}>
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingTaskId(null)}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ===== WEEKLY CALENDAR GRID (categorized daily tasks) ===== */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => (
            <div key={day.toISOString()} className="p-3 bg-card border rounded">
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase">{format(day, "EEE")}</div>
                <div className="text-lg font-semibold">{format(day, "d")}</div>
                <div className="text-xs text-muted-foreground">{format(day, "MMM")}</div>
              </div>
            </div>
          ))}

          {days.map((day) => {
            const tasksForDay = weekDayTasks
              .filter((task) => task.dueDate && isSameDay(task.dueDate, day))
              .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));

            return (
              <div key={`tasks-${day.toISOString()}`} className="p-2 border min-h-[170px] space-y-2">
                {CATEGORY_ORDER.map((categoryKey) => {
                  const categoryTasks = tasksForDay.filter((task) => task.category === categoryKey);
                  if (categoryTasks.length === 0) return null;
                  const cat = CATEGORIES[categoryKey];

                  return (
                    <div key={categoryKey} className="space-y-1">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                      {categoryTasks.map((task) => (
                        <label key={task.id} className="flex items-start gap-1 text-xs">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() => onToggleTask(task.id)}
                            className="mt-0.5 h-3 w-3"
                          />
                          <span className={task.completed ? "line-through text-muted-foreground" : "text-foreground"}>
                            {task.startTime ? `${task.startTime} ` : ""}
                            {task.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  );
                })}

                {tasksForDay.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">No tasks</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== WEEKLY TASK LIST with daily subtasks (editable) ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Tasks & Daily Subtasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {weeklyTasks.map((weeklyTask) => {
            const dailyChildren = getDailyChildrenOfWeekly(weeklyTask.id);
            const completed = dailyChildren.filter((t) => t.completed).length;
            const progress = dailyChildren.length ? (completed / dailyChildren.length) * 100 : 0;

            // Group by date
            const groupedByDate = dailyChildren.reduce<Record<string, Task[]>>((acc, task) => {
              const key = format(task.dueDate, "yyyy-MM-dd");
              if (!acc[key]) acc[key] = [];
              acc[key].push(task);
              return acc;
            }, {});

            return (
              <div key={weeklyTask.id} className="space-y-2 border rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm">
                    {CATEGORIES[weeklyTask.category].icon} {weeklyTask.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {completed}/{dailyChildren.length} done
                  </div>
                </div>
                <Progress value={progress} className="h-1.5" />

                {Object.entries(groupedByDate)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([dateKey, dateTasks]) => (
                    <div key={dateKey} className="space-y-1">
                      <div className="text-xs text-muted-foreground font-medium">
                        {format(new Date(`${dateKey}T00:00:00`), "EEE, MMM d")}
                      </div>
                      {dateTasks.map((task) => {
                        if (editingTaskId === task.id) return renderEditRow(task);

                        return (
                          <div key={task.id} className="flex items-center gap-2 text-xs rounded p-1 hover:bg-muted/40">
                            <Checkbox checked={task.completed} onCheckedChange={() => onToggleTask(task.id)} className="h-3.5 w-3.5" />
                            <span className="text-muted-foreground">
                              {task.startTime && task.endTime ? `${task.startTime}-${task.endTime}` : ""}
                            </span>
                            <span className={task.completed ? "line-through text-muted-foreground" : "text-foreground"}>
                              {task.title}
                            </span>
                            {task.timerDuration && (
                              <span className="text-[10px] text-muted-foreground">({task.timerDuration}m)</span>
                            )}
                            {onUpdateTask && (
                              <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={() => startEdit(task)}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                {dailyChildren.length === 0 && (
                  <p className="text-xs text-muted-foreground">No daily subtasks for this weekly task.</p>
                )}
              </div>
            );
          })}

          {weeklyTasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No weekly tasks for this week.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
