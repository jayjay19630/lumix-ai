"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MessageBubble } from "./MessageBubble";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { ActionTrace } from "./ActionTrace";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  actionTraces?: Array<{
    tool: string;
    input?: Record<string, unknown>;
    output?: unknown;
  }>;
  sources?: Array<{ title: string; url: string }>;
  worksheets?: Array<{
    worksheet_id: string;
    title: string;
    topics: string[];
    question_count: number;
    pdf_url: string;
    created_at: string;
  }>;
}

export function AgentSidebar() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! Need help with anything?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          conversation_id: conversationId,
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.data.response,
          timestamp: new Date().toISOString(),
          actionTraces: data.data.action_traces || [],
          sources: data.data.sources || [],
          worksheets: data.data.worksheets || [],
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (data.data.conversation_id) {
          setConversationId(data.data.conversation_id);
        }

        // If worksheets were created, show success message
        if (data.data.worksheets && data.data.worksheets.length > 0) {
          toast.success(`Created ${data.data.worksheets.length} worksheet(s)!`);
        }
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to get response from AI assistant");

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-white border-l border-gray-200 transition-all duration-300",
        isCollapsed ? "w-12" : "w-80"
      )}
    >
      {/* Collapse button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-3 top-20 z-10 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 shadow-sm"
        aria-label={isCollapsed ? "Expand AI assistant" : "Collapse AI assistant"}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-3 h-3 text-gray-600" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-600" />
        )}
      </button>

      {isCollapsed ? (
        /* Collapsed state - just the icon */
        <div className="flex flex-col items-center pt-4">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center hover:shadow-lg transition-shadow"
            aria-label="Open AI assistant"
          >
            <Sparkles className="w-5 h-5 text-white" />
          </button>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex h-16 items-center gap-2 px-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">AI Assistant</h2>
              <p className="text-xs text-gray-500">Always here to help</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                {message.actionTraces && message.actionTraces.length > 0 && (
                  <ActionTrace actions={message.actionTraces} />
                )}
                <MessageBubble
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  sources={message.sources}
                />
              </div>
            ))}

            {isLoading && <ThinkingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
