import { Task, CATEGORIES, Category } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { format, addDays, startOfWeek, isWithinInterval } from "date-fns";

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
  onToggleSubTask,
}: WeeklyCalendarProps) {
  const categories = Object.keys(CATEGORIES) as Category[];

  const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });

  const days = Array.from({ length: 7 }, (_, i) =>
    addDays(weekStartDate, i)
  );

  /* ================================
     HELPERS
  ================================= */

  const getDailyTasks = (day: Date, category: Category) => {
    const dayKey = format(day, "yyyy-MM-dd");

    return tasks.filter(
      (t) =>
        t.scope === "day" &&
        format(t.dueDate, "yyyy-MM-dd") === dayKey &&
        t.category === category
    );
  };

  const getWeeklyTasks = (category: Category) => {
    return tasks.filter(
      (t) =>
        t.scope === "week" &&
        t.category === category &&
        isWithinInterval(t.dueDate, {
          start: weekStartDate,
          end: addDays(weekStartDate, 6),
        })
    );
  };

  /* ================================
     RENDER
  ================================= */

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="grid grid-cols-[200px_repeat(7,minmax(180px,1fr))] gap-2">

          {/* Header */}
          <div className="sticky left-0 bg-background z-10 p-3 font-semibold">
            Categories
          </div>

          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="p-3 bg-card border"
            >
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase">
                  {format(day, "EEE")}
                </div>
                <div className="text-lg font-semibold">
                  {format(day, "d")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(day, "MMM")}
                </div>
              </div>
            </div>
          ))}

          {/* CATEGORY ROWS */}
          {categories.map((category) => {
            const categoryInfo = CATEGORIES[category];
            const weeklyTasks = getWeeklyTasks(category);

            return (
              <>
                {/* Category Label */}
                <div
                  key={`${category}-label`}
                  className="sticky left-0 bg-background z-10 p-3 flex items-center gap-2 border-r"
                >
                  <span className="text-2xl">
                    {categoryInfo.icon}
                  </span>
                  <span className="font-medium text-sm">
                    {categoryInfo.label}
                  </span>
                </div>

                {/* DAILY TASKS PER DAY */}
                {days.map((day) => {
                  const dayTasks = getDailyTasks(day, category);

                  return (
                    <div
                      key={`${category}-${day.toISOString()}`}
                      className="p-2 border min-h-[100px]"
                    >
                      <div className="space-y-2">
                        {dayTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onToggleTask={onToggleTask}
                            onToggleSubTask={onToggleSubTask}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* WEEKLY TASKS (RENDER ONCE PER CATEGORY) */}
                {weeklyTasks.length > 0 && (
                  <div className="col-span-8 p-4 border-t bg-muted/20">
                    {weeklyTasks.map((task) => {
                      const completed =
                        task.subTasks?.filter((s) => s.completed)
                          .length || 0;

                      const total =
                        task.subTasks?.length || 0;

                      return (
                        <div key={task.id} className="mb-6">
                          <div className="font-semibold">
                            {task.title}
                          </div>

                          <div className="text-xs text-muted-foreground mb-2">
                            {completed}/{total} complete
                          </div>

                          <div className="space-y-1">
                            {task.subTasks?.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={sub.completed}
                                  onChange={() =>
                                    onToggleSubTask(task.id, sub.id)
                                  }
                                />
                                <span>{sub.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })}
        </div>
      </div>
    </div>
  );
}