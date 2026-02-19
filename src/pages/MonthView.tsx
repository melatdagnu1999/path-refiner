import { useState } from "react";
import { Task, CATEGORIES, Category } from "@/types/task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isSameMonth, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Edit2, Check, X } from "lucide-react";

interface MonthViewProps {
  tasks: Task[];
  selectedMonth: Date;
  onSetMonth: (date: Date) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
}

export default function MonthView({ tasks, selectedMonth, onSetMonth, onToggleTask, onAddTask, onUpdateTask }: MonthViewProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("class");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");

  const monthTasks = tasks.filter(
    (t) => t.scope === "month" && t.dueDate && isSameMonth(t.dueDate, selectedMonth)
  );

  // Show breakdowns (weekly tasks linked to monthly)
  const getBreakdowns = (parentId: string) => tasks.filter((t) => t.parentId === parentId);

  const categories = Object.keys(CATEGORIES) as Category[];
  const grouped = categories
    .map((cat) => ({ category: cat, info: CATEGORIES[cat], tasks: monthTasks.filter((t) => t.category === cat) }))
    .filter((g) => g.tasks.length > 0);

  const completed = monthTasks.filter((t) => t.completed).length;
  const progress = monthTasks.length > 0 ? (completed / monthTasks.length) * 100 : 0;

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAddTask({
      id: crypto.randomUUID(), title: newTitle.trim(), category: newCategory,
      priority: newPriority, completed: false, scope: "month", subTasks: [],
      dueDate: selectedMonth,
    });
    setNewTitle("");
    setAdding(false);
  };

  const saveEdit = (task: Task) => {
    onUpdateTask({ ...task, title: editTitle });
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => onSetMonth(subMonths(selectedMonth, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-xl">📅 {format(selectedMonth, "MMMM yyyy")}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => onSetMonth(addMonths(selectedMonth, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-2 text-sm">
            <span>Monthly Progress</span>
            <span className="font-semibold">{completed}/{monthTasks.length} completed</span>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="sm" className="gap-1" onClick={() => setAdding(!adding)}>
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      </div>

      {adding && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Monthly task title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} autoFocus />
            <div className="flex gap-2">
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as Category)}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as any)}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAdd}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {grouped.length === 0 && !adding && (
        <p className="text-center text-muted-foreground py-8">
          No monthly tasks for {format(selectedMonth, "MMMM")}. Click "Add Task" to create one.
        </p>
      )}

      {grouped.map(({ category, info, tasks: catTasks }) => (
        <Card key={category}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span>{info.icon}</span> {info.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {catTasks.map((task) => {
              const breakdowns = getBreakdowns(task.id);
              const isEditing = editingId === task.id;
              return (
                <div key={task.id} className="space-y-1">
                  <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                    <Checkbox checked={task.completed} onCheckedChange={() => onToggleTask(task.id)} />
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-7 text-sm" />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(task)}><Check className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ) : (
                      <>
                        <span className={`flex-1 text-sm ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {task.title}
                        </span>
                        <span className="text-xs text-muted-foreground">{format(task.dueDate, "MMM d")}</span>
                        <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(task.id); setEditTitle(task.title); }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                  {/* Breakdowns */}
                  {breakdowns.length > 0 && (
                    <div className="pl-9 space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Weekly breakdown</p>
                      {breakdowns.map((bd) => (
                        <div key={bd.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>📆</span>
                          <span>{bd.title}</span>
                          {bd.dueDate && <span className="text-[10px]">{format(bd.dueDate, "MMM d")}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
