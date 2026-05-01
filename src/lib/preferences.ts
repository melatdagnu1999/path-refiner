export interface UserPreferences {
  motivationStyle: "story" | "tough-love" | "gentle" | "data-driven" | "";
  favoriteBooks: string;
  studyInterests: string;
  sports: string;
  spiritualPreference: string;
  hobbies: string;
}

const KEY = "user_preferences_v1";

export const DEFAULT_PREFERENCES: UserPreferences = {
  motivationStyle: "",
  favoriteBooks: "",
  studyInterests: "",
  sports: "",
  spiritualPreference: "",
  hobbies: "",
};

export function getPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function setPreferences(p: UserPreferences) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function getPreferencesPromptBlock(p?: UserPreferences): string {
  const prefs = p || getPreferences();
  const lines: string[] = [];
  if (prefs.motivationStyle) lines.push(`- Motivation style: ${prefs.motivationStyle}`);
  if (prefs.favoriteBooks) lines.push(`- Favorite books: ${prefs.favoriteBooks}`);
  if (prefs.studyInterests) lines.push(`- Study interests: ${prefs.studyInterests}`);
  if (prefs.sports) lines.push(`- Sports: ${prefs.sports}`);
  if (prefs.spiritualPreference) lines.push(`- Spiritual preference: ${prefs.spiritualPreference}`);
  if (prefs.hobbies) lines.push(`- Hobbies: ${prefs.hobbies}`);
  if (lines.length === 0) return "";
  return `\n\nUSER PREFERENCES (use these to deeply personalize all advice, motivation, and examples):\n${lines.join("\n")}\n`;
}
