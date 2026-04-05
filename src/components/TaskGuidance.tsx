import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Task } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, X } from "lucide-react";
import { toast } from "sonner";

const GUIDANCE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/task-guidance`;

// In-memory cache
const guidanceCache = new Map<string, string>();

interface TaskGuidanceProps {
  task: Task;
  allTasks: Task[];
}

export function TaskGuidance({ task, allTasks }: TaskGuidanceProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guidance, setGuidance] = useState<string | null>(
    guidanceCache.get(task.id) || null
  );

  const fetchGuidance = async () => {
    if (guidanceCache.has(task.id)) {
      setGuidance(guidanceCache.get(task.id)!);
      setOpen(true);
      return;
    }

    setLoading(true);
    setOpen(true);
    try {
      const resp = await fetch(GUIDANCE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          task: {
            title: task.title,
            category: task.category,
            scope: task.scope,
            priority: task.priority,
            dueDate: task.dueDate,
            startTime: task.startTime,
            endTime: task.endTime,
            completed: task.completed,
            notes: task.notes,
          },
          allTasks: allTasks.slice(0, 15).map((t) => ({
            title: t.title,
            scope: t.scope,
            category: t.category,
            completed: t.completed,
          })),
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) { toast.error("Rate limited — try again shortly."); return; }
        if (resp.status === 402) { toast.error("Credits exhausted."); return; }
        throw new Error("Failed");
      }

      const data = await resp.json();
      guidanceCache.set(task.id, data.guidance);
      setGuidance(data.guidance);
    } catch {
      toast.error("Failed to get guidance");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-primary"
        title="AI Task Guidance"
        onClick={fetchGuidance}
      >
        <Lightbulb className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <div className="mt-2 border border-primary/20 rounded-lg p-3 bg-primary/5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary flex items-center gap-1">
          <Lightbulb className="h-3.5 w-3.5" /> AI Guidance
        </span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setOpen(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating guidance...
        </div>
      ) : guidance ? (
        <div className="prose prose-sm dark:prose-invert max-w-none text-xs [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          <ReactMarkdown>{guidance}</ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
}
