import { api } from "./api";

export type PaymentMethod = "wallet" | "online" | "cod";
export interface Service {
  image?: string;
  images?: string[];
  id: string; name: string; description: string; price: number;
  duration_hours: number; capacity: number; is_active: boolean;
}
export interface Slot { start: string; end: string; available: number }
export interface Appointment {
  checkout_id?: string;
  id: string; service_id: string; service_name?: string; date: string;
  start: string; end?: string; status: string; payment_status: string;
  payment_method: PaymentMethod; amount: number; refund_status?: string;
  assigned_mali_name?: string; assigned_mali_phone?: string;
  checkout?: { key_id: string; order_id: string; amount: number; currency: string };
}
export interface Booking {
  service_id: string; date: string; start: string; address_id: string;
  payment_method: PaymentMethod; request_id: string;
}
export interface CartBooking {
  items: { service_id: string; date: string; start: string }[];
  address_id: string; payment_method: PaymentMethod; request_id: string;
}
export interface Checkout {
  id: string; amount: number; status: string; payment_status: string;
  appointments: Appointment[]; checkout?: Appointment["checkout"];
}
export interface Verification {
  razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string;
}

// Reuse the authenticated transport without modifying the shared client's API.
const request = <T>(path: string, body?: object): Promise<T> =>
  api["request"]<T>(path, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) });

export const gaumali = {
  resolveCheckout: (id: string) => request<Checkout>(`/gaumali/checkouts/by-request/${encodeURIComponent(id)}`),
  checkout: (body: CartBooking) => request<Checkout>("/gaumali/checkouts", body),
  getCheckout: (id: string) => request<Checkout>(`/gaumali/checkouts/${encodeURIComponent(id)}`),
  checkoutStatus: (id: string) => request<Checkout>(`/gaumali/checkouts/${encodeURIComponent(id)}/payment-status`, {}),
  verifyCheckout: (id: string, body: Verification) => request<Checkout>(`/gaumali/checkouts/${encodeURIComponent(id)}/verify`, body),
  cancelCheckout: (id: string) => request<Checkout>(`/gaumali/checkouts/${encodeURIComponent(id)}/cancel`, {}),
  services: () => request<Service[]>("/gaumali/services"),
  slots: (serviceId: string, date: string) => request<Slot[]>(`/gaumali/slots?service_id=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`),
  appointments: () => request<Appointment[]>("/gaumali/appointments"),
  book: (body: Booking) => request<Appointment>("/gaumali/appointments", body),
  verify: (id: string, body: Verification) => request<Appointment>(`/gaumali/appointments/${encodeURIComponent(id)}/verify`, body),
  cancel: (id: string) => request<Appointment>(`/gaumali/appointments/${encodeURIComponent(id)}/cancel`, {}),
  paymentStatus: (id: string) => request<Appointment>(`/gaumali/appointments/${encodeURIComponent(id)}/payment-status`, {}),
};
