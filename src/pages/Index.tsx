import { useState } from "react";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { BalanceAnalytics } from "@/components/BalanceAnalytics";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockTasks } from "@/lib/mockData";
import { Task } from "@/types/task";
import { startOfWeek, format } from "date-fns";
import { Sparkles, Calendar, BarChart3 } from "lucide-react";

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [currentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleToggleTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed }
        : task
    ));
  };

  const handleToggleSubTask = (taskId: string, subTaskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? {
            ...task,
            subTasks: task.subTasks.map(st =>
              st.id === subTaskId 
                ? { ...st, completed: !st.completed }
                : st
            )
          }
        : task
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Weekly View
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <WeeklyCalendar
                weekStart={currentWeek}
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onToggleSubTask={handleToggleSubTask}
              />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <BalanceAnalytics tasks={tasks} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
