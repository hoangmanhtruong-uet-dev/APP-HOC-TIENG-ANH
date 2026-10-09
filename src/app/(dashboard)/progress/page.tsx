import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  Lightbulb,
  PlayCircle,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Báo cáo & Tiến độ học tập",
};

export default function ProgressPage() {
  return (
    <div className="min-h-[100dvh] bg-[var(--background)] px-4 pt-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        
        {/* Header Section */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-[#efedff] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4338CA]">
                ANALYTICS HUB
              </span>
              <span className="text-xs font-medium text-[var(--muted-foreground)]">
                • Cập nhật lần cuối: Hôm nay, 08:30
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">
              Báo cáo & Tiến độ học tập
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-xl border border-[var(--border)] bg-white p-1 shadow-sm">
              <button className="rounded-lg bg-[#efedff] px-4 py-2 text-sm font-bold text-[#4338CA]">
                7 ngày qua
              </button>
              <button className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                Tháng này
              </button>
              <button className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                Toàn thời gian
              </button>
            </div>
            <button className="flex items-center gap-2 rounded-xl bg-[#4338CA] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:scale-105">
              <Download size={16} /> Xuất báo cáo PDF
            </button>
          </div>
        </header>

        {/* 4 Key Metrics */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Card 1 */}
          <article className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
            <div className="relative z-10 flex items-start justify-between">
              <h3 className="text-sm font-semibold text-[var(--muted-foreground)]">Tổng giờ học</h3>
              <span className="grid size-10 place-items-center rounded-full bg-[#efedff] text-[#4338CA]">
                 <Clock size={20} />
              </span>
            </div>
            <div className="relative z-10 mt-4">
              <p className="text-3xl font-black text-[var(--foreground)]">24h 45m</p>
              <p className="mt-2 flex items-center gap-1 text-xs font-bold text-[#10B981]">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                 +12% so với tuần trước
              </p>
            </div>
            <div className="absolute -right-6 -bottom-6 size-24 rounded-full bg-[#efedff]/50" />
          </article>

          {/* Card 2 */}
          <article className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
            <div className="relative z-10 flex items-start justify-between">
              <h3 className="text-sm font-semibold text-[var(--muted-foreground)]">Bài học đã xong</h3>
              <span className="grid size-10 place-items-center rounded-full bg-[#efedff] text-[#4338CA]">
                 <CheckCircle2 size={20} />
              </span>
            </div>
            <div className="relative z-10 mt-4">
              <p className="text-3xl font-black text-[var(--foreground)]">38 <span className="text-lg font-semibold text-[var(--muted-foreground)]">/ 120 bài</span></p>
              <div className="mt-3 flex items-center gap-2">
                 <div className="h-1.5 w-full rounded-full bg-[#efedff]">
                    <div className="h-full w-[31%] rounded-full bg-[#4338CA]" />
                 </div>
              </div>
              <p className="mt-2 text-[11px] font-medium text-[var(--muted-foreground)]">Hoàn thành 31% lộ trình</p>
            </div>
            <div className="absolute -right-6 -bottom-6 size-24 rounded-full bg-[#efedff]/50" />
          </article>

          {/* Card 3 */}
          <article className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
            <div className="relative z-10 flex items-start justify-between">
              <h3 className="text-sm font-semibold text-[var(--muted-foreground)]">Band dự phóng</h3>
              <span className="grid size-10 place-items-center rounded-full bg-[#efedff] text-[#4338CA]">
                 <Award size={20} />
              </span>
            </div>
            <div className="relative z-10 mt-4">
              <div className="flex items-center gap-2">
                 <p className="text-3xl font-black text-[var(--foreground)]">7.0</p>
                 <span className="rounded-full bg-[#e6fbf2] px-2 py-0.5 text-[10px] font-bold text-[#10B981]">+0.5 tăng</span>
              </div>
              <p className="mt-2 text-xs font-medium text-[#4338CA]">Độ tin cậy mô hình: 75%</p>
            </div>
            <div className="absolute -right-6 -bottom-6 size-24 rounded-full bg-[#efedff]/50" />
          </article>

          {/* Card 4 */}
          <article className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
            <div className="relative z-10 flex items-start justify-between">
              <h3 className="text-sm font-semibold text-[var(--muted-foreground)]">Chuỗi liên tục (Streak)</h3>
              <span className="grid size-10 place-items-center rounded-full bg-[#fff6d8] text-[#F59E0B]">
                 <Flame size={20} />
              </span>
            </div>
            <div className="relative z-10 mt-4">
              <p className="text-3xl font-black text-[var(--foreground)]">12 Ngày</p>
              <p className="mt-2 flex items-center gap-1 text-xs font-bold text-[#F59E0B]">
                 <Award size={12} /> Đang giữ kỷ lục cá nhân!
              </p>
            </div>
            <div className="absolute -right-6 -bottom-6 size-24 rounded-full bg-[#fff6d8]/50" />
          </article>

        </div>

        {/* AI SMART INSIGHT */}
        <section className="mt-8 flex flex-col gap-5 rounded-2xl border-l-4 border-l-[#4338CA] bg-[#efedff] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
           <div className="flex gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#4338CA] text-white">
                <Lightbulb size={24} />
              </span>
              <div>
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4338CA]">AI SMART INSIGHT</span>
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">• Phát hiện điểm yếu cần tối ưu ngay</span>
                 </div>
                 <h3 className="mt-1 text-base font-bold text-[var(--foreground)] lg:text-lg">
                    Bạn đang gặp khó khăn nhỏ với cấu trúc phát âm nguyên âm đôi trong phần Speaking Part 2.
                 </h3>
              </div>
           </div>
           <button className="flex min-w-max items-center gap-2 rounded-xl bg-[#17152b] px-5 py-3 text-sm font-bold text-white transition-transform hover:scale-105">
              <PlayCircle size={18} /> Khắc phục ngay: Luyện phát âm nguyên âm đôi (15 phút)
           </button>
        </section>

        {/* 2-Column Layout */}
        <div className="mt-8 grid gap-8 lg:grid-cols-10 lg:items-start">
           
           {/* LEFT COLUMN (70%) */}
           <div className="space-y-8 lg:col-span-7">
              
              {/* Trend Chart */}
              <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
                 <div className="flex items-center justify-between">
                    <div>
                       <h2 className="text-lg font-bold text-[var(--foreground)]">Xu hướng điểm số qua các tuần</h2>
                       <p className="mt-1 text-xs text-[var(--muted-foreground)]">Mô phỏng sự tăng trưởng Band điểm tổng kết</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                       <span className="flex items-center gap-1.5"><div className="size-2.5 rounded-full bg-[#4338CA]" /> Band Dự phóng</span>
                       <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]"><div className="size-2.5 rounded-full bg-[var(--muted-foreground)]" /> Mục tiêu (7.5)</span>
                    </div>
                 </div>
                 
                 <div className="relative mt-8 h-64 w-full border-b border-l border-[var(--border)]">
                    {/* Mock SVG Line Chart */}
                    <div className="absolute inset-0 flex items-end justify-between px-6 pb-2">
                       <svg className="h-full w-full overflow-visible" preserveAspectRatio="none">
                          <defs>
                             <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4338CA" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#4338CA" stopOpacity="0" />
                             </linearGradient>
                          </defs>
                          {/* Goal Line */}
                          <line x1="0" y1="40" x2="100%" y2="40" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 6" />
                          {/* Area */}
                          <path d="M 0,200 C 10%,180 30%,170 50%,150 C 70%,130 80%,100 90%,90 C 95%,80 98%,75 100%,70 L 100%,256 L 0,256 Z" fill="url(#chartGradient)" />
                          {/* Line */}
                          <path d="M 0,200 C 10%,180 30%,170 50%,150 C 70%,130 80%,100 90%,90 C 95%,80 98%,75 100%,70" fill="none" stroke="#4338CA" strokeWidth="4" />
                          {/* Data points */}
                          <circle cx="0" cy="200" r="6" fill="#4338CA" />
                          <circle cx="20%" cy="176" r="6" fill="#4338CA" />
                          <circle cx="40%" cy="154" r="6" fill="#4338CA" />
                          <circle cx="60%" cy="120" r="6" fill="#4338CA" />
                          <circle cx="80%" cy="96" r="6" fill="#4338CA" />
                          <circle cx="100%" cy="70" r="6" fill="#4338CA" />
                       </svg>
                    </div>
                    {/* X axis labels */}
                    <div className="absolute -bottom-8 left-0 right-0 flex justify-between px-2 text-xs font-semibold text-[var(--muted-foreground)]">
                       <span>Tuần 1</span>
                       <span>Tuần 2</span>
                       <span>Tuần 3</span>
                       <span>Tuần 4</span>
                       <span>Tuần 5</span>
                       <span>Hiện tại</span>
                    </div>
                 </div>
              </section>

              {/* 6 Core Skills Breakdown */}
              <section>
                 <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[var(--foreground)]">Chi tiết 6 Kỹ năng cốt lõi</h2>
                    <span className="text-xs text-[var(--muted-foreground)]">Đánh giá chuẩn IELTS Format</span>
                 </div>
                 <div className="grid gap-4 sm:grid-cols-2">
                    {/* Reading */}
                    <article className="rounded-2xl border border-[var(--border)] bg-[#fbf9ff] p-5">
                       <div className="flex items-center justify-between">
                          <h3 className="font-bold text-[var(--foreground)]">Reading</h3>
                          <span className="rounded-md bg-[#e6fbf2] px-2 py-0.5 text-xs font-bold text-[#10B981]">Band 7.5</span>
                       </div>
                       <div className="mt-4 flex items-center justify-between text-xs font-bold">
                          <span className="text-[var(--muted-foreground)]">Tiến độ: 85%</span>
                          <span className="text-[#10B981]">Điểm mạnh</span>
                       </div>
                       <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--muted)]">
                          <div className="h-full w-[85%] rounded-full bg-[#10B981]" />
                       </div>
                    </article>
                    
                    {/* Listening */}
                    <article className="rounded-2xl border border-[var(--border)] bg-[#fbf9ff] p-5">
                       <div className="flex items-center justify-between">
                          <h3 className="font-bold text-[var(--foreground)]">Listening</h3>
                          <span className="rounded-md bg-[#e6fbf2] px-2 py-0.5 text-xs font-bold text-[#10B981]">Band 7.0</span>
                       </div>
                       <div className="mt-4 flex items-center justify-between text-xs font-bold">
                          <span className="text-[var(--muted-foreground)]">Tiến độ: 75%</span>
                          <span className="text-[#10B981]">Ổn định</span>
                       </div>
                       <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--muted)]">
                          <div className="h-full w-[75%] rounded-full bg-[#10B981]" />
                       </div>
                    </article>

                    {/* Speaking */}
                    <article className="rounded-2xl border border-[var(--border)] bg-[#fbf9ff] p-5">
                       <div className="flex items-center justify-between">
                          <h3 className="font-bold text-[var(--foreground)]">Speaking</h3>
                          <span className="rounded-md bg-[#fff6d8] px-2 py-0.5 text-xs font-bold text-[#F59E0B]">Band 6.5</span>
                       </div>
                       <div className="mt-4 flex items-center justify-between text-xs font-bold">
                          <span className="text-[var(--muted-foreground)]">Tiến độ: 65%</span>
                          <span className="text-[#F59E0B]">Cần chú ý</span>
                       </div>
                       <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--muted)]">
                          <div className="h-full w-[65%] rounded-full bg-[#F59E0B]" />
                       </div>
                    </article>

                    {/* Writing */}
                    <article className="rounded-2xl border border-[var(--border)] bg-[#fbf9ff] p-5">
                       <div className="flex items-center justify-between">
                          <h3 className="font-bold text-[var(--foreground)]">Writing</h3>
                          <span className="rounded-md bg-[#fff6d8] px-2 py-0.5 text-xs font-bold text-[#F59E0B]">Band 6.0</span>
                       </div>
                       <div className="mt-4 flex items-center justify-between text-xs font-bold">
                          <span className="text-[var(--muted-foreground)]">Tiến độ: 60%</span>
                          <span className="text-[#F59E0B]">Cần chú ý</span>
                       </div>
                       <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--muted)]">
                          <div className="h-full w-[60%] rounded-full bg-[#F59E0B]" />
                       </div>
                    </article>

                    {/* Vocabulary */}
                    <article className="rounded-2xl border border-[var(--border)] bg-[#fbf9ff] p-5">
                       <div className="flex items-center justify-between">
                          <h3 className="font-bold text-[var(--foreground)]">Vocabulary</h3>
                          <span className="rounded-md bg-[#efedff] px-2 py-0.5 text-xs font-bold text-[#4338CA]">Band 7.0</span>
                       </div>
                       <div className="mt-4 flex items-center justify-between text-xs font-bold">
                          <span className="text-[var(--muted-foreground)]">Tiến độ: 80%</span>
                          <span className="text-[#4338CA]">Điểm mạnh</span>
                       </div>
                       <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--muted)]">
                          <div className="h-full w-[80%] rounded-full bg-[#4338CA]" />
                       </div>
                    </article>

                    {/* Grammar */}
                    <article className="rounded-2xl border border-[var(--border)] bg-[#fbf9ff] p-5">
                       <div className="flex items-center justify-between">
                          <h3 className="font-bold text-[var(--foreground)]">Grammar</h3>
                          <span className="rounded-md bg-[#efedff] px-2 py-0.5 text-xs font-bold text-[#4338CA]">Band 6.5</span>
                       </div>
                       <div className="mt-4 flex items-center justify-between text-xs font-bold">
                          <span className="text-[var(--muted-foreground)]">Tiến độ: 70%</span>
                          <span className="text-[#4338CA]">Khá tốt</span>
                       </div>
                       <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--muted)]">
                          <div className="h-full w-[70%] rounded-full bg-[#4338CA]" />
                       </div>
                    </article>
                 </div>
              </section>

           </div>

           {/* RIGHT COLUMN (30%) */}
           <div className="space-y-8 lg:col-span-3">
              
              {/* Radar Chart */}
              <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
                 <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[var(--foreground)]">Cân bằng kỹ năng</h3>
                    <span className="text-[10px] text-[var(--muted-foreground)]">Radar phân bổ năng lực</span>
                 </div>
                 
                 <div className="mt-6 flex justify-center py-4">
                    {/* Mock SVG Radar Chart */}
                    <svg width="200" height="200" viewBox="0 0 200 200">
                       {/* Grid lines */}
                       <polygon points="100,10 180,55 180,145 100,190 20,145 20,55" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                       <polygon points="100,40 152,70 152,130 100,160 48,130 48,70" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                       <polygon points="100,70 126,85 126,115 100,130 74,115 74,85" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                       {/* Axis lines */}
                       <line x1="100" y1="100" x2="100" y2="10" stroke="#e2e8f0" strokeWidth="2" />
                       <line x1="100" y1="100" x2="180" y2="55" stroke="#e2e8f0" strokeWidth="2" />
                       <line x1="100" y1="100" x2="180" y2="145" stroke="#e2e8f0" strokeWidth="2" />
                       <line x1="100" y1="100" x2="100" y2="190" stroke="#e2e8f0" strokeWidth="2" />
                       <line x1="100" y1="100" x2="20" y2="145" stroke="#e2e8f0" strokeWidth="2" />
                       <line x1="100" y1="100" x2="20" y2="55" stroke="#e2e8f0" strokeWidth="2" />
                       {/* Data polygon */}
                       <polygon points="100,20 160,65 150,135 100,170 30,135 35,65" fill="#4338CA" fillOpacity="0.2" stroke="#4338CA" strokeWidth="3" strokeLinejoin="round" />
                       {/* Dots */}
                       <circle cx="100" cy="20" r="4" fill="#4338CA" />
                       <circle cx="160" cy="65" r="4" fill="#4338CA" />
                       <circle cx="150" cy="135" r="4" fill="#4338CA" />
                       <circle cx="100" cy="170" r="4" fill="#4338CA" />
                       <circle cx="30" cy="135" r="4" fill="#4338CA" />
                       <circle cx="35" cy="65" r="4" fill="#4338CA" />
                    </svg>
                 </div>

                 <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
                    <div className="flex justify-between rounded-lg bg-[var(--muted)] px-3 py-2">
                       <span className="text-[var(--muted-foreground)]">Reading:</span> <span>7.5</span>
                    </div>
                    <div className="flex justify-between rounded-lg bg-[var(--muted)] px-3 py-2">
                       <span className="text-[var(--muted-foreground)]">Listening:</span> <span>7.0</span>
                    </div>
                    <div className="flex justify-between rounded-lg bg-[var(--muted)] px-3 py-2">
                       <span className="text-[var(--muted-foreground)]">Writing:</span> <span>6.0</span>
                    </div>
                    <div className="flex justify-between rounded-lg bg-[var(--muted)] px-3 py-2">
                       <span className="text-[var(--muted-foreground)]">Speaking:</span> <span>6.5</span>
                    </div>
                    <div className="flex justify-between rounded-lg bg-[var(--muted)] px-3 py-2">
                       <span className="text-[var(--muted-foreground)]">Vocab:</span> <span>7.0</span>
                    </div>
                    <div className="flex justify-between rounded-lg bg-[var(--muted)] px-3 py-2">
                       <span className="text-[var(--muted-foreground)]">Grammar:</span> <span>6.5</span>
                    </div>
                 </div>
              </section>

              {/* Vocabulary Vault */}
              <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
                 <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[var(--foreground)]">Vocabulary Vault</h3>
                    <BookOpen size={20} className="text-[#4338CA]" />
                 </div>
                 <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[#fbf9ff] p-5 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center justify-between sm:justify-start sm:gap-6">
                       <div>
                          <p className="text-xs font-semibold text-[var(--muted-foreground)]">Tổng từ đã lưu</p>
                          <p className="mt-1 text-2xl font-black text-[var(--foreground)]">1,240 từ</p>
                       </div>
                       <div className="h-10 w-px bg-[var(--border)]" />
                       <div>
                          <p className="text-xs font-semibold text-[var(--muted-foreground)]">Cần ôn tập ngay</p>
                          <p className="mt-1 text-2xl font-black text-[#F59E0B]">35 từ</p>
                       </div>
                    </div>
                    <button className="rounded-xl bg-[#4338CA] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:scale-105">
                       Ôn tập
                    </button>
                 </div>
              </section>

              {/* Heatmap */}
              <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
                 <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[var(--foreground)]">Bản đồ hoạt động</h3>
                    <span className="text-[10px] text-[var(--muted-foreground)]">365 ngày học tập</span>
                 </div>
                 
                 <div className="mt-6">
                    {/* Mock Heatmap Grids */}
                    <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1">
                       {Array.from({ length: 45 }).map((_, i) => {
                          
                          const opacity = [10, 20, 30, 40, 60, 80, 100][Math.floor(Math.random() * 7)];
                          
                          const isWhite = Math.random() > 0.6;
                          return (
                             <div 
                               key={i} 
                               className="aspect-square rounded-[2px]" 
                               style={{ backgroundColor: isWhite ? 'var(--muted)' : `color-mix(in srgb, #4338CA ${opacity}%, transparent)` }} 
                             />
                          )
                       })}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[10px] font-semibold text-[var(--muted-foreground)]">
                       <span>Ít hoạt động</span>
                       <div className="flex gap-1">
                          <div className="size-2.5 rounded-sm bg-[var(--muted)]" />
                          <div className="size-2.5 rounded-sm bg-[#4338CA]/30" />
                          <div className="size-2.5 rounded-sm bg-[#4338CA]/60" />
                          <div className="size-2.5 rounded-sm bg-[#4338CA]" />
                       </div>
                       <span>Cực kỳ chăm chỉ</span>
                    </div>
                 </div>
              </section>

           </div>
        </div>
      </div>
    </div>
  );
}
