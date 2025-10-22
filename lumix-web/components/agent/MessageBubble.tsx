"use client";

import { cn } from "@/lib/utils";
import { User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
            "rounded-2xl px-4 py-2.5 text-sm",
            isUser
              ? "bg-indigo-600 text-white rounded-tr-sm"
              : "bg-gray-100 text-gray-900 rounded-tl-sm"
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{content}</div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom styles for markdown elements
                  h1: (props) => <h1 className="text-lg font-semibold mb-2 mt-3" {...props} />,
                  h2: (props) => <h2 className="text-base font-semibold mb-2 mt-3" {...props} />,
                  h3: (props) => <h3 className="text-sm font-semibold mb-1 mt-2" {...props} />,
                  p: (props) => <p className="mb-2 leading-relaxed" {...props} />,
                  ul: (props) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                  ol: (props) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                  li: (props) => <li className="leading-relaxed" {...props} />,
                  strong: (props) => <strong className="font-semibold text-gray-900" {...props} />,
                  em: (props) => <em className="italic" {...props} />,
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-gray-200 p-2 rounded text-xs font-mono overflow-x-auto" {...props}>
                        {children}
                      </code>
                    );
                  },
                  a: (props) => (
                    <a className="text-indigo-600 hover:text-indigo-800 underline" target="_blank" rel="noopener noreferrer" {...props} />
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
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
          <span className="text-xs text-gray-400" suppressHydrationWarning>
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
