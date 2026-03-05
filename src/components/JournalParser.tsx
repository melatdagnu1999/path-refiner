import { useState } from "react";
import { Task, Category } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, FileText } from "lucide-react";
import { startOfWeek } from "date-fns";
import { importDSL } from "@/lib/JournalImporter";

/* =========================
UTILITIES
========================= */

function detectCategory(text: string): Category {
  const lower = text.toLowerCase();

  if (lower.includes("class")) return "class";
  if (lower.includes("work")) return "work";
  if (lower.includes("career")) return "career";
  if (lower.includes("church") || lower.includes("prayer")) return "church";
  if (lower.includes("self")) return "self-care";
  if (lower.includes("skill")) return "skill";
  if (lower.includes("relationship")) return "relationship";
  if (lower.includes("fun")) return "fun";

  return "work";
}

function extractTime(text: string) {
  const timeRegex = /(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/;
  const match = text.match(timeRegex);

  if (!match) {
    return {
      clean: text.trim(),
      start: undefined,
      end: undefined
    };
  }

  const clean = text.replace(timeRegex, "").trim();

  return {
    start: match[1],
    end: match[2],
    clean
  };
}

function extractDeadline(line: string): Date | undefined {
  const match = line.match(/DEADLINE\s+"(\d{4}-\d{2}-\d{2})"/);
  if (!match) return undefined;
  return new Date(match[1]);
}

/* =========================
DSL PARSER
========================= */

export function parseJournalDSL(input: string): Task[] {

  const lines = input
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const tasks: Task[] = [];

  const yearlyMap: Record<string,string> = {};
  const monthlyMap: Record<string,string> = {};
  const weeklyMap: Record<string,string> = {};

  let currentWeekly = "";
  let currentDate: Date | undefined = undefined;

  for (const line of lines) {

    /* ================= YEAR ================= */

    if (line.startsWith("ADD_CORE")) {

      const title = line.match(/"([^"]+)"/)?.[1] ?? "Year Goal";
      const cat = line.match(/CATEGORY\s+"([^"]+)"/)?.[1] ?? "";
      const deadline = extractDeadline(line);

      const id = crypto.randomUUID();
      yearlyMap[Object.keys(yearlyMap).length + 1] = id;

      tasks.push({
        id,
        title,
        category: detectCategory(cat),
        priority: "high",
        completed: false,
        scope: "year",
        subTasks: [],
        dueDate:
          deadline ??
          new Date(new Date().getFullYear(), 11, 31),
      });

    }

    /* ================= MONTH ================= */

    else if (line.startsWith("ADD_MONTHLY")) {

      const index = line.match(/ADD_MONTHLY (\d+)/)?.[1];
      const title = line.match(/TITLE "([^"]+)"/)?.[1] || "Monthly Goal";
      const month = line.match(/MONTH "([^"]+)"/)?.[1];
      const yearlyRef = line.match(/YEARLY_ID (\d+)/)?.[1];

      if (!yearlyRef) continue;

      const id = crypto.randomUUID();

      monthlyMap[index || ""] = id;

      tasks.push({
        id,
        title,
        category: detectCategory(title),
        priority: "high",
        completed: false,
        scope: "month",
        parentId: yearlyMap[yearlyRef],
        dueDate: new Date(month + "-01"),
        subTasks: []
      });

    }

    /* ================= WEEK ================= */

    else if (line.startsWith("ADD_WEEKLY")) {

      const index = line.match(/ADD_WEEKLY (\d+)/)?.[1];
      const title = line.match(/TITLE "([^"]+)"/)?.[1] || "Weekly Plan";
      const week = line.match(/WEEK "([^"]+)"/)?.[1];
      const monthlyRef = line.match(/MONTHLY_ID (\d+)/)?.[1];

      if (!monthlyRef) continue;

      const id = crypto.randomUUID();

      weeklyMap[index || ""] = id;

      currentWeekly = id;

      tasks.push({
        id,
        title,
        category: detectCategory(title),
        priority: "medium",
        completed: false,
        scope: "week",
        parentId: monthlyMap[monthlyRef],
        dueDate: startOfWeek(new Date(week), { weekStartsOn: 1 }),
        subTasks: []
      });

    }

    /* ================= DAY DECLARATION ================= */

    else if (line.startsWith("ADD_DAILY")) {

      const date = line.match(/DATE "([^"]+)"/)?.[1];
      const weeklyRef = line.match(/WEEKLY_ID (\d+)/)?.[1];

      if (!date || !weeklyRef) continue;

      currentWeekly = weeklyMap[weeklyRef];
      currentDate = new Date(date);

    }

    /* ================= DAILY TASK ================= */

    else if (line.startsWith("ADD_SUBTASK_DAILY")) {

  const raw = line.match(/"([^"]+)"/)?.[1];
  if (!raw || !currentWeekly || !currentDate) continue;

  const parsed = extractTime(raw);

  tasks.push({
    id: crypto.randomUUID(),
    title: parsed.clean,
    category: detectCategory(parsed.clean),
    priority: "medium",
    completed: false,
    scope: "day",
    parentId: currentWeekly,
    startTime: parsed.start,
    endTime: parsed.end,
    dueDate: currentDate,
    subTasks: []
  });
}

  }

  return tasks;
}

/* =========================
COMPONENT
========================= */

export function JournalParser({ onImportTasks }) {

  const [open,setOpen] = useState(false);
  const [journal,setJournal] = useState("");
  const [preview,setPreview] = useState<Task[]>([]);

  const handleParse = () => {
    const parsed = parseJournalDSL(journal);
    setPreview(parsed);
  };

  const handleImport = async () => {
    const imported = await importDSL(journal);
    onImportTasks(imported, []);
    setJournal("");
    setPreview([]);
    setOpen(false);
  };

  return (

    <Dialog open={open} onOpenChange={setOpen}>

      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="h-4 w-4"/>
          Get AI Insights
        </Button>
      </DialogTrigger>

      <DialogContent>

        <DialogHeader>
          <DialogTitle className="flex gap-2">
            <FileText className="h-5 w-5"/>
            Journal Planner
          </DialogTitle>
        </DialogHeader>

        <Textarea
          value={journal}
          onChange={(e)=>setJournal(e.target.value)}
          placeholder="Paste DSL here..."
          className="min-h-[200px]"
        />

        <div className="flex gap-2 mt-3">

          <Button variant="outline" onClick={handleParse}>
            Parse
          </Button>

          {preview.length > 0 && (
            <Button onClick={handleImport}>
              Import {preview.length}
            </Button>
          )}

        </div>

      </DialogContent>

    </Dialog>

  );

}