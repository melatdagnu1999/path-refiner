import { useEffect, useRef } from "react";
import { Task } from "@/types/task";
import { isSameDay, isToday, differenceInMinutes, subDays } from "date-fns";
import { toast } from "sonner";

const REMINDER_KEY = "task_reminders_sent";
const STALE_KEY = "task_stale_sent";
const CHECK_INTERVAL = 60_000; // check every minute

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
  // Always show in-app toast
  toast(title, { description: body, duration: 10000 });

  // Also try browser notification
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
        const minsUntil = differenceInMinutes(taskStart, now);

        // Notify when 25-35 mins away (window to avoid missing)
        if (minsUntil > 0 && minsUntil <= 30) {
          sendNotification(
            `⏰ Task in ${minsUntil} min`,
            `"${task.title}" starts at ${task.startTime}`
          );
          cleanedReminders.add(reminderKey);
        }
      }
      saveSentSet(REMINDER_KEY, cleanedReminders);

      // --- 2) Stale / no-progress task notifications (check once per session) ---
      const staleSent = getSentSet(STALE_KEY);
      const cleanedStale = new Set<string>();
      // Only check stale tasks between 9 AM and 10 AM to avoid spam
      const hour = now.getHours();

      if (hour >= 9 && hour <= 10) {
        // Find tasks due today or overdue that have no progress
        const staleTasks = tasks.filter((t) => {
          if (t.completed) return false;
          if (t.scope !== "day" && t.scope !== "week") return false;
          const due = new Date(t.dueDate);
          // Overdue or due today
          const isOverdue = due < subDays(today, 0) && !isSameDay(due, today);
          const isDueToday = isSameDay(due, today);
          if (!isDueToday && !isOverdue) return false;
          // No time spent and no subtasks completed
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
      // Keep today's stale entries
      staleSent.forEach((k) => { if (k.startsWith(todayKey)) cleanedStale.add(k); });
      saveSentSet(STALE_KEY, cleanedStale);
    };

    // Run immediately + on interval
    check();
    intervalRef.current = setInterval(check, CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tasks]);
}
