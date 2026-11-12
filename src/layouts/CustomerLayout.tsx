"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, CalendarDays, ChevronDown, LayoutDashboard, LogOut, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { Brand } from "@/components/ui/Brand";
import { usePopover } from "@/components/ui/DatePicker";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { NotificationBell } from "@/components/features/notifications/NotificationBell";
import { ChatbotLauncher } from "@/components/features/chatbot/ChatbotLauncher";
import { cn } from "@/lib/cn";
import { useLogout } from "@/lib/useLogout";
import { useMe } from "@/lib/useMe";
import { useFormat } from "@/i18n/useFormat";
import { ApiError } from "@/services/api/client";

const items = [
  { href: "/customer", key: "home", icon: LayoutDashboard, exact: true },
  { href: "/customer/booking", key: "booking", icon: Calendar, match: ["/customer/booking", "/customer/pricing"] },
  { href: "/customer/bookings", key: "myBookings", icon: CalendarDays, match: ["/customer/bookings"] },
  { href: "/customer/profile", key: "profile", icon: User, match: ["/customer/profile"] },
] as const;

/**
 * Customer frame. The home page uses the horizontal menu in the top bar and
 * the inner pages use the floating side menu, as in the Figma frames. On
 * small screens both collapse into one scrollable row of tabs.
 */
export function CustomerLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const f = useFormat();
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const me = useMe();
  const { open: menuOpen, setOpen: setMenuOpen, ref: menuRef } = usePopover();
  const isHome = pathname === "/customer";

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) router.replace("/login");
    if (me.data && me.data.role !== "customer") router.replace(me.data.role === "owner" ? "/owner" : "/staff");
  }, [me.error, me.data, router]);

  const active = (item: (typeof items)[number]) =>
    "exact" in item ? pathname === item.href : item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return (
    <div className="min-h-dvh bg-page">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 lg:h-20 xl:px-0">
          <Brand href="/customer" name={tc("appName")} className="mr-auto lg:mr-0" />
          <nav aria-label={t("openMenu")} className={cn("mx-auto hidden h-full items-center gap-9", isHome && "lg:flex")}>
            {items
              .filter((item) => item.key !== "booking")
              .map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active(item) ? "page" : undefined}
                  className={cn(
                    "relative py-2 text-[15px]",
                    active(item) ? "font-semibold text-brand after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-brand" : "text-body hover:text-brand",
                  )}
                >
                  {t(item.key)}
                </Link>
              ))}
          </nav>
          <div className={cn("flex items-center gap-1.5 sm:gap-2.5", !isHome && "lg:ml-auto")}>
            <LanguageSwitcher />
            <NotificationBell bookingHref={(id) => `/customer/bookings/${id}`} />
            <div ref={menuRef} className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-1.5 text-left hover:bg-page">
                <Avatar name={me.data?.fullName ?? ""} src={me.data?.avatarUrl} />
                <span className="hidden max-w-[130px] sm:block">
                  {me.data?.lastLoginAt && <span className="block truncate text-[11px] text-subtle">{tc("lastLogin", { date: f.date(me.data.lastLoginAt) })}</span>}
                  <span className="block text-sm font-semibold leading-tight text-ink" data-user-name>
                    {me.data?.fullName ?? "…"}
                  </span>
                </span>
                <ChevronDown aria-hidden className="size-4 text-body" />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-48 rounded-xl border border-line bg-white p-1.5 shadow-xl">
                  <Link role="menuitem" href="/customer/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-body hover:bg-page">
                    <User aria-hidden className="size-4" strokeWidth={1.75} />
                    {t("profile")}
                  </Link>
                  <button role="menuitem" type="button" onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-body hover:bg-page">
                    <LogOut aria-hidden className="size-4" strokeWidth={1.75} />
                    {tc("logout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <nav aria-label={t("openMenu")} className="flex gap-1.5 overflow-x-auto border-t border-line px-4 py-2 lg:hidden">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active(item) ? "page" : undefined}
              className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs", active(item) ? "bg-brand-soft font-semibold text-brand" : "text-body")}
            >
              <item.icon aria-hidden className="size-3.5" strokeWidth={1.75} />
              {t(item.key)}
            </Link>
          ))}
        </nav>
      </header>

      {isHome ? (
        <main className="mx-auto max-w-[1280px] px-4 py-6 lg:py-7 xl:px-0">{children}</main>
      ) : (
        <div className="mx-auto flex max-w-[1280px] items-start gap-6 px-4 py-6 lg:gap-10 lg:py-10 xl:gap-[74px] xl:px-0">
          <aside className="sticky top-28 hidden w-[210px] shrink-0 rounded-xl border border-line bg-white py-2 shadow-[0_4px_18px_rgba(32,46,39,0.05)] lg:block">
            <nav aria-label={t("openMenu")} className="flex flex-col gap-1">
              {items.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active(item) ? "page" : undefined}
                  className={cn("flex h-12 items-center gap-3.5 px-4 text-[15px]", active(item) ? "rounded-lg bg-brand-soft font-semibold text-brand" : "text-body hover:text-brand")}
                >
                  <item.icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
                  {t(item.key)}
                </Link>
              ))}
              <button type="button" onClick={logout} className="mt-1 flex h-12 items-center gap-3.5 border-t border-line px-4 text-[15px] text-body hover:text-brand">
                <LogOut aria-hidden className="size-[18px]" strokeWidth={1.75} />
                {tc("logout")}
              </button>
            </nav>
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      )}
      <ChatbotLauncher />
    </div>
  );
}
