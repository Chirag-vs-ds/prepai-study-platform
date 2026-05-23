"use client";

import * as React from "react";
import { Bell, Flame, BookOpen, Sparkles, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { NotificationItem } from "@/types/api";
import { cn } from "@/lib/utils";

interface NotificationPopoverProps {
  triggerRefresh?: () => void;
  userId?: string;
}

export function NotificationPopover({ triggerRefresh, userId = "default_student" }: NotificationPopoverProps) {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  React.useEffect(() => {
    api.getNotifications(userId)
      .then((res) => {
        if (res.success) {
          setNotifications(res.notifications);
          setUnreadCount(res.unread_count);
        }
      })
      .catch((err) => console.error("Failed to load notifications:", err));
  }, [refreshTrigger, userId]);

  // Expose a custom event for triggering notification refreshes from routes
  React.useEffect(() => {
    const handleNotificationRefresh = () => {
      setRefreshTrigger((prev) => prev + 1);
    };
    window.addEventListener("refresh-notifications", handleNotificationRefresh);
    return () => window.removeEventListener("refresh-notifications", handleNotificationRefresh);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      const res = await api.markNotificationRead(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        if (triggerRefresh) triggerRefresh();
      }
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await api.markAllNotificationsRead(userId);
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        if (triggerRefresh) triggerRefresh();
      }
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "streak":
        return <Flame className="h-4 w-4 text-orange-500 fill-orange-500/20" />;
      case "quiz":
        return <BookOpen className="h-4 w-4 text-emerald-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full bg-secondary/50 border border-border">
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] p-0 px-1 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold border border-background">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4 mt-1 bg-popover border-border shadow-lg" align="end">
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-[11px] h-7 px-2 text-primary hover:text-primary/95 flex items-center gap-1"
            >
              <CheckCheck className="h-3 w-3" />
              <span>Mark all read</span>
            </Button>
          )}
        </div>
        <ScrollArea className="h-72">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground opacity-30 mb-2" />
              <p className="text-xs font-medium text-foreground">All caught up!</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "flex gap-3 p-3 transition-colors text-left",
                    !notif.is_read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-accent/50"
                  )}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary">
                      {getIcon(notif.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className={cn("text-xs font-semibold truncate", !notif.is_read ? "text-foreground" : "text-muted-foreground")}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="h-4 w-4 rounded-full text-muted-foreground hover:text-primary hover:bg-secondary flex-shrink-0"
                          title="Mark as read"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                      {notif.message}
                    </p>
                    <p className="text-[9px] text-muted-foreground/60 mt-1">
                      {new Date(notif.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
