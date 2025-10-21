"use client";

import { useState, useEffect } from "react";
import type { Session, Student, LessonPlan, Worksheet } from "@/lib/types";
import toast from "react-hot-toast";
import { Modal } from "../ui/Modal";

interface LessonPlanModalProps {
  session: Session;
  student: Student;
  existingPlan?: LessonPlan;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TabType = "manual" | "ai";

// List of all available topics (should match question bank topics)
const AVAILABLE_TOPICS = [
  "Quadratic Equations",
  "Trigonometry",
  "Linear Equations",
  "Geometry",
  "Functions",
  "Algebra",
  "Calculus",
  "Statistics",
];

export default function LessonPlanModal({
  session,
  student,
  existingPlan,
  isOpen,
  onClose,
  onSuccess,
}: LessonPlanModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("manual");
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Manual form state
  const [manualForm, setManualForm] = useState({
    focus_topics: existingPlan?.focus_topics || [],
    teaching_notes: existingPlan?.teaching_notes || "",
    worksheet_id: existingPlan?.worksheet_id || "",
  });

  // AI form state
  const [selectedTopic, setSelectedTopic] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState<LessonPlan | null>(null);

  // Worksheet viewing
  const [attachedWorksheet, setAttachedWorksheet] = useState<Worksheet | null>(null);

  const isViewMode = !!existingPlan && !isEditing;

  // Fetch available worksheets
  useEffect(() => {
    fetchWorksheets();
  }, []);

  // Fetch attached worksheet if viewing existing plan with worksheet
  useEffect(() => {
    if (existingPlan?.worksheet_id && worksheets.length > 0) {
      fetchAttachedWorksheet(existingPlan.worksheet_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingPlan?.worksheet_id, worksheets.length]);

  const fetchWorksheets = async () => {
    try {
      const response = await fetch("/api/worksheets");
      if (!response.ok) throw new Error("Failed to fetch worksheets");
      const data = await response.json();
      setWorksheets(data.data || []);
    } catch (error) {
      console.error("Error fetching worksheets:", error);
    }
  };

  const fetchAttachedWorksheet = async (worksheetId: string) => {
    try {
      const worksheet = worksheets.find(w => w.worksheet_id === worksheetId);
      if (worksheet) {
        setAttachedWorksheet(worksheet);
      } else {
        // Fetch from API if not in the list
        const response = await fetch(`/api/worksheets/${worksheetId}`);
        if (response.ok) {
          const data = await response.json();
          setAttachedWorksheet(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching attached worksheet:", error);
    }
  };

  const handleViewPDF = () => {
    if (attachedWorksheet?.pdf_url) {
      window.open(attachedWorksheet.pdf_url, "_blank");
    } else {
      toast.error("Worksheet PDF not available");
    }
  };

  const handleManualSave = async () => {
    if (!manualForm.teaching_notes.trim()) {
      toast.error("Teaching notes are required");
      return;
    }

    try {
      setLoading(true);

      if (existingPlan) {
        // Update existing plan
        const response = await fetch(
          `/api/lessons/${existingPlan.lesson_plan_id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(manualForm),
          }
        );

        if (!response.ok) throw new Error("Failed to update lesson plan");
        toast.success("Lesson plan updated successfully");
      } else {
        // Create new plan
        const response = await fetch("/api/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: session.session_id,
            student_id: student.student_id,
            date: session.date,
            duration: session.duration,
            ...manualForm,
          }),
        });

        if (!response.ok) throw new Error("Failed to create lesson plan");
        toast.success("Lesson plan created successfully");
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving lesson plan:", error);
      toast.error("Failed to save lesson plan");
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!selectedTopic) {
      toast.error("Please select a topic");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.session_id,
          topic: selectedTopic,
          use_student_data: false, // For future use
          search_web: false, // For future use
        }),
      });

      if (!response.ok) throw new Error("Failed to generate lesson plan");

      const data = await response.json();
      setGeneratedPlan(data.data);
      toast.success("Lesson plan generated successfully");
    } catch (error) {
      console.error("Error generating lesson plan:", error);
      toast.error("Failed to generate lesson plan");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptGenerated = async () => {
    if (!generatedPlan) return;

    // If a worksheet was selected, update the lesson plan with it
    if (generatedPlan.worksheet_id) {
      try {
        setLoading(true);
        const response = await fetch(`/api/lessons/${generatedPlan.lesson_plan_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            worksheet_id: generatedPlan.worksheet_id,
          }),
        });

        if (!response.ok) throw new Error("Failed to attach worksheet");
      } catch (error) {
        console.error("Error attaching worksheet:", error);
        toast.error("Failed to attach worksheet");
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    toast.success("Lesson plan saved successfully");
    onSuccess();
    onClose();
  };

  const handleRegenerate = () => {
    setGeneratedPlan(null);
    setSelectedTopic("");
  };

  const handleToggleTopic = (topic: string) => {
    setManualForm((prev) => ({
      ...prev,
      focus_topics: prev.focus_topics.includes(topic)
        ? prev.focus_topics.filter((t) => t !== topic)
        : [...prev.focus_topics, topic],
    }));
  };

  const handleDelete = async () => {
    if (!existingPlan) return;
    if (!confirm("Are you sure you want to delete this lesson plan?")) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/lessons/${existingPlan.lesson_plan_id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete lesson plan");
      toast.success("Lesson plan deleted successfully");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error deleting lesson plan:", error);
      toast.error("Failed to delete lesson plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      size="xl"
      isOpen={isOpen}
      onClose={onClose}
      title={existingPlan ? "Lesson Plan" : "Create Lesson Plan"}
    >
      <p className="text-sm text-gray-600 mb-4">
        {student.name} • {session.date} • {session.time} ({session.duration}{" "}
        min)
      </p>

      {isViewMode ? (
        // VIEW MODE
        <div className="space-y-6">
          {/* Lesson Plan Content */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Teaching Notes
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-gray-700">
              {existingPlan.teaching_notes}
            </div>
          </div>

          {/* Focus Topics */}
          {existingPlan.focus_topics.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Focus Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {existingPlan.focus_topics.map((topic) => (
                  <span
                    key={topic}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Worksheet */}
          {existingPlan.worksheet_id && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Attached Worksheet
              </h3>
              {attachedWorksheet && (
                <div className="mb-2 text-sm text-gray-600">
                  {attachedWorksheet.title}
                </div>
              )}
              <button
                onClick={handleViewPDF}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                View PDF
              </button>
            </div>
          )}

          {/* AI Reasoning */}
          {existingPlan.ai_reasoning && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AI Generation Details
              </h3>
              <div className="bg-blue-50 rounded-lg p-4 text-blue-900 text-sm">
                {existingPlan.ai_reasoning}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete Plan
            </button>
          </div>
        </div>
      ) : (
        // CREATE/EDIT MODE
        <>
          {/* Tabs */}
          {!existingPlan && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab("manual")}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === "manual"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Manual
              </button>
              <button
                onClick={() => setActiveTab("ai")}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === "ai"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                AI Generate
              </button>
            </div>
          )}

          {/* Manual Tab */}
          {(activeTab === "manual" || existingPlan) && !generatedPlan && (
            <div className="space-y-4">
              {/* Focus Topics */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Focus Topics
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => handleToggleTopic(topic)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        manualForm.focus_topics.includes(topic)
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teaching Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teaching Notes *
                </label>
                <textarea
                  value={manualForm.teaching_notes}
                  onChange={(e) =>
                    setManualForm({
                      ...manualForm,
                      teaching_notes: e.target.value,
                    })
                  }
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Enter lesson plan details, time breakdown, teaching points..."
                />
              </div>

              {/* Worksheet Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attach Worksheet (Optional)
                </label>
                <select
                  value={manualForm.worksheet_id}
                  onChange={(e) =>
                    setManualForm({
                      ...manualForm,
                      worksheet_id: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">No worksheet</option>
                  {worksheets.map((worksheet) => (
                    <option
                      key={worksheet.worksheet_id}
                      value={worksheet.worksheet_id}
                    >
                      {worksheet.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualSave}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {loading
                    ? "Saving..."
                    : existingPlan
                    ? "Update"
                    : "Save"}
                </button>
              </div>
            </div>
          )}

          {/* AI Tab */}
          {activeTab === "ai" && !existingPlan && (
            <div className="space-y-4">
              {!generatedPlan ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Topic
                    </label>
                    <select
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Choose a topic...</option>
                      {AVAILABLE_TOPICS.map((topic) => (
                        <option key={topic} value={topic}>
                          {topic}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleAIGenerate}
                    disabled={loading || !selectedTopic}
                    className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      "Generate Lesson Plan"
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* Generated Plan Preview */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      Generated Lesson Plan
                    </h3>
                    <div className="bg-white rounded p-4 mt-3 whitespace-pre-wrap text-gray-700">
                      {generatedPlan.teaching_notes}
                    </div>

                    {generatedPlan.ai_reasoning && (
                      <div className="mt-3 text-sm text-green-800">
                        {generatedPlan.ai_reasoning}
                      </div>
                    )}
                  </div>

                  {/* Worksheet Selector for AI Generated Plan */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attach Worksheet (Optional)
                    </label>
                    <select
                      value={generatedPlan.worksheet_id || ""}
                      onChange={(e) =>
                        setGeneratedPlan({
                          ...generatedPlan,
                          worksheet_id: e.target.value || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">No worksheet</option>
                      {worksheets.map((worksheet) => (
                        <option key={worksheet.worksheet_id} value={worksheet.worksheet_id}>
                          {worksheet.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleRegenerate}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={handleAcceptGenerated}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Accept & Save
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
