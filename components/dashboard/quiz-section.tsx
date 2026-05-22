"use client";

import { useState } from "react";
import { formatInlineStyles } from "@/lib/markdown-renderer";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Sparkles, 
  Brain, 
  RotateCcw, 
  Trophy,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

// Original mock static quizzes (used when no PDF is active)
const staticQuizzes = [
  {
    id: 1,
    title: "Physics - Mechanics",
    questions: 30,
    duration: "45 min",
    difficulty: "Medium",
    completed: false,
    subject: "Physics",
  },
  {
    id: 2,
    title: "Chemistry - Organic",
    questions: 25,
    duration: "35 min",
    difficulty: "Hard",
    completed: true,
    score: 72,
    subject: "Chemistry",
  },
  {
    id: 3,
    title: "Mathematics - Calculus",
    questions: 20,
    duration: "30 min",
    difficulty: "Easy",
    completed: false,
    subject: "Mathematics",
  },
  {
    id: 4,
    title: "Biology - Human Physiology",
    questions: 35,
    duration: "50 min",
    difficulty: "Medium",
    completed: true,
    score: 88,
    subject: "Biology",
  },
];

const difficultyColors: Record<string, string> = {
  Easy: "bg-accent/20 text-accent border-accent/30",
  Medium: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  Hard: "bg-destructive/20 text-destructive border-destructive/30",
};

const subjectColors: Record<string, string> = {
  Physics: "bg-primary/20 text-primary",
  Chemistry: "bg-chart-4/20 text-chart-4",
  Mathematics: "bg-chart-5/20 text-chart-5",
  Biology: "bg-accent/20 text-accent",
};



interface QuizQuestion {
  question: string;
  options: string[];
  answer: string; // "A", "B", "C", or "D"
  explanation: string;
}

export function QuizSection({
  activeFilename = null,
  activeOriginalName = null,
  onQuizAttempt,
}: {
  activeFilename?: string | null;
  activeOriginalName?: string | null;
  onQuizAttempt?: () => void;
}) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  
  // Quiz states
  const [quizState, setQuizState] = useState<"lobby" | "generating" | "playing" | "results">("lobby");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subjects = ["All", "Physics", "Chemistry", "Mathematics", "Biology"];
  const filteredQuizzes = selectedSubject && selectedSubject !== "All"
    ? staticQuizzes.filter((q) => q.subject === selectedSubject)
    : staticQuizzes;

  // Handles generating the quiz from FastAPI
  const handleGenerateQuiz = async () => {
    if (!activeFilename) return;
    setQuizState("generating");
    try {
      const data = await api.generateQuiz({
        filename: activeFilename,
        difficulty,
        num_questions: numQuestions
      });
      if (data.success && data.questions) {
        setQuestions(data.questions);
        setCurrentIdx(0);
        setSelectedOption(null);
        setScore(0);
        setCorrectAnswers(0);
        setQuizState("playing");
      } else {
        throw new Error(data.detail || "Failed to generate quiz");
      }
    } catch (err) {
      console.error("Quiz generation error:", err);
      alert("Failed to generate AI Quiz. Please make sure the backend is active at http://localhost:8000.");
      setQuizState("lobby");
    }
  };

  // Handles option selection
  const handleOptionSelect = (optionIdx: number) => {
    if (selectedOption !== null) return; // Only allow one selection
    setSelectedOption(optionIdx);
    
    const currentQuestion = questions[currentIdx];
    const optionLetter = ["A", "B", "C", "D"][optionIdx];
    const isCorrect = optionLetter === currentQuestion.answer;
    
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    }
  };

  // Handles moving to the next question or finishing
  const handleNext = async () => {
    setSelectedOption(null);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      // Finished all questions!
      setQuizState("results");
      setIsSubmitting(true);
      
      const finalScore = Math.round((correctAnswers / questions.length) * 100);
      setScore(finalScore);

      try {
        // Log to SQL Database
        await api.logQuizAttempt({
          quiz_title: `AI Practice Quiz: ${activeOriginalName || "Textbook"}`,
          score: finalScore,
          total_questions: questions.length,
          user_id: "default_student"
        });
        
        if (onQuizAttempt) {
          onQuizAttempt(); // Refresh dashboard cards
        }
      } catch (err) {
        console.warn("Could not log quiz attempt to database:", err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Reset to lobby
  const handleReset = () => {
    setQuizState("lobby");
    setQuestions([]);
  };

  // 1. GENERATING STATE
  if (quizState === "generating") {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-pulse">
            <Brain className="h-8 w-8 text-primary animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-card-foreground">Analyzing Study Material...</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Gemini is reading "{activeOriginalName}" and constructing target MCQs with conceptual explanations.
          </p>
          <div className="h-1.5 w-48 bg-secondary/80 rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-infiniteLoading" style={{ width: "40%" }} />
          </div>
        </CardContent>
      </Card>
    );
  }

  // 2. PLAYING STATE (Interactive MCQ Player)
  if (quizState === "playing" && questions.length > 0) {
    const currentQuestion = questions[currentIdx];
    const optionLetters = ["A", "B", "C", "D"];
    const hasAnswered = selectedOption !== null;

    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <CardTitle className="text-sm font-bold text-card-foreground uppercase tracking-wide">
                Question {currentIdx + 1} of {questions.length}
              </CardTitle>
            </div>
            <Badge variant="outline" className={cn("text-xs font-semibold capitalize", difficultyColors[difficulty])}>
              {difficulty}
            </Badge>
          </div>
          <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-1.5 mt-3" />
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Question Text */}
          <h3 
            className="text-base md:text-lg font-semibold text-card-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatInlineStyles(currentQuestion.question) }}
          />

          {/* Options List */}
          <div className="grid gap-3">
            {currentQuestion.options.map((option, idx) => {
              const letter = optionLetters[idx];
              const isSelected = selectedOption === idx;
              const isCorrect = letter === currentQuestion.answer;
              
              let buttonStyle = "bg-secondary/30 hover:bg-secondary/50 border-border text-card-foreground";
              let badgeElement = null;

              if (hasAnswered) {
                if (isCorrect) {
                  buttonStyle = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold";
                  badgeElement = <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
                } else if (isSelected) {
                  buttonStyle = "bg-destructive/10 border-destructive/30 text-destructive font-semibold";
                  badgeElement = <XCircle className="h-4 w-4 text-destructive" />;
                } else {
                  buttonStyle = "opacity-50 border-border text-muted-foreground";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  disabled={hasAnswered}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-4 text-left text-sm transition-all duration-200",
                    buttonStyle
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    )}>
                      {letter}
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: formatInlineStyles(option) }} />
                  </div>
                  {badgeElement}
                </button>
              );
            })}
          </div>

          {/* Explanation Banner */}
          {hasAnswered && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 animate-fadeIn">
              <span className="text-xs font-bold text-primary uppercase tracking-wide">Solution Explanation</span>
              <p 
                className="mt-2 text-xs md:text-sm text-muted-foreground leading-relaxed font-normal"
                dangerouslySetInnerHTML={{ __html: formatInlineStyles(currentQuestion.explanation) }}
              />
            </div>
          )}

          {/* Action Button */}
          {hasAnswered && (
            <Button onClick={handleNext} className="w-full flex items-center justify-center gap-1.5">
              {currentIdx === questions.length - 1 ? "Finish Quiz" : "Next Question"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // 3. RESULTS STATE
  if (quizState === "results") {
    const isPassing = score >= 60;
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center p-8 md:p-12 space-y-6 text-center">
          <div className={cn(
            "flex h-20 w-20 items-center justify-center rounded-full border-2",
            isPassing ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"
          )}>
            <Trophy className="h-10 w-10" />
          </div>

          <div>
            <h3 className="text-xl md:text-2xl font-bold text-card-foreground">Quiz Completed!</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Nice work! You have finished the practice quiz for "{activeOriginalName}".
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 bg-secondary/20 rounded-xl p-6 w-full max-w-sm border border-border">
            <div>
              <span className="text-2xl md:text-3xl font-extrabold text-card-foreground">{score}%</span>
              <p className="text-xs text-muted-foreground mt-1">Accuracy Score</p>
            </div>
            <div>
              <span className="text-2xl md:text-3xl font-extrabold text-card-foreground">{correctAnswers} / {questions.length}</span>
              <p className="text-xs text-muted-foreground mt-1">Questions Right</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button onClick={handleGenerateQuiz} variant="default">
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake Quiz
            </Button>
            <Button onClick={handleReset} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Materials
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 4. LOBBY STATE (List Quizzes or custom prompt if active PDF is selected)
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-card-foreground">Practice Quizzes</CardTitle>
            {activeFilename && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse text-xs">
                💡 PDF Ready
              </Badge>
            )}
          </div>
          {!activeFilename && (
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject === "All" ? null : subject)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    (selectedSubject === subject || (subject === "All" && !selectedSubject))
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {subject}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {activeFilename ? (
          /* Premium AI Quiz Customizer Box */
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 mt-0.5">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-card-foreground">Generate custom AI Practice Quiz</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  PrepAI will analyze your selected textbook <strong>"{activeOriginalName}"</strong> and write exam-standard questions.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Difficulty Select */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Difficulty Level</span>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={cn(
                        "rounded border py-1.5 text-xs font-semibold capitalize transition-all",
                        difficulty === level 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary/60"
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Count Select */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Questions Count</span>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setNumQuestions(num)}
                      className={cn(
                        "rounded border py-1.5 text-xs font-semibold transition-all",
                        numQuestions === num 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary/60"
                      )}
                    >
                      {num} MCQs
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleGenerateQuiz} className="flex-1 text-xs">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Generate Quiz with AI
              </Button>
            </div>
          </div>
        ) : (
          /* Normal List View */
          <div className="space-y-3">
            {filteredQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="group flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className={cn("rounded-lg p-2", subjectColors[quiz.subject])}>
                    {quiz.completed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-card-foreground">{quiz.title}</h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{quiz.questions} questions</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {quiz.duration}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("text-xs font-semibold", difficultyColors[quiz.difficulty])}
                      >
                        {quiz.difficulty}
                      </Badge>
                    </div>
                    {quiz.completed && quiz.score && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <Progress value={quiz.score} className="h-1.5 w-24" />
                          <span className="text-xs font-medium text-accent">{quiz.score}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={quiz.completed ? "outline" : "default"}
                  className="w-full sm:w-auto text-xs"
                  onClick={() => {
                    alert("Please select an uploaded PDF Study Material first to play custom AI Quizzes!");
                  }}
                >
                  {quiz.completed ? "Retry" : "Start"}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
