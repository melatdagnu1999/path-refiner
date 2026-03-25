// src/pages/index.tsx
import { useEffect, useState } from "react";
import { startOfWeek, addWeeks, subWeeks, format } from "date-fns";
import {
  Calendar,
  BarChart3,
  ListTodo,
  CalendarDays,
  CalendarClock,
  Sun,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { BalanceAnalytics } from "@/components/BalanceAnalytics";
import { JournalParser } from "@/components/JournalParser";

import Todo from "./Todo";
import YearView from "./YearView";
import MonthView from "./MonthView";
import DayView from "./DayView";

import { Task } from "@/types/task";
import {
  loadTasks,
  saveTasks,
  deleteTask,
} from "@/lib/taskStorage";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentWeek, setCurrentWeek] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );
  const [view, setView] = useState<View>("todo");

  // ======== LOAD FROM DB ON MOUNT ========
  useEffect(() => {
    refreshFromDB();
  }, []);

  const refreshFromDB = async () => {
    const loaded = await loadTasks();
    setTasks(loaded);
  };

  // ======== NOTIFICATIONS ========
  useTaskNotifications(tasks);

  // ======== CENTRALIZED PERSIST FUNCTION ========
  const persist = async (updated: Task[]) => {
    setTasks(updated);
    await saveTasks(updated);
  };

  // ======== TASK HANDLERS ========

  const handleAddTask = async (task: Task) => {
    const updated = [...tasks, task];
    await persist(updated);
  };

  const handleToggleTask = async (taskId: string) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    await persist(updated);
  };

  const handleToggleSubTask = async (
    taskId: string,
    subTaskId: string
  ) => {
    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            subTasks: t.subTasks.map((st) =>
              st.id === subTaskId
                ? { ...st, completed: !st.completed }
                : st
            ),
          }
        : t
    );
    await persist(updated);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    const updated = tasks.map((t) =>
      t.id === updatedTask.id ? updatedTask : t
    );
    await persist(updated);
  };

  const handleDeleteTask = async (taskId: string) => {
    const toDelete = new Set<string>();

    const collect = (id: string) => {
      toDelete.add(id);
      tasks
        .filter((t) => t.parentId === id)
        .forEach((t) => collect(t.id));
    };

    collect(taskId);

    const updated = tasks.filter((t) => !toDelete.has(t.id));
    setTasks(updated);

    for (const id of toDelete) {
      await deleteTask(id);
    }

    await refreshFromDB();
  };

  const handleRecordTime = async (
    taskId: string,
    minutes: number
  ) => {
    const updated = tasks.map((t) =>
      t.id === taskId
        ? { ...t, timeSpent: (t.timeSpent || 0) + minutes }
        : t
    );
    await persist(updated);
  };

  const handleImportTasks = async (newTasks: Task[]) => {
    const newIds = new Set(newTasks.map((t) => t.id));
    const filtered = tasks.filter((t) => !newIds.has(t.id));
    const combined = [...filtered, ...newTasks];
    await persist(combined);
  };

  // ======== RENDER ========
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
                <h1 className="text-2xl font-bold text-foreground">
                  Life Balance Planner
                </h1>
                <p className="text-sm text-muted-foreground">
                  Week of {format(currentWeek, "MMM d, yyyy")}
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="font-semibold text-foreground">
                Week of {format(currentWeek, "MMM d, yyyy")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <WeeklyCalendar
                weekStart={currentWeek}
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onToggleSubTask={handleToggleSubTask}
                onUpdateTask={handleUpdateTask}
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
