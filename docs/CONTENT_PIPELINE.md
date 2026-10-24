# Content Pipeline — G1 (theo Plan Go-Live v1.0.2)

**Mục tiêu:** ~160 item đã review, learner đi hết 1 đường end-to-end không gặp screen trống.
**Thời gian:** 5 tuần (T1–T5: 26/10–27/11/2026)

---

## Quy trình mỗi batch

```
AI draft (migration 20261006000000_ai_content_generation.sql)
   ↓
node scripts/content/validate-content.js <file.json>
   ↓
Tự review theo CHECKLIST PUBLISH (xem CONTENT_OPERATIONS.md)
   ↓
Sinh seed migration draft (forward-only)
   ↓
Áp dụng local, chạy npx.cmd supabase test db --local
   ↓
Publish bằng migration forward-only
   ↓
Generate lại types, chạy lint/typecheck/build/Playwright
```

---

## Lịch theo tuần

| Tuần | Việc chính | Item xong (tích lũy) |
|------|-----------|---------------------|
| T1 | Viết script validate (`scripts/content/validate-content.js`). Siết RLS `ai_generated_contents` (migration `20261024000000_fix_ai_generated_contents_rls.sql`). | 0 |
| T2 | Batch 1: 20 lesson + 30 exercise | 50 |
| T3 | Batch 2: 40 exercise + 4 reading passage có question set | 94 |
| T4 | Batch 3: 40 exercise + 6 writing task + 8 speaking cue card | 148 |
| T5 | 10 exercise cuối + 4 listening set + 1 mock test; reviewer ngoài duyệt; TTS audio, upload Storage, gắn checksum | 160+ review |

> Quy tắc cắt: hết T3 mà xong dưới 60% thì giảm exercise từ 120 xuống 90, không kéo dài lịch.

---

## CHECKLIST trước publish (từ CONTENT_OPERATIONS.md §4)

1. Identity/slug ổn định, version tăng, không ghi đè published snapshot cũ.
2. Title, instructions, difficulty, test type, duration, display order đã review.
3. Source/licence/checksum đầy đủ.
4. Passage/audio/prompt là nguyên bản hoặc có quyền sử dụng xác nhận.
5. Question positions liên tục, points hợp lệ, option đủ, answer key trong `private`.
6. Reading/Listening asset link tồn tại; checksum và MIME/duration khớp file ship.
7. Mock Test published có đúng 4 section (Reading, Listening, Writing, Speaking), mỗi section pin đúng một version.
8. Chạy pgTAP content operations và actor A/B/anon trước khi apply remote.

---

## JSON template cho content draft

```json
{
  "module": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slug": "grammar-b1-conditionals",
    "title": "Grammar B1: Conditionals",
    "order_index": 1
  },
  "lessons": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "slug": "zero-first-conditional",
      "title": "Zero & First Conditional",
      "content": "...",
      "difficulty": "B1",
      "topic": "grammar",
      "order_index": 1
    }
  ],
  "exercises": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "slug": "conditional-mcq-1",
      "type": "multiple_choice",
      "difficulty": "B1",
      "question_set": [
        { "id": "q1", "position": 1, "prompt": "If it rains, I ___ at home.", "options": ["stay", "stays", "stayed", "staying"] },
        { "id": "q2", "position": 2, "prompt": "If she studies hard, she ___ the exam.", "options": ["pass", "passes", "passed", "passing"] }
      ],
      "answer_key": { "q1": "stay", "q2": "pass" }
    }
  ],
  "provenance": {
    "source": "AI-assisted draft + manual review",
    "license": "original-content",
    "checksum": "sha256:...",
    "ai_generated": true
  }
}
```

---

## RLS `ai_generated_contents` — migration đã tạo

File: `supabase/migrations/20261024000000_fix_ai_generated_contents_rls.sql`

Thay thế policy placeholder (`auth.uid() IN (SELECT user_id FROM auth.users)`) bằng:
- Bảng `public.app_roles` (super_admin, content_editor, support, student)
- View `public.admin_users` cho kiểm tra admin
- Policy mới: chỉ admin quản lý, authenticated đọc nội dung APPROVED

---

## Audio Listening (T5)

- Generate bằng TTS (edge-tts hoặc 11labs free tier).
- Kiểm tra giấy phép sử dụng thương mại của gói đang dùng trước khi publish.
- Upload qua Supabase Storage, gắn checksum theo checklist.

---

## Exit criteria G1

- placement → 1 module → reading + listening → 1 writing task → 1 speaking set → 1 mock test
- Không screen trống trên toàn luồng.
- Mọi item published có provenance/licence.
