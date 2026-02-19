import { useState } from "react";
import { Task, Category } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, FileText } from "lucide-react";
import { startOfWeek } from "date-fns";

function detectCategory(text: string): Category {
  const lower = text.toLowerCase();
  if (lower.includes("🎓") || lower.includes("class")) return "class";
  if (lower.includes("💼") || lower.includes("work")) return "work";
  if (lower.includes("🚀") || lower.includes("career")) return "career";
  if (lower.includes("🎉") || lower.includes("fun")) return "fun";
  if (lower.includes("⛪") || lower.includes("church") || lower.includes("prayer") || lower.includes("spiritual")) return "church";
  if (lower.includes("🌿") || lower.includes("self-care") || lower.includes("self care") || lower.includes("reflection") || lower.includes("stretch")) return "self-care";
  if (lower.includes("🛠️") || lower.includes("skill")) return "skill";
  if (lower.includes("💝") || lower.includes("relationship")) return "relationship";
  return "work";
}

function extractTime(text: string): { startTime?: string; endTime?: string; clean: string } {
  const timeMatch = text.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2}):\s*/);
  if (timeMatch) {
    return { startTime: timeMatch[1], endTime: timeMatch[2], clean: text.replace(timeMatch[0], "").trim() };
  }
  return { clean: text.trim() };
}

export function parseJournalDSL(input: string): Task[] {
  const lines = input.split("\n").map((l) => l.trim()).filter(Boolean);
  const tasks: Task[] = [];
  const yearlyMap: Record<string, string> = {};
  const monthlyMap: Record<string, string> = {};
  const weeklyMap: Record<string, string> = {};
  const dailyMap: Record<string, string> = {};
  let currentMonthlyId = "";
  let currentWeeklyId = "";
  let currentDailyId = "";

  for (const line of lines) {
    // YEARLY
    if (line.startsWith("ADD_CORE")) {
      const titleMatch = line.match(/"([^"]+)"/);
      const catMatch = line.match(/CATEGORY\s+"([^"]+)"/);
      const title = titleMatch?.[1] || "Yearly Goal";
      const cat = catMatch ? detectCategory(catMatch[1]) : "work";
      const id = crypto.randomUUID();
      const numMatch = line.match(/ADD_CORE/);
      // Use a simple index
      const key = String(tasks.filter((t) => t.scope === "year").length + 1);
      yearlyMap[key] = id;
      tasks.push({
        id, title, category: cat, priority: "high", completed: false,
        scope: "year", subTasks: [], dueDate: new Date(new Date().getFullYear(), 11, 31),
      });
    }
    // MONTHLY
    else if (line.startsWith("ADD_MONTHLY")) {
      const numMatch = line.match(/ADD_MONTHLY\s+(\d+)/);
      const titleMatch = line.match(/TITLE\s+"([^"]+)"/);
      const monthMatch = line.match(/MONTH\s+"(\d{4}-\d{2})"/);
      const yearIdMatch = line.match(/YEARLY_ID\s+(\d+)/);
      const title = titleMatch?.[1] || "Monthly Task";
      const parentId = yearIdMatch ? yearlyMap[yearIdMatch[1]] : undefined;
      const month = monthMatch ? new Date(monthMatch[1] + "-15") : new Date();
      const id = crypto.randomUUID();
      const key = numMatch?.[1] || String(tasks.filter((t) => t.scope === "month").length + 1);
      monthlyMap[key] = id;
      currentMonthlyId = id;
      tasks.push({
        id, title, category: detectCategory(title), priority: "high", completed: false,
        scope: "month", parentId, subTasks: [], dueDate: month,
      });
    }
    // SUBTASK MONTHLY
    else if (line.startsWith("ADD_SUBTASK_MONTHLY")) {
      const titleMatch = line.match(/"([^"]+)"/);
      if (titleMatch && currentMonthlyId) {
        const task = tasks.find((t) => t.id === currentMonthlyId);
        task?.subTasks.push({ id: crypto.randomUUID(), title: titleMatch[1], completed: false });
      }
    }
    // WEEKLY
    else if (line.startsWith("ADD_WEEKLY")) {
      const numMatch = line.match(/ADD_WEEKLY\s+(\d+)/);
      const titleMatch = line.match(/TITLE\s+"([^"]+)"/);
      const weekMatch = line.match(/WEEK\s+"(\d{4}-\d{2}-\d{2})"/);
      const monthlyIdMatch = line.match(/MONTHLY_ID\s+(\d+)/);
      const title = titleMatch?.[1] || "Weekly Task";
      const parentId = monthlyIdMatch ? monthlyMap[monthlyIdMatch[1]] : undefined;
      const weekDate = weekMatch ? startOfWeek(new Date(weekMatch[1]), { weekStartsOn: 1 }) : startOfWeek(new Date(), { weekStartsOn: 1 });
      const id = crypto.randomUUID();
      const key = numMatch?.[1] || String(tasks.filter((t) => t.scope === "week").length + 1);
      weeklyMap[key] = id;
      currentWeeklyId = id;
      tasks.push({
        id, title, category: detectCategory(title), priority: "medium", completed: false,
        scope: "week", parentId, subTasks: [], dueDate: weekDate,
      });
    }
    // SUBTASK WEEKLY
    else if (line.startsWith("ADD_SUBTASK_WEEKLY")) {
      const titleMatch = line.match(/"([^"]+)"/);
      if (titleMatch && currentWeeklyId) {
        const task = tasks.find((t) => t.id === currentWeeklyId);
        task?.subTasks.push({ id: crypto.randomUUID(), title: titleMatch[1], completed: false });
      }
    }
    // DAILY
    else if (line.startsWith("ADD_DAILY")) {
      const numMatch = line.match(/ADD_DAILY\s+(\d+)/);
      const dateMatch = line.match(/DATE\s+"(\d{4}-\d{2}-\d{2})"/);
      const weeklyIdMatch = line.match(/WEEKLY_ID\s+(\d+)/);
      const parentId = weeklyIdMatch ? weeklyMap[weeklyIdMatch[1]] : undefined;
      const date = dateMatch ? new Date(dateMatch[1]) : new Date();
      const id = crypto.randomUUID();
      const key = numMatch?.[1] || String(tasks.filter((t) => t.scope === "day").length + 1);
      dailyMap[key] = id;
      currentDailyId = id;
      tasks.push({
        id, title: `Daily Plan - ${date.toLocaleDateString()}`, category: "self-care", priority: "medium",
        completed: false, scope: "day", parentId, subTasks: [], dueDate: date,
      });
    }
    // SUBTASK DAILY
    else if (line.startsWith("ADD_SUBTASK_DAILY")) {
      const titleMatch = line.match(/"([^"]+)"/);
      if (titleMatch && currentDailyId) {
        const task = tasks.find((t) => t.id === currentDailyId);
        const { startTime, endTime, clean } = extractTime(titleMatch[1]);
        task?.subTasks.push({ id: crypto.randomUUID(), title: clean, completed: false });
        // If time info, we could store on parent or create individual day tasks
        if (startTime && endTime) {
          const cat = detectCategory(clean);
          tasks.push({
            id: crypto.randomUUID(), title: clean.replace(/^[^a-zA-Z]*/, ""), category: cat,
            priority: "medium", completed: false, scope: "day", parentId: currentDailyId,
            subTasks: [], dueDate: task?.dueDate || new Date(), startTime, endTime, timerDuration: 30,
          });
        }
      }
    }
  }
  return tasks;
}

interface JournalParserProps {
  onImportTasks: (tasks: Task[]) => void;
}

export function JournalParser({ onImportTasks }: JournalParserProps) {
  const [open, setOpen] = useState(false);
  const [journal, setJournal] = useState("");
  const [preview, setPreview] = useState<Task[]>([]);

  const handleParse = () => {
    const parsed = parseJournalDSL(journal);
    setPreview(parsed);
  };

  const handleImport = () => {
    onImportTasks(preview);
    setJournal("");
    setPreview([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Get AI Insights
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Journal & Task Planner
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder={`Paste your journal/plan DSL here...\n\nExample:\nADD_CORE "Complete Master's" CATEGORY "🎓 Class"\nADD_MONTHLY 1 YEARLY_ID 1 MONTH "2026-11" TITLE "Refine thesis"\nADD_SUBTASK_MONTHLY 1 "Finalize clipping logic"\nADD_WEEKLY 1 MONTHLY_ID 1 WEEK "2026-11-03" TITLE "Week 1"\nADD_SUBTASK_WEEKLY 1 "MON: 🎓 Class Refine logic"\nADD_DAILY 1 WEEKLY_ID 1 DATE "2026-11-03"\nADD_SUBTASK_DAILY 1 "06:30-07:00: 🌿 Self-care Morning prayer"`}
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
            className="min-h-[200px] font-mono text-xs"
          />
          <div className="flex gap-2">
            <Button onClick={handleParse} variant="outline" className="gap-1">
              <Sparkles className="h-4 w-4" /> Parse
            </Button>
            {preview.length > 0 && (
              <Button onClick={handleImport} className="gap-1">
                Import {preview.length} tasks
              </Button>
            )}
          </div>
          {preview.length > 0 && (
            <div className="border border-border rounded-lg p-3 space-y-1 max-h-[300px] overflow-y-auto">
              <p className="text-sm font-semibold text-foreground mb-2">Preview ({preview.length} tasks):</p>
              {preview.map((t) => (
                <div key={t.id} className="text-xs flex items-center gap-2 py-1 border-b border-border last:border-0">
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{t.scope}</span>
                  <span className="text-foreground">{t.title}</span>
                  {t.startTime && <span className="text-muted-foreground">{t.startTime}-{t.endTime}</span>}
                  {t.subTasks.length > 0 && <span className="text-muted-foreground">({t.subTasks.length} subtasks)</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
