import { useState } from "react";
import { Task, SCOPE_LABELS, TaskScope, Category, CATEGORIES } from "@/types/task";
import { TaskSection } from "@/components/TaskSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Inbox, Trash2, X, Sparkles, Loader2, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getPreferences } from "@/lib/preferences";
import { getAIContext } from "@/lib/timezone";

const SUGGEST_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-task-plan`;

interface Suggestion {
  date: string;
  startTime: string;
  endTime: string;
  priority: "low" | "medium" | "high";
  rationale: string;
}

interface TodoProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (task: Task) => void;
}

const SCOPES: TaskScope[] = ["year", "month", "week", "day"];

function getRootTasksForScope(allTasks: Task[], scope: TaskScope): Task[] {
  return allTasks.filter((t) => {
    if (t.scope !== scope) return false;
    if (!t.parentId) return true;
    const parent = allTasks.find((p) => p.id === t.parentId);
    return !parent || parent.scope !== scope;
  });
}

// Unplanned tasks: tasks tagged as "unplanned" via notes field
function getUnplannedTasks(allTasks: Task[]): Task[] {
  return allTasks.filter((t) => t.notes === "__unplanned__");
}

function getPlannedTasks(allTasks: Task[]): Task[] {
  return allTasks.filter((t) => t.notes !== "__unplanned__");
}

export default function Todo({ tasks, onToggleTask, onToggleSubTask, onAddTask, onDeleteTask, onUpdateTask }: TodoProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("personal");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion | null>>({});
  const [suggestLoading, setSuggestLoading] = useState<Record<string, boolean>>({});
  const [excludeMap, setExcludeMap] = useState<Record<string, Suggestion[]>>({});

  const unplanned = getUnplannedTasks(tasks);
  const planned = getPlannedTasks(tasks);

  const handleAddUnplanned = () => {
    if (!newTitle.trim()) return;
    onAddTask({
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      completed: false,
      scope: "day",
      subTasks: [],
      dueDate: new Date(),
      notes: "__unplanned__",
    });
    setNewTitle("");
    setAdding(false);
  };

  const handleSuggest = async (task: Task, alternative = false) => {
    setSuggestLoading((p) => ({ ...p, [task.id]: true }));
    try {
      const exclude = alternative ? (excludeMap[task.id] || []) : [];
      const resp = await fetch(SUGGEST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          task: { title: task.title, category: task.category, priority: task.priority, notes: "" },
          allTasks: planned.map((t) => ({
            scope: t.scope, title: t.title, category: t.category,
            dueDate: t.dueDate instanceof Date ? t.dueDate.toISOString().split("T")[0] : String(t.dueDate).split("T")[0],
            startTime: t.startTime, endTime: t.endTime,
          })),
          preferences: getPreferences(),
          ...getAIContext(),
          excludeSlots: exclude,
        }),
      });
      if (!resp.ok) {
        if (resp.status === 429) toast.error("Rate limited");
        else if (resp.status === 402) toast.error("Credits exhausted");
        else toast.error("Failed to suggest a plan");
        return;
      }
      const data: Suggestion = await resp.json();
      setSuggestions((p) => ({ ...p, [task.id]: data }));
      setExcludeMap((p) => ({ ...p, [task.id]: alternative ? [...exclude, data] : [data] }));
    } catch (e) {
      console.error(e);
      toast.error("Failed to suggest a plan");
    } finally {
      setSuggestLoading((p) => ({ ...p, [task.id]: false }));
    }
  };

  const handleAcceptSuggestion = (task: Task) => {
    const s = suggestions[task.id];
    if (!s) return;
    onUpdateTask({
      ...task,
      notes: undefined,
      scope: "day",
      priority: s.priority,
      dueDate: new Date(`${s.date}T00:00:00`),
      startTime: s.startTime,
      endTime: s.endTime,
    });
    setSuggestions((p) => { const n = { ...p }; delete n[task.id]; return n; });
    setExcludeMap((p) => { const n = { ...p }; delete n[task.id]; return n; });
    toast.success(`Scheduled for ${s.date} ${s.startTime}-${s.endTime}`);
  };

  return (
    <div className="space-y-6">
      {/* Unplanned Tasks Inbox */}
      <Card className="border-dashed border-2 border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" />
              Unplanned Inbox
              <span className="text-sm font-normal text-muted-foreground">{unplanned.length} items</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setAdding(!adding)} className="gap-1">
              <Plus className="h-4 w-4" /> Quick Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Dump tasks here without planning. AI will detect these and suggest where to place them during your next planning session.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {adding && (
            <div className="flex gap-2 items-center flex-wrap p-2 bg-muted/50 rounded-lg border border-border">
              <Input
                placeholder="Quick task idea..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddUnplanned()}
                className="flex-1 min-w-[150px] h-8 text-sm"
                autoFocus
              />
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as Category)}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as "low" | "medium" | "high")}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8" onClick={handleAddUnplanned}>Add</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setAdding(false)}><X className="h-4 w-4" /></Button>
            </div>
          )}

          {unplanned.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No unplanned tasks. Click "Quick Add" to dump ideas here.
            </p>
          )}

          {unplanned.map((task) => {
            const catInfo = CATEGORIES[task.category];
            const sug = suggestions[task.id];
            const loading = !!suggestLoading[task.id];
            return (
              <div key={task.id} className="rounded border border-border/40 hover:border-border bg-card/50 transition-colors">
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <Checkbox checked={task.completed} onCheckedChange={() => onToggleTask(task.id)} />
                  <span className="text-sm">{catInfo.icon}</span>
                  <span className={`text-sm flex-1 ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {task.title}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    task.priority === "high" ? "bg-destructive/10 text-destructive" :
                    task.priority === "medium" ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {task.priority}
                  </span>
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 px-2 gap-1 text-xs text-primary hover:text-primary"
                    disabled={loading}
                    onClick={() => handleSuggest(task, false)}
                    title="Let AI suggest a slot"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Suggest plan
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDeleteTask(task.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {sug && (
                  <div className="border-t border-border/40 px-3 py-2 bg-primary/5 space-y-2">
                    <div className="text-xs">
                      <span className="font-semibold text-primary">Suggested:</span>{" "}
                      <span className="font-mono">{sug.date} · {sug.startTime}-{sug.endTime}</span>{" "}
                      <span className="text-muted-foreground">· priority {sug.priority}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground italic">{sug.rationale}</p>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => handleAcceptSuggestion(task)}>
                        <Check className="h-3 w-3" /> Accept & Create
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={loading} onClick={() => handleSuggest(task, true)}>
                        <RefreshCw className="h-3 w-3" /> Suggest another
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Planned tasks by scope */}
      {SCOPES.map((scope) => (
        <TaskSection
          key={scope}
          title={`${SCOPE_LABELS[scope].label} Todos`}
          icon={SCOPE_LABELS[scope].icon}
          scope={scope}
          tasks={getRootTasksForScope(planned, scope)}
          allTasks={planned}
          onToggleTask={onToggleTask}
          onToggleSubTask={onToggleSubTask}
          onAddTask={onAddTask}
          onDeleteTask={onDeleteTask}
          onUpdateTask={onUpdateTask}
        />
      ))}
    </div>
  );
}
