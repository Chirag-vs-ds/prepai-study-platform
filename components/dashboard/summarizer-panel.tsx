"use client";

import { useState, useEffect } from "react";
import { MarkdownRenderer, formatInlineStyles } from "@/lib/markdown-renderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, BookOpen, ListChecks, Award, RefreshCw, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";



import { api } from "@/lib/api";

export function SummarizerPanel({
  activeFilename = null,
  activeOriginalName = null,
}: {
  activeFilename?: string | null;
  activeOriginalName?: string | null;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    summary: string;
    keyPoints: string[];
    source: string;
  } | null>(null);
  
  const [activeTab, setActiveTab] = useState<"overview" | "detailed" | "keypoints">("overview");

  // Reset summary if the active filename changes
  useEffect(() => {
    setSummaryData(null);
  }, [activeFilename]);

  const handleGenerateSummary = async () => {
    if (!activeFilename) return;
    setIsLoading(true);
    try {
      const data = await api.generateSummary({ filename: activeFilename });
      if (data.success) {
        setSummaryData({
          summary: data.summary,
          keyPoints: data.key_points || data.keyPoints || [],
          source: data.source || "Gemini"
        });
        setActiveTab("overview");
      } else {
        throw new Error("Failed to generate summary");
      }
    } catch (err: any) {
      console.error("Summarization error:", err);
      alert(err.message || "Failed to summarize textbook content. Please verify backend is active at http://localhost:8000.");
    } finally {
      setIsLoading(false);
    }
  };

  // Extract Short Summary vs Detailed Summary from the markdown text content
  const getOverviewSummary = () => {
    if (!summaryData) return "";
    const lines = summaryData.summary.split("\n");
    const overviewLines: string[] = [];
    let capture = false;
    
    for (const line of lines) {
      if (line.includes("Short Summary")) {
        capture = true;
        continue;
      }
      if (line.includes("Detailed Summary")) {
        capture = false;
        break;
      }
      if (capture) {
        overviewLines.push(line);
      }
    }
    
    const overviewText = overviewLines.join("\n").trim();
    return overviewText || summaryData.summary; // Fallback to full text if parsing misses
  };

  const getDetailedSummary = () => {
    if (!summaryData) return "";
    const lines = summaryData.summary.split("\n");
    const detailedLines: string[] = [];
    let capture = false;
    
    for (const line of lines) {
      if (line.includes("Detailed Summary")) {
        capture = true;
        continue;
      }
      if (capture) {
        detailedLines.push(line);
      }
    }
    
    const detailedText = detailedLines.join("\n").trim();
    return detailedText || summaryData.summary;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-semibold text-card-foreground">AI Textbook Summarizer</CardTitle>
            <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/30">
              <Sparkles className="mr-1 h-3 w-3" />
              Syllabus Digest
            </Badge>
          </div>
          
          <div className="flex items-center">
            {activeFilename ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                📚 active workspace: {activeOriginalName}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-muted-foreground text-xs">
                No active document
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <div className="relative">
              <RefreshCw className="h-10 w-10 text-primary animate-spin" />
              <FileText className="absolute top-2.5 left-2.5 h-5 w-5 text-primary/70 animate-pulse" />
            </div>
            <h4 className="text-sm font-bold text-card-foreground">Generating Conceptual Summary...</h4>
            <p className="text-xs text-muted-foreground text-center max-w-sm leading-relaxed">
              Gemini is reviewing textbook sections and extracting high-yield exam takeaways.
            </p>
          </div>
        )}

        {/* Generate summary CTA */}
        {!isLoading && !summaryData && (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground border border-border">
              <FileText className="h-6 w-6" />
            </div>
            {activeFilename ? (
              <>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-card-foreground">Generate Study Guide & Cheat Sheets</h4>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Instantly extract a conceptual summary, detailed lecture notes, and a list of core formulas/theorems from <strong>"{activeOriginalName}"</strong>.
                  </p>
                </div>
                <Button onClick={handleGenerateSummary} className="text-xs">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Summarize Chapter
                </Button>
              </>
            ) : (
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-card-foreground">No Workspace Selected</h4>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Upload a study guide PDF under "Study Materials" and click the <strong>Eye (View)</strong> icon to activate summaries.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Display Summary Tabs */}
        {!isLoading && summaryData && (
          <div className="space-y-4">
            {/* Tabs Header */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-medium border-b-2 transition-colors -mb-[2px]",
                  activeTab === "overview"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-card-foreground"
                )}
              >
                <BookOpen className="h-4 w-4" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab("detailed")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-medium border-b-2 transition-colors -mb-[2px]",
                  activeTab === "detailed"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-card-foreground"
                )}
              >
                <FileText className="h-4 w-4" />
                Detailed Notes
              </button>
              <button
                onClick={() => setActiveTab("keypoints")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-medium border-b-2 transition-colors -mb-[2px]",
                  activeTab === "keypoints"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-card-foreground"
                )}
              >
                <KeyRound className="h-4 w-4" />
                Exam Takeaways
              </button>
            </div>

            {/* Tab content boxes */}
            <div className="rounded-lg border border-primary/10 bg-primary/5 p-4 md:p-5 max-h-[350px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-3">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                  {activeTab === "overview" && "Conceptual Synopsis"}
                  {activeTab === "detailed" && "Detailed Chapter Notes"}
                  {activeTab === "keypoints" && "High-Yield Takeaways"}
                </span>
                <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">
                  Engine: {summaryData.source}
                </Badge>
              </div>

              {activeTab === "overview" && (
                <MarkdownRenderer content={getOverviewSummary()} />
              )}

              {activeTab === "detailed" && (
                <MarkdownRenderer content={getDetailedSummary()} />
              )}

              {activeTab === "keypoints" && (
                <div className="space-y-3">
                  {summaryData.keyPoints.length > 0 ? (
                    <ul className="space-y-2">
                      {summaryData.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex gap-2.5 items-start">
                          <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold shrink-0 mt-0.5">
                            {idx + 1}
                          </Badge>
                          <span 
                            className="text-xs md:text-sm text-muted-foreground leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: formatInlineStyles(point) }}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No key points extracted.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
