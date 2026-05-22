import {
  FocusArea,
  AnalyticsResponse,
  StudySessionRequest,
  StudySessionResponse,
  QuizAttemptRequest,
  QuizAttemptResponse,
  DoubtRequest,
  DoubtResponse,
  DoubtHistoryResponse,
  NotificationsResponse,
  SearchResponse,
  SummarizeRequest,
  SummarizeResponse,
  QuizGenerateRequest,
  QuizGenerateResponse
} from "@/types/api";

export type { FocusArea };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit, retries = 2, delay = 1000): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    for (let i = 0; i < retries + 1; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options?.headers,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json() as T;
      } catch (error) {
        if (i === retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("Request failed after retries");
  }

  // Analytics API
  async getAnalytics(userId = "default_student"): Promise<AnalyticsResponse> {
    return this.request<AnalyticsResponse>(`/analytics?user_id=${userId}`);
  }

  async logStudySession(data: StudySessionRequest): Promise<StudySessionResponse> {
    return this.request<StudySessionResponse>("/study-session", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async logQuizAttempt(data: QuizAttemptRequest): Promise<QuizAttemptResponse> {
    return this.request<QuizAttemptResponse>("/quiz-attempt", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getFocusAreas(userId = "default_student"): Promise<FocusArea[]> {
    return this.request<FocusArea[]>(`/focus-areas?user_id=${userId}`);
  }

  // Doubt API
  async solveDoubt(data: DoubtRequest): Promise<DoubtResponse> {
    return this.request<DoubtResponse>("/solve-doubt", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async solveDoubtPdf(data: DoubtRequest): Promise<DoubtResponse> {
    return this.request<DoubtResponse>("/chat-pdf", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getDoubtHistory(userId = "default_student"): Promise<DoubtHistoryResponse> {
    return this.request<DoubtHistoryResponse>(`/doubt-history?user_id=${userId}`);
  }

  // Notifications API
  async getNotifications(userId = "default_student"): Promise<NotificationsResponse> {
    return this.request<NotificationsResponse>(`/notifications?user_id=${userId}`);
  }

  async markNotificationRead(id: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/notifications/${id}/read`, {
      method: "PATCH",
    });
  }

  async markAllNotificationsRead(userId = "default_student"): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("/notifications/read-all", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  }

  // Search API
  async search(query: string): Promise<SearchResponse> {
    return this.request<SearchResponse>(`/search?q=${encodeURIComponent(query)}`);
  }

  // Summarizer API
  async generateSummary(data: SummarizeRequest): Promise<SummarizeResponse> {
    return this.request<SummarizeResponse>("/summarize", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Quiz API
  async generateQuiz(data: QuizGenerateRequest): Promise<QuizGenerateResponse> {
    return this.request<QuizGenerateResponse>("/generate-quiz", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Upload API
  async uploadPdf(formData: FormData): Promise<{ success: boolean; filename: string; detail?: string }> {
    const url = `${API_BASE_URL}/upload-pdf`;
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  }

  // Helper/Seeding API
  async seedSampleData(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/seed-sample-data", {
      method: "POST",
    });
  }
}

export const api = new ApiClient();

// Backward compatibility wrapper for weak-topics component
export async function fetchFocusAreas(retries = 3, delay = 1000): Promise<FocusArea[]> {
  try {
    return await api.getFocusAreas("default_student");
  } catch (error) {
    console.error("fetchFocusAreas failed:", error);
    return [];
  }
}
