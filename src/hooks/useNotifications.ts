"use client";

import { useState, useEffect, useCallback } from "react";

export interface AppNotification {
  id: string;
  type: "stock_critical" | "sale_delayed";
  title: string;
  message: string;
  reference_id: string | null;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [syncing, setSyncing] = useState(false);

  const fetchList = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    }
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch("/api/notifications", { method: "POST" });
      await fetchList();
    } finally {
      setSyncing(false);
    }
  }, [fetchList]);

  const markRead = useCallback(async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  }, []);

  const markAllRead = useCallback(async (list: AppNotification[]) => {
    const unread = list.filter((n) => !n.read_at);
    await Promise.all(
      unread.map((n) => fetch(`/api/notifications/${n.id}`, { method: "PATCH" }))
    );
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
  }, []);

  const remove = useCallback(async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Roda sync no mount
  useEffect(() => {
    sync();
  }, [sync]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return { notifications, syncing, unreadCount, sync, markRead, markAllRead, remove };
}
