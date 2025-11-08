import { Task, CATEGORIES, Category } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { format, addDays, startOfWeek } from "date-fns";

interface WeeklyCalendarProps {
  weekStart: Date;
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
}

export function WeeklyCalendar({ weekStart, tasks, onToggleTask, onToggleSubTask }: WeeklyCalendarProps) {
  const categories = Object.keys(CATEGORIES) as Category[];
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(weekStart, { weekStartsOn: 1 }), i));

  const getTasksForDayAndCategory = (day: Date, category: Category) => {
    return tasks.filter(task => {
      const taskDate = format(task.dueDate, 'yyyy-MM-dd');
      const dayDate = format(day, 'yyyy-MM-dd');
      return taskDate === dayDate && task.category === category;
    });
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="grid grid-cols-[200px_repeat(7,minmax(180px,1fr))] gap-2">
          {/* Header row with dates */}
          <div className="sticky left-0 bg-background z-10 p-3 font-semibold text-foreground">
            Categories
          </div>
          {days.map(day => (
            <div key={day.toISOString()} className="p-3 bg-card rounded-t-lg border border-b-0 border-border">
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase">{format(day, 'EEE')}</div>
                <div className="text-lg font-semibold text-foreground">{format(day, 'd')}</div>
                <div className="text-xs text-muted-foreground">{format(day, 'MMM')}</div>
              </div>
            </div>
          ))}

          {/* Category rows */}
          {categories.map(category => {
            const categoryInfo = CATEGORIES[category];
            return (
              <>
                <div 
                  key={`${category}-label`}
                  className="sticky left-0 bg-background z-10 p-3 flex items-center gap-2 border-r border-border"
                >
                  <span className="text-2xl">{categoryInfo.icon}</span>
                  <span className="font-medium text-sm text-foreground">{categoryInfo.label}</span>
                </div>
                {days.map(day => {
                  const dayTasks = getTasksForDayAndCategory(day, category);
                  return (
                    <div 
                      key={`${category}-${day.toISOString()}`}
                      className="p-2 bg-card/50 border border-border min-h-[100px]"
                    >
                      <div className="space-y-2">
                        {dayTasks.map(task => (
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
              </>
            );
          })}
        </div>
      </div>
    </div>
  );
}
