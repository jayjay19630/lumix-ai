"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MessageBubble } from "./MessageBubble";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { ActionTrace } from "./ActionTrace";
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
}

interface AgentChatProps {
  fullScreen?: boolean;
}

export function AgentChat({ fullScreen = false }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm Lumix Assistant. I can help you analyze student performance, create lesson plans, generate worksheets, and manage your tutoring schedule. What would you like to do today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
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
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (data.data.conversation_id) {
          setConversationId(data.data.conversation_id);
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
    <div className={fullScreen ? "flex h-screen flex-col" : "flex h-full flex-col"}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Ask Lumix Anything</h1>
            <p className="text-sm text-gray-600">Your AI tutor is here to explain, plan, and guide — one chat at a time.</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-white">
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
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about students, create lesson plans, generate worksheets..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6"
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </form>
        <p className="mt-2 text-xs text-gray-500 text-center">
          Lumix AI can analyze performance, create lessons, and manage schedules
        </p>
      </div>
    </div>
  );
}
