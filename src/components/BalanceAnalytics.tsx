import { Task, CATEGORIES, Category } from "@/types/task";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, differenceInWeeks, format } from "date-fns";
import { AlertTriangle, Clock, Calendar } from "lucide-react";

interface BalanceAnalyticsProps {
  tasks: Task[];
}

interface DeadlineInfo {
  task: Task;
  daysLeft: number;
  totalBreakdowns: number;
  completedBreakdowns: number;
  remainingWeeks: number;
  remainingDays: number;
  totalTimeMinutes: number;
  spentTimeMinutes: number;
}

export function BalanceAnalytics({ tasks }: BalanceAnalyticsProps) {
  const categories = Object.keys(CATEGORIES) as Category[];
  const now = new Date();

  // Calculate deadline info for parent tasks
  const getDeadlineInfos = (): DeadlineInfo[] => {
    const parentTasks = tasks.filter((t) => (t.scope === "year" || t.scope === "month") && t.dueDate);
    return parentTasks.map((task) => {
      const allChildren = getAllDescendants(task.id);
      const completedChildren = allChildren.filter((c) => c.completed);
      const daysLeft = differenceInDays(task.dueDate, now);
      const weeksLeft = differenceInWeeks(task.dueDate, now);
      const totalTime = allChildren.reduce((sum, c) => sum + (c.timerDuration || 30), 0);
      const spentTime = allChildren.reduce((sum, c) => sum + (c.timeSpent || 0), 0);

      return {
        task,
        daysLeft: Math.max(0, daysLeft),
        totalBreakdowns: allChildren.length,
        completedBreakdowns: completedChildren.length,
        remainingWeeks: Math.max(0, weeksLeft),
        remainingDays: Math.max(0, daysLeft),
        totalTimeMinutes: totalTime,
        spentTimeMinutes: spentTime,
      };
    }).filter((d) => d.totalBreakdowns > 0 && d.daysLeft > 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  };

  const getAllDescendants = (parentId: string): Task[] => {
    const children = tasks.filter((t) => t.parentId === parentId);
    return children.concat(children.flatMap((c) => getAllDescendants(c.id)));
  };

  const deadlines = getDeadlineInfos();

  const categoryStats = categories.map(category => {
    const categoryTasks = tasks.filter(t => t.category === category);
    const completed = categoryTasks.filter(t => t.completed).length;
    const total = categoryTasks.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    return { category, completed, total, percentage, info: CATEGORIES[category] };
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getBalanceScore = () => {
    const variance = categoryStats.reduce((acc, stat) => {
      return acc + Math.pow(stat.percentage - overallProgress, 2);
    }, 0) / categoryStats.length;
    return Math.round(Math.max(0, 100 - Math.sqrt(variance)));
  };

  const balanceScore = getBalanceScore();

  return (
    <div className="space-y-6">
      {/* Deadline Reminders */}
      {deadlines.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" /> Deadline Reminders
            </CardTitle>
            <CardDescription>Based on your breakdown tasks and time tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deadlines.slice(0, 5).map((d) => {
              const remaining = d.totalBreakdowns - d.completedBreakdowns;
              const progressPct = d.totalBreakdowns > 0 ? (d.completedBreakdowns / d.totalBreakdowns) * 100 : 0;
              const remainingTime = d.totalTimeMinutes - d.spentTimeMinutes;
              const isUrgent = d.daysLeft < 7;
              const catInfo = CATEGORIES[d.task.category];

              return (
                <div key={d.task.id} className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{catInfo.icon}</span>
                      <span className="font-medium text-sm text-foreground">{d.task.title}</span>
                      <Badge variant={isUrgent ? "destructive" : "outline"} className="text-[10px]">
                        {d.task.scope}
                      </Badge>
                    </div>
                    <Badge variant={isUrgent ? "destructive" : "secondary"} className="text-xs">
                      {d.daysLeft}d left
                    </Badge>
                  </div>
                  <Progress value={progressPct} className="h-2 mb-2" />
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due {format(d.task.dueDate, "MMM d, yyyy")}
                    </span>
                    <span>
                      ✅ {d.completedBreakdowns}/{d.totalBreakdowns} subtasks done
                    </span>
                    <span>
                      📋 {remaining} remaining
                    </span>
                    {d.remainingWeeks > 0 && <span>📆 {d.remainingWeeks} weeks left</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.round(remainingTime)}m of {d.totalTimeMinutes}m remaining
                    </span>
                  </div>
                  {isUrgent && remaining > 0 && (
                    <p className="text-xs text-destructive mt-2 font-medium">
                      ⚠️ {remaining} tasks left with only {d.daysLeft} days — {Math.ceil(remaining / Math.max(1, d.daysLeft))} tasks/day needed!
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Overall Progress */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl">Overall Progress</CardTitle>
          <CardDescription>Your journey this week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Tasks Completed</span>
              <span className="text-sm font-semibold">{completedTasks}/{totalTasks}</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Life Balance Score</span>
              <span className="text-sm font-semibold">{balanceScore}%</span>
            </div>
            <Progress value={balanceScore} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Progress across different areas of your life</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categoryStats.map(stat => (
            <div key={stat.category} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{stat.info.icon}</span>
                  <span className="font-medium text-sm">{stat.info.label}</span>
                </div>
                <span className="text-sm text-muted-foreground">{stat.completed}/{stat.total}</span>
              </div>
              <Progress value={stat.percentage} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="bg-gradient-to-br from-accent/10 to-secondary/10 border-accent/20">
        <CardHeader>
          <CardTitle>Nurturing Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {balanceScore > 70 && <p className="text-foreground">🌟 Beautiful balance! You're nurturing all areas of your life with intention and grace.</p>}
          {balanceScore <= 70 && balanceScore > 40 && <p className="text-foreground">🌱 You're making progress. Consider giving more attention to the quieter areas of your life.</p>}
          {balanceScore <= 40 && <p className="text-foreground">💝 It's okay to be unbalanced sometimes. Focus on what matters most right now, and be gentle with yourself.</p>}
          {overallProgress > 70 && <p className="text-foreground">✨ Your dedication is showing! Remember to celebrate these victories.</p>}
          {categoryStats.filter(s => s.percentage === 0 && s.total > 0).length > 0 && (
            <p className="text-foreground">🤍 Some areas haven't received attention yet. That's okay—growth happens in seasons.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
