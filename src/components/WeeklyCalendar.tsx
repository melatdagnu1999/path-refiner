import { useState } from "react";
import { Task, CATEGORIES, Category } from "@/types/task";
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
} from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

interface WeeklyCalendarProps {
  weekStart: Date;
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
}

export function WeeklyCalendar({
  weekStart,
  tasks,
  onToggleTask,
}: WeeklyCalendarProps) {
  const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

  // Get all weekly tasks for this week
  const weeklyTasks = tasks.filter(
    (t) =>
      t.scope === "week" &&
      isSameDay(startOfWeek(t.dueDate, { weekStartsOn: 1 }), weekStartDate)
  );

  // Get daily children of a weekly task
  const getDailyChildren = (weeklyId: string) =>
    tasks.filter((t) => t.parentId === weeklyId && t.scope === "day");

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-2">
        {/* Header */}
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="p-3 bg-card border rounded"
          >
            <div className="text-center">
              <div className="text-xs text-muted-foreground uppercase">{format(day, "EEE")}</div>
              <div className="text-lg font-semibold">{format(day, "d")}</div>
              <div className="text-xs text-muted-foreground">{format(day, "MMM")}</div>
            </div>
          </div>
        ))}

        {/* Day cells */}
        {days.map((day) => (
          <div key={day.toISOString()} className="p-2 border min-h-[150px] space-y-2">
            {weeklyTasks.map((weekly) => {
              const children = getDailyChildren(weekly.id).filter((c) =>
                c.dueDate && isSameDay(c.dueDate, day)
              );

              if (children.length === 0) return null;

              const completed = children.filter((c) => c.completed).length;
              const progress = (completed / children.length) * 100;

              const category = CATEGORIES[weekly.category];

              return (
                <div key={weekly.id} className="space-y-1">
                  {/* Weekly parent heading */}
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span>{category.icon}</span>
                    <span>{weekly.title}</span>
                  </div>

                  {/* Progress */}
                  <Progress value={progress} className="h-1.5" />

                  {/* Daily tasks for this day */}
                  <div className="pl-4 space-y-1">
                    {children.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => onToggleTask(task.id)}
                        />
                        <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}