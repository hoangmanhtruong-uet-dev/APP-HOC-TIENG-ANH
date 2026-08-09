import { ArrowRight, Mic2, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getRecentSpeakingAttempts } from "@/server/speaking/content";

export const metadata: Metadata = { title: "Tiến độ Speaking" };

const formatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

export default async function SpeakingProgressPage() {
  const attempts = await getRecentSpeakingAttempts(24);
  return (
    <div className="space-y-8">
      <PageHeader
        title="Tiến độ Speaking"
        description="Theo dõi các lượt ghi âm đã nộp và mở lại transcript hoặc phản hồi luyện tập khi có."
        action={
          <Button asChild size="sm">
            <Link href="/practice/speaking">Luyện Speaking</Link>
          </Button>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2">
        <article className="app-panel p-5">
          <TrendingUp
            aria-hidden="true"
            className="text-[var(--primary)]"
            size={22}
          />
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            Lượt đã hoàn thành
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {attempts.length}
          </p>
        </article>
        <article className="app-panel p-5">
          <Mic2
            aria-hidden="true"
            className="text-[var(--primary)]"
            size={22}
          />
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            Phản hồi gần nhất
          </p>
          <p className="mt-1 text-lg font-bold">
            {attempts[0] ? "Có dữ liệu để xem lại" : "Chưa có dữ liệu"}
          </p>
        </article>
      </section>
      {attempts.length === 0 ? (
        <EmptyState
          title="Chưa có lượt Speaking đã nộp"
          description="Sau khi ghi âm và nộp một bộ câu hỏi, tiến độ thật sẽ xuất hiện tại đây."
        />
      ) : (
        <ol className="grid gap-4 md:grid-cols-2">
          {attempts.map((attempt) => (
            <li key={attempt.id} className="app-panel p-5 sm:p-6">
              <p className="text-xs font-bold tracking-[0.12em] text-[var(--primary)] uppercase">
                Speaking attempt
              </p>
              <h2 className="mt-2 text-lg font-bold">{attempt.title}</h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {attempt.responseCount} câu trả lời ·{" "}
                {formatter.format(new Date(attempt.submittedAt))}
              </p>
              <Link
                href={`/practice/speaking/${attempt.setSlug}/attempt/${attempt.id}`}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white"
              >
                Xem tiến độ <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
