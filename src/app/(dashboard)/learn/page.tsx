import {
  ArrowRight,
  BookOpenText,
  Filter,
  Flag,
  Headphones,
  Lightbulb,
  Mic2,
  MonitorPlay,
  PenTool,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { FancySearchBar } from "@/components/ui/fancy-search-bar";

export const metadata: Metadata = {
  title: "Thư viện học",
  description: "Các module và bài học IELTS đã xuất bản.",
};

const ieltsSkills = [
  {
    title: "Listening Practice",
    description: "Luyện nghe Audio bản xứ, chỉnh tốc độ, bài tập điền từ/trắc nghiệm kèm Transcript tương tác sau khi nộp.",
    href: "/practice/listening",
    icon: Headphones,
    color: "bg-[#6366F1]",
    lightColor: "bg-[#6366F1]/10",
    textColor: "text-[#6366F1]",
    badge: "Chuẩn format thi",
    progress: 45,
    stats: "4 Parts • 25m",
  },
  {
    title: "Reading Practice",
    description: "Kho bài đọc chuẩn đề thi thật, tích hợp tra từ 1 chạm, highlight dẫn chứng và phân tích đáp án chi tiết.",
    href: "/practice/reading",
    icon: BookOpenText,
    color: "bg-[#10B981]",
    lightColor: "bg-[#10B981]/10",
    textColor: "text-[#10B981]",
    badge: "Kho 50+ Passages",
    progress: 70,
    stats: "3 Passages • 60m",
  },
  {
    title: "Writing Practice",
    description: "Luyện Task 1 & Task 2 có đếm từ tự động, gợi ý dàn ý, lưu nháp liên tục và AI chấm chi tiết theo 4 tiêu chí.",
    href: "/practice/writing",
    icon: PenTool,
    color: "bg-[#F59E0B]",
    lightColor: "bg-[#F59E0B]/10",
    textColor: "text-[#F59E0B]",
    badge: "AI Powered",
    progress: 20,
    stats: "Task 1 & 2 • 60m",
  },
  {
    title: "Speaking AI Practice",
    description: "Luyện nói tương tác 1:1 với AI, chấm điểm phát âm IPA, độ trôi chảy và phản xạ câu hỏi Part 1-3.",
    href: "/practice/speaking",
    icon: Mic2,
    color: "bg-[#0284C7]",
    lightColor: "bg-[#0284C7]/10",
    textColor: "text-[#0284C7]",
    badge: "AI Powered",
    progress: 0,
    stats: "Part 1-3 • 15m",
  },
  {
    title: "Thi thử (Mock Test Room)",
    description: "Mô phỏng giao diện thi máy tính (Computer-delivered IELTS) chuẩn IDP/BC, chia đôi màn hình, highlight & note.",
    href: "/practice/mock-tests",
    icon: MonitorPlay,
    color: "bg-[#475569]",
    lightColor: "bg-[#475569]/10",
    textColor: "text-[#475569]",
    badge: "Full Test",
    progress: 0,
    stats: "4 Skills • 3h",
  },
  {
    title: "Sổ tay lỗi sai",
    description: "Tự động gom các câu làm sai, phân loại theo dạng bài và gợi ý bài tập khắc phục điểm yếu.",
    href: "/learn/mistakes",
    icon: Flag,
    color: "bg-[#EF4444]",
    lightColor: "bg-[#EF4444]/10",
    textColor: "text-[#EF4444]",
    badge: "Smart Log",
    progress: 0,
    stats: "24 lỗi cần ôn lại",
  },
];

const foundationModules = [
  {
    title: "Vocabulary Foundation",
    description: "Bộ từ vựng học thuật theo chủ đề (Oxford 3000/5000), ví dụ ngữ cảnh, phát âm chuẩn IPA và bài tập phản xạ.",
    href: "/learn/vocabulary",
    icon: Zap,
    color: "bg-[#F43F5E]",
    lightColor: "bg-[#F43F5E]/10",
    textColor: "text-[#F43F5E]",
    progress: 35,
    stats: "1,200 từ đã lưu",
  },
  {
    title: "Grammar Intensive",
    description: "Hệ thống ngữ pháp trọng tâm cho IELTS/Giao tiếp, phân tích lỗi sai kinh điển và bài tập ứng dụng tự động chấm.",
    href: "/learn/grammar",
    icon: Lightbulb,
    color: "bg-[#F43F5E]",
    lightColor: "bg-[#F43F5E]/10",
    textColor: "text-[#F43F5E]",
    progress: 60,
    stats: "18/25 chủ điểm",
  },
];

export default async function LearnPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const searchParams = await props.searchParams;
  const currentTab = searchParams?.tab || "Tất cả";

  return (
    <div className="space-y-8 pb-10">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <FancySearchBar />
        <div className="flex items-center gap-2">
           <button className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
             <Filter size={16} /> Lọc kết quả
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-[var(--border)] hide-scrollbar">
        {["Tất cả", "4 Kỹ năng IELTS", "Nền tảng Từ vựng & Ngữ pháp", "Thi thử", "Kho của tôi"].map((tab, i) => {
          const isActive = currentTab === tab;
          return (
            <Link
              key={tab}
              href={`/learn?tab=${encodeURIComponent(tab)}`}
              prefetch={false}
              className={cn(
                "whitespace-nowrap border-b-2 px-1 py-3 text-sm font-bold mx-3 first:ml-0 transition-colors",
                isActive 
                  ? "border-[#4338CA] text-[#4338CA]" 
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {tab}
            </Link>
          );
        })}
      </div>

      {currentTab === "4 Kỹ năng IELTS" ? (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <section className="rounded-3xl bg-gradient-to-br from-indigo-900 via-[#4338CA] to-blue-800 p-8 text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
               <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
             </div>
             <div className="relative z-10 max-w-2xl">
               <h1 className="text-3xl font-black mb-4">Chinh phục 4 Kỹ năng IELTS</h1>
               <p className="text-indigo-100 text-lg mb-8 leading-relaxed">
                 Lộ trình thực chiến được thiết kế chuyên sâu theo chuẩn Format của bài thi thực tế. Hệ thống chấm điểm bằng AI sẽ phân tích lỗi sai và vạch ra chiến lược tăng Band điểm cho bạn.
               </p>
               <div className="flex gap-4">
                 <button className="bg-white text-[#4338CA] px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors">
                   Làm bài Test định vị (15p)
                 </button>
               </div>
             </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Listening */}
            <article className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
               <div className="flex items-center gap-4 mb-6">
                 <div className="h-14 w-14 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                   <Headphones size={28} />
                 </div>
                 <div>
                   <h2 className="text-xl font-extrabold text-[var(--foreground)]">Listening</h2>
                   <p className="text-sm font-semibold text-[var(--muted-foreground)]">4 Parts • 40 Questions • 30 mins</p>
                 </div>
               </div>
               <div className="space-y-3 mb-6">
                 <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-indigo-200 cursor-pointer transition-colors">
                   <div className="flex flex-col">
                     <span className="font-bold text-sm">Part 1: Everyday Conversations</span>
                     <span className="text-xs text-slate-500">Form completion, Multiple choice</span>
                   </div>
                   <ArrowRight size={16} className="text-slate-400" />
                 </div>
                 <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-indigo-200 cursor-pointer transition-colors">
                   <div className="flex flex-col">
                     <span className="font-bold text-sm">Part 2: Monologues (Social)</span>
                     <span className="text-xs text-slate-500">Map labeling, Matching</span>
                   </div>
                   <ArrowRight size={16} className="text-slate-400" />
                 </div>
                 <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-indigo-200 cursor-pointer transition-colors">
                   <div className="flex flex-col">
                     <span className="font-bold text-sm">Part 3 & 4: Academic Contexts</span>
                     <span className="text-xs text-slate-500">Sentence completion, Flow-chart</span>
                   </div>
                   <ArrowRight size={16} className="text-slate-400" />
                 </div>
               </div>
               <Link href="/practice/listening" className="block w-full text-center bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors">
                 Vào Kho Luyện Nghe
               </Link>
            </article>

            {/* Reading */}
            <article className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
               <div className="flex items-center gap-4 mb-6">
                 <div className="h-14 w-14 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                   <BookOpenText size={28} />
                 </div>
                 <div>
                   <h2 className="text-xl font-extrabold text-[var(--foreground)]">Reading (Academic)</h2>
                   <p className="text-sm font-semibold text-[var(--muted-foreground)]">3 Passages • 40 Questions • 60 mins</p>
                 </div>
               </div>
               <div className="space-y-3 mb-6">
                 <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-emerald-200 cursor-pointer transition-colors">
                   <div className="flex flex-col">
                     <span className="font-bold text-sm">Passage 1: Descriptive Texts</span>
                     <span className="text-xs text-slate-500">True/False/Not Given, Note completion</span>
                   </div>
                   <ArrowRight size={16} className="text-slate-400" />
                 </div>
                 <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-emerald-200 cursor-pointer transition-colors">
                   <div className="flex flex-col">
                     <span className="font-bold text-sm">Passage 2: Discursive/Argumentative</span>
                     <span className="text-xs text-slate-500">Matching headings, Multiple choice</span>
                   </div>
                   <ArrowRight size={16} className="text-slate-400" />
                 </div>
                 <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-emerald-200 cursor-pointer transition-colors">
                   <div className="flex flex-col">
                     <span className="font-bold text-sm">Passage 3: Complex Texts</span>
                     <span className="text-xs text-slate-500">Yes/No/Not Given, Summary completion</span>
                   </div>
                   <ArrowRight size={16} className="text-slate-400" />
                 </div>
               </div>
               <Link href="/practice/reading" className="block w-full text-center bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors">
                 Vào Kho Luyện Đọc
               </Link>
            </article>

            {/* Writing */}
            <article className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
               <div className="flex items-center gap-4 mb-6">
                 <div className="h-14 w-14 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                   <PenTool size={28} />
                 </div>
                 <div>
                   <h2 className="text-xl font-extrabold text-[var(--foreground)]">Writing</h2>
                   <p className="text-sm font-semibold text-[var(--muted-foreground)]">2 Tasks • 60 mins • AI Evaluated</p>
                 </div>
               </div>
               <div className="space-y-4 mb-6">
                 <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50">
                   <h4 className="font-bold text-amber-900 mb-1">Task 1 (20 mins)</h4>
                   <p className="text-sm text-amber-800/80 mb-3">Mô tả biểu đồ (Line, Bar, Pie), bản đồ (Map), quá trình (Process).</p>
                   <div className="flex gap-2">
                     <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-bold uppercase">Vocabulary Templates</span>
                     <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-bold uppercase">Trend Analysis</span>
                   </div>
                 </div>
                 <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50">
                   <h4 className="font-bold text-amber-900 mb-1">Task 2 (40 mins)</h4>
                   <p className="text-sm text-amber-800/80 mb-3">Viết bài luận nghị luận xã hội (Opinion, Discussion, Causes/Solutions).</p>
                   <div className="flex gap-2">
                     <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-bold uppercase">Idea Generation</span>
                     <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-bold uppercase">Coherence & Cohesion</span>
                   </div>
                 </div>
               </div>
               <Link href="/practice/writing" className="block w-full text-center bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 transition-colors">
                 Tới Phòng Luyện Viết
               </Link>
            </article>

            {/* Speaking */}
            <article className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
               <div className="flex items-center gap-4 mb-6">
                 <div className="h-14 w-14 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                   <Mic2 size={28} />
                 </div>
                 <div>
                   <h2 className="text-xl font-extrabold text-[var(--foreground)]">Speaking</h2>
                   <p className="text-sm font-semibold text-[var(--muted-foreground)]">3 Parts • 11-14 mins • 1:1 AI Mock</p>
                 </div>
               </div>
               <div className="space-y-4 mb-6">
                 <div className="group flex items-start gap-3 p-3 rounded-xl hover:bg-sky-50 transition-colors cursor-pointer">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-sky-100 text-sky-600 font-bold flex items-center justify-center text-sm">1</div>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--foreground)] group-hover:text-sky-700">Part 1: Introduction</h4>
                      <p className="text-xs text-[var(--muted-foreground)]">Phản xạ nhanh các chủ đề quen thuộc (Work, Study, Hobbies).</p>
                    </div>
                 </div>
                 <div className="group flex items-start gap-3 p-3 rounded-xl hover:bg-sky-50 transition-colors cursor-pointer">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-sky-100 text-sky-600 font-bold flex items-center justify-center text-sm">2</div>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--foreground)] group-hover:text-sky-700">Part 2: Long Turn</h4>
                      <p className="text-xs text-[var(--muted-foreground)]">Độc thoại 2 phút theo Cue Card. Luyện cách brain-storming ý tưởng.</p>
                    </div>
                 </div>
                 <div className="group flex items-start gap-3 p-3 rounded-xl hover:bg-sky-50 transition-colors cursor-pointer">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-sky-100 text-sky-600 font-bold flex items-center justify-center text-sm">3</div>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--foreground)] group-hover:text-sky-700">Part 3: Discussion</h4>
                      <p className="text-xs text-[var(--muted-foreground)]">Thảo luận sâu mở rộng vấn đề. Luyện cấu trúc trả lời A.R.E.A.</p>
                    </div>
                 </div>
               </div>
               <Link href="/practice/speaking" className="block w-full text-center bg-sky-600 text-white font-bold py-3 rounded-xl hover:bg-sky-700 transition-colors">
                 Vào Phòng Luyện Nói (AI)
               </Link>
            </article>
          </div>
        </div>
      ) : (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Hero Banner (Tiếp tục học) */}
          <section>
            <article className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[#4338CA] to-[#312e81] p-6 text-white shadow-md">
              <div className="flex-1">
                <span className="rounded-md bg-white/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">Tiếp tục học</span>
                <h2 className="mt-3 text-2xl font-black">Listening Section 2: Campus Accommodation</h2>
                <div className="mt-5 flex items-center gap-3 text-sm font-bold text-white/90">
                   <span>Tiến độ: 60%</span>
                   <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-white/20">
                     <div className="h-full bg-[#10B981] rounded-full" style={{ width: '60%' }} />
                   </div>
                </div>
              </div>
              <Link
                href="/practice/listening"
                prefetch={false}
                className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-[#4338CA] transition-transform hover:scale-105"
              >
                Làm tiếp ngay <ArrowRight size={18} />
              </Link>
            </article>
          </section>

          {/* 4 Skills Section */}
          <section>
            <h2 className="mb-5 text-xl font-extrabold text-[var(--foreground)]">4 KỸ NĂNG CỐT LÕI (IELTS SKILLS)</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {ieltsSkills.map((skill) => {
                const Icon = skill.icon;
                return (
                  <article key={skill.href} className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                    <div>
                      <div className="flex items-start justify-between">
                        <span className={cn("grid size-12 place-items-center rounded-xl", skill.lightColor, skill.textColor)}>
                          <Icon size={24} />
                        </span>
                        <span className={cn("rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider", skill.lightColor, skill.textColor)}>
                          {skill.badge}
                        </span>
                      </div>
                      <h3 className="mt-5 text-lg font-bold">{skill.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
                        {skill.description}
                      </p>
                    </div>
                    <div className="mt-6 border-t border-[var(--border)] pt-4">
                      <div className="flex items-center justify-between text-xs font-bold text-[var(--muted-foreground)]">
                        <span>{skill.stats}</span>
                        <span className={skill.textColor}>{skill.progress}%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                        <div className={cn("h-full rounded-full", skill.color)} style={{ width: `${Math.max(4, skill.progress)}%` }} />
                      </div>
                      <Link
                        href={skill.href}
                        prefetch={false}
                        className={cn(
                          "mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl font-bold text-white transition-opacity hover:opacity-90",
                          skill.color
                        )}
                      >
                        Vào luyện tập <ArrowRight size={18} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Foundation Section */}
          <section>
            <h2 className="mb-5 text-xl font-extrabold text-[var(--foreground)]">KHO NỀN TẢNG BỔ TRỢ (FOUNDATION)</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {foundationModules.map((module) => {
                 const Icon = module.icon;
                 return (
                   <article key={module.href} className="group flex flex-col sm:flex-row gap-5 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                     <span className={cn("grid size-14 shrink-0 place-items-center rounded-xl", module.lightColor, module.textColor)}>
                        <Icon size={28} />
                     </span>
                     <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <h3 className="text-lg font-bold">{module.title}</h3>
                          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--muted-foreground)] sm:line-clamp-2">
                            {module.description}
                          </p>
                        </div>
                        <div className="mt-5 sm:mt-4">
                          <div className="flex items-center justify-between text-xs font-bold text-[var(--muted-foreground)]">
                             <span>{module.stats}</span>
                             <span className={module.textColor}>{module.progress}%</span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                            <div className={cn("h-full rounded-full", module.color)} style={{ width: `${Math.max(4, module.progress)}%` }} />
                          </div>
                        </div>
                     </div>
                   </article>
                 );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
