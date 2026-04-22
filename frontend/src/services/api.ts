import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

export interface FeedItem {
  feed_type: string;
  quantity_kg: number;
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
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_BASE}/api${endpoint}`;

    const storedToken =
      this.token || (await AsyncStorage.getItem("access_token"));

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (storedToken) {
      headers["Authorization"] = `Bearer ${storedToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {

      const text = await response.text();

      console.log("API ERROR URL:", url);
      console.log("STATUS:", response.status);
      console.log("BODY:", text);

      throw new Error(text || "Request failed");
    }

    return response.json();
  }

  async login(identifier: string, password: string, method: 'email' | 'phone' = 'email') {
    const body =
      method === 'phone'
        ? { phone: identifier, password }
        : { email: identifier, password };

    const data = await this.request<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
    this.setToken(data.access_token);
    return data;
  }

  async register(userData: any) {
    const data = await this.request<any>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    this.setToken(data.access_token);
    return data;
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

  async getCatalogProducts(adminId?: string, category?: string) {
    const params = new URLSearchParams();

    if (adminId) params.append("admin_id", adminId);
    if (category) params.append("category", category);

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

  async getProduct(id: string) {
    return this.request<any>(`/products/${id}`);
  }

  async getCategories() {
    return this.request<any[]>("/categories");
  }

  async getSubscriptions() {
    return this.request<any[]>("/subscriptions");
  }

async createSubscription(data: {
  product_id: string;
  quantity: number;
  pattern: string;
  custom_days: number[] | null;
  start_date: string;
  end_date?: string | null;
  amount: number;
}) {
  return this.request<any>("/subscriptions", {
    method: "POST",
    body: JSON.stringify(data),
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

  async getVacations() {
    return this.request<any[]>("/vacations");
  }

  async createVacation(startDate: string, endDate: string) {
    return this.request<any>("/vacations", {
      method: "POST",
      body: JSON.stringify({ start_date: startDate, end_date: endDate }),
    });
  }

  async deleteVacation(id: string) {
    return this.request<any>(`/vacations/${id}`, {
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

  async getOrders() {
    return this.request<any[]>("/orders");
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

<<<<<<< HEAD
  async getMyOrders() {
    return this.request<any[]>("/delivery/my-orders");
  }

  async acceptOrder(orderId: string) {
    return this.request<any>(`/delivery/orders/${orderId}/accept`, {
      method: "POST",
    });
  }

  async cancelOrder(orderId: string) {
    return this.request<any>(`/delivery/orders/${orderId}/reject`, {
      method: "POST",
    });
  }
=======
//  CORRECT — admin cancel hits the admin endpoint
async cancelOrder(orderId: string) {
  return this.request<any>(`/admin/orders/${orderId}/cancel`, {
    method: "PATCH",
  });
}
>>>>>>> dd60f8503fb4ba63f0f2ca0e7658ba440eaad999

// Keep reject separate for the rider app, using worker_token
async rejectOrder(orderId: string) {
  const token = await AsyncStorage.getItem("worker_token"); // ← rider token
  const response = await fetch(
    `${API_BASE}/api/delivery/orders/${orderId}/reject`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Reject failed");
  return data;
}

  async updateOrderStatus(orderId: string, status: string) {
    return this.request<any>("/delivery/status-update", {
      method: "POST",
      body: JSON.stringify({
        order_id: orderId,
        status,
      }),
    });
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
    return this.request<any[]>(`/admin/orders${query}`);
  }

  async assignDeliveryPartner(orderId: string, partnerId: string) {
    return this.request<any>(
      `/admin/orders/${orderId}/assign?partner_id=${partnerId}`,
      {
        method: "PUT",
      },
    );
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

  async getCow(id: string) {
    return this.request<any>(`/gausevak/cows/${id}`);
  }

  async updateCow(id: string, data: Partial<{
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
    milkActive: boolean;   // ← ADD THIS
  }>) {
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

  async updateInsemination(id: string, data: Partial<{
    cowSrNo: string;
    cowName: string;
    inseminationDate: string;
    pregnancyStatus: boolean;
    pdDone: boolean;
    pregnancyStatusDate: string;
    doctorName: string;
    actualCalvingDate: string;
    heatAfterCalvingDate: string;
  }>) {
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

  async updateSemenRecord(id: string, data: Partial<{
    bullSrNo: string;
    bullName: string;
    breed: string;
    femalCalves: number;
    maleCalves: number;
    damaged: number;
    conceptionCount: number;
    totalDoses: number;
    notes: string;
  }>) {
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

  async updateMedicalRecord(id: string, data: Partial<{
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
  }>) {
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

  async getFeedLogs(date: string, shift: 'morning' | 'evening') {
    return this.request<any[]>(`/worker/feed?date=${date}&shift=${shift}`);
  }

  async markFed(data: { cow_id: string; cow_name: string; cow_tag: string; date: string; shift: 'morning' | 'evening' }) {
    return this.request<any>('/worker/feed', { method: 'POST', body: JSON.stringify(data) });
  }

  async unmarkFed(cow_id: string, date: string, shift: 'morning' | 'evening') {
    return this.request<any>(`/worker/feed?cow_id=${cow_id}&date=${date}&shift=${shift}`, { method: 'DELETE' });
  }

  async getAdminFeedLogs(token: string, date?: string, shift?: 'morning' | 'evening') {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (shift) params.append('shift', shift);
    const query = params.toString() ? `?${params.toString()}` : '';

    const url = `${API_BASE}/api/admin/feed${query}`;
    console.log("Fetching admin feed:", url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const text = await response.text();
    console.log("Feed response status:", response.status, "body:", text.slice(0, 200));

    if (!response.ok) {
      throw new Error(`Feed API error ${response.status}: ${text}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Feed API returned invalid JSON: ${text.slice(0, 100)}`);
    }
  }

  async getAdminMilkLogs(date?: string) {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    const query = params.toString() ? `?${params.toString()}` : '';
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
  }) {
    return this.request<any>("/admin/workers", {
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

  async setCowDefaultFeed(cowId: string, morningFeeds: FeedItem[], eveningFeeds: FeedItem[]) {
    return this.request<any>(`/gausevak/cows/${cowId}/default-feed`, {
      method: "PUT",
      body: JSON.stringify({ morning_feeds: morningFeeds, evening_feeds: eveningFeeds }),
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

  async updateBullSemen(bullId: string, data: {
    totalDoses?: number;
    semenAvailable?: boolean;
    lastUsedDate?: string;
    successRate?: number;
  }) {
    return this.request<any>(`/gausevak/bulls/${bullId}/semen`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async useBullSemen(bullId: string, dosesUsed: number = 1) {
    return this.request<{ remaining_doses: number; semenAvailable: boolean }>(
      `/gausevak/bulls/${bullId}/use-semen?doses_used=${dosesUsed}`,
      { method: "POST" }
    );
  }

  async generateCowQR(cowId: string) {
    return this.request<any>(`/gausevak/cows/${cowId}/qr`, {
      method: "POST",
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
    const token = await AsyncStorage.getItem('worker_token');
    const response = await fetch(`${API_BASE}/api/worker/cows`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to fetch cows');
    return data;
  }

  async workerGetTodayHealthLogs() {
    const today = new Date().toISOString().split('T')[0];
    const token = await AsyncStorage.getItem('worker_token');
    const response = await fetch(`${API_BASE}/api/worker/health?date=${today}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to fetch health logs');
    return data;
  }

  async workerAddHealthLog(data: {
    cow_id: string;
    cow_name: string;
    cow_tag: string;
    status: string;
    date: string;
  }) {
    const token = await AsyncStorage.getItem('worker_token');
    const response = await fetch(`${API_BASE}/api/worker/health`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Failed to save health log');
    return result;
  }


  async workerGetFeedStatus(date: string, shift: 'morning' | 'evening') {
    const token = await AsyncStorage.getItem('worker_token');
    const response = await fetch(`${API_BASE}/api/worker/feed?date=${date}&shift=${shift}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to fetch feed status');
    return data;
  }

  async workerMarkFed(data: {
    cow_id: string;
    cow_name: string;
    cow_tag: string;
    date: string;
    shift: 'morning' | 'evening';
  }) {
    const token = await AsyncStorage.getItem('worker_token');
    const response = await fetch(`${API_BASE}/api/worker/feed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Failed to mark fed');
    return result;
  }

  async workerUnmarkFed(cow_id: string, date: string, shift: 'morning' | 'evening') {
    const token = await AsyncStorage.getItem('worker_token');
    const response = await fetch(
      `${API_BASE}/api/worker/feed?cow_id=${cow_id}&date=${date}&shift=${shift}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Failed to unmark fed');
    return result;
  }

  async workerGetShiftStatus() {
    const token = await AsyncStorage.getItem('worker_token');
    const response = await fetch(`${API_BASE}/api/worker/milk/shift-status`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to fetch shift status');
    return data;
  }

  async workerGetTodayMilk() {
    const token = await AsyncStorage.getItem('worker_token');
    const response = await fetch(`${API_BASE}/api/worker/milk/today`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to fetch today milk');
    return data;
  }

  async workerAddMilk(data: {
    cow_id: string;
    cow_name: string;
    cow_tag: string;
    quantity: number;
    shift: 'morning' | 'evening';
    date: string;
    notes?: string;
  }) {
    const token = await AsyncStorage.getItem('worker_token');
    const response = await fetch(`${API_BASE}/api/worker/milk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Failed to save milk entry');
    return result;
  }

  async workerLogin(identifier: string, password: string) {
    const response = await fetch(`${API_BASE}/api/worker/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identifier, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Worker login failed');

    await AsyncStorage.setItem('worker_token', data.access_token);
    await AsyncStorage.setItem('worker_data', JSON.stringify(data.worker));

    return data;
  }

  async workerLogout() {
    await AsyncStorage.removeItem('worker_token');
    await AsyncStorage.removeItem('worker_data');
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

  async updateWorker(id: string, data: Partial<{ name: string; phone: string; designation: string; farm_name: string; is_active: boolean }>) {
    return this.request<any>(`/admin/workers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

<<<<<<< HEAD
  // ─────────────────────────────────────────────────────────
  // ADD THESE TO api.ts  (inside the ApiService class)
  // ─────────────────────────────────────────────────────────

  // ── Bank Account ─────────────────────────────────────────

  async getBankAccount() {
    return this.request<{
      accountHolderName: string;
      accountNumber: string;
      ifscCode: string;
      bankName: string;
      upiId?: string;
    }>('/wallet/bank-account');
  }

  async saveBankAccount(data: {
=======
// ── Bank Account 
async getBankAccount() {
  return this.request<{
>>>>>>> dd60f8503fb4ba63f0f2ca0e7658ba440eaad999
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId?: string;
  }) {
    return this.request<any>('/wallet/bank-account', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ── Withdrawal ───────────────────────────────────────────

<<<<<<< HEAD
  async requestWithdrawal(amount: number) {
    return this.request<{
      message: string;
      withdrawal_id: string;
      amount: number;
      status: string;
    }>('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }
=======
// ── Withdrawal 
>>>>>>> dd60f8503fb4ba63f0f2ca0e7658ba440eaad999

  async getWithdrawalHistory() {
    return this.request<Array<{
      id: string;
      amount: number;
      status: string;  // "pending" | "processing" | "completed" | "rejected"
      created_at: string;
      bank_account: {
        bankName: string;
        accountNumber: string;
      };
    }>>('/wallet/withdrawals');
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
<<<<<<< HEAD

async getZoneRequestStatus() {
  return this.request<any>("/delivery/zone-request-status");
}
  //------------------------------------------------------------//
=======
>>>>>>> dd60f8503fb4ba63f0f2ca0e7658ba440eaad999

async getNotes(search?: string) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  const query = params.toString() ? `?${params.toString()}` : "";
  return this.request<Array<{
    id: string;
    admin_id: string;
    title: string;
    content: string;
    color: string;
    is_pinned: boolean;
    created_at: string;
    updated_at: string;
  }>>(`/notes/${query}`);
}

async createNote(data: {
  title: string;
  content: string;
  color?: string;
}) {
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

async updateNote(id: string, data: Partial<{
  title: string;
  content: string;
  color: string;
  is_pinned: boolean;
}>) {
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
  return this.request<{ id: string; is_pinned: boolean }>(`/notes/${id}/pin`, {
    method: "PATCH",
  });
}

// Logout
  logout = async () => {
    this.setToken(null);
    await AsyncStorage.removeItem('worker_token');
    await AsyncStorage.removeItem('worker_data');
  };
}

export const api = new ApiService();
