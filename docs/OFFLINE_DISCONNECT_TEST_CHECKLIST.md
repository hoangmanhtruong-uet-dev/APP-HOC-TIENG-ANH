# Checklist test tay mất mạng (G-07, P2)

**Mục tiêu:** Xác minh draft không mất khi ngắt mạng đột ngột khi soạn Writing.
**Thời gian:** G2 (T6: 30/11–4/12/2026)
**Cách chạy:** Thủ công trên dev hoặc staging.

---

## Test case: Offline draft recovery

| Bước | Hành động | Kết quả mong đợi |
|------|-----------|-----------------|
| 1 | Đăng nhập, vào trang Writing task (ví dụ `/writing/task-1`) | Trang load, editor hiển thị |
| 2 | Soạn >100 từ vào editor | Text hiển thị, word count tăng |
| 3 | Ngắt mạng (DevTools → Network → Offline, hoặc tắt Wi-Fi) | Biểu tượng "mất kết nối" hiện (nếu có) |
| 4 | Tiếp tục gõ thêm 50 từ, thay đổi câu văn | Editor vẫn cho gõ, không lỗi |
| 5 | Bật lại mạng | Kết nối khôi phục |
| 6 | Chờ vài giây (autosave debounce) | Draft được sync lại lên server (xem Network tab có request lưu draft) |
| 7 | Refresh trang (F5) | Draft vẫn còn, không mất nội dung |
| 8 | Nộp bài | Nộp thành công, không lỗi conflict |

---

## Evidence cần ghi

- [ ] Screenshot Network tab khi ngắt mạng (xem request fail).
- [ ] Screenshot sau khi bật lại mạng (xem request sync thành công).
- [ ] Screenshot sau refresh (để verify draft còn nguyên).
- [ ] Ghi chú thời gian mất kết nối và thời gian khôi phục.

---

## Exit criteria

- [ ] 1 lượt PASS: draft không mất sau khi ngắt/bật lại mạng.
- [ ] Automation để sau launch (Playwright `network-resilience.spec.ts`).
