import type {
  BookingDetail,
  BookingSummary,
  CustomerHome,
  Gender,
  Hold,
  HoldInput,
  Me,
  NotificationFeed,
  Paged,
  PaymentInfo,
  Pricing,
  PublicSettings,
  Schedule,
  UploadTicket,
} from "@/shared/types";
import { api, ApiError } from "./client";

export type BookingFilters = { q?: string; date?: string | null; status?: string; page?: number };

export const meApi = {
  get: () => api<Me>("/api/me"),
  update: (input: { fullName: string; birthDate: string | null; gender: Gender | null; avatarPath?: string }) =>
    api<Me>("/api/me", { method: "PATCH", body: input }),
  changePassword: (input: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    api<null>("/api/me/password", { method: "POST", body: input }),
  avatarUploadUrl: (file: File) =>
    api<UploadTicket>("/api/me/avatar-upload-url", { method: "POST", body: fileMeta(file) }),
};

export const courtsApi = {
  schedule: (date: string) => api<Schedule>("/api/courts/schedule", { query: { date } }),
  pricing: () => api<Pricing>("/api/pricing"),
  settings: () => api<PublicSettings>("/api/settings/public"),
};

export const bookingsApi = {
  hold: (input: HoldInput) => api<Hold>("/api/bookings/hold", { method: "POST", body: input }),
  paymentInfo: (id: string) => api<PaymentInfo>(`/api/bookings/${id}/payment-info`),
  proofUploadUrl: (id: string, file: File) =>
    api<UploadTicket>(`/api/bookings/${id}/proof-upload-url`, { method: "POST", body: fileMeta(file) }),
  confirmPayment: (id: string, path: string) =>
    api<BookingDetail>(`/api/bookings/${id}/confirm-payment`, { method: "POST", body: { path } }),
  release: (id: string) => api<null>(`/api/bookings/${id}/release`, { method: "POST" }),
  list: (filters: BookingFilters) => api<Paged<BookingSummary>>("/api/bookings", { query: filters }),
  detail: (id: string) => api<BookingDetail>(`/api/bookings/${id}`),
  cancel: (id: string) => api<BookingDetail>(`/api/bookings/${id}/cancel`, { method: "POST" }),
};

export const customerApi = {
  home: () => api<CustomerHome>("/api/customer/home"),
};

export const notificationsApi = {
  feed: () => api<NotificationFeed>("/api/notifications"),
  markRead: () => api<null>("/api/notifications/read", { method: "POST" }),
};

const fileMeta = (file: File) => ({ fileName: file.name, contentType: file.type, size: file.size });

/** Sends the file straight to storage using the signed URL issued by the server. */
export async function uploadToSignedUrl(ticket: UploadTicket, file: File): Promise<string> {
  let response: Response;
  try {
    response = await fetch(ticket.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  } catch {
    throw new ApiError("NETWORK", 0);
  }
  if (!response.ok) throw new ApiError("UPLOAD_FAILED", response.status);
  return ticket.path;
}
