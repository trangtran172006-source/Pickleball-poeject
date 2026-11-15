import { CalendarDays, CalendarPlus, CalendarSync, History, LayoutGrid, Search, ShoppingBag } from "lucide-react";
import type { MenuItem } from "./BackofficeLayout";

export const staffMenu: MenuItem[] = [
  { key: "overview", icon: LayoutGrid, href: "/staff", exact: true },
  {
    key: "bookingManagement",
    icon: CalendarDays,
    href: "/staff/booking",
    match: ["/staff/booking", "/staff/bookings", "/staff/pricing"],
    children: [
      { key: "booking", icon: CalendarPlus, href: "/staff/booking", match: ["/staff/booking", "/staff/pricing"] },
      { key: "bookingHistory", icon: History, href: "/staff/bookings" },
    ],
  },
  { key: "pos", icon: ShoppingBag, href: "/staff/pos" },
  { key: "customerSearch", icon: Search, href: "/staff/customers" },
  { key: "reschedule", icon: CalendarSync, href: "/staff/reschedule" },
];
