import { useEffect, useRef } from "react";
import { Task } from "@/types/task";
import { isSameDay, isToday, subDays } from "date-fns";
import { toast } from "sonner";

const REMINDER_KEY = "task_reminders_sent";
const STALE_KEY = "task_stale_sent";
const CHECK_INTERVAL = 30_000;

// Event system for floating timer
export type TimerNotificationEvent = {
  task: Task;
  minsUntil: number;
};

const listeners = new Set<(e: TimerNotificationEvent) => void>();

export function onTimerNotification(cb: (e: TimerNotificationEvent) => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function emitTimerNotification(e: TimerNotificationEvent) {
  listeners.forEach((cb) => cb(e));
}

function getSentSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveSentSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {}
}

function requestPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendNotification(title: string, body: string) {
  toast(title, { description: body, duration: 10000 });
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "✨" });
    } catch {}
  }
}

export function useTaskNotifications(tasks: Task[]) {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    requestPermission();

    const check = () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayKey = today.toISOString().slice(0, 10);

      // --- 1) 30-min-before reminders for today's daily tasks ---
      const remindersSent = getSentSet(REMINDER_KEY);
      const cleanedReminders = new Set<string>();

      const dailyTasks = tasks.filter(
        (t) => t.scope === "day" && t.dueDate && isToday(new Date(t.dueDate)) && !t.completed && t.startTime
      );

      for (const task of dailyTasks) {
        const reminderKey = `${todayKey}:${task.id}`;
        if (remindersSent.has(reminderKey)) {
          cleanedReminders.add(reminderKey);
          continue;
        }

        const [h, m] = task.startTime!.split(":").map(Number);
        const taskStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
        const diffMs = taskStart.getTime() - now.getTime();
        const minsUntil = Math.round(diffMs / 60000);

        if (minsUntil >= 0 && minsUntil <= 35) {
          const duration = task.timerDuration ? ` (${task.timerDuration}m timer)` : "";
          const timeRange = task.endTime ? `${task.startTime} - ${task.endTime}` : task.startTime!;
          sendNotification(
            `⏰ Task in ${minsUntil} min`,
            `"${task.title}" at ${timeRange}${duration}`
          );
          // Emit event so floating timer can auto-start
          emitTimerNotification({ task, minsUntil });
          cleanedReminders.add(reminderKey);
        }
      }
      saveSentSet(REMINDER_KEY, cleanedReminders);

      // --- 2) Stale / no-progress task notifications ---
      const staleSent = getSentSet(STALE_KEY);
      const cleanedStale = new Set<string>();
      const hour = now.getHours();

      if (hour >= 9 && hour <= 10) {
        const staleTasks = tasks.filter((t) => {
          if (t.completed) return false;
          if (t.scope !== "day" && t.scope !== "week") return false;
          const due = new Date(t.dueDate);
          const isOverdue = due < subDays(today, 0) && !isSameDay(due, today);
          const isDueToday = isSameDay(due, today);
          if (!isDueToday && !isOverdue) return false;
          const noProgress = (t.timeSpent || 0) === 0 && t.subTasks.every((st) => !st.completed);
          return noProgress;
        });

        for (const task of staleTasks) {
          const staleKey = `${todayKey}:${task.id}`;
          if (staleSent.has(staleKey)) {
            cleanedStale.add(staleKey);
            continue;
          }

          const due = new Date(task.dueDate);
          const isOverdue = due < today && !isSameDay(due, today);

          sendNotification(
            isOverdue ? "🚨 Overdue Task" : "📌 No Progress Yet",
            `"${task.title}" has no progress${isOverdue ? " and is overdue!" : ". Time to get started!"}`
          );
          cleanedStale.add(staleKey);
        }
      }
      staleSent.forEach((k) => { if (k.startsWith(todayKey)) cleanedStale.add(k); });
      saveSentSet(STALE_KEY, cleanedStale);
    };

    check();
    intervalRef.current = setInterval(check, CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tasks]);
}
