import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Headphones,
  MessageCircleQuestion,
  Mic2,
  NotebookPen,
  Route,
  Sparkles,
  Target,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { MarketingHeader } from "@/components/layout/marketing-header";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Học IELTS có lộ trình",
  description:
    "IELTS Flow xây lộ trình từ mục tiêu, quỹ thời gian và kết quả luyện tập thực tế của bạn.",
};

const learningRhythm = [
  {
    title: "Chọn mục tiêu",
    description: "Band đích, lịch thi và thời gian học thực tế.",
    icon: Target,
  },
  {
    title: "Học đúng bài",
    description: "Nội dung vừa sức cho buổi học hôm nay.",
    icon: BookOpenCheck,
  },
  {
    title: "Hiểu lỗi sai",
    description: "Phản hồi gắn trực tiếp với câu trả lời.",
    icon: BrainCircuit,
  },
  {
    title: "Đi tiếp thông minh",
    description: "Tiến độ thật dẫn đường cho buổi học sau.",
    icon: Route,
  },
] as const;

const faqs = [
  {
    question: "IELTS Flow xây lộ trình học như thế nào?",
    answer:
      "Lộ trình dựa trên mục tiêu, quỹ thời gian, kỹ năng ưu tiên và kết quả luyện tập đã lưu của bạn. Nội dung tiếp theo được đề xuất từ dữ liệu học thật, không phải tiến độ minh họa.",
  },
  {
    question: "Người mới bắt đầu có dùng được không?",
    answer:
      "Có. Thư viện đi từ nền tảng từ vựng, ngữ pháp đến luyện Nghe, Nói, Đọc và Viết. Bạn có thể bắt đầu ở mức phù hợp rồi tăng dần độ khó.",
  },
  {
    question: "Mình có thể ưu tiên riêng một kỹ năng không?",
    answer:
      "Có. Bạn chọn kỹ năng ưu tiên trong hồ sơ học tập và vẫn có thể mở từng khu vực luyện tập riêng khi cần tập trung sâu hơn.",
  },
  {
    question: "Tiến độ được ghi nhận ra sao?",
    answer:
      "IELTS Flow chỉ hiển thị hoạt động, kết quả và bài đã hoàn thành từ dữ liệu thật của tài khoản. Hệ thống không tạo điểm số hoặc thành tích giả.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-[100dvh] bg-[var(--surface)]">
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <MarketingHeader />
      <main id="main-content">
        <section className="relative overflow-hidden bg-[var(--surface)]">
          <div
            aria-hidden="true"
            className="absolute -top-24 -left-20 size-72 rounded-full bg-[var(--accent-subtle)]"
          />
          <div
            aria-hidden="true"
            className="absolute top-20 -right-28 size-80 rounded-full bg-[var(--primary-subtle)]"
          />
          <Container className="relative grid min-h-[calc(100dvh-5rem)] items-center gap-7 py-8 md:grid-cols-[1.04fr_0.96fr] md:gap-12 md:py-12 lg:gap-16">
            <div className="hero-visual order-1 min-w-0">
              <div className="relative overflow-hidden rounded-[2rem] bg-[var(--accent-subtle)] shadow-[0_24px_60px_rgb(var(--shadow-color)/0.14)]">
                <Image
                  src="/images/ielts-flow-hero-v2.webp"
                  alt="Người học IELTS cùng trợ lý cú xanh đang luyện tập bên bàn học"
                  width={1536}
                  height={1024}
                  priority
                  sizes="(max-width: 767px) 100vw, 52vw"
                  className="aspect-[3/2] w-full object-cover"
                />
              </div>
            </div>

            <div className="hero-copy order-2 max-w-xl md:pl-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-subtle)] px-4 py-2 text-sm font-bold text-[var(--foreground)]">
                <Sparkles
                  aria-hidden="true"
                  size={17}
                  className="text-[var(--accent)]"
                />
                Lộ trình hiểu bạn
              </div>
              <h1 className="mt-5 text-4xl leading-[1.08] font-extrabold tracking-[-0.045em] text-[var(--foreground)] sm:text-5xl lg:text-[3.55rem]">
                Học đúng bài, tiến bộ rõ mỗi ngày
              </h1>
              <p className="mt-5 max-w-[48ch] text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
                Indigo Scholar biến mục tiêu và kết quả luyện tập của bạn thành
                một hành trình học dễ theo, dễ duy trì.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="sm:min-w-48">
                  <Link href="/register">
                    Bắt đầu học
                    <ArrowRight
                      aria-hidden="true"
                      size={19}
                      strokeWidth={2.2}
                    />
                  </Link>
                </Button>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-sm font-bold text-[var(--primary)] hover:bg-[var(--primary-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                >
                  Tôi đã có tài khoản
                </Link>
              </div>
            </div>
          </Container>
        </section>

        <section
          className="bg-[var(--background)] py-16 sm:py-24"
          aria-labelledby="journey-title"
        >
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="journey-title"
                className="text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl"
              >
                Indigo Scholar giúp bạn học nhẹ đầu hơn
              </h2>
              <p className="mx-auto mt-4 max-w-xl leading-7 text-[var(--muted-foreground)]">
                Không cần tự ghép tài liệu hay đoán bài tiếp theo. Mọi kỹ năng
                nằm trong một hành trình liền mạch.
              </p>
            </div>
            <div className="mt-10 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_24px_70px_rgb(var(--shadow-color)/0.1)] sm:p-5">
              <Image
                src="/images/ielts-flow-learning-path.webp"
                alt="Hành trình luyện nghe, đọc, nói và viết cùng trợ lý học tập cú xanh"
                width={1536}
                height={862}
                sizes="(max-width: 767px) 100vw, 1200px"
                className="aspect-[16/9] w-full rounded-[1.4rem] object-cover"
              />
            </div>
          </Container>
        </section>

        <section
          className="bg-[var(--surface)] py-16 sm:py-24"
          aria-labelledby="benefits-title"
        >
          <Container>
            <div className="max-w-2xl">
              <h2
                id="benefits-title"
                className="text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl"
              >
                Một nơi cho toàn bộ việc học IELTS
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-[var(--muted-foreground)]">
                Học kiến thức, luyện kỹ năng và xem tiến độ mà không phải đổi
                qua nhiều công cụ.
              </p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-12">
              <article className="relative overflow-hidden rounded-[2rem] bg-[var(--primary)] p-7 text-white shadow-[0_18px_50px_rgb(var(--shadow-color)/0.18)] sm:p-9 lg:col-span-7 lg:min-h-80">
                <div
                  aria-hidden="true"
                  className="absolute -right-14 -bottom-16 size-56 rounded-full bg-white/10"
                />
                <CalendarDays aria-hidden="true" size={32} strokeWidth={2} />
                <h3 className="mt-16 max-w-md text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl">
                  Lộ trình vừa với nhịp sống của bạn
                </h3>
                <p className="mt-4 max-w-lg leading-7 text-white/95">
                  Học 20 phút hay 60 phút mỗi ngày, hệ thống vẫn giữ cho mục
                  tiêu và khối lượng bài đi cùng nhau.
                </p>
              </article>

              <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--accent-subtle)] p-7 sm:p-8 lg:col-span-5">
                <NotebookPen
                  aria-hidden="true"
                  size={30}
                  className="text-[var(--coral)]"
                  strokeWidth={2}
                />
                <h3 className="mt-10 text-2xl font-extrabold tracking-[-0.025em]">
                  Biết vì sao mình sai
                </h3>
                <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
                  Phản hồi nằm cạnh câu trả lời để bạn sửa đúng điểm, thay vì
                  chỉ nhìn một con số.
                </p>
              </article>

              <article className="rounded-[2rem] border border-[var(--primary-soft)] bg-[var(--primary-subtle)] p-7 sm:p-8 lg:col-span-5">
                <div
                  className="flex gap-3 text-[var(--primary)]"
                  aria-hidden="true"
                >
                  <Headphones size={27} strokeWidth={2} />
                  <Mic2 size={27} strokeWidth={2} />
                </div>
                <h3 className="mt-10 text-2xl font-extrabold tracking-[-0.025em]">
                  4 kỹ năng, một tiến độ
                </h3>
                <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
                  Nghe, Nói, Đọc và Viết được theo dõi trong cùng một hồ sơ học
                  tập rõ ràng.
                </p>
              </article>

              <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface-raised)] p-7 shadow-[0_18px_50px_rgb(var(--shadow-color)/0.08)] sm:p-9 lg:col-span-7">
                <CheckCircle2
                  aria-hidden="true"
                  size={32}
                  className="text-[var(--success)]"
                  strokeWidth={2}
                />
                <h3 className="mt-10 text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl">
                  Chỉ hiển thị tiến bộ thật
                </h3>
                <p className="mt-4 max-w-xl leading-7 text-[var(--muted-foreground)]">
                  Mỗi hoạt động, điểm số và bài hoàn thành đều đến từ dữ liệu
                  học của chính bạn. Không có thành tích minh họa.
                </p>
              </article>
            </div>
          </Container>
        </section>

        <section
          className="bg-[var(--background)] py-16 sm:py-24"
          aria-labelledby="rhythm-title"
        >
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="rhythm-title"
                className="text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl"
              >
                Một vòng học dễ duy trì
              </h2>
              <p className="mt-4 leading-7 text-[var(--muted-foreground)]">
                Mỗi buổi học đều trả lời rõ: học gì, sửa gì và đi tiếp thế nào.
              </p>
            </div>
            <ol className="mt-12 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {learningRhythm.map((item, index) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="relative pt-6 lg:pt-0">
                    <div className="flex items-center gap-4 lg:block">
                      <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--surface)] text-[var(--primary)] shadow-[0_10px_30px_rgb(var(--shadow-color)/0.1)]">
                        <Icon aria-hidden="true" size={26} strokeWidth={2} />
                      </div>
                      <div className="lg:mt-5">
                        <h3 className="font-extrabold text-[var(--foreground)]">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    {index < learningRhythm.length - 1 ? (
                      <ArrowRight
                        aria-hidden="true"
                        className="absolute top-4 right-0 hidden text-[var(--primary-soft)] lg:block"
                        size={25}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </Container>
        </section>

        <section
          className="bg-[var(--surface)] py-16 sm:py-24"
          aria-labelledby="faq-title"
        >
          <Container className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
            <div>
              <MessageCircleQuestion
                aria-hidden="true"
                size={38}
                className="text-[var(--primary)]"
                strokeWidth={2}
              />
              <h2
                id="faq-title"
                className="mt-5 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl"
              >
                Bạn hỏi, IELTS Flow trả lời
              </h2>
              <p className="mt-4 max-w-md leading-7 text-[var(--muted-foreground)]">
                Những điều quan trọng trước khi bạn bắt đầu một lộ trình học
                mới.
              </p>
            </div>
            <div className="space-y-3">
              {faqs.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] px-5 py-1 open:bg-[var(--primary-subtle)] sm:px-6"
                >
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 font-extrabold focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <ChevronDown
                      aria-hidden="true"
                      className="shrink-0 text-[var(--primary)] transition-transform duration-200 group-open:rotate-180"
                      size={22}
                    />
                  </summary>
                  <p className="max-w-2xl pb-5 leading-7 text-[var(--muted-foreground)]">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </Container>
        </section>

        <section className="bg-[var(--surface)] pb-16 sm:pb-24">
          <Container>
            <div className="relative overflow-hidden rounded-[2rem] bg-[var(--primary)] px-6 py-12 text-center text-white shadow-[0_24px_70px_rgb(var(--shadow-color)/0.2)] sm:px-10 sm:py-16">
              <Sparkles
                aria-hidden="true"
                className="float-slow absolute top-8 left-[8%] text-[var(--accent)]"
                size={34}
                fill="currentColor"
              />
              <Sparkles
                aria-hidden="true"
                className="absolute right-[9%] bottom-9 text-white/30"
                size={42}
              />
              <h2 className="relative mx-auto max-w-2xl text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
                Bắt đầu hành trình IELTS của riêng bạn
              </h2>
              <p className="relative mx-auto mt-4 max-w-xl leading-7 text-white/95">
                Thiết lập mục tiêu trong vài phút và mở bài học phù hợp đầu
                tiên.
              </p>
              <Button
                asChild
                size="lg"
                className="relative mt-8 bg-white text-[var(--primary)] shadow-[0_5px_0_#d3def8] hover:bg-[var(--accent-subtle)]"
              >
                <Link href="/register">
                  Bắt đầu học ngay
                  <ArrowRight aria-hidden="true" size={19} strokeWidth={2.2} />
                </Link>
              </Button>
            </div>
          </Container>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--background)] py-9">
        <Container className="flex flex-col gap-5 text-sm text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-[var(--foreground)]">
            Indigo Scholar. Học có hướng, tiến bộ có bằng chứng.
          </p>
          <div className="flex flex-wrap gap-5">
            <Link
              className="font-semibold hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              href="#faq-title"
            >
              Câu hỏi thường gặp
            </Link>
            <Link
              className="font-semibold hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              href="/login"
            >
              Đăng nhập
            </Link>
          </div>
        </Container>
      </footer>
    </div>
  );
}
