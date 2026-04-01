import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarSync, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  isGoogleCalendarConnected,
  startGoogleAuth,
  disconnectGoogleCalendar,
  syncTasksToCalendar,
} from "@/lib/googleCalendar";
import { Task } from "@/types/task";

interface GoogleCalendarSyncProps {
  tasks: Task[];
}

export function GoogleCalendarSync({ tasks }: GoogleCalendarSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const connected = isGoogleCalendarConnected();

  const handleConnect = async () => {
    try {
      await startGoogleAuth();
    } catch (err) {
      toast.error("Failed to start Google sign-in");
    }
  };

  const handleDisconnect = () => {
    disconnectGoogleCalendar();
    toast.success("Disconnected from Google Calendar");
    window.location.reload();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncTasksToCalendar(tasks);
      const success = result.results?.filter((r: any) => r.success).length || 0;
      toast.success(`Synced ${success} tasks to Google Calendar`);
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (!connected) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={handleConnect}>
        <CalendarSync className="h-4 w-4" />
        Sync with Google Calendar
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="gap-2" onClick={handleSync} disabled={syncing}>
        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync Now"}
      </Button>
      <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={handleDisconnect}>
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
