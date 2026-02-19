import { useState } from "react";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { BalanceAnalytics } from "@/components/BalanceAnalytics";
import { Button } from "@/components/ui/button";
import { mockTasks } from "@/lib/mockData";
import { Task } from "@/types/task";
import { startOfWeek, format } from "date-fns";
import { Sparkles, Calendar, BarChart3, ListTodo, CalendarDays, CalendarClock, Sun } from "lucide-react";
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
  const [currentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [view, setView] = useState<View>("todo");

  const handleToggleTask = (taskId: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleToggleSubTask = (taskId: string, subTaskId: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            subTasks: task.subTasks.map(st =>
              st.id === subTaskId ? { ...st, completed: !st.completed } : st
            )
          }
        : task
    ));
  };

  const handleAddTask = (task: Task) => {
    setTasks([...tasks, task]);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Life Balance Planner</h1>
                <p className="text-sm text-muted-foreground">
                  Week of {format(currentWeek, 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            <Button variant="default" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Get AI Insights
            </Button>
          </div>
        </div>

        {/* Navigation */}
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
          />
        )}
        {view === "year" && (
          <YearView tasks={tasks} onToggleTask={handleToggleTask} />
        )}
        {view === "month" && (
          <MonthView tasks={tasks} selectedMonth={new Date()} onToggleTask={handleToggleTask} />
        )}
        {view === "week" && (
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <WeeklyCalendar
              weekStart={currentWeek}
              tasks={tasks}
              onToggleTask={handleToggleTask}
              onToggleSubTask={handleToggleSubTask}
            />
          </div>
        )}
        {view === "day" && (
          <DayView
            tasks={tasks}
            selectedDate={new Date()}
            onToggleTask={handleToggleTask}
            onToggleSubTask={handleToggleSubTask}
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
