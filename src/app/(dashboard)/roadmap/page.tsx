import {
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  LayoutList,
  LockKeyhole,
  Network,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import { requireCompletedOnboarding } from "@/features/onboarding/server/learner-profile";

export const metadata: Metadata = {
  title: "Bản đồ lộ trình cá nhân hóa",
};

export default async function RoadmapPage() {
  await requireCompletedOnboarding();
  
  return (
    <div className="min-h-[100dvh] bg-[var(--background)] px-4 pt-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        
        {/* Header Section */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-[#4338CA] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                IELTS Academic 6.5
              </span>
              <span className="text-xs font-medium text-[var(--muted-foreground)]">
                • Trình độ khởi điểm: A2 Elementary
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-[var(--foreground)] sm:text-4xl">
              BẢN ĐỒ LỘ TRÌNH CÁ NHÂN HÓA
            </h1>
          </div>
          
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white p-1 shadow-sm">
            <button className="flex items-center gap-2 rounded-lg bg-[#efedff] px-4 py-2 text-sm font-bold text-[#4338CA]">
              <Network size={16} /> Bản đồ cây
            </button>
            <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <LayoutList size={16} /> Danh sách
            </button>
            <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <Calendar size={16} /> Lịch học
            </button>
          </div>
        </header>

        {/* Two-column layout */}
        <div className="mt-8 grid gap-8 lg:grid-cols-10 lg:items-start">
          
          {/* LEFT COLUMN (70%) */}
          <div className="space-y-8 lg:col-span-7">
            
            {/* Phase 1 (Completed) */}
            <section className="relative rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
              <div className="absolute -top-3.5 left-6 flex items-center gap-1.5 rounded-full border border-[#d8d2ff] bg-[#efedff] px-3 py-1 text-xs font-bold text-[#4338CA]">
                 <Check size={12} strokeWidth={3} />
                 Phase 1: Nền tảng cơ bản (A1 - A2) • Hoàn thành 100%
              </div>
              
              <div className="mt-4 space-y-3">
                {/* Item 1 */}
                <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#efedff] font-bold text-[#4338CA]">1</span>
                    <div>
                      <h3 className="font-bold">500 Từ vựng đời sống cốt lõi</h3>
                      <p className="text-xs text-[var(--muted-foreground)]">Đã hoàn thành • Đạt điểm tuyệt đối</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <span className="font-bold text-[var(--foreground)]">95/100</span>
                     <button className="flex items-center gap-1.5 text-sm font-semibold text-[#4338CA] hover:underline">
                        <RotateCcw size={14} /> Xem lại
                     </button>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#efedff] font-bold text-[#4338CA]">2</span>
                    <div>
                      <h3 className="font-bold">Ngữ pháp cơ bản & Phát âm IPA</h3>
                      <p className="text-xs text-[var(--muted-foreground)]">Đã hoàn thành bài kiểm tra cuối chặng</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <span className="font-bold text-[var(--foreground)]">88/100</span>
                     <button className="flex items-center gap-1.5 text-sm font-semibold text-[#4338CA] hover:underline">
                        <RotateCcw size={14} /> Xem lại
                     </button>
                  </div>
                </div>

                {/* Milestone */}
                <div className="flex items-center justify-between rounded-xl border border-[#d8d2ff] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#4338CA] text-white">
                       <Zap size={18} />
                    </span>
                    <div>
                      <h3 className="font-bold text-[#4338CA]">Milestone Test 1: Nền tảng tổng hợp</h3>
                      <p className="text-xs font-semibold text-[#4338CA]">Trạng thái: Đạt chứng nhận (Passed)</p>
                    </div>
                  </div>
                  <span className="font-bold text-[#4338CA]">90/100đ</span>
                </div>
              </div>
            </section>

            {/* Phase 2 (In Progress) */}
            <section className="relative rounded-2xl border-2 border-[#4338CA] bg-white p-4 shadow-md sm:p-6">
              <div className="absolute -top-3.5 left-6 flex items-center gap-1.5 rounded-full bg-[#4338CA] px-3 py-1 text-xs font-bold text-white shadow-sm">
                 Phase 2: Pre-IELTS chiến thuật (4.0 - 5.0) • Đang học
              </div>
              
              <div className="mt-4">
                {/* Progress Header */}
                <div className="flex items-center justify-between text-sm font-bold text-[var(--foreground)]">
                  <span>Tiến độ tổng chặng: 40%</span>
                  <span className="font-medium text-[var(--muted-foreground)]">4/10 bài tập hoàn thành</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                  <div className="h-full rounded-full bg-[#4338CA]" style={{ width: '40%' }} />
                </div>

                {/* Next Lesson Block */}
                <div className="mt-6 rounded-2xl border border-[#efedff] bg-[#fbf9ff] p-5">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold uppercase tracking-wider text-[#4338CA]">Bài học tiếp theo</span>
                     <span className="rounded-full bg-[#4338CA] px-2 py-0.5 text-[10px] font-bold text-white">Đang diễn ra</span>
                   </div>
                   <h3 className="mt-2 text-xl font-black text-[var(--foreground)]">Unit 2: Quá khứ đơn & Kỹ thuật Paraphrase</h3>
                   <p className="mt-1 text-sm text-[var(--muted-foreground)]">Listening Part 2 - Bản đồ & Chỉ đường trong phòng thi thực chiến.</p>
                   
                   <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                     <button className="flex items-center justify-center gap-2 rounded-xl bg-[#4338CA] px-6 py-3 text-sm font-bold text-white transition-transform hover:scale-105">
                        Học tiếp: Unit 2 - Quá khứ đơn <ArrowRight size={16} />
                     </button>
                     <button className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--muted)]">
                        <Zap size={16} /> Làm bài vượt cấp (Test-out)
                     </button>
                   </div>
                </div>

                {/* List items */}
                <div className="mt-6 space-y-1">
                  {/* Item 1 */}
                  <div className="flex items-center justify-between rounded-lg p-3 hover:bg-[var(--muted)]">
                     <div className="flex items-center gap-3">
                       <span className="grid size-6 place-items-center rounded-full border-2 border-[#10B981] text-[#10B981]">
                         <Play size={10} fill="currentColor" />
                       </span>
                       <span className="text-sm font-medium">Unit 1: Ngữ pháp nền tảng Speaking Part 1</span>
                     </div>
                     <span className="flex items-center gap-1 text-xs font-bold text-[#10B981]"><Check size={14}/> Hoàn thành</span>
                  </div>
                  
                  {/* Item 2 */}
                  <div className="flex items-center justify-between rounded-lg border border-[#d8d2ff] bg-[#efedff] p-3">
                     <div className="flex items-center gap-3">
                       <span className="grid size-6 place-items-center rounded-full border-2 border-[#4338CA] text-[#4338CA]">
                       </span>
                       <span className="text-sm font-bold text-[#4338CA]">Unit 2: Quá khứ đơn & Kỹ thuật Paraphrase</span>
                     </div>
                     <span className="text-xs font-bold text-[#4338CA]">Đang học (50%)</span>
                  </div>
                  
                  {/* Item 3 */}
                  <div className="flex items-center justify-between rounded-lg p-3 opacity-60">
                     <div className="flex items-center gap-3">
                       <span className="grid size-6 place-items-center rounded-full border-2 border-[var(--muted-foreground)]">
                       </span>
                       <span className="text-sm font-medium">Unit 3: Reading Skimming & Scanning chuyên sâu</span>
                     </div>
                     <span className="text-xs font-medium text-[var(--muted-foreground)]">Sắp mở</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Phase 3 (Locked) */}
            <section className="relative rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 opacity-70">
              <div className="absolute -top-3.5 left-6 flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1 text-xs font-bold text-[var(--muted-foreground)]">
                 <LockKeyhole size={12} />
                 Phase 3: Bứt phá band điểm (5.5 - 6.5) • Đã khóa
              </div>
              
              <div className="mt-4 space-y-3">
                {/* Item 1 */}
                <div className="flex items-center justify-between rounded-xl bg-[var(--muted)] p-4">
                  <div className="flex items-center gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white font-bold text-[var(--muted-foreground)]">1</span>
                    <div>
                      <h3 className="font-bold text-[var(--muted-foreground)]">Advanced Writing Task 2 – Cấu trúc lập luận</h3>
                      <p className="text-xs text-[var(--muted-foreground)]">Yêu cầu hoàn thành Phase 2 để mở khóa</p>
                    </div>
                  </div>
                  <LockKeyhole size={18} className="text-[var(--muted-foreground)]" />
                </div>

                {/* Item 2 */}
                <div className="flex items-center justify-between rounded-xl bg-[var(--muted)] p-4">
                  <div className="flex items-center gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white font-bold text-[var(--muted-foreground)]">2</span>
                    <div>
                      <h3 className="font-bold text-[var(--muted-foreground)]">Speaking Reflex & Idioms nâng cao</h3>
                      <p className="text-xs text-[var(--muted-foreground)]">Yêu cầu hoàn thành Phase 2 để mở khóa</p>
                    </div>
                  </div>
                  <LockKeyhole size={18} className="text-[var(--muted-foreground)]" />
                </div>

                {/* Boss Test */}
                <div className="flex items-center justify-between rounded-xl border border-[var(--border-strong)] bg-[var(--muted)] p-4">
                  <div className="flex items-center gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[var(--muted-foreground)]">
                       <Zap size={18} />
                    </span>
                    <div>
                      <h3 className="font-bold text-[var(--muted-foreground)]">Boss Test: Full Mock Exam mô phỏng máy tính</h3>
                      <p className="text-xs text-[var(--muted-foreground)]">Chứng nhận hoàn thành toàn bộ lộ trình 6.5</p>
                    </div>
                  </div>
                  <LockKeyhole size={18} className="text-[var(--muted-foreground)]" />
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN (30%) */}
          <div className="space-y-6 lg:col-span-3">
            
            {/* Schedule Widget */}
            <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Thời gian biểu</h3>
                <span className="rounded bg-[#e6fbf2] px-2 py-0.5 text-[10px] font-bold text-[#10B981]">Đang đi đúng kế hoạch</span>
              </div>
              <div className="mt-3">
                <span className="text-4xl font-black text-[#4338CA]">74</span>
                <span className="ml-2 font-bold text-[var(--foreground)]">ngày đến kỳ thi thật</span>
              </div>
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                Ngày thi dự kiến: <strong className="text-[var(--foreground)]">15/12/2026</strong> tại IDP Vietnam.
              </p>
            </div>

            {/* AI Pacing Assistant */}
            <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4338CA]">AI Pacing Assistant</h3>
                <Sparkles size={16} className="text-[#4338CA]" />
              </div>
              <h4 className="mt-3 text-lg font-black text-[var(--foreground)]">Tốc độ hiện tại: 35 phút/ngày</h4>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Dự kiến về đích: <strong className="text-[var(--foreground)]">18/12/2026</strong></p>
              
              <div className="mt-5">
                 <p className="text-xs font-medium text-[var(--foreground)]">Kéo tăng giờ học để về đích sớm:</p>
                 <div className="relative mt-2 h-1.5 w-full rounded-full bg-[var(--muted)]">
                    <div className="absolute top-1/2 left-[30%] h-3 w-3 -translate-y-1/2 rounded-full bg-[#4338CA] ring-4 ring-[#efedff]" />
                    <div className="h-full w-[30%] rounded-full bg-[#4338CA]" />
                 </div>
                 <div className="mt-2 flex justify-between text-[10px] text-[var(--muted-foreground)]">
                    <span>35 phút/ngày</span>
                    <span className="font-bold text-[#4338CA]">Cán đích đúng hạn</span>
                 </div>
              </div>
            </div>

            {/* Skill Competency */}
            <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
               <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Năng lực kỹ năng</h3>
                  <span className="text-[10px] text-[#4338CA]">Diagnostic Test</span>
               </div>
               
               <div className="space-y-4">
                 <div>
                   <div className="mb-1 flex justify-between text-xs font-semibold">
                     <span>Nghe (Listening)</span>
                     <span className="font-bold text-[#4338CA]">65%</span>
                   </div>
                   <div className="h-1.5 rounded-full bg-[var(--muted)]"><div className="h-full w-[65%] rounded-full bg-[#4338CA]" /></div>
                 </div>
                 <div>
                   <div className="mb-1 flex justify-between text-xs font-semibold">
                     <span>Đọc (Reading)</span>
                     <span className="font-bold text-[#10B981]">80%</span>
                   </div>
                   <div className="h-1.5 rounded-full bg-[var(--muted)]"><div className="h-full w-[80%] rounded-full bg-[#10B981]" /></div>
                 </div>
                 <div>
                   <div className="mb-1 flex justify-between text-xs font-semibold">
                     <span>Viết (Writing)</span>
                     <span className="font-bold text-[#EF4444]">35% (Cần cải thiện!)</span>
                   </div>
                   <div className="h-1.5 rounded-full bg-[var(--muted)]"><div className="h-full w-[35%] rounded-full bg-[#EF4444]" /></div>
                 </div>
                 <div>
                   <div className="mb-1 flex justify-between text-xs font-semibold">
                     <span>Nói (Speaking)</span>
                     <span className="font-bold text-[#4338CA]">40%</span>
                   </div>
                   <div className="h-1.5 rounded-full bg-[var(--muted)]"><div className="h-full w-[40%] rounded-full bg-[#4338CA]" /></div>
                 </div>
               </div>
            </div>

            {/* Boss Test Widget */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
                 <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#efedff] text-[#4338CA]">
                   <LayoutList size={20} />
                 </span>
                 <div>
                   <h4 className="font-bold text-[var(--foreground)]">Mid-term Boss Test</h4>
                   <p className="text-xs text-[var(--muted-foreground)]">Phase 2 Assessment</p>
                 </div>
              </div>
              <p className="px-2 text-[11px] text-[var(--muted-foreground)]">Cần hoàn thành <strong>6 bài</strong> nữa để mở khóa bài kiểm tra tổng lực này.</p>
            </div>
            
            {/* Avatars */}
            <div className="flex items-center justify-between rounded-full border border-[var(--border)] bg-white p-2 pl-4">
               <div className="flex -space-x-2">
                 {['A', 'M', 'K'].map((l, i) => (
                   <div key={i} className="grid size-7 place-items-center rounded-full border-2 border-white bg-[#4338CA] text-[10px] font-bold text-white">
                     {l}
                   </div>
                 ))}
                 <div className="grid size-7 place-items-center rounded-full border-2 border-white bg-[#efedff] text-[10px] font-bold text-[#4338CA]">
                   +
                 </div>
               </div>
               <div className="ml-3 flex-1">
                 <p className="text-xs font-bold text-[var(--foreground)]">148 học viên</p>
                 <p className="text-[10px] text-[var(--muted-foreground)]">Đang cùng học chặng này</p>
               </div>
               <div className="grid size-6 place-items-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                 <ChevronRight size={14} />
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
