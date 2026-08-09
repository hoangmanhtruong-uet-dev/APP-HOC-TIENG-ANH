# Deployment checklist

Target: private production on Vercel with a dedicated Supabase production project. AI remains disabled. This checklist does not authorize public traffic.

Detailed procedures:

- [PRIVATE_PRODUCTION_RELEASE_RUNBOOK.md](./PRIVATE_PRODUCTION_RELEASE_RUNBOOK.md)
- [ROLLBACK_RUNBOOK.md](./ROLLBACK_RUNBOOK.md)
- [DSR_RUNBOOK.md](./DSR_RUNBOOK.md)

## 1. Trước deploy

1. Chọn commit đã qua independent release review + CI và đọc `KNOWN_ISSUES.md`.
2. Ghi exact SHA, CI URL, Vercel deployment mới và previous immutable deployment vào release ticket.
3. Xác nhận Vercel deployment protection/private access đang bật; không mở public traffic.
4. Xác nhận Supabase project ref là production project mới, không phải dev/staging.
5. Xác nhận backup/PITR và ghi lại recovery point trước migration.
6. Cấu hình env theo `PRODUCTION_READINESS_CHECKLIST.md` trong Vercel secret manager; không paste giá trị vào terminal history hoặc docs.
7. Để toàn bộ optional OpenAI env unset. AI phải xuất hiện là `disabled` trong readiness.
8. Kiểm tra Auth site URL/redirect allowlist, SMTP, email verification, leaked-password protection, password/rate-limit/CAPTCHA settings.
9. Kiểm tra `speaking-recordings` vẫn private, MIME/size limit đúng và không có public URL policy.
10. Xác nhận support mailbox, DSR operator, cleanup scheduler, uptime monitor và rollback operator đã được phân công.

## 2. Database forward deploy

```powershell
npx.cmd supabase migration list --linked
npx.cmd supabase db push --linked --dry-run
npx.cmd supabase db push --linked
npx.cmd supabase migration list --linked
npx.cmd supabase db lint --linked --level warning
```

Không dùng `db reset --linked`, không sửa migration đã apply, không chạy seed production ngoài data migration đã review. Sau push, chạy `supabase/tests/remote/phase_10c_production_hardening_remote.test.sql` bằng database owner trong transaction rollback; credential chỉ nhập qua prompt/secret tạm và xóa ngay sau run.

## 3. App deploy

```powershell
npm.cmd ci
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --audit-level=high
```

Build command: `npm run build`. Start command: `npm run start`. Runtime phải là Node version phù hợp `package.json`.

Nếu `npm ci` fail vì SWC bị dev server khóa, dừng đúng dev server/process rồi chạy lại `npm ci`. Không dùng `npm install --ignore-scripts` làm release evidence.

## 4. Scheduler retention

Cấu hình scheduler server-side gọi `POST https://<app>/api/internal/storage-cleanup` với `Authorization: Bearer <secret-manager-reference>`. Không gọi từ browser. Không ghi secret vào URL. Chạy mỗi ngày; alert khi non-2xx. Job dùng batch 100, DB lease và retry stale work; tuyệt đối không chạy thủ công trên production chỉ để “test” nếu chưa có backup/change approval.

Lưu screenshot cấu hình (ẩn value), run ID/timestamp và kết quả successful run. Chỉ code route tồn tại không được tính PASS.

## 5. Post-deploy smoke

- Public: `/`, `/login`, `/register`, `/privacy`, `/terms` trả HTML, không console error, có security headers.
- Aliases `/reading`, `/listening`, `/writing`, `/speaking` redirect tới canonical `/practice/<skill>` rồi auth guard hoạt động.
- Anonymous: `/dashboard`, `/learn`, `/mock-tests`, `/progress`, `/profile`, `/settings` redirect `/login?next=...`.
- Authenticated: dashboard/learn/practice/mock/progress/profile/settings render đúng owner; onboarding guard không loop.
- Verify draft/answer key/transcript/audio/essay không xuất hiện trước điều kiện publish/submit/owner tương ứng.
- `/api/health/live` trả 200. `/api/health/ready` trả 200, `status: ready` và optional AI `disabled`. Cleanup thiếu/sai bearer trả 404 và `Cache-Control: no-store`.
- Controlled negative check: required production env thiếu trả 503 với tên field, không chứa secret value. Partial AI trả 200 `degraded`, provider actions fail-closed.
- Kiểm tra viewport 375, 768, 1024, 1440; keyboard, focus, axe, recorder/audio/editor/timer và submit confirmation.

## 6. Rollback

Thực hiện theo [ROLLBACK_RUNBOOK.md](./ROLLBACK_RUNBOOK.md). Nếu app lỗi nhưng database khỏe, chuyển private deployment về recorded previous immutable Vercel artifact trước. Migration là forward-only; không drop column/index/function để rollback khẩn cấp. Nếu migration gây lỗi, tạo forward-fix migration mới, dry-run, review rồi push. Nếu có mất/corrupt dữ liệu, dừng write, giữ evidence, restore vào project cô lập trước; chỉ cut over sau integrity/RLS/smoke verification. Mục tiêu MVP: RPO 24 giờ, RTO 4 giờ.

## 7. Evidence and final decision

- [ ] CI xanh đúng reviewed SHA.
- [ ] Screenshot Vercel private protection, deployment ID và previous artifact.
- [ ] Screenshot env names/presence, không có values.
- [ ] Supabase production ref/Auth/SMTP/Vault/Storage/backup evidence.
- [ ] Restore rehearsal, scheduler run và uptime alert evidence.
- [ ] DSR tabletop và rollback rehearsal evidence.
- [ ] Production-domain smoke evidence.
- [ ] Mọi P0/P1 trong `PRODUCTION_READINESS_CHECKLIST.md` là PASS; không còn FAIL, BLOCKED_BY_EXTERNAL_CONFIGURATION hoặc NOT_VERIFIED.

Nếu thiếu bất kỳ evidence bắt buộc nào, kết luận là `NO-GO` và Vercel protection vẫn phải bật.
