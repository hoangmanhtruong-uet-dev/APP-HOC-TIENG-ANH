# G2 — Chốt scope + hardening bắt buộc (T6: 30/11–4/12/2026)

**Mục tiêu:** Freeze codebase, đóng 3 việc hardening P0/P1 từ audit, không còn P0/P1 mở trong launch scope.

---

## 1. Xác nhận phạm vi launch (1 ngày)

| ID | Việc | Xong khi |
|----|------|----------|
| G2-01 | Xác nhận danh sách bật/tắt (xem PRD.md §6) | Ghi vào `docs/PRD.md` |
| G2-02 | Freeze codebase: không feature mới ngoài scope G1 | Không có commit feature mới |

---

## 2. Hardening bắt buộc (~2–3 ngày)

### G-03 (P1): Entitlement helper thay hardcode `isPremium`

**Vấn đề:** `isPremium = false` hardcode rải trong Server Action (audit xếp P1).

**Đã làm:**
- `src/lib/auth/subscription-guard.ts`: Đọc từ bảng `subscriptions` qua `getUserSubscriptionStatus()`.
- Thêm `BILLING_ENABLED` env flag: khi `"false"`/trống → trả về `isPremium: false` tường minh, không query DB.
- `src/features/writing/actions.ts` và `src/features/speaking/actions.ts`: Gọi `getUserSubscriptionStatus()` (đã dùng helper, không còn hardcode).

**Xong khi:**
- [ ] Không còn hằng số `isPremium = false` rải rác ở bất kỳ file nào (tìm kiếm lại `isPremium`).
- [ ] Test unit cho helper: `BILLING_ENABLED=false` → `isPremium: false`; `BILLING_ENABLED=true` + user pro → `isPremium: true`.
- [ ] `npm test` xanh.

---

### G-05 + KI-040 (P0): Cron dọn audio mồ côi + bucket private

**Vấn đề:** File ghi âm Speaking "mồ côi" nếu người dùng hủy phiên; recording có nguy cơ trở thành public (P0).

**Đã làm:**
- Bucket `speaking-recordings` đã tạo với `public = false` (migration `20260717160000`, giá trị thứ 3 là `false`).
- Route `POST /api/internal/storage-cleanup` đã có, dùng `STORAGE_CLEANUP_SECRET`, batch 100, DB lease, retry stale work.
- Migration `20260718120000_phase_10c_production_hardening.sql` đã thêm `retention_until`, `deleted_at`, `cleanup_started_at`, index cleanup.

**Cần kiểm tra lại tại G2:**
- [ ] Chạy tay cleanup route 1 lần thành công (local/dev, với `STORAGE_CLEANUP_SECRET` đúng).
- [ ] Kiểm tra bucket `speaking-recordings` trên Supabase Dashboard: **Private**, không có public URL policy.
- [ ] Test A/B/anon: User A không đọc được file storage_path của User B (RLS + signed URL ngắn hạn).
- [ ] Kiểm tra signed URL TTL ngắn (10–15 phút theo thiết kế Phase 9).

**Xong khi:**
- [ ] Chạy tay 1 lần thành công; ghi evidence.
- [ ] Test A/B/anon không đọc được file người khác.

---

### G-08/09 (P1): CSP baseline + HSTS không preload

**Vấn đề:** CSP còn `unsafe-inline`; HSTS preload chưa có real-domain evidence.

**Hiện tại (`next.config.ts`):**
- CSP: `script-src 'self' 'unsafe-inline'` (chỉ `'unsafe-eval'` ở dev).
- HSTS: `max-age=31536000` (host-only), `includeSubDomains; preload` chỉ khi `ENABLE_HSTS_PRELOAD=true`.
- `ENABLE_HSTS_PRELOAD=false` mặc định (`.env.example`).

**Quyết định v1.0.2:**
- Giữ CSP baseline (không đổi ngay).
- Thử nonce/hash ở chế độ report-only sau launch (REM-SEC-01).
- **Không thêm `preload`** cho tới khi domain thật ổn định ≥ 4 tuần.

**Xong khi:**
- [ ] Header kiểm tra trên domain thật ở G3 (HSTS không có `preload`).
- [ ] Kế hoạch nonce report-only ghi vào backlog sau launch.

---

### G-07 (P2): Checklist test tay mất mạng

**Vấn đề:** Chưa có E2E offline sync (để sau launch).

**Checklist test tay (G2):**
- [ ] Mở trang Writing (`/writing/[taskId]`), soạn draft >100 từ.
- [ ] Ngắt mạng (DevTools → Network → Offline).
- [ ] Tiếp tục gõ, thay đổi draft.
- [ ] Bật lại mạng.
- [ ] Kiểm tra draft còn nguyên vẹn (autosave đã lưu trước khi ngắt mạng, sync lại khi có mạng).
- [ ] Ghi 1 lượt PASS vào evidence.

**Xong khi:**
- [ ] 1 lượt PASS ghi evidence; automation để sau launch.

---

## 3. Backlog sau launch (KHÔNG làm trước go-live)

| ID | Vấn đề | Kích hoạt khi |
|----|--------|--------------|
| G-01 | Trùng 35–40% code giữa 5 skill runner | Sửa UI chuẩn lần thứ 2 hoặc sau beta |
| G-02 | `'use client'` lạm dụng ở container | Lighthouse mobile FCP/TTI dưới ngưỡng đặt ở beta |
| G-04 | Thiếu composite index trên attempt tables | Bảng attempt gần 100k dòng hoặc query chậm trong log |
| G-06 | `music-metadata` nằm trong client bundle | Cùng lượt tối ưu G-02 (ước tính 200–400ms trên mobile) |
| G-07 | E2E tự động cho offline sync | Sau ổn định beta |

---

## 4. Exit criteria G2

- [ ] Gói tính năng chốt và ghi vào `docs/PRD.md`.
- [ ] G-03 đóng: không còn `isPremium` hardcode, helper entitlement có test.
- [ ] G-05/KI-040 đóng: cleanup audio mồ côi chạy được; bucket private; test A/B/anon không đọc chéo.
- [ ] G-08/09: CSP baseline giữ nguyên; HSTS không `preload`.
- [ ] G-07: Checklist test tay mất mạng 1 lượt PASS.
- [ ] Không còn P0/P1 mở trong launch scope.
