# Kịch Bản Xử Lý Sự Cố (Incident Response Runbook) & SLA

Tài liệu này quy định các chuẩn mực dịch vụ (SLA) và các kịch bản xử lý sự cố khẩn cấp (Incident Response) cho nền tảng IELTS Flow trong giai đoạn Beta và Public Launch.

## 1. Cam Kết Chất Lượng Dịch Vụ (Service Level Agreement - SLA)

### 1.1. Các Chỉ Số Phục Hồi (Recovery Metrics)
- **RTO (Recovery Time Objective):** Tối đa 2 giờ đối với sự cố sập toàn hệ thống (Cần khôi phục database từ PITR hoặc chuyển hướng traffic).
- **RPO (Recovery Point Objective):** Tối đa 5 phút mất mát dữ liệu (Đạt được thông qua tính năng Point-in-Time Recovery của Supabase).
- **Uptime Target:** 99.9% cho các API cốt lõi (Xác thực, Luyện tập, Đọc/Nghe). 99.0% cho các dịch vụ phụ thuộc bên thứ ba (Chấm điểm AI, Sinh audio STT).

### 1.2. Phân Cấp Sự Cố (Incident Severity)
- **SEV-1 (Critical):** Toàn bộ người dùng không thể đăng nhập hoặc làm bài thi. Hệ thống thanh toán bị lỗi diện rộng.
- **SEV-2 (High):** Một module chính ngừng hoạt động (ví dụ: Không thể nộp bài Writing/Speaking). Tỷ lệ lỗi AI trả về > 20%.
- **SEV-3 (Medium):** Giao diện bị lỗi một phần nhưng không ảnh hưởng tới luồng học tập chính. Delay khi chấm điểm AI tăng cao (trên 2 phút).
- **SEV-4 (Low):** Lỗi chính tả trong nội dung, lỗi nhỏ trên một số ít thiết bị không phổ biến.

---

## 2. Kịch Bản Xử Lý (Playbooks)

### Kịch bản 1: Sập API Trí tuệ Nhân tạo (OpenAI/LLM Outage)
*Tình huống: OpenAI API bị sập toàn cầu hoặc rate limit bị vượt quá dẫn đến hàng đợi chấm điểm (Job Queue) bị ùn ứ, học viên thi Mock Test không nhận được kết quả.*

**Quy trình xử lý:**
1. **Phát hiện:** Trigger alert từ Sentry khi số lượng `job_status = 'failed'` hoặc timeout tăng đột biến.
2. **Kích hoạt Circuit Breaker (Tự động):** Hệ thống worker sẽ tự động tạm ngưng lấy job mới từ PostgreSQL sau 5 lỗi liên tiếp (Exponential Backoff).
3. **Can thiệp Frontend (Thủ công/Feature Flag):** Bật cờ `AI_GRADING_DISABLED = true` qua dashboard Admin. Hệ thống sẽ:
   - Hiển thị banner trên giao diện: "Hệ thống AI đang bảo trì. Các bài thi Writing/Speaking của bạn đã được lưu an toàn và sẽ được chấm tự động khi dịch vụ khôi phục."
   - Đóng các nút "Chấm ngay", chuyển trạng thái bài thi thành `Queued`.
4. **Phục hồi:** Khi OpenAI ổn định trở lại, tắt cờ `AI_GRADING_DISABLED`. Worker sẽ tự động kéo các task tồn đọng ra chấm mà không làm mất dữ liệu của học viên.

### Kịch bản 2: Khôi phục Dữ liệu Cấp bách từ PITR
*Tình huống: Lỗi con người hoặc lỗi schema migration phá hỏng bảng dữ liệu quan trọng (ví dụ: `learner_lesson_progress`).*

**Quy trình xử lý:**
1. **Cách ly (Containment):** Đưa trang web về chế độ Bảo trì (Maintenance Mode) trên Vercel để ngăn chặn dữ liệu mới ghi đè.
2. **Xác định thời điểm an toàn:** Xác định thời gian (timestamp) trước khi thao tác lỗi xảy ra. (Ví dụ: `2026-09-30 14:00:00 UTC`).
3. **Thực thi Khôi phục (Supabase):**
   - Đăng nhập Supabase Dashboard -> Database -> Backups.
   - Chọn Point-in-Time Recovery.
   - Nhập thời gian phục hồi và xác nhận. Quá trình này sẽ khởi tạo một instance mới (thường mất 15-30 phút).
4. **Đổi hướng kết nối (Switch-over):**
   - Cập nhật biến môi trường `NEXT_PUBLIC_SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` trên Vercel sang instance mới.
   - Trigger Redeploy trên Vercel.
5. **Kiểm tra (Verification):** Đội ngũ QA thực hiện post-deploy smoke test theo `DEPLOYMENT_CHECKLIST.md`.
6. **Mở lại dịch vụ:** Tắt Maintenance Mode và gửi email thông báo (Post-mortem) nếu sự cố kéo dài quá 1 giờ.

### Kịch bản 3: Sập Cổng Thanh Toán (SePay/Stripe Webhook Misfire)
*Tình huống: Học viên chuyển khoản thành công nhưng không được tự động nâng cấp Pro do lỗi mạng từ phía cổng thanh toán không gọi được Webhook về máy chủ.*

**Quy trình xử lý:**
1. **Cảnh báo:** CSKH nhận được phàn nàn từ học viên (đính kèm UNC/Biên lai).
2. **Kiểm tra Audit Log:** Tra cứu bảng `billing_events` xem có webhook payload nào bị rớt (error_message) không.
3. **Duyệt thủ công (Manual Override):**
   - CSKH sử dụng giao diện Admin hoặc chạy script cấp quyền:
     `UPDATE subscriptions SET status = 'active', tier = 'pro' WHERE user_id = '[UUID]';`
4. **Idempotency Check:** Vì bảng `billing_events` dùng `UNIQUE(gateway_event_id)`, nếu webhook bị trễ và đến sau khi CSKH đã xử lý, hệ thống sẽ tự động bỏ qua (bảo vệ học viên không bị gia hạn lặp lại 2 lần).

---

## 3. Liên Hệ Khẩn Cấp (Escalation Matrix)
- **Lỗi Hạ tầng (Vercel/Supabase):** Gọi DevOps/Tech Lead.
- **Lỗi Nội dung đề thi:** Gọi Content Manager.
- **Lỗi Thanh toán:** Gọi Operations/Billing Manager.
