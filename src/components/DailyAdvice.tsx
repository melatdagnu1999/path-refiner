import { Task, CATEGORIES } from "@/types/task";
import { isToday, isSameDay } from "date-fns";
import { Lightbulb } from "lucide-react";

interface DailyAdviceProps {
  tasks: Task[];
  selectedDate: Date;
  allTasks: Task[];
}

export function DailyAdvice({ tasks, selectedDate, allTasks }: DailyAdviceProps) {
  const dayTasks = tasks.filter(
    (t) => t.scope === "day" && t.dueDate && isSameDay(new Date(t.dueDate), selectedDate)
  );

  const completed = dayTasks.filter((t) => t.completed).length;
  const total = dayTasks.length;
  const highPriority = dayTasks.filter((t) => t.priority === "high" && !t.completed);
  const noTimeTasks = dayTasks.filter((t) => !t.startTime && !t.completed);
  const totalMinutes = dayTasks.reduce((s, t) => s + (t.timerDuration || 0), 0);

  // Check weekly parent progress
  const weeklyParentIds = new Set(dayTasks.map((t) => t.parentId).filter(Boolean));
  const weeklyParents = allTasks.filter((t) => weeklyParentIds.has(t.id) && t.scope === "week");
  const behindGoals = weeklyParents.filter((wp) => {
    const children = allTasks.filter((t) => t.parentId === wp.id && t.scope === "day");
    const done = children.filter((c) => c.completed).length;
    return children.length > 0 && done / children.length < 0.3;
  });

  const tips: string[] = [];

  if (total === 0) {
    tips.push("📝 No tasks planned yet. Import your DSL or add tasks to make the most of today!");
  } else {
    if (highPriority.length > 0) {
      tips.push(`🎯 Focus first on: "${highPriority[0].title}" (high priority)`);
    }
    if (noTimeTasks.length > 0) {
      tips.push(`⏰ ${noTimeTasks.length} task(s) have no time set — schedule them for better structure.`);
    }
    if (totalMinutes > 480) {
      tips.push(`⚠️ You have ${Math.round(totalMinutes / 60)}h of tasks planned — consider trimming to avoid burnout.`);
    } else if (totalMinutes > 0 && totalMinutes < 120) {
      tips.push(`💡 Light day with ~${totalMinutes}m planned. Great time to tackle a skill or career goal!`);
    }
    if (behindGoals.length > 0) {
      tips.push(`📊 "${behindGoals[0].title}" weekly goal is behind — prioritize related tasks today.`);
    }
    if (isToday(selectedDate) && completed > 0 && completed === total) {
      tips.push("🎉 All tasks done! Amazing work today!");
    } else if (isToday(selectedDate) && completed > total / 2) {
      tips.push(`🔥 Great progress — ${completed}/${total} done. Keep the momentum!`);
    }
  }

  if (tips.length === 0) return null;

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 flex gap-3 items-start">
      <Lightbulb className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <div className="space-y-1">
        {tips.map((tip, i) => (
          <p key={i} className="text-sm text-foreground/80">{tip}</p>
        ))}
      </div>
    </div>
  );
}
