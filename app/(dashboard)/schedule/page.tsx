"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Calendar as CalendarIcon, Clock, User, Loader2 } from "lucide-react";
import { formatTime } from "@/lib/utils";
import type { RecurringSessionSchedule, Student } from "@/lib/types";
import Link from "next/link";

interface UpcomingSession {
  schedule_id: string;
  student_id: string;
  student_name: string;
  date: string;
  time: string;
  duration: number;
  topics: string[];
}

export default function SchedulePage() {
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingSessions();
  }, []);

  const fetchUpcomingSessions = async () => {
    try {
      setIsLoading(true);

      // Fetch all session schedules and students
      const [schedulesResponse, studentsResponse] = await Promise.all([
        fetch("/api/session-schedules"),
        fetch("/api/students"),
      ]);

      if (!schedulesResponse.ok || !studentsResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const schedulesData = await schedulesResponse.json();
      const studentsData = await studentsResponse.json();

      const schedules: RecurringSessionSchedule[] = schedulesData.data || [];
      const students: Student[] = studentsData.students || [];

      // Create a map of student_id to student for easy lookup
      const studentMap = new Map(students.map((s) => [s.student_id, s]));

      // Calculate next 14 days of sessions based on recurring schedules
      const sessions = calculateUpcomingSessions(schedules, studentMap);

      setUpcomingSessions(sessions);
    } catch (error) {
      console.error("Error fetching upcoming sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateUpcomingSessions = (
    schedules: RecurringSessionSchedule[],
    studentMap: Map<string, Student>
  ): UpcomingSession[] => {
    const sessions: UpcomingSession[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate sessions for the next 14 days
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dayOfWeek = date.getDay();

      // Find all active schedules for this day of week
      const daySchedules = schedules.filter(
        (s) => s.is_active && s.day_of_week === dayOfWeek
      );

      for (const schedule of daySchedules) {
        const student = studentMap.get(schedule.student_id);
        if (student) {
          sessions.push({
            schedule_id: schedule.schedule_id,
            student_id: schedule.student_id,
            student_name: student.name,
            date: date.toISOString().split("T")[0],
            time: schedule.time,
            duration: schedule.duration,
            topics: schedule.focus_topics,
          });
        }
      }
    }

    return sessions.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
  };

  // Group sessions by date
  const sessionsByDate = upcomingSessions.reduce((acc, session) => {
    if (!acc[session.date]) {
      acc[session.date] = [];
    }
    acc[session.date].push(session);
    return acc;
  }, {} as Record<string, UpcomingSession[]>);

  const sortedDates = Object.keys(sessionsByDate).sort();

  // Calculate summary stats
  const today = new Date().toISOString().split("T")[0];
  const todaySessions = sessionsByDate[today] || [];
  const totalHours =
    upcomingSessions.reduce((sum, s) => sum + s.duration, 0) / 60;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-500 mt-1">
            View upcoming sessions based on recurring schedules
          </p>
        </div>
        <Link href="/students">
          <Button variant="outline">
            Manage Schedules
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {todaySessions.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">sessions scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Next 2 Weeks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {upcomingSessions.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">sessions total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Teaching Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {totalHours.toFixed(1)}h
            </div>
            <p className="text-xs text-gray-500 mt-1">in next 2 weeks</p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions by Date */}
      {sortedDates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No upcoming sessions</p>
              <p className="text-sm text-gray-400 mt-1">
                Create session schedules for your students to see them here
              </p>
              <Link href="/students">
                <Button className="mt-4">
                  Manage Student Schedules
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const sessions = sessionsByDate[date];
            const dateObj = new Date(date + "T00:00:00");
            const isToday = date === today;

            return (
              <div key={date}>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-indigo-600" />
                  {dateObj.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {isToday && (
                    <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">
                      Today
                    </span>
                  )}
                </h2>

                <div className="space-y-3">
                  {sessions.map((session, idx) => (
                    <Card
                      key={`${session.schedule_id}-${date}-${idx}`}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                                <Clock className="h-4 w-4 text-indigo-600" />
                                {formatTime(session.time)}
                              </div>
                              <span className="text-xs text-gray-400">•</span>
                              <div className="text-sm text-gray-600">
                                {session.duration} minutes
                              </div>
                            </div>

                            <Link href={`/students/${session.student_id}`}>
                              <div className="flex items-center gap-2 mb-2 hover:text-indigo-600 transition-colors w-fit">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium">
                                  {session.student_name}
                                </span>
                              </div>
                            </Link>

                            {session.topics.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {session.topics.map((topic, topicIdx) => (
                                  <span
                                    key={topicIdx}
                                    className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-md"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <Link href={`/students/${session.student_id}`}>
                            <Button variant="outline" size="sm">
                              View Student
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
