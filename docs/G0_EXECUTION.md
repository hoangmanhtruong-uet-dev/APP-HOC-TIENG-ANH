# G0 — Khôi phục môi trường dev (Thực thi)

**Mục tiêu:** Dev chạy lại, login trả 200, không còn `ENOTFOUND`/`AUTH_PROVIDER_ERROR`.
**Thời gian:** 0.5 ngày (Tuần 0: 24–25/10/2026)
**Người thực hiện:** 1 dev

---

## Bước 1: Tạo Supabase project dev mới

1. Truy cập [Supabase Dashboard](https://app.supabase.com).
2. Tạo project mới (Free tier đủ cho dev).
   - Project name: `ielts-self-study-dev`
   - Region: Chọn gần user nhất (ví dụ `ap-southeast-1` / Singapore).
   - Database password: Đặt mạnh, lưu vào password manager (không commit vào repo).
3. Sau khi tạo, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Project API > anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Project API > service_role (secret) → `SUPABASE_SERVICE_ROLE_KEY`
   - Database > Connection string > URI (port 6543) → `DATABASE_URL`

> ⚠️ Không commit giá trị secret vào git. Chỉ ghi project ref vào docs để phân biệt dev/prod.

---

## Bước 2: Cập nhật `.env.local`

Thay toàn bộ nội dung `.env.local` bằng mẫu dưới (giữ cấu trúc, điền giá trị thực từ Bước 1):

```env
# Public Supabase project values (dev)
NEXT_PUBLIC_SUPABASE_URL=https://<DEV-PROJECT-REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<DEV-ANON-KEY>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPPORT_EMAIL=support@example.com

# Keep false until real domain confirms HTTPS + subdomains
ENABLE_HSTS_PRELOAD=false

# Server-only secrets (dev)
SUPABASE_SERVICE_ROLE_KEY=<DEV-SERVICE-ROLE-KEY>
STORAGE_CLEANUP_SECRET=<32+ ký tự ngẫu nhiên, dev>
SPEAKING_PIPELINE_SIGNING_SECRET=<32+ ký tự ngẫu nhiên, dev>

# Optional: Tắt AI cho dev content drafting (không set key OPENAI trong .env.local
# nếu chỉ dùng script validate nội dung cục bộ; script đọc từ ROUTER_API_KEY/OPENAI_API_KEY riêng)
OPENAI_API_KEY=

# Database Connection Pooler (Port 6543)
DATABASE_URL="postgresql://postgres.<DEV-PROJECT-REF>:<DB-PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Upstash Redis (dummy cho dev)
UPSTASH_REDIS_REST_URL="https://dummy.upstash.io"
UPSTASH_REDIS_REST_TOKEN="dummy"
```

---

## Bước 3: Push migrations + seed

```powershell
# Đảm bảo đã login Supabase CLI
npx.cmd supabase login

# Link project dev (sử dụng isolated config để không ghi đè link prod)
npx.cmd supabase link --project-ref <DEV-PROJECT-REF>

# Dry-run trước khi push thực tế
npx.cmd supabase db push --linked --dry-run

# Push toàn bộ migration + seed (20/20 forward migrations)
npx.cmd supabase db push --linked

# Xác nhận migration đã apply
npx.cmd supabase migration list --linked

# Lint database
npx.cmd supabase db lint --linked --level warning
```

---

## Bước 4: Smoke test

```powershell
# Chạy dev server
npm.cmd run dev
```

Trình duyệt mở `http://localhost:3000`:

| Test case | Kết quả mong đợi |
|-----------|-----------------|
| Truy cập `/` | Trang landing load, không console error |
| Đăng ký (`/register`) | Tạo tài khoản thành công, nhận email xác nhận |
| Đăng nhập (`/login`) | Login trả 200, vào được dashboard |
| Placement test | Vào được bài test phân cấp |
| Học 1 lesson | Vào được `/learn/...`, không screen trống |
| Làm 1 exercise | Vào được `/practice/...`, nộp bài thành công |

**Exit criteria G0:** `npm run dev` login 200, không còn `ENOTFOUND`/`AUTH_PROVIDER_ERROR`.

---

## Bước 5: Ghi ref dev vào docs

Tạo/cập nhật `docs/ENVIRONMENTS.md`:

```markdown
# Môi trường

| Môi trường | Supabase Project Ref | Vercel Project | Dùng cho |
|------------|---------------------|----------------|----------|
| Dev | `<DEV-PROJECT-REF>` | — | Phát triển nội dung, test local |
| Staging | (chưa tạo) | — | (tùy chọn) |
| Production | (tạo ở G3) | `<VERCEL-PROJECT>` | Beta và public launch |

> Không ghi secret vào file này. Chỉ ghi project ref để phân biệt.
```

---

## Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|--------|-----------|
| Dev project chết lại (như project cũ `copgpiplkccnqgupdwcr`) | Seed content nằm trong migration, không phụ thuộc data nhập tay. Ghi ref ngay sau khi tạo. |
| Lỗi connect do IP bị chặn | Supabase cho phép connect từ IP dev; nếu bị chặn, thêm IP vào Allowlist trong dashboard. |
