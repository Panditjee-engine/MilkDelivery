import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

export function getApiBaseUrl() {
  return API_BASE;
}

export type PaymentMethod = "cash" | "upi";

export interface CustomerAppSettings {
  admin_id?: string | null;
  payment_methods: {
    wallet: boolean;
    online: boolean;
    cash_on_delivery: boolean;
  };
}

export interface InvoiceTemplateSettings {
  business_name: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  footer_note?: string;
  terms?: string;
  primary_color?: string;
  show_payment_details?: boolean;
  show_terms?: boolean;
}

export interface OrderCutoffRule {
  id?: string;
  admin_id?: string;
  product_id?: string | null;
  product_name?: string | null;
  cutoff_time: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceDownloadPayload {
  filename: string;
  mime_type: string;
  base64: string;
}

type ApiRequestOptions = RequestInit & {
  silentErrorLog?: boolean;
  timeoutMs?: number;
};

export interface FeedItem {
  feed_type: string;
  quantity_kg: number;
}
export interface InsuranceCreate {
  cow_id: string;
  cow_name: string;
  cow_tag: string;
  policy_number: string;
  company: string;
  sum_insured: number;
  annual_premium: number;
  start_date: string; // YYYY-MM-DD
  expiry_date: string; // YYYY-MM-DD
  premium_due_date: string; // YYYY-MM-DD
  notify_before_expiry?: boolean;
  notify_before_due?: boolean;
  expiry_alert_days?: number;
  due_alert_days?: number;
  notes?: string;
  claim_filed?: boolean;
  claim_date?: string;
  claim_amount?: number;
  claim_status?: string;
  claim_notes?: string;
}

export interface Insurance {
  id: string;
  admin_id: string;
  cow_id: string;
  cow_name: string;
  cow_tag: string;
  policy_number: string;
  company: string;
  sum_insured: number;
  annual_premium: number;
  start_date: string;
  expiry_date: string;
  premium_due_date: string;
  notify_before_expiry: boolean;
  notify_before_due: boolean;
  expiry_alert_days: number;
  due_alert_days: number;
  notes?: string;
  claim_filed: boolean;
  claim_date?: string;
  claim_amount?: number;
  claim_status?: string; // "pending" | "approved" | "rejected"
  claim_notes?: string;
  status: string; // "active" | "expiring" | "expired"
  days_to_expiry?: number;
  created_at: string;
  updated_at?: string;
}

export interface InsuranceSummary {
  total_insured: number;
  active: number;
  expiring_soon: number;
  expired: number;
  uninsured: number;
  total_cows: number;
  total_insured_value: number;
  total_annual_premium: number;
}

export interface InsuranceNotificationLog {
  id: string;
  admin_id: string;
  insurance_id: string;
  cow_id: string;
  cow_name: string;
  cow_tag: string;
  notification_type: string;
  message: string;
  sent_at: string;
  success: boolean;
}

export interface InsuranceNotificationSettings {
  admin_id: string;
  notify_expiry: boolean;
  notify_due: boolean;
  notify_renewal: boolean;
  notify_claim: boolean;
  expiry_alert_days: number;
  due_alert_days: number;
  fcm_tokens: string[];
  updated_at?: string;
}

export interface AdminNotificationItem {
  id: string;
  admin_id?: string;
  event?: string;
  category:
  | "order"
  | "subscription"
  | "wallet"
  | "vacation"
  | "general"
  | string;
  title: string;
  body: string;
  data?: Record<string, any>;
  status?: string;
  is_read: boolean;
  read_at?: string | null;
  sent_at?: string;
}

export interface AdminNotificationInbox {
  total: number;
  unread: number;
  read: number;
  data: AdminNotificationItem[];
}

export interface AdminNotificationSummary {
  total: number;
  unread: number;
  read: number;
  latest?: AdminNotificationItem | null;
}

export type MedicineCategory =
  | "Antibiotic"
  | "Vaccine"
  | "Antiparasitic"
  | "Vitamin"
  | "Homeopathic"
  | "Ethnovetary"
  | "Supplement"
  | "Other";

export type MedicineUnit =
  | "ml"
  | "L"
  | "mg"
  | "g"
  | "kg"
  | "tablet"
  | "vial"
  | "dose"
  | "sachet";

export type StockTransactionType =
  | "purchase" // stock added
  | "used" // dispensed for a cow
  | "adjusted" // manual correction
  | "expired"; // written off

export interface Medicine {
  id: string;
  admin_id: string;
  name: string;
  category: MedicineCategory;
  unit: MedicineUnit;
  description?: string;
  manufacturer?: string;
  batch_number?: string;
  expiry_date?: string; // DD/MM/YYYY
  purchase_date?: string; // DD/MM/YYYY
  cost_per_unit?: number; // ₹
  current_stock: number;
  min_stock_alert?: number;
  storage_instructions?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface MedicineCreate {
  name: string;
  category: MedicineCategory;
  unit: MedicineUnit;
  description?: string;
  manufacturer?: string;
  batch_number?: string;
  expiry_date?: string;
  purchase_date?: string;
  cost_per_unit?: number;
  current_stock?: number;
  min_stock_alert?: number;
  storage_instructions?: string;
  notes?: string;
}

export type MedicineUpdate = Partial<MedicineCreate>;

export interface StockTransaction {
  id: string;
  admin_id: string;
  medicine_id: string;
  medicine_name: string;
  transaction_type: StockTransactionType;
  quantity: number;
  unit: string;
  stock_before: number;
  stock_after: number;
  cow_id?: string;
  cow_name?: string;
  cow_tag?: string;
  reason?: string;
  performed_by?: string;
  date: string; // YYYY-MM-DD
  created_at: string;
}

export interface MedicineUsageCreate {
  medicine_id: string;
  cow_id: string;
  cow_name: string;
  cow_tag: string;
  quantity_used: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  performed_by?: string;
}

export interface StockAdjustmentCreate {
  medicine_id: string;
  new_quantity: number;
  reason?: string;
}

export interface StockPurchaseCreate {
  medicine_id: string;
  quantity_added: number;
  cost_per_unit?: number;
  batch_number?: string;
  expiry_date?: string; // DD/MM/YYYY
  purchase_date?: string; // DD/MM/YYYY
  notes?: string;
}

export interface MedicineStockSummary {
  total_medicines: number;
  low_stock_count: number;
  expired_count: number;
  expiring_soon_count: number;
  total_stock_value: number;
}

export interface StockOperationResult {
  success: boolean;
  stock_before: number;
  stock_after: number;
  transaction: StockTransaction;
}

export type FeedStockCategory =
  | "Dry Fodder"
  | "Green Fodder"
  | "Concentrate"
  | "Silage"
  | "Mixed Feed"
  | "Mineral Mix"
  | "Wheat Bran"
  | "Rice Straw"
  | "Cotton Seed"
  | "Mustard Cake"
  | "Other";

export type FeedStockUnit =
  | "kg"
  | "quintal"
  | "ton"
  | "bag"
  | "bundle"
  | "litre";

export type FeedTransactionType = "purchase" | "used" | "adjusted" | "expired";

export interface FeedStock {
  id: string;
  admin_id: string;
  name: string;
  category: FeedStockCategory;
  unit: FeedStockUnit;
  description?: string;
  supplier?: string;
  batch_number?: string;
  expiry_date?: string; // DD/MM/YYYY
  purchase_date?: string; // DD/MM/YYYY
  cost_per_unit?: number;
  current_stock: number;
  min_stock_alert?: number;
  storage_location?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface FeedStockCreate {
  name: string;
  category: FeedStockCategory;
  unit: FeedStockUnit;
  description?: string;
  supplier?: string;
  batch_number?: string;
  expiry_date?: string;
  purchase_date?: string;
  cost_per_unit?: number;
  current_stock?: number;
  min_stock_alert?: number;
  storage_location?: string;
  notes?: string;
}

export type FeedStockUpdate = Partial<FeedStockCreate>;

export interface FeedStockSummary {
  total_items: number;
  low_stock_count: number;
  expired_count: number;
  expiring_soon_count: number;
  total_stock_value: number;
}

export interface FeedStockTransaction {
  id: string;
  admin_id: string;
  feed_stock_id: string;
  feed_name: string;
  transaction_type: FeedTransactionType;
  quantity: number;
  unit: string;
  stock_before: number;
  stock_after: number;
  reason?: string;
  performed_by?: string;
  date: string; // YYYY-MM-DD
  created_at: string;
}

export interface FeedStockPurchaseCreate {
  feed_stock_id: string;
  quantity_added: number;
  cost_per_unit?: number;
  batch_number?: string;
  expiry_date?: string; // DD/MM/YYYY
  purchase_date?: string; // DD/MM/YYYY
  notes?: string;
}

export interface FeedStockUsageCreate {
  feed_stock_id: string;
  quantity_used: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  performed_by?: string;
}

export interface FeedStockAdjustmentCreate {
  feed_stock_id: string;
  new_quantity: number;
  reason?: string;
}

export interface FeedStockOperationResult {
  success: boolean;
  stock_before: number;
  stock_after: number;
  transaction: FeedStockTransaction;
}

//farm sale phone intefaces by golu
export interface FarmSaleCreate {
  customer_id?: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  unit: string; // "kg" | "L" | "piece"
  price_per_unit: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  payment_method?: PaymentMethod;
  payment_confirmed?: boolean;
  receipt_image?: string;
}

export interface FarmSale {
  id: string;
  admin_id: string;
  worker_id: string;
  worker_name: string;
  customer_id?: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  total_amount: number;
  date: string;
  notes?: string;
  created_at: string;
  payment_method?: PaymentMethod;
  payment_confirmed?: boolean;
  receipt_image?: string;
}

//farm multiple adress
export interface BusinessLocationCreate {
  label: string;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  is_primary?: boolean;
}

export interface BusinessLocation extends BusinessLocationCreate {
  id: string;
  admin_id: string;
  created_at: string;
  updated_at?: string;
}

export interface LeaseCreate {
  cow_id: string;
  lessee_admin_id: string;
  lessee_farm_name?: string;
  lessee_email?: string;
  lessee_phone?: string;
  price: number;
  start_date: string; // DD/MM/YYYY
  end_date: string; // DD/MM/YYYY
  reason?: string;
  location_id?: string;
  location_label?: string;
  location_address?: string;
}

export interface Lease {
  id: string;
  cow_id: string;
  cow_name: string;
  cow_tag: string;
  lessor_admin_id: string;
  lessor_farm_name?: string;
  lessee_admin_id: string;
  lessee_farm_name?: string;
  lessee_email?: string;
  lessee_phone?: string;
  price: number;
  start_date: string;
  end_date: string;
  original_end_date: string;
  reason?: string;
  location_id?: string;
  location_label?: string;
  location_address?: string;
  status: "active" | "completed" | "cancelled";
  extension_count: number;
  extension_history: Array<{
    previous_end_date: string;
    new_end_date: string;
    note?: string;
    extended_at: string;
  }>;
  created_at: string;
  updated_at?: string;
}

export interface FarmSearchResult {
  admin_id: string;
  farm_name?: string;
  email?: string;
  phone?: string;
  location_id?: string;
  location_label?: string;
  location_address?: string;
}

export interface LeaseUpdate {
  price?: number;
  end_date?: string;
  reason?: string;
  location_id?: string;
  location_label?: string;
  location_address?: string;
}

class ApiService {
  private token: string | null = null;

  async init() {
    this.token = await AsyncStorage.getItem("access_token");
  }

  setToken(token: string | null) {
    this.token = token;

    if (token) {
      AsyncStorage.setItem("access_token", token);
    } else {
      AsyncStorage.removeItem("access_token");
    }
  }

  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const url = `${API_BASE}/api${endpoint}`;
    const controller = new AbortController();
    const { silentErrorLog, timeoutMs, ...fetchOptions } = options;
    const timeout = setTimeout(() => controller.abort(), timeoutMs ?? 45_000);

    const storedToken =
      this.token || (await AsyncStorage.getItem("access_token"));

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (storedToken) {
      headers["Authorization"] = `Bearer ${storedToken}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: fetchOptions.signal || controller.signal,
      });
    } catch (error: any) {
      if (error?.name === "AbortError") {
        throw new Error(
          "Request timed out. Please check your connection and try again.",
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const text = await response.text();

      if (!silentErrorLog) {
        console.log("API ERROR URL:", url);
        console.log("STATUS:", response.status);
        console.log("BODY:", text);
      }

      let message = text || "Request failed";
      try {
        const errJson = JSON.parse(text);
        message = errJson.detail || errJson.message || text || "Request failed";
      } catch {
        // Keep the raw text when the backend does not return JSON.
      }
      const lowerMessage = String(message).toLowerCase();
      const isAuthError =
        response.status === 401 ||
        (response.status === 403 &&
          (lowerMessage.includes("not authenticated") ||
            lowerMessage.includes("invalid token") ||
            lowerMessage.includes("not authorized")));
      if (isAuthError) {
        this.setToken(null);
        await AsyncStorage.multiRemove([
          "access_token",
          "worker_token",
          "worker_data",
        ]);
        throw new Error("UNAUTHORIZED");
      }
      const error = new Error(message);
      (error as Error & { status?: number; url?: string }).status =
        response.status;
      (error as Error & { status?: number; url?: string }).url = url;
      throw error;
    }
    return response.json();
  }

  async login(
    identifier: string,
    password: string,
    method: "email" | "phone" = "email",
    extraData: Record<string, any> = {},
  ) {
    const body = {
      email: method === "email" ? identifier : "",
      phone: method === "phone" ? identifier : "",
      password,
      platform: extraData.platform || "fcm",
      device_token: extraData.device_token || "",
    };

    const data = await this.request<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
    this.setToken(data.access_token);
    return data;
  }

  private async requestFormData<T>(
    endpoint: string,
    formData: FormData,
    method: "POST" | "PUT" = "POST",
  ): Promise<T> {
    const url = `${API_BASE}/api${endpoint}`;
    const storedToken =
      this.token || (await AsyncStorage.getItem("access_token"));
    const headers: Record<string, string> = {};

    if (storedToken) {
      headers.Authorization = `Bearer ${storedToken}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: formData,
    });

    const text = await response.text();
    if (!response.ok) {
      let message = text || "Request failed";
      try {
        const errJson = JSON.parse(text);
        message = errJson.message || errJson.detail || "Request failed";
      } catch {
        // Keep raw backend text when it is not JSON.
      }
      const lowerMessage = String(message).toLowerCase();
      const isAuthError =
        response.status === 401 ||
        (response.status === 403 &&
          (lowerMessage.includes("not authenticated") ||
            lowerMessage.includes("invalid token") ||
            lowerMessage.includes("not authorized")));
      if (isAuthError) {
        this.setToken(null);
        await AsyncStorage.multiRemove([
          "access_token",
          "worker_token",
          "worker_data",
        ]);
        throw new Error("UNAUTHORIZED");
      }
      throw new Error(message);
    }
    if (!text) return {} as T;
    return JSON.parse(text);
  }

  //for fetch admin response for rider by golu
  async getAssignedAdmin() {
    return this.request<{
      admin_id: string;
      name: string;
      business_name?: string;
      email?: string;
      phone?: string;
      address?: any;
    }>("/auth/assigned-admin");
  }

  // New API to get admin details by referral code (for registration flow)
  async getAdminByReferral(referralCode: string) {
    return this.request<{
      found: boolean;
      admin_id: string | null;
      admin_name: string | null;
      referral_code?: string;
    }>(`/admin/referral/${referralCode.toUpperCase().trim()}`);
  }

  async register(userData: any) {
    const data = await this.request<any>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    this.setToken(data.access_token);
    return data;
  }

  async connectGaushala(referralCode: string) {
    return this.request<{
      message: string;
      admin_id: string;
      admin_name: string;
      referral_code: string;
      user?: any;
    }>("/auth/connect-gaushala", {
      method: "POST",
      body: JSON.stringify({ referral_code: referralCode }),
    });
  }

  async requestAuthOtp(data: { phone: string }) {
    return this.request<{ message: string; dev_code?: string }>(
      "/auth/send-register-otp",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  async verifyAuthOtp(data: { phone: string; otp: string }) {
    return this.request<{ verified: boolean; phone: string }>(
      "/auth/verify-register-otp",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  async getMe() {
    return this.request<any>("/auth/me");
  }

  async updateProfile(data: any) {
    return this.request<any>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(password: string) {
    const result = await this.request<any>("/auth/account", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    });
    this.setToken(null);
    await AsyncStorage.multiRemove([
      "access_token",
      "worker_token",
      "worker_data",
    ]);
    return result;
  }

  async getCatalogProducts(adminId?: string, category?: string) {
    const params = new URLSearchParams();

    if (adminId) params.append("admin_id", adminId);
    if (category) params.append("category", category);
    params.append("_ts", Date.now().toString());

    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<any[]>(`/catalog/products${query}`);
  }

  async getProducts(adminId?: string, category?: string) {
    const params = new URLSearchParams();

    if (adminId) params.append("admin_id", adminId);
    if (category) params.append("category", category);

    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<any[]>(`/products${query}`);
  }

  async getCustomerAppSettings() {
    return this.request<CustomerAppSettings>("/app-settings/catalog");
  }

  async getAdminAppSettings() {
    return this.request<CustomerAppSettings>("/app-settings/admin");
  }

  async saveAdminAppSettings(data: CustomerAppSettings) {
    return this.request<CustomerAppSettings>("/app-settings/admin", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getInvoiceTemplate() {
    return this.request<InvoiceTemplateSettings>("/invoices/admin/template");
  }

  async saveInvoiceTemplate(data: InvoiceTemplateSettings) {
    return this.request<InvoiceTemplateSettings>("/invoices/admin/template", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getCatalogOrderCutoffs(adminId?: string) {
    const query = adminId ? `?admin_id=${encodeURIComponent(adminId)}` : "";
    return this.request<OrderCutoffRule[]>(`/order-cutoffs/catalog${query}`, {
      silentErrorLog: true,
    });
  }

  async getAdminOrderCutoffs() {
    return this.request<any[]>("/order-cutoffs/admin");
  }

  async createAdminOrderCutoff(data: {
    product_id?: string | null;
    cutoff_time?: string;
    start_time?: string;
    end_time?: string;
    schedule_type?: string;
    days?: number[];
    is_active: boolean;
  }) {
    return this.request<any>("/order-cutoffs/admin", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAdminOrderCutoff(
    cutoffId: string,
    data: {
      product_id?: string | null;
      cutoff_time?: string;
      start_time?: string;
      end_time?: string;
      schedule_type?: string;
      days?: number[];
      is_active: boolean;
    },
  ) {
    return this.request<any>(`/order-cutoffs/admin/${cutoffId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteAdminOrderCutoff(cutoffId: string) {
    return this.request<any>(`/order-cutoffs/admin/${cutoffId}`, {
      method: "DELETE",
    });
  }

  async getAdminDeliveryWindows() {
    return this.request<any[]>("/delivery-windows/admin");
  }

  async getCatalogDeliveryWindows(adminId?: string) {
    const query = adminId
      ? `?${new URLSearchParams({ admin_id: adminId }).toString()}`
      : "";
    return this.request<any[]>(`/delivery-windows/catalog${query}`, {
      silentErrorLog: true,
      timeoutMs: 8_000,
    });
  }

  async createAdminDeliveryWindow(data: {
    product_id?: string | null;
    start_time: string;
    end_time: string;
    is_active: boolean;
  }) {
    return this.request<any>("/delivery-windows/admin", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAdminDeliveryWindow(
    windowId: string,
    data: {
      product_id?: string | null;
      start_time: string;
      end_time: string;
      is_active: boolean;
    },
  ) {
    return this.request<any>(`/delivery-windows/admin/${windowId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteAdminDeliveryWindow(windowId: string) {
    return this.request<any>(`/delivery-windows/admin/${windowId}`, {
      method: "DELETE",
    });
  }

  async getProduct(id: string) {
    return this.request<any>(`/products/${id}`);
  }

  async getCategories() {
    return this.request<any[]>("/categories");
  }

  async addContent(data: {
    title: string;
    description: string;
    images: string[];
  }) {
    return this.request<any>("/content/addContent", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getContent() {
    return this.request<any>("/content/getContent");
  }

  async getCatalogContent() {
    return this.request<any>("/catalog/content");
  }

  async updateContent(
    contentId: string,
    data: {
      title: string;
      description: string;
      images: string[];
      is_active: boolean;
      updated_at: string;
    },
  ) {
    return this.request<any>(`/content/updateContent/${contentId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async toggleContentStatus(contentId: string) {
    return this.request<any>(`/content/toggleStatus/${contentId}`, {
      method: "PUT",
    });
  }

  async deleteContent(contentId: string) {
    return this.request<any>(`/content/deleteContent/${contentId}`, {
      method: "DELETE",
    });
  }

  async createPaymentQr(data: { file: any; label: string }) {
    const formData = new FormData();
    formData.append("file", data.file as any);
    formData.append("label", data.label);
    return this.requestFormData<any>("/wallet/payment-qr", formData, "POST");
  }

  async updatePaymentQr(data: { file: any; label: string }) {
    const formData = new FormData();
    formData.append("file", data.file as any);
    formData.append("label", data.label);
    return this.requestFormData<any>("/wallet/payment-qr", formData, "PUT");
  }

  async getMyPaymentQr() {
    return this.request<any>("/wallet/payment-qr/mine");
  }

  async getPaymentQr() {
    return this.request<any>("/wallet/payment-qr");
  }

  async getAdminRechargeRequests(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request<any[]>(`/admin/recharge-requests${query}`);
  }

  async updateRechargeRequest(
    requestId: string,
    data: { status: string; note: string },
  ) {
    return this.request<any>(`/admin/recharge-requests/${requestId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getSubscriptions() {
    return this.request<any[]>("/subscriptions");
  }

  async getSubscriptionHistory() {
    return this.request<any[]>("/subscriptions/history");
  }

  async downloadOrderInvoice(orderId: string) {
    return this.request<InvoiceDownloadPayload>(
      `/invoices/order/${orderId}/download`,
    );
  }

  async downloadSubscriptionInvoice(subscriptionId: string) {
    return this.request<InvoiceDownloadPayload>(
      `/invoices/subscription/${subscriptionId}/download`,
    );
  }

  async createSubscription(data: {
    items: Array<{
      product_id: string;
      quantity: number;
      price: number;
      amount: number;
    }>;
    pattern: string;
    custom_days: number[] | null;
    start_date: string;
    end_date?: string | null;
    delivery_slot: string;
    payment_method?: "wallet" | "cash_on_delivery" | "online";
    payment_status?: string | null;
    payment_intent_id?: string | null;
    razorpay_order_id?: string | null;
    razorpay_payment_id?: string | null;
  }) {
    const payload = {
      ...data,
      end_date: data.end_date ?? null, // ← FIX: always null, never undefined
    };
    return this.request<any>("/subscriptions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async createSubscriptionRazorpayOrder(
    data: Parameters<ApiService["createSubscription"]>[0],
  ) {
    return this.request<{
      key_id: string;
      order_id: string;
      amount: number;
      currency: string;
      receipt: string;
      name: string;
      description: string;
    }>("/subscriptions/razorpay/order", {
      method: "POST",
      body: JSON.stringify({ ...data, payment_method: "online" }),
    });
  }

  async verifySubscriptionRazorpayPayment(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    return this.request<any>("/subscriptions/razorpay/verify", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async placeCartOrders(
    items: Array<{
      product_id: string;
      quantity: number;
      price: number;
      amount: number;
    }>,
    deliveryDate: string,
    deliverySlot: string = "morning",
  ): Promise<number> {
    let placed = 0;
    for (const item of items) {
      await this.createSubscription({
        items: [item],
        pattern: "buy_once",
        custom_days: null,
        start_date: deliveryDate,
        end_date: deliveryDate, // explicit — never undefined
        delivery_slot: deliverySlot,
      });
      placed++;
    }
    return placed;
  }

  async placeCartAsSingleOrder(
    items: Array<{
      product_id: string;
      quantity: number;
      price: number;
      amount: number;
    }>,
    deliveryDate: string,
    deliverySlot: string = "morning",
  ): Promise<any> {
    return this.createSubscription({
      items,
      pattern: "buy_once",
      custom_days: null,
      start_date: deliveryDate,
      end_date: deliveryDate,
      delivery_slot: deliverySlot,
    });
  }

  async updateSubscription(id: string, data: any) {
    return this.request<any>(`/subscriptions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async modifySubscriptionDate(id: string, date: string, quantity: number) {
    return this.request<any>(`/subscriptions/${id}/modify`, {
      method: "POST",
      body: JSON.stringify({ date, quantity }),
    });
  }

  async cancelSubscription(id: string) {
    return this.request<any>(`/subscriptions/${id}`, {
      method: "DELETE",
    });
  }

  //added by anurag
  async cancelOrder(orderId: string) {
    return this.request<any>(`/orders/${orderId}`, {
      method: "DELETE",
    });
  }

  // anurag
  // Fetch ONLY subscriptions that belong to this logged-in admin
  async getAdminSubscriptionsAll(): Promise<any[]> {
    // hits GET /subscriptions/admin/all (the new backend route)
    return this.request<any[]>(`/subscriptions/admin/all`);
  }

  async getAdminVacationsAll(): Promise<any[]> {
    return this.request<any[]>(`/subscriptions/admin/vacations`);
  }

  // Per-date order status for a subscription — used to render the
  // delivery calendar (checkmark on delivered dates) in the admin app. by goluu
  async getAdminSubscriptionOrders(
    subscriptionId: string,
  ): Promise<{ delivery_date: string; status: string }[]> {
    return this.request<{ delivery_date: string; status: string }[]>(
      `/admin/orders/subscription/${subscriptionId}`,
    );
  }

  async getVacations() {
    return this.request<any[]>("/subscriptions/vacations");
  }

  async createVacation(startDate: string, endDate: string) {
    return this.request<any>("/subscriptions/vacations", {
      method: "POST",
      body: JSON.stringify({ start_date: startDate, end_date: endDate }),
    });
  }

  async deleteVacation(id: string) {
    return this.request<any>(`/subscriptions/vacations/${id}`, {
      method: "DELETE",
    });
  }
  async getWallet() {
    return this.request<any>("/wallet");
  }

  async getWalletTransactions() {
    return this.request<any[]>("/wallet/transactions");
  }

  async rechargeWallet(amount: number) {
    return this.request<any>("/wallet/recharge", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  }

  async createRazorpayWalletRechargeOrder(amount: number) {
    return this.request<{
      key_id: string;
      order_id: string;
      amount: number;
      currency: string;
      receipt: string;
      name: string;
      description: string;
    }>("/wallet/razorpay/recharge-order", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  }

  async verifyRazorpayWalletRecharge(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    return this.request<{
      message: string;
      new_balance: number;
      status: string;
    }>("/wallet/razorpay/verify-recharge", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getRazorpaySettlementSummary() {
    return this.request<any>("/wallet/razorpay/settlements/summary", {
      silentErrorLog: true,
    });
  }

  async getRazorpayLinkedAccount() {
    return this.request<{
      configured: boolean;
      linked_account_id: string | null;
      label: string | null;
      updated_at?: string;
    }>("/wallet/razorpay/account");
  }

  async saveRazorpayLinkedAccount(data: {
    linked_account_id: string;
    label?: string;
  }) {
    return this.request<any>("/wallet/razorpay/account", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async createRechargeRequest(data: { amount: number; reference: string }) {
    return this.request<any>("/wallet/recharge-request", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getRechargeRequests() {
    return this.request<any[]>("/wallet/recharge-requests");
  }

  async getOrders() {
    return this.request<any[]>("/delivery/my-orders", {
      timeoutMs: 60_000,
    });
  }

  async getCustomerOrders() {
    return this.request<any[]>("/orders", {
      timeoutMs: 60_000,
    });
  }

  async getOrder(id: string) {
    return this.request<any>(`/orders/${id}`);
  }

  async getTomorrowPreview() {
    return this.request<any>("/orders/tomorrow/preview");
  }

  async checkin() {
    return this.request<any>("/delivery/checkin", { method: "POST" });
  }

  async checkout() {
    return this.request<any>("/delivery/checkout", { method: "POST" });
  }

  async getTodayDeliveries() {
    return this.request<any[]>("/delivery/today");
  }

  async getAvailableOrders() {
    return this.request<any[]>("/delivery/available");
  }

  async getMyOrders() {
    return this.request<any[]>("/delivery/my-orders");
  }

  async acceptOrder(orderId: string) {
    return this.request<any>(`/delivery/orders/${orderId}/accept`, {
      method: "POST",
    });
  }

  // Keep reject separate for the rider app, using worker_token
  async rejectOrder(orderId: string) {
    const token = await AsyncStorage.getItem("worker_token"); // ← rider token
    const response = await fetch(
      `${API_BASE}/api/delivery/orders/${orderId}/reject`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Reject failed");
    return data;
  }

  async updateOrderStatus(orderId: string, status: string) {
    const response = await fetch(`${API_BASE}/api/delivery/status-update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await AsyncStorage.getItem("access_token")}`,
      },
      body: JSON.stringify({ order_id: orderId, status }),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(data.detail || "Status update failed");
    return data;
  }

  async verifyPickupOtp(orderId: string, otp: string) {
    return this.request<any>(`/delivery/orders/${orderId}/verify-pickup-otp`, {
      method: "POST",
      body: JSON.stringify({ otp }),
    });
  }

  async verifyDeliveryOtp(orderId: string, otp: string) {
    return this.request<any>(
      `/delivery/orders/${orderId}/verify-delivery-otp`,
      {
        method: "POST",
        body: JSON.stringify({ otp }),
      },
    );
  }

  async completeDelivery(orderId: string, proofImage?: string) {
    return this.request<any>("/delivery/complete", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId, proof_image: proofImage }),
    });
  }

  async getCheckinStatus() {
    return this.request<any>("/delivery/status");
  }

  async getAdminDashboard() {
    return this.request<any>("/admin/dashboard");
  }

  async getProcurement() {
    return this.request<any>("/admin/procurement");
  }

  async getAllUsers(role?: string) {
    const params = role ? `?role=${role}` : "";
    return this.request<any[]>(`/admin/users${params}`);
  }

  async getAdminDeliveryPartners() {
    return this.request<any[]>("/admin/delivery-partners");
  }

  async createDeliveryPartner(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    zone?: string;
  }) {
    return this.request<any>("/admin/delivery-partners", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateDeliveryPartner(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      password: string;
      phone: string;
      zone: string;
      is_active: boolean;
      is_verified: boolean;
    }>,
  ) {
    return this.request<any>(`/admin/delivery-partners/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteDeliveryPartner(id: string) {
    return this.request<{ success: boolean; id: string }>(
      `/admin/delivery-partners/${id}`,
      { method: "DELETE" },
    );
  }

  async assignZone(userId: string, zone: string) {
    return this.request<any>(`/admin/users/${userId}/zone`, {
      method: "PUT",
      body: JSON.stringify({ partner_id: userId, zone }),
    });
  }

  async updateStock(productId: string, quantity: number) {
    return this.request<any>(`/admin/products/${productId}/stock`, {
      method: "PUT",
      body: JSON.stringify({ product_id: productId, quantity }),
    });
  }

  async getAllOrders(status?: string, date?: string) {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (date) params.append("date", date);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<any[]>(`/admin/orders${query}`, { timeoutMs: 60_000 });
  }

  async adminCancelOrder(orderId: string) {
    return this.request<any>(`/admin/orders/${orderId}/cancel`, {
      method: "PATCH",
    });
  }

  async updateAdminOrderStatus(orderId: string, status: string) {
    return this.request<any>(`/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  async bulkUpdateAdminOrderStatus(orderIds: string[], status: string) {
    const results: any[] = [];
    for (const orderId of orderIds) {
      results.push(await this.updateAdminOrderStatus(orderId, status));
    }
    return { updated: results.length, failed: 0, results };
  }

  // Recurring subscriptions whose customers are tagged to this rider
  async getAssignedSubscriptions(): Promise<any[]> {
    return this.request<any[]>("/subscriptions/delivery/assigned");
  }

  // Per-date delivered/pending status for a batch of subscriptions —
  // used to render the delivery calendar in the rider app. by golu
  async getSubscriptionOrdersBulk(
    subscriptionIds: string,
  ): Promise<Record<string, Record<string, string>>> {
    return this.request<Record<string, Record<string, string>>>(
      `/delivery/subscription-orders?subscription_ids=${encodeURIComponent(subscriptionIds)}`,
    );
  }

  async assignDeliveryPartner(orderId: string, partnerId: string) {
    return this.request<any>(
      `/admin/orders/${orderId}/assign?partner_id=${partnerId}`,
      {
        method: "PUT",
      },
    );
  }

  async updateAdminSubscriptionStatus(subscriptionId: string, status: string) {
    return this.request<any>(`/subscriptions/admin/${subscriptionId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  async bulkUpdateAdminSubscriptionStatus(
    subscriptionIds: string[],
    status: string,
  ) {
    const results: any[] = [];
    for (const subscriptionId of subscriptionIds) {
      results.push(
        await this.updateAdminSubscriptionStatus(subscriptionId, status),
      );
    }
    return { updated: results.length, failed: 0, results };
  }

  async cancelUserOrder(orderId: string) {
    return this.request<{
      success: boolean;
      message: string;
      order_id: string;
    }>(`/orders/${orderId}`, { method: "DELETE" });
  }

  async getFinanceReport(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<any>(`/admin/finance${query}`);
  }

  async processRefund(userId: string, amount: number, reason: string) {
    return this.request<any>(
      `/admin/refund?user_id=${userId}&amount=${amount}&reason=${encodeURIComponent(reason)}`,
      {
        method: "POST",
      },
    );
  }

  async generateOrders() {
    return this.request<any>("/admin/generate-orders", { method: "POST" });
  }

  async createProduct(data: any) {
    return this.request<any>("/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getAdmins() {
    return this.request<any[]>("/catalog/admins");
  }

  async updateProduct(id: string, data: any) {
    return this.request<any>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }


  async updateProductPrices(
    updates: Array<{ product_id: string; price: number }>,
  ) {
    return this.request<any>("/products/prices/bulk", {
      method: "PUT",
      body: JSON.stringify({ updates }),
    });
  }

  async deleteProduct(id: string) {
    return this.request<any>(`/products/${id}`, {
      method: "DELETE",
    });
  }

  async seedData() {
    return this.request<any>("/seed", { method: "POST" });
  }

  async createCow(data: any) {
    return this.request<any>("/gausevak/cows", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getCows(search?: string) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);

    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<any[]>(`/gausevak/cows${query}`);
  }

  async updateCow(
    id: string,
    data: Partial<{
      tag: string;
      name: string;
      breed: string;
      weight: string;
      father: string;
      size: string;
      boughtDate: string;
      bornDate: string;
      isActive: boolean;
      isSold: boolean;
      type: string;
      milkActive: boolean; // ← ADD THIS
      qrLinkedData: string;
      isBarcodeLinked: boolean;
      farmLocationId: string;
      farmLocationLabel: string;
      transferLocationId: string;
      transferLocationLabel: string;
    }>,
  ) {
    return this.request<any>(`/gausevak/cows/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCow(id: string) {
    return this.request<any>(`/gausevak/cows/${id}`, {
      method: "DELETE",
    });
  }

  //cow gneder and new born promotion by anurag
  async promoteNewbornCow(id: string) {
    return this.request<any>(`/gausevak/cows/${id}/promote`, {
      method: "PATCH",
    });
  }

  // async promoteCowToMature(id: string) {
  //   return this.request<any>(`/gausevak/cows/${id}/promote-to-mature`, {
  //     method: "PATCH",
  //   });
  // }

  async createInsemination(data: {
    cowSrNo: string;
    cowName: string;
    inseminationDate: string;
    pregnancyStatus: boolean;
    pdDone: boolean;
    pregnancyStatusDate?: string;
    doctorName?: string;
    actualCalvingDate?: string;
    heatAfterCalvingDate?: string;
  }) {
    return this.request<any>("/gausevak/inseminations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getInseminations(search?: string) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<any[]>(`/gausevak/inseminations${query}`);
  }

  async updateInsemination(
    id: string,
    data: Partial<{
      cowSrNo: string;
      cowName: string;
      inseminationDate: string;
      pregnancyStatus: boolean;
      pdDone: boolean;
      pregnancyStatusDate: string;
      doctorName: string;
      actualCalvingDate: string;
      heatAfterCalvingDate: string;
    }>,
  ) {
    return this.request<any>(`/gausevak/inseminations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteInsemination(id: string) {
    return this.request<any>(`/gausevak/inseminations/${id}`, {
      method: "DELETE",
    });
  }

  async createSemenRecord(data: {
    bullSrNo: string;
    bullName?: string;
    breed?: string;
    femalCalves: number;
    maleCalves: number;
    damaged: number;
    conceptionCount: number;
    totalDoses: number;
    notes?: string;
  }) {
    return this.request<any>("/gausevak/semen", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getSemenRecords(search?: string) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<any[]>(`/gausevak/semen${query}`);
  }

  async updateSemenRecord(
    id: string,
    data: Partial<{
      bullSrNo: string;
      bullName: string;
      breed: string;
      femalCalves: number;
      maleCalves: number;
      damaged: number;
      conceptionCount: number;
      totalDoses: number;
      notes: string;
    }>,
  ) {
    return this.request<any>(`/gausevak/semen/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteSemenRecord(id: string) {
    return this.request<any>(`/gausevak/semen/${id}`, {
      method: "DELETE",
    });
  }

  async createMedicalRecord(data: {
    cowSrNo: string;
    cowName?: string;
    cowAge?: string;
    currentStatus: string;
    lastVaccinationDate?: string;
    nextVaccinationDate?: string;
    vaccinationName?: string;
    lastIssueName?: string;
    lastIssueDate?: string;
    currentIssueName?: string;
    currentIssueDate?: string;
    treatmentGiven?: string;
    doctorName?: string;
    medicineName?: string;
    notes?: string;
    lastDewormingDate?: string;
    nextDewormingDate?: string;
    dewormingMedicine?: string;
  }) {
    return this.request<any>("/gausevak/medical", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMedicalRecords(search?: string, status?: string) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<any[]>(`/gausevak/medical${query}`);
  }

  async updateMedicalRecord(
    id: string,
    data: Partial<{
      cowSrNo: string;
      cowName: string;
      cowAge: string;
      currentStatus: string;
      lastVaccinationDate: string;
      nextVaccinationDate: string;
      vaccinationName: string;
      lastIssueName: string;
      lastIssueDate: string;
      currentIssueName: string;
      currentIssueDate: string;
      treatmentGiven: string;
      doctorName: string;
      medicineName: string;
      notes: string;
    }>,
  ) {
    return this.request<any>(`/gausevak/medical/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteMedicalRecord(id: string) {
    return this.request<any>(`/gausevak/medical/${id}`, {
      method: "DELETE",
    });
  }

  async adminSetHealth(
    cowId: string,
    status: string,
    cowName?: string,
    cowTag?: string,
  ) {
    return this.request<any>(`/admin/health/${cowId}`, {
      method: "PUT",
      body: JSON.stringify({ status, cow_name: cowName, cow_tag: cowTag }),
    });
  }

  async getFeedLogs(date: string, shift: "morning" | "evening") {
    return this.request<any[]>(`/worker/feed?date=${date}&shift=${shift}`);
  }

  async markFed(data: {
    cow_id: string;
    cow_name: string;
    cow_tag: string;
    date: string;
    shift: "morning" | "evening";
  }) {
    return this.request<any>("/worker/feed", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async unmarkFed(cow_id: string, date: string, shift: "morning" | "evening") {
    return this.request<any>(
      `/worker/feed?cow_id=${cow_id}&date=${date}&shift=${shift}`,
      { method: "DELETE" },
    );
  }

  async getAdminFeedLogs(date?: string, shift?: "morning" | "evening") {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    if (shift) params.append("shift", shift);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<{ summary: any; cows: any[] }>(`/admin/feed${query}`);
  }

  async getAdminMilkLogs(date?: string) {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<{
      date: string;
      summary: {
        total_morning: number;
        total_evening: number;
        grand_total: number;
        active_cows: number;
        total_cows: number;
      };
      cows: Array<{
        cow_id: string;
        cow_name: string;
        cow_tag: string;
        breed: string;
        morning_liters: number;
        morning_worker: string | null;
        evening_liters: number;
        evening_worker: string | null;
        total_liters: number;
        date: string;
      }>;
    }>(`/admin/milk${query}`);
  }

  async getAdminHealthLogs(date?: string) {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<any>(`/admin/health${query}`);
  }

  async getWorkerHealthLogs(date?: string) {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<any[]>(`/worker/health${query}`);
  }

  async getAdminWorkers() {
    return this.request<any[]>("/admin/workers");
  }

  async createWorker(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    designation?: string;
    farm_name?: string;
    farm_location_id?: string;
  }) {
    return this.request<any>("/admin/workers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getAdminCustomers(params?: {
    zone?: string;
    is_active?: boolean;
    search?: string;
    linked?: boolean;
    skip?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.zone) searchParams.append("zone", params.zone);
    if (typeof params?.is_active === "boolean") {
      searchParams.append("is_active", String(params.is_active));
    }
    if (params?.search) searchParams.append("search", params.search);
    if (typeof params?.linked === "boolean") {
      searchParams.append("linked", String(params.linked));
    }
    if (typeof params?.skip === "number") {
      searchParams.append("skip", String(params.skip));
    }
    if (typeof params?.limit === "number") {
      searchParams.append("limit", String(params.limit));
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<any[]>(`/admin/customers${query}`);
  }

  async getAdminCustomer(customerId: string) {
    return this.request<any>(`/admin/customers/${customerId}`);
  }

  async createAdminCustomer(data: {
    name: string;
    phone?: string;
    email?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      landmark?: string;
      lat?: number;
      lng?: number;
    };
    zone?: string;
    notes?: string;
    delivery_partner_id?: string;
  }) {
    return this.request<any>("/admin/customers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAdminCustomer(
    customerId: string,
    data: Partial<{
      name: string;
      phone: string;
      email: string;
      address: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        pincode?: string;
        landmark?: string;
        lat?: number;
        lng?: number;
      };
      zone: string;
      notes: string;
      delivery_partner_id: string;
      is_active: boolean;
    }>,
  ) {
    return this.request<any>(`/admin/customers/${customerId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteAdminCustomer(customerId: string, hard = false) {
    const suffix = hard ? "?hard=true" : "";
    return this.request<any>(`/admin/customers/${customerId}${suffix}`, {
      method: "DELETE",
    });
  }

  async approveCustomerClaim(customerId: string) {
    return this.request<any>(`/admin/customers/${customerId}/approve-claim`, {
      method: "POST",
    });
  }

  async rejectCustomerClaim(customerId: string) {
    return this.request<any>(`/admin/customers/${customerId}/reject-claim`, {
      method: "POST",
    });
  }

  async getAdminExtraTasks(params?: {
    date?: string;
    status?: "pending" | "verified" | "rejected";
  }) {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.append("date", params.date);
    if (params?.status) searchParams.append("status", params.status);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<{
      date: string;
      total: number;
      pending: number;
      verified: number;
      rejected: number;
      tasks: any[];
    }>(`/admin/extra-tasks${query}`);
  }

  async verifyAdminExtraTask(
    taskId: string,
    action: "approve" | "reject",
    note?: string,
  ) {
    const searchParams = new URLSearchParams();
    searchParams.append("action", action);
    if (note?.trim()) searchParams.append("note", note.trim());
    return this.request<{
      success: boolean;
      task_id: string;
      new_status: "verified" | "rejected";
      points_awarded: boolean;
      points: number;
    }>(`/admin/extra-tasks/${taskId}/verify?${searchParams.toString()}`, {
      method: "POST",
    });
  }

  async awardAdminBonusPoints(data: {
    worker_id: string;
    points: number;
    note?: string;
  }) {
    return this.request<{
      success: boolean;
      points_awarded: number;
    }>("/admin/points/bonus", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAdminFeedDetails(
    cowId: string,
    date: string,
    shift: string,
    feeds: FeedItem[],
    saveAsDefault = false,
  ) {
    const params = new URLSearchParams({ date, shift });
    return this.request<any>(`/admin/feed/${cowId}?${params.toString()}`, {
      method: "PUT",
      body: JSON.stringify({
        feeds,
        save_as_default: saveAsDefault,
      }),
    });
  }

  async getCowDefaultFeed(cowId: string) {
    return this.request<{
      cow_id: string;
      morning_feeds: FeedItem[];
      evening_feeds: FeedItem[];
    }>(`/gausevak/cows/${cowId}/default-feed`);
  }

  async setCowDefaultFeed(
    cowId: string,
    morningFeeds: FeedItem[],
    eveningFeeds: FeedItem[],
  ) {
    return this.request<any>(`/gausevak/cows/${cowId}/default-feed`, {
      method: "PUT",
      body: JSON.stringify({
        morning_feeds: morningFeeds,
        evening_feeds: eveningFeeds,
      }),
    });
  }

  async getCowCapacity(cowId: string) {
    return this.request<{
      cow_id: string;
      daily_capacity_liters: number | null;
    }>(`/gausevak/cows/${cowId}/capacity`);
  }

  async setCowCapacity(cowId: string, dailyCapacityLiters: number) {
    return this.request<{
      success: boolean;
      cow_id: string;
      daily_capacity_liters: number;
    }>(`/gausevak/cows/${cowId}/capacity`, {
      method: "PUT",
      body: JSON.stringify({ daily_capacity_liters: dailyCapacityLiters }),
    });
  }

  async deleteCowCapacity(cowId: string) {
    return this.request<{
      success: boolean;
      cow_id: string;
    }>(`/gausevak/cows/${cowId}/capacity`, {
      method: "DELETE",
    });
  }

  async getCowMilkHistory(cowId: string, days: number = 90) {
    return this.request<{
      cow_id: string;
      history: Array<{
        date: string;
        morning: number;
        evening: number;
        total: number;
      }>;
      peak: { date: string; total: number } | null;
    }>(`/gausevak/cows/${cowId}/milk-history?days=${days}`);
  }

  async getMilkDashboard(date?: string) {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<{
      date: string;
      summary: {
        total_morning: number;
        total_evening: number;
        grand_total: number;
        active_cows: number;
        total_cows: number;
      };
      cows: Array<{
        cow_id: string;
        cow_name: string;
        cow_tag: string;
        breed: string;
        morning_liters: number;
        morning_worker: string | null;
        evening_liters: number;
        evening_worker: string | null;
        total_liters: number;
        daily_capacity_liters: number | null;
        peak: { date: string; total: number } | null;
        date: string;
      }>;
    }>(`/admin/milk/dashboard${query}`);
  }

  async updateBullSemen(
    bullId: string,
    data: {
      totalDoses?: number;
      semenAvailable?: boolean;
      lastUsedDate?: string;
      successRate?: number;
    },
  ) {
    return this.request<any>(`/gausevak/bulls/${bullId}/semen`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async useBullSemen(bullId: string, dosesUsed: number = 1) {
    return this.request<{ remaining_doses: number; semenAvailable: boolean }>(
      `/gausevak/bulls/${bullId}/use-semen?doses_used=${dosesUsed}`,
      { method: "POST" },
    );
  }

  async generateCowQR(cowId: string) {
    return this.request<any>(`/gausevak/cows/${cowId}/qr`, {
      method: "POST",
    });
  }

  async linkQRToCow(
    cowId: string,
    qrData: string,
    isBarcodeLinked: boolean = false,
  ) {
    return this.updateCow(cowId, {
      qrLinkedData: qrData,
      isBarcodeLinked,
    });
  }

  // Authentication

  async verifyFirebaseToken(idToken: string) {
    return this.request<any>("/auth/verify-firebase", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    });
  }

  //Worker Apis-------------------
  async workerGetCows() {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(`${API_BASE}/api/worker/cows`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Failed to fetch cows");
    return data;
  }

  async workerGetTodayHealthLogs() {
    const today = new Date().toISOString().split("T")[0];
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(
      `${API_BASE}/api/worker/health?date=${today}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch health logs");
    return data;
  }

  async workerAddHealthLog(data: {
    cow_id: string;
    cow_name: string;
    cow_tag: string;
    status: string;
    date: string;
  }) {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(`${API_BASE}/api/worker/health`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.detail || "Failed to save health log");
    return result;
  }

  async workerGetTodayExtraTasks() {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(`${API_BASE}/api/worker/extra-tasks/today`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch extra tasks");
    return data;
  }

  async workerAddExtraTask(data: {
    task_type: string;
    description?: string;
    date: string;
    image_url?: string;
  }) {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(`${API_BASE}/api/worker/extra-tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.detail || "Failed to save extra task");
    return result;
  }

  async workerGetPoints() {
    const token = await AsyncStorage.getItem("worker_token");
    const endpoints = [
      `${API_BASE}/api/worker/points`,
      `${API_BASE}/api/worker/points/`,
      `${API_BASE}/worker/points`,
      `${API_BASE}/worker/points/`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const text = await response.text();
        const trimmed = text.trim();
        const data = trimmed
          ? (() => {
            try {
              return JSON.parse(trimmed);
            } catch {
              return null;
            }
          })()
          : null;

        if (response.ok && data) return data;
        if (response.status === 404) continue;

        if (!data && trimmed.startsWith("<")) {
          continue;
        }

        throw new Error(
          (data &&
            typeof data === "object" &&
            "detail" in data &&
            typeof data.detail === "string"
            ? data.detail
            : trimmed) || "Failed to fetch worker points",
        );
      } catch {
        continue;
      }
    }
    return null;
  }

  async workerDeleteExtraTask(taskId: string) {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(
      `${API_BASE}/api/worker/extra-tasks/${taskId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.detail || "Failed to delete extra task");
    return result;
  }

  async adminGetWorkerExtraTasks(workerId: string) {
    const token = await AsyncStorage.getItem("access_token"); // ← was 'admin_token'
    const response = await fetch(
      `${API_BASE}/api/admin/extra-tasks/${workerId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch worker extra tasks");
    return data.tasks;
  }

  async adminAddMilk(data: {
    cow_id: string;
    cow_name: string;
    cow_tag: string;
    quantity: number;
    shift: "morning" | "evening";
    date: string;
  }) {
    return this.request<any>("/admin/milk/entry", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async adminMarkFed(data: {
    cow_id: string;
    cow_name: string;
    cow_tag: string;
    date: string;
    shift: "morning" | "evening";
  }) {
    return this.request<any>("/admin/feed/mark", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async workerGetFeedStatus(date: string, shift: "morning" | "evening") {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(
      `${API_BASE}/api/worker/feed?date=${date}&shift=${shift}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch feed status");
    return data;
  }

  async workerMarkFed(data: {
    cow_id: string;
    cow_name: string;
    cow_tag: string;
    date: string;
    shift: "morning" | "evening";
  }) {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(`${API_BASE}/api/worker/feed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || "Failed to mark fed");
    return result;
  }

  async workerUnmarkFed(
    cow_id: string,
    date: string,
    shift: "morning" | "evening",
  ) {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(
      `${API_BASE}/api/worker/feed?cow_id=${cow_id}&date=${date}&shift=${shift}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || "Failed to unmark fed");
    return result;
  }

  async workerGetShiftStatus() {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(`${API_BASE}/api/worker/milk/shift-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch shift status");
    return data;
  }

  async workerGetTodayMilk() {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(`${API_BASE}/api/worker/milk/today`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch today milk");
    return data;
  }

  async workerAddMilk(data: {
    cow_id: string;
    cow_name: string;
    cow_tag: string;
    quantity: number;
    shift: "morning" | "evening";
    date: string;
    notes?: string;
  }) {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(`${API_BASE}/api/worker/milk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.detail || "Failed to save milk entry");
    return result;
  }

  //worker undo milk log by anurag
  async workerDeleteMilkEntry(entryId: string): Promise<{
    success: boolean;
    deleted_entry: {
      id: string;
      cow_id: string;
      cow_name: string;
      cow_tag: string;
      quantity: number;
      shift: "morning" | "evening";
      date: string;
      worker_name: string;
    };
  }> {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(`${API_BASE}/api/worker/milk/${entryId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.detail || "Failed to delete milk entry");
    return result;
  }

  async workerLogin(identifier: string, password: string) {
    const response = await fetch(`${API_BASE}/api/worker/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identifier, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Worker login failed");

    await AsyncStorage.setItem("worker_token", data.access_token);
    await AsyncStorage.setItem("worker_data", JSON.stringify(data.worker));

    return data;
  }

  async workerLogout() {
    await AsyncStorage.removeItem("worker_token");
    await AsyncStorage.removeItem("worker_data");
  }
  async workerGetMe() {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(`${API_BASE}/api/worker/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch worker profile");
    return data; // includes farm_name, name, email, etc.
  }

  async checkDuplicate(
    field: "email" | "phone",
    value: string,
  ): Promise<boolean> {
    try {
      const data = await this.request<{ exists: boolean }>(
        "/auth/check-duplicate",
        {
          method: "POST",
          body: JSON.stringify({ field, value }),
        },
      );
      return !!data.exists;
    } catch {
      // Fail open — don't block the user on a network hiccup.
      return false;
    }
  }

  async forgotPassword(email: string) {
    return this.request<any>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(email: string, reset_code: string, new_password: string) {
    return this.request<any>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, reset_code, new_password }),
    });
  }

  async updateWorker(
    id: string,
    data: Partial<{
      name: string;
      phone: string;
      designation: string;
      farm_name: string;
      farm_location_id: string;
      is_active: boolean;
      password: string;
    }>,
  ) {
    return this.request<any>(`/admin/workers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  //worker id delete by anurag
  async deleteWorker(id: string) {
    return this.request<{ success: boolean; id: string }>(
      `/admin/workers/${id}`,
      {
        method: "DELETE",
      },
    );
  }

  //vet id delete pass eidt by anurag
  async deleteVeterinarian(id: string) {
    return this.request<{ success: boolean; id: string }>(
      `/admin/veterinarians/${id}`,
      { method: "DELETE" },
    );
  }

  async resetVeterinarianPassword(id: string, new_password: string) {
    return this.request<{ success: boolean; message: string }>(
      `/admin/veterinarians/${id}/password`,
      {
        method: "PATCH",
        body: JSON.stringify({ new_password }),
      },
    );
  }

  // ── Bank Account ─────────────────────────────────────────

  async getBankAccount() {
    return this.request<{
      accountHolderName: string;
      accountNumber: string;
      ifscCode: string;
      bankName: string;
      upiId?: string;
    }>("/wallet/bank-account", { silentErrorLog: true });
  }

  async saveBankAccount(data: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId?: string;
  }) {
    return this.request<any>("/wallet/bank-account", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ── Withdrawal ───────────────────────────────────────────

  async requestWithdrawal(amount: number) {
    return this.request<{
      message: string;
      withdrawal_id: string;
      amount: number;
      status: string;
    }>("/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  }

  async getWithdrawalHistory() {
    return this.request<
      Array<{
        id: string;
        amount: number;
        status: string; // "pending" | "processing" | "completed" | "rejected"
        created_at: string;
        bank_account: {
          bankName: string;
          accountNumber: string;
        };
      }>
    >("/wallet/withdrawals");
  }

  async createOrder(data: {
    product_id: string;
    quantity: number;
    pattern: string;
    custom_days: number[] | null;
    delivery_date: string;
  }) {
    return this.request<any>("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
  // ── Delivery Partner Zone Change ───────────────────────
  async requestZoneChange(reason?: string) {
    return this.request<any>("/delivery/request-zone-change", {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async getZoneRequestStatus() {
    return this.request<any>("/delivery/zone-request-status");
  }
  //------------------------------------------------------------//

  async getNotes(search?: string) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<
      Array<{
        id: string;
        admin_id: string;
        title: string;
        content: string;
        color: string;
        is_pinned: boolean;
        created_at: string;
        updated_at: string;
      }>
    >(`/notes/${query}`);
  }

  async createNote(data: { title: string; content: string; color?: string }) {
    return this.request<{
      id: string;
      admin_id: string;
      title: string;
      content: string;
      color: string;
      is_pinned: boolean;
      created_at: string;
      updated_at: string;
    }>("/notes/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateNote(
    id: string,
    data: Partial<{
      title: string;
      content: string;
      color: string;
      is_pinned: boolean;
    }>,
  ) {
    return this.request<{
      id: string;
      admin_id: string;
      title: string;
      content: string;
      color: string;
      is_pinned: boolean;
      created_at: string;
      updated_at: string;
    }>(`/notes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteNote(id: string) {
    return this.request<{ message: string; id: string }>(`/notes/${id}`, {
      method: "DELETE",
    });
  }

  async toggleNotePin(id: string) {
    return this.request<{ id: string; is_pinned: boolean }>(
      `/notes/${id}/pin`,
      {
        method: "PATCH",
      },
    );
  }

  async createInsurance(data: InsuranceCreate): Promise<Insurance> {
    return this.request<Insurance>("/gausevak/insurance", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getAllInsurances(params?: {
    status?: string;
    search?: string;
  }): Promise<Insurance[]> {
    const p = new URLSearchParams();
    if (params?.status) p.append("status", params.status);
    if (params?.search) p.append("search", params.search);
    const q = p.toString() ? `?${p.toString()}` : "";
    return this.request<Insurance[]>(`/gausevak/insurance${q}`);
  }

  async getCowInsurance(cowId: string): Promise<Insurance | null> {
    try {
      return await this.request<Insurance>(`/gausevak/cows/${cowId}/insurance`);
    } catch {
      return null;
    }
  }

  async updateInsurance(
    insuranceId: string,
    data: Partial<InsuranceCreate>,
  ): Promise<Insurance> {
    return this.request<Insurance>(`/gausevak/insurance/${insuranceId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteInsurance(
    insuranceId: string,
  ): Promise<{ message: string; id: string }> {
    return this.request(`/gausevak/insurance/${insuranceId}`, {
      method: "DELETE",
    });
  }

  async getExpiringInsurances(days: number = 30): Promise<Insurance[]> {
    return this.request<Insurance[]>(
      `/gausevak/insurance/expiring?days=${days}`,
    );
  }

  // --- Claim ---

  async updateInsuranceClaim(
    insuranceId: string,
    data: {
      claim_filed: boolean;
      claim_date?: string;
      claim_amount?: number;
      claim_status?: string;
      claim_notes?: string;
    },
  ): Promise<Insurance> {
    return this.request<Insurance>(`/gausevak/insurance/${insuranceId}/claim`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // --- Summary & Logs ---

  async getInsuranceSummary(): Promise<InsuranceSummary> {
    return this.request<InsuranceSummary>("/admin/insurance/summary");
  }

  async getInsuranceNotificationLogs(
    limit: number = 50,
  ): Promise<InsuranceNotificationLog[]> {
    return this.request<InsuranceNotificationLog[]>(
      `/admin/insurance/notifications?limit=${limit}`,
    );
  }

  // --- Notification Settings ---

  async getInsuranceNotificationSettings(): Promise<InsuranceNotificationSettings> {
    return this.request<InsuranceNotificationSettings>(
      "/admin/insurance/notification-settings",
    );
  }

  async updateInsuranceNotificationSettings(data: {
    notify_expiry?: boolean;
    notify_due?: boolean;
    notify_renewal?: boolean;
    notify_claim?: boolean;
    expiry_alert_days?: number;
    due_alert_days?: number;
    fcm_token?: string;
  }): Promise<InsuranceNotificationSettings> {
    return this.request<InsuranceNotificationSettings>(
      "/admin/insurance/notification-settings",
      { method: "PUT", body: JSON.stringify(data) },
    );
  }

  async registerFcmToken(
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.request(
      `/admin/insurance/register-fcm-token?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
      },
    );
  }

  async sendTestInsuranceNotification(): Promise<{
    success: boolean;
    tokens_count: number;
  }> {
    return this.request("/admin/insurance/send-test-notification", {
      method: "POST",
    });
  }
  // ── Veterinary APIs

  async getAdminVeterinarians() {
    return this.request<any[]>("/admin/veterinarians");
  }

  async createVeterinarian(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    specialization?: string;
    license_number?: string;
    farm_location_ids?: string[]; // ← was farm_location_id: string
    farm_location_labels?: string[]; // ← was farm_location_label: string
  }) {
    return this.request<any>("/admin/veterinarians", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateVeterinarian(
    id: string,
    data: Partial<{
      name: string;
      phone: string;
      specialization: string;
      license_number: string;
      is_active: boolean;
      farm_location_ids: string[]; // ← was farm_location_id: string
      farm_location_labels: string[]; // ← was farm_location_label: string
    }>,
  ) {
    return this.request<any>(`/admin/veterinarians/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async vetLogin(email: string, password: string) {
    const response = await fetch(`${API_BASE}/api/vet/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Vet login failed");
    await AsyncStorage.setItem("vet_token", data.access_token);
    await AsyncStorage.setItem("vet_data", JSON.stringify(data.vet));
    return data;
  }

  async vetLogout() {
    await AsyncStorage.removeItem("vet_token");
    await AsyncStorage.removeItem("vet_data");
  }

  async getVetMedicineRecords() {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/medicine-records`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch medicine records");
    return data;
  }

  async getVetMilkRecords() {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/milk-records`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch milk records");
    return data;
  }

  async getVetFeedRecords() {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/feed-records`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch feed records");
    return data;
  }

  async getVetHealthRecords() {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/health-records`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch health records");
    return data;
  }

  async vetUpdateHealth(data: {
    cow_id: string;
    cow_name: string;
    cow_tag: string;
    condition: string;
    date: string;
  }) {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/health-update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.detail || "Failed to update health status");
    return result;
  }

  async getVetInseminationRecords() {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/insemination-records`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch insemination records");
    return data;
  }

  async getVetSemenRecords() {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/semen-records`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch semen records");
    return data;
  }

  async vetGetCows() {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/cows`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Failed to fetch cows");
    return data;
  }

  async getAnimalMedicineRecords(animalId: string) {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(
      `${API_BASE}/api/vet/cow/${animalId}/medicine`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch medicine records");
    return data;
  }

  async getAnimalHealthRecords(animalId: string) {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/cow/${animalId}/health`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch health records");
    return data;
  }

  async getAnimalMilkRecords(animalId: string) {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/cow/${animalId}/milk`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch milk records");
    return data;
  }

  async getAnimalFeedRecords(animalId: string) {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/cow/${animalId}/feed`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch feed records");
    return data;
  }

  async updateMedicineRecord(
    recordId: string,
    data: Partial<{
      medicine_name: string;
      dosage: string;
      administered_by: string;
      notes: string;
      next_due: string;
    }>,
  ) {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(
      `${API_BASE}/api/vet/medicine-records/${recordId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      },
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.detail || "Failed to update medicine record");
    return result;
  }

  async getGausevakNotifications() {
    return this.request<any[]>("/gausevak/notifications");
  }

  async markGausevakNotifRead(id: string) {
    return this.request<any>(`/gausevak/notifications/${id}/read`, {
      method: "PATCH",
    });
  }

  async vetGetHealthLogs(date?: string) {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/health-records`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch health logs");
    // /vet/health-records returns ALL logs, not just today — filter client-side
    const target = date ?? new Date().toISOString().split("T")[0];
    return Array.isArray(data)
      ? data.filter((r: any) => (r.date || "").startsWith(target))
      : data;
  }

  async createMedicine(data: MedicineCreate): Promise<Medicine> {
    return this.request<Medicine>("/gausevak/medicines", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMedicines(params?: {
    search?: string;
    category?: string;
    low_stock?: boolean;
    expired?: boolean;
  }): Promise<Medicine[]> {
    const p = new URLSearchParams();
    if (params?.search) p.append("search", params.search);
    if (params?.category) p.append("category", params.category);
    if (params?.low_stock) p.append("low_stock", "true");
    if (params?.expired) p.append("expired", "true");
    const q = p.toString() ? `?${p.toString()}` : "";
    return this.request<Medicine[]>(`/gausevak/medicines${q}`);
  }

  async getMedicine(id: string): Promise<Medicine> {
    return this.request<Medicine>(`/gausevak/medicines/${id}`);
  }

  async getMedicineStockSummary(): Promise<MedicineStockSummary> {
    return this.request<MedicineStockSummary>("/gausevak/medicines/summary");
  }

  async updateMedicine(id: string, data: MedicineUpdate): Promise<Medicine> {
    return this.request<Medicine>(`/gausevak/medicines/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteMedicine(id: string): Promise<{ message: string; id: string }> {
    return this.request(`/gausevak/medicines/${id}`, { method: "DELETE" });
  }

  // ── Stock operations

  async restockMedicine(
    medicineId: string,
    data: StockPurchaseCreate,
  ): Promise<StockOperationResult> {
    return this.request<StockOperationResult>(
      `/gausevak/medicines/${medicineId}/purchase`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async useMedicine(data: MedicineUsageCreate): Promise<StockOperationResult> {
    return this.request<StockOperationResult>("/gausevak/medicines/use", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async adjustMedicineStock(
    medicineId: string,
    data: StockAdjustmentCreate,
  ): Promise<StockOperationResult> {
    return this.request<StockOperationResult>(
      `/gausevak/medicines/${medicineId}/adjust`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  // ── Transaction history

  async getMedicineTransactions(
    medicineId: string,
    params?: { limit?: number; transaction_type?: StockTransactionType },
  ): Promise<StockTransaction[]> {
    const p = new URLSearchParams();
    if (params?.limit) p.append("limit", String(params.limit));
    if (params?.transaction_type)
      p.append("transaction_type", params.transaction_type);
    const q = p.toString() ? `?${p.toString()}` : "";
    return this.request<StockTransaction[]>(
      `/gausevak/medicines/${medicineId}/transactions${q}`,
    );
  }

  async getAllMedicineTransactions(params?: {
    limit?: number;
    cow_id?: string;
    transaction_type?: StockTransactionType;
    date?: string; // YYYY-MM-DD
  }): Promise<StockTransaction[]> {
    const p = new URLSearchParams();
    if (params?.limit) p.append("limit", String(params.limit));
    if (params?.cow_id) p.append("cow_id", params.cow_id);
    if (params?.transaction_type)
      p.append("transaction_type", params.transaction_type);
    if (params?.date) p.append("date", params.date);
    const q = p.toString() ? `?${p.toString()}` : "";
    return this.request<StockTransaction[]>(
      `/gausevak/medicine-transactions${q}`,
    );
  }

  // ── medicine stock Alerts

  async getLowStockMedicines(): Promise<Medicine[]> {
    return this.request<Medicine[]>("/gausevak/medicines/alerts/low-stock");
  }

  async getExpiringMedicines(days = 30): Promise<Medicine[]> {
    return this.request<Medicine[]>(
      `/gausevak/medicines/alerts/expiring?days=${days}`,
    );
  }

  async createFeedStock(data: FeedStockCreate): Promise<FeedStock> {
    return this.request<FeedStock>("/gausevak/feed-stocks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getFeedStocks(params?: {
    search?: string;
    category?: string;
    low_stock?: boolean;
    expired?: boolean;
  }): Promise<FeedStock[]> {
    const p = new URLSearchParams();
    if (params?.search) p.append("search", params.search);
    if (params?.category) p.append("category", params.category);
    if (params?.low_stock) p.append("low_stock", "true");
    if (params?.expired) p.append("expired", "true");
    const q = p.toString() ? `?${p.toString()}` : "";
    return this.request<FeedStock[]>(`/gausevak/feed-stocks${q}`);
  }

  async getFeedStock(id: string): Promise<FeedStock> {
    return this.request<FeedStock>(`/gausevak/feed-stocks/${id}`);
  }

  async getFeedStockSummary(): Promise<FeedStockSummary> {
    return this.request<FeedStockSummary>("/gausevak/feed-stocks/summary");
  }

  async updateFeedStock(id: string, data: FeedStockUpdate): Promise<FeedStock> {
    return this.request<FeedStock>(`/gausevak/feed-stocks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteFeedStock(id: string): Promise<{ message: string; id: string }> {
    return this.request(`/gausevak/feed-stocks/${id}`, { method: "DELETE" });
  }

  // ── Stock operations

  async restockFeedStock(
    feedStockId: string,
    data: FeedStockPurchaseCreate,
  ): Promise<FeedStockOperationResult> {
    return this.request<FeedStockOperationResult>(
      `/gausevak/feed-stocks/${feedStockId}/purchase`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async useFeedStock(
    data: FeedStockUsageCreate,
  ): Promise<FeedStockOperationResult> {
    return this.request<FeedStockOperationResult>("/gausevak/feed-stocks/use", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async adjustFeedStock(
    feedStockId: string,
    data: FeedStockAdjustmentCreate,
  ): Promise<FeedStockOperationResult> {
    return this.request<FeedStockOperationResult>(
      `/gausevak/feed-stocks/${feedStockId}/adjust`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  // ── Transaction history

  async getFeedStockTransactions(
    feedStockId: string,
    params?: { limit?: number; transaction_type?: FeedTransactionType },
  ): Promise<FeedStockTransaction[]> {
    const p = new URLSearchParams();
    if (params?.limit) p.append("limit", String(params.limit));
    if (params?.transaction_type)
      p.append("transaction_type", params.transaction_type);
    const q = p.toString() ? `?${p.toString()}` : "";
    return this.request<FeedStockTransaction[]>(
      `/gausevak/feed-stocks/${feedStockId}/transactions${q}`,
    );
  }

  async getAllFeedStockTransactions(params?: {
    limit?: number;
    transaction_type?: FeedTransactionType;
    date?: string; // YYYY-MM-DD
  }): Promise<FeedStockTransaction[]> {
    const p = new URLSearchParams();
    if (params?.limit) p.append("limit", String(params.limit));
    if (params?.transaction_type)
      p.append("transaction_type", params.transaction_type);
    if (params?.date) p.append("date", params.date);
    const q = p.toString() ? `?${p.toString()}` : "";
    return this.request<FeedStockTransaction[]>(
      `/gausevak/feed-stock-transactions${q}`,
    );
  }

  // ── Alerts

  async getLowStockFeeds(): Promise<FeedStock[]> {
    return this.request<FeedStock[]>("/gausevak/feed-stocks/alerts/low-stock");
  }

  async getExpiringFeeds(days = 30): Promise<FeedStock[]> {
    return this.request<FeedStock[]>(
      `/gausevak/feed-stocks/alerts/expiring?days=${days}`,
    );
  }

  async editSubscription(
    id: string,
    data: {
      pattern?: string;
      custom_days?: number[] | null;
      end_date?: string | null;
      items?: Array<{
        product_id: string;
        quantity: number;
        price: number;
        amount: number;
      }>;
      total_quantity?: number;
      total_amount?: number;
    },
  ) {
    return this.request<any>(`/subscriptions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async acceptSubscription(id: string) {
    return this.request<any>(`/subscriptions/${id}/accept`, { method: "POST" });
  }

  //passord reset admin setting screen added by anurag
  async requestChangePasswordOtp(): Promise<{
    otp: string;
    expires_in_minutes: number;
  }> {
    return this.request("/auth/change-password-otp", { method: "POST" });
  }

  /**
   * Step 2: User typed the OTP shown on screen — verify it.
   * Returns { verified: true } on success.
   */
  async verifyChangePasswordOtp(otp: string): Promise<{ verified: boolean }> {
    return this.request("/auth/verify-change-otp", {
      method: "POST",
      body: JSON.stringify({ otp }),
    });
  }

  async confirmChangePassword(
    new_password: string,
    confirm_password: string,
  ): Promise<{ message: string }> {
    return this.request("/auth/confirm-change-password", {
      method: "POST",
      body: JSON.stringify({ new_password, confirm_password }),
    });
  }

  //vet milk reocrd and fee dreocrd by anurag
  async vetAddMilk(data: {
    cow_id: string;
    cow_name: string;
    cow_tag: string;
    quantity: number;
    shift: "morning" | "evening";
    date: string;
    notes?: string;
  }) {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/milk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.detail || "Failed to save milk entry");
    return result;
  }

  async vetGetTodayMilk() {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/milk/today`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch today's milk");
    return data;
  }

  async vetDeleteMilkEntry(entryId: string): Promise<{
    success: boolean;
    deleted_entry: {
      id: string;
      cow_id: string;
      cow_name: string;
      cow_tag: string;
      quantity: number;
      shift: "morning" | "evening";
      date: string;
      worker_name: string;
    };
  }> {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/milk/${entryId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.detail || "Failed to delete milk entry");
    return result;
  }

  // ── Vet Feed ─────────────────────────────────────────

  async vetGetFeedStatus(date: string, shift: "morning" | "evening") {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(
      `${API_BASE}/api/vet/feed?date=${date}&shift=${shift}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch feed status");
    return data;
  }

  async vetMarkFed(data: {
    cow_id: string;
    cow_name: string;
    cow_tag: string;
    date: string;
    shift: "morning" | "evening";
  }) {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(`${API_BASE}/api/vet/feed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || "Failed to mark fed");
    return result;
  }

  async vetUnmarkFed(
    cow_id: string,
    date: string,
    shift: "morning" | "evening",
  ) {
    const token = await AsyncStorage.getItem("vet_token");
    const response = await fetch(
      `${API_BASE}/api/vet/feed?cow_id=${cow_id}&date=${date}&shift=${shift}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || "Failed to unmark fed");
    return result;
  }

  //farm sale by worker by golu
  // ── Farm Sale ─────────────────────────────────────────

  async workerCreateFarmSale(data: FarmSaleCreate): Promise<FarmSale> {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(`${API_BASE}/api/worker/farm-sale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.detail || "Failed to save farm sale entry");
    return result;
  }

  async workerGetFarmSales(params?: {
    date?: string;
    all_time?: boolean;
  }): Promise<FarmSale[]> {
    const token = await AsyncStorage.getItem("worker_token");
    const p = new URLSearchParams();
    if (params?.all_time) {
      p.append("all_time", "true");
    } else if (params?.date) {
      p.append("date", params.date);
    }
    const q = p.toString() ? `?${p.toString()}` : "";
    const response = await fetch(`${API_BASE}/api/worker/farm-sale${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch farm sale entries");
    return data;
  }

  async workerDeleteFarmSale(saleId: string): Promise<{
    success: boolean;
    deleted_entry: FarmSale;
  }> {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(`${API_BASE}/api/worker/farm-sale/${saleId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.detail || "Failed to delete farm sale entry");
    return result;
  }

  async getAdminFarmSales(params?: {
    date?: string;
    worker_id?: string;
    all?: boolean;
  }) {
    const p = new URLSearchParams();
    if (params?.all) {
      p.append("all_time", "true");
    } else if (params?.date) {
      p.append("date", params.date);
    }
    if (params?.worker_id) p.append("worker_id", params.worker_id);
    const q = p.toString() ? `?${p.toString()}` : "";
    return this.request<{
      date: string | null;
      total_sales: number;
      total_amount: number;
      by_product: Record<string, number>;
      sales: FarmSale[];
    }>(`/admin/farm-sales${q}`);
  }

  async adminUpdateFarmSale(
    saleId: string,
    data: Partial<{
      customer_id: string;
      customer_name: string;
      product_name: string;
      quantity: number;
      unit: string;
      price_per_unit: number;
      notes: string;
      payment_method: PaymentMethod;
      payment_confirmed: boolean;
      receipt_image: string;
    }>,
  ): Promise<FarmSale> {
    return this.request<FarmSale>(`/admin/farm-sales/${saleId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async adminCreateFarmSale(data: FarmSaleCreate): Promise<FarmSale> {
    return this.request<FarmSale>("/admin/farm-sales", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async adminDeleteFarmSale(
    saleId: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.request<{ success: boolean; id: string }>(
      `/admin/farm-sales/${saleId}`,
      {
        method: "DELETE",
      },
    );
  }

  //Farm/business multiple Adresses
  async getBusinessLocations(): Promise<BusinessLocation[]> {
    return this.request<BusinessLocation[]>("/admin/locations");
  }

  async createBusinessLocation(
    data: BusinessLocationCreate,
  ): Promise<BusinessLocation> {
    return this.request<BusinessLocation>("/admin/locations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateBusinessLocation(
    id: string,
    data: BusinessLocationCreate,
  ): Promise<BusinessLocation> {
    return this.request<BusinessLocation>(`/admin/locations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteBusinessLocation(
    id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.request(`/admin/locations/${id}`, { method: "DELETE" });
  }

  async workerGetAdminPaymentQr(): Promise<{
    admin_id: string;
    qr_image_base64: string;
    file_type: string;
    label: string;
  }> {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(`${API_BASE}/api/worker/payment-qr`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch payment QR");
    return data;
  }

  async workerUpdateFarmSale(
    saleId: string,
    data: Partial<FarmSaleCreate>,
  ): Promise<FarmSale> {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(`${API_BASE}/api/worker/farm-sale/${saleId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.detail || "Failed to update farm sale entry");
    return result;
  }

  async getFarmSales(search?: string) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<FarmSale[]>(`/farm-sales${query}`);
  }

  async getAdminNotifications(category: string = "all", limit: number = 100) {
    const params = new URLSearchParams();
    params.append("limit", String(limit));
    if (category && category !== "all") params.append("category", category);
    return this.request<AdminNotificationInbox>(
      `/notifications/admin/inbox?${params.toString()}`,
      { timeoutMs: 30_000 },
    );
  }

  async getAdminNotificationSummary() {
    return this.request<AdminNotificationSummary>(
      "/notifications/admin/summary",
      {
        timeoutMs: 20_000,
        silentErrorLog: true,
      },
    );
  }

  async markAdminNotificationRead(notificationId: string) {
    return this.request<{ message: string; id: string }>(
      `/notifications/admin/${notificationId}/read`,
      { method: "PATCH" },
    );
  }

  async markAllAdminNotificationsRead() {
    return this.request<{ message: string; updated: number }>(
      "/notifications/admin/read-all",
      { method: "PATCH" },
    );
  }

  // inside your api service object/class (src/services/api.ts)
  async updateSubscriptionStatus(subscriptionId: string, status: string) {
    return this.request<any>("/delivery/subscription-status-update", {
      method: "POST",
      body: JSON.stringify({
        order_id: subscriptionId,
        status: status,
      }),
    });
  }

  // ── Cow Leasing

  async searchFarms(query: string): Promise<FarmSearchResult[]> {
    return this.request<FarmSearchResult[]>(
      `/gausevak/farms/search?query=${encodeURIComponent(query)}`,
    );
  }

  async getFarmLocations(
    adminId: string,
  ): Promise<{ locations: BusinessLocation[] }> {
    return this.request<{ locations: BusinessLocation[] }>(
      `/gausevak/farms/${adminId}/locations`,
    );
  }

  async leaseCow(cowId: string, data: LeaseCreate): Promise<Lease> {
    return this.request<Lease>(`/gausevak/cows/${cowId}/lease`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getLeases(
    direction: "out" | "in" = "out",
    status?: "active" | "completed" | "cancelled",
  ): Promise<Lease[]> {
    const p = new URLSearchParams({ direction });
    if (status) p.append("status", status);
    return this.request<Lease[]>(`/gausevak/leases?${p.toString()}`);
  }

  async getLease(leaseId: string): Promise<Lease> {
    return this.request<Lease>(`/gausevak/leases/${leaseId}`);
  }

  async extendLease(
    leaseId: string,
    newEndDate: string,
    note?: string,
  ): Promise<Lease> {
    return this.request<Lease>(`/gausevak/leases/${leaseId}/extend`, {
      method: "PUT",
      body: JSON.stringify({ new_end_date: newEndDate, note }),
    });
  }

  async completeLease(leaseId: string): Promise<Lease> {
    return this.request<Lease>(`/gausevak/leases/${leaseId}/complete`, {
      method: "POST",
    });
  }

  async cancelLease(leaseId: string): Promise<Lease> {
    return this.request<Lease>(`/gausevak/leases/${leaseId}/cancel`, {
      method: "POST",
    });
  }

  async updateLease(leaseId: string, data: LeaseUpdate): Promise<Lease> {
    return this.request<Lease>(`/gausevak/leases/${leaseId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async workerGetProducts(category?: string) {
    const token = await AsyncStorage.getItem("worker_token");
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    const response = await fetch(`${API_BASE}/api/worker/products${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch products");
    return data;
  }

  async workerGetProduct(productId: string) {
    const token = await AsyncStorage.getItem("worker_token");
    const response = await fetch(
      `${API_BASE}/api/worker/products/${productId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail || "Failed to fetch product");
    return data;
  }

  // Logout
  logout = async () => {
    this.setToken(null);
    await AsyncStorage.removeItem("worker_token");
    await AsyncStorage.removeItem("worker_data");
  };
}

export const api = new ApiService();
