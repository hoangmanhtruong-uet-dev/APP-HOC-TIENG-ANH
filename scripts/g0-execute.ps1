# ============================================================================
# Script thực thi G0 — Khôi phục môi trường dev (IELTS Self-Study App)
# Chạy trong PowerShell tại thư mục gốc dự án.
# ============================================================================

Write-Host "=== G0: KHỐI PHỤC MÔI TRƯỜNG DEV ===" -ForegroundColor Cyan
Write-Host ""

# --- Bước 1: Kiểm tra trạng thái git ---
Write-Host "[1/6] Kiểm tra git status..." -ForegroundColor Yellow
git status --porcelain
if ($LASTEXITCODE -ne 0) {
    Write-Host "Lỗi: Không phải git repo hoặc git không có sẵn." -ForegroundColor Red
    exit 1
}
Write-Host "OK: Git repo sẵn sàng.`n" -ForegroundColor Green

# --- Bước 2: Kiểm tra .env.local đã điền giá trị thực chưa ---
Write-Host "[2/6] Kiểm tra .env.local..." -ForegroundColor Yellow
if (-Not (Test-Path ".env.local")) {
    Write-Host "Lỗi: File .env.local không tồn tại." -ForegroundColor Red
    exit 1
}

$envContent = Get-Content ".env.local" -Raw
$placeholders = @(
    "<DEV-PROJECT-REF>",
    "<DEV-ANON-KEY>",
    "<DEV-SERVICE-ROLE-KEY>",
    "<32-KY-TU-NGAU-NHIEN-DEV>",
    "<DB-PASSWORD>"
)

$placeholdersFound = $false
foreach ($ph in $placeholders) {
    if ($envContent -like "*$ph*") {
        Write-Host "CẢNH BÁO: Chưa điền giá trị thực cho '$ph' trong .env.local" -ForegroundColor Yellow
        $placeholdersFound = $true
    }
}

if ($placeholdersFound) {
    Write-Host "Vui lòng điền đầy đủ giá trị thực vào .env.local trước khi tiếp tục." -ForegroundColor Red
    Write-Host "Sau đó chạy lại script này.`n" -ForegroundColor Red
    exit 1
}

Write-Host "OK: .env.local đã điền giá trị thực.`n" -ForegroundColor Green

# --- Bước 3: Login Supabase CLI ---
Write-Host "[3/6] Đăng nhập Supabase CLI..." -ForegroundColor Yellow
npx.cmd supabase login
if ($LASTEXITCODE -ne 0) {
    Write-Host "Lỗi: Không thể đăng nhập Supabase CLI." -ForegroundColor Red
    exit 1
}
Write-Host "OK: Đã đăng nhập Supabase CLI.`n" -ForegroundColor Green

# --- Bước 4: Link project dev ---
Write-Host "[4/6] Link project Supabase dev..." -ForegroundColor Yellow
Write-Host "Nhập Project Ref của dev Supabase (ví dụ: abcdefghijklmnop):" -ForegroundColor Cyan
$projectRef = Read-Host
if ([string]::IsNullOrWhiteSpace($projectRef)) {
    Write-Host "Lỗi: Project ref không được để trống." -ForegroundColor Red
    exit 1
}

npx.cmd supabase link --project-ref $projectRef
if ($LASTEXITCODE -ne 0) {
    Write-Host "Lỗi: Không thể link project Supabase." -ForegroundColor Red
    exit 1
}
Write-Host "OK: Đã link project '$projectRef'.`n" -ForegroundColor Green

# --- Bước 5: Dry-run rồi push migrations ---
Write-Host "[5/6] Dry-run migration push..." -ForegroundColor Yellow
npx.cmd supabase db push --linked --dry-run
if ($LASTEXITCODE -ne 0) {
    Write-Host "Lỗi: Dry-run migration thất bại." -ForegroundColor Red
    exit 1
}
Write-Host "Dry-run thành công. Áp dụng migration thực tế..." -ForegroundColor Yellow
npx.cmd supabase db push --linked
if ($LASTEXITCODE -ne 0) {
    Write-Host "Lỗi: Push migration thất bại." -ForegroundColor Red
    exit 1
}
Write-Host "OK: Migrations đã áp dụng.`n" -ForegroundColor Green

# --- Bước 6: Kiểm tra migration list và lint ---
Write-Host "[6/6] Xác nhận migration và lint..." -ForegroundColor Yellow
npx.cmd supabase migration list --linked
npx.cmd supabase db lint --linked --level warning
if ($LASTEXITCODE -ne 0) {
    Write-Host "CẢNH BÁO: DB lint có cảnh báo, kiểm tra lại." -ForegroundColor Yellow
} else {
    Write-Host "OK: DB lint sạch.`n" -ForegroundColor Green
}

Write-Host "=== G0 HOÀN TẤT: Môi trường dev đã sẵn sàng ===" -ForegroundColor Green
Write-Host ""
Write-Host "Tiếp theo: Chạy 'npm.cmd run dev' và thực hiện smoke test:" -ForegroundColor Cyan
Write-Host "  1. Mở http://localhost:3000"
Write-Host "  2. Đăng ký (/register)"
Write-Host "  3. Đăng nhập (/login)"
Write-Host "  4. Placement test"
Write-Host "  5. Học 1 lesson + làm 1 exercise"
Write-Host ""
