import { useState } from "react";
import { Task, Category } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, FileText } from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { importDSL } from "@/lib/JournalImporter";

function detectCategory(text: string): Category {
  const lower = text.toLowerCase();

  if (lower.includes("class") || lower.includes("thesis")) return "class";
  if (lower.includes("work") || lower.includes("android")) return "work";
  if (lower.includes("career") || lower.includes("portfolio") || lower.includes("job")) return "career";
  if (lower.includes("church") || lower.includes("prayer") || lower.includes("spiritual")) return "church";
  if (lower.includes("self") || lower.includes("shower")) return "self-care";
  if (lower.includes("skill") || lower.includes("learn")) return "skill";
  if (lower.includes("relationship") || lower.includes("network")) return "relationship";
  if (lower.includes("personal")) return "personal";
  if (lower.includes("fun") || lower.includes("tennis") || lower.includes("leisure")) return "fun";

  return "work";
}

function extractTime(text: string) {
  const timeRegex = /^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s*:?\s*(.*)$/;
  const match = text.trim().match(timeRegex);

  if (!match) {
    return {
      clean: text.trim(),
      start: undefined,
      end: undefined,
    };
  }

  return {
    start: match[1],
    end: match[2],
    clean: match[3].trim() || text.trim(),
  };
}

function extractDeadline(line: string): Date | undefined {
  const match = line.match(/DEADLINE\s+"(\d{4}-\d{2}-\d{2})"/);
  if (!match) return undefined;
  return new Date(`${match[1]}T00:00:00`);
}

function safeDate(input: string): Date | undefined {
  const parsed = new Date(`${input}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function parseJournalDSL(input: string): Task[] {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const tasks: Task[] = [];
  const taskById: Record<string, Task> = {};

  const yearlyMap: Record<string, string> = {};
  const monthlyMap: Record<string, string> = {};
  const weeklyMap: Record<string, string> = {};

  let currentWeeklyId = "";
  let currentDailyContainerId = "";
  let currentDate: Date | undefined;

  const registerTask = (task: Task) => {
    tasks.push(task);
    taskById[task.id] = task;
  };

  for (const line of lines) {
    if (line.startsWith("ADD_CORE")) {
      const title = line.match(/"([^"]+)"/)?.[1] ?? "Year Goal";
      const categoryToken = line.match(/CATEGORY\s+"([^"]+)"/)?.[1] ?? "";
      const deadline = extractDeadline(line);

      const id = crypto.randomUUID();
      yearlyMap[String(Object.keys(yearlyMap).length + 1)] = id;

      registerTask({
        id,
        title,
        category: detectCategory(categoryToken || title),
        priority: "high",
        completed: false,
        scope: "year",
        subTasks: [],
        dueDate: deadline ?? new Date(new Date().getFullYear(), 11, 31),
      });
      continue;
    }

    if (line.startsWith("ADD_MONTHLY")) {
      const index = line.match(/ADD_MONTHLY\s+(\d+)/)?.[1];
      const title = line.match(/TITLE\s+"([^"]+)"/)?.[1] || "Monthly Goal";
      const month = line.match(/MONTH\s+"([^"]+)"/)?.[1];
      const yearlyRef = line.match(/YEARLY_ID\s+(\d+)/)?.[1];
      const deadline = extractDeadline(line);

      if (!index || !month || !yearlyRef || !yearlyMap[yearlyRef]) continue;

      const id = crypto.randomUUID();
      monthlyMap[index] = id;

      const parentCategory = taskById[yearlyMap[yearlyRef]]?.category;

      registerTask({
        id,
        title,
        category: parentCategory ?? detectCategory(title),
        priority: "high",
        completed: false,
        scope: "month",
        parentId: yearlyMap[yearlyRef],
        dueDate: deadline ?? safeDate(`${month}-01`) ?? new Date(),
        subTasks: [],
      });
      continue;
    }

    if (line.startsWith("ADD_WEEKLY")) {
      const index = line.match(/ADD_WEEKLY\s+(\d+)/)?.[1];
      const title = line.match(/TITLE\s+"([^"]+)"/)?.[1] || "Weekly Plan";
      const week = line.match(/WEEK\s+"([^"]+)"/)?.[1];
      const monthlyRef = line.match(/MONTHLY_ID\s+(\d+)/)?.[1];

      if (!index || !week || !monthlyRef || !monthlyMap[monthlyRef]) continue;

      const id = crypto.randomUUID();
      weeklyMap[index] = id;
      currentWeeklyId = id;
      currentDailyContainerId = "";

      const parentCategory = taskById[monthlyMap[monthlyRef]]?.category;
      const weekDate = safeDate(week) ?? new Date();

      registerTask({
        id,
        title,
        category: parentCategory ?? detectCategory(title),
        priority: "medium",
        completed: false,
        scope: "week",
        parentId: monthlyMap[monthlyRef],
        dueDate: startOfWeek(weekDate, { weekStartsOn: 1 }),
        subTasks: [],
      });
      continue;
    }

    if (line.startsWith("ADD_DAILY")) {
      const date = line.match(/DATE\s+"([^"]+)"/)?.[1];
      const weeklyRef = line.match(/WEEKLY_ID\s+(\d+)/)?.[1];

      if (!date || !weeklyRef || !weeklyMap[weeklyRef]) continue;

      currentWeeklyId = weeklyMap[weeklyRef];
      currentDate = safeDate(date);
      if (!currentDate) continue;

      const parentWeekly = taskById[currentWeeklyId];
      const dailyContainerId = crypto.randomUUID();
      currentDailyContainerId = dailyContainerId;

      registerTask({
        id: dailyContainerId,
        title: `Daily Plan - ${format(currentDate, "MMM d, yyyy")}`,
        category: parentWeekly?.category ?? "work",
        priority: "medium",
        completed: false,
        scope: "day",
        parentId: currentWeeklyId,
        dueDate: new Date(currentDate),
        subTasks: [],
      });
      continue;
    }

    if (line.startsWith("ADD_SUBTASK_DAILY")) {
      const raw = line.match(/"([^"]+)"/)?.[1];
      if (!raw || !currentDate) continue;

      const parsed = extractTime(raw);

      const fallbackCategory =
        taskById[currentDailyContainerId]?.category ??
        taskById[currentWeeklyId]?.category ??
        detectCategory(parsed.clean);

      const task: Task = {
        id: crypto.randomUUID(),
        title: parsed.clean,
        category: fallbackCategory,
        priority: "medium",
        completed: false,
        scope: "day",
        parentId: currentDailyContainerId || currentWeeklyId || undefined,
        dueDate: new Date(currentDate),
        subTasks: [],
      };

      if (parsed.start && parsed.end) {
        task.startTime = parsed.start;
        task.endTime = parsed.end;
      }

      registerTask(task);
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

  const handleImport = async () => {
    const imported = await importDSL(journal);
    onImportTasks(imported);
    setJournal("");
    setPreview([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="h-4 w-4" />
          Get AI Insights
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex gap-2">
            <FileText className="h-5 w-5" />
            Journal Planner
          </DialogTitle>
        </DialogHeader>

        <Textarea
          value={journal}
          onChange={(e) => setJournal(e.target.value)}
          placeholder="Paste DSL here..."
          className="min-h-[200px]"
        />

        <div className="flex gap-2 mt-3">
          <Button variant="outline" onClick={handleParse}>
            Parse
          </Button>

          {preview.length > 0 && (
            <Button onClick={handleImport}>Import {preview.length}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
