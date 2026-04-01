const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: "Google credentials not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || (await req.json().catch(() => ({}))).action;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    switch (action) {
      case "get-auth-url": {
        const { redirectUri } = await req.json();
        const params = new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        });
        return new Response(JSON.stringify({ url: `${GOOGLE_AUTH_URL}?${params}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "exchange-code": {
        const { code, redirectUri } = await req.json();
        const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });
        const tokens = await tokenRes.json();
        if (!tokenRes.ok) {
          return new Response(JSON.stringify({ error: tokens.error_description || "Token exchange failed" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ tokens }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "refresh-token": {
        const { refreshToken } = await req.json();
        const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            grant_type: "refresh_token",
          }),
        });
        const tokens = await tokenRes.json();
        if (!tokenRes.ok) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ tokens }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync-tasks": {
        const { accessToken, tasks } = await req.json();
        const results = [];

        for (const task of tasks) {
          if (!task.startTime || !task.endTime || !task.dueDate) continue;

          const dateStr = new Date(task.dueDate).toISOString().slice(0, 10);
          const event = {
            summary: task.title,
            description: `Category: ${task.category} | Priority: ${task.priority}`,
            start: { dateTime: `${dateStr}T${task.startTime}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" },
            end: { dateTime: `${dateStr}T${task.endTime}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" },
            reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }] },
          };

          const calRes = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(event),
          });

          const calData = await calRes.json();
          results.push({ taskId: task.id, success: calRes.ok, eventId: calData.id, error: calData.error?.message });
        }

        return new Response(JSON.stringify({ results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "fetch-events": {
        const { accessToken, timeMin, timeMax } = await req.json();
        const params = new URLSearchParams({
          timeMin: new Date(timeMin).toISOString(),
          timeMax: new Date(timeMax).toISOString(),
          singleEvents: "true",
          orderBy: "startTime",
        });

        const calRes = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await calRes.json();
        if (!calRes.ok) {
          return new Response(JSON.stringify({ error: data.error?.message || "Fetch failed" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ events: data.items || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
