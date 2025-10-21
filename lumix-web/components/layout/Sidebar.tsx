"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  BookOpen,
  Calendar,
  FileText,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Students", href: "/students", icon: Users },
  { name: "Questions", href: "/questions", icon: BookOpen },
  { name: "Worksheets", href: "/worksheets", icon: FileText },
  { name: "Schedule", href: "/schedule", icon: Calendar },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-gray-200">
        <Sparkles className="h-8 w-8 text-indigo-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Lumix AI</h1>
          <p className="text-xs text-gray-500">Teaching brilliance</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-700 hover:bg-gray-100",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          &copy; 2025 Lumix. All rights reserved.
        </p>
      </div>
    </div>
  );
}
