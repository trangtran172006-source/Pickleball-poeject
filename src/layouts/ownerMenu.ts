import { CalendarSync, ClipboardList, FileBarChart, LayoutDashboard, Map, Package2, Settings, Users } from "lucide-react";
import type { MenuItem } from "./BackofficeLayout";

export const ownerMenu: MenuItem[] = [
  { key: "overview", icon: LayoutDashboard, href: "/owner", exact: true },
  {
    key: "courtManagement",
    icon: Map,
    match: ["/owner/pricing", "/owner/booking", "/owner/bookings", "/owner/courts"],
    children: [
      { key: "pricing", href: "/owner/pricing" },
      { key: "booking", href: "/owner/booking" },
      { key: "bookingHistory", href: "/owner/bookings" },
      { key: "courtStatus", href: "/owner/courts/status" },
    ],
  },
  { key: "products", icon: Package2, href: "/owner/products", match: ["/owner/products", "/owner/pos"] },
  {
    key: "affected",
    icon: CalendarSync,
    match: ["/owner/reschedule", "/owner/refunds"],
    children: [
      { key: "reschedule", href: "/owner/reschedule" },
      { key: "refund", href: "/owner/refunds" },
    ],
  },
  {
    key: "shifts",
    icon: ClipboardList,
    match: ["/owner/shifts"],
    children: [
      { key: "shiftRegister", href: "/owner/shifts/new" },
      { key: "shiftList", href: "/owner/shifts" },
    ],
  },
  {
    key: "reports",
    icon: FileBarChart,
    match: ["/owner/reports"],
    children: [
      { key: "reportCourt", href: "/owner/reports/court" },
      { key: "reportProducts", href: "/owner/reports/products" },
    ],
  },
  { key: "staff", icon: Users, href: "/owner/staff" },
  { key: "settings", icon: Settings, href: "/owner/settings" },
];
