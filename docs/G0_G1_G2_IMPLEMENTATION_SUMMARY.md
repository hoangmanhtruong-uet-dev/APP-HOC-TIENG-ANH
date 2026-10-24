# TỔNG HỢP TRIỂN KHAI G0-G1-G2 (Plan Go-Live v1.0.2)

**Dự án:** IELTS Self-Study App  
**Phiên bản kế hoạch:** Plan Go-Live v1.0.2  
**Ngày triển khai:** 24/10/2026  
**Người thực hiện:** 1 dev, part-time

---

## 1. Files đã tạo mới (8 files)

| # | File | Mục đích | Giai đoạn |
|---|------|----------|-----------|
| 1 | `docs/G0_EXECUTION.md | Checklist khôi phục dev Supabase, `.env.local`, smoke test | G0 |
| 2 | `docs/CONTENT_PIPELINE.md` | Quy trình soạn/review/publish nội dung G1, lịch 5 tuần, JSON template | G1 |
| 3 | `scripts/content/validate-content.js` | Script validate content (answer key, position, difficulty, provenance) | G1 |
| 4 | `supabase/migrations/20261024000000_fix_ai_generated_contents_rls.sql` | Sửa RLS `ai_generated_contents`: thêm bảng `app_roles`, view `admin_users`, policy đúng | G1 |
| 5 | `supabase/migrations/20261024000001_content_seed_template.sql` | Template migration seed content batch | G1 |
| 6 | `docs/G2_HARDENING.md` | Checklist hardening G-03, G-05/KI-040, G-08/09, G-07 | G2 |
| 7 | `docs/OFFLINE_DISCONNECT_TEST_CHECKLIST.md` | Checklist test tay mất mạng (G-07) | G2 |
| 8 | `docs/G0_G1_G2_IMPLEMENTATION_SUMMARY.md` | Tài liệu này | Tất cả |

---

## 2. Files đã chỉnh sửa (3 files)

| # | File | Thay đổi | Giai đoạn |
|---|------|----------|-----------|
| 1 | `docs/PRD.md` | Cập nhật §6 Phạm vi launch: bật/tắt tính năng, billing tắt, AI tắt, chỉ launch Academic | G2 |
| 2 | `src/lib/auth/subscription-guard.ts` | Thêm `BILLING_ENABLED` flag: khi tắt → trả `isPremium: false` tường minh, không query DB | G2 (G-03) |
| 3 | `src/lib/env.ts` | Thêm `BILLING_ENABLED` vào serverEnvSchema (optional, validate "true"/"false") | G2 (G-03) |
| 4 | `.env.example` | Thêm comment và biến `BILLING_ENABLED=` | G2 (G-03) |

---

## 3. Chi tiết từng giai đoạn

### G0 — Khôi phục môi trường dev

**Files liên quan:** `docs/G0_EXECUTION.md`, `.env.example`

**Nội dung:**
- Hướng dẫn tạo Supabase project dev mới (Free tier).
- Cập nhật `.env.local` với 4 biến public + 4 biến server-only + DATABASE_URL.
- Lệnh `supabase db push` (dry-run → push → list → lint).
- Smoke test: register → login → placement → 1 lesson → 1 exercise.
- Ghi ref dev vào `docs/ENVIRONMENTS.md` (không ghi secret).

**Yêu cầu hành động thủ công (không thể tự động hóa):**
- Tạo Supabase project qua Dashboard (cần đăng nhập Supabase).
- Copy giá trị URL/KEY vào `.env.local`.

---

### G1 — Content pipeline + nội dung MVP

**Files liên quan:** `docs/CONTENT_PIPELINE.md`, `scripts/content/validate-content.js`, 2 migrations

**Nội dung:**
- **Script validate** (`scripts/content/validate-content.js`): Kiểm tra provenance (source/license/checksum bắt buộc), answer key khớp question_set, positions liên tục, difficulty hợp lệ (A1-C2), content quality rules từ CONTENT_OPERATIONS.md. Thoát mã 1 nếu có lỗi.
- **Migration RLS fix** (`20261024000000_fix_ai_generated_contents_rls.sql`): Thay thế policy placeholder `auth.uid() IN (SELECT user_id FROM auth.users)` (P0 risk) bằng:
  - Bảng `public.app_roles` (super_admin, content_editor, support, student).
  - View `public.admin_users` cho kiểm tra admin.
  - Policy: chỉ admin quản lý `ai_generated_contents`; authenticated đọc nội dung `APPROVED`.
- **Template seed** (`20261024000001_content_seed_template.sql`): Mẫu cho migration content batch.
- **Lịch 5 tuần:** T1 (script + RLS fix), T2-T4 (batch soạn 148 item), T5 (12 item cuối + listening + mock test + reviewer + TTS audio).

**Quy tắc cắt:** Hết T3 dưới 60% → giảm exercise 120→90, giữ nguyên lịch.

---

### G2 — Chốt scope + hardening

**Files liên quan:** `docs/PRD.md`, `src/lib/auth/subscription-guard.ts`, `src/lib/env.ts`, `.env.example`, `docs/G2_HARDENING.md`, `docs/OFFLINE_DISCONNECT_TEST_CHECKLIST.md`

**Nội dung:**

| ID | Mức | Việc | Trạng thái |
|----|-----|------|------------|
| G-03 | P1 | `subscription-guard.ts`: Thêm `BILLING_ENABLED` flag. Khi billing tắt → trả `isPremium: false` tường minh, không query `subscriptions`. | ✅ Đã sửa |
| G-05 + KI-040 | P0 | Bucket `speaking-recordings` đã `public=false` từ migration Phase 9. Route cleanup đã có. Cần test tay tại G2. | ⏳ Chờ test tay |
| G-08/09 | P1 | CSP baseline giữ nguyên (`unsafe-inline` ở dev). HSTS không `preload` (`ENABLE_HSTS_PRELOAD=false`). | ✅ Đã cấu hình |
| G-07 | P2 | Checklist test tay mất mạng (Offline → Online → Refresh → Draft còn). | ✅ Tạo checklist |

**Scope launch (ghi vào PRD.md §6):**
- **Bật:** Auth, onboarding, planning, dashboard, vocab, reading, listening, writing (không AI), speaking (không AI), error notebook, progress, admin, mock test, gamification.
- **Tắt:** Billing (Phase 11), AI Writing/Speaking (ENV-04/05), IELTS General Training.

---

## 4. Lệnh kiểm tra sau khi chỉnh sửa

```powershell
# Typecheck (chỉ kiểm tra files đã sửa, lỗi pre-existing bỏ qua)
npx tsc --noEmit src/lib/auth/subscription-guard.ts src/lib/env.ts

# Lint (nếu môi trường hỗ trợ)
npm.cmd run lint
```

> Lưu ý: `npm run typecheck` không có trong `package.json`. Các lỗi typecheck hiện tại do thiếu `@aws-sdk/client-s3` và các module khác — không liên quan đến thay đổi G0-G1-G2.

---

## 5. Các bước tiếp theo (G3-G5)

| Giai đoạn | Thời gian | Nội dung chính |
|-----------|-----------|----------------|
| G3 | T7 (7–11/12) | Vercel, Supabase Pro, SMTP, backup/PITR, smoke production |
| G4 | T8–T9 (14–25/12) | Private beta 20–50 người, fix P0/P1 hàng tuần |
| G5 | T10 (28/12–3/1) | Gate 18 điều kiện, mở signup, công bố, tag release |

---

## 6. Gate Go/No-Go (18 điều kiện)

Xem chi tiết ở cuối `docs/Plan Go-Live v1.0.2 — IELTS Self-Study App.md` (điều kiện 16–18 là mới ở v1.0.2: G-03 đóng, cleanup audio, HSTS không preload).
