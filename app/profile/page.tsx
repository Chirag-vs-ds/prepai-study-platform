"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Zap,
  Flame,
  BookOpen,
  Brain,
  Trophy,
  Calendar,
  Settings,
} from "lucide-react";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    studyHours: 0,
    quizzes: 0,
    avgScore: 0,
    streak: 0,
    longestStreak: 0,
  });

  useEffect(() => {
    // Redirect guest users to login
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    // Fetch study stats
    api
      .getAnalytics(user?.username || "default_student")
      .then((data) => {
        if (data.success && data.metrics) {
          setStats({
            studyHours: data.metrics.study_time_hours,
            quizzes: data.metrics.quizzes_completed,
            avgScore: data.metrics.avg_quiz_score,
            streak: data.metrics.current_streak,
            longestStreak: data.metrics.longest_streak,
          });
        }
      })
      .catch(() => {});
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const initials = (user?.full_name || user?.username || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const statCards = [
    {
      label: "Study Hours",
      value: stats.studyHours.toFixed(1),
      icon: BookOpen,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Quizzes Done",
      value: stats.quizzes,
      icon: Brain,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Avg Score",
      value: `${stats.avgScore.toFixed(0)}%`,
      icon: Trophy,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Current Streak",
      value: `${stats.streak} days`,
      icon: Flame,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      label: "Longest Streak",
      value: `${stats.longestStreak} days`,
      icon: Calendar,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-4 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          className="h-9 w-9 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Profile</h1>
        </div>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/settings")}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 lg:p-8">
        {/* Profile Header Card */}
        <div className="relative backdrop-blur-sm bg-card/80 border border-border/50 rounded-2xl overflow-hidden mb-6">
          {/* Gradient Banner */}
          <div className="h-32 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/10" />

          {/* Profile Info */}
          <div className="px-6 pb-6 -mt-12">
            <Avatar className="h-24 w-24 border-4 border-card shadow-xl">
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="mt-4">
              <h2 className="text-2xl font-bold text-foreground">
                {user?.full_name || user?.username}
              </h2>
              <p className="text-muted-foreground">@{user?.username}</p>
              <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
            </div>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Study Stats Grid */}
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Study Statistics
        </h3>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="backdrop-blur-sm bg-card/80 border border-border/50 rounded-xl p-5 hover:border-primary/30 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
