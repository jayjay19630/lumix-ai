"use client";

import { Modal } from "@/components/ui/Modal";
import { Card, CardContent } from "@/components/ui/Card";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { GradingResult } from "@/lib/types";

interface GradingResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  gradingResult: GradingResult;
  studentName: string;
  date: string;
}

export function GradingResultModal({
  isOpen,
  onClose,
  gradingResult,
  studentName,
  date,
}: GradingResultModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Grading Results" >
      <div className="space-y-6">
  
        {/* AI Insights */}
        {gradingResult.insights && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    AI Insights
                  </h4>
                  <p className="text-sm text-gray-600">
                    {gradingResult.insights}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weaknesses */}
        {gradingResult.weaknesses.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Areas to Improve</h4>
            <div className="flex flex-wrap gap-2">
              {gradingResult.weaknesses.map((weakness, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full"
                >
                  {weakness}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Question Results */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Question-by-Question Results
          </h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {gradingResult.question_results.map((result, index) => (
              <Card
                key={result.question_id}
                className={`border-l-4 ${
                  result.is_correct
                    ? "border-l-green-500 bg-green-50"
                    : "border-l-red-500 bg-red-50"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        Question {index + 1}
                      </span>
                      <span className="text-xs px-2 py-1 bg-white rounded">
                        {result.topic}
                      </span>
                    </div>
                    {result.is_correct ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>

                  <p className="text-sm text-gray-700 mb-2">
                    {result.question_text}
                  </p>

                  <div className="space-y-1 text-sm">
                    {result.student_answer && (
                      <div>
                        <span className="font-medium text-gray-700">
                          Student answer:{" "}
                        </span>
                        <span className="text-gray-600">
                          {result.student_answer}
                        </span>
                      </div>
                    )}
                    {!result.is_correct && result.correct_answer && (
                      <div>
                        <span className="font-medium text-gray-700">
                          Correct answer:{" "}
                        </span>
                        <span className="text-green-700">
                          {result.correct_answer}
                        </span>
                      </div>
                    )}
                    {result.feedback && (
                      <div className="mt-2 p-2 bg-white rounded text-gray-600">
                        {result.feedback}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
