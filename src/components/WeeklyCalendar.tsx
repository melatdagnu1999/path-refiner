import { useState } from "react";
import { Task, CATEGORIES, Category } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { format, addDays, startOfWeek, isSameDay, isWithinInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Edit2, Check, X, Clock } from "lucide-react";

interface WeeklyCalendarProps {
  weekStart: Date;
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onUpdateTask?: (task: Task) => void;
}

export function WeeklyCalendar({
  weekStart,
  tasks,
  onToggleTask,
  onToggleSubTask,
  onUpdateTask,
}: WeeklyCalendarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [expandedWeekly, setExpandedWeekly] = useState<Set<string>>(new Set());

  const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

  // Get weekly tasks for this week
  const weeklyTasks = tasks.filter(
    (t) =>
      t.scope === "week" &&
      isWithinInterval(t.dueDate, {
        start: weekStartDate,
        end: addDays(weekStartDate, 6),
      })
  );

  // Get daily children of a task
  const getDailyChildren = (parentId: string) =>
    tasks.filter((t) => t.scope === "day" && t.parentId === parentId);

  // Get leaf daily tasks (children of daily containers) for a specific day
  const getLeafTasksForDay = (containerId: string, day: Date) => {
    // First find daily containers under this weekly task
    const dailyContainers = tasks.filter(
      (t) => t.scope === "day" && t.parentId === containerId && t.dueDate && isSameDay(t.dueDate, day)
    );
    // Then get children of those containers
    const leafTasks: Task[] = [];
    for (const container of dailyContainers) {
      const children = tasks.filter((t) => t.parentId === container.id);
      leafTasks.push(...children);
    }
    // Also include direct daily children that are on this day
    const directChildren = tasks.filter(
      (t) => t.scope === "day" && t.parentId === containerId && t.dueDate && isSameDay(t.dueDate, day) &&
        !tasks.some((c) => c.parentId === t.id) // only if it's a leaf (no children)
    );
    // Combine: if containers have children, use those; otherwise use containers themselves
    if (leafTasks.length > 0) return leafTasks;
    return directChildren;
  };

  // Get all daily descendants of a weekly task
  const getAllDailyDescendants = (weeklyId: string): Task[] => {
    const result: Task[] = [];
    const collect = (parentId: string) => {
      const children = tasks.filter((t) => t.parentId === parentId);
      for (const child of children) {
        if (!tasks.some((t) => t.parentId === child.id)) {
          // Leaf node
          result.push(child);
        } else {
          collect(child.id);
        }
      }
    };
    collect(weeklyId);
    return result;
  };

  // Standalone daily tasks (no weekly parent)
  const getStandaloneDailyTasks = (day: Date, category: Category) =>
    tasks.filter((t) => {
      if (t.scope !== "day" || !t.dueDate || !isSameDay(t.dueDate, day) || t.category !== category) return false;
      // No parent or parent is not a week/day task
      if (!t.parentId) return true;
      const parent = tasks.find((p) => p.id === t.parentId);
      return !parent || (parent.scope !== "week" && parent.scope !== "day");
    });

  const toggleWeekly = (id: string) => {
    const next = new Set(expandedWeekly);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedWeekly(next);
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditStart(task.startTime || "");
    setEditEnd(task.endTime || "");
  };

  const saveEdit = (task: Task) => {
    onUpdateTask?.({ ...task, title: editTitle, startTime: editStart || undefined, endTime: editEnd || undefined });
    setEditingId(null);
  };

  const categories = Object.keys(CATEGORIES) as Category[];

  return (
    <div className="space-y-6">
      {/* ===== CALENDAR GRID ===== */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid grid-cols-[200px_repeat(7,minmax(180px,1fr))] gap-2">
            {/* Header */}
            <div className="sticky left-0 bg-background z-10 p-3 font-semibold">Categories</div>
            {days.map((day) => (
              <div key={day.toISOString()} className="p-3 bg-card border">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground uppercase">{format(day, "EEE")}</div>
                  <div className="text-lg font-semibold">{format(day, "d")}</div>
                  <div className="text-xs text-muted-foreground">{format(day, "MMM")}</div>
                </div>
              </div>
            ))}

            {/* Category rows - standalone tasks */}
            {categories.map((category) => {
              const categoryInfo = CATEGORIES[category];
              const hasAny = days.some((day) => getStandaloneDailyTasks(day, category).length > 0);
              if (!hasAny) return null;

              return (
                <div key={category} className="contents">
                  <div className="sticky left-0 bg-background z-10 p-3 flex items-center gap-2 border-r">
                    <span className="text-2xl">{categoryInfo.icon}</span>
                    <span className="font-medium text-sm">{categoryInfo.label}</span>
                  </div>
                  {days.map((day) => {
                    const dayTasks = getStandaloneDailyTasks(day, category);
                    return (
                      <div key={`${category}-${day.toISOString()}`} className="p-2 border min-h-[80px]">
                        <div className="space-y-1">
                          {dayTasks.map((task) => (
                            <TaskCard key={task.id} task={task} onToggleTask={onToggleTask} onToggleSubTask={onToggleSubTask} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== WEEKLY TASK LIST WITH DAILY BREAKDOWNS ===== */}
      {weeklyTasks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">📆 Weekly Tasks</h3>
          {weeklyTasks.map((weeklyTask) => {
            const allDescendants = getAllDailyDescendants(weeklyTask.id);
            const completedCount = allDescendants.filter((t) => t.completed).length;
            const totalCount = allDescendants.length;
            const progressVal = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
            const isExpanded = expandedWeekly.has(weeklyTask.id);
            const catInfo = CATEGORIES[weeklyTask.category];

            return (
              <Card key={weeklyTask.id} className="border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{catInfo.icon}</span>
                    <Checkbox checked={weeklyTask.completed} onCheckedChange={() => onToggleTask(weeklyTask.id)} />
                    <CardTitle className="text-sm font-medium flex-1">{weeklyTask.title}</CardTitle>
                    <Badge variant="outline" className="text-xs">{weeklyTask.priority}</Badge>
                    <span className="text-xs text-muted-foreground">{completedCount}/{totalCount}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleWeekly(weeklyTask.id)}>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  {totalCount > 0 && <Progress value={progressVal} className="h-1.5 mt-1" />}
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-3">
                    {/* Group by day */}
                    {days.map((day) => {
                      const dayDescendants = allDescendants.filter(
                        (t) => t.dueDate && isSameDay(t.dueDate, day)
                      ).sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));

                      if (dayDescendants.length === 0) return null;

                      return (
                        <div key={day.toISOString()} className="border-l-2 border-primary/30 pl-3">
                          <div className="text-xs font-semibold text-muted-foreground mb-1">
                            {format(day, "EEEE, MMM d")}
                          </div>
                          <div className="space-y-1">
                            {dayDescendants.map((task) => {
                              const isEditing = editingId === task.id;
                              const taskCat = CATEGORIES[task.category];

                              return (
                                <div key={task.id} className="flex items-center gap-2 py-1 text-sm">
                                  <Checkbox
                                    checked={task.completed}
                                    onCheckedChange={() => onToggleTask(task.id)}
                                    className="h-3.5 w-3.5"
                                  />

                                  {isEditing ? (
                                    <div className="flex items-center gap-1 flex-1">
                                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                                        className="h-6 text-xs flex-1" onKeyDown={(e) => e.key === "Enter" && saveEdit(task)} />
                                      <Input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="h-6 w-20 text-xs" />
                                      <Input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="h-6 w-20 text-xs" />
                                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => saveEdit(task)}>
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setEditingId(null)}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-sm">{taskCat.icon}</span>
                                      {task.startTime && (
                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                                          {task.startTime}-{task.endTime}
                                        </span>
                                      )}
                                      <span className={`flex-1 text-xs ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                        {task.title}
                                      </span>
                                      {task.timeSpent != null && task.timeSpent > 0 && (
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                          <Clock className="h-2.5 w-2.5" />{task.timeSpent}m
                                        </span>
                                      )}
                                      {onUpdateTask && (
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => startEdit(task)}>
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
