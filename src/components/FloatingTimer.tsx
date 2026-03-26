import { useState, useEffect, useRef, useCallback } from "react";
import { Task, CATEGORIES } from "@/types/task";
import { onTimerNotification, TimerNotificationEvent } from "@/hooks/useTaskNotifications";
import { Button } from "@/components/ui/button";
import { Play, Pause, X, GripVertical, Clock } from "lucide-react";

interface FloatingTimerProps {
  onRecordTime?: (taskId: string, minutes: number) => void;
}

export function FloatingTimer({ onRecordTime }: FloatingTimerProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 80 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen for timer notification events
  useEffect(() => {
    return onTimerNotification((e: TimerNotificationEvent) => {
      // Only auto-set if no active task or if it's time (0 mins)
      if (!activeTask || e.minsUntil === 0) {
        setActiveTask(e.task);
        const dur = e.task.timerDuration || 30;
        setRemaining(dur * 60);
        setElapsed(0);
        setMinimized(false);
        // Auto-start when it's exactly time
        if (e.minsUntil <= 1) {
          setRunning(true);
        }
      }
    });
  }, [activeTask]);

  // Timer logic
  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            return 0;
          }
          return r - 1;
        });
        setElapsed((e) => e + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, remaining]);

  // Drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setPosition({
      x: Math.max(0, e.clientX - dragOffset.current.x),
      y: Math.max(0, e.clientY - dragOffset.current.y),
    });
  }, [dragging]);

  const onPointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const dismiss = () => {
    if (elapsed > 0 && activeTask) {
      onRecordTime?.(activeTask.id, Math.round(elapsed / 60));
    }
    setRunning(false);
    setActiveTask(null);
    setElapsed(0);
    setRemaining(0);
  };

  if (!activeTask) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const totalSecs = (activeTask.timerDuration || 30) * 60;
  const pct = totalSecs > 0 ? ((totalSecs - remaining) / totalSecs) * 100 : 0;
  const catInfo = CATEGORIES[activeTask.category];

  return (
    <div
      ref={containerRef}
      className="fixed z-50 select-none"
      style={{ left: position.x, top: position.y }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className="w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center text-primary-foreground animate-pulse"
        >
          <div className="text-center">
            <div className="text-[10px] font-mono font-bold">{mins}:{secs.toString().padStart(2, "0")}</div>
            <div className="text-[8px]">{catInfo.icon}</div>
          </div>
        </button>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-2xl w-64 overflow-hidden">
          {/* Drag handle */}
          <div
            className="flex items-center gap-1 px-3 py-2 bg-primary/10 cursor-grab active:cursor-grabbing"
            onPointerDown={onPointerDown}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground flex-1 truncate">
              {catInfo.icon} {activeTask.title}
            </span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setMinimized(true)}>
              <span className="text-xs">−</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={dismiss}>
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Timer display */}
          <div className="p-4 flex flex-col items-center gap-3">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="2" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none"
                  className="stroke-primary" strokeWidth="2.5"
                  strokeDasharray={`${pct} ${100 - pct}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-mono font-bold text-foreground">
                {mins}:{secs.toString().padStart(2, "0")}
              </span>
            </div>

            {activeTask.startTime && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {activeTask.startTime}{activeTask.endTime ? ` - ${activeTask.endTime}` : ""}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant={running ? "outline" : "default"}
                size="sm"
                className="gap-1"
                onClick={() => setRunning(!running)}
              >
                {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {running ? "Pause" : "Start"}
              </Button>
            </div>

            {elapsed > 0 && (
              <div className="text-[11px] text-muted-foreground">
                {Math.floor(elapsed / 60)}m {elapsed % 60}s spent
              </div>
            )}

            {remaining === 0 && (
              <div className="text-sm font-semibold text-primary animate-bounce">
                ✅ Time's up!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
