import { Task, CATEGORIES, Category } from "@/types/task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";

interface DayViewProps {
  tasks: Task[];
  selectedDate: Date;
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
}

export default function DayView({ tasks, selectedDate, onToggleTask, onToggleSubTask }: DayViewProps) {
  const dayTasks = tasks
    .filter((t) => t.scope === "day" && t.dueDate && isSameDay(t.dueDate, selectedDate))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const categories = Object.keys(CATEGORIES) as Category[];
  const grouped = categories
    .map((cat) => ({
      category: cat,
      info: CATEGORIES[cat],
      tasks: dayTasks.filter((t) => t.category === cat),
    }))
    .filter((g) => g.tasks.length > 0);

  const completed = dayTasks.filter((t) => t.completed).length;
  const progress = dayTasks.length > 0 ? (completed / dayTasks.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl">
            📋 {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-2 text-sm">
            <span>Today's Progress</span>
            <span className="font-semibold">{completed}/{dayTasks.length} completed</span>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {grouped.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No tasks for today. Add daily tasks from the Todo Hub.
        </p>
      )}

      {grouped.map(({ category, info, tasks: catTasks }) => (
        <Card key={category}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span>{info.icon}</span> {info.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {catTasks.map((task) => (
              <div key={task.id} className="space-y-1">
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => onToggleTask(task.id)}
                  />
                  <span className={`flex-1 text-sm ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {task.title}
                  </span>
                  <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                </div>
                {task.subTasks.length > 0 && (
                  <div className="pl-9 space-y-1">
                    {task.subTasks.map((st) => (
                      <div key={st.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={st.completed}
                          onCheckedChange={() => onToggleSubTask(task.id, st.id)}
                          className="h-3.5 w-3.5"
                        />
                        <span className={`text-xs ${st.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {st.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
