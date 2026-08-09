import Link from "next/link";

import { AppLogo } from "@/components/shared/app-logo";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 rounded-b-[1.75rem] bg-[var(--primary)] shadow-[0_6px_0_var(--primary-soft)]">
      <Container className="flex h-20 items-center justify-between gap-4">
        <AppLogo inverse />
        <nav aria-label="Điều hướng chính" className="flex items-center gap-3">
          <span className="hidden text-sm font-semibold text-white md:inline">
            Bạn đã có tài khoản?
          </span>
          <Button
            asChild
            size="sm"
            className="min-h-10 rounded-2xl bg-white px-5 text-sm text-[var(--primary)] shadow-[0_4px_0_#c9d9ff] hover:translate-y-0 hover:bg-[var(--accent-subtle)] hover:shadow-[0_4px_0_#c9d9ff]"
          >
            <Link href="/login">Đăng nhập</Link>
          </Button>
        </nav>
      </Container>
    </header>
  );
}
