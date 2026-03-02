import { useState } from "react";
import { Task, Category } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, FileText, AlertTriangle } from "lucide-react";
import { startOfWeek } from "date-fns";
import { importDSL } from "@/lib/JournalImporter";
/* =========================
   Utilities
========================= */

function detectCategory(text: string): Category {
  const lower = text.toLowerCase();
  if (lower.includes("🎓") || lower.includes("class")) return "class";
  if (lower.includes("💼") || lower.includes("work")) return "work";
  if (lower.includes("🚀") || lower.includes("career")) return "career";
  if (lower.includes("🎉") || lower.includes("fun")) return "fun";
  if (lower.includes("⛪") || lower.includes("church") || lower.includes("prayer")) return "church";
  if (lower.includes("🌿") || lower.includes("self-care") || lower.includes("reflection")) return "self-care";
  if (lower.includes("🛠️") || lower.includes("skill")) return "skill";
  if (lower.includes("💝") || lower.includes("relationship")) return "relationship";
  return "work";
}

function extractTime(text: string): {
  startTime?: string;
  endTime?: string;
  clean: string;
} {
  const match = text.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2}):\s*/);
  if (!match) return { clean: text.trim() };

  return {
    startTime: match[1],
    endTime: match[2],
    clean: text.replace(match[0], "").trim(),
  };
}

function extractDeadline(line: string): Date | undefined {
  const match = line.match(/DEADLINE\s+"(\d{4}-\d{2}-\d{2})"/);
  if (!match) return undefined;
  return new Date(match[1]);
}

/* =========================
   PARSER
========================= */

export function parseJournalDSL(input: string): Task[] {
  const lines = input
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const tasks: Task[] = [];

  const yearlyMap: Record<string, string> = {};
  const monthlyMap: Record<string, string> = {};
  const weeklyMap: Record<string, string> = {};
  const dailyMap: Record<string, string> = {};

  let currentMonthlyId = "";
  let currentWeeklyId = "";
  let currentDailyId = "";

  for (const line of lines) {
    /* ================= YEAR ================= */

    if (line.startsWith("ADD_CORE")) {
      const title = line.match(/"([^"]+)"/)?.[1] || "Year Goal";
      const catRaw = line.match(/CATEGORY\s+"([^"]+)"/)?.[1] || "";
      const deadline = extractDeadline(line);

      const id = crypto.randomUUID();
      const key = String(
        Object.keys(yearlyMap).length + 1
      );

      yearlyMap[key] = id;

      tasks.push({
        id,
        title,
        category: detectCategory(catRaw),
        priority: "high",
        completed: false,
        scope: "year",
        parentId: undefined,
        subTasks: [],
        dueDate:
          deadline ||
          new Date(new Date().getFullYear(), 11, 31),
      });
    }

    /* ================= MONTH ================= */

   // ONLY THE CORRECTED SECTIONS ARE SHOWN INSIDE YOUR FULL FILE STRUCTURE

/* ================= MONTH ================= */

else if (line.startsWith("ADD_MONTHLY")) {
  const index = line.match(/ADD_MONTHLY\s+(\d+)/)?.[1];
  const title = line.match(/TITLE\s+"([^"]+)"/)?.[1] || "Monthly Goal";
  const monthRaw = line.match(/MONTH\s+"(\d{4}-\d{2})"/)?.[1];
  const yearlyRef = line.match(/YEARLY_ID\s+(\d+)/)?.[1];
  const deadline = extractDeadline(line);

  if (!yearlyRef) continue;

  const parentId = yearlyMap[yearlyRef];

  // ✅ FIX: month should start at first day
  const date = monthRaw
    ? new Date(monthRaw + "-01")
    : new Date();

  const id = crypto.randomUUID();
  const key = index || String(Object.keys(monthlyMap).length + 1);
  monthlyMap[key] = id;
  currentMonthlyId = id;

  tasks.push({
    id,
    title,
    category: detectCategory(title),
    priority: "high",
    completed: false,
    scope: "month",
    parentId,
    subTasks: [],
    dueDate: date, // ✅ removed deadline override
  });
}


    /* ================= WEEK ================= */

    /* ================= WEEK ================= */

else if (line.startsWith("ADD_WEEKLY")) {
  const index = line.match(/ADD_WEEKLY\s+(\d+)/)?.[1];
  const title = line.match(/TITLE\s+"([^"]+)"/)?.[1] || "Weekly Plan";
  const weekRaw = line.match(/WEEK\s+"(\d{4}-\d{2}-\d{2})"/)?.[1];
  const monthlyRef = line.match(/MONTHLY_ID\s+(\d+)/)?.[1];
  const deadline = extractDeadline(line);

  if (!monthlyRef) continue;

  const parentId = monthlyMap[monthlyRef];

  const weekDate = weekRaw
    ? startOfWeek(new Date(weekRaw), { weekStartsOn: 1 })
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  const id = crypto.randomUUID();
  const key = index || String(Object.keys(weeklyMap).length + 1);
  weeklyMap[key] = id;
  currentWeeklyId = id;

  tasks.push({
    id,
    title,
    category: detectCategory(title),
    priority: "medium",
    completed: false,
    scope: "week",
    parentId,
    subTasks: [],
    dueDate: weekDate, // ✅ FIX: always use week start
  });
}


    /* ================= DAY CONTAINER ================= */

    else if (line.startsWith("ADD_DAILY")) {
      const index = line.match(/ADD_DAILY\s+(\d+)/)?.[1];
      const dateRaw = line.match(/DATE\s+"(\d{4}-\d{2}-\d{2})"/)?.[1];
      const weeklyRef = line.match(/WEEKLY_ID\s+(\d+)/)?.[1];
      const deadline = extractDeadline(line);

      if (!weeklyRef) continue;

      const parentId = weeklyMap[weeklyRef];
      const date = dateRaw ? new Date(dateRaw) : new Date();

      const id = crypto.randomUUID();
      const key = index || String(Object.keys(dailyMap).length + 1);
      dailyMap[key] = id;
      currentDailyId = id;

      tasks.push({
        id,
        title: `Daily Plan - ${date.toLocaleDateString()}`,
        category: "self-care",
        priority: "medium",
        completed: false,
        scope: "day",
        parentId,
        subTasks: [],
        dueDate: deadline || date,
      });
    }

    /* ================= TIMED TASK (REAL CHILD TASK) ================= */

    /* ================= TIMED TASK ================= */

else if (line.startsWith("ADD_SUBTASK_DAILY")) {
  const titleRaw = line.match(/"([^"]+)"/)?.[1];
  if (!titleRaw || !currentDailyId) continue;

  const { startTime, endTime, clean } = extractTime(titleRaw);

  // ✅ FIX: get parent safely
  const parentTask = tasks.find(t => t.id === currentDailyId);

  tasks.push({
    id: crypto.randomUUID(),
    title: clean,
    category: detectCategory(clean),
    priority: "medium",
    completed: false,
    scope: "day",
    parentId: currentDailyId,
    subTasks: [],
    dueDate: parentTask?.dueDate || new Date(), // ✅ stable
    startTime,
    endTime,
    timerDuration: 30,
  });
}

  }

  return tasks;
}

/* =========================
   SCOPE DETECTOR
========================= */

function getScopes(tasks: Task[]): Set<string> {
  return new Set(tasks.map((t) => t.scope));
}

/* =========================
   COMPONENT
========================= */

interface JournalParserProps {
  onImportTasks: (tasks: Task[], replacedScopes: string[]) => void;
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
  const importedTasks = await importDSL(journal); // parses + saves
  onImportTasks(importedTasks, Array.from(getScopes(importedTasks)));
  setJournal("");
  setPreview([]);
  setOpen(false);
};

  const parsedScopes =
    preview.length > 0
      ? Array.from(getScopes(preview))
      : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="h-4 w-4" />
          Get AI Insights
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Journal & Task Planner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="Paste your DSL here..."
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
            className="min-h-[200px] font-mono text-xs"
          />

          <div className="flex gap-2">
            <Button onClick={handleParse} variant="outline">
              Parse
            </Button>

            {preview.length > 0 && (
              <Button onClick={handleImport}>
                Import {preview.length} tasks
              </Button>
            )}
          </div>

          {preview.length > 0 && (
            <div className="text-xs p-2 bg-warning/10 border border-warning/30 rounded">
              Importing will replace:{" "}
              <strong>{parsedScopes.join(", ")}</strong>
            </div>
          )}

          {preview.length > 0 && (
            <div className="border rounded p-3 text-xs max-h-[300px] overflow-y-auto">
              <p className="font-semibold mb-2">
                Preview ({preview.length})
              </p>
              {preview.map((t) => (
                <div key={t.id} className="py-1 border-b last:border-0">
                  [{t.scope}] {t.title}
                  {t.startTime && (
                    <span className="ml-2 text-muted-foreground">
                      {t.startTime}-{t.endTime}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
