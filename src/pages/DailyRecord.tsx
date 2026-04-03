import { useState, useEffect, useRef } from "react";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Download, Copy, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Category, CATEGORIES } from "@/types/task";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    // Play a second beep after a short pause
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1100;
    osc2.type = "sine";
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.35);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
    osc2.start(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.65);
    setTimeout(() => ctx.close(), 1000);
  } catch {}
}

interface HourEntry {
  hour: number;
  activity: string;
  category: Category;
}

interface DailyRecordProps {
  selectedDate: Date;
  onSetDate: (d: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number) {
  const suffix = h >= 12 ? "PM" : "AM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${suffix}`;
}

function getStorageKey(date: Date) {
  return `daily_record_${format(date, "yyyy-MM-dd")}`;
}

function loadEntries(date: Date): HourEntry[] {
  try {
    const raw = localStorage.getItem(getStorageKey(date));
    if (raw) return JSON.parse(raw);
  } catch {}
  return HOURS.map((h) => ({ hour: h, activity: "", category: "personal" as Category }));
}

function saveEntries(date: Date, entries: HourEntry[]) {
  localStorage.setItem(getStorageKey(date), JSON.stringify(entries));
}

function exportToDSL(date: Date, entries: HourEntry[]): string {
  const dateStr = format(date, "yyyy-MM-dd");
  const lines: string[] = [`# Daily Record — ${format(date, "EEEE, MMM d, yyyy")}`, ""];

  const filled = entries.filter((e) => e.activity.trim());
  if (filled.length === 0) return lines.join("\n") + "\nNo activities recorded.\n";

  // Group by category
  const grouped: Record<string, HourEntry[]> = {};
  for (const e of filled) {
    if (!grouped[e.category]) grouped[e.category] = [];
    grouped[e.category].push(e);
  }

  for (const [cat, items] of Object.entries(grouped)) {
    const catInfo = CATEGORIES[cat as Category];
    lines.push(`## ${catInfo.icon} ${catInfo.label}`);
    for (const item of items) {
      const startH = String(item.hour).padStart(2, "0");
      const endH = String(item.hour + 1).padStart(2, "0");
      lines.push(
        `ADD_SUBTASK_DAILY PARENT "record" TITLE "${item.activity}" DATE "${dateStr}" TIME "${startH}:00-${endH}:00" CATEGORY "${cat}"`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

export default function DailyRecord({ selectedDate, onSetDate }: DailyRecordProps) {
  const [entries, setEntries] = useState<HourEntry[]>(() => loadEntries(selectedDate));
  const [reminderOn, setReminderOn] = useState(() => localStorage.getItem("record_reminder") !== "off");
  const lastBeepHourRef = useRef<number>(-1);

  // Hourly beep reminder
  useEffect(() => {
    if (!reminderOn) return;
    const check = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      // Beep at the start of each hour (within first 1 minute)
      if (currentMin < 1 && lastBeepHourRef.current !== currentHour) {
        lastBeepHourRef.current = currentHour;
        playBeep();
        toast.info(`⏰ Time to log what you're doing! (${formatHour(currentHour)})`, { duration: 5000 });
      }
    };
    check();
    const interval = setInterval(check, 30000); // check every 30s
    return () => clearInterval(interval);
  }, [reminderOn]);

  const toggleReminder = () => {
    const next = !reminderOn;
    setReminderOn(next);
    localStorage.setItem("record_reminder", next ? "on" : "off");
    if (next) {
      playBeep();
      toast.success("Hourly record reminder enabled");
    } else {
      toast.info("Hourly record reminder disabled");
    }
  };

  const handleDateChange = (newDate: Date) => {
    onSetDate(newDate);
    setEntries(loadEntries(newDate));
  };

  const updateEntry = (hour: number, field: "activity" | "category", value: string) => {
    const updated = entries.map((e) =>
      e.hour === hour ? { ...e, [field]: value } : e
    );
    setEntries(updated);
    saveEntries(selectedDate, updated);
  };

  const handleExportDSL = () => {
    const dsl = exportToDSL(selectedDate, entries);
    navigator.clipboard.writeText(dsl);
    toast.success("DSL copied to clipboard!");
  };

  const handleDownloadDSL = () => {
    const dsl = exportToDSL(selectedDate, entries);
    const blob = new Blob([dsl], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-record-${format(selectedDate, "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("DSL file downloaded!");
  };

  const filledCount = entries.filter((e) => e.activity.trim()).length;

  // Category summary
  const categorySummary: Record<string, number> = {};
  for (const e of entries) {
    if (e.activity.trim()) {
      categorySummary[e.category] = (categorySummary[e.category] || 0) + 1;
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => handleDateChange(subDays(selectedDate, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold text-foreground">
            {format(selectedDate, "EEEE, MMM d, yyyy")}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => handleDateChange(addDays(selectedDate, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportDSL}>
            <Copy className="h-4 w-4" /> Copy DSL
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadDSL}>
            <Download className="h-4 w-4" /> Export DSL
          </Button>
        </div>
      </div>

      {/* Category summary */}
      {filledCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(categorySummary).map(([cat, count]) => {
            const info = CATEGORIES[cat as Category];
            return (
              <span
                key={cat}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
              >
                {info.icon} {info.label}: {count}h
              </span>
            );
          })}
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
            Total: {filledCount}h logged
          </span>
        </div>
      )}

      {/* Hourly grid */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-[100px_1fr_140px] md:grid-cols-[100px_1fr_160px] text-xs font-medium text-muted-foreground border-b border-border bg-muted/50">
          <div className="px-3 py-2">Time</div>
          <div className="px-3 py-2">Activity</div>
          <div className="px-3 py-2">Category</div>
        </div>
        {HOURS.map((h) => {
          const entry = entries.find((e) => e.hour === h)!;
          const catInfo = CATEGORIES[entry.category];
          return (
            <div
              key={h}
              className="grid grid-cols-[100px_1fr_140px] md:grid-cols-[100px_1fr_160px] border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              <div className="px-3 py-2 text-sm font-mono text-muted-foreground flex items-center">
                {formatHour(h)}
              </div>
              <div className="px-2 py-1.5">
                <Input
                  value={entry.activity}
                  onChange={(e) => updateEntry(h, "activity", e.target.value)}
                  placeholder="What are you doing?"
                  className="h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input"
                />
              </div>
              <div className="px-2 py-1.5">
                <Select
                  value={entry.category}
                  onValueChange={(v) => updateEntry(h, "category", v)}
                >
                  <SelectTrigger className="h-8 text-xs border-transparent bg-transparent hover:border-input">
                    <SelectValue>
                      <span>{catInfo.icon} {catInfo.label}</span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([key, val]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {val.icon} {val.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
