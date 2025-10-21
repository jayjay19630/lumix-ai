"use client";

import { useState, useEffect } from "react";
import {
  FileDown,
  Loader2,
  Plus,
  FileText,
  Trash2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  generateWorksheetPDF,
  downloadWorksheetPDF,
  type WorksheetCriteria,
  type WorksheetQuestion,
} from "@/lib/pdf/worksheet-generator";
import type { Worksheet } from "@/lib/types";
import toast from "react-hot-toast";

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

type TabType = "generated" | "create";

export default function WorksheetsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("generated");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [isLoadingWorksheets, setIsLoadingWorksheets] = useState(true);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<
    WorksheetQuestion[]
  >([]);

  const [criteria, setCriteria] = useState<WorksheetCriteria>({
    title: "Math Worksheet",
    studentName: "",
    topics: [],
    difficulty: [],
    questionCount: 10,
    includeAnswerKey: false,
    sections: {
      warmup: 0,
      practice: 3,
      challenge: 0,
    },
  });

  const [useSections, setUseSections] = useState(true);

  // Fetch available topics on mount
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setIsLoadingTopics(true);
        const response = await fetch("/api/questions/topics");
        if (response.ok) {
          const data = await response.json();
          setAvailableTopics(data.topics || []);
        }
      } catch (error) {
        console.error("Error fetching topics:", error);
        // Fallback to empty array if fetch fails
        setAvailableTopics([]);
      } finally {
        setIsLoadingTopics(false);
      }
    };

    fetchTopics();
  }, []);

  // Fetch worksheets when tab changes to "generated"
  useEffect(() => {
    if (activeTab === "generated") {
      fetchWorksheets();
    }
  }, [activeTab]);

  const fetchWorksheets = async () => {
    try {
      setIsLoadingWorksheets(true);
      const response = await fetch("/api/worksheets");
      if (response.ok) {
        const data = await response.json();
        setWorksheets(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching worksheets:", error);
    } finally {
      setIsLoadingWorksheets(false);
    }
  };

  const handleTopicToggle = (topic: string) => {
    setCriteria((prev) => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic],
    }));
  };

  const handleDifficultyToggle = (difficulty: "Easy" | "Medium" | "Hard") => {
    setCriteria((prev) => ({
      ...prev,
      difficulty: prev.difficulty.includes(difficulty)
        ? prev.difficulty.filter((d) => d !== difficulty)
        : [...prev.difficulty, difficulty],
    }));
  };

  const handleGenerateWorksheet = async () => {
    if (criteria.topics.length === 0) {
      toast.error("Please select at least one topic");
      return;
    }

    if (criteria.difficulty.length === 0) {
      toast.error("Please select at least one difficulty level");
      return;
    }

    setIsGenerating(true);
    setPdfPreview(null);

    try {
      // Call API to fetch questions based on criteria
      const response = await fetch("/api/worksheets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(criteria),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch questions");
      }

      const { questions } = await response.json();

      // Generate PDF
      const result = await generateWorksheetPDF(
        questions,
        useSections ? criteria : { ...criteria, sections: undefined },
      );

      setPdfPreview(result.pdfDataUri);
      setGeneratedQuestions(questions);
    } catch (error) {
      console.error("Error generating worksheet:", error);
      toast.error("Failed to generate worksheet. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveWorksheet = async () => {
    if (!pdfPreview || generatedQuestions.length === 0) {
      return;
    }

    try {
      // Convert data URI to Blob
      const base64Response = await fetch(pdfPreview);
      const blob = await base64Response.blob();

      // Create FormData to send PDF blob
      const formData = new FormData();
      formData.append(
        "pdf",
        blob,
        `${criteria.title.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      );
      formData.append("title", criteria.title);
      formData.append("studentName", criteria.studentName || "");
      formData.append("topics", JSON.stringify(criteria.topics));
      formData.append("difficulty", JSON.stringify(criteria.difficulty));
      formData.append("questionCount", generatedQuestions.length.toString());
      formData.append(
        "questions",
        JSON.stringify(generatedQuestions.map((q) => q.id)),
      );
      formData.append("includeAnswerKey", criteria.includeAnswerKey.toString());
      if (useSections && criteria.sections) {
        formData.append("sections", JSON.stringify(criteria.sections));
      }

      // Call dedicated save endpoint
      const response = await fetch("/api/worksheets/save", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to save worksheet");
      }

      toast.success("Worksheet saved successfully!");

      // Switch to generated tab and refresh
      setActiveTab("generated");
      fetchWorksheets();
    } catch (error) {
      console.error("Error saving worksheet:", error);
      toast.error("Failed to save worksheet. Please try again.");
    }
  };

  const handleDownload = () => {
    if (pdfPreview && generatedQuestions.length > 0) {
      const filename = `${criteria.title.toLowerCase().replace(/\s+/g, "-")}-${
        new Date().toISOString().split("T")[0]
      }.pdf`;

      // Recreate the PDF result for download
      generateWorksheetPDF(
        generatedQuestions,
        useSections ? criteria : { ...criteria, sections: undefined },
      ).then((result) => {
        downloadWorksheetPDF(result, filename);
      });
    }
  };

  const handleDeleteWorksheet = async (worksheetId: string) => {
    if (!confirm("Are you sure you want to delete this worksheet?")) {
      return;
    }

    try {
      const response = await fetch(`/api/worksheets?id=${worksheetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete worksheet");
      }

      // Refresh worksheets list
      toast.success("Worksheet deleted successfully");
      fetchWorksheets();
    } catch (error) {
      console.error("Error deleting worksheet:", error);
      toast.error("Failed to delete worksheet. Please try again.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Worksheets</h1>
        <p className="text-gray-600 mt-2">
          Create and manage custom worksheets with AI-selected questions
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("generated")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "generated"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <FileText className="inline h-5 w-5 mr-2 -mt-1" />
            Generated Worksheets
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "create"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Plus className="inline h-5 w-5 mr-2 -mt-1" />
            Create New
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "generated" && (
        <div>
          {isLoadingWorksheets ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : worksheets.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No worksheets yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first worksheet by clicking the &quot;Create
                New&quot; tab
              </p>
              <Button onClick={() => setActiveTab("create")}>
                <Plus className="h-5 w-5 mr-2" />
                Create Worksheet
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {worksheets.map((worksheet) => (
                <Card
                  key={worksheet.worksheet_id}
                  className="p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {worksheet.title}
                      </h3>
                      {worksheet.student_name && (
                        <p className="text-sm text-gray-600 mb-2">
                          For: {worksheet.student_name}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(worksheet.created_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-indigo-200" />
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex flex-wrap gap-1">
                      {worksheet.topics.slice(0, 3).map((topic) => (
                        <span
                          key={topic}
                          className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded"
                        >
                          {topic}
                        </span>
                      ))}
                      {worksheet.topics.length > 3 && (
                        <span className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded">
                          +{worksheet.topics.length - 3} more
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {worksheet.question_count} questions
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(worksheet.pdf_url, "_blank")}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      View PDF
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleDeleteWorksheet(worksheet.worksheet_id)
                      }
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Criteria Form */}
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Worksheet Criteria</h2>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Worksheet Title
                </label>
                <input
                  type="text"
                  value={criteria.title}
                  onChange={(e) =>
                    setCriteria({ ...criteria, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Algebra Practice Worksheet"
                />
              </div>

              {/* Student Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Name (Optional)
                </label>
                <input
                  type="text"
                  value={criteria.studentName}
                  onChange={(e) =>
                    setCriteria({ ...criteria, studentName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Alice Johnson"
                />
              </div>

              {/* Topics */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Topics{" "}
                  {isLoadingTopics && (
                    <span className="text-xs text-gray-500">(loading...)</span>
                  )}
                </label>
                {availableTopics.length === 0 && !isLoadingTopics ? (
                  <p className="text-sm text-gray-500 italic">
                    No topics available. Please add questions first.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTopics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => handleTopicToggle(topic)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          criteria.topics.includes(topic)
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Difficulty */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Levels
                </label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map((difficulty) => (
                    <button
                      key={difficulty}
                      onClick={() => handleDifficultyToggle(difficulty)}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        criteria.difficulty.includes(difficulty)
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Questions: {criteria.questionCount}
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={criteria.questionCount}
                  onChange={(e) =>
                    setCriteria({
                      ...criteria,
                      questionCount: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>

              {/* Sections */}
              <div className="mb-4">
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={useSections}
                    onChange={(e) => setUseSections(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Divide into sections (Warm-up, Practice, Challenge)
                  </span>
                </label>

                {useSections && (
                  <div className="space-y-3 pl-6 border-l-2 border-gray-200">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Warm-up: {criteria.sections?.warmup || 0}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max={Math.floor(criteria.questionCount / 2)}
                        value={criteria.sections?.warmup || 0}
                        onChange={(e) =>
                          setCriteria({
                            ...criteria,
                            sections: {
                              ...criteria.sections,
                              warmup: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Practice: {criteria.sections?.practice || 0}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max={Math.floor(criteria.questionCount / 2)}
                        value={criteria.sections?.practice || 0}
                        onChange={(e) =>
                          setCriteria({
                            ...criteria,
                            sections: {
                              ...criteria.sections,
                              practice: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Challenge: {criteria.sections?.challenge || 0}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max={Math.floor(criteria.questionCount / 2)}
                        value={criteria.sections?.challenge || 0}
                        onChange={(e) =>
                          setCriteria({
                            ...criteria,
                            sections: {
                              ...criteria.sections,
                              challenge: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateWorksheet}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Generate Worksheet
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Preview */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Preview</h2>
              {pdfPreview && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveWorksheet}
                    variant="primary"
                    size="sm"
                  >
                    Save to Library
                  </Button>
                  <Button onClick={handleDownload} variant="outline" size="sm">
                    <FileDown className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </div>

            {pdfPreview ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <iframe
                  src={pdfPreview}
                  className="w-full h-[700px]"
                  title="Worksheet Preview"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[700px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <FileDown className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Configure criteria and click Generate Worksheet
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
