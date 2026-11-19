import AsyncStorage from "@react-native-async-storage/async-storage";

export type SupportRole = "customer" | "delivery" | "worker" | "veterinary" | "admin";
export type SupportSettings = {phone: string; email: string; hours: string; timezone: string; categories: string[]};
export type SupportFarm = {id: string; name: string; settings: SupportSettings};
export type Ticket = {id: string; number: string; farm_name: string; subject: string; category: string; reference: string; status: string; priority: string; revision: number; updated_at: string; last_admin_at?: string; user_seen_at?: string; screenshots?: {id:string;name:string}[]; messages: {id: string; author: string; side: string; kind: string; text: string; at: string}[]};
export const ticketStatuses: Record<string,string> = {open:"Open",in_progress:"In progress",waiting_on_user:"Waiting for you",resolved:"Resolved",closed:"Closed"};

// A request correlation ID, not an authentication credential.
export const supportRequestId = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, value => {
  const random = Math.floor(Math.random() * 16);
  return (value === "x" ? random : (random & 3) | 8).toString(16);
});

export async function supportRequest<T>(role: SupportRole, path: string, options: RequestInit = {}): Promise<T> {
  const audience = role === "worker" || role === "veterinary" ? role : "user";
  const key = audience === "worker" ? "worker_token" : audience === "veterinary" ? "vet_token" : "access_token";
  const token = await AsyncStorage.getItem(key);
  if(!token) throw new Error("Please sign in again to contact support.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const base = (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");
    const response = await fetch(`${base}/api/support${path}`, {...options,signal:controller.signal,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,"X-Support-Audience":audience,...options.headers}});
    const data = await response.json().catch(() => ({}));
    if(!response.ok) {
      const error = new Error(typeof data.detail === "string" ? data.detail : "Could not complete the support request. Please try again.") as Error & {status?:number};
      error.status = response.status;
      throw error;
    }
    return data;
  } catch(error: any) {
    if(error.name === "AbortError") throw new Error("Request timed out. Please retry; your ticket will not be duplicated.");
    throw error;
  } finally {clearTimeout(timeout);}
}
