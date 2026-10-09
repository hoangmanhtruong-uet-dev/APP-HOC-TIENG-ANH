import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHeader } from "@/components/layout/marketing-header";
import { Container } from "@/components/shared/container";
import { siteConfig } from "@/config/site";
import { TERMS_VERSION } from "@/features/auth/policies";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description: "Điều khoản sử dụng nền tảng tự học IELTS Flow.",
};

export default function TermsPage() {
  return (
    <div className="min-h-[100dvh] bg-[var(--surface)]">
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <MarketingHeader />
      <main id="main-content">
        <Container className="max-w-3xl py-12 sm:py-16">
          <p className="text-sm font-semibold text-[var(--primary)]">
            Phiên bản {TERMS_VERSION}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Điều khoản sử dụng
          </h1>
          <p className="mt-4 leading-7 text-[var(--muted-foreground)]">
            Khi tạo tài khoản, bạn đồng ý dùng IELTS Flow cho mục đích học tập
            hợp pháp và tuân thủ các giới hạn bảo vệ hệ thống dưới đây.
          </p>

          <div className="mt-10 space-y-9 text-[var(--foreground)] [&_h2]:text-xl [&_h2]:font-bold [&_li]:leading-7 [&_p]:leading-7 [&_p]:text-[var(--muted-foreground)] [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
            <section>
              <h2>Tài khoản và sử dụng chấp nhận được</h2>
              <ul>
                <li>
                  Giữ bí mật thông tin đăng nhập và không dùng tài khoản của
                  người khác.
                </li>
                <li>
                  Không dò quét, vượt RLS, truy cập draft, answer key hoặc dữ
                  liệu học viên khác.
                </li>
                <li>
                  Không tự động hóa yêu cầu AI nhằm vượt quota hoặc gây chi phí
                  bất thường.
                </li>
              </ul>
            </section>
            <section>
              <h2>Bản quyền nội dung & Tài sản trí tuệ</h2>
              <p className="mt-3">
                Đề thi và nội dung học thuật trên hệ thống IELTS Flow được biên soạn độc lập bởi đội ngũ chuyên gia hoặc sử dụng các nguồn tài liệu có giấy phép hợp lệ. Nội dung không sao chép nguyên gốc từ các bộ đề thi có bản quyền của IDP, British Council, hay Cambridge University Press & Assessment. Mọi hành vi sao chép, trích xuất dữ liệu nội dung từ hệ thống cho mục đích thương mại đều bị nghiêm cấm.
              </p>
            </section>
            <section>
              <h2>Nội dung học tập và AI Feedback</h2>
              <p className="mt-3">
                Kết quả chấm, ước lượng band điểm và feedback AI trên IELTS Flow chỉ mang tính chất tham khảo phục vụ quá trình tự học. Kết quả này <strong>không đại diện và không có giá trị thay thế</strong> cho điểm thi IELTS chính thức được cấp bởi IDP hoặc British Council. Bạn tự chịu trách nhiệm khi sử dụng kết quả này cho các quyết định cá nhân.
              </p>
            </section>
            <section>
              <h2>Tính sẵn sàng và thay đổi</h2>
              <p className="mt-3">
                Dịch vụ có thể tạm dừng để bảo trì, khắc phục sự cố hoặc bảo vệ
                dữ liệu. Khi điều khoản thay đổi đáng kể, đơn vị vận hành phải
                công bố phiên bản mới và thu lại sự đồng ý khi cần.
              </p>
            </section>
            <section>
              <h2>Liên hệ</h2>
              <p className="mt-3">
                Câu hỏi về điều khoản hoặc tài khoản:{" "}
                <a
                  className="font-semibold text-[var(--primary)] underline"
                  href={`mailto:${siteConfig.supportEmail}`}
                >
                  {siteConfig.supportEmail}
                </a>
                .
              </p>
            </section>
          </div>

          <p className="mt-12 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted-foreground)]">
            Xem{" "}
            <Link
              className="font-semibold text-[var(--primary)] underline"
              href="/privacy"
            >
              Chính sách quyền riêng tư
            </Link>{" "}
            và{" "}
            <Link
              className="font-semibold text-[var(--primary)] underline"
              href="/refund"
            >
              Chính sách hoàn tiền
            </Link>{" "}
            để biết cách dữ liệu và giao dịch được xử lý.
          </p>
        </Container>
      </main>
    </div>
  );
}
