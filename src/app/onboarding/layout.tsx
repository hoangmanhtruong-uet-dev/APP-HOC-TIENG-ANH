import { AppLogo } from "@/components/shared/app-logo";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { requireCurrentAccount } from "@/features/auth/server/account";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCurrentAccount();

  return (
    <div className="relative min-h-[100dvh] bg-[var(--background)] selection:bg-[var(--primary-soft)] selection:text-[var(--foreground)]">
      {/* Background ambient lighting gradients */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(70,56,210,0.07)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute top-1/3 -left-32 size-[400px] rounded-full bg-[radial-gradient(circle_at_center,rgba(128,103,241,0.05)_0%,transparent_70%)] blur-2xl" />
        <div className="absolute bottom-10 -right-32 size-[500px] rounded-full bg-[radial-gradient(circle_at_center,rgba(53,104,212,0.06)_0%,transparent_70%)] blur-3xl" />
      </div>

      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>

      <header className="sticky top-0 z-50 border-b border-[var(--border)]/70 bg-[var(--surface-translucent)] backdrop-blur-md transition-shadow">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <AppLogo />
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--border-strong)]/60 bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--muted-foreground)] shadow-xs">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--primary)] opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-[var(--primary)]"></span>
            </span>
            Thiết lập hồ sơ cá nhân
          </div>
          <LogoutButton className="w-auto text-xs sm:text-sm" />
        </div>
      </header>

      <main id="main-content" className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {children}
      </main>
    </div>
  );
}

