import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

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
      const error = await response
        .json()
        .catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail || "Request failed");
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
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

  //add - 26 Jun 2024
  // Public catalog products (any user can see)
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

  // Subscriptions
  async getSubscriptions() {
    return this.request<any[]>("/subscriptions");
  }

  async createSubscription(data: any) {
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

  // Vacations
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

  // Wallet
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

  // Orders
  async getOrders() {
    return this.request<any[]>("/orders");
  }

  async getOrder(id: string) {
    return this.request<any>(`/orders/${id}`);
  }

  async getTomorrowPreview() {
    return this.request<any>("/orders/tomorrow/preview");
  }

  // Delivery Partner
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

async cancelOrder(orderId: string) {
  return this.request<any>(`/delivery/orders/${orderId}/reject`, {
    method: "POST",
  });
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

  // Admin
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

  // Admin list (for catalog)
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

  // Seed data
  async seedData() {
    return this.request<any>("/seed", { method: "POST" });
  }

// ================= GAUSEVAK (COWS) =================

// Create cow
async createCow(data: any) {
  return this.request<any>("/gausevak/cows", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Get all cows (with optional search)
async getCows(search?: string) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);

  const query = params.toString() ? `?${params.toString()}` : "";
  return this.request<any[]>(`/gausevak/cows${query}`);
}

// Get single cow (optional but useful)
async getCow(id: string) {
  return this.request<any>(`/gausevak/cows/${id}`);
}

// Update cow
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
}>) {
  return this.request<any>(`/gausevak/cows/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Delete cow
async deleteCow(id: string) {
  return this.request<any>(`/gausevak/cows/${id}`, {
    method: "DELETE",
  });
}

// ================= GAUSEVAK (INSEMINATION) =================

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

// ================= GAUSEVAK (SEMEN RECORDS) =================

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

// ================= GAUSEVAK (MEDICAL RECORDS) =================

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

///------------------------------Gausevak (Cows)------------------------------

  logout = async () => {
    this.setToken(null);
  };
}

export const api = new ApiService();
