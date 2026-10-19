import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "./api";

export interface ServiceInput {
  images?: string[];
  name: string;
  description: string;
  price: number;
  duration_hours: 1 | 2 | 3;
  capacity: number;
  is_active: boolean;
}
export interface GaumaliService extends ServiceInput { id: string }
export interface Mali { id: string; name: string; phone: string; is_active: boolean }
export interface Appointment {
  id: string;
  customer_name: string;
  service_name?: string;
  address: string | Record<string, any>;
  status: string;
  payment_status: string;
  payment_method?: string;
  refund_status?: string;
  amount: number;
  date: string;
  start: string;
  end: string;
  assigned_mali_name?: string;
  partner_response?: string;
  partner_rejection_reason?: string;
  mali_id?: string;
}
export interface AppointmentUpdate {
  status: "approved" | "assigned" | "completed" | "cancelled" | "rejected";
  mali_id?: string;
  cash_collected?: boolean;
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const token = await AsyncStorage.getItem("access_token");
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/gaumali/admin${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : undefined; } catch { data = undefined; }
    if (!response.ok) {
      const detail = data?.detail;
      const message = typeof detail === "string" ? detail : Array.isArray(detail)
        ? detail.map((item: { msg?: string }) => item.msg || "Invalid value").join("\n")
        : data?.message;
      throw new Error(message || `Request failed (${response.status}). Please try again.`);
    }
    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out. Refresh before retrying to check whether changes were saved.");
    }
    throw error;
  } finally { clearTimeout(timeout); }
}

export const gaumaliAdmin = {
  services: () => request<GaumaliService[]>("/services"),
  saveService: (body: ServiceInput, id?: string) => request(id ? `/services/${encodeURIComponent(id)}` : "/services", id ? "PUT" : "POST", body),
  appointments: () => request<Appointment[]>("/appointments"),
  malis: () => request<Mali[]>("/malis"),
  createMali: (body: Omit<Mali, "id">) => request("/malis", "POST", body),
  updateAppointment: (id: string, body: AppointmentUpdate) => request(`/appointments/${encodeURIComponent(id)}`, "PATCH", body),
};
