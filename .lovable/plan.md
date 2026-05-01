## Goal

Refine the AI Life Planner, Daily Record advisor, Task Guidance, and Unplanned Inbox to be more flexible, personalized (preferences-driven), timezone-aware, and proactive.

---

## 1. Life Planner: command-driven yearly breakdown + flexible follow-up

In `src/components/LifePlannerChat.tsx`:

- Replace the static empty-state hint with an **action-row of quick-command buttons** that pre-fill / send a message:
  - `🎯 Break down yearly goals` → sends a structured prompt asking the AI to start the 4-layer interview from yearly goals (with the example format).
  - `🔄 Reschedule next week`
  - `➕ Add new task to confirmed plan` → sends a prompt instructing the AI to merge a new task into the already-confirmed plan and re-emit a full DSL.
  - `📋 Daily check-in`
- Update `supabase/functions/life-planner-chat/index.ts` system prompt:
  - Add an explicit rule: **after `CONFIRM FULL PLAN`, the user can request additions / changes; the AI must integrate them and re-emit the FULL DSL** (already partly stated, but make it explicit and unconditional — no need to redo full interview).
  - Inject the user's **preferences** (motivation style, books, study interests, sports, spiritual preference, hobbies — see §4) into the system prompt so all responses reference them.
  - Inject user's **timezone** (see §5) so dates/times are correct.

## 2. Unplanned Inbox: per-task "Suggest Plan" → "Create"

In `src/pages/Todo.tsx` for each unplanned-inbox row:

- Add a `✨ Suggest Plan` button next to the trash icon.
- Clicking calls a new edge function **`suggest-task-plan`** with `{ task, allTasks, preferences, timezone }`.
- Function returns JSON: `{ date, startTime, endTime, priority, rationale }` based on detecting the task type, current schedule load, and avoiding overload.
- UI shows the suggestion inline with two buttons:
  - `👍 Accept & Create` — promotes task out of inbox by removing `__unplanned__` notes, sets `dueDate`, `startTime`, `endTime`, `priority`, scope `day`.
  - `👎 Suggest Another` — re-calls the edge function with `excludeSlots: [previous]` to get an alternative.
- New edge function file: `supabase/functions/suggest-task-plan/index.ts` (Lovable AI Gateway, JSON output, no streaming).

## 3. Task Guidance copy + behavior

In `src/components/TaskGuidance.tsx` and `supabase/functions/task-guidance/index.ts`:

- Remove the literal heading "AI Guidance" — replace with neutral label like the task title or just an icon.
- Update the system prompt: **never** output the fallback "due date has already passed, please confirm…" message. Instead, when a due date is in the past, simply guide the user on how to do the task now or how to reschedule it — actionable, not a confirmation prompt.
- Inject preferences (see §4) for richer personalization.

## 4. Preferences page

New route + nav item:

- `src/pages/Preferences.tsx` — form for:
  - Motivation Style (radio: Story-based / Tough-love / Gentle / Data-driven)
  - Favorite Books (free-text list)
  - Study Interests (free-text list)
  - Sports (free-text list)
  - Spiritual Preference (free-text)
  - Hobbies (free-text list)
- Persist to `localStorage` under key `user_preferences_v1` (no DB needed; simple).
- Helper `src/lib/preferences.ts`:
  - `getPreferences()` / `setPreferences()`
  - `getPreferencesPromptBlock()` → returns a markdown block to inject into AI system prompts.
- Wire into all three edge functions (`life-planner-chat`, `record-advisor`, `task-guidance`, `suggest-task-plan`) by sending preferences in the request body and concatenating into the system prompt.
- Add nav item in `src/pages/Index.tsx`: `{ view: "preferences", label: "Preferences", icon: <Settings /> }`.

## 5. Timezone correction

- Helper `src/lib/timezone.ts`:
  - `getUserTimezone()` → `Intl.DateTimeFormat().resolvedOptions().timeZone` (e.g., `Africa/Addis_Ababa`).
  - `getTodayLocal()` → today's date string in user's TZ.
- Send `timezone` and `todayLocal` in every AI edge-function request body.
- Each edge function's system prompt uses the supplied `todayLocal` instead of `new Date().toISOString().split("T")[0]` (which is UTC).
- `useTaskNotifications` already uses local `Date()` so it's fine; no change needed there.

## 6. Notification → AI Advisor integration

In `src/hooks/useTaskNotifications.ts`:

- Add a new event emitter `onTaskReminderForAdvisor` similar to existing `onTimerNotification`, fired alongside the 30-min reminder with the upcoming task.

In `src/pages/DailyRecord.tsx`:

- Subscribe to `onTaskReminderForAdvisor`. When fired, automatically call advisor with a prompt like: *"Task '{title}' starts at {time}. Explain how important this is to my goals, how to focus, how to avoid distractions during it."* — message is appended (not replacing prior advice).

## 7. AI Advisor: persist messages until next entry

In `src/pages/DailyRecord.tsx`:

- Currently `setAdvisorMessages([])` is called on date change — keep that.
- But on each new auto-trigger (typing a record), **append** rather than reset. Current code already appends via `setAdvisorMessages((prev) => [...prev, ...])` — verify and ensure no place clears it implicitly. Add explicit comment / guard.
- Add a small `🗑️ Clear` button so user can manually clear when they want.

---

## Files to create

- `src/pages/Preferences.tsx`
- `src/lib/preferences.ts`
- `src/lib/timezone.ts`
- `supabase/functions/suggest-task-plan/index.ts`

## Files to edit

- `src/components/LifePlannerChat.tsx` — quick-command buttons, send preferences+tz, refined empty-state
- `src/components/TaskGuidance.tsx` — drop "AI Guidance" label, send preferences+tz
- `src/pages/Todo.tsx` — per-row Suggest Plan / Accept / Reject flow
- `src/pages/DailyRecord.tsx` — subscribe to reminder events, send preferences+tz, add Clear button
- `src/pages/Index.tsx` — Preferences nav item + route
- `src/hooks/useTaskNotifications.ts` — emit reminder event for advisor
- `supabase/functions/life-planner-chat/index.ts` — preferences/tz injection, post-confirm flexibility rule
- `supabase/functions/record-advisor/index.ts` — preferences/tz injection
- `supabase/functions/task-guidance/index.ts` — preferences/tz injection, drop overdue-confirmation copy

---

## Technical notes

- Preferences stored in `localStorage` only — no DB schema changes.
- All edge functions accept optional `{ preferences, timezone, todayLocal }` and degrade gracefully when missing.
- `suggest-task-plan` uses non-streaming JSON response (`response_format: { type: "json_object" }`) for simple parsing.
- The reminder→advisor event uses the existing in-memory listener pattern (`onTimerNotification`) for consistency.
