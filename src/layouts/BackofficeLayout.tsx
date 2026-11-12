"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, initials } from "@/components/ui/Avatar";
import { Brand } from "@/components/ui/Brand";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { NotificationBell } from "@/components/features/notifications/NotificationBell";
import { cn } from "@/lib/cn";
import { todayISO } from "@/lib/dates";
import { useLogout } from "@/lib/useLogout";
import { useMe } from "@/lib/useMe";
import { shiftNameKey } from "@/i18n/status";
import { useFormat } from "@/i18n/useFormat";
import type { Role } from "@/shared/types";

type NavKey = Parameters<ReturnType<typeof useTranslations<"nav">>>[0];
export type MenuLeaf = { key: NavKey; href: string; exact?: boolean; match?: string[] };
export type MenuItem = { key: NavKey; icon: LucideIcon; href?: string; exact?: boolean; match?: string[]; children?: MenuLeaf[] };

type Props = { role: Extract<Role, "staff" | "owner">; base: string; menu: MenuItem[]; children: ReactNode };

/**
 * Staff / owner frame from the Figma references: fixed white sidebar with the
 * two-level menu, green top bar with the date and the signed-in person.
 * Below `lg` the sidebar becomes a slide-in drawer.
 */
export function BackofficeLayout({ role, base, menu, children }: Props) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const f = useFormat();
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const me = useMe();
  const [drawer, setDrawer] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!me.data) return;
    if (me.data.role !== role) router.replace(me.data.role === "customer" ? "/customer" : me.data.role === "owner" ? "/owner" : "/staff");
    else if (role === "staff" && !me.data.shift?.checkedIn) router.replace("/staff/shift");
  }, [me.data, role, router]);

  const isActive = (item: { href?: string; exact?: boolean; match?: string[] }) => {
    const prefixes = item.match ?? (item.href ? [item.href] : []);
    return item.exact ? pathname === item.href : prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  };
  const shift = me.data?.shift;
  const shiftLabel = shift ? (shift.name in shiftNameKey ? tc(shiftNameKey[shift.name as keyof typeof shiftNameKey]) : shift.name) : null;
  const row = "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px]";

  const nav = (
    <nav aria-label={t("openMenu")} className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">
      {menu.map((item) => {
        const current = isActive(item) || !!item.children?.some(isActive);
        const open = expanded[item.key] ?? current;
        const active = item.children ? false : current;
        const body = (
          <>
            <item.icon aria-hidden className="size-[18px] shrink-0" strokeWidth={1.75} />
            <span className="min-w-0">{t(item.key)}</span>
          </>
        );
        return (
          <div key={item.key}>
            {item.href ? (
              <Link href={item.href} aria-current={active ? "page" : undefined} onClick={() => setDrawer(false)} className={cn(row, active ? "bg-brand-soft font-semibold text-brand" : current ? "font-semibold text-brand" : "text-body hover:text-brand")}>
                {body}
              </Link>
            ) : (
              <button type="button" aria-expanded={open} onClick={() => setExpanded({ ...expanded, [item.key]: !open })} className={cn(row, "w-full text-left", current ? "font-semibold text-brand" : "text-body hover:text-brand")}>
                {body}
              </button>
            )}
            {item.children && open && (
              <div className="ml-[21px] mt-1 flex flex-col gap-1 border-l border-line pl-3">
                {item.children.map((child) => (
                  <Link
                    key={child.key}
                    href={child.href}
                    aria-current={isActive(child) ? "page" : undefined}
                    onClick={() => setDrawer(false)}
                    className={cn("rounded-lg px-3 py-2 text-xs", isActive(child) ? "bg-brand-soft font-semibold text-brand" : "text-body hover:text-brand")}
                  >
                    {t(child.key)}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="mt-auto flex flex-col gap-0.5 pt-8">
        <Link href={`${base}/support`} onClick={() => setDrawer(false)} className={cn(row, "min-h-8 py-1.5", isActive({ href: `${base}/support` }) ? "font-semibold text-brand" : "text-body hover:text-brand")}>
          <CircleHelp aria-hidden className="size-[18px]" strokeWidth={1.75} />
          {tc("supportCenter")}
        </Link>
        <button type="button" onClick={logout} className={cn(row, "min-h-8 py-1.5 text-left text-body hover:text-brand")}>
          <LogOut aria-hidden className="size-[18px]" strokeWidth={1.75} />
          {tc("logout")}
        </button>
      </div>
    </nav>
  );
  const brand = <Brand href={base} name={tc("appName")} tagline={tc("clubName")} stacked className="px-7 pb-9 pt-11" />;

  return (
    <div className="min-h-dvh bg-page lg:pl-[232px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-line bg-white lg:flex">
        {brand}
        {nav}
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#202e27]/45" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[260px] max-w-[85vw] flex-col bg-white shadow-2xl">
            <button type="button" onClick={() => setDrawer(false)} aria-label={tc("close")} className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-md text-muted hover:bg-page">
              <X aria-hidden className="size-4" />
            </button>
            {brand}
            {nav}
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-16 items-center gap-2.5 bg-brand px-4 text-white lg:h-[72px] lg:px-9">
        <button type="button" onClick={() => setDrawer(true)} aria-label={t("openMenu")} className="flex size-9 items-center justify-center rounded-md hover:bg-white/10 lg:hidden">
          <Menu aria-hidden className="size-5" />
        </button>
        <div className="ml-auto flex items-center gap-2.5 sm:gap-4">
          <span className="hidden text-[13px] text-white/95 md:block" data-topbar-date>
            {f.dateLong(todayISO())}
          </span>
          <LanguageSwitcher tone="dark" />
          <NotificationBell tone="dark" bookingHref={(id) => `${base}/bookings/${id}`} />
          <Avatar name={shiftLabel ?? me.data?.fullName ?? ""} className="bg-white" />
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-[13px] font-semibold leading-tight" data-user-name>
              {shiftLabel ?? me.data?.fullName ?? "…"}
            </span>
            {shiftLabel && <span className="mt-0.5 block truncate text-[11px] text-white/85">{me.data?.fullName}</span>}
            {role === "owner" && me.data?.lastLoginAt && <span className="mt-0.5 block truncate text-[11px] text-white/85">{tc("lastLogin", { date: f.date(me.data.lastLoginAt) })}</span>}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-[1208px] px-4 py-6 lg:px-9 lg:py-8">{children}</main>
    </div>
  );
}

export { initials };
