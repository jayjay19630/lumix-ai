"use client";

import { useState, useEffect } from "react";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  parseISO,
} from "date-fns";
import type { Session, Student } from "@/lib/types";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";

type ViewType = "week" | "month";

export default function SchedulePage() {
  const [viewType, setViewType] = useState<ViewType>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Calculate date range based on view type
  const getDateRange = () => {
    if (viewType === "week") {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 0 }),
        end: endOfWeek(currentDate, { weekStartsOn: 0 }),
      };
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      };
    }
  };

  const { start, end } = getDateRange();
  const daysInView = eachDayOfInterval({ start, end });

  // Fetch sessions for current date range
  useEffect(() => {
    fetchSessions();
  }, [currentDate, viewType]);

  // Fetch students on mount
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const startDate = format(start, "yyyy-MM-dd");
      const endDate = format(end, "yyyy-MM-dd");

      const response = await fetch(
        `/api/sessions?start_date=${startDate}&end_date=${endDate}`
      );

      if (!response.ok) throw new Error("Failed to fetch sessions");

      const data = await response.json();
      setSessions(data.data || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students");
      if (!response.ok) throw new Error("Failed to fetch students");
      const data = await response.json();
      setStudents(data.data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const handleGenerateSessions = async () => {
    try {
      const startDate = format(start, "yyyy-MM-dd");
      const endDate = format(end, "yyyy-MM-dd");

      const response = await fetch(
        `/api/sessions?start_date=${startDate}&end_date=${endDate}&generate=true`
      );

      if (!response.ok) throw new Error("Failed to generate sessions");

      const data = await response.json();
      toast.success(`Generated ${data.data.length} sessions`);
      fetchSessions();
    } catch (error) {
      console.error("Error generating sessions:", error);
      toast.error("Failed to generate sessions");
    }
  };

  const navigatePrevious = () => {
    if (viewType === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewType === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  const getSessionsForDay = (day: Date) => {
    return sessions.filter((session) =>
      isSameDay(parseISO(session.date), day)
    );
  };

  const getStudentName = (studentId: string) => {
    const student = students.find((s) => s.student_id === studentId);
    return student?.name || studentId;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-600 mt-1">
            Manage your tutoring sessions and lesson plans
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateSessions}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Generate Sessions
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            + Add Session
          </button>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          {/* View Type Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewType("week")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewType === "week"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewType("month")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewType === "month"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Month
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={navigatePrevious}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ←
            </button>
            <button
              onClick={navigateToday}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Today
            </button>
            <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
              {viewType === "week"
                ? `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`
                : format(currentDate, "MMMM yyyy")}
            </h2>
            <button
              onClick={navigateNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              →
            </button>
          </div>

          <div className="w-32"></div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading sessions...
          </div>
        ) : (
          <div
            className={`grid gap-4 ${
              viewType === "week" ? "grid-cols-7" : "grid-cols-7"
            }`}
          >
            {/* Day Headers */}
            {daysInView.slice(0, 7).map((day) => (
              <div
                key={day.toISOString()}
                className="text-center font-semibold text-gray-700 pb-2 border-b"
              >
                {format(day, "EEE")}
              </div>
            ))}

            {/* Day Cells */}
            {daysInView.map((day) => {
              const daySessions = getSessionsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[120px] p-3 border rounded-lg ${
                    isToday
                      ? "bg-indigo-50 border-indigo-300"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div
                    className={`text-sm font-medium mb-2 ${
                      isToday ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="space-y-2">
                    {daySessions.map((session) => (
                      <SessionCard
                        key={session.session_id}
                        session={session}
                        studentName={getStudentName(session.student_id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Session Modal */}
      {showAddModal && (
        <AddSessionModal
          students={students}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchSessions();
          }}
        />
      )}
    </div>
  );
}

// Session Card Component
function SessionCard({
  session,
  studentName,
}: {
  session: Session;
  studentName: string;
}) {
  const hasLessonPlan = !!session.lesson_plan_id;

  return (
    <div
      className="p-2 bg-white border border-gray-200 rounded cursor-pointer hover:shadow-md transition-shadow text-xs"
      onClick={() => {
        // TODO: Open lesson plan modal
        toast.error("Lesson plan modal not yet implemented");
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {studentName}
          </div>
          <div className="text-gray-600">{session.time}</div>
          <div className="text-gray-500">{session.duration} min</div>
        </div>
        <div
          className={`text-xs px-2 py-1 rounded ${
            hasLessonPlan
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {hasLessonPlan ? "✓ Ready" : "🕐 No Plan"}
        </div>
      </div>
    </div>
  );
}

// Add Session Modal Component
function AddSessionModal({
  students,
  isOpen,
  onClose,
  onSuccess,
}: {
  students: Student[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    student_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    duration: 60,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.student_id) {
      toast.error("Please select a student");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create session");

      toast.success("Session created successfully");
      onSuccess();
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Session">

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Student Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student
            </label>
            <select
              value={formData.student_id}
              onChange={(e) =>
                setFormData({ ...formData, student_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            >
              <option value="">Select a student</option>
              {students.map((student) => (
                <option key={student.student_id} value={student.student_id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) =>
                setFormData({ ...formData, time: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) =>
                setFormData({ ...formData, duration: parseInt(e.target.value) })
              }
              min="15"
              step="15"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Session"}
            </button>
          </div>
        </form>

    </Modal>
  );
}
