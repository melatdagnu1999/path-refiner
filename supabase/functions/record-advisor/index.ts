import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { entries, scheduledTasks, date, message, preferences, timezone, todayLocal } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let prefBlock = "";
    if (preferences) {
      const p = preferences;
      const lines: string[] = [];
      if (p.motivationStyle) lines.push(`- Motivation style: ${p.motivationStyle}`);
      if (p.favoriteBooks) lines.push(`- Favorite books: ${p.favoriteBooks}`);
      if (p.studyInterests) lines.push(`- Study interests: ${p.studyInterests}`);
      if (p.sports) lines.push(`- Sports: ${p.sports}`);
      if (p.spiritualPreference) lines.push(`- Spiritual: ${p.spiritualPreference}`);
      if (p.hobbies) lines.push(`- Hobbies: ${p.hobbies}`);
      if (lines.length) prefBlock = `\n\nUSER PREFERENCES (use to personalize advice):\n${lines.join("\n")}\n`;
    }

    const systemPrompt = `You are an AI daily routine advisor and accountability partner. You analyze what the user IS doing vs what they SHOULD be doing based on their scheduled tasks.

Today's date: ${todayLocal || date}
Timezone: ${timezone || "UTC"}
${prefBlock}

Your job:
1. Compare the user's actual activities (from their daily record) with their scheduled tasks
2. Point out misalignments gently but clearly
3. Give advice like: "you should do this or else you won't have time...", "you will get overwhelmed...", "but if you did you will have much time & submit quality work..."
4. Study their routine patterns - when they are productive, when they procrastinate
5. Have a supportive but honest conversation about their time management
6. If they're doing something different from scheduled, help them decide if it's worth continuing or if they should switch
7. Suggest realistic adjustments

Be conversational, honest, and supportive. Use emojis sparingly. Reference specific tasks and times.`;

    const entriesStr = (entries || [])
      .filter((e: any) => e.activity?.trim())
      .map((e: any) => `${String(e.hour).padStart(2, "0")}:00 — ${e.activity} [${e.category}]`)
      .join("\n");

    const tasksStr = (scheduledTasks || [])
      .map((t: any) => `${t.startTime || "?"}-${t.endTime || "?"} — ${t.title} [${t.category}] ${t.completed ? "✅" : "⬜"}`)
      .join("\n");

    const userMessage = message || `Here's my day so far:

WHAT I'M ACTUALLY DOING:
${entriesStr || "Nothing logged yet."}

WHAT I SHOULD BE DOING (scheduled tasks):
${tasksStr || "No tasks scheduled."}

Please analyze my day and give me advice.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("record-advisor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
