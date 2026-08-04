/**
 * Thin authenticated fetch wrapper for admin API calls.
 * Reads the Bearer token from localStorage and adds it to every request.
 */

const BASE = "/api";

function getToken(): string {
  return localStorage.getItem("accessToken") ?? "";
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as T;
}

export const adminApi = {
  // Stats
  getStats: () => request<AdminStats>("/admin/stats"),

  // Users
  listUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    request<UserListResponse>(`/admin/users?${new URLSearchParams(cleanParams(params)).toString()}`),
  updateUser: (id: number, body: { role?: string; isActive?: boolean }) =>
    request<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  // Products
  listProducts: () => request<AdminProduct[]>("/admin/products"),
  createProduct: (body: ProductInput) =>
    request<AdminProduct>("/admin/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id: number, body: Partial<ProductInput>) =>
    request<AdminProduct>(`/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteProduct: (id: number) => request<void>(`/admin/products/${id}`, { method: "DELETE" }),

  // Licenses
  listLicenses: (params?: { page?: number; limit?: number }) =>
    request<LicenseListResponse>(`/admin/licenses?${new URLSearchParams(cleanParams(params)).toString()}`),

  // Subscriptions
  listSubscriptions: (params?: { page?: number; limit?: number }) =>
    request<SubscriptionListResponse>(`/admin/subscriptions?${new URLSearchParams(cleanParams(params)).toString()}`),

  // Blog
  listBlog: () => request<BlogPost[]>("/admin/blog"),
  createBlogPost: (body: ContentInput) =>
    request<BlogPost>("/admin/blog", { method: "POST", body: JSON.stringify(body) }),
  updateBlogPost: (id: number, body: Partial<ContentInput>) =>
    request<BlogPost>(`/admin/blog/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteBlogPost: (id: number) => request<void>(`/admin/blog/${id}`, { method: "DELETE" }),

  // News
  listNews: () => request<NewsItem[]>("/admin/news"),
  createNewsItem: (body: Omit<ContentInput, "authorName">) =>
    request<NewsItem>("/admin/news", { method: "POST", body: JSON.stringify(body) }),
  updateNewsItem: (id: number, body: Partial<Omit<ContentInput, "authorName">>) =>
    request<NewsItem>(`/admin/news/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteNewsItem: (id: number) => request<void>(`/admin/news/${id}`, { method: "DELETE" }),

  // CRM
  listContactMessages: (params?: { page?: number }) =>
    request<ContactListResponse>(`/admin/contact-messages?${new URLSearchParams(cleanParams(params)).toString()}`),
  updateContactMessage: (id: number, body: { isRead: boolean }) =>
    request<ContactMessage>(`/admin/contact-messages/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  listTrialRequests: (params?: { page?: number }) =>
    request<TrialListResponse>(`/admin/trial-requests?${new URLSearchParams(cleanParams(params)).toString()}`),
  updateTrialRequest: (id: number, body: { status: string }) =>
    request<TrialRequest>(`/admin/trial-requests/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  listDemoRequests: (params?: { page?: number }) =>
    request<DemoListResponse>(`/admin/demo-requests?${new URLSearchParams(cleanParams(params)).toString()}`),
  updateDemoRequest: (id: number, body: { status: string }) =>
    request<DemoRequest>(`/admin/demo-requests/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  listNewsletter: (params?: { page?: number }) =>
    request<NewsletterListResponse>(`/admin/newsletter?${new URLSearchParams(cleanParams(params)).toString()}`),

  // Support Tickets
  listTickets: (params?: { page?: number; status?: string }) =>
    request<TicketListResponse>(`/admin/support-tickets?${new URLSearchParams(cleanParams(params)).toString()}`),
  getTicket: (id: number) => request<TicketDetail>(`/admin/support-tickets/${id}`),
  updateTicket: (id: number, body: { status?: string; priority?: string }) =>
    request<AdminTicket>(`/admin/support-tickets/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  replyTicket: (id: number, message: string) =>
    request<TicketMessage>(`/admin/support-tickets/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};

function cleanParams(obj?: Record<string, unknown>): Record<string, string> {
  if (!obj) return {};
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => [k, String(v)])
  );
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  activeLicenses: number;
  openTickets: number;
}

export interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  language: string;
  companyName: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface UserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  category: string;
  featured: boolean;
  published: boolean;
  trialDays: number | null;
  basePrice: number | null;
  sortOrder: number;
  createdAt: string;
}

export interface ProductInput {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  category: string;
  featured?: boolean;
  published?: boolean;
  trialDays?: number;
  basePrice?: number;
  sortOrder?: number;
}

export interface AdminLicense {
  id: number;
  licenseKey: string;
  userId: number;
  productId: number;
  type: string;
  status: string;
  maxDevices: number | null;
  expiresAt: string | null;
  createdAt: string;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  productName: string | null;
}

export interface LicenseListResponse {
  licenses: AdminLicense[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminSubscription {
  id: number;
  userId: number;
  productId: number;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  productName: string | null;
}

export interface SubscriptionListResponse {
  subscriptions: AdminSubscription[];
  total: number;
  page: number;
  limit: number;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  authorName: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface NewsItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface ContentInput {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  authorName?: string;
  published?: boolean;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ContactListResponse {
  messages: ContactMessage[];
  total: number;
  page: number;
  limit: number;
}

export interface TrialRequest {
  id: number;
  name: string;
  email: string;
  companyName: string;
  phone: string | null;
  productId: number;
  message: string | null;
  status: string;
  createdAt: string;
  productName: string | null;
}

export interface TrialListResponse {
  requests: TrialRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface DemoRequest {
  id: number;
  name: string;
  email: string;
  companyName: string;
  phone: string | null;
  productId: number;
  preferredDate: string | null;
  message: string | null;
  status: string;
  createdAt: string;
  productName: string | null;
}

export interface DemoListResponse {
  requests: DemoRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface NewsletterListResponse {
  subscribers: NewsletterSubscriber[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminTicket {
  id: number;
  ticketNumber: string;
  subject: string;
  category: string | null;
  status: string;
  priority: string;
  userId: number;
  createdAt: string;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
}

export interface TicketListResponse {
  tickets: AdminTicket[];
  total: number;
  page: number;
  limit: number;
}

export interface TicketMessage {
  id: number;
  ticketId: number;
  userId: number;
  message: string;
  isStaff: string;
  createdAt: string;
}

export interface TicketDetail extends AdminTicket {
  messages: TicketMessage[];
}
