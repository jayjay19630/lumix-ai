"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
import type { RecurringSessionSchedule } from "@/lib/types";
import { Modal } from "../ui/Modal";

interface SessionScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  existingSchedule?: RecurringSessionSchedule | null;
  onSave?: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function SessionScheduleModal({
  isOpen,
  onClose,
  studentId,
  existingSchedule,
  onSave,
}: SessionScheduleModalProps) {
  const [dayOfWeek, setDayOfWeek] = useState(1); // Default to Monday
  const [time, setTime] = useState("14:00");
  const [duration, setDuration] = useState(60);
  const [focusTopics, setFocusTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing schedule data if editing
  useEffect(() => {
    if (existingSchedule) {
      setDayOfWeek(existingSchedule.day_of_week);
      setTime(existingSchedule.time);
      setDuration(existingSchedule.duration);
      setFocusTopics(existingSchedule.focus_topics || []);
    } else {
      // Reset to defaults when creating new
      setDayOfWeek(1);
      setTime("14:00");
      setDuration(60);
      setFocusTopics([]);
    }
  }, [existingSchedule, isOpen]);

  const handleAddTopic = () => {
    if (topicInput.trim() && !focusTopics.includes(topicInput.trim())) {
      setFocusTopics([...focusTopics, topicInput.trim()]);
      setTopicInput("");
    }
  };

  const handleRemoveTopic = (topic: string) => {
    setFocusTopics(focusTopics.filter((t) => t !== topic));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const scheduleData = {
        student_id: studentId,
        day_of_week: dayOfWeek,
        time,
        duration,
        focus_topics: focusTopics,
      };

      let response;
      if (existingSchedule) {
        // Update existing schedule
        response = await fetch(
          `/api/session-schedules/${existingSchedule.schedule_id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scheduleData),
          },
        );
      } else {
        // Create new schedule
        response = await fetch("/api/session-schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scheduleData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save schedule");
      }

      onSave?.();
      onClose();
    } catch (err) {
      console.error("Error saving schedule:", err);
      setError(err instanceof Error ? err.message : "Failed to save schedule");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        existingSchedule ? "Edit Session Schedule" : "Create Session Schedule"
      }
    >
      {/* Content */}
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Day of Week */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Day of Week
          </label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {DAYS_OF_WEEK.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (minutes)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            min={15}
            step={15}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Focus Topics */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Focus Topics (Optional)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddTopic()}
              placeholder="e.g., Quadratic Equations"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Button type="button" onClick={handleAddTopic} variant="outline">
              Add
            </Button>
          </div>
          {focusTopics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {focusTopics.map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                >
                  {topic}
                  <button
                    onClick={() => handleRemoveTopic(topic)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex w-full justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving
            ? "Saving..."
            : existingSchedule
              ? "Update Schedule"
              : "Create Schedule"}
        </Button>
      </div>
    </Modal>
  );
}
