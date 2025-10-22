"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Search, Database, FileText, Calendar, Plus } from "lucide-react";

interface ActionTraceProps {
  actions: Array<{
    tool: string;
    input?: Record<string, unknown>;
    output?: unknown;
  }>;
}

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  query_students: Database,
  query_grade_history: FileText,
  query_questions: Search,
  generate_worksheet: FileText,
  generate_lesson_plan: FileText,
  get_schedule: Calendar,
  create_session: Plus,
};

const TOOL_LABELS: Record<string, string> = {
  query_students: "Queried student data",
  query_grade_history: "Analyzed grade history",
  query_questions: "Searched question bank",
  generate_worksheet: "Generated worksheet",
  generate_lesson_plan: "Created lesson plan",
  get_schedule: "Retrieved schedule",
  create_session: "Added new session",
};

export function ActionTrace({ actions }: ActionTraceProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!actions || actions.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <span className="font-medium">
          {actions.length} tool{actions.length !== 1 ? 's' : ''} used
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 ml-5 space-y-2">
          {actions.map((action, idx) => {
            const Icon = TOOL_ICONS[action.tool] || Database;
            const label = TOOL_LABELS[action.tool] || action.tool;

            return (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs bg-gray-50 rounded-lg p-2"
              >
                <Icon className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{label}</div>
                  {action.input && Object.keys(action.input).length > 0 && (
                    <div className="mt-1 text-gray-600">
                      {Object.entries(action.input)
                        .filter(([, value]) => value !== null && value !== undefined)
                        .map(([key, value]) => (
                          <div key={key} className="truncate">
                            <span className="text-gray-500">{key}:</span> {String(value)}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
