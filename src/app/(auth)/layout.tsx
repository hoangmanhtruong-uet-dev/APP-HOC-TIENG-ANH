import Link from "next/link";

import { AppLogo } from "@/components/shared/app-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[var(--background)]">
      <div
        aria-hidden="true"
        className="absolute -top-32 -right-28 size-80 rounded-full bg-[var(--primary-subtle)] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 -left-32 size-72 rounded-full bg-[#e7e1ff] blur-3xl"
      />
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <header className="relative mx-auto flex h-[4.25rem] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <AppLogo />
        <Link
          href="/"
          className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          Về trang chủ
        </Link>
      </header>
      <main
        id="main-content"
        className="relative mx-auto grid w-full max-w-lg px-4 py-8 sm:px-6 sm:py-14"
      >
        {children}
      </main>
    </div>
  );
}
