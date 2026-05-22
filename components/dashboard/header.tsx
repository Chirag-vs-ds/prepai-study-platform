"use client";

import * as React from "react";
import { Search, Menu, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { NotificationPopover } from "@/components/dashboard/notification-popover";
import { SearchCommand } from "@/components/dashboard/search-command";

interface HeaderProps {
  onMenuClick?: () => void;
  username?: string;
}

export function Header({ onMenuClick, username = "Arjun" }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  // Avoid hydration mismatch by waiting until client-side mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Compute initials for avatar fallback
  const initials = username
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "AR";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden sm:block text-left">
          <h1 className="text-lg font-semibold text-foreground">Welcome back, {username}!</h1>
          <p className="text-sm text-muted-foreground">Let&apos;s continue your JEE preparation</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Unified Search Command Palette Trigger */}
        <Button
          variant="outline"
          className="relative h-9 w-64 justify-start bg-secondary/50 border-border text-muted-foreground text-sm"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>Search topics, quizzes...</span>
          <kbd className="pointer-events-none absolute right-2.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
            <span className="text-xs">Ctrl</span>K
          </kbd>
        </Button>

        {/* Dynamic Theme Toggle Button */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 rounded-full bg-secondary/50 border border-border"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-500 transition-all" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-500 transition-all" />
            )}
          </Button>
        )}

        {/* Real-time Notifications Popover */}
        <NotificationPopover />

        {/* Dynamic User Avatar */}
        <Avatar className="h-9 w-9 border-2 border-primary/50">
          <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Global Search Command Dialog Palette */}
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
