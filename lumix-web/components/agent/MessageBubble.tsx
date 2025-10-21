"use client";

import { cn } from "@/lib/utils";
import { User, Sparkles } from "lucide-react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  sources?: Array<{ title: string; url: string }>;
}

export function MessageBubble({ role, content, timestamp, sources }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-indigo-600" : "bg-gradient-to-br from-indigo-500 to-purple-600"
        )}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Sparkles className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start", "flex-1 max-w-[85%]")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
            isUser
              ? "bg-indigo-600 text-white rounded-tr-sm"
              : "bg-gray-100 text-gray-900 rounded-tl-sm"
          )}
        >
          {content}
        </div>

        {/* Sources */}
        {sources && sources.length > 0 && (
          <div className="flex flex-col gap-1 text-xs">
            {sources.map((source, idx) => (
              <a
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                {source.title}
              </a>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {timestamp && (
          <span className="text-xs text-gray-400">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
