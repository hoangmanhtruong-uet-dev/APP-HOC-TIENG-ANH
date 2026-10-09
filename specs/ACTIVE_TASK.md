
# TASK EXECUTION PLAN: Refactor Dashboard — Premium UI, Features, Theory & Exercises

## 1. Cân nhắc kiến trúc & Hiệu năng (1k - 10k Users)

### Supabase / Database
- Dashboard Server Component dùng `Promise.all()` để parallel fetch: learner profile + learning overview — không sequential.
- `getLearningOverview()` đã có sẵn, tái sử dụng — không tạo query mới.
- Không truy vấn dictation tables trực tiếp từ dashboard; chỉ link deep.

### Client Performance
- **`DashboardClient`** được tách thành các sub-component nhỏ, mỗi cái `React.memo()`.
- Heatmap 30 ngày: dữ liệu được tính trên Server Component, truyền xuống client dưới dạng plain array — không fetch thêm ở client.
- Animated counters và progress bars dùng CSS transitions (`duration-700`) + `useState(mounted)`, không dùng `requestAnimationFrame` vòng lặp.
- Tip rotator dùng `setInterval` ≤ 8s — cleanup trong `useEffect` return.

### Design System
- **Chỉ dùng design tokens đã có** trong `globals.css` (`--primary`, `--success`, `--muted`, v.v.) — không thêm màu hardcode.
- Class `.app-panel` và `.app-section-title` dùng xuyên suốt cho nhất quán.
- Icons: đã dùng `lucide-react` theo dự án — tiếp tục dùng, không thêm library mới.

---

## 2. Danh sách file cần chỉnh sửa hoặc tạo mới (Target Files)

| File | Action |
|------|--------|
| `src/app/(dashboard)/dashboard/client.tsx` | **REWRITE** — redesign toàn bộ UI |
| `src/app/(dashboard)/dashboard/page.tsx` | **EDIT** — thêm Dictation vào planItems, cải thiện metadata |
| `src/app/(dashboard)/dashboard/components/SkillCard.tsx` | **CREATE** — extracted component |
| `src/app/(dashboard)/dashboard/components/StudyHeatmap.tsx` | **CREATE** — 5-week heatmap |
| `src/app/(dashboard)/dashboard/components/QuickQuiz.tsx` | **CREATE** — quick practice inline |
| `src/app/(dashboard)/dashboard/components/TheoryTipCard.tsx` | **CREATE** — rotating theory tip |
| `src/app/(dashboard)/dashboard/components/LevelProgress.tsx` | **CREATE** — CEFR level card |

---

## 3. Các bước triển khai chi tiết (Step-by-step Execution)

### Bước 1: Tạo sub-components
Tạo thư mục `components/` trong dashboard, lần lượt tạo từng file nhỏ:
1. `SkillCard.tsx` — card kỹ năng (Vocabulary, Grammar, Listening, Dictation, Speaking) với màu riêng, badge trạng thái, progress mini-bar
2. `StudyHeatmap.tsx` — heatmap 5 tuần × 7 ngày, nhận `weekData: number[]` prop
3. `QuickQuiz.tsx` — 3 câu hỏi vocabulary/grammar nhanh inline (static demo data tham khảo Cambridge IELTS wordlist)
4. `TheoryTipCard.tsx` — rotating card với 6 tips từ Cambridge, British Council, Merriam-Webster
5. `LevelProgress.tsx` — CEFR level card (A1→C2) với progress bar

### Bước 2: Rewrite `client.tsx`
Layout grid 7/3 (desktop) → 1 col (mobile):
- **LEFT (7 col):** Stats row → Continue Learning card → Skill grid 2×3 → Study Heatmap → Quick Quiz → Theory Tips
- **RIGHT (3 col):** Daily Goal → Today's Plan list → Error Notebook CTA → Word of Day → Weekly League

### Bước 3: Update `page.tsx`
- Thêm Dictation vào `planItems`
- Cải thiện metadata title/description

### Bước 4: Kiểm tra TypeScript & build

---

## 4. Tiêu chuẩn kiểm thử (Acceptance Criteria & Test)

```bash
# Không lỗi TypeScript
npm run typecheck

# Không lỗi lint
npm run lint

# Build thành công
npm run build
```

### Functional Checks
| # | Tiêu chí |
|---|----------|
| 1 | Trang `/dashboard` load được và hiển thị đầy đủ các sections |
| 2 | Skill cards link đúng: `/learn/vocabulary`, `/learn/grammar`, `/practice/listening`, `/dictation` |
| 3 | Heatmap animate khi mount (cells transition màu) |
| 4 | Quick Quiz hiển thị 3 câu hỏi, user click chọn được đáp án |
| 5 | Theory Tip tự rotate sau 8 giây, có dot navigation |
| 6 | Responsive: mobile 1 col, tablet 2 col, desktop 7/3 |
| 7 | Today's Plan gồm đủ 4 items bao gồm Dictation |