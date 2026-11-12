import { CalendarDays, CalendarSync, LayoutDashboard, ShoppingCart, Users } from "lucide-react";
import type { MenuItem } from "./BackofficeLayout";

export const staffMenu: MenuItem[] = [
  { key: "overview", icon: LayoutDashboard, href: "/staff", exact: true },
  {
    key: "bookingManagement",
    icon: CalendarDays,
    href: "/staff/booking",
    match: ["/staff/booking", "/staff/bookings", "/staff/pricing"],
    children: [
      { key: "booking", href: "/staff/booking", match: ["/staff/booking", "/staff/pricing"] },
      { key: "bookingHistory", href: "/staff/bookings" },
    ],
  },
  { key: "pos", icon: ShoppingCart, href: "/staff/pos" },
  { key: "customerSearch", icon: Users, href: "/staff/customers" },
  { key: "reschedule", icon: CalendarSync, href: "/staff/reschedule" },
];
