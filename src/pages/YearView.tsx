import { Task, CATEGORIES, Category } from "@/types/task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface YearViewProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
}

export default function YearView({ tasks, onToggleTask }: YearViewProps) {
  const yearTasks = tasks.filter((t) => t.scope === "year");
  const categories = Object.keys(CATEGORIES) as Category[];

  const grouped = categories
    .map((cat) => ({
      category: cat,
      info: CATEGORIES[cat],
      tasks: yearTasks.filter((t) => t.category === cat),
    }))
    .filter((g) => g.tasks.length > 0);

  const completed = yearTasks.filter((t) => t.completed).length;
  const progress = yearTasks.length > 0 ? (completed / yearTasks.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl">🗓️ Yearly Goals Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-2 text-sm">
            <span>Progress</span>
            <span className="font-semibold">{completed}/{yearTasks.length} completed</span>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {grouped.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No yearly goals yet. Add them from the Todo Hub.
        </p>
      )}

      {grouped.map(({ category, info, tasks: catTasks }) => (
        <Card key={category}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span>{info.icon}</span> {info.label}
              <span className="text-sm font-normal text-muted-foreground">
                {catTasks.filter((t) => t.completed).length}/{catTasks.length}
              </span>
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
                <Badge variant="outline" className="text-xs">
                  {task.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
