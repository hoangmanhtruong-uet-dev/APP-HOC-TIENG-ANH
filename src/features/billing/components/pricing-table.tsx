"use client";

import { Check, ChevronDown, CreditCard, Flame, Minus, ShieldCheck, Star, Zap } from "lucide-react";
import { useState } from "react";

const features = [
  {
    name: "Kho bài tập Reading & Listening",
    free: "5 bài mẫu",
    plus: "Không giới hạn",
    pro: "Không giới hạn",
  },
  {
    name: "Công nghệ chấm chữa Writing AI",
    free: "-",
    plus: "5 bài / tháng",
    pro: "Không giới hạn (4 tiêu chí)",
  },
  {
    name: "Luyện Speaking 1:1 với AI",
    free: "-",
    plus: "-",
    pro: "Không giới hạn",
  },
  {
    name: "Mock Test chuẩn máy tính",
    free: "1 đề tổng hợp",
    plus: "5 đề / tháng",
    pro: "Kho đề thi thật mới nhất",
  },
  {
    name: "Flashcard từ vựng thông minh SRS",
    free: "Tối đa 50 từ",
    plus: "Không giới hạn",
    pro: "Không giới hạn + Bộ từ IELTS 8.0",
  },
  {
    name: "Dự báo Band điểm & Lộ trình cá nhân",
    free: "-",
    plus: "Cơ bản",
    pro: "Chuyên sâu (Cập nhật real-time)",
  },
];

const faqs = [
  {
    question: "Tôi có thể nâng cấp từ gói Go Plus lên Pro bất cứ lúc nào không?",
    answer: "Chắc chắn rồi. Số tiền bạn đã thanh toán cho gói Go Plus chưa sử dụng hết sẽ được tự động trừ đi khi bạn thanh toán nâng cấp lên gói Pro.",
  },
  {
    question: "Hệ thống AI chấm điểm Writing và Speaking chuẩn cỡ nào?",
    answer: "AI của chúng tôi được huấn luyện dựa trên bộ quy tắc chấm thi IELTS thực tế (IELTS Band Descriptors) với độ chính xác trên 90% so với Examiner thật, phân tích sâu cả 4 tiêu chí TR, CC, LR, GRA (Writing) và FC, PR, LR, GRA (Speaking).",
  },
  {
    question: "Thời gian kích hoạt tài khoản sau khi thanh toán qua VietQR là bao lâu?",
    answer: "Tài khoản của bạn sẽ được nâng cấp lên VIP tự động ngay trong 30 giây sau khi chuyển khoản thành công bằng mã VietQR, không cần phải chờ đợi nhân viên kích hoạt.",
  },
];

export function PricingTable() {
  const [isYearly, setIsYearly] = useState(true);

  return (
    <div className="mx-auto max-w-6xl pb-24 pt-12 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d8d2ff] bg-[#efedff] px-4 py-1.5 text-sm font-bold text-[#4338CA]">
           <ShieldCheck size={16} /> Cam kết chất lượng chuẩn khảo thí quốc tế
        </div>
        <h1 className="mt-6 text-3xl font-black uppercase tracking-tight text-[var(--foreground)] sm:text-4xl">
          Đầu tư cho mục tiêu IELTS của bạn
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--muted-foreground)]">
          Lựa chọn lộ trình học tập thông minh với sự hỗ trợ của trí tuệ nhân tạo, giúp bạn bứt phá band điểm nhanh chóng và tiết kiệm tối đa thời gian.
        </p>

        {/* Toggle Switch */}
        <div className="mx-auto mt-8 inline-flex items-center rounded-full bg-[var(--muted)] p-1">
          <button
            onClick={() => setIsYearly(false)}
            className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
              !isYearly ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Thanh toán hàng tháng
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
              isYearly ? "bg-[#4338CA] text-white shadow-md" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Theo năm <span className="flex items-center gap-1 rounded bg-[#EF4444] px-1.5 py-0.5 text-[10px] text-white"><Flame size={10} /> -35% + Tặng 2 tháng</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        
        {/* Card 1: Free */}
        <div className="flex flex-col justify-between rounded-3xl border border-[var(--border)] bg-[#fbf9ff] p-8">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Cơ bản</span>
            <h3 className="mt-2 text-xl font-black text-[var(--foreground)]">Gói Khởi Động</h3>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Trải nghiệm nền tảng tự học IELTS cơ bản cho người mới bắt đầu.</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-3xl font-black text-[var(--foreground)]">0đ</span>
              <span className="text-sm font-semibold text-[var(--muted-foreground)]">/ mãi mãi</span>
            </div>
            
            <ul className="mt-8 space-y-4 text-sm font-medium">
              <li className="flex items-start gap-3"><Check size={18} className="shrink-0 text-[#4338CA]" /> 5 bài Reading & Listening tiêu chuẩn</li>
              <li className="flex items-start gap-3"><Check size={18} className="shrink-0 text-[#4338CA]" /> Lưu trữ tối đa 50 từ vựng cá nhân</li>
              <li className="flex items-start gap-3"><Check size={18} className="shrink-0 text-[#4338CA]" /> Từ điển tích hợp tra cứu nhanh</li>
              <li className="flex items-start gap-3 text-[var(--muted-foreground)] opacity-70"><Minus size={18} className="shrink-0" /> Chấm bài Writing tự động bằng AI</li>
              <li className="flex items-start gap-3 text-[var(--muted-foreground)] opacity-70"><Minus size={18} className="shrink-0" /> Luyện Speaking 1:1 cùng trợ lý ảo</li>
            </ul>
          </div>
          <button className="mt-8 w-full rounded-xl bg-[var(--muted)] px-4 py-3.5 text-sm font-bold text-[var(--muted-foreground)]" disabled>
            Đang sử dụng
          </button>
        </div>

        {/* Card 2: Plus */}
        <div className="flex flex-col justify-between rounded-3xl border border-[#d8d2ff] bg-[#efedff] p-8 shadow-sm">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4338CA]">Phổ biến</span>
            <h3 className="mt-2 text-xl font-black text-[var(--foreground)]">Gói Go Plus</h3>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Dành cho học viên cần luyện tập cường độ cao 2 kỹ năng Tiếp nhận.</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-3xl font-black text-[var(--foreground)]">99.000đ</span>
              <span className="text-sm font-semibold text-[var(--muted-foreground)]">/ tháng</span>
            </div>
            <p className="mt-1 text-[10px] font-bold text-[#10B981]">Thanh toán theo năm: tiết kiệm hơn (~3,300đ/ngày)</p>
            
            <ul className="mt-8 space-y-4 text-sm font-medium">
              <li className="flex items-start gap-3"><Check size={18} className="shrink-0 text-[#4338CA]" /> Không giới hạn bài Reading & Listening</li>
              <li className="flex items-start gap-3"><Check size={18} className="shrink-0 text-[#4338CA]" /> Hệ thống Flashcard SRS thông minh</li>
              <li className="flex items-start gap-3"><Check size={18} className="shrink-0 text-[#4338CA]" /> 5 bài Writing AI chấm chữa chi tiết/tháng</li>
              <li className="flex items-start gap-3"><Check size={18} className="shrink-0 text-[#4338CA]" /> Kho đề thi cập nhật liên tục hàng tuần</li>
              <li className="flex items-start gap-3 text-[var(--muted-foreground)] opacity-70"><Minus size={18} className="shrink-0" /> Luyện Speaking 1:1 không giới hạn</li>
            </ul>
          </div>
          <button className="mt-8 w-full rounded-xl bg-[#4338CA] px-4 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-[#4338CA]/90 transition-colors" onClick={() => alert("Chức năng thanh toán đang được tích hợp!")}>
            Chọn Go Plus
          </button>
        </div>

        {/* Card 3: Pro */}
        <div className="relative flex flex-col justify-between rounded-3xl border-2 border-[#4338CA] bg-white p-8 shadow-xl">
          <div className="absolute -top-4 right-6 flex items-center gap-1.5 rounded-full bg-[#4338CA] px-3 py-1 text-xs font-bold text-white shadow-sm">
            <Star size={12} fill="currentColor" /> KHUYÊN DÙNG
          </div>
          <div>
            <span className="rounded bg-[#efedff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4338CA]">Được 78% học viên chọn</span>
            <h3 className="mt-3 text-xl font-black text-[var(--foreground)]">Gói IELTS Pro</h3>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Giải pháp toàn diện 4 kỹ năng với AI độc quyền cho mục tiêu Band 7.0+</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-3xl font-black text-[#4338CA]">199.000đ</span>
              <span className="text-sm font-semibold text-[var(--muted-foreground)]">/ tháng</span>
            </div>
            <p className="mt-1 text-[10px] font-bold text-[#4338CA]">Tương đương ~6,000đ/ngày - Hoàn tiền vô điều kiện sau 1 tuần</p>
            
            <ul className="mt-8 space-y-4 text-sm font-bold">
              <li className="flex items-start gap-3"><Check size={18} className="shrink-0 text-[#4338CA]" /> Trọn bộ 4 kỹ năng (Nghe - Nói - Đọc - Viết) không giới hạn</li>
              <li className="flex items-start gap-3"><Check size={18} className="shrink-0 text-[#4338CA]" /> AI chấm Writing 4 tiêu chí chuẩn Examiner</li>
              <li className="flex items-start gap-3"><Check size={18} className="shrink-0 text-[#4338CA]" /> AI Speaking 1:1 sửa phát âm & từ vựng tức thì</li>
              <li className="flex items-start gap-3"><Check size={18} className="shrink-0 text-[#4338CA]" /> Mock Test chuẩn giao diện máy tính thật</li>
              <li className="flex items-start gap-3"><Check size={18} className="shrink-0 text-[#4338CA]" /> Dự báo Band điểm AI chính xác tới 95%</li>
            </ul>
          </div>
          <button className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4338CA] px-4 py-3.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-105" onClick={() => alert("Chức năng thanh toán đang được tích hợp!")}>
            BẮT ĐẦU VỚI GÓI PRO →
          </button>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="mt-16 grid gap-4 sm:grid-cols-3">
         <div className="flex items-center gap-4 rounded-2xl bg-[#fbf9ff] p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#efedff] text-[#4338CA]"><ShieldCheck size={20} /></span>
            <div>
               <h4 className="font-bold text-[var(--foreground)]">Hoàn tiền 100%</h4>
               <p className="text-xs text-[var(--muted-foreground)]">Trong 7 ngày đầu nếu không hài lòng</p>
            </div>
         </div>
         <div className="flex items-center gap-4 rounded-2xl bg-[#fbf9ff] p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#efedff] text-[#4338CA]"><Zap size={20} /></span>
            <div>
               <h4 className="font-bold text-[var(--foreground)]">Kích hoạt tức thì</h4>
               <p className="text-xs text-[var(--muted-foreground)]">Tự động qua VietQR 24/7</p>
            </div>
         </div>
         <div className="flex items-center gap-4 rounded-2xl bg-[#fbf9ff] p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#efedff] text-[#4338CA]"><CreditCard size={20} /></span>
            <div>
               <h4 className="font-bold text-[var(--foreground)]">Thanh toán đa dạng</h4>
               <p className="text-xs text-[var(--muted-foreground)]">MoMo, VNPAY, Visa, Master</p>
            </div>
         </div>
      </div>

      {/* Comparison Table */}
      <div className="mt-24">
         <div className="text-center">
            <h2 className="text-2xl font-bold text-[var(--foreground)]">So sánh chi tiết tính năng</h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Xem kỹ các đặc quyền của từng gói cước để đưa ra lựa chọn phù hợp nhất.</p>
         </div>
         
         <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-sm">
               <thead>
                  <tr className="border-b border-[var(--border)]">
                     <th className="py-4 pl-4 text-left font-bold text-[var(--foreground)]">Tính năng</th>
                     <th className="py-4 text-center font-bold text-[var(--foreground)]">Gói Khởi Động</th>
                     <th className="py-4 text-center font-bold text-[var(--foreground)]">Gói Go Plus</th>
                     <th className="rounded-t-2xl bg-[#fbf9ff] py-4 text-center font-bold text-[#4338CA]">IELTS Pro <Star size={14} className="inline mb-0.5 text-[#F59E0B]" fill="currentColor" /></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[var(--border)]">
                  {features.map((feature, idx) => (
                     <tr key={idx}>
                        <td className="py-5 pl-4 font-semibold text-[var(--foreground)]">{feature.name}</td>
                        <td className="py-5 text-center text-[var(--muted-foreground)]">{feature.free}</td>
                        <td className="py-5 text-center text-[var(--muted-foreground)]">{feature.plus}</td>
                        <td className="bg-[#fbf9ff] py-5 text-center font-bold text-[#4338CA]">{feature.pro}</td>
                     </tr>
                  ))}
               </tbody>
               <tfoot>
                  <tr>
                     <td className="py-4" />
                     <td className="py-4" />
                     <td className="py-4" />
                     <td className="rounded-b-2xl bg-[#fbf9ff] py-4" />
                  </tr>
               </tfoot>
            </table>
         </div>
      </div>

      {/* FAQ */}
      <div className="mx-auto mt-24 max-w-3xl">
         <div className="text-center">
            <h2 className="text-2xl font-bold text-[var(--foreground)]">Câu hỏi thường gặp (FAQ)</h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Mọi thắc mắc về thanh toán, tài khoản và hệ thống học tập.</p>
         </div>
         
         <div className="mt-10 space-y-3">
            {faqs.map((faq, idx) => (
               <details key={idx} className="group rounded-2xl bg-[#fbf9ff] p-5 open:bg-[#efedff] transition-colors">
                  <summary className="flex cursor-pointer items-center justify-between font-bold text-[var(--foreground)] list-none [&::-webkit-details-marker]:hidden">
                     {faq.question}
                     <ChevronDown size={18} className="text-[var(--muted-foreground)] transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
                     {faq.answer}
                  </p>
               </details>
            ))}
         </div>
      </div>

    </div>
  );
}
