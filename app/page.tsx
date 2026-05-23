"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { AnalyticsCards } from "@/components/dashboard/analytics-cards";
import { QuizSection } from "@/components/dashboard/quiz-section";
import { DoubtSolver } from "@/components/dashboard/doubt-solver";
import { PDFUpload } from "@/components/dashboard/pdf-upload";
import { WeakTopics } from "@/components/dashboard/weak-topics";
import { SummarizerPanel } from "@/components/dashboard/summarizer-panel";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ErrorBoundary } from "@/components/error-boundary";
import { Flame, Zap, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { navItems } from "@/lib/nav-config";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const userId = isAuthenticated && user ? user.username : "default_student";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Shared States for PDF RAG and dynamic analytics re-fetching
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [activeOriginalName, setActiveOriginalName] = useState<string | null>(null);
  const [analyticsTrigger, setAnalyticsTrigger] = useState<number>(0);
  const [currentStreak, setCurrentStreak] = useState<number>(7); // Default to a motivated 7 until loaded
  const [activeHash, setActiveHash] = useState("#dashboard");

  // Track active window location hash
  useEffect(() => {
    if (typeof window !== "undefined") {
      setActiveHash(window.location.hash || "#dashboard");
    }
    const handleHash = () => {
      setActiveHash(window.location.hash || "#dashboard");
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Listen to custom selection event from Search Palette
  useEffect(() => {
    const handlePdfChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ filename: string; originalName: string }>;
      if (customEvent.detail) {
        setActiveFilename(customEvent.detail.filename);
        setActiveOriginalName(customEvent.detail.originalName);
      }
    };
    window.addEventListener("select-active-pdf", handlePdfChange);
    return () => window.removeEventListener("select-active-pdf", handlePdfChange);
  }, []);

  // Fetch the daily streak dynamically from the database to sync the sidebars!
  useEffect(() => {
    api.getAnalytics(userId)
      .then((data) => {
        if (data.success && data.metrics) {
          setCurrentStreak(data.metrics.current_streak);
        }
      })
      .catch((err) => console.error("Error fetching streak count:", err));
  }, [analyticsTrigger, userId]);

  const triggerRefresh = () => {
    setAnalyticsTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar (renders dynamic streaks!) */}
      <div className="hidden lg:block">
        <Sidebar streak={currentStreak} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center gap-2 px-4 border-b border-sidebar-border">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-sidebar-foreground">PrepAI</span>
            </div>

            {/* Streak Banner */}
            <div className="mx-3 mt-4 rounded-lg bg-accent/10 p-3 border border-accent/20">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-sidebar-foreground">{currentStreak} Day Streak!</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Keep going! You&apos;re on fire!</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4">
              {navItems.map((item) => {
                const isActive = item.href === activeHash;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => {
                      setSidebarOpen(false);
                      window.location.hash = item.href;
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>

            {/* Help */}
            <div className="border-t border-sidebar-border p-3">
              <a
                href="#help"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              >
                <HelpCircle className="h-5 w-5 flex-shrink-0" />
                <span>Help & Support</span>
              </a>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="p-4 lg:p-6 space-y-6">
          {/* Analytics Cards (re-fetches dynamically!) */}
          <section id="dashboard">
            <ErrorBoundary>
              <AnalyticsCards trigger={analyticsTrigger} userId={userId} />
            </ErrorBoundary>
          </section>

          {/* Main Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Quiz & Doubt Solver */}
            <div className="lg:col-span-2 space-y-6">
              <section id="quizzes">
                <ErrorBoundary>
                  <QuizSection 
                    activeFilename={activeFilename}
                    activeOriginalName={activeOriginalName}
                    onQuizAttempt={triggerRefresh} 
                    userId={userId}
                  />
                </ErrorBoundary>
              </section>
              <section id="doubt-solver">
                <ErrorBoundary>
                  <DoubtSolver 
                    activeFilename={activeFilename} 
                    activeOriginalName={activeOriginalName}
                    onSessionLogged={triggerRefresh}
                    userId={userId}
                  />
                </ErrorBoundary>
              </section>
              <section id="summarizer">
                <ErrorBoundary>
                  <SummarizerPanel 
                    activeFilename={activeFilename} 
                    activeOriginalName={activeOriginalName}
                  />
                </ErrorBoundary>
              </section>
            </div>

            {/* Right Column - PDF Upload & Weak Topics */}
            <div className="space-y-6">
              <div id="materials">
                <ErrorBoundary>
                  <PDFUpload 
                    activeFilename={activeFilename}
                    onActiveFileChange={(fn, org) => {
                      setActiveFilename(fn);
                      setActiveOriginalName(org);
                    }}
                    onUploadSuccess={triggerRefresh}
                  />
                </ErrorBoundary>
              </div>

              <section id="analytics">
                <ErrorBoundary>
                  <WeakTopics userId={userId} />
                </ErrorBoundary>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


