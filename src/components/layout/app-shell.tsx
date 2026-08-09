"use client";

import {
  BookOpenText,
  ChartNoAxesCombined,
  GraduationCap,
  House,
  Map,
  Menu,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Trang chủ", icon: House },
  { href: "/learn", label: "Học", icon: BookOpenText },
  { href: "/roadmap", label: "Lộ trình", icon: Map },
  { href: "/progress", label: "Tiến độ", icon: ChartNoAxesCombined },
  { href: "/profile", label: "Hồ sơ", icon: UserRound },
] as const;

const mobileNavigation = [
  { href: "/dashboard", label: "Trang chủ", icon: House },
  { href: "/roadmap", label: "Lộ trình", icon: GraduationCap },
  { href: "/progress", label: "Tiến độ", icon: ChartNoAxesCombined },
  { href: "/profile", label: "Hồ sơ", icon: UserRound },
] as const;

function isCurrentRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DesktopNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Điều hướng học tập"
      className="hidden items-center gap-1 lg:flex"
    >
      {navigation.map((item) => {
        const active = isCurrentRoute(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
              active
                ? "bg-[var(--primary-subtle)] text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            <Icon aria-hidden="true" size={18} strokeWidth={1.9} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  account,
}: {
  children: React.ReactNode;
  account: { label: string; email: string };
}) {
  const pathname = usePathname();
  const isStitchMobilePage =
    pathname === "/dashboard" ||
    pathname === "/roadmap" ||
    pathname.startsWith("/learn/vocabulary") ||
    pathname.startsWith("/learn/grammar") ||
    pathname.startsWith("/learn/mistakes") ||
    pathname.startsWith("/practice/");
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    drawerRef.current?.querySelector<HTMLElement>("button")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    const trigger = menuButtonRef.current;
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <header
        className={cn(
          "sticky top-0 z-30 border-b border-[var(--border)] bg-[color:var(--surface-translucent)] backdrop-blur-xl",
          isStitchMobilePage && "hidden lg:block",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-5 px-4 sm:px-6 lg:h-[4.5rem] lg:px-8">
          <AppLogo />
          <div className="ml-auto">
            <DesktopNavigation />
          </div>
          <Link
            href="/settings"
            prefetch={false}
            aria-label="Mở cài đặt"
            className="hidden size-11 items-center justify-center rounded-xl text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none lg:flex"
          >
            <Settings aria-hidden="true" size={20} strokeWidth={1.8} />
          </Link>
          <Button
            ref={menuButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden"
            aria-label="Mở tài khoản"
            aria-expanded={mobileOpen}
            aria-controls="account-drawer"
            onClick={() => setMobileOpen(true)}
          >
            <Menu aria-hidden="true" size={22} strokeWidth={1.8} />
          </Button>
        </div>
      </header>

      <main
        id="main-content"
        className={cn(
          "mx-auto w-full max-w-7xl lg:px-8 lg:py-9",
          isStitchMobilePage ? "px-0 py-0" : "px-4 py-5 sm:px-6 sm:py-7",
        )}
      >
        {children}
      </main>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-[#17152b]/35"
            aria-label="Đóng tài khoản"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            ref={drawerRef}
            id="account-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Tài khoản"
            className="absolute inset-y-0 right-0 flex w-[min(86vw,22rem)] flex-col bg-white p-5 shadow-[-20px_0_60px_rgb(var(--shadow-color)/0.18)]"
          >
            <div className="flex items-center justify-between">
              <AppLogo />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Đóng tài khoản"
                onClick={() => setMobileOpen(false)}
              >
                <X aria-hidden="true" size={22} />
              </Button>
            </div>
            <div className="mt-8 rounded-2xl bg-[var(--primary-subtle)] p-5">
              <p className="font-bold text-[var(--foreground)]">
                {account.label}
              </p>
              <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
                {account.email}
              </p>
            </div>
            <Link
              href="/settings"
              prefetch={false}
              onClick={() => setMobileOpen(false)}
              className="mt-4 flex min-h-12 items-center gap-3 rounded-xl px-3 font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"
            >
              <Settings aria-hidden="true" size={20} /> Cài đặt
            </Link>
            <LogoutButton className="mt-auto" />
          </aside>
        </div>
      ) : null}

      <nav
        aria-label="Điều hướng nhanh"
        className="fixed right-0 bottom-0 left-0 z-40 border-t border-[var(--border)] bg-white/96 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {mobileNavigation.map((item) => {
            const learningRoute =
              pathname.startsWith("/learn/") ||
              pathname.startsWith("/practice/");
            const active = learningRoute
              ? item.href === "/roadmap"
              : isCurrentRoute(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold text-[var(--muted-foreground)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                  active && "text-[var(--primary)]",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full",
                    active && "bg-[var(--primary)] text-white",
                  )}
                >
                  <Icon aria-hidden="true" size={17} strokeWidth={1.9} />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
