export interface FocusArea {
  topic: string;
  subject: string;
  accuracy: number;
  previousAccuracy: number;
  attempted: number;
}

export interface AnalyticsMetrics {
  study_time_minutes: number;
  study_time_hours: number;
  quizzes_completed: number;
  avg_quiz_score: number;
  current_streak: number;
  longest_streak: number;
}

export interface WeeklyProgressItem {
  day: string;
  date: string;
  minutes: number;
}

export interface AnalyticsResponse {
  success: boolean;
  user_id: string;
  metrics: AnalyticsMetrics;
  weekly_progress: WeeklyProgressItem[];
}

export interface StudySessionRequest {
  subject: string;
  minutes: number;
  user_id?: string;
}

export interface StudySessionResponse {
  success: boolean;
  message: string;
  streak_update?: {
    current_streak: number;
    longest_streak: number;
  };
}

export interface QuizAttemptRequest {
  quiz_title: string;
  score: number;
  total_questions: number;
  user_id?: string;
}

export interface QuizAttemptResponse {
  success: boolean;
  message: string;
  attempt_id: number;
}

export interface DoubtRequest {
  question: string;
  subject?: string;
  context?: string;
  image_data?: string | null;
  image_mime?: string | null;
  filename?: string | null; // For PDF RAG
  k?: number; // Retrieval count
}

export interface Reference {
  content: string;
  match_score: number;
}

export interface DoubtResponse {
  success: boolean;
  answer: string;
  source: string;
  subject?: string;
  references?: Reference[];
}

export interface DoubtHistoryItem {
  id: number;
  user_id: string;
  question: string;
  subject: string;
  answer_source: string;
  created_at: string;
}

export interface DoubtHistoryResponse {
  success: boolean;
  history: DoubtHistoryItem[];
}

export interface NotificationItem {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: "quiz" | "streak" | "system";
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: NotificationItem[];
  unread_count: number;
}

export interface SearchItem {
  id: string | number;
  title: string;
  type: "doubt" | "quiz" | "material";
  url?: string;
  subtitle?: string;
}

export interface SearchResponse {
  success: boolean;
  results: {
    doubts: SearchItem[];
    quizzes: SearchItem[];
    materials: SearchItem[];
  };
}

export interface SummarizeRequest {
  filename: string;
  depth?: "brief" | "standard" | "detailed";
}

export interface SummarizeResponse {
  success: boolean;
  summary: string;
  keyPoints?: string[];
  key_points?: string[];
  estimatedStudyTimeMinutes?: number;
  flashcards?: Array<{ question: string; answer: string }>;
  mindmap_json?: any;
  source?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string; // "A", "B", "C", or "D"
  explanation: string;
}

export interface QuizGenerateRequest {
  filename?: string;
  num_questions?: number;
  difficulty?: "easy" | "medium" | "hard";
  subject?: string;
}

export interface QuizGenerateResponse {
  success: boolean;
  quiz_title?: string;
  questions?: QuizQuestion[];
  detail?: string;
}
