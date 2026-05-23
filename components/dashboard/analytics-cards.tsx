"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, BookOpen, Clock, Target, Award, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export function AnalyticsCards({ trigger = 0, userId = "default_student" }: { trigger?: number; userId?: string }) {
  const [metrics, setMetrics] = useState({
    study_time_minutes: 370,
    study_time_hours: 6.2,
    quizzes_completed: 4,
    avg_quiz_score: 87.5,
    current_streak: 7,
    longest_streak: 12
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    api.getAnalytics(userId)
      .then((data) => {
        if (data.success && data.metrics) {
          setMetrics(data.metrics);
          setIsError(false);
        }
      })
      .catch((err) => {
        console.warn("Analytics Endpoint Offline. Defaulting to local mockup caches:", err);
        setIsError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [trigger, userId]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-card border-border animate-pulse">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-9 w-9 bg-muted rounded-lg" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
              <div className="space-y-2 mt-2">
                <div className="h-6 w-20 bg-muted rounded" />
                <div className="h-4 w-28 bg-muted/60 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: "Practice Quizzes",
      value: metrics.quizzes_completed.toString(),
      change: "+1 new",
      trend: "up" as const,
      icon: BookOpen,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Study Time",
      value: `${metrics.study_time_hours}h`,
      change: "+0.8h today",
      trend: "up" as const,
      icon: Clock,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Average Score",
      value: `${metrics.avg_quiz_score}%`,
      change: "+2.5% rise",
      trend: "up" as const,
      icon: Target,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      title: "Daily Consistency",
      value: `${metrics.current_streak} Day Streak`,
      change: `PB: ${metrics.longest_streak}d`,
      trend: "up" as const,
      icon: Award,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
  ];

  return (
    <div className="space-y-3">
      {isError && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 border border-amber-500/20 text-amber-400 text-xs">
          <AlertCircle className="h-4 w-4" />
          <span>Backend offline. Showing local backup demo metrics. Start python server with <code>python main.py</code> to connect real data.</span>
        </div>
      )}
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-card border-border hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className={cn("rounded-lg p-2", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-accent">
                  <TrendingUp className="h-3 w-3" />
                  {stat.change}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
