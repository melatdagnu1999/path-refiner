export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function getTodayLocal(): string {
  const tz = getUserTimezone();
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(new Date()); // YYYY-MM-DD
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export function getAIContext() {
  return {
    timezone: getUserTimezone(),
    todayLocal: getTodayLocal(),
  };
}
