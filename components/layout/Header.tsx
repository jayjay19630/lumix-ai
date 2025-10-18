"use client";

import { Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Header() {
  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      {/* Left side - could add breadcrumbs or page title */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Welcome to Lumix
        </h2>
      </div>

      {/* Right side - actions */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
