"use client";

import { useState, useEffect } from "react";
import { FileDown, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  generateWorksheetPDF,
  downloadWorksheetPDF,
  type WorksheetCriteria,
  type WorksheetQuestion,
} from "@/lib/pdf/worksheet-generator";

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export default function WorksheetsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
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

  const handleTopicToggle = (topic: string) => {
    setCriteria((prev) => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic],
    }));
  };

  const handleDifficultyToggle = (
    difficulty: "Easy" | "Medium" | "Hard"
  ) => {
    setCriteria((prev) => ({
      ...prev,
      difficulty: prev.difficulty.includes(difficulty)
        ? prev.difficulty.filter((d) => d !== difficulty)
        : [...prev.difficulty, difficulty],
    }));
  };

  const handleGenerateWorksheet = async () => {
    if (criteria.topics.length === 0) {
      alert("Please select at least one topic");
      return;
    }

    if (criteria.difficulty.length === 0) {
      alert("Please select at least one difficulty level");
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
        useSections ? criteria : { ...criteria, sections: undefined }
      );

      setPdfPreview(result.pdfDataUri);
      setGeneratedQuestions(questions);
    } catch (error) {
      console.error("Error generating worksheet:", error);
      alert("Failed to generate worksheet. Please try again.");
    } finally {
      setIsGenerating(false);
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
        useSections ? criteria : { ...criteria, sections: undefined }
      ).then((result) => {
        downloadWorksheetPDF(result, filename);
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Generate Worksheet
        </h1>
        <p className="text-gray-600 mt-2">
          Create custom worksheets with AI-selected questions based on your
          criteria
        </p>
      </div>

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
                Topics {isLoadingTopics && <span className="text-xs text-gray-500">(loading...)</span>}
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
              <Button onClick={handleDownload} variant="outline">
                <FileDown className="h-5 w-5 mr-2" />
                Download PDF
              </Button>
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
    </div>
  );
}
