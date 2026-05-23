"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  User,
  Bell,
  Palette,
  Shield,
  Sun,
  Moon,
  Save,
  Loader2,
  Zap,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "notifications" | "appearance" | "security";

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Notification preferences (local state for demo)
  const [notifPrefs, setNotifPrefs] = useState({
    quizReminders: true,
    streakAlerts: true,
    studyTips: false,
    emailDigest: false,
  });

  // Profile form
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    username: "",
  });

  useEffect(() => {
    setMounted(true);
    if (user) {
      setProfile({
        fullName: user.full_name || "",
        email: user.email || "",
        username: user.username || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "security", label: "Security", icon: Shield },
  ];

  const initials = isAuthenticated
    ? (user?.full_name || user?.username || "U")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "G";

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-4 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          className="h-9 w-9 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Settings Sidebar */}
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Settings Content */}
          <div className="space-y-6">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="backdrop-blur-sm bg-card/80 border border-border/50 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Profile Information</h2>

                  {/* Avatar Section */}
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-16 w-16 border-2 border-primary/30">
                      <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {isAuthenticated ? user?.full_name || user?.username : "Guest User"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isAuthenticated ? user?.email : "Sign in to manage your profile"}
                      </p>
                    </div>
                  </div>

                  <Separator className="mb-6" />

                  {isAuthenticated ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="settings-fullname">Full Name</Label>
                          <Input
                            id="settings-fullname"
                            value={profile.fullName}
                            onChange={(e) =>
                              setProfile({ ...profile, fullName: e.target.value })
                            }
                            className="bg-secondary/50 border-border/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="settings-username">Username</Label>
                          <Input
                            id="settings-username"
                            value={profile.username}
                            disabled
                            className="bg-secondary/30 border-border/50 opacity-60"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="settings-email">Email</Label>
                        <Input
                          id="settings-email"
                          type="email"
                          value={profile.email}
                          onChange={(e) =>
                            setProfile({ ...profile, email: e.target.value })
                          }
                          className="bg-secondary/50 border-border/50"
                        />
                      </div>
                      <Button onClick={handleSave} disabled={saving} className="mt-2">
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : saved ? (
                          <Check className="h-4 w-4 mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {saved ? "Saved!" : "Save Changes"}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">
                        Sign in to manage your profile settings
                      </p>
                      <Button onClick={() => router.push("/login")}>
                        Sign In
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="backdrop-blur-sm bg-card/80 border border-border/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Notification Preferences
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      key: "quizReminders" as const,
                      label: "Quiz Reminders",
                      desc: "Get reminded to take daily quizzes",
                    },
                    {
                      key: "streakAlerts" as const,
                      label: "Streak Alerts",
                      desc: "Notifications about your study streak",
                    },
                    {
                      key: "studyTips" as const,
                      label: "Study Tips",
                      desc: "AI-powered study recommendations",
                    },
                    {
                      key: "emailDigest" as const,
                      label: "Email Digest",
                      desc: "Weekly summary of your progress",
                    },
                  ].map((pref) => (
                    <div
                      key={pref.key}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/20 p-4"
                    >
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {pref.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{pref.desc}</p>
                      </div>
                      <Switch
                        checked={notifPrefs[pref.key]}
                        onCheckedChange={(checked) =>
                          setNotifPrefs({ ...notifPrefs, [pref.key]: checked })
                        }
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={handleSave} disabled={saving} className="mt-4">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : saved ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saved ? "Saved!" : "Save Preferences"}
                </Button>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && mounted && (
              <div className="backdrop-blur-sm bg-card/80 border border-border/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Appearance
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { value: "light", label: "Light", icon: Sun },
                    { value: "dark", label: "Dark", icon: Moon },
                    { value: "system", label: "System", icon: Palette },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border-2 p-6 transition-all duration-200",
                        theme === opt.value
                          ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                          : "border-border/50 bg-secondary/20 hover:border-primary/30 hover:bg-secondary/40"
                      )}
                    >
                      <opt.icon
                        className={cn(
                          "h-6 w-6",
                          theme === opt.value ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm font-medium",
                          theme === opt.value ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="backdrop-blur-sm bg-card/80 border border-border/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Security
                </h2>
                {isAuthenticated ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="settings-curpass">Current Password</Label>
                      <Input
                        id="settings-curpass"
                        type="password"
                        placeholder="Enter current password"
                        className="bg-secondary/50 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="settings-newpass">New Password</Label>
                      <Input
                        id="settings-newpass"
                        type="password"
                        placeholder="Enter new password"
                        className="bg-secondary/50 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="settings-confirmpass">Confirm New Password</Label>
                      <Input
                        id="settings-confirmpass"
                        type="password"
                        placeholder="Confirm new password"
                        className="bg-secondary/50 border-border/50"
                      />
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="mt-2">
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Shield className="h-4 w-4 mr-2" />
                      )}
                      Update Password
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Sign in to manage security settings
                    </p>
                    <Button onClick={() => router.push("/login")}>Sign In</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
