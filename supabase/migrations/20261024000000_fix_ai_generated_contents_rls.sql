-- Fix G1: Siết RLS cho public.ai_generated_contents
-- Thay thế policy placeholder (auth.uid() IN (SELECT user_id FROM auth.users))
-- bằng policy dựa trên bảng admin roles thật.
--
-- Forward-only: không sửa migration cũ, chỉ thêm migration mới.

BEGIN;

-- 1. Tạo bảng vai trò admin (nếu chưa có)
CREATE TABLE IF NOT EXISTS public.app_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('super_admin', 'content_editor', 'support', 'student')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS app_roles_user_id_idx ON public.app_roles(user_id);
CREATE INDEX IF NOT EXISTS app_roles_role_idx ON public.app_roles(role);

-- 2. Tạo view helper cho kiểm tra admin (dùng trong RLS policy)
CREATE OR REPLACE VIEW public.admin_users AS
    SELECT user_id FROM public.app_roles WHERE role IN ('super_admin', 'content_editor');

-- 3. Bật RLS cho ai_generated_contents (đã bật từ migration cũ, đảm bảo lại)
ALTER TABLE public.ai_generated_contents ENABLE ROW LEVEL SECURITY;

-- 4. Xóa policy placeholder cũ (nếu tồn tại)
DROP POLICY IF EXISTS "Admins can manage ai generated contents" ON public.ai_generated_contents;

-- 5. Tạo policy mới: chỉ admin có thể quản lý ai_generated_contents
CREATE POLICY "Admins can manage ai generated contents"
    ON public.ai_generated_contents
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- 6. Cho phép authenticated user đọc nội dung đã APPROVED (dùng cho content draft review UI)
CREATE POLICY "Authenticated can read approved ai generated contents"
    ON public.ai_generated_contents
    FOR SELECT
    TO authenticated
    USING (status = 'APPROVED');

COMMIT;
