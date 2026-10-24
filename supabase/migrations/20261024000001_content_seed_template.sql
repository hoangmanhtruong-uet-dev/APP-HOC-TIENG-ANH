-- Template migration seed nội dung G1
-- Copy file này và đổi tên theo convention: 2026MMDDHHMMSS_content_batch_XX.sql
-- Chỉ áp dụng forward-only, không sửa migration đã apply.

BEGIN;

-- Ví dụ: thêm 1 module + 1 lesson + 1 exercise (định dạng thực tế tuỳ schema dự án)
-- INSERT INTO public.content_modules (...) VALUES (...);
-- INSERT INTO public.content_lesson_versions (...) VALUES (...);
-- INSERT INTO public.exercise_questions (...) VALUES (...);
-- INSERT INTO private.exercise_answer_keys (...) VALUES (...);

-- Lưu ý: answer key phải nằm trong schema `private`, client không được SELECT trực tiếp.

COMMIT;
