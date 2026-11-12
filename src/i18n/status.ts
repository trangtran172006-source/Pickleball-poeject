/**
 * Statuses are stored in the database with the Vietnamese values from the
 * system design. The UI never prints them directly: it maps each stored value
 * to a key in the `status` namespace so it is shown in the active language.
 */
export const bookingStatusKey = {
  "Chờ xác nhận": "bookingPending",
  "Đã xác nhận": "bookingConfirmed",
  "Đã hoàn tất": "bookingCompleted",
  "Đã hủy": "bookingCancelled",
  "Đã hủy – hoàn tiền": "bookingRefunded",
} as const;

export const paymentStatusKey = {
  "Chờ thanh toán": "paymentPending",
  "Đã thanh toán": "paymentPaid",
  "Thanh toán không hợp lệ": "paymentInvalid",
  "Chờ hoàn tiền": "paymentRefundPending",
  "Đã hoàn tiền": "paymentRefunded",
} as const;

export const courtStatusKey = {
  "Đang hoạt động": "courtActive",
  "Đóng cửa": "courtClosed",
} as const;

export const closureReasonKey = {
  "Bảo trì": "reasonMaintenance",
  "Thời tiết": "reasonWeather",
  "Sự cố": "reasonIncident",
} as const;

export const shiftStatusKey = {
  "Đã hoàn thiện": "shiftDone",
  "Chưa hoàn thiện": "shiftPending",
} as const;

export const accountStatusKey = {
  "Hoạt động": "accountActive",
  "Khóa": "accountLocked",
} as const;

export const genderKey = {
  Nam: "genderMale",
  "Nữ": "genderFemale",
  "Khác": "genderOther",
} as const;

export const dayGroupKey = {
  "T2-T6": "weekdayGroup",
  "T7-CN": "weekendGroup",
} as const;

export const shiftNameKey = {
  "Ca sáng": "shiftMorning",
  "Ca chiều": "shiftAfternoon",
  "Ca tối": "shiftEvening",
} as const;

export type BookingStatus = keyof typeof bookingStatusKey;
export type PaymentStatus = keyof typeof paymentStatusKey;
export type CourtStatus = keyof typeof courtStatusKey;
export type ClosureReason = keyof typeof closureReasonKey;
export type ShiftStatus = keyof typeof shiftStatusKey;
