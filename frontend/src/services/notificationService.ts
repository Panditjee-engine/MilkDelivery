import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";
const POLL_INTERVAL_MS = 30_000;

export interface CowTaskStatus {
  cow_id: string;
  cow_name: string;
  feed_done: boolean;
  milk_done: boolean;
  health_done: boolean;
}

export interface NotificationSummary {
  date: string;
  shift: "morning" | "evening";
  total_active_cows: number;
  feed: {
    done: string[];
    pending: string[];
    total_done: number;
    total_pending: number;
  };
  milk: {
    done: string[];
    pending: string[];
    total_done: number;
    total_pending: number;
  };
  health: {
    done: string[];
    pending: string[];
    total_done: number;
    total_pending: number;
  };
  total_pending: number;
  all_complete: boolean;
  last_updated: string;
}

type NotifListener = (data: NotificationSummary | null, error?: string) => void;

class NotificationService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<NotifListener> = new Set();
  private lastData: NotificationSummary | null = null;
  private isPolling = false;

  subscribe(listener: NotifListener): () => void {
    this.listeners.add(listener);
    if (this.lastData) {
      listener(this.lastData);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  startPolling() {
    if (this.isPolling) return;
    this.isPolling = true;
    this.fetchSummary();
    this.intervalId = setInterval(() => {
      this.fetchSummary();
    }, POLL_INTERVAL_MS);
  }

  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
  }

  async forceRefresh() {
    await this.fetchSummary();
  }

  getLastData(): NotificationSummary | null {
    return this.lastData;
  }

  private async fetchSummary() {
    try {
      // API_BASE check
      if (!API_BASE) {
        console.warn("[Notif] EXPO_PUBLIC_BACKEND_URL not set in .env");
        this.emit(null, "Backend URL not configured");
        return;
      }

      // Token check — try both keys
      let token = await AsyncStorage.getItem("access_token");
      if (!token) token = await AsyncStorage.getItem("adminToken");
      if (!token) token = await AsyncStorage.getItem("token");

      if (!token) {
        console.warn("[Notif] No token found in AsyncStorage");
        this.emit(null, "No auth token");
        return;
      }

      const url = `${API_BASE}/api/admin/notifications/summary`;
      console.log("[Notif] Fetching:", url);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeout);
      console.log("[Notif] Response status:", response.status);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.warn("[Notif] Auth failed — not admin or token expired");
          this.emit(null, "Auth failed");
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data: NotificationSummary = await response.json();
      console.log("[Notif] Data received — total_pending:", data.total_pending);
      this.lastData = data;
      this.emit(data);
    } catch (error: any) {
      if (error?.name === "AbortError") {
        console.warn("[Notif] Request timed out");
      } else {
        console.warn("[Notif] Fetch error:", error?.message);
      }
      this.emit(null, error?.message || "Network error");
    }
  }

  private emit(data: NotificationSummary | null, error?: string) {
    this.listeners.forEach((listener) => {
      try {
        listener(data, error);
      } catch (e) {
        console.warn("[Notif] Listener error:", e);
      }
    });
  }
}

export const notificationService = new NotificationService();