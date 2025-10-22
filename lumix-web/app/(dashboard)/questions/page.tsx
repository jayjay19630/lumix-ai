"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Upload, Search } from "lucide-react";
import { cn, getDifficultyColor } from "@/lib/utils";
import { UploadModal } from "@/components/questions/UploadModal";
import { QuestionDetailModal } from "@/components/questions/QuestionDetailModal";
import type { Question } from "@/lib/types";

// Mock data fallback
const mockQuestions = [
  {
    question_id: "1",
    text: "Solve for x: 2x² + 5x - 3 = 0",
    topic: "Quadratic Equations",
    difficulty: "Medium" as const,
    source: "2023 Midterm Exam",
    times_used: 12,
    success_rate: 68,
  },
  {
    question_id: "2",
    text: "Find the value of sin(45°) + cos(45°)",
    topic: "Trigonometry",
    difficulty: "Easy" as const,
    source: "Practice Set A",
    times_used: 25,
    success_rate: 85,
  },
  {
    question_id: "3",
    text: "Prove that the sum of angles in a triangle equals 180°",
    topic: "Geometry",
    difficulty: "Hard" as const,
    source: "2024 Final Exam",
    times_used: 8,
    success_rate: 45,
  },
  {
    question_id: "4",
    text: "Simplify: 3x + 2y - 5x + 4y",
    topic: "Linear Equations",
    difficulty: "Easy" as const,
    source: "Homework Set 3",
    times_used: 18,
    success_rate: 92,
  },
  {
    question_id: "5",
    text: "Find the derivative of f(x) = 3x³ - 2x² + 5x - 1",
    topic: "Functions",
    difficulty: "Medium" as const,
    source: "Practice Set B",
    times_used: 14,
    success_rate: 72,
  },
  {
    question_id: "6",
    text: "Calculate the area of a circle with radius 7cm",
    topic: "Geometry",
    difficulty: "Easy" as const,
    source: "Quiz 2",
    times_used: 22,
    success_rate: 88,
  },
];

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  // Fetch questions from API
  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/questions");
      const data = await response.json();

      if (data.success && data.data.questions) {
        setQuestions(data.data.questions);
      } else {
        // Use mock data as fallback
        setQuestions(mockQuestions as Question[]);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      // Use mock data as fallback
      setQuestions(mockQuestions as Question[]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = (data: unknown) => {
    const result = data as { questionCount?: number };
    const count = result?.questionCount || 0;
    console.log(`Upload complete: ${count} questions added`);
    // Refresh questions list
    fetchQuestions();
  };

  const handleQuestionClick = (question: Question) => {
    setSelectedQuestion(question);
    setDetailModalOpen(true);
  };

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.text
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesTopic = !topicFilter || q.topic === topicFilter;
    const matchesDifficulty =
      !difficultyFilter || q.difficulty === difficultyFilter;
    return matchesSearch && matchesTopic && matchesDifficulty;
  });

  const topics = Array.from(new Set(questions.map((q) => q.topic)));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-gray-500 mt-1">
            Manage and organize your teaching questions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUploadModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Paper
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Topics</option>
              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">Loading questions...</div>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">
              {questions.length === 0
                ? "No questions yet. Upload a paper to get started!"
                : "No questions match your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((question) => (
            <Card
              key={question.question_id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleQuestionClick(question)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          getDifficultyColor(question.difficulty),
                        )}
                      >
                        {question.difficulty}
                      </span>
                      <span className="text-xs text-gray-500">
                        {question.topic}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {question.source}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 font-medium">
                      {question.text}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xs text-gray-500">
                      Used: {question.times_used} times
                    </div>
                    <div className="text-xs text-gray-500">
                      Success: {question.success_rate}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      <QuestionDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        question={selectedQuestion}
      />
    </div>
  );
}
