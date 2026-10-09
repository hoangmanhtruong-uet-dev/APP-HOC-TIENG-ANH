import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHeader } from "@/components/layout/marketing-header";
import { Container } from "@/components/shared/container";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Chính sách hoàn tiền",
  description: "Chính sách hoàn tiền và hủy gói cước của IELTS Flow.",
};

export default function RefundPage() {
  return (
    <div className="min-h-[100dvh] bg-[var(--surface)]">
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <MarketingHeader />
      <main id="main-content">
        <Container className="max-w-3xl py-12 sm:py-16">
          <p className="text-sm font-semibold text-[var(--primary)]">
            Cập nhật lần cuối: Tháng 9, 2026
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Chính sách hoàn tiền (Refund Policy)
          </h1>
          <p className="mt-4 leading-7 text-[var(--muted-foreground)]">
            Bằng việc đăng ký và thanh toán các gói cước trả phí trên IELTS Flow, bạn đồng ý với các quy định về thanh toán và hoàn tiền dưới đây.
          </p>

          <div className="mt-10 space-y-9 text-[var(--foreground)] [&_h2]:text-xl [&_h2]:font-bold [&_li]:leading-7 [&_p]:leading-7 [&_p]:text-[var(--muted-foreground)] [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
            <section>
              <h2>1. Quy định chung về hoàn tiền</h2>
              <p className="mt-3">
                Do tính chất của sản phẩm số và chi phí phát sinh ngay lập tức từ các API trí tuệ nhân tạo (AI) khi chấm bài, IELTS Flow <strong>không áp dụng chính sách hoàn tiền vô điều kiện</strong> sau khi giao dịch đã được thực hiện và tài khoản đã được nâng cấp thành công.
              </p>
            </section>
            <section>
              <h2>2. Các trường hợp được xem xét hoàn tiền</h2>
              <p className="mt-3">
                Chúng tôi chỉ xem xét hoàn tiền toàn bộ hoặc một phần trong các trường hợp ngoại lệ sau:
              </p>
              <ul>
                <li>
                  Lỗi hệ thống nghiêm trọng kéo dài khiến bạn không thể sử dụng ứng dụng quá 48 giờ liên tục ngay sau khi mua gói cước.
                </li>
                <li>
                  Hệ thống thanh toán tự động trừ tiền sai số tiền hoặc trừ tiền nhiều lần cho cùng một giao dịch.
                </li>
                <li>
                  Tài khoản của bạn chưa thực hiện bất kỳ hành động nào tốn phí AI (chấm Writing/Speaking) kể từ thời điểm thanh toán (trong vòng 24 giờ).
                </li>
              </ul>
            </section>
            <section>
              <h2>3. Hủy gia hạn gói cước (Cancel Subscription)</h2>
              <p className="mt-3">
                Bạn có thể hủy tự động gia hạn gói cước bất kỳ lúc nào trong phần cài đặt tài khoản. 
                Sau khi hủy, bạn vẫn được sử dụng đầy đủ các tính năng của gói trả phí cho đến hết chu kỳ thanh toán hiện tại. 
                Chúng tôi sẽ không hoàn lại tiền cho khoảng thời gian chưa sử dụng còn lại của chu kỳ đó.
              </p>
            </section>
            <section>
              <h2>4. Quy trình yêu cầu hoàn tiền</h2>
              <p className="mt-3">
                Nếu bạn cho rằng mình đủ điều kiện hoàn tiền theo Mục 2, vui lòng gửi email đến{" "}
                <a
                  className="font-semibold text-[var(--primary)] underline"
                  href={`mailto:${siteConfig.supportEmail}`}
                >
                  {siteConfig.supportEmail}
                </a>{" "}
                với tiêu đề "Yêu cầu hoàn tiền - [Tên đăng nhập / Email]". Vui lòng đính kèm hóa đơn thanh toán hoặc mã giao dịch. Chúng tôi sẽ phản hồi trong vòng 3-5 ngày làm việc.
              </p>
            </section>
            <section>
              <h2>5. Giới hạn trách nhiệm về chất lượng AI</h2>
              <p className="mt-3">
                Như đã nêu trong Điều khoản sử dụng, điểm số và nhận xét từ AI chỉ mang tính tham khảo. Chúng tôi <strong>không hoàn tiền</strong> vì lý do bạn không đồng ý với mức band điểm do AI chấm, hoặc do điểm thi thực tế của bạn không đạt như điểm hệ thống ước lượng.
              </p>
            </section>
          </div>

          <p className="mt-12 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted-foreground)]">
            Trở lại{" "}
            <Link
              className="font-semibold text-[var(--primary)] underline"
              href="/terms"
            >
              Điều khoản sử dụng
            </Link>{" "}
          </p>
        </Container>
      </main>
    </div>
  );
}
