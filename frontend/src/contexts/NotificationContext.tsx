import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  notificationService,
  NotificationSummary,
} from "../services/notificationService";

interface NotificationContextType {
  summary: NotificationSummary | null;
  loading: boolean;
  totalPending: number;
  allComplete: boolean;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  summary: null,
  loading: true,
  totalPending: 0,
  allComplete: false,
  refresh: async () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((data) => {
      setLoading(false);
      if (data) setSummary(data);
    });

    notificationService.startPolling();

    return () => {
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await notificationService.forceRefresh();
  }, []);

  const totalPending = summary?.total_pending ?? 0;
  const allComplete = summary?.all_complete ?? false;

  return (
    <NotificationContext.Provider
      value={{ summary, loading, totalPending, allComplete, refresh }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

export function stopNotificationPolling() {
  notificationService.stopPolling();
}