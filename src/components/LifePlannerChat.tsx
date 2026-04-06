import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Task } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, Send, Loader2, FileText, Import, Eye } from "lucide-react";
import { parseJournalDSL, ProgressReport } from "@/components/JournalParser";
import { importDSL } from "@/lib/JournalImporter";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/life-planner-chat`;

type Msg = { role: "user" | "assistant"; content: string };

function extractDSL(text: string): string | null {
  const lines = text.split("\n");
  const dslLines = lines.filter(
    (l) =>
      l.trim().startsWith("ADD_CORE") ||
      l.trim().startsWith("ADD_MONTHLY") ||
      l.trim().startsWith("ADD_WEEKLY") ||
      l.trim().startsWith("ADD_SUBTASK_DAILY") ||
      l.trim().startsWith("ADD_DAILY") ||
      l.trim().startsWith("PROGRESS")
  );
  return dslLines.length > 0 ? dslLines.join("\n") : null;
}

interface LifePlannerChatProps {
  onImportTasks: (tasks: Task[]) => void | Promise<void>;
}

export function LifePlannerChat({ onImportTasks }: LifePlannerChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<Task[]>([]);
  const [progressReports, setProgressReports] = useState<ProgressReport[]>([]);
  const [detectedDSL, setDetectedDSL] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, preview]);

  const streamChat = async (allMessages: Msg[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: allMessages }),
    });

    if (!resp.ok || !resp.body) {
      if (resp.status === 429) { toast.error("Rate limited — try again shortly."); return; }
      if (resp.status === 402) { toast.error("Credits exhausted — please add funds."); return; }
      toast.error("Failed to get AI response"); return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";
    let streamDone = false;

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant")
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

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
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) upsert(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Check if DSL is in the final response
    const dsl = extractDSL(assistantSoFar);
    if (dsl) {
      setDetectedDSL(dsl);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsLoading(true);
    setDetectedDSL(null);
    setPreview([]);
    setProgressReports([]);

    try {
      await streamChat(updated);
    } catch (e) {
      console.error(e);
      toast.error("Chat error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleParsePreview = () => {
    if (!detectedDSL) return;
    const result = parseJournalDSL(detectedDSL);
    setPreview(result.tasks);
    setProgressReports(result.progress);
    toast.success(`Parsed ${result.tasks.length} tasks`);
  };

  const handleImport = async () => {
    if (!detectedDSL) return;
    const imported = await importDSL(detectedDSL);
    await onImportTasks(imported);
    toast.success(`Imported ${imported.length} tasks`);
    setPreview([]);
    setDetectedDSL(null);

    // Auto-send daily check-in after import
    const today = new Date().toISOString().split("T")[0];
    const checkInMsg: Msg = {
      role: "user",
      content: `Tasks imported successfully for ${today}. Now let's do the daily check-in. Please ask me the 5 daily questions: mood, what went well, what to change, progress update, and how I'm doing with the plan. Also check my upcoming deadlines and suggest tasks for each goal for the coming week.`,
    };
    const updatedMsgs = [...messages, checkInMsg];
    setMessages(updatedMsgs);
    setIsLoading(true);
    try {
      await streamChat(updatedMsgs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Life Planner
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <DialogTitle className="flex gap-2 items-center">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Life Planning Coach
          </DialogTitle>
        </DialogHeader>

        {/* Chat messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-muted-foreground text-sm py-6 space-y-4 px-2">
              <div className="text-center space-y-2">
                <Sparkles className="h-8 w-8 mx-auto text-primary/50" />
                <p className="font-medium text-foreground">Your AI Life Planning Coach</p>
                <p className="text-xs max-w-sm mx-auto">
                  I'll guide you through building a complete life plan. Let's start with your yearly goals.
                </p>
              </div>
              <div className="bg-muted rounded-lg p-3 space-y-2 text-xs">
                <p className="font-semibold text-foreground">💡 To get started, tell me your Core Goals for the year:</p>
                <p className="text-muted-foreground">Each goal needs a <strong>Title</strong>, <strong>Category</strong>, and <strong>Deadline</strong>. For example:</p>
                <div className="bg-background rounded p-2 font-mono text-[11px] space-y-1 border border-border">
                  <p>1. <strong>Complete my thesis</strong> — Category: Academic — Deadline: 2026-09-30</p>
                  <p>2. <strong>Run a half marathon</strong> — Category: Fitness — Deadline: 2026-12-01</p>
                  <p>3. <strong>Learn dressmaking basics</strong> — Category: Skills — Deadline: 2026-08-15</p>
                  <p>4. <strong>Consistent spiritual routine</strong> — Category: Spiritual — Deadline: 2026-12-31</p>
                </div>
                <p className="text-muted-foreground italic">List as many goals as you have across all life areas (work, health, spiritual, relationships, skills, fun).</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
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

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {/* DSL detected actions */}
          {detectedDSL && !isLoading && (
            <div className="border border-primary/30 rounded-lg p-3 bg-primary/5 space-y-2">
              <p className="text-xs font-semibold text-primary flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> DSL Plan Detected
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={handleParsePreview}>
                  <Eye className="h-3.5 w-3.5" /> Parse & Preview
                </Button>
                {preview.length > 0 && (
                  <Button size="sm" className="gap-1 text-xs" onClick={handleImport}>
                    <Import className="h-3.5 w-3.5" /> Import {preview.length} Tasks
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Progress reports */}
          {progressReports.length > 0 && (
            <div className="border rounded p-3 bg-accent/5 space-y-2">
              <p className="text-sm font-semibold">📊 Progress ({progressReports.length}):</p>
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

          {/* Task preview */}
          {preview.length > 0 && (
            <div className="border rounded p-3 space-y-1 max-h-[200px] overflow-y-auto">
              <p className="text-sm font-semibold mb-2">Preview ({preview.length} tasks):</p>
              {preview.map((t) => (
                <div key={t.id} className="text-xs flex gap-2 items-center">
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{t.scope}</span>
                  <span className="text-muted-foreground">{t.category}</span>
                  {t.startTime && <span className="text-muted-foreground">{t.startTime}-{t.endTime}</span>}
                  <span className="font-medium">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-border p-3 flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me about your goals…"
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="shrink-0"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}