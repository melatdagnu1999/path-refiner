import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_CONVERSATION_PROMPT = `You are a warm, insightful AI Life Planner having an open conversation with the user to build their daily (and upcoming days') plan.

YOUR APPROACH:
1. First, understand how the user is feeling — energy level, mood, what's on their mind, any deadlines pressing.
2. Based on their response AND their existing goals/tasks, propose a balanced plan that is NEVER overwhelming.
3. The plan should be realistic based on their energy. Low energy? Lighter day with essential tasks only. High energy? More ambitious but still balanced.
4. Always consider ALL categories (work, study, fitness, spiritual, fun, relationships) for a whole-person balance.
5. When you present the plan, show it as a clean, readable schedule — NOT raw DSL code.
6. Ask for feedback. Let them adjust. Only finalize when they agree.

WHEN THE USER CONFIRMS THE PLAN (says yes, looks good, confirm, etc.):
- Output the FINAL plan as hidden DSL commands wrapped in a special block:
  ~~~dsl
  ADD_SUBTASK_DAILY 1 WEEKLY_ID <id> DATE "<YYYY-MM-DD>" TIME "HH:MM-HH:MM" TITLE "<title>"
  ADD_SUBTASK_DAILY 2 WEEKLY_ID <id> DATE "<YYYY-MM-DD>" TIME "HH:MM-HH:MM" TITLE "<title>"
  ~~~
- Before the DSL block, write a brief encouraging confirmation message.
- WEEKLY_ID must reference real IDs from the goal hierarchy. Use WEEKLY_ID 0 for routine/standalone tasks.
- IDs start at 1 and increase sequentially.

PLAN PRESENTATION FORMAT (before confirmation):
Show the plan as a friendly readable schedule like:
"Here's what I suggest for today:
🌅 **Morning**
- 6:00-6:30 — Morning prayer/meditation
- 6:30-7:30 — Study Chapter 5 (your exam is in 3 days!)
...
🌤️ **Afternoon**
- 12:00-13:00 — Lunch break
...
🌙 **Evening**
- ...

This gives you X hours of focused work, Y hours of self-care, and enough rest. What do you think?"

CRITICAL RULES:
- NEVER show raw DSL to the user in conversation. Only output it in the ~~~dsl block after confirmation.
- Be conversational, warm, ask questions.
- Factor in their stated energy/mood — don't push someone who's exhausted.
- Reference their ACTUAL goals by name. Show you know what they're working toward.
- Plan for today primarily, but mention upcoming days if relevant deadlines exist.
- Keep the plan balanced across categories — discipline WITHOUT burnout.
- If they mention feeling overwhelmed, reduce the plan and focus on essentials only.`;

const ADVISOR_PROMPT = `You are an AI daily routine advisor and accountability partner. You analyze what the user IS doing vs what they SHOULD be doing based on their scheduled tasks.

Your job:
1. Compare the user's actual activities (from their daily record) with their scheduled tasks
2. Point out misalignments gently but clearly
3. Give advice like: "you should do this or else you won't have time...", "you will get overwhelmed...", "but if you did you will have much time & submit quality work..."
4. Study their routine patterns - when they are productive, when they procrastinate
5. Have a supportive but honest conversation about their time management
6. If they're doing something different from scheduled, help them decide if it's worth continuing or if they should switch
7. Suggest realistic adjustments

Be conversational, honest, and supportive. Use emojis sparingly. Reference specific tasks and times.`;

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { entries, scheduledTasks, date, message, preferences, timezone, todayLocal, generatePlan, existingTasks, recordHistory } = await req.json();
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
      if (lines.length) prefBlock = `\n\nUSER PREFERENCES (use to personalize):\n${lines.join("\n")}\n`;
    }

    const today = todayLocal || date || new Date().toISOString().split("T")[0];
    const tz = timezone || "UTC";

    // Build entries and tasks strings
    const entriesStr = (entries || [])
      .filter((e: any) => e.activity?.trim())
      .map((e: any) => `${String(e.hour).padStart(2, "0")}:00 — ${e.activity} [${e.category}]`)
      .join("\n");

    const tasksStr = (scheduledTasks || [])
      .map((t: any) => `${t.startTime || "?"}-${t.endTime || "?"} — ${t.title} [${t.category}] ${t.completed ? "✅" : "⬜"}`)
      .join("\n");

    let systemPrompt: string;
    let userMessage: string;

    if (generatePlan) {
      // Plan generation mode
      systemPrompt = PLAN_GENERATION_PROMPT;
      systemPrompt += `\n\nToday's date: ${today}\nTimezone: ${tz}${prefBlock}`;

      // Build historical records context
      let historyBlock = "";
      if (recordHistory && Array.isArray(recordHistory) && recordHistory.length > 0) {
        historyBlock = "\n\nUSER'S RECENT DAILY RECORDS (study these to learn their routine):\n";
        for (const rec of recordHistory) {
          historyBlock += `\n--- ${rec.date} ---\n`;
          for (const e of rec.entries) {
            historyBlock += `  ${String(e.hour).padStart(2, "0")}:00 — ${e.activity} [${e.category}]\n`;
          }
        }
      }

      // Build existing goal hierarchy context
      let existingBlock = "";
      if (existingTasks && Array.isArray(existingTasks) && existingTasks.length > 0) {
        // Group by scope for clear hierarchy display
        const yearly = existingTasks.filter((t: any) => t.scope === "year");
        const monthly = existingTasks.filter((t: any) => t.scope === "month");
        const weekly = existingTasks.filter((t: any) => t.scope === "week");
        const daily = existingTasks.filter((t: any) => t.scope === "day");

        existingBlock = "\n\nUSER'S GOAL HIERARCHY (use WEEKLY_IDs to create daily tasks):\n";

        if (yearly.length) {
          existingBlock += "\n--- YEARLY GOALS ---\n";
          for (const t of yearly) {
            const progress = t.progress ? ` (${t.progress}% done)` : "";
            existingBlock += `  ID:${t.id} "${t.title}" [${t.category}]${progress} ${t.completed ? "✅" : "⬜"}\n`;
          }
        }
        if (monthly.length) {
          existingBlock += "\n--- MONTHLY GOALS (parentId → yearly) ---\n";
          for (const t of monthly) {
            const progress = t.progress ? ` (${t.progress}% done)` : "";
            existingBlock += `  ID:${t.id} parentId:${t.parentId || "none"} "${t.title}" [${t.category}]${progress} ${t.completed ? "✅" : "⬜"}\n`;
          }
        }
        if (weekly.length) {
          existingBlock += "\n--- WEEKLY GOALS (parentId → monthly) — USE THESE IDs as WEEKLY_ID ---\n";
          for (const t of weekly) {
            const progress = t.progress ? ` (${t.progress}% done)` : "";
            const dueDateStr = t.dueDate ? ` due:${t.dueDate}` : "";
            existingBlock += `  WEEKLY_ID:${t.id} parentId:${t.parentId || "none"} "${t.title}" [${t.category}]${progress}${dueDateStr} ${t.completed ? "✅" : "⬜"}\n`;
          }
        }
        if (daily.length) {
          existingBlock += "\n--- ALREADY SCHEDULED DAILY TASKS (avoid duplicating) ---\n";
          for (const t of daily) {
            const time = t.startTime ? ` ${t.startTime}-${t.endTime || "?"}` : "";
            existingBlock += `  "${t.title}" [${t.category}]${time} ${t.completed ? "✅" : "⬜"}\n`;
          }
        }
      }

      userMessage = `Generate a complete daily plan for ${today}.${historyBlock}${existingBlock}

TODAY'S RECORD SO FAR:
${entriesStr || "Nothing logged yet."}

CURRENTLY SCHEDULED TASKS:
${tasksStr || "No tasks scheduled."}

${message || "Create a balanced, productive daily plan that makes me disciplined and helps me achieve my goals. Consider my routine patterns and task progress."}

OUTPUT ONLY THE DSL COMMANDS. Nothing else.`;
    } else {
      // Normal advisor mode
      systemPrompt = ADVISOR_PROMPT;
      systemPrompt += `\n\nToday's date: ${today}\nTimezone: ${tz}${prefBlock}`;

      // Include record history for routine learning in advisor mode too
      if (recordHistory && Array.isArray(recordHistory) && recordHistory.length > 0) {
        systemPrompt += "\n\nUSER'S RECENT DAILY RECORDS (use to understand their patterns):\n";
        for (const rec of recordHistory) {
          systemPrompt += `\n--- ${rec.date} ---\n`;
          for (const e of rec.entries) {
            systemPrompt += `  ${String(e.hour).padStart(2, "0")}:00 — ${e.activity} [${e.category}]\n`;
          }
        }
      }

      userMessage = message || `Here's my day so far:

WHAT I'M ACTUALLY DOING:
${entriesStr || "Nothing logged yet."}

WHAT I SHOULD BE DOING (scheduled tasks):
${tasksStr || "No tasks scheduled."}

Please analyze my day and give me advice.`;
    }

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
