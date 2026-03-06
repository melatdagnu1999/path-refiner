

## Plan: Fix DSL Parsing, Storage, Editing, and Weekly View

### Problems Identified

1. **DSL Parser creates unwanted "Daily Plan" container tasks** -- The `ADD_DAILY` command creates intermediate "Daily Plan" container tasks that wrap subtasks. The new DSL format uses `ADD_SUBTASK_DAILY` with inline `WEEKLY_ID`, `DATE`, `TIME`, and `TITLE` fields, eliminating the need for `ADD_DAILY` entirely.

2. **Parser doesn't support the new `ADD_SUBTASK_DAILY` format** -- Current parser only extracts a single quoted string from `ADD_SUBTASK_DAILY`. The new format is: `ADD_SUBTASK_DAILY 1 WEEKLY_ID 1 DATE "2026-03-06" TIME "08:00-10:00" TITLE "Thesis Deep Work"`.

3. **localStorage shows "random characters"** -- This is the base64-encoded sql.js database binary. This is working correctly but looks like gibberish when inspected in DevTools. The data is actually stored properly -- the issue is cosmetic. However, we should add a JSON fallback mirror for debugging visibility.

4. **Daily view missing timer** -- The `TaskTimer` component exists and is rendered in `DayView.tsx`, but parsed tasks don't get `timerDuration` set, so timers never appear. The parser needs to calculate `timerDuration` from the time range.

5. **Editing is limited** -- Subtask editing in breakdown trees only supports title + time. Need to add date picker, category, and priority editing.

6. **Weekly view needs a task list panel** -- Currently only has the calendar grid + weekly-with-subtasks card. Need a separate "Weekly Task List" showing weekly tasks grouped with their daily children, with full editing.

---

### Changes

#### 1. Rewrite `ADD_SUBTASK_DAILY` parsing in `JournalParser.tsx`

- Add a new regex branch for the updated format: `ADD_SUBTASK_DAILY \d+ WEEKLY_ID \d+ DATE "..." TIME "..." TITLE "..."`
- Create daily tasks directly under the weekly parent (using `weeklyMap[weeklyRef]` as `parentId`), **no** intermediate "Daily Plan" container
- Calculate `timerDuration` from the time range (endTime - startTime in minutes)
- Keep the old `ADD_DAILY` + old-style `ADD_SUBTASK_DAILY` parsing as fallback for backward compatibility, but skip creating "Daily Plan" containers -- instead, assign subtasks directly to the weekly parent with the date from `ADD_DAILY`
- Inherit category from the parent weekly task

#### 2. Fix `JournalImporter.ts` scope replacement

- Instead of replacing ALL tasks of matching scopes (which wipes everything), only replace tasks whose scope matches AND whose parentId chain traces back to a parsed yearly goal. Or simpler: just merge by replacing all existing tasks (current behavior is fine for full re-imports).

#### 3. Add `timerDuration` to parsed daily tasks

- In the parser, when `startTime` and `endTime` are available, compute duration: `(endHour*60+endMin) - (startHour*60+startMin)` and set as `timerDuration`.

#### 4. Enhance editing in `TaskSection.tsx` breakdown tree

- When editing a subtask, add date picker, category selector, and priority selector alongside title and time inputs.
- The `saveEdit` function should persist all edited fields.

#### 5. Add "Weekly Task List" panel in `WeeklyCalendar.tsx`

- Add a new `Card` section **above** the existing "Weekly tasks with daily subtasks" card
- Title: "Tasks This Week"
- Show all weekly-scope tasks for this week, each with their daily children listed underneath, grouped by date
- Each daily child shows time range, title, category icon, checkbox, and edit button
- Edits here sync with the calendar grid above (same `onUpdateTask` callback)

#### 6. Ensure DayView shows timer for parsed tasks

- Already renders `TaskTimer` when `timerDuration` exists -- fix is in the parser (step 3).

---

### Files to Edit

| File | Change |
|------|--------|
| `src/components/JournalParser.tsx` | Rewrite `ADD_SUBTASK_DAILY` parsing to support new format, remove "Daily Plan" containers, compute `timerDuration` |
| `src/components/WeeklyCalendar.tsx` | Add "Weekly Task List" panel with editable daily subtasks |
| `src/components/TaskSection.tsx` | Enhance breakdown tree editing (date, category, priority) |
| `src/lib/JournalImporter.ts` | Minor cleanup for import logic |

