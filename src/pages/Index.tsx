import { useState } from "react";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { BalanceAnalytics } from "@/components/BalanceAnalytics";
import { JournalParser } from "@/components/JournalParser";
import { Button } from "@/components/ui/button";
import { mockTasks } from "@/lib/mockData";
import { Task } from "@/types/task";
import { startOfWeek, addWeeks, subWeeks, format } from "date-fns";
import { Calendar, BarChart3, ListTodo, CalendarDays, CalendarClock, Sun, ChevronLeft, ChevronRight } from "lucide-react";
import Todo from "./Todo";
import YearView from "./YearView";
import MonthView from "./MonthView";
import DayView from "./DayView";

type View = "todo" | "year" | "month" | "week" | "day" | "analytics";

const NAV_ITEMS: { view: View; label: string; icon: React.ReactNode }[] = [
  { view: "todo", label: "Todo Hub", icon: <ListTodo className="h-4 w-4" /> },
  { view: "year", label: "Year", icon: <CalendarDays className="h-4 w-4" /> },
  { view: "month", label: "Month", icon: <CalendarClock className="h-4 w-4" /> },
  { view: "week", label: "Week", icon: <Calendar className="h-4 w-4" /> },
  { view: "day", label: "Day", icon: <Sun className="h-4 w-4" /> },
  { view: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
];

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [view, setView] = useState<View>("todo");

  const handleToggleTask = (taskId: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleToggleSubTask = (taskId: string, subTaskId: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId
        ? { ...task, subTasks: task.subTasks.map(st => st.id === subTaskId ? { ...st, completed: !st.completed } : st) }
        : task
    ));
  };

  const handleAddTask = (task: Task) => {
    setTasks([...tasks, task]);
  };

  const handleDeleteTask = (taskId: string) => {
    // Also delete all descendants
    const toDelete = new Set<string>();
    const collect = (id: string) => {
      toDelete.add(id);
      tasks.filter(t => t.parentId === id).forEach(t => collect(t.id));
    };
    collect(taskId);
    setTasks(tasks.filter(t => !toDelete.has(t.id)));
  };

  const handleUpdateTask = (updated: Task) => {
    setTasks(tasks.map(t => t.id === updated.id ? updated : t));
  };

  const handleRecordTime = (taskId: string, minutes: number) => {
    setTasks(tasks.map(t =>
      t.id === taskId ? { ...t, timeSpent: (t.timeSpent || 0) + minutes } : t
    ));
  };

  const handleImportTasks = (newTasks: Task[], replacedScopes: string[]) => {
    // Remove existing tasks of the same scopes that are being imported
    const filtered = tasks.filter(t => !replacedScopes.includes(t.scope));
    setTasks([...filtered, ...newTasks]);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-lg">✨</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Life Balance Planner</h1>
                <p className="text-sm text-muted-foreground">
                  Week of {format(currentWeek, 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            <JournalParser onImportTasks={handleImportTasks} />
          </div>
        </div>

        <div className="container mx-auto px-4 pb-2">
          <div className="flex gap-1 overflow-x-auto">
            {NAV_ITEMS.map(({ view: v, label, icon }) => (
              <Button
                key={v}
                variant={view === v ? "default" : "ghost"}
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => setView(v)}
              >
                {icon}
                {label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {view === "todo" && (
          <Todo
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onToggleSubTask={handleToggleSubTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onUpdateTask={handleUpdateTask}
          />
        )}
        {view === "year" && (
          <YearView
            tasks={tasks}
            selectedYear={selectedYear}
            onSetYear={setSelectedYear}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
        {view === "month" && (
          <MonthView
            tasks={tasks}
            selectedMonth={selectedMonth}
            onSetMonth={setSelectedMonth}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
        {view === "week" && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="font-semibold text-foreground">
                Week of {format(currentWeek, "MMM d, yyyy")}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <WeeklyCalendar
                weekStart={currentWeek}
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onToggleSubTask={handleToggleSubTask}
              />
            </div>
          </div>
        )}
        {view === "day" && (
          <DayView
            tasks={tasks}
            selectedDate={selectedDate}
            onSetDate={setSelectedDate}
            onToggleTask={handleToggleTask}
            onToggleSubTask={handleToggleSubTask}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onRecordTime={handleRecordTime}
          />
        )}
        {view === "analytics" && (
          <BalanceAnalytics tasks={tasks} />
        )}
      </main>
    </div>
  );
};

export default Index;
