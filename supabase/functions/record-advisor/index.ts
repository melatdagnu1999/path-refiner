import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_GENERATION_PROMPT = `You are an AI Daily Plan Generator. You schedule a productive day by creating daily tasks derived from the user's EXISTING yearly, monthly, and weekly goals.

CRITICAL RULES:
1. You MUST output ONLY valid DSL commands. No markdown, no explanations, no extra text.
2. The user already has yearly goals broken into monthly goals, then weekly goals. Your job is to generate ONLY daily tasks (ADD_SUBTASK_DAILY) that advance those existing weekly goals for the requested date.
3. Reference the real WEEKLY_ID values provided in the goal hierarchy — do NOT invent new yearly/monthly/weekly goals.
4. Study the user's daily record history to learn their routine patterns (when productive, when they procrastinate, energy levels).
5. Consider task progress — focus more time on behind-schedule or incomplete goals.
6. Balance across ALL categories the user has goals in.
7. Schedule realistic time blocks — don't overload. Include breaks, meals, and transition time.
8. If the user discussed specific plans in the conversation, honor those commitments.

DSL FORMAT (output ONLY this command, one per line):

ADD_SUBTASK_DAILY <id> WEEKLY_ID <weekly_id> DATE "<YYYY-MM-DD>" TIME "HH:MM-HH:MM" TITLE "<task_title>"

RULES:
- IDs start at 1 and increase sequentially.
- Every daily task MUST reference a real WEEKLY_ID from the provided goal hierarchy.
- Cover the FULL day from wake time to sleep time based on the user's observed routine.
- Categories are inherited from the weekly goal's parent chain — do NOT add category to the command.
- Make the plan for the specific date requested.
- For routine tasks (meals, prayer, exercise) that don't map to a weekly goal, use the special WEEKLY_ID 0 to indicate a standalone routine task.

LEARNING FROM RECORDS:
- If the user is productive in mornings, schedule hard tasks there.
- If they always skip a category, gently include it with a small block.
- If they're behind on a goal, allocate more time.
- If they tend to procrastinate at certain hours, schedule easier/fun tasks there.
- Include consistent routines they already follow (exercise, prayer, meals).`;

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
