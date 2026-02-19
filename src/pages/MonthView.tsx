import { Task, CATEGORIES, Category } from "@/types/task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format, isSameMonth } from "date-fns";

interface MonthViewProps {
  tasks: Task[];
  selectedMonth: Date;
  onToggleTask: (taskId: string) => void;
}

export default function MonthView({ tasks, selectedMonth, onToggleTask }: MonthViewProps) {
  const monthTasks = tasks.filter(
    (t) => t.scope === "month" && t.dueDate && isSameMonth(t.dueDate, selectedMonth)
  );

  const categories = Object.keys(CATEGORIES) as Category[];
  const grouped = categories
    .map((cat) => ({
      category: cat,
      info: CATEGORIES[cat],
      tasks: monthTasks.filter((t) => t.category === cat),
    }))
    .filter((g) => g.tasks.length > 0);

  const completed = monthTasks.filter((t) => t.completed).length;
  const progress = monthTasks.length > 0 ? (completed / monthTasks.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl">
            📅 {format(selectedMonth, "MMMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-2 text-sm">
            <span>Monthly Progress</span>
            <span className="font-semibold">{completed}/{monthTasks.length} completed</span>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {grouped.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No monthly tasks for {format(selectedMonth, "MMMM")}. Add them from the Todo Hub.
        </p>
      )}

      {grouped.map(({ category, info, tasks: catTasks }) => (
        <Card key={category}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span>{info.icon}</span> {info.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {catTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => onToggleTask(task.id)}
                />
                <span className={`flex-1 text-sm ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {task.title}
                </span>
                {task.dueDate && (
                  <span className="text-xs text-muted-foreground">
                    {format(task.dueDate, "MMM d")}
                  </span>
                )}
                <Badge variant="outline" className="text-xs">{task.priority}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
