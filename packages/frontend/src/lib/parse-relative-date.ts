import {
  addDays,
  addWeeks,
  addMonths,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  startOfDay,
} from "date-fns";

const NEXT_DAY_FNS: Record<string, (date: Date) => Date> = {
  monday: nextMonday,
  tuesday: nextTuesday,
  wednesday: nextWednesday,
  thursday: nextThursday,
  friday: nextFriday,
  saturday: nextSaturday,
  sunday: nextSunday,
};

/**
 * Parses a relative date string into an absolute Date.
 *
 * Supported formats:
 *   - "today"
 *   - "tomorrow"
 *   - "yesterday"
 *   - "next monday" through "next sunday"
 *   - "in N days"
 *   - "in N weeks"
 *   - "in N months"
 *
 * Case-insensitive. Returns null for unrecognized input.
 */
export function parseRelativeDate(input: string): Date | null {
  const trimmed = input.trim().toLowerCase();

  if (trimmed === "today") {
    return startOfDay(new Date());
  }

  if (trimmed === "tomorrow") {
    return startOfDay(addDays(new Date(), 1));
  }

  if (trimmed === "yesterday") {
    return startOfDay(addDays(new Date(), -1));
  }

  // "next monday" through "next sunday"
  const nextDayMatch = trimmed.match(/^next\s+(\w+)$/);
  if (nextDayMatch) {
    const dayName = nextDayMatch[1];
    const fn = NEXT_DAY_FNS[dayName];
    if (fn) {
      return startOfDay(fn(new Date()));
    }
    return null;
  }

  // "in N days", "in N weeks", "in N months"
  const inMatch = trimmed.match(/^in\s+(\d+)\s+(days?|weeks?|months?)$/);
  if (inMatch) {
    const n = parseInt(inMatch[1], 10);
    const unit = inMatch[2];

    if (unit.startsWith("day")) {
      return startOfDay(addDays(new Date(), n));
    }
    if (unit.startsWith("week")) {
      return startOfDay(addWeeks(new Date(), n));
    }
    if (unit.startsWith("month")) {
      return startOfDay(addMonths(new Date(), n));
    }
  }

  return null;
}
