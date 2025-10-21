"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Question } from "@/lib/types";
import { getDifficultyColor } from "@/lib/utils";
import { BookOpen, Lightbulb, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
}

export function QuestionDetailModal({
  isOpen,
  onClose,
  question,
}: QuestionDetailModalProps) {
  if (!question) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Question Details" size="lg">
      <div className="space-y-6">
        {/* Question Header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                getDifficultyColor(question.difficulty),
              )}
            >
              {question.difficulty}
            </span>
            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
              {question.topic}
            </span>
            <span className="text-xs text-gray-500">
              Source: {question.source}
            </span>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-base text-gray-900 leading-relaxed">
              {question.text}
            </p>
          </div>
        </div>

        {/* Explanation Section */}
        {question.explanation && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                Explanation
              </h3>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {question.explanation}
              </p>
            </div>
          </div>
        )}

        {/* Teaching Tips Section */}
        {question.teaching_tips && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                Teaching Tips
              </h3>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {question.teaching_tips}
              </p>
            </div>
          </div>
        )}

        {/* Usage Statistics */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-green-600" />
            <h3 className="text-sm font-semibold text-gray-900">
              Usage Statistics
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Times Used</p>
              <p className="text-lg font-semibold text-gray-900">
                {question.times_used}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Success Rate</p>
              <p className="text-lg font-semibold text-gray-900">
                {question.success_rate}%
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline">Generate Variant</Button>
          <Button>Add to Lesson</Button>
        </div>
      </div>
    </Modal>
  );
}
