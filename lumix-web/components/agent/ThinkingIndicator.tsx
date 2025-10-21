"use client";

import { Loader2, Sparkles } from "lucide-react";

interface ThinkingIndicatorProps {
  action?: string;
}

export function ThinkingIndicator({ action }: ThinkingIndicatorProps) {
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
        <Sparkles className="w-5 h-5 text-white" />
      </div>

      {/* Thinking animation */}
      <div className="flex flex-col gap-2">
        <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          <span className="text-gray-700">
            {action || "Thinking..."}
          </span>
        </div>
      </div>
    </div>
  );
}
