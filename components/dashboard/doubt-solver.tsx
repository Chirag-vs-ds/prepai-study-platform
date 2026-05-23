"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Send, Sparkles, Image as ImageIcon, Mic, History, Copy, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const subjectColors: Record<string, string> = {
  Physics: "bg-primary/20 text-primary",
  Chemistry: "bg-chart-4/20 text-chart-4",
  Mathematics: "bg-chart-5/20 text-chart-5",
  Biology: "bg-accent/20 text-accent",
};

const formatRelativeTime = (isoString: string) => {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch (e) {
    return "Recently";
  }
};

import { MarkdownRenderer } from "@/lib/markdown-renderer";
import { api } from "@/lib/api";
import { useEffect } from "react";

export function DoubtSolver({
  activeFilename = null,
  activeOriginalName = null,
  onSessionLogged,
  userId = "default_student",
}: {
  activeFilename?: string | null;
  activeOriginalName?: string | null;
  onSessionLogged?: () => void;
  userId?: string;
}) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerSource, setAnswerSource] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [references, setReferences] = useState<any[]>([]);
  const [recentDoubts, setRecentDoubts] = useState<any[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDoubtHistory = () => {
    api.getDoubtHistory(userId)
      .then((data) => {
        if (data.success && data.history) {
          setRecentDoubts(data.history);
        }
      })
      .catch((err) => console.error("Error fetching doubt history:", err));
  };

  useEffect(() => {
    fetchDoubtHistory();
  }, [userId]);

  useEffect(() => {
    const handlePastDoubt = (e: Event) => {
      const customEvent = e as CustomEvent<{ question: string; subject: string }>;
      if (customEvent.detail && customEvent.detail.question) {
        setQuery(customEvent.detail.question);
      }
    };
    window.addEventListener("select-past-doubt", handlePastDoubt);
    return () => window.removeEventListener("select-past-doubt", handlePastDoubt);
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Voice input. Please use Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      setImageMime(file.type);
    };
    reader.readAsDataURL(file);
    
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const solveDoubt = async (questionText: string) => {
    if (!questionText.trim()) return;
    setIsLoading(true);
    setAnswer(null);
    setAnswerSource(null);
    setReferences([]);

    try {
      const payload = {
        question: questionText,
        image_data: selectedImage,
        image_mime: imageMime,
        filename: activeFilename,
        k: 3
      };

      const data = activeFilename
        ? await api.solveDoubtPdf(payload)
        : await api.solveDoubt(payload);

      if (data.success) {
        setAnswer(data.answer);
        setAnswerSource(data.source || (activeFilename ? "RAG Document Search" : "AI Solver"));
        if (data.references) {
          setReferences(data.references);
        }

        fetchDoubtHistory();

        // BACKGROUND PROGRESS: Log a 2-minute study session to dynamically increase their study hour cards!
        api.logStudySession({
          subject: activeFilename ? "PDF Analysis" : "Doubt Solving",
          minutes: 2,
          user_id: userId
        })
        .then((sData) => {
          if (sData.success && onSessionLogged) {
            onSessionLogged(); // Refresh dashboard cards!
          }
        })
        .catch((sErr) => console.warn("Could not log background study metrics:", sErr));

      } else {
        throw new Error("Failed to get response");
      }
    } catch (error) {
      console.error("Error solving doubt:", error);
      setAnswer(
        "### ❌ Connection Error\n\nCould not connect to the PrepAI doubt solving server. " +
        "Please check if the FastAPI backend is running locally!\n\n" +
        "You can run the backend using: `python main.py` inside the `backend` folder."
      );
      setAnswerSource("System Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    solveDoubt(query);
  };

  const handleCopy = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-semibold text-card-foreground">AI Doubt Solver</CardTitle>
            <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/30">
              <Sparkles className="mr-1 h-3 w-3" />
              Powered by AI
            </Badge>
          </div>
          
          {/* Glowing workspace mode badge */}
          <div className="flex items-center">
            {activeFilename ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse text-xs">
                💬 Active PDF: {activeOriginalName}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-muted-foreground text-xs">
                🤖 General AI Mode
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Area */}
        <div className="space-y-3">
          {selectedImage && (
            <div className="relative mb-2 inline-block animate-fadeIn">
              <img src={selectedImage} alt="Attached Preview" className="h-20 w-auto rounded border border-border" />
              <button 
                onClick={() => { setSelectedImage(null); setImageMime(null); }}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:scale-110 transition-transform"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <Textarea
            placeholder={
              activeFilename 
                ? `Ask any question grounded within "${activeOriginalName}"...` 
                : "Ask any doubt related to JEE/NEET syllabus... E.g., Explain the concept of electromagnetic induction"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[100px] resize-none bg-secondary/50 border-border focus:border-primary text-sm"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleImageUpload} 
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="text-muted-foreground text-xs hover:text-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="mr-1 h-4 w-4" />
                Image
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "text-xs transition-colors", 
                  isRecording ? "bg-red-500/10 text-red-500 border-red-500/30" : "text-muted-foreground hover:text-primary"
                )}
                onClick={toggleRecording}
              >
                <Mic className={cn("mr-1 h-4 w-4", isRecording && "animate-pulse")} />
                {isRecording ? "Listening..." : "Voice"}
              </Button>
            </div>
            <Button 
              onClick={handleSubmit} 
              disabled={!query.trim() || isLoading}
              className="w-full sm:w-auto text-xs"
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Thinking...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Ask Doubt
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Dynamic AI Answer Box */}
        {isLoading && (
          <div className="rounded-lg border border-border bg-secondary/10 p-5 space-y-3 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-primary/30 rounded-full animate-bounce" />
              <div className="h-4 w-28 bg-muted rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-muted/60 rounded" />
              <div className="h-3 w-[90%] bg-muted/60 rounded" />
              <div className="h-3 w-[70%] bg-muted/60 rounded" />
            </div>
          </div>
        )}

        {answer && (
          <div className="relative rounded-lg border border-primary/20 bg-primary/5 p-4 md:p-5 transition-all animate-fadeIn">
            {/* Header / Badges */}
            <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Explanations</span>
                {answerSource && (
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                    Source: {answerSource}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {/* Answer Content */}
            <div className="max-h-[300px] overflow-y-auto pr-1">
              <MarkdownRenderer content={answer} />
            </div>

            {/* Citations references mapping for RAG */}
            {references && references.length > 0 && (
              <div className="mt-4 border-t border-border/40 pt-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Retrieved References</span>
                <div className="mt-2 space-y-2">
                  {references.map((ref, idx) => (
                    <div key={idx} className="rounded bg-secondary/30 p-2 text-xs border border-border/30">
                      <div className="flex items-center justify-between text-[10px] text-primary mb-1">
                        <span>Source Passage {idx + 1}</span>
                        <span className="font-mono">Match: {Math.round(ref.match_score * 100)}%</span>
                      </div>
                      <p className="text-muted-foreground italic text-xs">&ldquo;{ref.content}&rdquo;</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}


        {/* Recent Doubts */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-muted-foreground">Recent Questions</h4>
          </div>
          <div className="space-y-2">
            {recentDoubts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-1">No solved doubts yet. Ask a question above to get started!</p>
            ) : (
              recentDoubts.map((doubt) => (
                <button
                  key={doubt.id}
                  onClick={() => {
                    setQuery(doubt.question);
                    solveDoubt(doubt.question);
                  }}
                  className="w-full flex items-center justify-between rounded-lg bg-secondary/30 p-3 text-left transition-colors hover:bg-secondary/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-card-foreground truncate">{doubt.question}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="secondary" className={cn("text-xs", subjectColors[doubt.subject] || "bg-secondary/25 text-secondary-foreground")}>
                        {doubt.subject}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(doubt.created_at)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

