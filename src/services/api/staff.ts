import type {
  BookingDetail,
  BookingSummary,
  CourtInfo,
  CustomerRow,
  Me,
  OrderInput,
  OrderResult,
  Paged,
  Product,
  RescheduleOptions,
  RescheduleResult,
  ShiftTask,
  ShiftToday,
  StaffHome,
} from "@/shared/types";
import { api } from "./client";

export const shiftsApi = {
  today: () => api<ShiftToday>("/api/shifts/today"),
  checkIn: (shiftId: string) => api<Me>("/api/shifts/check-in", { method: "POST", body: { shiftId } }),
};

export const staffApi = {
  home: () => api<StaffHome>("/api/staff/home"),
  checkInBooking: (id: string) => api<BookingSummary>(`/api/bookings/${id}/check-in`, { method: "POST" }),
  rejectPayment: (id: string) => api<BookingDetail>(`/api/bookings/${id}/reject-payment`, { method: "POST" }),
  toggleTask: (id: string, done: boolean) => api<ShiftTask>(`/api/shift-tasks/${id}`, { method: "PATCH", body: { done } }),
  courts: () => api<CourtInfo[]>("/api/courts"),
};

export const productsApi = {
  list: (q?: string) => api<Product[]>("/api/products", { query: { q } }),
  createOrder: (input: OrderInput) => api<OrderResult>("/api/orders", { method: "POST", body: input }),
};

export const customersApi = {
  search: (q: string, page = 1) => api<Paged<CustomerRow>>("/api/customers", { query: { q, page } }),
  detail: (id: string) => api<CustomerRow>(`/api/customers/${id}`),
};

export type AffectedFilters = { q?: string; date?: string | null; courtId?: string; page?: number };
export const rescheduleApi = {
  affected: (filters: AffectedFilters) => api<Paged<BookingSummary>>("/api/bookings/affected", { query: filters }),
  options: (id: string, courtId?: string, date?: string) =>
    api<RescheduleOptions>(`/api/bookings/${id}/reschedule-options`, { query: { courtId, date } }),
  confirm: (id: string, input: { courtId: string; date: string; start: string; end: string }) =>
    api<RescheduleResult>(`/api/bookings/${id}/reschedule`, { method: "POST", body: input }),
};
