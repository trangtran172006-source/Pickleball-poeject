/**
 * Data contracts between the front end and the /api routes.
 * Status fields carry the values stored in the database (Vietnamese, as in
 * the system design); the UI maps them to translation keys via i18n/status.ts.
 */
import type { BookingStatus, ClosureReason, CourtStatus, PaymentStatus, ShiftStatus } from "@/i18n/status";

export type Role = "customer" | "staff" | "owner";
export type Gender = "Nam" | "Nữ" | "Khác";

export type Me = {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string | null;
  birthYear: number | null;
  gender: Gender | null;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  staffCode?: string | null;
  shift?: { name: string; start: string; end: string; checkedIn: boolean } | null;
};

export type SlotState = "free" | "booked" | "maintenance" | "past";
export type Slot = { start: string; end: string; status: SlotState; price: number };
export type PriceBand = { id: string; start: string; end: string };
export type CourtSchedule = { id: string; name: string; slots: Slot[] };
export type Schedule = {
  date: string;
  today: string;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  minMinutes: number;
  bands: PriceBand[];
  courts: CourtSchedule[];
};

export type Pricing = {
  bands: PriceBand[];
  courts: Array<{ id: string; name: string; prices: Record<string, { weekday: number; weekend: number }> }>;
};

export type HoldInput = {
  courtId: string;
  date: string;
  start: string;
  end: string;
  fullName: string;
  phone: string;
  email: string;
  note: string;
};
export type Hold = { bookingId: string; code: string; expiresAt: string; total: number };

export type PaymentInfo = {
  bookingId: string;
  code: string;
  amount: number;
  expiresAt: string;
  qrPayload: string;
  bank: { name: string; holder: string; account: string; content: string };
};
export type UploadTicket = { uploadUrl: string; path: string };

export type BookingSummary = {
  id: string;
  code: string;
  createdAt: string;
  courtId: string;
  courtName: string;
  date: string;
  start: string;
  end: string;
  hours: number;
  amount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  canCancel: boolean;
  customerName: string;
  customerPhone: string;
  /** Set while the booking is still inside its 5-minute payment hold. */
  holdExpiresAt?: string | null;
  checkedInAt?: string | null;
  affectedReason?: ClosureReason | null;
  /** Lựa chọn của khách khi sân bị đóng: Dời lịch | Hoàn tiền. */
  closureChoice?: "Dời lịch" | "Hoàn tiền" | null;
};

export type HistoryEventType = "create" | "paid" | "reschedule" | "cancel" | "refund" | "invalid";
export type SlotRef = { courtName: string; date: string; start: string; end: string };
export type HistoryEvent = {
  id: string;
  type: HistoryEventType;
  at: string;
  actorName: string | null;
  actorRole: Role | "system";
  reason: string | null;
  from: SlotRef | null;
  to: SlotRef | null;
  amount: number | null;
  bookingStatus: BookingStatus | null;
  paymentStatus: PaymentStatus | null;
};

export type BookingDetail = BookingSummary & {
  booker: { name: string; phone: string; email: string };
  note: string;
  paymentMethod: string;
  paid: number;
  refunded: number;
  net: number;
  proofUrl: string | null;
  refundProofUrl: string | null;
  history: HistoryEvent[];
};

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export type CustomerHome = {
  today: string;
  suggestions: Array<{ date: string; time: string }>;
  upcoming: BookingSummary | null;
};

export type NotificationType =
  | "bookingConfirmed"
  | "bookingCancelled"
  | "bookingRescheduled"
  | "bookingRefunded"
  | "refundPending"
  | "paymentInvalid"
  | "courtClosed"
  | "newBooking"
  | "affectedBookings";
export type AppNotification = {
  id: string;
  type: NotificationType;
  params: Record<string, string | number>;
  bookingId: string | null;
  createdAt: string;
  read: boolean;
};
export type NotificationFeed = { unread: number; items: AppNotification[] };

export type PublicSettings = { hotline: string; mapUrl: string };
export type CourtInfo = { id: string; name: string; status: CourtStatus };

/* ---------- Staff / owner back office ---------- */

export type ShiftName = "Ca sáng" | "Ca chiều" | "Ca tối";
export type ShiftOption = { id: string | null; name: ShiftName; start: string; end: string; assigned: boolean; inHours: boolean };
export type ShiftToday = { date: string; checkedIn: { name: string; start: string; end: string } | null; shifts: ShiftOption[] };

export type QueueState = "awaitingCheckIn" | "inUse" | "awaitingPayment";
export type ShiftTask = { id: string; name: string; time: string | null; note: string | null; done: boolean; doneAt: string | null };
export type StaffHome = {
  date: string;
  shift: { name: string; start: string; end: string } | null;
  kpi: {
    bookings: number;
    upcoming2h: number;
    awaitingCheckIn: number;
    nextAt: string | null;
    awaitingPayment: number;
    toCollect: number;
    courtsReady: string[];
  };
  queue: Array<{ booking: BookingSummary; state: QueueState }>;
  tasks: ShiftTask[];
};

export type ProductType = "Hàng hóa" | "Dịch vụ";
export type ProductGroup = "Đồ uống" | "Phụ kiện";
export type Product = {
  id: string;
  name: string;
  unit: string;
  price: number;
  type: ProductType;
  group: ProductGroup | null;
  description: string | null;
  imageUrl: string | null;
  /** null = unlimited (services). */
  stock: number | null;
};
export type OrderMethod = "Tiền mặt" | "Chuyển khoản";
export type OrderInput = { items: Array<{ productId: string; quantity: number }>; method: OrderMethod };
export type OrderResult = { orderId: string; total: number };

export type CustomerRow = { id: string; fullName: string; phone: string; email: string; online: boolean; avatarUrl: string | null };

export type RescheduleOptionState = "ok" | "price" | "booked" | "closed" | "past";
export type RescheduleOption = { start: string; end: string; pricePerHour: number; state: RescheduleOptionState };
export type RescheduleOptions = {
  booking: BookingSummary & { pricePerHour: number };
  courts: Array<{ id: string; name: string }>;
  courtId: string;
  date: string;
  today: string;
  options: RescheduleOption[];
};
export type RescheduleResult = {
  booking: BookingSummary;
  from: SlotRef;
  to: SlotRef;
  pricePerHour: number;
  actorName: string;
  at: string;
  reason: string | null;
};

/* ---------- Owner ---------- */

export type OwnerHome = {
  date: string;
  shiftLabel: string;
  revenueToday: number;
  revenueTodayDelta: number;
  bookings: number;
  bookingsConfirmed: number;
  bookingsPending: number;
  occupancy: number;
  occupancyDelta: number;
  courtsActive: number;
  courtsTotal: number;
  courtsFreeNow: number;
  revenue7Total: number;
  revenue7Delta: number;
  revenue7: Array<{ date: string; amount: number }>;
  courtState: { inUse: number; ready: number; maintenance: number };
  today: Array<{ id: string; customerName: string; courtName: string; start: string; end: string; status: BookingStatus; amount: number }>;
  attention: number;
  staffOnDuty: number;
  updatedAt: string;
};

export type ReportPeriod = "day" | "week" | "month" | "year" | "range";
export type CourtReportRow = { code: string; customerName: string; date: string; start: string; end: string; courtName: string; minutes: number; amount: number };
export type CourtReport = { periodLabel: string; rows: CourtReportRow[]; totalMinutes: number; refunds: number; total: number };
export type ProductReportRow = { name: string; type: ProductType; unitPrice: number; orderedAt: string; quantity: number; amount: number };
export type ProductReport = { periodLabel: string; rows: ProductReportRow[]; totalGoodsQty: number; totalServiceQty: number; total: number };

export type PriceCell = { courtId: string; dayGroup: "T2-T6" | "T7-CN"; bandId: string; price: number };
export type SetPriceInput = { courtId: string; dayGroup: "T2-T6" | "T7-CN"; bandId: string; price: number };

export type CourtStatusRow = { id: string; name: string; status: CourtStatus; checkedAt: string };
export type ClosureInput = { courtId: string; reason: ClosureReason; startDate: string; startTime: string; endDate: string; endTime: string };
export type ClosurePreview = { affected: number };

export type ShiftRegisterInput = { staffCode: string; date: string; start: string; end: string };
export type ShiftRegisterResult = ShiftRow & { createdAccount: { email: string; password: string } | null };
export type ShiftRow = {
  id: string;
  code: string;
  date: string;
  staffName: string;
  staffCode: string;
  start: string;
  end: string;
  status: ShiftStatus;
  deletable: boolean;
  lockReason: "done" | "past" | null;
};

export type RefundBookingRow = BookingSummary & { refundStatus: PaymentStatus };
export type RefundDetail = {
  id: string;
  code: string;
  bookerName: string;
  bookerPhone: string;
  createdAt: string;
  courtName: string;
  date: string;
  start: string;
  end: string;
  paid: number;
  refundStatus: PaymentStatus;
  cause: string | null;
  customerChoice: string | null;
  eligible: boolean;
};
export type RefundResult = {
  code: string;
  bookerName: string;
  bookerPhone: string;
  courtName: string;
  date: string;
  start: string;
  end: string;
  amount: number;
  proofName: string;
  proofSize: number;
};

export type StaffAccountRow = { id: string; staffCode: string; fullName: string; email: string; phone: string; status: "Hoạt động" | "Khóa" };
export type StaffCreateInput = { fullName: string; email: string; phone: string; password: string };

export type BankSettings = { bankName: string; bankBin: string; holder: string; account: string; hotline: string };
