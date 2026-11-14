import type {
  BankSettings,
  ClosureInput,
  ClosurePreview,
  CourtReport,
  CourtStatusRow,
  OwnerHome,
  Paged,
  PriceCell,
  ProductReport,
  Product,
  RefundBookingRow,
  RefundDetail,
  RefundResult,
  ReportPeriod,
  SetPriceInput,
  ShiftRegisterInput,
  ShiftRegisterResult,
  ShiftRow,
  StaffAccountRow,
  StaffCreateInput,
  UploadTicket,
} from "@/shared/types";
import { api } from "./client";

export const ownerApi = {
  home: () => api<OwnerHome>("/api/owner/home"),
};

export type ReportQuery = { period: ReportPeriod; date?: string; from?: string; to?: string };
export const reportsApi = {
  court: (query: ReportQuery) => api<CourtReport>("/api/reports/court", { query }),
  products: (query: ReportQuery) => api<ProductReport>("/api/reports/products", { query }),
};

export const pricingAdminApi = {
  cells: () => api<PriceCell[]>("/api/pricing/cells"),
  set: (input: SetPriceInput) => api<null>("/api/pricing", { method: "PUT", body: input }),
};

export const courtStatusApi = {
  list: (date: string) => api<CourtStatusRow[]>("/api/courts/status", { query: { date } }),
  preview: (input: ClosureInput) => api<ClosurePreview>("/api/courts/closures/preview", { method: "POST", body: input }),
  close: (input: ClosureInput) => api<null>("/api/courts/closures", { method: "POST", body: input }),
};

export type ProductWrite = { name: string; unit: string; price: number; type: Product["type"]; group: Product["group"]; description: string; stock: number | null; imagePath?: string };
export const productAdminApi = {
  list: (q?: string) => api<Product[]>("/api/products", { query: { q } }),
  imageUploadUrl: (file: File) => api<UploadTicket>("/api/products/image-upload-url", { method: "POST", body: { fileName: file.name, contentType: file.type, size: file.size } }),
  create: (input: ProductWrite) => api<Product>("/api/products", { method: "POST", body: input }),
  update: (id: string, input: ProductWrite) => api<Product>(`/api/products/${id}`, { method: "PATCH", body: input }),
  remove: (id: string) => api<null>(`/api/products/${id}`, { method: "DELETE" }),
};

export type ShiftListQuery = { q?: string; from?: string | null; to?: string | null; status?: string; page?: number };
export const shiftAdminApi = {
  register: (input: ShiftRegisterInput) => api<ShiftRegisterResult>("/api/shifts", { method: "POST", body: input }),
  list: (query: ShiftListQuery) => api<Paged<ShiftRow>>("/api/shifts", { query }),
  remove: (id: string) => api<null>(`/api/shifts/${id}`, { method: "DELETE" }),
};

export type RefundListQuery = { q?: string; status?: string; page?: number };
export const refundApi = {
  list: (query: RefundListQuery) => api<Paged<RefundBookingRow>>("/api/refunds/bookings", { query }),
  detail: (id: string) => api<RefundDetail>(`/api/refunds/${id}`),
  request: (id: string, input: { cause: string; customerChoice: string }) => api<RefundDetail>(`/api/refunds/${id}/request`, { method: "POST", body: input }),
  proofUploadUrl: (id: string, file: File) => api<UploadTicket>(`/api/refunds/${id}/proof-upload-url`, { method: "POST", body: { fileName: file.name, contentType: file.type, size: file.size } }),
  confirm: (id: string, path: string) => api<RefundResult>(`/api/refunds/${id}/confirm`, { method: "POST", body: { path } }),
};

export const staffAdminApi = {
  list: () => api<StaffAccountRow[]>("/api/staff"),
  create: (input: StaffCreateInput) => api<StaffAccountRow>("/api/staff", { method: "POST", body: input }),
  setStatus: (id: string, status: "Hoạt động" | "Khóa") => api<StaffAccountRow>(`/api/staff/${id}`, { method: "PATCH", body: { status } }),
};

export const settingsApi = {
  get: () => api<BankSettings>("/api/settings/bank"),
  save: (input: BankSettings) => api<BankSettings>("/api/settings/bank", { method: "PUT", body: input }),
};
