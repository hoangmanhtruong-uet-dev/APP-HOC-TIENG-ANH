# Plan Go-Live v1.0.2 — IELTS Self-Study App

Oct 24, 2026 · @Hoàng Trường

Phiên bản: 1.0.2 (thay 1.0). Phạm vi: từ Phase 1–13 code xong, content mỏng, dev project đã chết → public launch. Mô hình: 1 người, part-time 10–15h/tuần. Lịch go-live dài thêm từ 8 lên 10 tuần.

## Changelog v1.0 → v1.0.2

Bản 1.0 sót 4 điểm của audit (G-03, G-05, G-08/09, KI-040) và có 3 chỗ tự mâu thuẫn. Bản này vá hết, không thêm feature mới.

| # | Mục | v1.0 | v1.0.2 | Lý do |
| --- | --- | --- | --- | --- |
| 1 | Gói Supabase production | Free tier, "nâng Pro khi >200 DAU" | Pro ngay từ G3 | Plan đòi PITR + leaked-password protection, hai thứ này không có trên free tier (xác minh lại trên dashboard trước khi trả tiền) |
| 2 | Hardcode `isPremium = false` (G-03, P1) | Không có trong plan | Sửa ở G2: đọc entitlement/feature flag, billing tắt thì trả về giá trị tường minh | Audit xếp P1, plan cũ bỏ sót |
| 3 | Orphan audio + recording public (G-05, KI-040 P0) | KI-040 chỉ ghi "planned" | Cron cleanup + test bucket private thành gate bắt buộc | P0 chưa có việc đi kèm; audio còn ăn quota storage |
| 4 | CSP unsafe-inline, HSTS preload (G-08/09) | Chỉ nhắc CSP | Giữ CSP baseline; không bật `preload` HSTS cho tới khi domain thật ổn định ≥ 4 tuần | Preload khó gỡ, khóa cả subdomain |
| 5 | Lịch | 8 tuần, G1 = 4 tuần | 10 tuần: G1 = 5 tuần, G2 và G3 tách thành 2 tuần riêng (G2 có hardening) | 160 item ÷ 4 tuần ≈ 40 item/tuần trong 10–15h là không khả thi nếu còn viết script, tuyển reviewer, làm audio |
| 6 | AI trong G1 vs "AI tắt" | Mơ hồ | AI chỉ chạy ở dev để draft content; production không set key OpenAI | Tránh hiểu nhầm giữa tool soạn content và feature AI phía learner |
| 7 | Nợ kỹ thuật còn lại (G-01, 02, 04, 06, 07) | Không nhắc | Bảng backlog hậu launch có ngưỡng kích hoạt | Không phình scope (KI-010) nhưng không quên |
| 8 | Gate Go/No-Go | 15 điều kiện | 18 điều kiện (+G-03, +cleanup audio, +HSTS không preload) | Khớp các mục trên |

## 0. Chẩn đoán & chiến thuật

Code không còn là nút thắt; nút thắt là nội dung, cấu hình cloud ngoài repo, và 3 việc hardening nhỏ mà audit đã chỉ ra.

- Code/schema xong tới Phase 10C, mọi gate test PASS (163 unit, 737 pgTAP, 73 E2E). Điểm sẵn sàng go-live hiện 4/10: hạ tầng 2/10, content 3/10.
- Dev Supabase (`copgpiplkccnqgupdwcr`) đã chết (NXDOMAIN, `AUTH_PROVIDER_ERROR`), phải tạo project mới.
- Dự án cá nhân thiếu chuyên môn IELTS → bạn làm editor vận hành pipeline: AI draft → script validate → người review → publish qua versioning.
- Không sao chép đề Cambridge. Chỉ dùng format IELTS + nội dung tự tạo, neo độ khó vào CEFR descriptors, Academic Word List, nguồn public domain.
- Mỗi item publish phải có provenance/licence; script chặn publish nếu thiếu.

## Scope content MVP & phạm vi launch

Scope cố định: Academic, band mục tiêu 5.0–6.5, đúng 1 roadmap, khoảng 160 item đã review. Cái gì ngoài bảng này đi vào backlog sau launch (chống KI-010/011).

| Loại | Số lượng tối thiểu |
| --- | --- |
| Module lý thuyết (Grammar + Vocab) | 4 module × 5 lesson = 20 lesson |
| Exercise questions (MCQ, fill, matching) | \~120 câu |
| Reading passage có question set | 4 |
| Listening set (audio TTS + câu hỏi) | 4 |
| Writing task (Task 1 + 2, rubric tay) | 6 |
| Speaking part (cue card) | 8 |
| Mock test hoàn chỉnh | 1 |
| Placement test | Đã có seed, rà lại |

**Bật khi launch:** Auth email + password reset, placement, learning modules, practice R/L/W/S không AI, dictation, error notebook, gamification (Phase 13), mock test, vocabulary vault.

**Tắt/defer:** Billing (Phase 11, launch miễn phí), AI feedback Writing/Speaking (ENV-04/05), IELTS General Training.

Lưu ý v1.0.2: khi billing tắt, `isPremium` không còn là hằng số `false` rải trong Server Action (xem G2).

## G0 — Khôi phục môi trường dev (0.5 ngày, tuần 0: 24–25/10)

Mục tiêu: dev chạy lại, login trả 200, không còn `ENOTFOUND`/`AUTH_PROVIDER_ERROR`.

- [ ] Tạo Supabase project dev mới (free tier là đủ cho dev).
- [ ] Cập nhật `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `DATABASE_URL` trỏ ref mới.
- [ ] `supabase db push` toàn bộ migration + seed hiện có (20/20 forward migrations).
- [ ] Smoke test: register → login → placement → 1 lesson → 1 exercise.
- [ ] Ghi ref dev vào docs (không ghi secret) để lần sau biết project nào là dev, project nào là prod.

Rủi ro: dev project chết lại. Giảm thiểu: seed content nằm trong migration, không phụ thuộc data nhập tay.

## G1 — Content pipeline + nội dung MVP (5 tuần, T1–T5: 26/10–27/11)

Mục tiêu: \~160 item đã review, learner đi hết 1 đường end-to-end không gặp screen trống. Dài thêm 1 tuần so với v1.0 vì 160 item trong 4 tuần là khoảng 40 item/tuần, chưa kể script, reviewer và audio.

| Tuần | Việc | Item xong |
| --- | --- | --- |
| T1 | Script `scripts/content/` (validate answer key, position liên tục, difficulty tag, provenance bắt buộc, sinh seed migration draft). Siết RLS `ai_generated_contents` bằng admin role table thật (migration forward-only, đang là placeholder rủi ro P0) | 0 |
| T2 | Batch 1: 20 lesson + 30 exercise | 50 |
| T3 | Batch 2: 40 exercise + 4 reading passage có question set | 44 |
| T4 | Batch 3: 40 exercise + 6 writing task + 8 speaking cue card | 54 |
| T5 | 10 exercise cuối + 4 listening set + 1 mock test; reviewer ngoài duyệt; TTS audio, upload Storage, gắn checksum | 15 + review |

Quy trình mỗi batch: AI draft (migration `20261006000000_ai_content_generation.sql`, workflow PENDING\_REVIEW → APPROVED/REJECTED) → script validate → tự review theo checklist `CONTENT_OPERATIONS.md` → migration published (forward-only).

- AI chỉ chạy ở dev để draft content. Production không set key OpenAI.
- Spot-check tối thiểu 20% item mỗi batch bằng người; sai answer key là rủi ro chính.
- Tuần 4–5: tuyển 1–2 reviewer (tình nguyện hoặc trả phí) duyệt grammar, độ tự nhiên, rubric Writing/Speaking.
- Audio: edge-tts hoặc 11labs free tier, kiểm tra giấy phép sử dụng thương mại của gói đang dùng trước khi publish.
- Quy tắc cắt: hết T3 mà xong dưới 60% thì cắt exercise từ 120 xuống 90, không kéo dài lịch.

Exit criteria: placement → 1 module → reading + listening → 1 writing task → 1 speaking set → 1 mock test, không screen trống.

## G2 — Chốt scope + hardening bắt buộc (T6: 30/11–4/12)

G2 trong v1.0 chỉ chốt scope. Bản 1.0.2 thêm 3 việc hardening nhỏ, làm trước khi freeze code, vì audit xếp chúng P0/P1.

- [ ] Xác nhận danh sách bật/tắt (mục Scope), ghi vào `docs/PRD.md`.
- [ ] Freeze codebase: không feature mới ngoài scope G1.

**Hardening bắt buộc (\~2–3 ngày)**

| ID | Việc | Xong khi |
| --- | --- | --- |
| G-03 (P1) | Tìm mọi chỗ hardcode `isPremium = false`, thay bằng một helper entitlement đọc từ feature flag/DB. Billing tắt thì helper trả "free cho tất cả" một cách tường minh | Không còn hằng số rải rác; test unit cho helper; `npm test` xanh |
| G-05 + KI-040 (P0) | Cron dọn audio mồ côi (file không gắn attempt quá 24h) gọi qua cleanup route có `STORAGE_CLEANUP_SECRET`. Test lại bucket recording: private, không public URL, chỉ signed URL ngắn hạn | Chạy tay 1 lần thành công; test A/B/anon không đọc được file người khác |
| G-08/09 (P1) | Giữ CSP baseline (REM-SEC-01: thử nonce/hash ở chế độ report-only sau launch). HSTS giữ `max-age` ngắn, không thêm `preload` | Header kiểm tra trên domain thật ở G3 |
| G-07 (P2) | Checklist test tay mất mạng: soạn Writing draft, ngắt mạng, bật lại, kiểm tra draft còn | 1 lượt PASS ghi evidence; automation để sau launch |

**Backlog sau launch (không làm trước go-live)**

| ID | Vấn đề | Kích hoạt khi |
| --- | --- | --- |
| G-01 | Trùng 35–40% code giữa 5 skill runner | Sửa UI chuẩn lần thứ 2 hoặc sau beta |
| G-02 | `'use client'` lạm dụng ở container | Lighthouse mobile FCP/TTI dưới ngưỡng đặt ở beta |
| G-04 | Thiếu composite index trên attempt tables | Bảng attempt gần 100k dòng hoặc query chậm trong log |
| G-06 | `music-metadata` nằm trong client bundle | Cùng lượt tối ưu G-02 (ước tính 200–400ms trên mobile) |
| G-07 | E2E tự động cho offline sync | Sau ổn định beta |

Exit criteria: gói tính năng chốt và ghi lại; G-03, G-05/KI-040 đóng; không P0/P1 mở trong launch scope.

## G3 — Hạ tầng production (T7: 7/12–11/12)

Chạy đúng các ID trong `docs/PRODUCTION_READINESS_CHECKLIST.md`, trên Supabase production project riêng (ref mới thứ 2, tách khỏi dev ở G0). Việc có độ trễ (mua domain, tạo mailbox, DNS) bắt đầu sớm từ T4 để không chặn T7.

**Thay đổi v1.0.2: production dùng Supabase Pro.** PITR, backup và leaked-password protection là điều kiện gate nên không chạy trên free tier. Xác minh giá và tính năng của gói trên dashboard trước khi nâng cấp. Free tier chỉ còn dùng cho dev.

| Gate | Việc cần làm | Sev |
| --- | --- | --- |
| RA-01/03 | Commit sạch → release PR → CI green trên exact SHA | P1 |
| RA-04 / ENV-01 | Vercel project + env + `NEXT_PUBLIC_SITE_URL` + domain + DNS/TLS | P1 |
| RA-05 / SB-02 | Mailbox `support@<domain thật>` + Supabase Auth SMTP; test mail confirm/reset | P1 |
| SB-03 | Leaked-password protection, rate limit, CAPTCHA signup | P1 |
| SB-04/05/06/07 | Push migration prod, remote lint, owner verifier chạy trong `BEGIN … ROLLBACK`, bucket policies | P0 |
| RET-01/02 | Scheduler gọi cleanup route hằng ngày (gồm cleanup audio mồ côi từ G2) + alert non-2xx | P1 |
| KI-085 / AV-03/04 | Bật Backup/PITR, restore rehearsal vào project cô lập, ghi RPO 24h / RTO 4h | P0 |
| RET-05 | DSR tabletop (export + delete) trên user test | P1 |
| KI-089 / REM-E2E-02 | Tạo user test A/B, chạy authenticated suite 0 skip bất thường | P1 |

**Env vars**

- Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`.
- Server-only: `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_CLEANUP_SECRET` (≥32 ký tự), `SPEAKING_PIPELINE_SIGNING_SECRET` (≥32 ký tự, đồng bộ với Supabase Vault).
- Tất cả biến OpenAI: không set.

**Deploy database (forward-only)**

```
npx.cmd supabase migration list --linked
npx.cmd supabase db push --linked --dry-run
npx.cmd supabase db push --linked
npx.cmd supabase migration list --linked
npx.cmd supabase db lint --linked --level warning
```

Không dùng `db reset --linked`, không sửa migration đã apply.

**Deploy app**

```
npm.cmd ci
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --audit-level=high
```

**Smoke sau deploy**

- Public: `/`, `/login`, `/register`, `/privacy`, `/terms` trả HTML, không console error, đủ security headers (HSTS không có `preload`).
- `/reading`, `/listening`, `/writing`, `/speaking` redirect về `/practice/<skill>` rồi qua auth guard.
- Anonymous vào `/dashboard`, `/learn`, `/mock-tests`, `/progress`, `/profile`, `/settings` bị đẩy về `/login?next=…`.
- Authenticated: các trang trên render đúng owner.
- `/api/health/live` 200; `/api/health/ready` 200, `status: ready`, optional AI disabled.
- Viewport 375/768/1024/1440; keyboard, focus, axe, recorder/audio/editor/timer, xác nhận submit.
- Bucket recording không có public URL.

Exit criteria: mọi P0/P1 PASS kèm evidence; không còn FAIL, BLOCKED\_BY\_EXTERNAL\_CONFIGURATION hay NOT\_VERIFIED; có lịch sử chạy scheduler, bằng chứng backup/PITR và rollback.

## G4 — Private beta (T8–T9: 14/12–25/12)

Mục tiêu: kiểm chứng learning loop với người dùng thật và bắt lỗi nội dung trước khi mở public.

- Invite-only 20–50 người: bạn bè, group Facebook IELTS tự học, r/IELTS Vietnam.
- Đo: completion rate theo lesson, D7 retention, số report lỗi nội dung, item statistics từ `learner_attempts`.
- D7 retention ghi nhận làm baseline, không phải gate (mẫu 20–50 người quá nhỏ để đặt ngưỡng).
- Mỗi tuần fix P0/P1 về content và UX bằng migration forward-only.
- Theo dõi bandwidth/storage Supabase (audio là rủi ro quota lớn nhất) và đặt ngưỡng Lighthouse mobile làm cơ sở cho backlog G-02/G-06.

**Điều kiện mở public:** không còn P0/P1 mở; ≥60% beta user hoàn thành ≥1 bài tập có feedback; mọi item published có provenance.

## G5 — Go-live công khai & rollback (T10: 28/12–3/1)

Chỉ mở khi cả 18 điều kiện Go/No-Go đạt. Nếu chưa đạt, dời launch sang T11, không nới gate.

- [ ] Bật signup public (CAPTCHA và rate limit giữ nguyên).
- [ ] Kiểm tra quota Supabase Pro: dung lượng DB, storage và bandwidth audio.
- [ ] Smoke production: register → placement → lesson → mock test → yêu cầu DSR.
- [ ] Công bố: group Facebook IELTS, Reddit r/IELTS, Product Hunt, 3–5 video TikTok demo.
- [ ] Gắn tag release, freeze baseline, để `ROLLBACK_RUNBOOK.md` sẵn sàng.

**Rollback**

- App lỗi, DB khỏe: chuyển Vercel về immutable artifact trước đó.
- Migration gây lỗi: tạo forward-fix migration, dry-run, review, push. Không drop column/index/function.
- Mất hoặc hỏng dữ liệu: dừng writes, giữ evidence, restore vào project cô lập, cut over sau khi kiểm tra integrity, RLS và smoke.
- Mục tiêu MVP: RPO 24 giờ, RTO 4 giờ.

## Lịch trình

Go-live công khai dự kiến tuần 28/12/2026, tổng 10 tuần sau G0, tương ứng khoảng 100–150 giờ ở nhịp 10–15h/tuần. Ngày là dự kiến, tính từ thứ Hai 26/10/2026.

| Giai đoạn | Tuần | Ngày | Nội dung chính | Cổng ra |
| --- | --- | --- | --- | --- |
| G0 | T0 | 24–25/10 | Dựng lại dev Supabase, smoke test | Login 200 |
| G1 | T1–T5 | 26/10–27/11 | Script validate, \~160 item, reviewer, audio TTS | Learner đi hết 1 đường |
| G2 | T6 | 30/11–4/12 | Chốt scope, hardening G-03, G-05/KI-040, G-08/09, G-07 tay | Không P0/P1 mở |
| G3 | T7 | 7–11/12 | Vercel, Supabase Pro, SMTP, backup/PITR, smoke prod | Mọi P0/P1 PASS có evidence |
| G4 | T8–T9 | 14–25/12 | Private beta 20–50 người, fix hằng tuần | ≥60% hoàn thành ≥1 bài tập |
| G5 | T10 | 28/12–3/1 | Gate 18 điều kiện, mở signup, công bố, tag release | Go |

Dịp cuối năm và Tết Dương lịch (1/1) rơi vào T8–T10: beta có thể chậm phản hồi, nên mời người sớm từ cuối T7.

## Rủi ro chính

| Rủi ro | Mức | Giảm thiểu |
| --- | --- | --- |
| Bản quyền đề Cambridge | P1 | Chỉ format + nội dung tự sinh; metadata licence bắt buộc; script chặn publish thiếu provenance |
| AI sinh sai answer key | P1 | Script kiểm cấu trúc + người spot-check ≥20% mỗi batch; item stats sau beta |
| Thiếu chuyên môn sư phạm | P1 | CEFR descriptors làm thang độ khó; reviewer duyệt rubric Writing/Speaking |
| Scope phình (KI-010) | P1 | Bảng scope cứng; mọi thứ ngoài bảng vào backlog |
| Trễ G1 vì 1 người làm | P1 | Quy tắc cắt: hết T3 dưới 60% thì giảm exercise 120 → 90, giữ nguyên lịch |
| Recording bị public (KI-040) | P0 | Test bucket private + signed URL ngắn hạn ở G2 và G3; thành gate |
| Entitlement hardcode (G-03) | P1 | Helper entitlement ở G2 trước khi bật billing sau này |
| Dev project chết lại | P1 | Ghi ref + seed trong migration; PITR chỉ ở prod |
| Hết quota storage/bandwidth (audio) | P2 | Prod đã ở gói Pro; theo dõi từ beta, cleanup audio mồ côi chạy hằng ngày |
| Chi phí hạ tầng tăng (Pro + domain) | P2 | Ghi vào ngân sách trước G3; billing bật sau beta nếu cần bù chi phí |

## Gate Go/No-Go trước khi mở traffic công khai

Thiếu bất kỳ điều kiện nào là NO-GO; giữ Vercel deployment protection bật. Mục 16–18 là mới ở v1.0.2.

1. Commit sạch, release PR đã review, CI green trên exact SHA.
2. Vercel production project, domain/DNS/TLS, `NEXT_PUBLIC_SITE_URL` xong.
3. Mailbox `support@<domain thật>` hoạt động, SMTP gửi được mail confirm/reset.
4. Supabase production project mới (gói Pro), migration đã push, parity 20/20.
5. Auth: leaked-password protection, CAPTCHA signup, rate limit.
6. Storage: bucket private, policy MIME/size/path, không có public URL.
7. Env: mọi biến bắt buộc đã set, biến OpenAI để trống.
8. Scheduler cleanup chạy thành công ít nhất 1 lần, alert non-2xx đã cấu hình.
9. Backup/PITR bật, restore rehearsal xong, RPO/RTO ghi lại.
10. Uptime monitor nhận readiness 200, test alert đã gửi tới.
11. DSR tabletop (export + delete) trên user test non-production.
12. E2E authenticated suite A/B chạy 0 skip bất thường.
13. Smoke sau deploy: health ready, trang public, auth redirect, flow của owner.
14. Content MVP \~160 item đã review, learner đi hết 1 đường không screen trống.
15. Không còn P0/P1 mở trong launch scope.
16. G-03 đóng: không còn `isPremium` hardcode, helper entitlement có test.
17. Cleanup audio mồ côi chạy được; test A/B/anon xác nhận recording không đọc chéo (KI-040).
18. HSTS không có `preload`; CSP baseline giữ nguyên, kế hoạch nonce report-only ghi trong backlog.
