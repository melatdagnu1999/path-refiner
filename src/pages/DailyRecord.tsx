import { useState, useEffect, useRef } from "react";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Download, Copy, Bell, BellOff, Bot, Loader2, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Category, CATEGORIES, Task } from "@/types/task";
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
  tasks?: Task[];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ADVISOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/record-advisor`;

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
      lines.push(`DOING "${item.activity}" DATE "${dateStr}" TIME "${startH}:00-${endH}:00" CATEGORY "${cat}"`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export default function DailyRecord({ selectedDate, onSetDate, tasks = [] }: DailyRecordProps) {
  const [entries, setEntries] = useState<HourEntry[]>(() => loadEntries(selectedDate));
  const [reminderOn, setReminderOn] = useState(() => localStorage.getItem("record_reminder") !== "off");
  const lastBeepHourRef = useRef<number>(-1);

  // AI Advisor state
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [advisorMessages, setAdvisorMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorInput, setAdvisorInput] = useState("");
  const advisorScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    advisorScrollRef.current?.scrollTo({ top: advisorScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [advisorMessages]);

  // Hourly beep reminder
  useEffect(() => {
    if (!reminderOn) return;
    const check = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      if (currentMin < 1 && lastBeepHourRef.current !== currentHour) {
        lastBeepHourRef.current = currentHour;
        playBeep();
        toast.info(`⏰ Time to log what you're doing! (${formatHour(currentHour)})`, { duration: 5000 });
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [reminderOn]);

  const toggleReminder = () => {
    const next = !reminderOn;
    setReminderOn(next);
    localStorage.setItem("record_reminder", next ? "on" : "off");
    if (next) { playBeep(); toast.success("Hourly record reminder enabled"); }
    else toast.info("Hourly record reminder disabled");
  };

  const handleDateChange = (newDate: Date) => {
    onSetDate(newDate);
    setEntries(loadEntries(newDate));
  };

  const updateEntry = (hour: number, field: "activity" | "category", value: string) => {
    const updated = entries.map((e) => e.hour === hour ? { ...e, [field]: value } : e);
    setEntries(updated);
    saveEntries(selectedDate, updated);
  };

  const handleExportDSL = () => {
    navigator.clipboard.writeText(exportToDSL(selectedDate, entries));
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

  // Get today's scheduled tasks
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const scheduledTasks = tasks.filter((t) => {
    if (t.scope !== "day") return false;
    try {
      return format(new Date(t.dueDate), "yyyy-MM-dd") === dateStr;
    } catch { return false; }
  });

  const streamAdvisor = async (body: any) => {
    const resp = await fetch(ADVISOR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok || !resp.body) {
      if (resp.status === 429) { toast.error("Rate limited"); return; }
      if (resp.status === 402) { toast.error("Credits exhausted"); return; }
      toast.error("Failed to get advice"); return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setAdvisorMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant")
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    let streamDone = false;
    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, idx);
        textBuffer = textBuffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || !line.trim()) continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) upsert(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const handleAskAdvisor = async (customMsg?: string) => {
    setAdvisorLoading(true);
    const msg = customMsg || advisorInput.trim();
    if (msg) {
      setAdvisorMessages((prev) => [...prev, { role: "user", content: msg }]);
      setAdvisorInput("");
    }

    try {
      await streamAdvisor({
        entries: entries.filter((e) => e.activity.trim()),
        scheduledTasks: scheduledTasks.map((t) => ({
          title: t.title,
          category: t.category,
          startTime: t.startTime,
          endTime: t.endTime,
          completed: t.completed,
        })),
        date: dateStr,
        message: msg || undefined,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setAdvisorLoading(false);
    }
  };

  const filledCount = entries.filter((e) => e.activity.trim()).length;
  const categorySummary: Record<string, number> = {};
  for (const e of entries) {
    if (e.activity.trim()) categorySummary[e.category] = (categorySummary[e.category] || 0) + 1;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => handleDateChange(subDays(selectedDate, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold text-foreground">{format(selectedDate, "EEEE, MMM d, yyyy")}</h2>
          <Button variant="ghost" size="icon" onClick={() => handleDateChange(addDays(selectedDate, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={advisorOpen ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setAdvisorOpen(!advisorOpen);
              if (!advisorOpen && advisorMessages.length === 0) {
                handleAskAdvisor("Analyze my day so far and tell me what I should be doing vs what I'm doing.");
              }
            }}
          >
            <Bot className="h-4 w-4" /> AI Advisor
          </Button>
          <Button variant={reminderOn ? "default" : "outline"} size="sm" className="gap-1.5" onClick={toggleReminder}>
            {reminderOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {reminderOn ? "Reminder On" : "Reminder Off"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportDSL}>
            <Copy className="h-4 w-4" /> Copy DSL
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadDSL}>
            <Download className="h-4 w-4" /> Export DSL
          </Button>
        </div>
      </div>

      {/* AI Advisor Panel */}
      {advisorOpen && (
        <div className="border border-primary/20 rounded-lg bg-primary/5 overflow-hidden">
          <div className="px-3 py-2 border-b border-primary/20 flex items-center justify-between">
            <span className="text-sm font-semibold text-primary flex items-center gap-1.5">
              <Bot className="h-4 w-4" /> Daily Routine Advisor
            </span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setAdvisorOpen(false)}>Close</Button>
          </div>
          <div ref={advisorScrollRef} className="max-h-[300px] overflow-y-auto px-3 py-2 space-y-2">
            {advisorMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-lg px-3 py-2 text-xs ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card text-foreground border border-border"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {advisorLoading && advisorMessages[advisorMessages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-card rounded-lg px-3 py-2 border border-border">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-primary/20 p-2 flex gap-2">
            <Textarea
              value={advisorInput}
              onChange={(e) => setAdvisorInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAskAdvisor(); } }}
              placeholder="Ask about your routine, productivity, or time management..."
              className="min-h-[36px] max-h-[80px] resize-none text-xs"
              rows={1}
            />
            <Button size="icon" className="shrink-0 h-9 w-9" onClick={() => handleAskAdvisor()} disabled={advisorLoading || !advisorInput.trim()}>
              {advisorLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Category summary */}
      {filledCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(categorySummary).map(([cat, count]) => {
            const info = CATEGORIES[cat as Category];
            return (
              <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
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
          // Check if there's a scheduled task at this hour
          const scheduledAtHour = scheduledTasks.find((t) => {
            if (!t.startTime) return false;
            const [sh] = t.startTime.split(":").map(Number);
            const [eh] = (t.endTime || t.startTime).split(":").map(Number);
            return h >= sh && h < (eh || sh + 1);
          });

          return (
            <div
              key={h}
              className={`grid grid-cols-[100px_1fr_140px] md:grid-cols-[100px_1fr_160px] border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors ${
                scheduledAtHour && !entry.activity.trim() ? "bg-warning/5" : ""
              }`}
            >
              <div className="px-3 py-2 text-sm font-mono text-muted-foreground flex flex-col justify-center">
                <span>{formatHour(h)}</span>
                {scheduledAtHour && (
                  <span className="text-[10px] text-primary truncate" title={scheduledAtHour.title}>
                    📋 {scheduledAtHour.title}
                  </span>
                )}
              </div>
              <div className="px-2 py-1.5">
                <Input
                  value={entry.activity}
                  onChange={(e) => updateEntry(h, "activity", e.target.value)}
                  placeholder={scheduledAtHour ? `Should be: ${scheduledAtHour.title}` : "What are you doing?"}
                  className="h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input"
                />
              </div>
              <div className="px-2 py-1.5">
                <Select value={entry.category} onValueChange={(v) => updateEntry(h, "category", v)}>
                  <SelectTrigger className="h-8 text-xs border-transparent bg-transparent hover:border-input">
                    <SelectValue><span>{catInfo.icon} {catInfo.label}</span></SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([key, val]) => (
                      <SelectItem key={key} value={key} className="text-xs">{val.icon} {val.label}</SelectItem>
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
