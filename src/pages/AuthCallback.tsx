import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { handleAuthCallback } from "@/lib/googleCalendar";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      toast.error("Google sign-in was cancelled");
      navigate("/");
      return;
    }

    if (code) {
      handleAuthCallback(code)
        .then(() => {
          toast.success("Connected to Google Calendar!");
          navigate("/");
        })
        .catch((err) => {
          toast.error(err.message || "Failed to connect");
          navigate("/");
        });
    } else {
      navigate("/");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground">Connecting to Google Calendar...</p>
      </div>
    </div>
  );
}
