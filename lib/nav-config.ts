import {
  LayoutDashboard,
  Brain,
  FileText,
  BarChart3,
  BookOpen,
  Settings,
  Sparkles,
} from "lucide-react";

export const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "#dashboard", id: "dashboard" },
  { icon: Brain, label: "AI Doubt Solver", href: "#doubt-solver", id: "doubt-solver" },
  { icon: BookOpen, label: "Quizzes", href: "#quizzes", id: "quizzes" },
  { icon: Sparkles, label: "AI Summarizer", href: "#summarizer", id: "summarizer" },
  { icon: FileText, label: "Study Material", href: "#materials", id: "materials" },
  { icon: BarChart3, label: "Analytics", href: "#analytics", id: "analytics" },
  { icon: Settings, label: "Settings", href: "/settings", id: "settings" },
];
