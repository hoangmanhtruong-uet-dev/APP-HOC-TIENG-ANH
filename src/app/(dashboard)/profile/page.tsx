import {
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  FileText,
  Flame,
  Headphones,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireCurrentAccount } from "@/features/auth/server/account";
import { getCurrentLearnerProfile } from "@/features/onboarding/server/learner-profile";

export const metadata: Metadata = { title: "Profile & Settings" };

export default async function ProfilePage() {
  const [account, learnerProfile] = await Promise.all([
    requireCurrentAccount(),
    getCurrentLearnerProfile(),
  ]);

  const displayName = account.profile?.display_name || account.user.email.split("@")[0];

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] px-4 pb-24 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        
        {/* Cover Photo & Header Profile */}
        <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
          <div className="relative h-48 w-full bg-[#efedff]">
            {/* Mock Cover Image */}
            <div 
               className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80" 
               style={{ backgroundImage: "linear-gradient(to right, #4338ca, #3b82f6)" }}
            >
               {/* Abstract pattern */}
               <svg className="absolute inset-0 h-full w-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d="M0,50 C20,20 40,80 60,50 C80,20 100,50 100,50 L100,100 L0,100 Z" fill="#ffffff" opacity="0.1" />
                  <path d="M0,70 C30,40 50,90 80,60 C90,50 100,70 100,70 L100,100 L0,100 Z" fill="#ffffff" opacity="0.2" />
               </svg>
            </div>
            
            <button className="absolute right-4 top-4 flex items-center gap-2 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-semibold text-[var(--foreground)] shadow-sm hover:bg-white backdrop-blur-md">
              <Camera size={16} /> Đổi ảnh bìa
            </button>
          </div>
          
          <div className="flex flex-col gap-4 p-6 pt-0 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
               <div className="relative -mt-16 inline-block">
                 <div className="grid size-32 place-items-center rounded-full bg-[#efedff] border-4 border-white shadow-md text-[#4338CA]">
                   <UserRound size={48} />
                 </div>
                 <button className="absolute bottom-1 right-1 grid size-8 place-items-center rounded-full bg-white border border-[var(--border)] shadow-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                   <Camera size={14} />
                 </button>
                 <span className="absolute bottom-2 left-0 rounded-full bg-[#4338CA] px-2 py-0.5 text-[10px] font-bold text-white border-2 border-white">
                   A2
                 </span>
               </div>
               <div className="mb-2">
                 <div className="flex items-center gap-2">
                   <h1 className="text-2xl font-extrabold text-[var(--foreground)]">{displayName}</h1>
                   <span className="flex items-center gap-1 rounded-full bg-[#efedff] px-2 py-0.5 text-[10px] font-bold text-[#4338CA]">
                     <AwardIcon size={12} /> IELTS Fighter
                   </span>
                 </div>
                 <div className="mt-1 flex items-center gap-3 text-sm font-medium text-[var(--muted-foreground)]">
                   <span className="flex items-center gap-1.5"><Target size={14} /> Mục tiêu: <strong className="text-[var(--foreground)]">IELTS 7.0</strong></span>
                   <span className="size-1 rounded-full bg-[var(--muted-foreground)]" />
                   <span className="flex items-center gap-1.5"><Flame size={14} className="text-[#F59E0B]" /> Chuỗi học: <strong className="text-[var(--foreground)]">12 Ngày liên tiếp</strong></span>
                 </div>
               </div>
            </div>
            
            <div className="flex items-center gap-3 mb-2">
               <div className="flex items-center gap-2 rounded-xl bg-[var(--muted)] px-3 py-2 text-sm font-semibold">
                 Hồ sơ công khai
                 <div className="relative h-5 w-9 rounded-full bg-[#4338CA] p-0.5 shadow-inner">
                    <div className="h-4 w-4 translate-x-4 rounded-full bg-white shadow-sm" />
                 </div>
               </div>
               <button className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-bold text-[var(--foreground)] shadow-sm hover:bg-[var(--muted)]">
                 <Copy size={16} /> Sao chép liên kết
               </button>
            </div>
          </div>
        </section>

        {/* 2-Column Layout */}
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          
          {/* Sidebar Menu (3/12) */}
          <aside className="lg:col-span-3">
             <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0 sticky top-24">
                <Link href="#" className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl bg-[#4338CA] px-4 py-3 text-sm font-bold text-white shadow-sm">
                   <Target size={18} /> Mục tiêu & Kế hoạch học
                </Link>
                <Link href="#" className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-white hover:text-[var(--foreground)]">
                   <UserRound size={18} /> Hồ sơ cá nhân
                </Link>
                <Link href="#" className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-white hover:text-[var(--foreground)]">
                   <Bell size={18} /> Thông báo & Nhắc học
                </Link>
                <Link href="#" className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-white hover:text-[var(--foreground)]">
                   <AwardIcon size={18} /> Gói cước & Quản trị VIP
                </Link>
                <Link href="#" className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-white hover:text-[var(--foreground)]">
                   <ShieldCheck size={18} /> Bảo mật & Tài khoản
                </Link>
             </nav>
          </aside>

          {/* Main Content (9/12) */}
          <main className="space-y-6 lg:col-span-9">
            
            {/* Section 1: Kỳ thi & Điểm số mục tiêu */}
            <section className="rounded-3xl border border-[var(--border)] bg-white p-6 sm:p-8 shadow-sm">
               <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--foreground)]">Kỳ thi & Điểm số mục tiêu</h2>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">Cấu hình lộ trình ôn luyện IELTS chính thức của bạn</p>
                  </div>
                  <span className="text-sm font-semibold text-[#4338CA]">ID: IS-98240</span>
               </div>
               
               <div className="mt-8 grid gap-6 sm:grid-cols-3">
                  <div>
                     <label className="text-xs font-semibold text-[var(--foreground)]">Loại kỳ thi</label>
                     <div className="mt-2 flex h-11 items-center justify-between rounded-xl border border-[var(--border)] bg-[#fbf9ff] px-4 text-sm font-medium">
                        IELTS Academic <ChevronDown size={16} className="text-[var(--muted-foreground)]" />
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-semibold text-[var(--foreground)]">Mục tiêu Band</label>
                     <div className="mt-2 flex h-11 items-center justify-between rounded-xl border border-[var(--border)] bg-[#fbf9ff] px-4 text-sm font-medium">
                        7.0 <ChevronDown size={16} className="text-[var(--muted-foreground)]" />
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-semibold text-[var(--foreground)]">Ngày thi dự kiến</label>
                     <div className="mt-2 flex h-11 items-center justify-between rounded-xl border border-[var(--border)] bg-[#efedff] px-4 text-sm font-medium">
                        15/12/2026 <CalendarDays size={16} className="text-[var(--foreground)]" />
                     </div>
                  </div>
               </div>

               <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-[#fbf9ff] p-5 border border-[var(--border)]">
                  <div className="flex items-center gap-4">
                     <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#4338CA] text-lg font-bold text-white shadow-md">
                        4.5
                     </span>
                     <div>
                        <p className="text-xs text-[var(--muted-foreground)]">Điểm xuất phát (Diagnostic Band)</p>
                        <p className="font-bold text-[var(--foreground)]">
                           Band 4.5 <span className="font-medium text-[#4338CA]">(Còn lại 74 ngày đến kỳ thi)</span>
                        </p>
                     </div>
                  </div>
                  <button className="flex items-center gap-2 rounded-xl bg-white border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm hover:bg-[var(--muted)]">
                     <RotateCcwIcon size={16} /> Làm lại bài test chẩn đoán
                  </button>
               </div>
            </section>

            {/* Section 2: Mục tiêu kỹ năng thành phần */}
            <section className="rounded-3xl border border-[var(--border)] bg-white p-6 sm:p-8 shadow-sm">
               <div>
                 <h2 className="text-lg font-bold text-[var(--foreground)]">Mục tiêu kỹ năng thành phần</h2>
                 <p className="mt-1 text-sm text-[var(--muted-foreground)]">Tinh chỉnh band điểm mục tiêu cho từng kỹ năng riêng biệt</p>
               </div>
               
               <div className="mt-6 grid gap-4 sm:grid-cols-4">
                  <div className="rounded-2xl bg-[#fbf9ff] p-4 border border-[var(--border)]">
                     <div className="flex justify-between text-[#4338CA]">
                        <span className="font-bold text-[var(--foreground)]">Listening</span> <Headphones size={18} />
                     </div>
                     <div className="mt-3 flex h-10 items-center justify-between rounded-lg bg-white border border-[var(--border)] px-3 text-sm font-bold">
                        7.0 <ChevronDown size={14} className="text-[var(--muted-foreground)]" />
                     </div>
                  </div>
                  <div className="rounded-2xl bg-[#fbf9ff] p-4 border border-[var(--border)]">
                     <div className="flex justify-between text-[#4338CA]">
                        <span className="font-bold text-[var(--foreground)]">Reading</span> <BookOpen size={18} />
                     </div>
                     <div className="mt-3 flex h-10 items-center justify-between rounded-lg bg-white border border-[var(--border)] px-3 text-sm font-bold">
                        7.5 <ChevronDown size={14} className="text-[var(--muted-foreground)]" />
                     </div>
                  </div>
                  <div className="rounded-2xl bg-[#fbf9ff] p-4 border border-[var(--border)]">
                     <div className="flex justify-between text-[#4338CA]">
                        <span className="font-bold text-[var(--foreground)]">Writing</span> <FileText size={18} />
                     </div>
                     <div className="mt-3 flex h-10 items-center justify-between rounded-lg bg-white border border-[var(--border)] px-3 text-sm font-bold">
                        6.5 <ChevronDown size={14} className="text-[var(--muted-foreground)]" />
                     </div>
                  </div>
                  <div className="rounded-2xl bg-[#fbf9ff] p-4 border border-[var(--border)]">
                     <div className="flex justify-between text-[#4338CA]">
                        <span className="font-bold text-[var(--foreground)]">Speaking</span> <MicIcon size={18} />
                     </div>
                     <div className="mt-3 flex h-10 items-center justify-between rounded-lg bg-white border border-[var(--border)] px-3 text-sm font-bold">
                        6.5 <ChevronDown size={14} className="text-[var(--muted-foreground)]" />
                     </div>
                  </div>
               </div>
            </section>

            {/* Section 3: Kế hoạch học tập hàng ngày */}
            <section className="rounded-3xl border border-[var(--border)] bg-white p-6 sm:p-8 shadow-sm">
               <div>
                 <h2 className="text-lg font-bold text-[var(--foreground)]">Kế hoạch học tập hàng ngày</h2>
                 <p className="mt-1 text-sm text-[var(--muted-foreground)]">Duy trì thói quen học đều đặn để đạt kết quả tối ưu</p>
               </div>
               
               <div className="mt-8">
                  <label className="text-xs font-semibold text-[var(--foreground)]">Ngày học trong tuần</label>
                  <div className="mt-3 flex flex-wrap gap-2">
                     {["T2", "T3", "T4", "T5", "T6"].map(day => (
                        <button key={day} className="grid size-10 place-items-center rounded-xl bg-[#4338CA] text-sm font-bold text-white shadow-sm">
                           {day}
                        </button>
                     ))}
                     {["T7", "CN"].map(day => (
                        <button key={day} className="grid size-10 place-items-center rounded-xl bg-white border border-[var(--border)] text-sm font-bold text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
                           {day}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div>
                     <label className="text-xs font-semibold text-[var(--foreground)]">Thời lượng học mỗi ngày</label>
                     <div className="mt-2 flex h-11 items-center justify-between rounded-xl border border-[var(--border)] bg-[#fbf9ff] px-4 text-sm font-medium">
                        60 phút / ngày <ChevronDown size={16} className="text-[var(--muted-foreground)]" />
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-semibold text-[var(--foreground)]">Khung giờ vàng nhắc học</label>
                     <div className="mt-2 flex h-11 items-center justify-between rounded-xl border border-[var(--border)] bg-[#fbf9ff] px-4 text-sm font-medium">
                        20:30 PM <Clock size={16} className="text-[var(--foreground)]" />
                     </div>
                  </div>
               </div>

               <div className="mt-6 flex items-center gap-3">
                  <div className="grid size-5 place-items-center rounded bg-[#4338CA] text-white">
                     <CheckCircle2 size={14} />
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)]">Đồng bộ tự động lịch học vào Google Calendar</span>
               </div>
            </section>

            {/* Section 4: Hạn mức AI hôm nay */}
            <section className="rounded-3xl border border-[var(--border)] bg-white p-6 sm:p-8 shadow-sm">
               <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--foreground)]">Hạn mức AI hôm nay</h2>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">Dung lượng sử dụng trợ lý ảo chấm bài & luyện nói</p>
                  </div>
                  <span className="rounded-full bg-[#efedff] px-3 py-1 text-xs font-bold text-[#4338CA]">VIP Plan</span>
               </div>
               
               <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#fbf9ff] p-5 border border-[var(--border)]">
                     <div className="flex items-center justify-between text-sm font-bold">
                        <span>Writing AI Prompts</span>
                        <span className="text-[#4338CA]">14 / 20</span>
                     </div>
                     <div className="mt-3 h-2 w-full rounded-full bg-[var(--muted)]">
                        <div className="h-full rounded-full bg-[#4338CA]" style={{ width: '70%' }} />
                     </div>
                     <p className="mt-3 text-[10px] text-[var(--muted-foreground)]">Làm mới sau 4 giờ tới</p>
                  </div>
                  
                  <div className="rounded-2xl bg-[#fbf9ff] p-5 border border-[var(--border)]">
                     <div className="flex items-center justify-between text-sm font-bold">
                        <span>Speaking Practice Minutes</span>
                        <span className="text-[#4338CA]">45 / 60 phút</span>
                     </div>
                     <div className="mt-3 h-2 w-full rounded-full bg-[var(--muted)]">
                        <div className="h-full rounded-full bg-[#4338CA]" style={{ width: '75%' }} />
                     </div>
                     <p className="mt-3 text-[10px] text-[var(--muted-foreground)]">Làm mới vào ngày mai</p>
                  </div>
               </div>
            </section>
          </main>
        </div>
      </div>
      
      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-white/95 px-4 py-4 backdrop-blur-xl shadow-[0_-10px_40px_rgb(var(--shadow-color)/0.05)] sm:px-8">
         <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="size-2 rounded-full bg-[#F59E0B]" />
               <span className="text-sm font-medium text-[var(--muted-foreground)]">Bạn có thay đổi chưa lưu</span>
            </div>
            <div className="flex items-center gap-3">
               <button className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
                  Hủy bỏ
               </button>
               <button className="rounded-xl bg-[#4338CA] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#4338CA]/90">
                  Lưu cài đặt mục tiêu
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}

// Icon fallbacks (using generic lucide icons mapped to names)
function AwardIcon(props: any) {
  return <Target {...props} />;
}
function RotateCcwIcon(props: any) {
  return <Flame {...props} />;
}
function MicIcon(props: any) {
  return <Bell {...props} />;
}
