-- Insert sample exercise
INSERT INTO public.dictation_exercises (id, title, description, category, difficulty, audio_url, total_sentences, duration_seconds, is_published)
VALUES
  ('11111111-1111-1111-1111-111111111111',
   'Daily Conversation: At the Coffee Shop',
   'Luyện nghe đoạn hội thoại tại quán cà phê. Phù hợp cho người mới bắt đầu.',
   'daily', 2,
   'https://res.cloudinary.com/dwyxdr3q1/video/upload/v1704100000/coffee_shop_audio.mp3',
   5, 45, true);

-- Insert sentences for the exercise
INSERT INTO public.dictation_sentences (exercise_id, order_index, text, start_time, end_time, hint)
VALUES
  ('11111111-1111-1111-1111-111111111111', 0, 'Good morning, can I have a cup of coffee please?', 0.000, 3.500, 'Câu chào buổi sáng và gọi đồ uống'),
  ('11111111-1111-1111-1111-111111111111', 1, 'Sure, would you like it black or with milk?', 4.000, 7.200, 'Nhân viên hỏi về cách pha'),
  ('11111111-1111-1111-1111-111111111111', 2, 'I would like it with milk and two sugars.', 7.800, 11.000, 'Khách trả lời yêu cầu'),
  ('11111111-1111-1111-1111-111111111111', 3, 'That will be three dollars and fifty cents.', 11.500, 14.800, 'Nhân viên báo giá tiền'),
  ('11111111-1111-1111-1111-111111111111', 4, 'Here you go. Thank you and have a nice day!', 15.200, 18.500, 'Kết thúc hội thoại');
