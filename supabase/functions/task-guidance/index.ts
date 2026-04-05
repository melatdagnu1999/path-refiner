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
    const { task, allTasks, memoryContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const today = new Date().toISOString().split("T")[0];

    const systemPrompt = `You are an AI executive function assistant that provides deeply personalized task guidance.
You classify tasks and create a FULL actionable step-by-step plan.

Today's date: ${today}

${memoryContext || "No prior context available."}

Categories: deep_work, study, spiritual, fitness, admin, calls, research, writing, reading, social, recovery, motivation

Difficulty: low, medium, high

Energy required: light, moderate, intense

CRITICAL INSTRUCTIONS:

1. Generate ALL consecutive steps needed to complete the task (3-8 steps depending on complexity)
2. Each step must be specific and immediately actionable
3. The FIRST step must be something the user can start RIGHT NOW — set its status to "in_progress"
4. All other steps are "pending"
5. Include overwhelm protection: if the task is large, scope today's target to be manageable
6. The motivation MUST be personalized & also suggestive to explore:
   - If the user has favorite books, reference relevant insights from those books
   - If the user has study interests, connect the task to those interests
   - If the task is spiritual, use their spiritual preferences
   - If mood is tired/overwhelmed, be gentler and scope smaller
   - Use story-based motivation if that's their style
7. Include 1-3 relevant resources (websites, apps, tools, scripture links)
8. Include a suggested calendar event with title, duration, and when to schedule
9. Time estimates should be realistic

Format your response in clear markdown with sections:
## 🎯 Task Classification
## 📋 Step-by-Step Plan
## 💪 Motivation
## 📚 Resources
## 📅 Suggested Schedule`;

    const taskContext = `Task: "${task.title}"
Category: ${task.category}
Scope: ${task.scope}
Priority: ${task.priority}
Due: ${task.dueDate}
Time: ${task.startTime || "not set"} - ${task.endTime || "not set"}
Completed: ${task.completed}
${task.notes ? `Notes: ${task.notes}` : ""}

Related tasks in the same period:
${(allTasks || []).slice(0, 15).map((t: any) => `- [${t.scope}] ${t.title} (${t.category}, ${t.completed ? "✅" : "⬜"})`).join("\n")}`;

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
            { role: "user", content: taskContext },
          ],
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
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "No guidance generated.";

    return new Response(JSON.stringify({ guidance: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("task-guidance error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
