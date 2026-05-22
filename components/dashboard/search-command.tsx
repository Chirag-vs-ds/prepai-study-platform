"use client";

import * as React from "react";
import { Brain, BookOpen, FileText, LayoutDashboard, Search, Sparkles } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { api } from "@/lib/api";

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<any | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Debounced search fetch
  React.useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await api.search(query);
        if (response.success) {
          setResults(response.results);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelectAction = (action: () => void) => {
    action();
    onOpenChange(false);
    setQuery("");
  };

  return (
    <CommandDialog 
      open={open} 
      onOpenChange={onOpenChange} 
      title="Search PrepAI" 
      description="Fuzzy search across study guides, solved questions, and platform actions..."
    >
      <CommandInput
        placeholder="Type to search topics, quizzes, doubts (e.g. physics, induction)..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && <div className="p-4 text-center text-sm text-muted-foreground">Searching platform database...</div>}
        
        {!isLoading && !query && (
          <>
            <CommandGroup heading="Quick Navigation">
              <CommandItem onSelect={() => handleSelectAction(() => { window.location.hash = "#dashboard"; })}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Go to Dashboard</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelectAction(() => { window.location.hash = "#doubt-solver"; })}>
                <Brain className="mr-2 h-4 w-4" />
                <span>Go to AI Doubt Solver</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelectAction(() => { window.location.hash = "#quizzes"; })}>
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Go to Interactive Quizzes</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelectAction(() => { window.location.hash = "#summarizer"; })}>
                <Sparkles className="mr-2 h-4 w-4" />
                <span>Go to AI Summarizer</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelectAction(() => { window.location.hash = "#materials"; })}>
                <FileText className="mr-2 h-4 w-4" />
                <span>Go to Study Materials</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {!isLoading && query && (
          <>
            <CommandEmpty>No results found for &ldquo;{query}&rdquo;.</CommandEmpty>

            {results?.doubts && results.doubts.length > 0 && (
              <CommandGroup heading="Recent Doubts Solved">
                {results.doubts.map((doubt: any) => (
                  <CommandItem
                    key={`doubt-${doubt.id}`}
                    onSelect={() => handleSelectAction(() => {
                      window.location.hash = "#doubt-solver";
                      // Custom event to automatically pre-fill doubt solver with this doubt question
                      const clickEvent = new CustomEvent("select-past-doubt", {
                        detail: { question: doubt.question, subject: doubt.subject }
                      });
                      window.dispatchEvent(clickEvent);
                    })}
                  >
                    <Brain className="mr-2 h-4 w-4 text-primary" />
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[350px]">{doubt.question}</span>
                      <span className="text-[10px] text-muted-foreground">{doubt.subject}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results?.quizzes && results.quizzes.length > 0 && (
              <CommandGroup heading="Completed Quizzes">
                {results.quizzes.map((quiz: any) => (
                  <CommandItem
                    key={`quiz-${quiz.id}`}
                    onSelect={() => handleSelectAction(() => {
                      window.location.hash = "#quizzes";
                    })}
                  >
                    <BookOpen className="mr-2 h-4 w-4 text-emerald-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">{quiz.title}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results?.documents && results.documents.length > 0 && (
              <CommandGroup heading="Study Guide PDFs">
                {results.documents.map((doc: any) => (
                  <CommandItem
                    key={`doc-${doc.filename}`}
                    onSelect={() => handleSelectAction(() => {
                      // We select the file as active document
                      const clickEvent = new CustomEvent("select-active-pdf", {
                        detail: { filename: doc.filename, originalName: doc.title }
                      });
                      window.dispatchEvent(clickEvent);
                      window.location.hash = "#materials";
                    })}
                  >
                    <FileText className="mr-2 h-4 w-4 text-blue-500" />
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[350px]">{doc.title}</span>
                      <span className="text-[10px] text-muted-foreground">Click to select as active material</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
