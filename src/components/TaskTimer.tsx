import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

interface TaskTimerProps {
  durationMinutes: number;
  onComplete?: (timeSpentSeconds: number) => void;
}

export function TaskTimer({ durationMinutes, onComplete }: TaskTimerProps) {
  const [remaining, setRemaining] = useState(durationMinutes * 60);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            onComplete?.(elapsed + 1);
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
  }, [running]);

  const reset = () => {
    setRunning(false);
    setRemaining(durationMinutes * 60);
    setElapsed(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = durationMinutes > 0 ? ((durationMinutes * 60 - remaining) / (durationMinutes * 60)) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="2" />
          <circle
            cx="18" cy="18" r="15.5" fill="none"
            className="stroke-primary" strokeWidth="2"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-foreground">
          {mins}:{secs.toString().padStart(2, "0")}
        </span>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRunning(!running)}>
        {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset}>
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
      {elapsed > 0 && (
        <span className="text-[10px] text-muted-foreground">
          {Math.floor(elapsed / 60)}m spent
        </span>
      )}
    </div>
  );
}
