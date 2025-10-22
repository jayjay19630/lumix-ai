import {
  getAllSessionSchedules,
  createSession,
  getSessionsByDateRange,
} from "../aws/dynamodb";
import type { Session } from "../types";

/**
 * Generate session ID in format: sess_YYYYMMDD_studentId
 */
export function generateSessionId(date: string, studentId: string): string {
  const dateStr = date.replace(/-/g, ""); // YYYYMMDD
  return `sess_${dateStr}_${studentId}`;
}

/**
 * Get all dates in a date range that match a specific day of week
 */
export function getDatesByDayOfWeek(
  startDate: Date,
  endDate: Date,
  dayOfWeek: number,
): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    if (current.getDay() === dayOfWeek) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Generate sessions from recurring schedules for a date range
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of created sessions
 */
export async function generateSessionsFromSchedules(
  startDate: string,
  endDate: string,
): Promise<Session[]> {
  try {
    // Get all active session schedules
    const schedules = await getAllSessionSchedules();
    const activeSchedules = schedules.filter((s) => s.is_active);

    if (activeSchedules.length === 0) {
      console.log("No active session schedules found");
      return [];
    }

    // Get existing sessions in the date range to avoid duplicates
    const existingSessions = await getSessionsByDateRange(startDate, endDate);
    const existingSessionIds = new Set(
      existingSessions.map((s) => s.session_id),
    );

    const start = new Date(startDate);
    const end = new Date(endDate);

    const newSessions: Session[] = [];

    // For each schedule, generate sessions for matching days
    for (const schedule of activeSchedules) {
      const dates = getDatesByDayOfWeek(start, end, schedule.day_of_week);

      for (const date of dates) {
        const dateStr = formatDate(date);
        const sessionId = generateSessionId(dateStr, schedule.student_id);

        // Skip if session already exists
        if (existingSessionIds.has(sessionId)) {
          continue;
        }

        // Create new session
        const session: Session = {
          session_id: sessionId,
          student_id: schedule.student_id,
          schedule_id: schedule.schedule_id,
          date: dateStr,
          time: schedule.time,
          duration: schedule.duration,
          created_by: "auto",
          created_at: new Date().toISOString(),
        };

        const createdSession = await createSession(session);
        newSessions.push(createdSession);
      }
    }

    console.log(`Generated ${newSessions.length} new sessions`);
    return newSessions;
  } catch (error) {
    console.error("Error generating sessions from schedules:", error);
    throw error;
  }
}

/**
 * Generate sessions for the next N days
 * @param days - Number of days to generate sessions for
 * @returns Array of created sessions
 */
export async function generateSessionsForNextDays(
  days: number,
): Promise<Session[]> {
  const startDate = formatDate(new Date());
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  const endDateStr = formatDate(endDate);

  return generateSessionsFromSchedules(startDate, endDateStr);
}

/**
 * Generate sessions for current month
 */
export async function generateSessionsForCurrentMonth(): Promise<Session[]> {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return generateSessionsFromSchedules(
    formatDate(startDate),
    formatDate(endDate),
  );
}

/**
 * Generate sessions for a specific month
 * @param year - Year (e.g., 2025)
 * @param month - Month (0-11, where 0 = January)
 */
export async function generateSessionsForMonth(
  year: number,
  month: number,
): Promise<Session[]> {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  return generateSessionsFromSchedules(
    formatDate(startDate),
    formatDate(endDate),
  );
}
