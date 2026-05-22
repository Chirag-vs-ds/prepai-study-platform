"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, ChevronRight, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { FocusArea, fetchFocusAreas } from "@/lib/api";

const subjectColors: Record<string, string> = {
  Physics: "text-primary",
  Chemistry: "text-chart-4",
  Mathematics: "text-chart-5",
  Biology: "text-accent",
  General: "text-muted-foreground"
};

function getAccuracyColor(accuracy: number) {
  if (accuracy < 50) return "bg-destructive";
  if (accuracy <= 70) return "bg-orange-500";
  return "bg-green-500";
}

function getAccuracyTextColor(accuracy: number) {
  if (accuracy < 50) return "text-destructive";
  if (accuracy <= 70) return "text-orange-500";
  return "text-green-500";
}

export function WeakTopics() {
  const [topics, setTopics] = useState<FocusArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchFocusAreas();
        setTopics(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch focus areas:", err);
        setError("Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Generate dynamic recommendation text based on the weakest topics
  const getRecommendation = () => {
    if (topics.length === 0) return "Keep taking quizzes to generate AI recommendations.";
    const weak = topics.filter(t => t.accuracy < 70).slice(0, 2);
    if (weak.length === 0) return "You're doing great! Keep practicing across all topics to maintain high accuracy.";
    const topicNames = weak.map(t => t.topic).join(" and ");
    return `Focus on ${topicNames} this week. Practice 20 questions daily for best results.`;
  };

  return (
    <Card className="bg-card border-border h-full flex flex-col transition-all duration-300 hover:shadow-md hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/20 transition-transform duration-300 hover:scale-105">
              <AlertTriangle className="h-5 w-5 text-chart-3" />
            </div>
            <CardTitle className="text-lg font-semibold text-card-foreground">Focus Areas</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary transition-colors">
            View All
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 flex-1">
        {/* AI Suggestion */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 transition-colors hover:bg-primary/10">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0 animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-card-foreground">AI Recommendation</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {loading ? "Generating recommendations..." : getRecommendation()}
              </p>
            </div>
          </div>
        </div>

        {/* Topics List */}
        <div className="space-y-4">
          {loading ? (
            // Skeleton Loaders
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-secondary/20 p-4 animate-pulse">
                <div className="h-4 w-3/4 bg-secondary/50 rounded mb-2"></div>
                <div className="h-3 w-1/4 bg-secondary/50 rounded mb-4"></div>
                <div className="h-2 w-full bg-secondary/50 rounded mb-2"></div>
                <div className="h-3 w-1/3 bg-secondary/50 rounded"></div>
              </div>
            ))
          ) : error ? (
            <div className="text-center py-6 text-sm text-destructive">
              {error}
              <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <AlertTriangle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-card-foreground">No weak topics detected</p>
              <p className="text-xs text-muted-foreground mt-1">Take more quizzes to see your analytics.</p>
            </div>
          ) : (
            topics.slice(0, 4).map((topic, i) => {
              const trend = topic.accuracy - topic.previousAccuracy;
              const isPositive = trend >= 0;

              return (
                <div
                  key={i}
                  className="rounded-xl bg-secondary/30 p-4 transition-all duration-300 hover:bg-secondary/60 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-card-foreground">{topic.topic}</h4>
                      <p className={cn("text-xs font-medium mt-0.5", subjectColors[topic.subject] || subjectColors.General)}>
                        {topic.subject}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md",
                        trend > 0 ? "text-green-500 bg-green-500/10" : 
                        trend < 0 ? "text-red-500 bg-red-500/10" : "text-muted-foreground bg-secondary"
                      )}
                    >
                      <TrendingUp
                        className={cn(
                          "h-3 w-3",
                          trend < 0 && "rotate-180",
                          trend === 0 && "rotate-90 text-muted-foreground"
                        )}
                      />
                      {trend > 0 ? "+" : ""}
                      {trend}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span className={getAccuracyTextColor(topic.accuracy)}>
                        {topic.accuracy}%
                      </span>
                    </div>
                    <Progress
                      value={topic.accuracy}
                      className="h-2 bg-secondary"
                      indicatorClassName={getAccuracyColor(topic.accuracy)}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-muted-foreground">
                        {topic.attempted} questions attempted
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                    onClick={() => {
                      const section = document.getElementById("quizzes");
                      if (section) {
                        section.scrollIntoView({ behavior: "smooth" });
                        // Add a subtle highlight effect to the quizzes section
                        section.classList.add("ring-2", "ring-primary", "ring-offset-2", "rounded-xl", "transition-all", "duration-500");
                        setTimeout(() => {
                          section.classList.remove("ring-2", "ring-primary", "ring-offset-2");
                        }, 2000);
                      }
                    }}
                  >
                    Practice Now
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
