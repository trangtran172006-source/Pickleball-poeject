import {
  Banknote,
  CalendarDays,
  CalendarPlus,
  CalendarSync,
  Clock,
  History,
  LayoutGrid,
  Map,
  RefreshCw,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import type { MenuItem } from "./BackofficeLayout";

/** B1: Thanh điều hướng chủ sân khớp đặc tả Figma (đổi icon và xóa mục thừa Cài đặt, Nhân viên). */
export const ownerMenu: MenuItem[] = [
  { key: "overview", icon: LayoutGrid, href: "/owner", exact: true },
  {
    key: "courtManagement",
    icon: Map,
    match: ["/owner/pricing", "/owner/booking", "/owner/bookings", "/owner/courts"],
    children: [
      { key: "pricing", icon: Clock, href: "/owner/pricing" },
      { key: "booking", icon: CalendarPlus, href: "/owner/booking" },
      { key: "bookingHistory", icon: History, href: "/owner/bookings" },
      { key: "courtStatus", icon: RefreshCw, href: "/owner/courts/status" },
    ],
  },
  { key: "products", icon: ShoppingBag, href: "/owner/products", match: ["/owner/products", "/owner/pos"] },
  {
    key: "affected",
    icon: CalendarSync,
    match: ["/owner/reschedule", "/owner/refunds"],
    children: [
      { key: "reschedule", icon: CalendarSync, href: "/owner/reschedule" },
      { key: "refund", icon: Banknote, href: "/owner/refunds" },
    ],
  },
  {
    key: "shifts",
    icon: Users,
    match: ["/owner/shifts"],
    children: [
      { key: "shiftRegister", icon: CalendarPlus, href: "/owner/shifts/new" },
      { key: "shiftList", icon: History, href: "/owner/shifts", exact: true },
    ],
  },
  {
    key: "reports",
    icon: Wallet,
    match: ["/owner/reports"],
    children: [
      { key: "reportCourt", icon: CalendarDays, href: "/owner/reports/court" },
      { key: "reportProducts", icon: CalendarDays, href: "/owner/reports/products" },
    ],
  },
];
