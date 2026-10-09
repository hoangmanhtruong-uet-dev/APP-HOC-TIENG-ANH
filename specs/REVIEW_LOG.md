# BÁO CÁO KIỂM TOÁN CHẤT LƯỢNG MÃ NGUỒN (QA AUDIT REPORT)

**Người đánh giá:** Lead QA Auditor  
**Đối tượng kiểm toán:** Git Diff vs Kế hoạch kiến trúc `specs/PLAN_PROJECT.md` (v1.0.0)  
**Đánh giá tổng thể:** CỰC KỲ YẾU KÉM / KHÔNG THỂ CHẤP NHẬN ĐƯỢC  

---

### [STATUS: FAILED]

---

## 1. TỔNG QUAN PHÊ BÌNH (EXECUTIVE SUMMARY)

Một sự cẩu thả và thiếu trách nhiệm nghiêm trọng trong phiên làm việc này. 

Bản kế hoạch đặt ra một khối lượng công việc kiến trúc đồ sộ bao gồm Database Migrations (Private Schema + RLS + RPC), Upstash Rate Limiting, Server Actions, Generic Practice Engine chống DRY, Zen Mode, Video Sync, và Disaster Recovery. 

**Tuy nhiên, thực tế Git Diff nộp lên hoàn toàn KHÔNG CÓ BẤT KỲ DÒNG CODE NGHIỆP VỤ NÀO.** 
Tất cả những gì được commit chỉ là:
1. Sửa file cấu hình lặt vặt `eslint.config.mjs`.
2. Bơm phình `package.json` / `package-lock.json` bằng một đống thư viện rác, cài đặt tùy tiện và không giải quyết bất kỳ tiêu chí nghiệm thu nào của kế hoạch.

---

## 2. ĐỐI CHIẾU CHI TIẾT TỪNG TASK THEO KẾ HOẠCH

| Mã Task | Hạng mục theo Kế hoạch | Trạng thái thực tế | Đánh giá & Chỉ trích chi tiết |
| :--- | :--- | :--- | :--- |
| **P0.1** | Database Migrations, RLS & RPC Grading | **MISSING (0%)** | Hoàn toàn không có file migration `supabase/migrations/20261015000000_learning_and_practice_core.sql`. Chưa tạo private schema `private.exercise_answer_keys`, chưa có hàm RPC `submit_exercise_attempt`, không có RLS hay Composite Index nào được định nghĩa. |
| **P0.2** | Upstash Rate Limiting & Server Actions | **MISSING (0%)** | Chỉ cài package `@upstash/ratelimit` và `@upstash/redis` vào lockfile rồi bỏ xó. Không có Zod schema (`SubmitExerciseSchema`), không có Server Action `saveExerciseDraftAction` (30 req/phút) hay `submitExerciseAction` (5 req/phút). |
| **P0.3** | Unified Practice Runner (DRY Refactor) | **MISSING (0%)** | Không thấy sự xuất hiện của `src/features/core-practice/components/generic-practice-engine.tsx`. Không đóng gói timer, không có confirmation dialog, không có question navigator. Nợ kỹ thuật DRY vẫn giữ nguyên. |
| **P1.1 - P1.3** | Markdown, Vocab Popover, Video Sync, Question Types | **MISSING (0%)** | Không có UI, không có FSD feature folders, không có dynamic import `react-markdown`, không có floating popover bắt text selection. |
| **P2.1 - P2.2** | Disaster Recovery & Automated Tests | **MISSING (0%)** | Không có lớp lưu trữ offline, không có bất kỳ unit test (Vitest) hay E2E test (Playwright) nào được viết. |

---

## 3. CÁC VI PHẠM KỸ THUẬT & RỦI RO BẢO MẬT PHÁT HIỆN TRONG GIT DIFF

### 🚨 1. Dependency Bloat & Tùy tiện cài đặt thư viện ngoài phạm vi (Scope Creep)
Nhìn vào `package-lock.json`:
- Đưa hàng loạt thư viện nặng ký và hoàn toàn **không có trong bản đặc tả kỹ thuật**:
  - `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` (Kiến trúc dùng Supabase Storage, tại sao lại cài AWS S3 SDK?)
  - `@anthropic-ai/sdk`, `@google/genai`, `openai: ^7.30.1` (Scope sprint này là Core Learning & Practice Engine, không hề có task tích hợp LLM client!)
  - `rss-parser`, `music-metadata` (Tự ý nhồi nhét thư viện lạ vào dự án mà không qua RFC/kiểm duyệt kiến trúc).
- **Hậu quả:** Tăng kích thước `node_modules`, phình to nguy cơ chuỗi cung ứng mã độc (Supply Chain Vulnerabilities), tăng thời gian build CI/CD.

### 🚨 2. Thay đổi ESLint đối phó (`eslint.config.mjs`)
```javascript
 globalIgnores([
   ".next/**",
   ".npm-cache/**",
@@ -12,5 +22,6 @@ export default defineConfig([
     ".codex/**",
     "node_modules/**",
     "coverage/**",
+    "scripts/**"
   ]),
```
- Tự tiện thêm `scripts/**` vào danh sách `globalIgnores` thay vì tuân thủ linting rules chung của hệ thống.
- Cài plugin `eslint-plugin-unused-imports` trong khi code logic còn chưa viết nổi một dòng. Đây là biểu hiện của việc làm việc hình thức, né tránh việc triển khai logic cốt lõi.

---

## 4. KẾT LUẬN & HÀNH ĐỘNG KHẮC PHỤC BẮT BUỘC (MANDATORY REMEDIATION)

Yêu cầu Developer thực hiện ngay lập tức các việc sau trước khi gửi review lại:

1. **Rollback / Dọn dẹp sạch Dependencies:** Gỡ bỏ toàn bộ các package rác (`@aws-sdk/*`, `@anthropic-ai/sdk`, `@google/genai`, `rss-parser`, `music-metadata`) ra khỏi `package.json` và tái tạo lại `package-lock.json`. Chỉ giữ lại những thư viện nằm trong đặc tả (`@upstash/ratelimit`, `@upstash/redis`, `rehype-highlight`, `localforage` nếu dùng cho P2).
2. **Triển khai toàn bộ Phase P0:**
   - Viết migration SQL chuẩn chỉ với `private.exercise_answer_keys`, bật RLS và cài đặt RPC `submit_exercise_attempt`.
   - Tạo Server Actions có bọc Rate Limiter của Upstash và xác thực Zod nghiêm ngặt.
   - Dựng component `GenericPracticeEngine` chuẩn FSD trong `src/features/core-practice`.
3. **Tuân thủ ranh giới Client/Server:** Đảm bảo các route/action xử lý chấm điểm chạy 100% Server-side; không leak đáp án xuống Client; timer phải dựa trên server timestamp (`server_expires_at`).

**YÊU CẦU REJECT TOÀN BỘ PULL REQUEST VÀ LÀM LẠI NGAY LẬP TỨC.**