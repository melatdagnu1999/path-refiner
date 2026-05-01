import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { task, allTasks, preferences, timezone, todayLocal, excludeSlots } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const today = todayLocal || new Date().toISOString().split("T")[0];
    const tz = timezone || "UTC";

    let prefBlock = "";
    if (preferences) {
      const p = preferences;
      const lines: string[] = [];
      if (p.motivationStyle) lines.push(`Motivation style: ${p.motivationStyle}`);
      if (p.favoriteBooks) lines.push(`Books: ${p.favoriteBooks}`);
      if (p.studyInterests) lines.push(`Study: ${p.studyInterests}`);
      if (p.sports) lines.push(`Sports: ${p.sports}`);
      if (p.spiritualPreference) lines.push(`Spiritual: ${p.spiritualPreference}`);
      if (p.hobbies) lines.push(`Hobbies: ${p.hobbies}`);
      if (lines.length) prefBlock = `\nUSER PREFERENCES:\n${lines.join("\n")}\n`;
    }

    const scheduledStr = (allTasks || [])
      .filter((t: any) => t.scope === "day" && t.startTime)
      .map((t: any) => `- ${t.dueDate} ${t.startTime}-${t.endTime || "?"} ${t.title} [${t.category}]`)
      .slice(0, 80)
      .join("\n");

    const excludeStr = (excludeSlots || []).length
      ? `\nDO NOT suggest these previously-rejected slots: ${JSON.stringify(excludeSlots)}`
      : "";

    const systemPrompt = `You are a smart personal scheduler. Today is ${today} (timezone ${tz}).
Detect what kind of task this is, infer a sensible duration and priority, and find a slot in the next 7 days that does NOT overlap existing scheduled tasks and does NOT overload the user (max ~6 focused hours per day already-scheduled).
${prefBlock}
Return STRICT JSON only via the suggest_slot tool.`;

    const userPrompt = `Task to plan: "${task.title}" (category: ${task.category}, current priority: ${task.priority || "medium"})
Notes: ${task.notes || "(none)"}

Existing schedule:
${scheduledStr || "(empty)"}
${excludeStr}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_slot",
            description: "Suggest a single scheduled slot for the task.",
            parameters: {
              type: "object",
              properties: {
                date: { type: "string", description: "YYYY-MM-DD" },
                startTime: { type: "string", description: "HH:MM 24h" },
                endTime: { type: "string", description: "HH:MM 24h" },
                priority: { type: "string", enum: ["low", "medium", "high"] },
                rationale: { type: "string", description: "1-2 sentences explaining why this slot." },
              },
              required: ["date", "startTime", "endTime", "priority", "rationale"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_slot" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No suggestion returned");
    const args = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-task-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
