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
import { startOfWeek } from "date-fns";
import { importDSL } from "@/lib/JournalImporter";

function detectCategory(text: string): Category {
  const lower = text.toLowerCase();
  if (lower.includes("class") || lower.includes("thesis")) return "class";
  if (lower.includes("work") || lower.includes("android")) return "work";
  if (lower.includes("career") || lower.includes("portfolio") || lower.includes("job")) return "career";
  if (lower.includes("church") || lower.includes("prayer") || lower.includes("spiritual")) return "church";
  if (lower.includes("self") || lower.includes("shower") || lower.includes("exercise")) return "self-care";
  if (lower.includes("skill") || lower.includes("learn") || lower.includes("dressmaking")) return "skill";
  if (lower.includes("relationship") || lower.includes("network") || lower.includes("meetup")) return "relationship";
  if (lower.includes("personal")) return "personal";
  if (lower.includes("fun") || lower.includes("tennis") || lower.includes("leisure") || lower.includes("recharge")) return "fun";
  return "work";
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

function computeDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60; // handle overnight
  return mins;
}

export interface ProgressReport {
  scope: string;
  targetId?: string;
  targetTitle?: string;
  percent: number;
  notes: string;
}

export function parseJournalDSL(input: string): { tasks: Task[]; progress: ProgressReport[] } {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const tasks: Task[] = [];
  const progress: ProgressReport[] = [];
  const taskById: Record<string, Task> = {};

  const yearlyMap: Record<string, string> = {};
  const monthlyMap: Record<string, string> = {};
  const weeklyMap: Record<string, string> = {};

  // Legacy format tracking
  let legacyCurrentWeeklyId = "";
  let legacyCurrentDate: Date | undefined;

  const registerTask = (task: Task) => {
    tasks.push(task);
    taskById[task.id] = task;
  };

  for (const line of lines) {
    // ===== ADD_CORE =====
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

    // ===== ADD_MONTHLY =====
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

    // ===== ADD_WEEKLY =====
    if (line.startsWith("ADD_WEEKLY")) {
      const index = line.match(/ADD_WEEKLY\s+(\d+)/)?.[1];
      const title = line.match(/TITLE\s+"([^"]+)"/)?.[1] || "Weekly Plan";
      const week = line.match(/WEEK\s+"([^"]+)"/)?.[1];
      const monthlyRef = line.match(/MONTHLY_ID\s+(\d+)/)?.[1];

      if (!index || !week || !monthlyRef || !monthlyMap[monthlyRef]) continue;

      const id = crypto.randomUUID();
      weeklyMap[index] = id;

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

    // ===== NEW FORMAT: ADD_SUBTASK_DAILY with WEEKLY_ID, DATE, TIME, TITLE =====
    if (line.startsWith("ADD_SUBTASK_DAILY")) {
      // Try new format first: ADD_SUBTASK_DAILY 1 WEEKLY_ID 1 DATE "2026-03-06" TIME "08:00-10:00" TITLE "Thesis Deep Work"
      const newMatch = line.match(
        /ADD_SUBTASK_DAILY\s+\d+\s+WEEKLY_ID\s+(\d+)\s+DATE\s+"([^"]+)"\s+TIME\s+"(\d{2}:\d{2})-(\d{2}:\d{2})"\s+TITLE\s+"([^"]+)"/
      );

      if (newMatch) {
        const [, weeklyRef, dateStr, startTime, endTime, title] = newMatch;
        const parentWeeklyId = weeklyMap[weeklyRef];
        if (!parentWeeklyId) continue;

        const date = safeDate(dateStr);
        if (!date) continue;

        const parentWeekly = taskById[parentWeeklyId];
        const duration = computeDuration(startTime, endTime);

        registerTask({
          id: crypto.randomUUID(),
          title,
          category: parentWeekly?.category ?? detectCategory(title),
          priority: "medium",
          completed: false,
          scope: "day",
          parentId: parentWeeklyId,
          dueDate: new Date(date),
          startTime,
          endTime,
          timerDuration: duration,
          timeSpent: 0,
          subTasks: [],
        });
        continue;
      }

      // Legacy format: ADD_SUBTASK_DAILY 1 "07:00-07:30: Wake up & morning routine"
      const legacyMatch = line.match(/ADD_SUBTASK_DAILY\s+\d+\s+"([^"]+)"/);
      if (legacyMatch && legacyCurrentDate) {
        const raw = legacyMatch[1];
        const timeMatch = raw.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s*:?\s*(.*)$/);

        const title = timeMatch ? timeMatch[3].trim() || raw : raw;
        const startTime = timeMatch ? timeMatch[1] : undefined;
        const endTime = timeMatch ? timeMatch[2] : undefined;
        const duration = startTime && endTime ? computeDuration(startTime, endTime) : undefined;

        const parentWeekly = legacyCurrentWeeklyId ? taskById[legacyCurrentWeeklyId] : undefined;

        registerTask({
          id: crypto.randomUUID(),
          title,
          category: parentWeekly?.category ?? detectCategory(title),
          priority: "medium",
          completed: false,
          scope: "day",
          parentId: legacyCurrentWeeklyId || undefined,
          dueDate: new Date(legacyCurrentDate),
          startTime,
          endTime,
          timerDuration: duration,
          timeSpent: 0,
          subTasks: [],
        });
      }
      continue;
    }

    // ===== ADD_DAILY (legacy) =====
    if (line.startsWith("ADD_DAILY")) {
      const date = line.match(/DATE\s+"([^"]+)"/)?.[1];
      const weeklyRef = line.match(/WEEKLY_ID\s+(\d+)/)?.[1];

      if (!date || !weeklyRef || !weeklyMap[weeklyRef]) continue;

      legacyCurrentWeeklyId = weeklyMap[weeklyRef];
      legacyCurrentDate = safeDate(date);
      continue;
    }

    // ===== PROGRESS =====
    // Format: PROGRESS SCOPE "year|month|week" ID 1 PERCENT 60 NOTES "On track..."
    if (line.startsWith("PROGRESS")) {
      const scope = line.match(/SCOPE\s+"([^"]+)"/)?.[1] || "year";
      const refId = line.match(/ID\s+(\d+)/)?.[1];
      const percent = parseInt(line.match(/PERCENT\s+(\d+)/)?.[1] || "0", 10);
      const notes = line.match(/NOTES\s+"([^"]+)"/)?.[1] || "";

      let targetId: string | undefined;
      let targetTitle: string | undefined;

      if (scope === "year" && refId && yearlyMap[refId]) {
        targetId = yearlyMap[refId];
        targetTitle = taskById[targetId]?.title;
      } else if (scope === "month" && refId && monthlyMap[refId]) {
        targetId = monthlyMap[refId];
        targetTitle = taskById[targetId]?.title;
      } else if (scope === "week" && refId && weeklyMap[refId]) {
        targetId = weeklyMap[refId];
        targetTitle = taskById[targetId]?.title;
      }

      progress.push({ scope, targetId, targetTitle, percent, notes });

      // Also update the task's progress field if found
      if (targetId && taskById[targetId]) {
        taskById[targetId].progress = percent;
        taskById[targetId].notes = notes;
      }
      continue;
    }
  }

  return { tasks, progress };
}

interface JournalParserProps {
  onImportTasks: (tasks: Task[]) => void;
}

export function JournalParser({ onImportTasks }: JournalParserProps) {
  const [open, setOpen] = useState(false);
  const [journal, setJournal] = useState("");
  const [preview, setPreview] = useState<Task[]>([]);
  const [progressReports, setProgressReports] = useState<ProgressReport[]>([]);

  const handleParse = () => {
    const result = parseJournalDSL(journal);
    setPreview(result.tasks);
    setProgressReports(result.progress);
  };

  const handleImport = async () => {
    const imported = await importDSL(journal);
    onImportTasks(imported);
    setJournal("");
    setPreview([]);
    setProgressReports([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="h-4 w-4" />
          Import DSL
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex gap-2">
            <FileText className="h-5 w-5" />
            Journal Planner DSL
          </DialogTitle>
        </DialogHeader>

        <Textarea
          value={journal}
          onChange={(e) => setJournal(e.target.value)}
          placeholder="Paste DSL here..."
          className="min-h-[200px] font-mono text-xs"
        />

        <div className="flex gap-2 mt-3">
          <Button variant="outline" onClick={handleParse}>
            Parse & Preview
          </Button>

          {preview.length > 0 && (
            <Button onClick={handleImport}>Import {preview.length} tasks</Button>
          )}
        </div>

        {progressReports.length > 0 && (
          <div className="mt-4 space-y-2 border rounded p-3 bg-accent/5">
            <p className="text-sm font-semibold">📊 Progress Analysis ({progressReports.length} reports):</p>
            {progressReports.map((p, i) => (
              <div key={i} className="text-xs space-y-0.5 border-b border-border/50 pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{p.scope}</span>
                  {p.targetTitle && <span className="font-medium">{p.targetTitle}</span>}
                  <span className="ml-auto font-semibold text-primary">{p.percent}%</span>
                </div>
                {p.notes && <p className="text-muted-foreground pl-2 italic">"{p.notes}"</p>}
              </div>
            ))}
          </div>
        )}

        {preview.length > 0 && (
          <div className="mt-4 space-y-1 max-h-[300px] overflow-y-auto border rounded p-3">
            <p className="text-sm font-semibold mb-2">Preview ({preview.length} tasks):</p>
            {preview.map((t) => (
              <div key={t.id} className="text-xs flex gap-2 items-center">
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{t.scope}</span>
                <span className="text-muted-foreground">{t.category}</span>
                {t.startTime && <span className="text-muted-foreground">{t.startTime}-{t.endTime}</span>}
                <span className="font-medium">{t.title}</span>
                {t.timerDuration && <span className="text-muted-foreground">({t.timerDuration}m)</span>}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
