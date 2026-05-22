"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, X, CheckCircle2, Clock, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  status: "uploading" | "processing" | "ready";
  progress: number;
  serverFilename?: string;
}

const mockFiles: UploadedFile[] = [];

const statusConfig = {
  uploading: { label: "Uploading", icon: Upload, color: "text-primary" },
  processing: { label: "AI Processing", icon: Clock, color: "text-chart-3" },
  ready: { label: "Ready", icon: CheckCircle2, color: "text-accent" },
};

export function PDFUpload({
  activeFilename = null,
  onActiveFileChange,
  onUploadSuccess,
}: {
  activeFilename?: string | null;
  onActiveFileChange?: (filename: string | null, originalName: string | null) => void;
  onUploadSuccess?: () => void;
}) {
  const [files, setFiles] = useState<UploadedFile[]>(mockFiles);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file drop
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFiles = async (fileList: File[]) => {
    const newFiles: UploadedFile[] = fileList
      .filter((f) => f.type === "application/pdf")
      .map((f) => ({
        id: Math.random().toString(36).slice(2),
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        status: "uploading" as const,
        progress: 30,
      }));
    
    setFiles((prev) => [...newFiles, ...prev]);

    for (const fileObj of newFiles) {
      const actualFile = fileList.find(f => f.name === fileObj.name);
      if (!actualFile) continue;

      const formData = new FormData();
      formData.append('file', actualFile);

      try {
        // Update to processing state
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: 60, status: 'processing' } : f));

        const data = await api.uploadPdf(formData);

        if (data.success) {
          // Success!
          setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: 100, status: 'ready', serverFilename: data.filename } : f));
          
          // Automatically set this newly uploaded PDF as the active studying document!
          if (onActiveFileChange && data.filename) {
            onActiveFileChange(data.filename, fileObj.name);
          }
          if (onUploadSuccess) {
            onUploadSuccess();
          }
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload ${fileObj.name}. Check if backend is running!`);
        removeFile(fileObj.id);
      }
    }
  };

  const removeFile = (id: string) => {
    const fileToRemove = files.find((f) => f.id === id);
    if (fileToRemove && fileToRemove.serverFilename === activeFilename && onActiveFileChange) {
      // Clear out active workspace if current active file is deleted
      onActiveFileChange(null, null);
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-card-foreground">Study Materials</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
          />
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-card-foreground">
                Drop your PDFs here or{" "}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:underline"
                >
                  browse
                </button>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                AI will analyze and create smart summaries
              </p>
            </div>
          </div>
        </div>

        {/* File List */}
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {files.map((file) => {
            const StatusIcon = statusConfig[file.status].icon;
            const isActive = file.status === "ready" && file.serverFilename === activeFilename;

            return (
              <div
                key={file.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg p-3 border transition-all duration-200",
                  isActive 
                    ? "bg-emerald-500/10 border-emerald-500/30 shadow shadow-emerald-500/10" 
                    : "bg-secondary/30 border-transparent"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-destructive/10 text-destructive"
                )}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{file.size}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    {isActive ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold animate-pulse">
                        <CheckCircle2 className="h-3 w-3" />
                        Active Workspace
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "flex items-center gap-1 text-xs",
                          statusConfig[file.status].color
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig[file.status].label}
                      </span>
                    )}
                  </div>
                  {file.status !== "ready" && (
                    <Progress value={file.progress} className="mt-2 h-1" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {file.status === "ready" && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "h-8 w-8 transition-colors",
                        isActive ? "text-emerald-400 hover:text-emerald-300 bg-emerald-500/15" : "text-primary hover:text-accent"
                      )}
                      title={isActive ? "Click to deactivate document context" : "Set as active doubt-solving text"}
                      onClick={() => {
                        if (onActiveFileChange && file.serverFilename) {
                          // Toggle workspace activation
                          onActiveFileChange(isActive ? null : file.serverFilename, file.name);
                        }
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

  );
}
