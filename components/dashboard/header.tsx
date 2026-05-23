"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Menu, Sun, Moon, LogIn, LogOut, User, LayoutDashboard, Settings, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
import { NotificationPopover } from "@/components/dashboard/notification-popover";
import { SearchCommand } from "@/components/dashboard/search-command";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
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

  // Compute display name and initials
  const displayName = isAuthenticated
    ? user?.full_name || user?.username || "User"
    : "Guest";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

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
          <h1 className="text-lg font-semibold text-foreground">Welcome back, {displayName}!</h1>
          <p className="text-sm text-muted-foreground">Let&apos;s continue your JEE preparation</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Unified Search Command Palette Trigger */}
        <Button
          variant="outline"
          className="relative h-9 w-64 justify-start bg-secondary/50 border-border text-muted-foreground text-sm hidden sm:flex"
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
        <NotificationPopover userId={isAuthenticated && user ? user.username : "default_student"} />

        {/* User Avatar with Dropdown Menu */}
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative h-9 w-9 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-transform hover:scale-105 active:scale-95"
                aria-label="User menu"
              >
                <Avatar className="h-9 w-9 border-2 border-primary/50 cursor-pointer">
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 backdrop-blur-xl bg-popover/95 border-border/50 shadow-xl shadow-black/10 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
              sideOffset={8}
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {user?.full_name || user?.username}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/profile")}
                className="cursor-pointer gap-2"
              >
                <User className="h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/")}
                className="cursor-pointer gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="cursor-pointer gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="cursor-pointer gap-2"
              >
                <Palette className="h-4 w-4" />
                {mounted && theme === "dark" ? "Light Mode" : "Dark Mode"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/login")}
            className="gap-2 h-9 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        )}
      </div>

      {/* Global Search Command Dialog Palette */}
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
